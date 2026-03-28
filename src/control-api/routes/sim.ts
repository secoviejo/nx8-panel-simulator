import type { FastifyInstance } from 'fastify';
import type { PanelStateManager } from '../../core/state/panel.js';
import type { PartitionStateManager } from '../../core/state/partition.js';
import type { ZoneStateManager } from '../../core/state/zone.js';
import type { EventHistory } from '../../core/events/eventHistory.js';
import type { SimEventBus } from '../../core/events/eventBus.js';
import type { ClientManager } from '../../server/tcp/clientManager.js';
import type { TcpServer } from '../../server/tcp/tcpServer.js';
import type { Broadcaster } from '../../server/tcp/broadcaster.js';
import { env } from '../../config/env.js';

export function registerSimRoutes(
    app: FastifyInstance,
    panel: PanelStateManager,
    partitions: PartitionStateManager,
    zones: ZoneStateManager,
    eventHistory: EventHistory,
    eventBus: SimEventBus,
    clientManager: ClientManager,
    tcpServer: TcpServer,
    broadcaster: Broadcaster,
): void {
    app.post('/sim/reset', async () => {
        panel.reset();
        partitions.reset(env.SIM_PARTITION_COUNT);
        zones.reset(env.SIM_ZONE_COUNT, env.SIM_PARTITION_COUNT);
        eventHistory.clear();
        eventBus.resetCounter();
        eventBus.publish({ type: 'system_reset', source: 'system', description: 'Simulador reseteado' });
        return { action: 'reset', status: 'ok' };
    });

    app.post('/sim/disconnect', async () => {
        clientManager.disconnectAll();
        return { action: 'disconnect', status: 'ok' };
    });

    app.post('/sim/reconnect', async () => {
        if (!tcpServer.isListening()) {
            await tcpServer.start(env.SIM_HOST, env.SIM_PORT);
        }
        return { action: 'reconnect', status: 'ok', listening: tcpServer.isListening() };
    });

    app.post('/sim/broadcast/on', async () => {
        broadcaster.setEnabled(true);
        return { action: 'broadcast', state: 'on' };
    });

    app.post('/sim/broadcast/off', async () => {
        broadcaster.setEnabled(false);
        return { action: 'broadcast', state: 'off' };
    });
}
