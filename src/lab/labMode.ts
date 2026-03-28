import { LAB_MODE_DEFAULTS, type LabModeConfig } from './types.js';
import { randomDelay, sleep } from '../utils/helpers.js';
import { createChildLogger } from '../observability/logger.js';

const log = createChildLogger('lab-mode');

/**
 * Motor de condiciones de laboratorio.
 * Permite inyectar delays, jitter, corrupción y silencios en las tramas.
 */
export class LabMode {
    private config: LabModeConfig;
    private silenceUntil: number = 0;

    constructor(config?: Partial<LabModeConfig>) {
        this.config = { ...LAB_MODE_DEFAULTS, ...config };
        log.info(this.config, 'Lab mode inicializado');
    }

    /** Aplica delay + jitter antes de enviar una trama */
    async applyDelay(): Promise<void> {
        if (this.config.delayMs === 0 && this.config.jitterMs === 0) return;

        const jitter = this.config.jitterMs > 0
            ? randomDelay(0, this.config.jitterMs)
            : 0;
        const totalDelay = this.config.delayMs + jitter;

        if (totalDelay > 0) {
            await sleep(totalDelay);
        }
    }

    /** Verifica si estamos en periodo de silencio */
    isSilenced(): boolean {
        if (this.silenceUntil === 0) return false;
        if (Date.now() < this.silenceUntil) return true;
        this.silenceUntil = 0;
        return false;
    }

    /** Activa silencio temporal */
    activateSilence(durationMs: number): void {
        this.silenceUntil = Date.now() + durationMs;
        log.info({ durationMs }, `Silencio activado por ${durationMs}ms`);
    }

    /** Corrompe una trama de forma aleatoria */
    corruptFrame(frame: string): string {
        if (!this.config.corruptionEnabled) return frame;
        if (Math.random() > this.config.corruptionRate) return frame;

        // Tipos de corrupción: reemplazar carácter, truncar, duplicar
        const corruption = Math.floor(Math.random() * 3);
        switch (corruption) {
            case 0: {
                // Reemplazar un carácter aleatorio
                const pos = Math.floor(Math.random() * frame.length);
                const chars = frame.split('');
                chars[pos] = String.fromCharCode(33 + Math.floor(Math.random() * 93));
                log.debug({ pos }, 'Corrupción: carácter reemplazado');
                return chars.join('');
            }
            case 1: {
                // Truncar la trama
                const truncAt = Math.floor(frame.length * 0.5 + Math.random() * frame.length * 0.4);
                log.debug({ truncAt }, 'Corrupción: trama truncada');
                return frame.slice(0, truncAt);
            }
            case 2: {
                // Duplicar un segmento
                const start = Math.floor(Math.random() * frame.length * 0.5);
                const len = Math.floor(Math.random() * 5) + 1;
                const segment = frame.slice(start, start + len);
                log.debug({ start, len }, 'Corrupción: segmento duplicado');
                return frame.slice(0, start) + segment + segment + frame.slice(start + len);
            }
            default:
                return frame;
        }
    }

    /** Procesa una trama aplicando todas las condiciones de lab */
    async processFrame(frame: string): Promise<string | null> {
        if (this.isSilenced()) return null;
        await this.applyDelay();
        return this.corruptFrame(frame);
    }

    setDelay(ms: number): void {
        this.config.delayMs = ms;
        log.info({ delayMs: ms }, 'Delay actualizado');
    }

    setJitter(ms: number): void {
        this.config.jitterMs = ms;
        log.info({ jitterMs: ms }, 'Jitter actualizado');
    }

    setCorruption(enabled: boolean, rate?: number): void {
        this.config.corruptionEnabled = enabled;
        if (rate !== undefined) this.config.corruptionRate = rate;
        log.info({ enabled, rate: this.config.corruptionRate }, 'Corrupción actualizada');
    }

    getConfig(): Readonly<LabModeConfig> {
        return { ...this.config };
    }

    reset(): void {
        this.config = { ...LAB_MODE_DEFAULTS };
        this.silenceUntil = 0;
        log.info('Lab mode reseteado');
    }
}
