import type { SimEventBus } from '../../core/events/eventBus.js';
import type { EventBusPayload } from '../../core/events/types.js';
import type { ClientManager } from './clientManager.js';
import { AsciiEncoder } from '../../protocols/nx584/ascii/encoder.js';
import { PanelStateManager } from '../../core/state/panel.js';
import { PartitionStateManager } from '../../core/state/partition.js';
import { ZoneStateManager } from '../../core/state/zone.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('broadcaster');

/**
 * Broadcasting de cambios de estado a clientes TCP.
 * Escucha el bus de eventos y transmite tramas ASCII a todos los clientes.
 */
export class Broadcaster {
    private enabled: boolean;
    private readonly encoder = new AsciiEncoder();
    private readonly listener: (payload: EventBusPayload) => void;

    constructor(
        private readonly eventBus: SimEventBus,
        private readonly clientManager: ClientManager,
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
        log.info({ enabled }, 'Broadcaster inicializado');
    }

    setEnabled(value: boolean): void {
        this.enabled = value;
        log.info({ enabled: value }, `Broadcasting ${value ? 'activado' : 'desactivado'}`);
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

        const clientCount = this.clientManager.getClientCount();
        if (clientCount === 0) return;

        // Enviar trama de estado + log event
        if (frame) {
            this.clientManager.broadcast(frame);
        }
        this.clientManager.broadcast(logFrame);

        log.debug({ type: event.type, clients: clientCount }, 'Evento broadcast enviado');
    }

    destroy(): void {
        this.eventBus.offEvent(this.listener);
        log.info('Broadcaster destruido');
    }
}
