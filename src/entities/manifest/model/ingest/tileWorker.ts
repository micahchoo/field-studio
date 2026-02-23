/**
 * Tile Worker -- Stub (disabled)
 * Client-side tile generation is disabled.
 */
export const TILE_GENERATION_ENABLED = false;

export function generateTiles(_imageData: ImageData, _tileSize: number): void {
  // No-op: tile generation disabled
}

/** Generate derivative image asynchronously -- stub */
export async function generateDerivativeAsync(
  _blob: Blob,
  _options?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<Blob | null> {
  return null;
}

/** Get tile worker pool instance -- stub */
export function getTileWorkerPool(): null {
  return null;
}
