/**
 * Catálogo de tipos de mensaje del protocolo ASCII.
 */
export const MessageTypes = {
    // Simulador -> Cliente
    INTERFACE_CONFIG: 'IC',
    ZONE_STATUS: 'ZS',
    ZONES_SNAPSHOT: 'ZN',
    PARTITION_STATUS: 'PS',
    PARTITIONS_SNAPSHOT: 'PN',
    SYSTEM_STATUS: 'SS',
    LOG_EVENT: 'LE',
    // Cliente -> Simulador
    REQUEST: 'RQ',
    COMMAND: 'CM',
} as const;

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes];

/** Caracteres de framing */
export const STX = '~';
export const ETX = '\n';
export const SEPARATOR = '|';
