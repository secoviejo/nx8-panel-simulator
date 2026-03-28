import { describe, it, expect } from 'vitest';
import { buildFrame, parseFrame, extractFrames } from '../../../src/protocols/nx584/ascii/framing.js';

describe('Framing', () => {
    describe('buildFrame', () => {
        it('debe construir una trama válida', () => {
            const frame = buildFrame('ZS', ['01', 'OPEN']);
            expect(frame.startsWith('~')).toBe(true);
            expect(frame.endsWith('\n')).toBe(true);
            expect(frame).toContain('ZS|01|OPEN|');
        });
    });

    describe('parseFrame', () => {
        it('debe parsear una trama construida con buildFrame', () => {
            const frame = buildFrame('ZS', ['01', 'OPEN', 'TestZone']);
            const parsed = parseFrame(frame);
            expect(parsed).not.toBeNull();
            expect(parsed!.msgType).toBe('ZS');
            expect(parsed!.fields).toEqual(['01', 'OPEN', 'TestZone']);
            expect(parsed!.valid).toBe(true);
        });

        it('debe detectar checksum inválido', () => {
            const frame = '~ZS|01|OPEN|00\n'; // checksum inventado
            const parsed = parseFrame(frame);
            expect(parsed).not.toBeNull();
            expect(parsed!.valid).toBe(false);
        });

        it('debe retornar null para trama sin STX', () => {
            expect(parseFrame('ZS|01|OPEN|XX\n')).toBeNull();
        });

        it('debe retornar null para trama demasiado corta', () => {
            expect(parseFrame('~A|B\n')).toBeNull();
        });
    });

    describe('extractFrames', () => {
        it('debe extraer una trama completa', () => {
            const frame = buildFrame('ZS', ['01', 'OPEN']);
            const { frames, remainder } = extractFrames(frame);
            expect(frames).toHaveLength(1);
            expect(remainder).toBe('');
        });

        it('debe extraer múltiples tramas', () => {
            const f1 = buildFrame('ZS', ['01', 'OPEN']);
            const f2 = buildFrame('PS', ['01', 'ARMED']);
            const { frames } = extractFrames(f1 + f2);
            expect(frames).toHaveLength(2);
        });

        it('debe conservar el remainder parcial', () => {
            const complete = buildFrame('ZS', ['01', 'OPEN']);
            const partial = '~PS|01|ARM';
            const { frames, remainder } = extractFrames(complete + partial);
            expect(frames).toHaveLength(1);
            expect(remainder).toBe(partial);
        });

        it('debe manejar buffer vacío', () => {
            const { frames, remainder } = extractFrames('');
            expect(frames).toHaveLength(0);
            expect(remainder).toBe('');
        });
    });
});
