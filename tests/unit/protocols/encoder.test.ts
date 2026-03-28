import { describe, it, expect } from 'vitest';
import { AsciiEncoder } from '../../../src/protocols/nx584/ascii/encoder.js';

describe('AsciiEncoder', () => {
    const encoder = new AsciiEncoder();

    it('debe codificar estado de zona', () => {
        const frame = encoder.encodeZoneStatus(1, true, false, false, false, false, 'Puerta Principal');
        expect(frame).toContain('~ZS|');
        expect(frame).toContain('01');
        expect(frame).toContain('OPEN');
        expect(frame).toContain('Puerta Principal');
        expect(frame.endsWith('\n')).toBe(true);
    });

    it('debe codificar zona cerrada', () => {
        const frame = encoder.encodeZoneStatus(2, false, false, false, false, false, 'Puerta Trasera');
        expect(frame).toContain('CLOSED');
    });

    it('debe codificar snapshot de zonas', () => {
        const zones = [{ id: 1, open: true }, { id: 2, open: false }];
        const frame = encoder.encodeZonesSnapshot(zones);
        expect(frame).toContain('~ZN|');
        expect(frame).toContain('01:O');
        expect(frame).toContain('02:C');
    });

    it('debe codificar estado de partición armada', () => {
        const frame = encoder.encodePartitionStatus(1, true, 'away', true, false);
        expect(frame).toContain('~PS|');
        expect(frame).toContain('ARMED_AWAY');
        expect(frame).toContain('READY');
    });

    it('debe codificar partición desarmada', () => {
        const frame = encoder.encodePartitionStatus(1, false, null, true, false);
        expect(frame).toContain('DISARMED');
    });

    it('debe codificar estado del sistema', () => {
        const frame = encoder.encodeSystemStatus(true, true, false, false, false, false);
        expect(frame).toContain('~SS|');
        expect(frame).toContain('ONLINE');
        expect(frame).toContain('AC_OK');
        expect(frame).toContain('BAT_OK');
    });

    it('debe codificar sistema con fallas', () => {
        const frame = encoder.encodeSystemStatus(false, false, true, true, true, true);
        expect(frame).toContain('OFFLINE');
        expect(frame).toContain('AC_FAIL');
        expect(frame).toContain('BAT_LOW');
        expect(frame).toContain('TAMPER');
        expect(frame).toContain('TROUBLE');
        expect(frame).toContain('COMM_FAIL');
    });

    it('debe codificar log event', () => {
        const frame = encoder.encodeLogEvent(42, 'zone_alarm', 'zone', 3, 'Alarma zona 3');
        expect(frame).toContain('~LE|');
        expect(frame).toContain('0042');
        expect(frame).toContain('zone_alarm');
    });

    it('debe codificar config de interfaz', () => {
        const frame = encoder.encodeInterfaceConfig('ascii', 'NX-8', 16, 2);
        expect(frame).toContain('~IC|');
        expect(frame).toContain('ASCII');
        expect(frame).toContain('NX-8');
    });
});
