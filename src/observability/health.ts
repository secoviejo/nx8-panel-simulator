import type { FastifyInstance } from 'fastify';
import { SIMULATOR_VERSION } from '../config/defaults.js';

/**
 * Registra rutas de health y readiness.
 */
export function registerHealthRoutes(
    app: FastifyInstance,
    checks: {
        isTcpListening: () => boolean;
    },
): void {
    app.get('/health', async () => {
        return {
            status: 'ok',
            version: SIMULATOR_VERSION,
            timestamp: new Date().toISOString(),
        };
    });

    app.get('/ready', async (_req, reply) => {
        const tcpReady = checks.isTcpListening();
        const status = tcpReady ? 'ready' : 'not_ready';

        if (!tcpReady) {
            return reply.status(503).send({
                status,
                checks: { tcp_server: tcpReady },
            });
        }

        return {
            status,
            checks: { tcp_server: tcpReady },
        };
    });
}
