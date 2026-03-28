import { describe, it, expect, beforeEach } from 'vitest';
import { EventHistory } from '../../../src/core/events/eventHistory.js';
import { SimEventBus } from '../../../src/core/events/eventBus.js';
import type { SimEvent } from '../../../src/core/events/types.js';

describe('EventHistory', () => {
    let history: EventHistory;
    let eventBus: SimEventBus;

    beforeEach(() => {
        eventBus = new SimEventBus();
        history = new EventHistory(5, eventBus);
    });

    function publishEvent(type: string = 'zone_open'): SimEvent {
        return eventBus.publish({ type: type as any, source: 'zone', sourceId: 1, description: 'test' });
    }

    it('debe almacenar eventos del bus', () => {
        publishEvent();
        expect(history.getCount()).toBe(1);
    });

    it('debe respetar el límite máximo (buffer circular)', () => {
        for (let i = 0; i < 10; i++) publishEvent();
        expect(history.getCount()).toBe(5);
    });

    it('debe retornar eventos en orden más reciente primero', () => {
        publishEvent('zone_open');
        publishEvent('zone_close');
        const events = history.getEvents();
        expect(events[0].type).toBe('zone_close');
        expect(events[1].type).toBe('zone_open');
    });

    it('debe soportar paginación', () => {
        for (let i = 0; i < 5; i++) publishEvent();
        const page = history.getEvents({ limit: 2, offset: 1 });
        expect(page).toHaveLength(2);
    });

    it('debe filtrar por tipo', () => {
        publishEvent('zone_open');
        publishEvent('zone_close');
        publishEvent('zone_open');
        const filtered = history.getEvents({ type: 'zone_open' });
        expect(filtered).toHaveLength(2);
        expect(filtered.every((e) => e.type === 'zone_open')).toBe(true);
    });

    it('debe retornar el último evento', () => {
        publishEvent('zone_open');
        publishEvent('panel_ac_fail');
        expect(history.getLatest()!.type).toBe('panel_ac_fail');
    });

    it('debe limpiar todo el histórico', () => {
        publishEvent();
        publishEvent();
        history.clear();
        expect(history.getCount()).toBe(0);
        expect(history.getLatest()).toBeUndefined();
    });
});
