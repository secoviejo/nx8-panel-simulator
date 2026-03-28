import type { FastifyInstance } from 'fastify';
import { SerialServer } from '../../server/serial/serialServer.js';

export function registerSerialRoutes(app: FastifyInstance, serialServer: SerialServer) {
    app.get('/serial/console', async (request, reply) => {
        const query = request.query as { since?: string };
        const sinceId = query.since ? parseInt(query.since, 10) : 0;
        
        let logs: any[] = [];
        if (serialServer) {
            logs = serialServer.getLogs(sinceId);
        }

        return reply.send({
            logs,
            connected: serialServer?.isRunning() || false
        });
    });
}
