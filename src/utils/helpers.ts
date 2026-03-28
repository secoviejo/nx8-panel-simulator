/**
 * Utilidades genéricas del simulador.
 */

/** Formatea un ID numérico con padding de ceros */
export function padId(id: number, length: number = 2): string {
    return id.toString().padStart(length, '0');
}

/** Espera N milisegundos */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Genera un delay aleatorio dentro de un rango */
export function randomDelay(minMs: number, maxMs: number): number {
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/** Timestamp ISO */
export function isoTimestamp(): string {
    return new Date().toISOString();
}

/** Clamp de un valor numérico */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
