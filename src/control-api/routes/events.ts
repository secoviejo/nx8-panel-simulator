import type { FastifyInstance } from 'fastify';
import type { EventHistory } from '../../core/events/eventHistory.js';
import { eventsQuerySchema } from '../schemas/index.js';

export function registerEventsRoutes(
    app: FastifyInstance,
    eventHistory: EventHistory,
): void {
    app.get<{ Querystring: Record<string, string> }>('/events', async (req) => {
        const query = eventsQuerySchema.safeParse(req.query);
        const options = query.success ? query.data : { limit: 50, offset: 0 };

        return {
            total: eventHistory.getCount(),
            events: eventHistory.getEvents(options),
        };
    });
}
