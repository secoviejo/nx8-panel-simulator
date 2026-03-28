import type { FastifyInstance } from 'fastify';
import type { ScenarioRunner } from '../../core/scenarios/scenarioRunner.js';
import { loadScenarioSchema } from '../schemas/index.js';

export function registerScenarioRoutes(
    app: FastifyInstance,
    scenarioRunner: ScenarioRunner,
): void {
    app.get('/scenarios', async () => {
        return {
            available: scenarioRunner.listAvailable(),
            active: scenarioRunner.getActiveName(),
            running: scenarioRunner.isRunning(),
        };
    });

    app.post<{ Body: unknown }>('/scenarios/load', async (req, reply) => {
        const body = loadScenarioSchema.safeParse(req.body);
        if (!body.success) return reply.status(400).send({ error: body.error.issues });

        try {
            await scenarioRunner.load(body.data.file);
            await scenarioRunner.run();
            return { action: 'scenario_loaded', file: body.data.file, running: true };
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Error desconocido';
            return reply.status(400).send({ error: message });
        }
    });

    app.post('/scenarios/stop', async () => {
        scenarioRunner.stop();
        return { action: 'scenario_stopped' };
    });
}
