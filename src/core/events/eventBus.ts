import { EventEmitter } from 'node:events';
import type { SimEvent, EventBusPayload } from './types.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('event-bus');

/**
 * Bus de eventos central del simulador.
 * Desacopla productores (state changes, scenarios)
 * de consumidores (broadcaster TCP, event history, API).
 */
export class SimEventBus extends EventEmitter {
    private static readonly EVENT_NAME = 'sim:event';
    private eventCounter = 0;

    constructor() {
        super();
        this.setMaxListeners(50);
        log.info('Event bus inicializado');
    }

    /** Publica un evento, asignándole ID y timestamp automáticamente */
    publish(event: Omit<SimEvent, 'id' | 'timestamp'>): SimEvent {
        const fullEvent: SimEvent = {
            ...event,
            id: ++this.eventCounter,
            timestamp: new Date(),
        };

        log.debug({ eventId: fullEvent.id, type: fullEvent.type }, `Evento: ${fullEvent.type}`);
        super.emit(SimEventBus.EVENT_NAME, { event: fullEvent } satisfies EventBusPayload);
        return fullEvent;
    }

    /** Suscribe un listener */
    onEvent(listener: (payload: EventBusPayload) => void): void {
        this.on(SimEventBus.EVENT_NAME, listener);
    }

    /** Desuscribe un listener */
    offEvent(listener: (payload: EventBusPayload) => void): void {
        this.off(SimEventBus.EVENT_NAME, listener);
    }

    resetCounter(): void {
        this.eventCounter = 0;
    }

    getEventCount(): number {
        return this.eventCounter;
    }
}
