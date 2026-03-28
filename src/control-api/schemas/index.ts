import { z } from 'zod';

/** Schema para armar partición */
export const armPartitionSchema = z.object({
    mode: z.enum(['away', 'stay', 'instant']).default('away'),
    code: z.string().optional(),
});

/** Schema para configurar delay */
export const delaySchema = z.object({
    ms: z.number().int().min(0).max(60000),
});

/** Schema para configurar jitter */
export const jitterSchema = z.object({
    ms: z.number().int().min(0).max(10000),
});

/** Schema para configurar corrupción */
export const corruptionSchema = z.object({
    rate: z.number().min(0).max(1).default(0.1),
});

/** Schema para silencio temporal */
export const silenceSchema = z.object({
    ms: z.number().int().min(100).max(300000),
});

/** Schema para ráfaga */
export const burstSchema = z.object({
    count: z.number().int().min(1).max(1000).default(10),
    intervalMs: z.number().int().min(0).max(5000).default(100),
});

/** Schema para cargar escenario */
export const loadScenarioSchema = z.object({
    file: z.string().min(1),
});

/** Schema para query de eventos */
export const eventsQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(500).default(50),
    offset: z.coerce.number().int().min(0).default(0),
    type: z.string().optional(),
});
