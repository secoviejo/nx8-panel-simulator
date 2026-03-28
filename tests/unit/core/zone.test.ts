import { describe, it, expect, beforeEach } from 'vitest';
import { ZoneStateManager } from '../../../src/core/state/zone.js';

describe('ZoneStateManager', () => {
    let zones: ZoneStateManager;

    beforeEach(() => {
        zones = new ZoneStateManager(8, 2);
    });

    it('debe crear el número correcto de zonas', () => {
        expect(zones.getAllZones()).toHaveLength(8);
    });

    it('debe asignar zonas a particiones alternadamente', () => {
        const z1 = zones.getZone(1)!;
        const z2 = zones.getZone(2)!;
        const z3 = zones.getZone(3)!;
        expect(z1.partitionId).toBe(1);
        expect(z2.partitionId).toBe(2);
        expect(z3.partitionId).toBe(1);
    });

    it('debe abrir y cerrar zonas', () => {
        const openResult = zones.open(1);
        expect(openResult.changed).toBe(true);
        expect(zones.getZone(1)!.open).toBe(true);

        const closeResult = zones.close(1);
        expect(closeResult.changed).toBe(true);
        expect(zones.getZone(1)!.open).toBe(false);
    });

    it('debe cerrar la alarma al cerrar la zona', () => {
        zones.setAlarm(1, true);
        zones.close(1);
        expect(zones.getZone(1)!.alarm).toBe(false);
    });

    it('debe abrir la zona al activar alarma', () => {
        zones.setAlarm(1, true);
        expect(zones.getZone(1)!.open).toBe(true);
        expect(zones.getZone(1)!.alarm).toBe(true);
    });

    it('debe gestionar bypass', () => {
        zones.setBypassed(1, true);
        expect(zones.getZone(1)!.bypassed).toBe(true);
    });

    it('debe gestionar tamper', () => {
        zones.setTamper(1, true);
        expect(zones.getZone(1)!.tamper).toBe(true);
    });

    it('debe gestionar fault', () => {
        zones.setFault(1, true);
        expect(zones.getZone(1)!.fault).toBe(true);
    });

    it('debe verificar si todas las zonas de una partición están cerradas', () => {
        expect(zones.areAllZonesClosed(1)).toBe(true);
        zones.open(1); // partición 1
        expect(zones.areAllZonesClosed(1)).toBe(false);
        zones.close(1);
        expect(zones.areAllZonesClosed(1)).toBe(true);
    });

    it('debe considerar zonas bypassed como cerradas para ready', () => {
        zones.open(1);
        zones.setBypassed(1, true);
        expect(zones.areAllZonesClosed(1)).toBe(true);
    });

    it('debe filtrar zonas por partición', () => {
        const p1Zones = zones.getZonesByPartition(1);
        expect(p1Zones.length).toBe(4); // 8 zonas / 2 particiones
        expect(p1Zones.every((z) => z.partitionId === 1)).toBe(true);
    });

    it('debe retornar undefined para zona inexistente', () => {
        expect(zones.getZone(99)).toBeUndefined();
    });
});
