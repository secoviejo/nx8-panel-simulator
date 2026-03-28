import type { SimEvent, EventBusPayload } from './types.js';
import type { SimEventBus } from './eventBus.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('event-history');

/**
 * Buffer circular de histórico de eventos.
 */
export class EventHistory {
    private events: SimEvent[] = [];
    private readonly maxSize: number;

    constructor(maxSize: number, eventBus?: SimEventBus) {
        this.maxSize = maxSize;
        if (eventBus) {
            eventBus.onEvent((payload: EventBusPayload) => {
                this.add(payload.event);
            });
        }
        log.info({ maxSize }, 'Event history inicializado');
    }

    add(event: SimEvent): void {
        this.events.push(event);
        if (this.events.length > this.maxSize) {
            this.events.shift();
        }
    }

    getEvents(options?: { limit?: number; offset?: number; type?: string }): SimEvent[] {
        let result = [...this.events];
        if (options?.type) {
            result = result.filter((e) => e.type === options.type);
        }
        result.reverse();
        const offset = options?.offset ?? 0;
        const limit = options?.limit ?? 50;
        return result.slice(offset, offset + limit);
    }

    getLatest(): SimEvent | undefined {
        return this.events[this.events.length - 1];
    }

    getCount(): number {
        return this.events.length;
    }

    clear(): void {
        this.events = [];
        log.info('Event history limpiado');
    }
}
