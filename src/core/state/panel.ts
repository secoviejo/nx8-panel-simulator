import { PANEL_DEFAULTS } from '../../config/defaults.js';
import type { PanelState, StateChangeResult } from './types.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('panel-state');

/**
 * Gestiona el estado global del panel NX-8.
 */
export class PanelStateManager {
    private state: PanelState;

    constructor() {
        this.state = { ...PANEL_DEFAULTS };
        log.info('Panel state inicializado');
    }

    getState(): Readonly<PanelState> {
        return { ...this.state };
    }

    setOnline(value: boolean): StateChangeResult {
        const prev = this.state.online;
        this.state.online = value;
        log.info({ online: value }, `Panel ${value ? 'ONLINE' : 'OFFLINE'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Panel ${value ? 'online' : 'offline'}` };
    }

    setAcPower(value: boolean): StateChangeResult {
        const prev = this.state.acPower;
        this.state.acPower = value;
        if (!value) this.state.trouble = true;
        log.info({ acPower: value }, `AC Power: ${value ? 'OK' : 'FAIL'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `AC Power ${value ? 'restaurado' : 'fallo'}` };
    }

    setBatteryLow(value: boolean): StateChangeResult {
        const prev = this.state.batteryLow;
        this.state.batteryLow = value;
        if (value) this.state.trouble = true;
        log.info({ batteryLow: value }, `Battery: ${value ? 'LOW' : 'OK'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Batería ${value ? 'baja' : 'normal'}` };
    }

    setTamper(value: boolean): StateChangeResult {
        const prev = this.state.tamper;
        this.state.tamper = value;
        if (value) this.state.trouble = true;
        log.info({ tamper: value }, `Tamper: ${value ? 'ACTIVE' : 'CLEAR'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Tamper ${value ? 'detectado' : 'restaurado'}` };
    }

    setTrouble(value: boolean): StateChangeResult {
        const prev = this.state.trouble;
        this.state.trouble = value;
        log.info({ trouble: value }, `Trouble: ${value ? 'ACTIVE' : 'CLEAR'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Trouble ${value ? 'activo' : 'resuelto'}` };
    }

    setCommFailure(value: boolean): StateChangeResult {
        const prev = this.state.commFailure;
        this.state.commFailure = value;
        if (value) this.state.trouble = true;
        log.info({ commFailure: value }, `Comm: ${value ? 'FAIL' : 'OK'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Comunicación ${value ? 'perdida' : 'restaurada'}` };
    }

    reset(): void {
        this.state = { ...PANEL_DEFAULTS };
        log.info('Panel state reseteado');
    }
}
