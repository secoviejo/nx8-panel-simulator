import { describe, it, expect, beforeEach } from 'vitest';
import { LabMode } from '../../../src/lab/labMode.js';

describe('LabMode', () => {
    let lab: LabMode;

    beforeEach(() => {
        lab = new LabMode();
    });

    it('debe inicializarse con valores por defecto', () => {
        const config = lab.getConfig();
        expect(config.delayMs).toBe(0);
        expect(config.jitterMs).toBe(0);
        expect(config.corruptionEnabled).toBe(false);
    });

    it('debe configurar delay', () => {
        lab.setDelay(100);
        expect(lab.getConfig().delayMs).toBe(100);
    });

    it('debe configurar jitter', () => {
        lab.setJitter(50);
        expect(lab.getConfig().jitterMs).toBe(50);
    });

    it('debe activar y desactivar corrupción', () => {
        lab.setCorruption(true, 0.5);
        expect(lab.getConfig().corruptionEnabled).toBe(true);
        expect(lab.getConfig().corruptionRate).toBe(0.5);

        lab.setCorruption(false);
        expect(lab.getConfig().corruptionEnabled).toBe(false);
    });

    it('no debe estar en silencio por defecto', () => {
        expect(lab.isSilenced()).toBe(false);
    });

    it('debe activar silencio temporal', () => {
        lab.activateSilence(1000);
        expect(lab.isSilenced()).toBe(true);
    });

    it('no debe corromper trama si corrupción está desactivada', () => {
        const original = '~ZS|01|OPEN|XX\n';
        const result = lab.corruptFrame(original);
        expect(result).toBe(original);
    });

    it('debe resetear a valores por defecto', () => {
        lab.setDelay(500);
        lab.setJitter(100);
        lab.setCorruption(true);
        lab.activateSilence(5000);
        lab.reset();

        const config = lab.getConfig();
        expect(config.delayMs).toBe(0);
        expect(config.jitterMs).toBe(0);
        expect(config.corruptionEnabled).toBe(false);
        expect(lab.isSilenced()).toBe(false);
    });

    it('debe retornar null cuando silenciado', async () => {
        lab.activateSilence(5000);
        const result = await lab.processFrame('~ZS|01|OPEN|XX\n');
        expect(result).toBeNull();
    });

    it('debe retornar trama sin cambios cuando no hay condiciones lab', async () => {
        const original = '~ZS|01|OPEN|XX\n';
        const result = await lab.processFrame(original);
        expect(result).toBe(original);
    });
});
