import type { FastifyInstance } from 'fastify';
import type { ZoneStateManager } from '../../core/state/zone.js';
import type { EventGenerator } from '../../core/events/eventGenerator.js';

export function registerZoneRoutes(
    app: FastifyInstance,
    zones: ZoneStateManager,
    eventGen: EventGenerator,
): void {
    app.get('/zones', async () => {
        return { zones: zones.getAllZones() };
    });

    app.get<{ Params: { id: string } }>('/zones/:id', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const zone = zones.getZone(id);
        if (!zone) return reply.status(404).send({ error: `Zona ${id} no encontrada` });
        return zone;
    });

    app.post<{ Params: { id: string } }>('/zones/:id/open', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const changed = eventGen.openZone(id);
        return reply.status(changed ? 200 : 304).send({ changed, zone: zones.getZone(id) });
    });

    app.post<{ Params: { id: string } }>('/zones/:id/close', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const changed = eventGen.closeZone(id);
        return reply.status(changed ? 200 : 304).send({ changed, zone: zones.getZone(id) });
    });

    app.post<{ Params: { id: string } }>('/zones/:id/alarm', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const changed = eventGen.alarmZone(id);
        return reply.status(changed ? 200 : 304).send({ changed, zone: zones.getZone(id) });
    });

    app.post<{ Params: { id: string } }>('/zones/:id/restore', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const changed = eventGen.restoreZone(id);
        return reply.status(changed ? 200 : 304).send({ changed, zone: zones.getZone(id) });
    });

    app.post<{ Params: { id: string } }>('/zones/:id/bypass', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const changed = eventGen.bypassZone(id, true);
        return reply.status(changed ? 200 : 304).send({ changed, zone: zones.getZone(id) });
    });

    app.post<{ Params: { id: string } }>('/zones/:id/tamper', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const changed = eventGen.tamperZone(id, true);
        return reply.status(changed ? 200 : 304).send({ changed, zone: zones.getZone(id) });
    });

    app.post<{ Params: { id: string } }>('/zones/:id/fault', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const changed = eventGen.faultZone(id, true);
        return reply.status(changed ? 200 : 304).send({ changed, zone: zones.getZone(id) });
    });
}
