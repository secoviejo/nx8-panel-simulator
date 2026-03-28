import { createChildLogger } from './logger.js';

const log = createChildLogger('metrics');

/**
 * Métricas internas del simulador.
 */
export class SimMetrics {
    private startedAt = new Date();
    private tcpConnections = 0;
    private tcpDisconnections = 0;
    private framesEncoded = 0;
    private framesDecoded = 0;
    private eventsGenerated = 0;
    private scenariosRun = 0;

    constructor() {
        log.info('Métricas inicializadas');
    }

    incrementConnections(): void { this.tcpConnections++; }
    incrementDisconnections(): void { this.tcpDisconnections++; }
    incrementFramesEncoded(): void { this.framesEncoded++; }
    incrementFramesDecoded(): void { this.framesDecoded++; }
    incrementEvents(): void { this.eventsGenerated++; }
    incrementScenarios(): void { this.scenariosRun++; }

    getSnapshot() {
        return {
            uptime_seconds: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
            started_at: this.startedAt.toISOString(),
            tcp: {
                total_connections: this.tcpConnections,
                total_disconnections: this.tcpDisconnections,
            },
            protocol: {
                frames_encoded: this.framesEncoded,
                frames_decoded: this.framesDecoded,
            },
            events: {
                total_generated: this.eventsGenerated,
            },
            scenarios: {
                total_run: this.scenariosRun,
            },
        };
    }

    reset(): void {
        this.startedAt = new Date();
        this.tcpConnections = 0;
        this.tcpDisconnections = 0;
        this.framesEncoded = 0;
        this.framesDecoded = 0;
        this.eventsGenerated = 0;
        this.scenariosRun = 0;
    }
}
