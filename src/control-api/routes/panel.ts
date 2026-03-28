import type { FastifyInstance } from 'fastify';
import type { PanelStateManager } from '../../core/state/panel.js';
import type { PartitionStateManager } from '../../core/state/partition.js';
import type { ZoneStateManager } from '../../core/state/zone.js';
import type { ClientManager } from '../../server/tcp/clientManager.js';
import type { SerialServer } from '../../server/serial/serialServer.js';
import { SIMULATOR_VERSION } from '../../config/defaults.js';
import { env } from '../../config/env.js';

export function registerPanelRoutes(
    app: FastifyInstance,
    panel: PanelStateManager,
    partitions: PartitionStateManager,
    zones: ZoneStateManager,
    clientManager: ClientManager,
    serialServer: SerialServer,
): void {
    app.get('/panel', async () => {
        return {
            version: SIMULATOR_VERSION,
            model: 'NX-8',
            protocol: env.SIM_PROTOCOL,
            state: panel.getState(),
            partitions: partitions.getAllPartitions(),
            zones: zones.getAllZones(),
            connections: {
                tcp_clients: clientManager.getClientCount(),
                serial_open: serialServer.isRunning(),
                clients: clientManager.getAllClients().map((c) => ({
                    id: c.id,
                    remote: c.remoteAddress,
                    connectedAt: c.connectedAt.toISOString(),
                    bytesReceived: c.bytesReceived,
                    bytesSent: c.bytesSent,
                })),
            },
        };
    });
}
