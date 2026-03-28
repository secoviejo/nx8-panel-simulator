/**
 * Valores por defecto del simulador.
 * Define la configuración inicial del panel, particiones y zonas.
 */

export const PANEL_DEFAULTS = {
    online: true,
    acPower: true,
    batteryLow: false,
    tamper: false,
    trouble: false,
    commFailure: false,
} as const;

export const PARTITION_DEFAULTS = {
    armed: false,
    armMode: null,
    alarm: false,
    entryDelay: false,
    exitDelay: false,
    ready: true,
} as const;

export const ZONE_DEFAULTS = {
    open: false,
    alarm: false,
    bypassed: false,
    tamper: false,
    fault: false,
} as const;

/** Nombres por defecto para zonas */
export const DEFAULT_ZONE_NAMES: Record<number, string> = {
    1: 'Puerta Principal',
    2: 'Puerta Trasera',
    3: 'Ventana Salón',
    4: 'Ventana Cocina',
    5: 'Ventana Dormitorio 1',
    6: 'Ventana Dormitorio 2',
    7: 'Detector Salón',
    8: 'Detector Pasillo',
    9: 'Detector Garaje',
    10: 'Puerta Garaje',
    11: 'Ventana Baño',
    12: 'Detector Sótano',
    13: 'Puerta Terraza',
    14: 'Detector Despacho',
    15: 'Ventana Despacho',
    16: 'Detector Entrada',
};

/** Puerto TCP clásico NX-584 */
export const NX584_DEFAULT_PORT = 2401;

/** Versión del simulador */
export const SIMULATOR_VERSION = '0.1.0';

/** Intervalo de heartbeat por defecto (ms) */
export const HEARTBEAT_INTERVAL_MS = 30000;
