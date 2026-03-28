/**
 * Tipos del sistema de eventos del simulador.
 */

export type EventSource = 'zone' | 'partition' | 'panel' | 'system';

export type EventType =
    | 'zone_open' | 'zone_close' | 'zone_alarm' | 'zone_restore'
    | 'zone_bypass' | 'zone_tamper' | 'zone_fault'
    | 'partition_arm' | 'partition_disarm' | 'partition_alarm' | 'partition_restore'
    | 'partition_entry_delay' | 'partition_exit_delay'
    | 'panel_online' | 'panel_offline'
    | 'panel_ac_fail' | 'panel_ac_restore'
    | 'panel_battery_low' | 'panel_battery_ok'
    | 'panel_tamper' | 'panel_tamper_restore'
    | 'panel_comm_fail' | 'panel_comm_restore'
    | 'system_reset' | 'system_scenario_loaded' | 'system_scenario_stopped';

export interface SimEvent {
    id: number;
    timestamp: Date;
    type: EventType;
    source: EventSource;
    sourceId?: number;
    description: string;
    data?: Record<string, unknown>;
}

export interface EventBusPayload {
    event: SimEvent;
}
