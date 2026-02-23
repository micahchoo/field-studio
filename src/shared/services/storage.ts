/**
 * Storage Service — Stub for Svelte Migration
 *
 * TODO: Copy full implementation from React source at
 * field-studio/src/shared/services/storage.ts
 *
 * This stub provides the storage singleton used by export services.
 * The real implementation uses IndexedDB for persisting IIIF assets.
 */

class StorageService {
  /**
   * Retrieve a stored asset (image, audio, video) by its ID/URL
   * Returns the Blob if found, null if not available
   */
  async getAsset(mediaId: string): Promise<Blob | null> {
    // TODO: Implement IndexedDB asset retrieval
    console.warn(`[StorageService] getAsset stub called for: ${mediaId}`);
    return null;
  }
}

export const storage = new StorageService();
