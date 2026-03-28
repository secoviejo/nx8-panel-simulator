/**
 * Tipos del Lab Mode.
 */
export interface LabModeConfig {
    delayMs: number;
    jitterMs: number;
    corruptionEnabled: boolean;
    corruptionRate: number; // 0-1
    silenceMs: number;
}

export const LAB_MODE_DEFAULTS: LabModeConfig = {
    delayMs: 0,
    jitterMs: 0,
    corruptionEnabled: false,
    corruptionRate: 0.1,
    silenceMs: 0,
};
