/**
 * Tipos del sistema de escenarios.
 */

import type { ArmMode } from '../state/types.js';

export interface ScenarioZoneConfig {
    id: number;
    name?: string;
    open?: boolean;
    partitionId?: number;
}

export interface ScenarioPartitionConfig {
    id: number;
    armed?: boolean;
    armMode?: ArmMode;
}

export interface ScenarioPanelConfig {
    online?: boolean;
    acPower?: boolean;
    batteryLow?: boolean;
    tamper?: boolean;
}

export interface ScenarioInitialState {
    panel?: ScenarioPanelConfig;
    partitions?: ScenarioPartitionConfig[];
    zones?: ScenarioZoneConfig[];
}

export type ScenarioActionType =
    | 'zone.open' | 'zone.close' | 'zone.alarm' | 'zone.restore'
    | 'zone.bypass' | 'zone.tamper' | 'zone.fault'
    | 'partition.arm' | 'partition.disarm'
    | 'panel.ac_fail' | 'panel.ac_restore'
    | 'panel.battery_low' | 'panel.battery_ok'
    | 'panel.tamper' | 'panel.tamper_restore'
    | 'panel.comm_fail' | 'panel.comm_restore';

export interface ScenarioStep {
    delay: number; // ms antes de ejecutar
    action: ScenarioActionType;
    target?: number; // id de zona o partición
    params?: Record<string, unknown>;
}

export interface ScenarioConfig {
    name: string;
    description: string;
    config?: {
        partitions?: number;
        zones?: number;
        broadcast?: boolean;
    };
    initialState?: ScenarioInitialState;
    sequence: ScenarioStep[];
}
