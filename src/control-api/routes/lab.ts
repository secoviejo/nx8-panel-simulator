import type { FastifyInstance } from 'fastify';
import type { LabMode } from '../../lab/labMode.js';
import type { ClientManager } from '../../server/tcp/clientManager.js';
import type { EventGenerator } from '../../core/events/eventGenerator.js';
import { delaySchema, jitterSchema, corruptionSchema, silenceSchema, burstSchema } from '../schemas/index.js';
import { AsciiEncoder } from '../../protocols/nx584/ascii/encoder.js';
import { sleep } from '../../utils/helpers.js';

export function registerLabRoutes(
    app: FastifyInstance,
    labMode: LabMode,
    clientManager: ClientManager,
    eventGen: EventGenerator,
): void {
    app.get('/lab', async () => {
        return { config: labMode.getConfig() };
    });

    app.post<{ Body: unknown }>('/lab/delay', async (req, reply) => {
        const body = delaySchema.safeParse(req.body);
        if (!body.success) return reply.status(400).send({ error: body.error.issues });
        labMode.setDelay(body.data.ms);
        return { action: 'delay_set', ms: body.data.ms };
    });

    app.post<{ Body: unknown }>('/lab/jitter', async (req, reply) => {
        const body = jitterSchema.safeParse(req.body);
        if (!body.success) return reply.status(400).send({ error: body.error.issues });
        labMode.setJitter(body.data.ms);
        return { action: 'jitter_set', ms: body.data.ms };
    });

    app.post<{ Body: unknown }>('/lab/corruption/on', async (req, reply) => {
        const body = corruptionSchema.safeParse(req.body ?? {});
        if (!body.success) return reply.status(400).send({ error: body.error.issues });
        labMode.setCorruption(true, body.data.rate);
        return { action: 'corruption', state: 'on', rate: body.data.rate };
    });

    app.post('/lab/corruption/off', async () => {
        labMode.setCorruption(false);
        return { action: 'corruption', state: 'off' };
    });

    app.post<{ Body: unknown }>('/lab/silence', async (req, reply) => {
        const body = silenceSchema.safeParse(req.body);
        if (!body.success) return reply.status(400).send({ error: body.error.issues });
        labMode.activateSilence(body.data.ms);
        return { action: 'silence', ms: body.data.ms };
    });

    app.post<{ Body: unknown }>('/lab/burst', async (req, reply) => {
        const body = burstSchema.safeParse(req.body ?? {});
        if (!body.success) return reply.status(400).send({ error: body.error.issues });

        const encoder = new AsciiEncoder();
        const { count, intervalMs } = body.data;

        // Ráfaga de eventos aleatorios en background
        (async () => {
            for (let i = 0; i < count; i++) {
                const zoneId = Math.floor(Math.random() * 16) + 1;
                eventGen.openZone(zoneId);
                if (intervalMs > 0) await sleep(intervalMs);
                eventGen.closeZone(zoneId);
            }
        })();

        return { action: 'burst', count, intervalMs, status: 'started' };
    });

    app.post('/lab/reset', async () => {
        labMode.reset();
        return { action: 'lab_reset' };
    });
}
