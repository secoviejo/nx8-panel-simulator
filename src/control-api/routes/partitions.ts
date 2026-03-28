import type { FastifyInstance } from 'fastify';
import type { PartitionStateManager } from '../../core/state/partition.js';
import type { EventGenerator } from '../../core/events/eventGenerator.js';
import { armPartitionSchema } from '../schemas/index.js';

export function registerPartitionRoutes(
    app: FastifyInstance,
    partitions: PartitionStateManager,
    eventGen: EventGenerator,
): void {
    app.get('/partitions', async () => {
        return { partitions: partitions.getAllPartitions() };
    });

    app.get<{ Params: { id: string } }>('/partitions/:id', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const partition = partitions.getPartition(id);
        if (!partition) return reply.status(404).send({ error: `Partición ${id} no encontrada` });
        return partition;
    });

    app.post<{ Params: { id: string }; Body: unknown }>('/partitions/:id/arm', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const body = armPartitionSchema.safeParse(req.body ?? {});
        if (!body.success) return reply.status(400).send({ error: body.error.issues });
        const changed = eventGen.armPartition(id, body.data.mode);
        return reply.status(changed ? 200 : 304).send({ changed, partition: partitions.getPartition(id) });
    });

    app.post<{ Params: { id: string } }>('/partitions/:id/disarm', async (req, reply) => {
        const id = parseInt(req.params.id, 10);
        const changed = eventGen.disarmPartition(id);
        return reply.status(changed ? 200 : 304).send({ changed, partition: partitions.getPartition(id) });
    });
}
