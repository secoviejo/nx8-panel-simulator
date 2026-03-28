import { describe, it, expect } from 'vitest';
import { AsciiDecoder } from '../../../src/protocols/nx584/ascii/decoder.js';
import { buildFrame } from '../../../src/protocols/nx584/ascii/framing.js';

describe('AsciiDecoder', () => {
    const decoder = new AsciiDecoder();

    it('debe decodificar una petición RQ válida', () => {
        const frame = buildFrame('RQ', ['ZS', '01']);
        const result = decoder.decode(frame);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('RQ');
        expect(result!.subType).toBe('ZS');
        expect(result!.args).toEqual(['01']);
    });

    it('debe decodificar un comando CM válido', () => {
        const frame = buildFrame('CM', ['ARM', '01', 'away']);
        const result = decoder.decode(frame);
        expect(result).not.toBeNull();
        expect(result!.type).toBe('CM');
        expect(result!.subType).toBe('ARM');
        expect(result!.args).toEqual(['01', 'away']);
    });

    it('debe retornar null para trama sin STX', () => {
        const result = decoder.decode('RQ|ZS|01|XX\n');
        expect(result).toBeNull();
    });

    it('debe retornar null para trama con checksum inválido', () => {
        const result = decoder.decode('~RQ|ZS|01|00\n');
        expect(result).toBeNull();
    });

    it('debe retornar null para tipo de mensaje desconocido', () => {
        const frame = buildFrame('XX', ['data']);
        const result = decoder.decode(frame);
        expect(result).toBeNull();
    });
});
