/**
 * Tipos compartidos del protocolo NX-584.
 * Interfaz común que deben implementar tanto ASCII como Binary.
 */

export interface ProtocolEncoder {
    encodeZoneStatus(zoneId: number, open: boolean, alarm: boolean, bypassed: boolean, tamper: boolean, fault: boolean, name: string): string;
    encodeZonesSnapshot(zones: Array<{ id: number; open: boolean }>): string;
    encodePartitionStatus(id: number, armed: boolean, armMode: string | null, ready: boolean, alarm: boolean): string;
    encodePartitionsSnapshot(partitions: Array<{ id: number; armed: boolean; ready: boolean }>): string;
    encodeSystemStatus(online: boolean, acPower: boolean, batteryLow: boolean, tamper: boolean, trouble: boolean, commFailure: boolean): string;
    encodeLogEvent(eventId: number, type: string, source: string, sourceId: number | undefined, description: string): string;
    encodeInterfaceConfig(protocol: string, model: string, zoneCount: number, partitionCount: number): string;
}

export interface ProtocolDecoder {
    decode(raw: string): DecodedMessage | null;
}

export interface DecodedMessage {
    type: 'RQ' | 'CM';
    subType: string;
    args: string[];
}
