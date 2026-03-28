/**
 * Tipos del modelo de estados del simulador NX-8.
 */

export type ArmMode = 'away' | 'stay' | 'instant';

export interface PanelState {
    online: boolean;
    acPower: boolean;
    batteryLow: boolean;
    tamper: boolean;
    trouble: boolean;
    commFailure: boolean;
}

export interface PartitionState {
    id: number;
    armed: boolean;
    armMode: ArmMode | null;
    alarm: boolean;
    entryDelay: boolean;
    exitDelay: boolean;
    ready: boolean;
}

export interface ZoneState {
    id: number;
    name: string;
    partitionId: number;
    open: boolean;
    alarm: boolean;
    bypassed: boolean;
    tamper: boolean;
    fault: boolean;
}

export interface SimulatorState {
    panel: PanelState;
    partitions: PartitionState[];
    zones: ZoneState[];
}

export interface StateChangeResult {
    changed: boolean;
    previousValue: unknown;
    newValue: unknown;
    description: string;
}
