import { ZONE_DEFAULTS, DEFAULT_ZONE_NAMES } from '../../config/defaults.js';
import type { ZoneState, StateChangeResult } from './types.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('zone-state');

/**
 * Gestiona el estado de las zonas del NX-8 (hasta 192).
 */
export class ZoneStateManager {
    private zones: Map<number, ZoneState> = new Map();

    constructor(count: number, partitionCount: number) {
        for (let i = 1; i <= count; i++) {
            this.zones.set(i, {
                id: i,
                name: DEFAULT_ZONE_NAMES[i] || `Zona ${i}`,
                partitionId: ((i - 1) % partitionCount) + 1,
                ...ZONE_DEFAULTS,
            });
        }
        log.info({ count, partitionCount }, 'Zonas inicializadas');
    }

    getZone(id: number): Readonly<ZoneState> | undefined {
        const z = this.zones.get(id);
        return z ? { ...z } : undefined;
    }

    getAllZones(): Readonly<ZoneState>[] {
        return Array.from(this.zones.values()).map((z) => ({ ...z }));
    }

    getZonesByPartition(partitionId: number): Readonly<ZoneState>[] {
        return this.getAllZones().filter((z) => z.partitionId === partitionId);
    }

    areAllZonesClosed(partitionId: number): boolean {
        const partitionZones = Array.from(this.zones.values()).filter((z) => z.partitionId === partitionId);
        return partitionZones.every((z) => !z.open || z.bypassed);
    }

    open(id: number): StateChangeResult {
        const zone = this.zones.get(id);
        if (!zone) return { changed: false, previousValue: null, newValue: null, description: `Zona ${id} no existe` };
        const prev = zone.open;
        zone.open = true;
        log.info({ id, name: zone.name }, `Zona ${id} (${zone.name}) ABIERTA`);
        return { changed: !prev, previousValue: prev, newValue: true, description: `Zona ${id} (${zone.name}) abierta` };
    }

    close(id: number): StateChangeResult {
        const zone = this.zones.get(id);
        if (!zone) return { changed: false, previousValue: null, newValue: null, description: `Zona ${id} no existe` };
        const prev = zone.open;
        zone.open = false;
        zone.alarm = false;
        log.info({ id, name: zone.name }, `Zona ${id} (${zone.name}) CERRADA`);
        return { changed: prev, previousValue: prev, newValue: false, description: `Zona ${id} (${zone.name}) cerrada` };
    }

    setAlarm(id: number, value: boolean): StateChangeResult {
        const zone = this.zones.get(id);
        if (!zone) return { changed: false, previousValue: null, newValue: null, description: `Zona ${id} no existe` };
        const prev = zone.alarm;
        zone.alarm = value;
        if (value) zone.open = true;
        log.info({ id, alarm: value }, `Zona ${id} alarma: ${value ? 'ACTIVA' : 'RESTAURADA'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Zona ${id} alarma ${value ? 'activa' : 'restaurada'}` };
    }

    setBypassed(id: number, value: boolean): StateChangeResult {
        const zone = this.zones.get(id);
        if (!zone) return { changed: false, previousValue: null, newValue: null, description: `Zona ${id} no existe` };
        const prev = zone.bypassed;
        zone.bypassed = value;
        log.info({ id, bypass: value }, `Zona ${id} bypass: ${value ? 'ON' : 'OFF'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Zona ${id} bypass ${value ? 'activado' : 'desactivado'}` };
    }

    setTamper(id: number, value: boolean): StateChangeResult {
        const zone = this.zones.get(id);
        if (!zone) return { changed: false, previousValue: null, newValue: null, description: `Zona ${id} no existe` };
        const prev = zone.tamper;
        zone.tamper = value;
        log.info({ id, tamper: value }, `Zona ${id} tamper: ${value ? 'ACTIVE' : 'CLEAR'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Zona ${id} tamper ${value ? 'detectado' : 'restaurado'}` };
    }

    setFault(id: number, value: boolean): StateChangeResult {
        const zone = this.zones.get(id);
        if (!zone) return { changed: false, previousValue: null, newValue: null, description: `Zona ${id} no existe` };
        const prev = zone.fault;
        zone.fault = value;
        log.info({ id, fault: value }, `Zona ${id} fault: ${value ? 'ACTIVE' : 'CLEAR'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Zona ${id} fault ${value ? 'detectado' : 'restaurado'}` };
    }

    reset(count: number, partitionCount: number): void {
        this.zones.clear();
        for (let i = 1; i <= count; i++) {
            this.zones.set(i, {
                id: i,
                name: DEFAULT_ZONE_NAMES[i] || `Zona ${i}`,
                partitionId: ((i - 1) % partitionCount) + 1,
                ...ZONE_DEFAULTS,
            });
        }
        log.info({ count }, 'Zonas reseteadas');
    }
}
