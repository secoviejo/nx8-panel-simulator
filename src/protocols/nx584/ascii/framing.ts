import { STX, ETX, SEPARATOR } from './messageTypes.js';
import { calculateXorChecksum } from '../../../utils/checksum.js';

/**
 * Construye una trama completa con STX, datos, checksum y ETX.
 */
export function buildFrame(msgType: string, fields: string[]): string {
    const data = [msgType, ...fields].join(SEPARATOR);
    const checksum = calculateXorChecksum(data);
    return `${STX}${data}${SEPARATOR}${checksum}${ETX}`;
}

/**
 * Parsea una trama raw y extrae tipo, campos y checksum.
 * Retorna null si la trama es inválida.
 */
export function parseFrame(raw: string): { msgType: string; fields: string[]; valid: boolean } | null {
    const trimmed = raw.trim();

    // Debe empezar con STX
    if (!trimmed.startsWith(STX)) return null;

    // Quitar STX
    const content = trimmed.slice(1);

    // Separar por SEPARATOR
    const parts = content.split(SEPARATOR);
    if (parts.length < 3) return null; // mínimo: tipo + al menos un campo + checksum

    const msgType = parts[0];
    const receivedChecksum = parts[parts.length - 1];
    const fields = parts.slice(1, -1);

    // Recalcular checksum sobre datos (sin el checksum mismo)
    const dataToCheck = [msgType, ...fields].join(SEPARATOR);
    const calculatedChecksum = calculateXorChecksum(dataToCheck);
    const valid = calculatedChecksum === receivedChecksum.toUpperCase();

    return { msgType, fields, valid };
}

/**
 * Extrae múltiples tramas de un buffer (puede llegar datos concatenados).
 */
export function extractFrames(buffer: string): { frames: string[]; remainder: string } {
    const frames: string[] = [];
    let current = buffer;

    while (current.includes(ETX)) {
        const etxIndex = current.indexOf(ETX);
        const stxIndex = current.lastIndexOf(STX, etxIndex);

        if (stxIndex >= 0) {
            frames.push(current.slice(stxIndex, etxIndex + 1));
        }

        current = current.slice(etxIndex + 1);
    }

    return { frames, remainder: current };
}
