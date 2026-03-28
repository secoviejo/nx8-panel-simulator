import { describe, it, expect, beforeEach } from 'vitest';
import { PartitionStateManager } from '../../../src/core/state/partition.js';

describe('PartitionStateManager', () => {
    let partitions: PartitionStateManager;

    beforeEach(() => {
        partitions = new PartitionStateManager(2);
    });

    it('debe crear el número correcto de particiones', () => {
        expect(partitions.getAllPartitions()).toHaveLength(2);
    });

    it('debe inicializar particiones desarmadas y listas', () => {
        const p1 = partitions.getPartition(1);
        expect(p1).toBeDefined();
        expect(p1!.armed).toBe(false);
        expect(p1!.ready).toBe(true);
        expect(p1!.alarm).toBe(false);
    });

    it('debe armar una partición en modo away', () => {
        const result = partitions.arm(1, 'away');
        expect(result.changed).toBe(true);
        const p = partitions.getPartition(1);
        expect(p!.armed).toBe(true);
        expect(p!.armMode).toBe('away');
    });

    it('debe armar en modo stay', () => {
        partitions.arm(1, 'stay');
        expect(partitions.getPartition(1)!.armMode).toBe('stay');
    });

    it('no debe armar si la partición no está lista', () => {
        partitions.updateReady(1, false);
        const result = partitions.arm(1);
        expect(result.changed).toBe(false);
        expect(partitions.getPartition(1)!.armed).toBe(false);
    });

    it('debe desarmar una partición', () => {
        partitions.arm(1);
        const result = partitions.disarm(1);
        expect(result.changed).toBe(true);
        const p = partitions.getPartition(1);
        expect(p!.armed).toBe(false);
        expect(p!.armMode).toBeNull();
        expect(p!.alarm).toBe(false);
    });

    it('debe activar y desactivar alarma', () => {
        partitions.setAlarm(1, true);
        expect(partitions.getPartition(1)!.alarm).toBe(true);
        partitions.setAlarm(1, false);
        expect(partitions.getPartition(1)!.alarm).toBe(false);
    });

    it('debe retornar undefined para partición inexistente', () => {
        expect(partitions.getPartition(99)).toBeUndefined();
    });

    it('debe resetear todas las particiones', () => {
        partitions.arm(1);
        partitions.setAlarm(2, true);
        partitions.reset(2);
        expect(partitions.getPartition(1)!.armed).toBe(false);
        expect(partitions.getPartition(2)!.alarm).toBe(false);
    });
});
