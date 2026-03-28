import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
    level: env.SIM_LOG_LEVEL,
    transport:
        process.env.NODE_ENV !== 'production'
            ? {
                  target: 'pino-pretty',
                  options: {
                      colorize: true,
                      translateTime: 'HH:MM:ss.l',
                      ignore: 'pid,hostname',
                  },
              }
            : undefined,
    base: {
        service: 'nx8-panel-simulator',
    },
});

export function createChildLogger(module: string) {
    return logger.child({ module });
}
