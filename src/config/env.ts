import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
    // Servidor TCP
    SIM_HOST: z.string().default('0.0.0.0'),
    SIM_PORT: z.coerce.number().int().min(1).max(65535).default(2401),
    SIM_MAX_CLIENTS: z.coerce.number().int().min(1).max(100).default(5),
    SIM_TCP_TIMEOUT_MS: z.coerce.number().int().min(0).default(60000),

    // Protocolo
    SIM_PROTOCOL: z.enum(['ascii', 'binary']).default('ascii'),

    // Motor de estados
    SIM_ZONE_COUNT: z.coerce.number().int().min(1).max(192).default(16),
    SIM_PARTITION_COUNT: z.coerce.number().int().min(1).max(8).default(2),
    SIM_HISTORY_LIMIT: z.coerce.number().int().min(10).max(100000).default(1000),

    // API de control
    SIM_CONTROL_API_HOST: z.string().default('0.0.0.0'),
    SIM_CONTROL_API_PORT: z.coerce.number().int().min(1).max(65535).default(8080),

    // Logging
    SIM_LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

    // Funcionalidades
    SIM_BROADCAST_ENABLED: z.string().transform((v) => v === 'true').default('true'),
    SIM_LAB_MODE: z.string().transform((v) => v === 'true').default('false'),
    SIM_METRICS_ENABLED: z.string().transform((v) => v === 'true').default('true'),

    // Escenarios
    SIM_SCENARIO_FILE: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadEnv(): EnvConfig {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        console.error('\u274c Error en variables de entorno:');
        for (const issue of result.error.issues) {
            console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
        }
        console.error('\n\ud83d\udccb Consulta .env.example para referencia');
        process.exit(1);
    }

    return result.data;
}

export const env = loadEnv();
