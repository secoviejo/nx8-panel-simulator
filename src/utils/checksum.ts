/**
 * Calcula el checksum XOR de un string.
 */
export function calculateXorChecksum(data: string): string {
    let xor = 0;
    for (let i = 0; i < data.length; i++) {
        xor ^= data.charCodeAt(i);
    }
    return xor.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Verifica si un checksum coincide con el calculado.
 */
export function verifyChecksum(data: string, expectedChecksum: string): boolean {
    return calculateXorChecksum(data) === expectedChecksum.toUpperCase();
}
