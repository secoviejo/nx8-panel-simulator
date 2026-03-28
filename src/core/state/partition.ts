import { PARTITION_DEFAULTS } from '../../config/defaults.js';
import type { ArmMode, PartitionState, StateChangeResult } from './types.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('partition-state');

/**
 * Gestiona el estado de las particiones del NX-8 (hasta 8).
 */
export class PartitionStateManager {
    private partitions: Map<number, PartitionState> = new Map();

    constructor(count: number) {
        for (let i = 1; i <= count; i++) {
            this.partitions.set(i, { id: i, ...PARTITION_DEFAULTS });
        }
        log.info({ count }, 'Particiones inicializadas');
    }

    getPartition(id: number): Readonly<PartitionState> | undefined {
        const p = this.partitions.get(id);
        return p ? { ...p } : undefined;
    }

    getAllPartitions(): Readonly<PartitionState>[] {
        return Array.from(this.partitions.values()).map((p) => ({ ...p }));
    }

    arm(id: number, mode: ArmMode = 'away'): StateChangeResult {
        const partition = this.partitions.get(id);
        if (!partition) return { changed: false, previousValue: null, newValue: null, description: `Partición ${id} no existe` };
        if (!partition.ready && !partition.armed) {
            log.warn({ id }, 'Intento de armar partición no lista');
            return { changed: false, previousValue: partition.armed, newValue: partition.armed, description: `Partición ${id} no está lista` };
        }
        const prev = partition.armed;
        partition.armed = true;
        partition.armMode = mode;
        partition.alarm = false;
        log.info({ id, mode }, `Partición ${id} ARMADA (${mode})`);
        return { changed: !prev, previousValue: prev, newValue: true, description: `Partición ${id} armada (${mode})` };
    }

    disarm(id: number): StateChangeResult {
        const partition = this.partitions.get(id);
        if (!partition) return { changed: false, previousValue: null, newValue: null, description: `Partición ${id} no existe` };
        const prev = partition.armed;
        partition.armed = false;
        partition.armMode = null;
        partition.alarm = false;
        partition.entryDelay = false;
        partition.exitDelay = false;
        log.info({ id }, `Partición ${id} DESARMADA`);
        return { changed: prev, previousValue: prev, newValue: false, description: `Partición ${id} desarmada` };
    }

    setAlarm(id: number, value: boolean): StateChangeResult {
        const partition = this.partitions.get(id);
        if (!partition) return { changed: false, previousValue: null, newValue: null, description: `Partición ${id} no existe` };
        const prev = partition.alarm;
        partition.alarm = value;
        log.info({ id, alarm: value }, `Partición ${id} alarma: ${value ? 'ACTIVA' : 'RESTAURADA'}`);
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Partición ${id} alarma ${value ? 'activa' : 'restaurada'}` };
    }

    setEntryDelay(id: number, value: boolean): StateChangeResult {
        const partition = this.partitions.get(id);
        if (!partition) return { changed: false, previousValue: null, newValue: null, description: `Partición ${id} no existe` };
        const prev = partition.entryDelay;
        partition.entryDelay = value;
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Partición ${id} entry delay ${value ? 'on' : 'off'}` };
    }

    setExitDelay(id: number, value: boolean): StateChangeResult {
        const partition = this.partitions.get(id);
        if (!partition) return { changed: false, previousValue: null, newValue: null, description: `Partición ${id} no existe` };
        const prev = partition.exitDelay;
        partition.exitDelay = value;
        return { changed: prev !== value, previousValue: prev, newValue: value, description: `Partición ${id} exit delay ${value ? 'on' : 'off'}` };
    }

    updateReady(id: number, allZonesClosed: boolean): void {
        const partition = this.partitions.get(id);
        if (partition) partition.ready = allZonesClosed;
    }

    reset(count: number): void {
        this.partitions.clear();
        for (let i = 1; i <= count; i++) {
            this.partitions.set(i, { id: i, ...PARTITION_DEFAULTS });
        }
        log.info({ count }, 'Particiones reseteadas');
    }
}
