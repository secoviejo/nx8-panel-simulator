import { MessageTypes } from './messageTypes.js';
import { buildFrame } from './framing.js';
import { padId } from '../../../utils/helpers.js';
import type { ProtocolEncoder } from '../types.js';

/**
 * Encoder del protocolo ASCII NX-584.
 * Convierte estados del simulador en tramas ASCII.
 */
export class AsciiEncoder implements ProtocolEncoder {
    encodeZoneStatus(
        zoneId: number,
        open: boolean,
        alarm: boolean,
        bypassed: boolean,
        tamper: boolean,
        fault: boolean,
        name: string,
    ): string {
        return buildFrame(MessageTypes.ZONE_STATUS, [
            padId(zoneId),
            open ? 'OPEN' : 'CLOSED',
            alarm ? '1' : '0',
            bypassed ? '1' : '0',
            tamper ? '1' : '0',
            fault ? '1' : '0',
            name,
        ]);
    }

    encodeZonesSnapshot(zones: Array<{ id: number; open: boolean }>): string {
        const count = zones.length.toString();
        const summary = zones.map((z) => `${padId(z.id)}:${z.open ? 'O' : 'C'}`).join(',');
        return buildFrame(MessageTypes.ZONES_SNAPSHOT, [count, summary]);
    }

    encodePartitionStatus(
        id: number,
        armed: boolean,
        armMode: string | null,
        ready: boolean,
        alarm: boolean,
    ): string {
        return buildFrame(MessageTypes.PARTITION_STATUS, [
            padId(id),
            armed ? `ARMED_${(armMode ?? 'away').toUpperCase()}` : 'DISARMED',
            ready ? 'READY' : 'NOT_READY',
            alarm ? '1' : '0',
        ]);
    }

    encodePartitionsSnapshot(
        partitions: Array<{ id: number; armed: boolean; ready: boolean }>,
    ): string {
        const count = partitions.length.toString();
        const summary = partitions.map((p) => `${padId(p.id)}:${p.armed ? 'A' : 'D'}:${p.ready ? 'R' : 'NR'}`).join(',');
        return buildFrame(MessageTypes.PARTITIONS_SNAPSHOT, [count, summary]);
    }

    encodeSystemStatus(
        online: boolean,
        acPower: boolean,
        batteryLow: boolean,
        tamper: boolean,
        trouble: boolean,
        commFailure: boolean,
    ): string {
        return buildFrame(MessageTypes.SYSTEM_STATUS, [
            online ? 'ONLINE' : 'OFFLINE',
            acPower ? 'AC_OK' : 'AC_FAIL',
            batteryLow ? 'BAT_LOW' : 'BAT_OK',
            tamper ? 'TAMPER' : 'NO_TAMPER',
            trouble ? 'TROUBLE' : 'NO_TROUBLE',
            commFailure ? 'COMM_FAIL' : 'COMM_OK',
        ]);
    }

    encodeLogEvent(
        eventId: number,
        type: string,
        source: string,
        sourceId: number | undefined,
        description: string,
    ): string {
        return buildFrame(MessageTypes.LOG_EVENT, [
            eventId.toString().padStart(4, '0'),
            type,
            source,
            sourceId !== undefined ? padId(sourceId) : '--',
            description,
        ]);
    }

    encodeInterfaceConfig(
        protocol: string,
        model: string,
        zoneCount: number,
        partitionCount: number,
    ): string {
        return buildFrame(MessageTypes.INTERFACE_CONFIG, [
            '01',
            protocol.toUpperCase(),
            model,
            zoneCount.toString(),
            padId(partitionCount, 3),
        ]);
    }
}
