import type { SimEventBus } from '../../core/events/eventBus.js';
import type { EventBusPayload } from '../../core/events/types.js';
import type { SerialServer } from './serialServer.js';
import { AsciiEncoder } from '../../protocols/nx584/ascii/encoder.js';
import { PanelStateManager } from '../../core/state/panel.js';
import { PartitionStateManager } from '../../core/state/partition.js';
import { ZoneStateManager } from '../../core/state/zone.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('serial-broadcaster');

/**
 * Broadcasting de cambios de estado al puerto Serie (RS232).
 * Escucha el bus de eventos y transmite tramas ASCII.
 */
export class SerialBroadcaster {
    private enabled: boolean;
    private readonly encoder = new AsciiEncoder();
    private readonly listener: (payload: EventBusPayload) => void;

    constructor(
        private readonly eventBus: SimEventBus,
        private readonly serialServer: SerialServer,
        private readonly panel: PanelStateManager,
        private readonly partitions: PartitionStateManager,
        private readonly zones: ZoneStateManager,
        enabled: boolean = true,
    ) {
        this.enabled = enabled;

        this.listener = (payload: EventBusPayload) => {
            if (!this.enabled) return;
            this.handleEvent(payload);
        };

        this.eventBus.onEvent(this.listener);
        log.info({ enabled }, 'Serial Broadcaster inicializado');
    }

    setEnabled(value: boolean): void {
        this.enabled = value;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    private handleEvent(payload: EventBusPayload): void {
        const { event } = payload;
        let frame: string | null = null;

        // Generar trama según tipo de evento
        if (event.type.startsWith('zone_') && event.sourceId) {
            const zone = this.zones.getZone(event.sourceId);
            if (zone) {
                frame = this.encoder.encodeZoneStatus(
                    zone.id, zone.open, zone.alarm, zone.bypassed, zone.tamper, zone.fault, zone.name,
                );
            }
        } else if (event.type.startsWith('partition_') && event.sourceId) {
            const partition = this.partitions.getPartition(event.sourceId);
            if (partition) {
                frame = this.encoder.encodePartitionStatus(
                    partition.id, partition.armed, partition.armMode, partition.ready, partition.alarm,
                );
            }
        } else if (event.type.startsWith('panel_')) {
            const state = this.panel.getState();
            frame = this.encoder.encodeSystemStatus(
                state.online, state.acPower, state.batteryLow, state.tamper, state.trouble, state.commFailure,
            );
        }

        // Siempre enviar el log event
        const logFrame = this.encoder.encodeLogEvent(
            event.id, event.type, event.source, event.sourceId, event.description,
        );

        if (frame) {
            this.serialServer.write(frame);
        }
        this.serialServer.write(logFrame);
    }

    destroy(): void {
        this.eventBus.offEvent(this.listener);
    }
}
