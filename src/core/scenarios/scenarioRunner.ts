import type { ScenarioConfig, ScenarioStep } from './types.js';
import type { EventGenerator } from '../events/eventGenerator.js';
import type { PanelStateManager } from '../state/panel.js';
import type { PartitionStateManager } from '../state/partition.js';
import type { ZoneStateManager } from '../state/zone.js';
import type { SimEventBus } from '../events/eventBus.js';
import { ScenarioLoader } from './scenarioLoader.js';
import { sleep } from '../../utils/helpers.js';
import { createChildLogger } from '../../observability/logger.js';
import type { ArmMode } from '../state/types.js';

const log = createChildLogger('scenario-runner');

/**
 * Motor de ejecución de escenarios.
 * Carga un escenario, aplica estado inicial y ejecuta la secuencia paso a paso.
 */
export class ScenarioRunner {
    private active: ScenarioConfig | null = null;
    private running = false;
    private abortController: AbortController | null = null;
    private readonly loader: ScenarioLoader;

    constructor(
        scenariosDir: string,
        private readonly eventGenerator: EventGenerator,
        private readonly eventBus: SimEventBus,
        private readonly panel: PanelStateManager,
        private readonly partitions: PartitionStateManager,
        private readonly zones: ZoneStateManager,
    ) {
        this.loader = new ScenarioLoader(scenariosDir);
    }

    async listAvailable(): Promise<string[]> {
        return this.loader.listFiles();
    }

    async load(filename: string): Promise<void> {
        this.stop();
        this.active = await this.loader.load(filename);
    }

    async run(): Promise<void> {
        if (!this.active) throw new Error('No hay escenario cargado');
        if (this.running) throw new Error('Ya hay un escenario en ejecución');

        this.running = true;
        this.abortController = new AbortController();
        const scenario = this.active;

        log.info({ name: scenario.name }, `Ejecutando escenario: ${scenario.name}`);
        this.eventBus.publish({ type: 'system_scenario_loaded', source: 'system', description: `Escenario cargado: ${scenario.name}` });

        try {
            // Aplicar estado inicial
            if (scenario.initialState) {
                this.applyInitialState(scenario.initialState);
            }

            // Ejecutar secuencia
            for (const step of scenario.sequence) {
                if (this.abortController.signal.aborted) break;

                if (step.delay > 0) {
                    await sleep(step.delay);
                    if (this.abortController.signal.aborted) break;
                }

                this.executeStep(step);
            }

            log.info({ name: scenario.name }, 'Escenario completado');
        } catch (err) {
            if (!this.abortController.signal.aborted) {
                log.error({ err, name: scenario.name }, 'Error ejecutando escenario');
            }
        } finally {
            this.running = false;
        }
    }

    stop(): void {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        this.running = false;
        if (this.active) {
            log.info({ name: this.active.name }, 'Escenario detenido');
            this.eventBus.publish({ type: 'system_scenario_stopped', source: 'system', description: 'Escenario detenido' });
        }
    }

    isRunning(): boolean {
        return this.running;
    }

    getActiveName(): string | null {
        return this.active?.name ?? null;
    }

    private applyInitialState(initial: ScenarioConfig['initialState']): void {
        if (!initial) return;

        if (initial.panel) {
            if (initial.panel.online !== undefined) this.panel.setOnline(initial.panel.online);
            if (initial.panel.acPower !== undefined) this.panel.setAcPower(initial.panel.acPower);
            if (initial.panel.batteryLow !== undefined) this.panel.setBatteryLow(initial.panel.batteryLow);
            if (initial.panel.tamper !== undefined) this.panel.setTamper(initial.panel.tamper);
        }

        if (initial.partitions) {
            for (const p of initial.partitions) {
                if (p.armed) {
                    this.partitions.arm(p.id, p.armMode ?? 'away');
                }
            }
        }

        if (initial.zones) {
            for (const z of initial.zones) {
                if (z.open) this.zones.open(z.id);
            }
        }

        log.info('Estado inicial del escenario aplicado');
    }

    private executeStep(step: ScenarioStep): void {
        const target = step.target ?? 1;

        switch (step.action) {
            case 'zone.open': this.eventGenerator.openZone(target); break;
            case 'zone.close': this.eventGenerator.closeZone(target); break;
            case 'zone.alarm': this.eventGenerator.alarmZone(target); break;
            case 'zone.restore': this.eventGenerator.restoreZone(target); break;
            case 'zone.bypass': this.eventGenerator.bypassZone(target, true); break;
            case 'zone.tamper': this.eventGenerator.tamperZone(target, true); break;
            case 'zone.fault': this.eventGenerator.faultZone(target, true); break;
            case 'partition.arm': this.eventGenerator.armPartition(target, (step.params?.mode as ArmMode) ?? 'away'); break;
            case 'partition.disarm': this.eventGenerator.disarmPartition(target); break;
            case 'panel.ac_fail': this.eventGenerator.setAcFail(true); break;
            case 'panel.ac_restore': this.eventGenerator.setAcFail(false); break;
            case 'panel.battery_low': this.eventGenerator.setBatteryLow(true); break;
            case 'panel.battery_ok': this.eventGenerator.setBatteryLow(false); break;
            case 'panel.tamper': this.eventGenerator.setTamper(true); break;
            case 'panel.tamper_restore': this.eventGenerator.setTamper(false); break;
            case 'panel.comm_fail': this.eventGenerator.setCommFailure(true); break;
            case 'panel.comm_restore': this.eventGenerator.setCommFailure(false); break;
            default:
                log.warn({ action: step.action }, 'Acción de escenario desconocida');
        }
    }
}
