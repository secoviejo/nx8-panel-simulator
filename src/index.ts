/**
 * Entry point principal del simulador NX-8.
 * Orquesta todos los módulos y arranca los servidores.
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { SIMULATOR_VERSION } from './config/defaults.js';
import { logger, createChildLogger } from './observability/logger.js';

// Core
import { PanelStateManager } from './core/state/panel.js';
import { PartitionStateManager } from './core/state/partition.js';
import { ZoneStateManager } from './core/state/zone.js';
import { SimEventBus } from './core/events/eventBus.js';
import { EventHistory } from './core/events/eventHistory.js';
import { EventGenerator } from './core/events/eventGenerator.js';
import { ScenarioRunner } from './core/scenarios/scenarioRunner.js';

// Servidor TCP
import { ClientManager } from './server/tcp/clientManager.js';
import { TcpServer } from './server/tcp/tcpServer.js';
import { Broadcaster } from './server/tcp/broadcaster.js';

// Servidor Serie (RS232)
import { SerialServer } from './server/serial/serialServer.js';
import { SerialBroadcaster } from './server/serial/serialBroadcaster.js';

// API de control
import { startControlApi } from './control-api/server.js';

// Lab mode
import { LabMode } from './lab/labMode.js';

// Observabilidad
import { SimMetrics } from './observability/metrics.js';

const log = createChildLogger('main');

async function main() {
    log.info(`
  █████╗██╗  ██╗██████╗       ██████╗ █████╗ ███╗  ██╗███████╗██╗
  ██╔══██╗██║  ██║██╔══██╗      ██╔════╝██╔══██╗████╗ ██║██╔════╝██║
  ███████║╚█████╔╝ ██████╔╝█████╗███████╗███████║██╔██╗██║█████╗  ██║
  ██╔══██║ ╚███╔╝  ██╔══██╗╚════╝██╔════╝██╔══██║██║╚████║██╔══╝  ██║
  ██║  ██║  ██║   ██████╔╝      ╚██████╗██║  ██║██║ ╚███║███████╗██║
  ╚═╝  ╚═╝  ╚═╝   ╚═════╝        ╚═════╝╚═╝  ╚═╝╚═╝  ╚══╝╚══════╝╚═╝
  NX-8 Panel Simulator v${SIMULATOR_VERSION}
`);

    // ─── Inicializar módulos ───────────────────────

    // Motor de estados
    const panel = new PanelStateManager();
    const partitions = new PartitionStateManager(env.SIM_PARTITION_COUNT);
    const zones = new ZoneStateManager(env.SIM_ZONE_COUNT, env.SIM_PARTITION_COUNT);

    // Sistema de eventos
    const eventBus = new SimEventBus();
    const eventHistory = new EventHistory(env.SIM_HISTORY_LIMIT, eventBus);
    const eventGenerator = new EventGenerator(eventBus, panel, partitions, zones);

    // Métricas
    const metrics = new SimMetrics();

    // Lab mode
    const labMode = new LabMode(env.SIM_LAB_MODE ? undefined : { delayMs: 0, jitterMs: 0 });

    // TCP Server
    const clientManager = new ClientManager(env.SIM_MAX_CLIENTS);
    const tcpServer = new TcpServer(clientManager, eventGenerator, panel, partitions, zones);
    const broadcaster = new Broadcaster(eventBus, clientManager, panel, partitions, zones, env.SIM_BROADCAST_ENABLED);

    // Serial Server (RS232)
    const serialServer = new SerialServer(eventGenerator, panel, partitions, zones);
    const serialBroadcaster = new SerialBroadcaster(eventBus, serialServer, panel, partitions, zones, env.SIM_BROADCAST_ENABLED);

    // Escenarios
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const scenariosDir = join(__dirname, '..', 'scenarios');
    const scenarioRunner = new ScenarioRunner(scenariosDir, eventGenerator, eventBus, panel, partitions, zones);

    // ─── Arrancar servidores ───────────────────────

    // TCP
    await tcpServer.start(env.SIM_HOST, env.SIM_PORT);

    // Serie
    if (env.SIM_SERIAL_PORT) {
        await serialServer.start(env.SIM_SERIAL_PORT, env.SIM_SERIAL_BAUDRATE);
    }

    // API Fastify
    const api = await startControlApi({
        panel, partitions, zones,
        eventGenerator, eventHistory, eventBus,
        clientManager, tcpServer, broadcaster,
        serialServer,
        scenarioRunner, labMode, metrics,
    });

    // Cargar escenario inicial si está configurado
    if (env.SIM_SCENARIO_FILE) {
        try {
            await scenarioRunner.load(env.SIM_SCENARIO_FILE);
            scenarioRunner.run(); // no await, corre en background
            log.info({ file: env.SIM_SCENARIO_FILE }, 'Escenario inicial cargado');
        } catch (err) {
            log.warn({ err, file: env.SIM_SCENARIO_FILE }, 'No se pudo cargar el escenario inicial');
        }
    }

    log.info({
        tcp: `${env.SIM_HOST}:${env.SIM_PORT}`,
        serial: env.SIM_SERIAL_PORT ? `${env.SIM_SERIAL_PORT} @ ${env.SIM_SERIAL_BAUDRATE}bps` : 'Desactivado',
        api: `${env.SIM_CONTROL_API_HOST}:${env.SIM_CONTROL_API_PORT}`,
        zones: env.SIM_ZONE_COUNT,
        partitions: env.SIM_PARTITION_COUNT,
        protocol: env.SIM_PROTOCOL,
        broadcast: env.SIM_BROADCAST_ENABLED,
        labMode: env.SIM_LAB_MODE,
    }, '✅ Simulador NX-8 arrancado correctamente');

    // ─── Shutdown graceful ────────────────────────

    const shutdown = async (signal: string) => {
        log.info({ signal }, 'Señal de apagado recibida');

        scenarioRunner.stop();
        broadcaster.destroy();
        serialBroadcaster.destroy();
        await tcpServer.stop();
        await serialServer.stop();
        await api.close();

        log.info('Simulador detenido limpiamente');
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
    logger.fatal({ err }, 'Error fatal al arrancar el simulador');
    process.exit(1);
});
