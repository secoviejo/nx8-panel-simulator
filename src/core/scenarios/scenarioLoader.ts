import { readdir, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import yaml from 'js-yaml';
import type { ScenarioConfig } from './types.js';
import { createChildLogger } from '../../observability/logger.js';

const log = createChildLogger('scenario-loader');

/**
 * Carga y valida escenarios desde archivos YAML o JSON.
 */
export class ScenarioLoader {
    constructor(private readonly scenariosDir: string) {}

    /** Lista los nombres de archivos de escenarios disponibles */
    async listFiles(): Promise<string[]> {
        try {
            const files = await readdir(this.scenariosDir);
            return files.filter((f) => ['.yaml', '.yml', '.json'].includes(extname(f).toLowerCase()));
        } catch {
            log.warn({ dir: this.scenariosDir }, 'Directorio de escenarios no encontrado');
            return [];
        }
    }

    /** Carga un escenario desde archivo */
    async load(filename: string): Promise<ScenarioConfig> {
        const filepath = join(this.scenariosDir, filename);
        log.info({ filepath }, `Cargando escenario: ${filename}`);

        const content = await readFile(filepath, 'utf-8');
        const ext = extname(filename).toLowerCase();

        let parsed: unknown;
        if (ext === '.json') {
            parsed = JSON.parse(content);
        } else {
            parsed = yaml.load(content);
        }

        // Validación básica
        const scenario = parsed as ScenarioConfig;
        if (!scenario.name || !scenario.sequence) {
            throw new Error(`Escenario inválido: debe tener 'name' y 'sequence'`);
        }

        log.info({ name: scenario.name, steps: scenario.sequence.length }, 'Escenario cargado');
        return scenario;
    }
}
