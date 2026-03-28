import { parseFrame } from './framing.js';
import { MessageTypes } from './messageTypes.js';
import type { ProtocolDecoder, DecodedMessage } from '../types.js';
import { createChildLogger } from '../../../observability/logger.js';

const log = createChildLogger('ascii-decoder');

/**
 * Decoder del protocolo ASCII NX-584.
 * Interpreta tramas recibidas de clientes TCP.
 */
export class AsciiDecoder implements ProtocolDecoder {
    decode(raw: string): DecodedMessage | null {
        const parsed = parseFrame(raw);

        if (!parsed) {
            log.warn({ raw: raw.trim() }, 'Trama inválida (formato)');
            return null;
        }

        if (!parsed.valid) {
            log.warn({ raw: raw.trim() }, 'Trama inválida (checksum)');
            return null;
        }

        const { msgType, fields } = parsed;

        switch (msgType) {
            case MessageTypes.REQUEST:
                return this.decodeRequest(fields);
            case MessageTypes.COMMAND:
                return this.decodeCommand(fields);
            default:
                log.warn({ msgType }, `Tipo de mensaje desconocido: ${msgType}`);
                return null;
        }
    }

    private decodeRequest(fields: string[]): DecodedMessage | null {
        if (fields.length < 1) return null;
        const subType = fields[0]; // Ej: 'ZS', 'PS', 'SS'
        const args = fields.slice(1);
        return { type: 'RQ', subType, args };
    }

    private decodeCommand(fields: string[]): DecodedMessage | null {
        if (fields.length < 1) return null;
        const subType = fields[0]; // Ej: 'ARM', 'DISARM'
        const args = fields.slice(1);
        return { type: 'CM', subType, args };
    }
}
