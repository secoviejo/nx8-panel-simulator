import net from 'node:net';
import { ClientManager } from './clientManager.js';
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
import { SIMULATOR_VERSION } from '../../config/defaults.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('tcp-server');

/**
 * Servidor TCP principal del simulador.
 * Acepta conexiones, decodifica peticiones y responde con tramas ASCII.
 */
export class TcpServer {
    private server: net.Server | null = null;
    private readonly decoder = new AsciiDecoder();
    private readonly encoder = new AsciiEncoder();

    constructor(
        private readonly clientManager: ClientManager,
        private readonly eventGenerator: EventGenerator,
        private readonly panel: PanelStateManager,
        private readonly partitions: PartitionStateManager,
        private readonly zones: ZoneStateManager,
    ) {
        log.info('TCP Server creado');
    }

    async start(host: string, port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => this.handleConnection(socket));

            this.server.on('error', (err) => {
                log.error({ err }, 'Error en TCP server');
                reject(err);
            });

            this.server.listen(port, host, () => {
                log.info({ host, port }, `TCP Server escuchando en ${host}:${port}`);
                resolve();
            });
        });
    }

    private handleConnection(socket: net.Socket): void {
        const client = this.clientManager.addClient(socket);

        if (!client) {
            socket.write('ERROR: Limite de clientes alcanzado\n');
            socket.destroy();
            return;
        }

        let buffer = '';

        // Enviar config de interfaz al conectar
        const configFrame = this.encoder.encodeInterfaceConfig(
            env.SIM_PROTOCOL, 'NX-8', env.SIM_ZONE_COUNT, env.SIM_PARTITION_COUNT,
        );
        socket.write(configFrame);

        // Timeout
        if (env.SIM_TCP_TIMEOUT_MS > 0) {
            socket.setTimeout(env.SIM_TCP_TIMEOUT_MS);
        }

        socket.on('data', (data) => {
            buffer += data.toString();
            this.clientManager.trackBytesReceived(client.id, data.length);

            const { frames, remainder } = extractFrames(buffer);
            buffer = remainder;

            for (const frame of frames) {
                this.handleFrame(client.id, frame);
            }
        });

        socket.on('close', () => {
            this.clientManager.removeClient(client.id);
        });

        socket.on('error', (err) => {
            log.warn({ clientId: client.id, err: err.message }, 'Error de socket');
            this.clientManager.removeClient(client.id);
        });

        socket.on('timeout', () => {
            log.info({ clientId: client.id }, 'Timeout de cliente');
            socket.destroy();
        });
    }

    private handleFrame(clientId: string, raw: string): void {
        const message = this.decoder.decode(raw);
        if (!message) return;

        log.debug({ clientId, type: message.type, subType: message.subType }, 'Mensaje recibido');

        switch (message.type) {
            case 'RQ':
                this.handleRequest(clientId, message);
                break;
            case 'CM':
                this.handleCommand(clientId, message);
                break;
        }
    }

    private handleRequest(clientId: string, msg: DecodedMessage): void {
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
            this.clientManager.sendToClient(clientId, response);
        }
    }

    private handleCommand(clientId: string, msg: DecodedMessage): void {
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
                log.warn({ clientId, subType: msg.subType }, 'Comando desconocido');
        }
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            this.clientManager.disconnectAll();
            if (this.server) {
                this.server.close(() => {
                    log.info('TCP Server detenido');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    isListening(): boolean {
        return this.server?.listening ?? false;
    }
}
