import { describe, it, expect, beforeEach } from 'vitest';
import { PanelStateManager } from '../../../src/core/state/panel.js';

describe('PanelStateManager', () => {
    let panel: PanelStateManager;

    beforeEach(() => {
        panel = new PanelStateManager();
    });

    it('debe inicializarse con valores por defecto', () => {
        const state = panel.getState();
        expect(state.online).toBe(true);
        expect(state.acPower).toBe(true);
        expect(state.batteryLow).toBe(false);
        expect(state.tamper).toBe(false);
        expect(state.trouble).toBe(false);
        expect(state.commFailure).toBe(false);
    });

    it('debe cambiar el estado online/offline', () => {
        const result = panel.setOnline(false);
        expect(result.changed).toBe(true);
        expect(panel.getState().online).toBe(false);
    });

    it('debe reportar sin cambios si el valor es el mismo', () => {
        const result = panel.setOnline(true);
        expect(result.changed).toBe(false);
    });

    it('debe activar trouble al fallar AC', () => {
        panel.setAcPower(false);
        expect(panel.getState().acPower).toBe(false);
        expect(panel.getState().trouble).toBe(true);
    });

    it('debe activar trouble al detectar batería baja', () => {
        panel.setBatteryLow(true);
        expect(panel.getState().batteryLow).toBe(true);
        expect(panel.getState().trouble).toBe(true);
    });

    it('debe activar trouble al detectar tamper', () => {
        panel.setTamper(true);
        expect(panel.getState().tamper).toBe(true);
        expect(panel.getState().trouble).toBe(true);
    });

    it('debe activar trouble al fallar comunicación', () => {
        panel.setCommFailure(true);
        expect(panel.getState().commFailure).toBe(true);
        expect(panel.getState().trouble).toBe(true);
    });

    it('debe resetear a valores por defecto', () => {
        panel.setAcPower(false);
        panel.setBatteryLow(true);
        panel.reset();
        const state = panel.getState();
        expect(state.acPower).toBe(true);
        expect(state.batteryLow).toBe(false);
        expect(state.trouble).toBe(false);
    });

    it('debe retornar una copia inmutable del estado', () => {
        const state = panel.getState();
        (state as any).online = false;
        expect(panel.getState().online).toBe(true);
    });
});
