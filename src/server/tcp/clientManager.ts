import type { Socket } from 'node:net';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('client-manager');

export interface ClientInfo {
    id: string;
    socket: Socket;
    remoteAddress: string;
    connectedAt: Date;
    bytesReceived: number;
    bytesSent: number;
}

/**
 * Gestiona los clientes TCP conectados al simulador.
 */
export class ClientManager {
    private clients: Map<string, ClientInfo> = new Map();
    private clientCounter = 0;
    private readonly maxClients: number;

    constructor(maxClients: number) {
        this.maxClients = maxClients;
        log.info({ maxClients }, 'Client manager inicializado');
    }

    /** Registra un nuevo cliente. Retorna null si se excede el límite. */
    addClient(socket: Socket): ClientInfo | null {
        if (this.clients.size >= this.maxClients) {
            log.warn({ current: this.clients.size, max: this.maxClients }, 'Límite de clientes alcanzado');
            return null;
        }

        const id = `client-${++this.clientCounter}`;
        const info: ClientInfo = {
            id,
            socket,
            remoteAddress: `${socket.remoteAddress}:${socket.remotePort}`,
            connectedAt: new Date(),
            bytesReceived: 0,
            bytesSent: 0,
        };

        this.clients.set(id, info);
        log.info({ id, remote: info.remoteAddress, total: this.clients.size }, 'Cliente conectado');
        return info;
    }

    removeClient(id: string): void {
        const client = this.clients.get(id);
        if (client) {
            this.clients.delete(id);
            log.info({ id, remote: client.remoteAddress, total: this.clients.size }, 'Cliente desconectado');
        }
    }

    getClient(id: string): ClientInfo | undefined {
        return this.clients.get(id);
    }

    getAllClients(): ClientInfo[] {
        return Array.from(this.clients.values());
    }

    getClientCount(): number {
        return this.clients.size;
    }

    /** Envía datos a un cliente específico */
    sendToClient(id: string, data: string): boolean {
        const client = this.clients.get(id);
        if (!client || client.socket.destroyed) return false;

        try {
            client.socket.write(data);
            client.bytesSent += Buffer.byteLength(data);
            return true;
        } catch {
            log.error({ id }, 'Error enviando datos al cliente');
            return false;
        }
    }

    /** Envía datos a todos los clientes conectados */
    broadcast(data: string): number {
        let sent = 0;
        for (const [id] of this.clients) {
            if (this.sendToClient(id, data)) sent++;
        }
        return sent;
    }

    /** Desconecta todos los clientes */
    disconnectAll(): void {
        for (const [, client] of this.clients) {
            client.socket.destroy();
        }
        this.clients.clear();
        log.info('Todos los clientes desconectados');
    }

    trackBytesReceived(id: string, bytes: number): void {
        const client = this.clients.get(id);
        if (client) client.bytesReceived += bytes;
    }
}
