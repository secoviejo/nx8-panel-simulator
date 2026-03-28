import { SerialPort } from 'serialport';
import { AsciiDecoder } from '../../protocols/nx584/ascii/decoder.js';
import { AsciiEncoder } from '../../protocols/nx584/ascii/encoder.js';
import { extractFrames } from '../../protocols/nx584/ascii/framing.js';
import { EventGenerator } from '../../core/events/eventGenerator.js';
import { PanelStateManager } from '../../core/state/panel.js';
import { PartitionStateManager } from '../../core/state/partition.js';
import { ZoneStateManager } from '../../core/state/zone.js';
import type { DecodedMessage } from '../../protocols/nx584/types.js';
import type { ArmMode } from '../../core/state/types.js';
import { env } from '../../config/env.js';
import { createChildLogger } from '../../observability/logger.js';

export interface SerialLogEntry {
    id: number;
    timestamp: string;
    type: 'TX' | 'RX';
    payload: string;
}

const log = createChildLogger('serial-server');

/**
 * Servidor Serie (RS232) del simulador.
 * Abre una conexión punto a punto, decodifica peticiones y responde con tramas ASCII.
 */
export class SerialServer {
    private port: SerialPort | null = null;
    private isOpen = false;
    private buffer = '';
    private readonly decoder = new AsciiDecoder();
    private readonly encoder = new AsciiEncoder();

    private consoleLog: SerialLogEntry[] = [];
    private logIdCounter = 0;
    private readonly maxLogLines = 100;

    constructor(
        private readonly eventGenerator: EventGenerator,
        private readonly panel: PanelStateManager,
        private readonly partitions: PartitionStateManager,
        private readonly zones: ZoneStateManager,
    ) {
        log.info('Serial Server instanciado');
    }

    async start(path: string, baudRate: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.port = new SerialPort({ path, baudRate }, (err) => {
                if (err) {
                    log.error({ err, path, baudRate }, 'Error al abrir puerto serie');
                    return reject(err);
                }
            });

            this.port.on('open', () => {
                this.isOpen = true;
                log.info({ path, baudRate }, `Puerto Serie abierto en ${path} a ${baudRate} bps`);

                // Enviar config de interfaz al conectar (como en TCP)
                const configFrame = this.encoder.encodeInterfaceConfig(
                    env.SIM_PROTOCOL, 'NX-8', env.SIM_ZONE_COUNT, env.SIM_PARTITION_COUNT,
                );
                this.write(configFrame);
                resolve();
            });

            this.port.on('data', (data: Buffer) => {
                this.buffer += data.toString('ascii');

                const { frames, remainder } = extractFrames(this.buffer);
                this.buffer = remainder;

                for (const frame of frames) {
                    this.handleFrame(frame);
                }
            });

            this.port.on('close', () => {
                this.isOpen = false;
                log.warn({ path }, 'Puerto Serie cerrado');
            });

            this.port.on('error', (err) => {
                this.isOpen = false;
                log.error({ err, path }, 'Error en el puerto Serie');
            });
        });
    }

    public write(data: string): void {
        const cleanPayload = data.replace(/\r?\n?/g, '');
        this.appendLog('TX', cleanPayload);

        if (!this.isOpen || !this.port) return;
        this.port.write(data, 'ascii', (err) => {
            if (err) {
                log.error({ err }, 'Error escribiendo en puerto Serie');
            }
        });
    }

    public getLogs(sinceId: number = 0): SerialLogEntry[] {
        return this.consoleLog.filter((l) => l.id > sinceId);
    }

    private appendLog(type: 'TX' | 'RX', payload: string): void {
        const id = ++this.logIdCounter;
        this.consoleLog.push({
            id,
            timestamp: new Date().toISOString(),
            type,
            payload
        });
        if (this.consoleLog.length > this.maxLogLines) {
            this.consoleLog.shift();
        }
    }

    public isRunning(): boolean {
        return this.isOpen;
    }

    private handleFrame(raw: string): void {
        this.appendLog('RX', raw.replace(/\r?\n?/g, ''));
        const message = this.decoder.decode(raw);
        if (!message) return;

        log.debug({ type: message.type, subType: message.subType }, 'Mensaje serie recibido');

        switch (message.type) {
            case 'RQ':
                this.handleRequest(message);
                break;
            case 'CM':
                this.handleCommand(message);
                break;
        }
    }

    private handleRequest(msg: DecodedMessage): void {
        let response: string | null = null;

        switch (msg.subType) {
            case 'ZS': {
                const zoneId = parseInt(msg.args[0], 10);
                const zone = this.zones.getZone(zoneId);
                if (zone) {
                    response = this.encoder.encodeZoneStatus(
                        zone.id, zone.open, zone.alarm, zone.bypassed, zone.tamper, zone.fault, zone.name,
                    );
                }
                break;
            }
            case 'ZN': {
                const allZones = this.zones.getAllZones();
                response = this.encoder.encodeZonesSnapshot(
                    allZones.map((z) => ({ id: z.id, open: z.open })),
                );
                break;
            }
            case 'PS': {
                const partId = parseInt(msg.args[0], 10);
                const partition = this.partitions.getPartition(partId);
                if (partition) {
                    response = this.encoder.encodePartitionStatus(
                        partition.id, partition.armed, partition.armMode, partition.ready, partition.alarm,
                    );
                }
                break;
            }
            case 'PN': {
                const allParts = this.partitions.getAllPartitions();
                response = this.encoder.encodePartitionsSnapshot(
                    allParts.map((p) => ({ id: p.id, armed: p.armed, ready: p.ready })),
                );
                break;
            }
            case 'SS': {
                const state = this.panel.getState();
                response = this.encoder.encodeSystemStatus(
                    state.online, state.acPower, state.batteryLow, state.tamper, state.trouble, state.commFailure,
                );
                break;
            }
            case 'IC': {
                response = this.encoder.encodeInterfaceConfig(
                    env.SIM_PROTOCOL, 'NX-8', env.SIM_ZONE_COUNT, env.SIM_PARTITION_COUNT,
                );
                break;
            }
        }

        if (response) {
            this.write(response);
        }
    }

    private handleCommand(msg: DecodedMessage): void {
        switch (msg.subType) {
            case 'ARM': {
                const partId = parseInt(msg.args[0], 10);
                const mode = (msg.args[1] as ArmMode) || 'away';
                this.eventGenerator.armPartition(partId, mode);
                break;
            }
            case 'DISARM': {
                const partId = parseInt(msg.args[0], 10);
                this.eventGenerator.disarmPartition(partId);
                break;
            }
            case 'ZONE_OPEN': {
                const zoneId = parseInt(msg.args[0], 10);
                this.eventGenerator.openZone(zoneId);
                break;
            }
            case 'ZONE_CLOSE': {
                const zoneId = parseInt(msg.args[0], 10);
                this.eventGenerator.closeZone(zoneId);
                break;
            }
            case 'ZONE_ALARM': {
                const zoneId = parseInt(msg.args[0], 10);
                this.eventGenerator.alarmZone(zoneId);
                break;
            }
            case 'ZONE_RESTORE': {
                const zoneId = parseInt(msg.args[0], 10);
                this.eventGenerator.restoreZone(zoneId);
                break;
            }
            default:
                log.warn({ subType: msg.subType }, 'Comando serie desconocido');
        }
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            if (this.port && this.isOpen) {
                this.port.close(() => {
                    log.info('Puerto Serie cerrado');
                    this.isOpen = false;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}
