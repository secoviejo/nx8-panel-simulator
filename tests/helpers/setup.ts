/**
 * Helpers de test compartidos.
 */
import { PanelStateManager } from '../../src/core/state/panel.js';
import { PartitionStateManager } from '../../src/core/state/partition.js';
import { ZoneStateManager } from '../../src/core/state/zone.js';
import { SimEventBus } from '../../src/core/events/eventBus.js';
import { EventHistory } from '../../src/core/events/eventHistory.js';
import { EventGenerator } from '../../src/core/events/eventGenerator.js';

export function createTestEngine(zones = 8, partitions = 2) {
    const panel = new PanelStateManager();
    const partitionMgr = new PartitionStateManager(partitions);
    const zoneMgr = new ZoneStateManager(zones, partitions);
    const eventBus = new SimEventBus();
    const eventHistory = new EventHistory(100, eventBus);
    const eventGenerator = new EventGenerator(eventBus, panel, partitionMgr, zoneMgr);

    return { panel, partitions: partitionMgr, zones: zoneMgr, eventBus, eventHistory, eventGenerator };
}
