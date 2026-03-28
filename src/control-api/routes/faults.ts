import type { FastifyInstance } from 'fastify';
import type { EventGenerator } from '../../core/events/eventGenerator.js';

export function registerFaultRoutes(
    app: FastifyInstance,
    eventGen: EventGenerator,
): void {
    app.post('/faults/ac-fail/on', async () => {
        eventGen.setAcFail(true);
        return { action: 'ac_fail', state: 'on' };
    });

    app.post('/faults/ac-fail/off', async () => {
        eventGen.setAcFail(false);
        return { action: 'ac_fail', state: 'off' };
    });

    app.post('/faults/battery-low/on', async () => {
        eventGen.setBatteryLow(true);
        return { action: 'battery_low', state: 'on' };
    });

    app.post('/faults/battery-low/off', async () => {
        eventGen.setBatteryLow(false);
        return { action: 'battery_low', state: 'off' };
    });

    app.post('/faults/tamper/on', async () => {
        eventGen.setTamper(true);
        return { action: 'tamper', state: 'on' };
    });

    app.post('/faults/tamper/off', async () => {
        eventGen.setTamper(false);
        return { action: 'tamper', state: 'off' };
    });

    app.post('/faults/comm-fail/on', async () => {
        eventGen.setCommFailure(true);
        return { action: 'comm_fail', state: 'on' };
    });

    app.post('/faults/comm-fail/off', async () => {
        eventGen.setCommFailure(false);
        return { action: 'comm_fail', state: 'off' };
    });
}
