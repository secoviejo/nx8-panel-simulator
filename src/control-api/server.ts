import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import { env } from '../config/env.js';
import { createChildLogger } from '../observability/logger.js';
import { registerHealthRoutes } from '../observability/health.js';
import { registerPanelRoutes } from './routes/panel.js';
import { registerZoneRoutes } from './routes/zones.js';
import { registerPartitionRoutes } from './routes/partitions.js';
import { registerEventsRoutes } from './routes/events.js';
import { registerFaultRoutes } from './routes/faults.js';
import { registerSimRoutes } from './routes/sim.js';
import { registerScenarioRoutes } from './routes/scenarios.js';
import { registerLabRoutes } from './routes/lab.js';
import type { PanelStateManager } from '../core/state/panel.js';
import type { PartitionStateManager } from '../core/state/partition.js';
import type { ZoneStateManager } from '../core/state/zone.js';
import type { EventGenerator } from '../core/events/eventGenerator.js';
import type { EventHistory } from '../core/events/eventHistory.js';
import type { SimEventBus } from '../core/events/eventBus.js';
import type { ClientManager } from '../server/tcp/clientManager.js';
import type { TcpServer } from '../server/tcp/tcpServer.js';
import type { Broadcaster } from '../server/tcp/broadcaster.js';
import type { SerialServer } from '../server/serial/serialServer.js';
import type { ScenarioRunner } from '../core/scenarios/scenarioRunner.js';
import type { LabMode } from '../lab/labMode.js';
import type { SimMetrics } from '../observability/metrics.js';

const log = createChildLogger('control-api');
const __dirname = dirname(fileURLToPath(import.meta.url));

export interface ControlApiDeps {
    panel: PanelStateManager;
    partitions: PartitionStateManager;
    zones: ZoneStateManager;
    eventGenerator: EventGenerator;
    eventHistory: EventHistory;
    eventBus: SimEventBus;
    clientManager: ClientManager;
    tcpServer: TcpServer;
    broadcaster: Broadcaster;
    serialServer: SerialServer;
    scenarioRunner: ScenarioRunner;
    labMode: LabMode;
    metrics: SimMetrics;
}

export async function createControlApi(deps: ControlApiDeps) {
    const app = Fastify({
        logger: false, // Usamos pino directamente
    });

    // CORS para desarrollo
    await app.register(fastifyCors, { origin: true });

    // Servir frontend estático desde /public
    await app.register(fastifyStatic, {
        root: join(__dirname, '..', '..', 'public'),
        prefix: '/',
        decorateReply: false,
    });

    // Health + Readiness
    registerHealthRoutes(app, {
        isTcpListening: () => deps.tcpServer.isListening(),
    });

    // Métricas
    app.get('/metrics', async () => deps.metrics.getSnapshot());

    // Rutas del simulador
    registerPanelRoutes(app, deps.panel, deps.partitions, deps.zones, deps.clientManager, deps.serialServer);
    registerZoneRoutes(app, deps.zones, deps.eventGenerator);
    registerPartitionRoutes(app, deps.partitions, deps.eventGenerator);
    registerEventsRoutes(app, deps.eventHistory);
    registerFaultRoutes(app, deps.eventGenerator);
    registerSimRoutes(app, deps.panel, deps.partitions, deps.zones, deps.eventHistory, deps.eventBus, deps.clientManager, deps.tcpServer, deps.broadcaster);
    registerScenarioRoutes(app, deps.scenarioRunner);
    registerLabRoutes(app, deps.labMode, deps.clientManager, deps.eventGenerator);

    return app;
}

export async function startControlApi(deps: ControlApiDeps): Promise<ReturnType<typeof Fastify>> {
    const app = await createControlApi(deps);

    await app.listen({
        host: env.SIM_CONTROL_API_HOST,
        port: env.SIM_CONTROL_API_PORT,
    });

    log.info({ host: env.SIM_CONTROL_API_HOST, port: env.SIM_CONTROL_API_PORT }, `Control API escuchando en ${env.SIM_CONTROL_API_HOST}:${env.SIM_CONTROL_API_PORT}`);
    return app;
}
