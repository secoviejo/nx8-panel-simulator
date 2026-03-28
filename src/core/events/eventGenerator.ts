import type { SimEventBus } from './eventBus.js';
import type { EventType, EventSource } from './types.js';
import { PanelStateManager } from '../state/panel.js';
import { PartitionStateManager } from '../state/partition.js';
import { ZoneStateManager } from '../state/zone.js';
import type { ArmMode } from '../state/types.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('event-generator');

/**
 * Generador de eventos del simulador.
 * Coordina cambios de estado con la emisión de eventos al bus.
 * Es el punto de entrada principal para cualquier acción sobre el simulador.
 */
export class EventGenerator {
    constructor(
        private readonly eventBus: SimEventBus,
        private readonly panel: PanelStateManager,
        private readonly partitions: PartitionStateManager,
        private readonly zones: ZoneStateManager,
    ) {
        log.info('Event generator inicializado');
    }

    // ─── Acciones sobre Zonas ────────────────────────────

    openZone(zoneId: number): boolean {
        const result = this.zones.open(zoneId);
        if (result.changed) {
            this.publishEvent('zone_open', 'zone', zoneId, result.description);
            this.updatePartitionReady(zoneId);
        }
        return result.changed;
    }

    closeZone(zoneId: number): boolean {
        const result = this.zones.close(zoneId);
        if (result.changed) {
            this.publishEvent('zone_close', 'zone', zoneId, result.description);
            this.updatePartitionReady(zoneId);
        }
        return result.changed;
    }

    alarmZone(zoneId: number): boolean {
        const result = this.zones.setAlarm(zoneId, true);
        if (result.changed) {
            this.publishEvent('zone_alarm', 'zone', zoneId, result.description);
            const zone = this.zones.getZone(zoneId);
            if (zone) {
                const partition = this.partitions.getPartition(zone.partitionId);
                if (partition?.armed) {
                    this.partitions.setAlarm(zone.partitionId, true);
                    this.publishEvent('partition_alarm', 'partition', zone.partitionId, `Partición ${zone.partitionId} en alarma por zona ${zoneId}`);
                }
            }
        }
        return result.changed;
    }

    restoreZone(zoneId: number): boolean {
        const result = this.zones.setAlarm(zoneId, false);
        if (result.changed) {
            this.publishEvent('zone_restore', 'zone', zoneId, result.description);
        }
        return result.changed;
    }

    bypassZone(zoneId: number, value: boolean): boolean {
        const result = this.zones.setBypassed(zoneId, value);
        if (result.changed) {
            this.publishEvent('zone_bypass', 'zone', zoneId, result.description);
            this.updatePartitionReady(zoneId);
        }
        return result.changed;
    }

    tamperZone(zoneId: number, value: boolean): boolean {
        const result = this.zones.setTamper(zoneId, value);
        if (result.changed) {
            this.publishEvent('zone_tamper', 'zone', zoneId, result.description);
        }
        return result.changed;
    }

    faultZone(zoneId: number, value: boolean): boolean {
        const result = this.zones.setFault(zoneId, value);
        if (result.changed) {
            this.publishEvent('zone_fault', 'zone', zoneId, result.description);
        }
        return result.changed;
    }

    // ─── Acciones sobre Particiones ──────────────────────

    armPartition(partitionId: number, mode: ArmMode = 'away'): boolean {
        const result = this.partitions.arm(partitionId, mode);
        if (result.changed) {
            this.publishEvent('partition_arm', 'partition', partitionId, result.description, { mode });
        }
        return result.changed;
    }

    disarmPartition(partitionId: number): boolean {
        const result = this.partitions.disarm(partitionId);
        if (result.changed) {
            this.publishEvent('partition_disarm', 'partition', partitionId, result.description);
        }
        return result.changed;
    }

    // ─── Acciones sobre Panel ────────────────────────────

    setAcFail(on: boolean): boolean {
        const result = this.panel.setAcPower(!on);
        if (result.changed) {
            this.publishEvent(on ? 'panel_ac_fail' : 'panel_ac_restore', 'panel', undefined, result.description);
        }
        return result.changed;
    }

    setBatteryLow(on: boolean): boolean {
        const result = this.panel.setBatteryLow(on);
        if (result.changed) {
            this.publishEvent(on ? 'panel_battery_low' : 'panel_battery_ok', 'panel', undefined, result.description);
        }
        return result.changed;
    }

    setTamper(on: boolean): boolean {
        const result = this.panel.setTamper(on);
        if (result.changed) {
            this.publishEvent(on ? 'panel_tamper' : 'panel_tamper_restore', 'panel', undefined, result.description);
        }
        return result.changed;
    }

    setCommFailure(on: boolean): boolean {
        const result = this.panel.setCommFailure(on);
        if (result.changed) {
            this.publishEvent(on ? 'panel_comm_fail' : 'panel_comm_restore', 'panel', undefined, result.description);
        }
        return result.changed;
    }

    // ─── Helpers ─────────────────────────────────────────

    private publishEvent(type: EventType, source: EventSource, sourceId?: number, description?: string, data?: Record<string, unknown>): void {
        this.eventBus.publish({ type, source, sourceId, description: description ?? type, data });
    }

    private updatePartitionReady(zoneId: number): void {
        const zone = this.zones.getZone(zoneId);
        if (zone) {
            const allClosed = this.zones.areAllZonesClosed(zone.partitionId);
            this.partitions.updateReady(zone.partitionId, allClosed);
        }
    }
}
