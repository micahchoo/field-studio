/**
 * File Integrity Service - Content-Addressable Storage with SHA-256
 *
 * Implements the Tropy pattern for file integrity:
 * - SHA-256 hash generation for all ingested files
 * - Deduplication via content fingerprinting
 * - File move/rename tracking via hash lookup
 * - "Consolidator" flow for broken links
 *
 * @see ARCHITECTURE_INSPIRATION.md - "Content-Addressable Storage (Hashing)" pattern
 */

import { DBSchema, IDBPDatabase, openDB } from 'idb';

// ============================================================================
// Types
// ============================================================================

export interface FileFingerprint {
  /** SHA-256 hash of file content */
  hash: string;
  /** Original file size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** First seen timestamp */
  firstSeen: number;
  /** Last verified timestamp */
  lastVerified: number;
  /** Associated entity IDs (canvases, annotations) */
  entityIds: string[];
  /** Original filename(s) this hash was seen with */
  filenames: string[];
}

export interface HashLookupResult {
  exists: boolean;
  fingerprint?: FileFingerprint;
  isDuplicate?: boolean;
  existingEntityId?: string;
}

export interface IntegrityCheckResult {
  id: string;
  status: 'valid' | 'missing' | 'corrupted' | 'moved';
  expectedHash?: string;
  actualHash?: string;
  suggestedPath?: string;
}

// ============================================================================
// Database Schema
// ============================================================================

const DB_NAME = 'biiif-integrity-db';
const DB_VERSION = 1;

interface IntegrityDB extends DBSchema {
  /** Hash → Fingerprint mapping */
  fingerprints: {
    key: string; // hash
    value: FileFingerprint;
  };
  /** Entity ID → Hash mapping for quick lookups */
  entityHashes: {
    key: string; // entity ID
    value: string; // hash
  };
  /** Filename → Hash index for consolidator */
  filenameIndex: {
    key: string; // filename
    value: string[]; // hashes (same filename could have different content over time)
  };
}

// ============================================================================
// SHA-256 Hashing
// ============================================================================

/**
 * Calculate SHA-256 hash of a file/blob
 * Uses Web Crypto API for performance
 */
export async function calculateHash(data: Blob | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;

  if (data instanceof Blob) {
    buffer = await data.arrayBuffer();
  } else {
    buffer = data;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Calculate hash for a File with progress callback (for large files)
 */
export async function calculateHashWithProgress(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
  const chunks: ArrayBuffer[] = [];
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await chunk.arrayBuffer();
    chunks.push(buffer);
    offset += CHUNK_SIZE;

    if (onProgress) {
      onProgress(Math.min(100, Math.round((offset / file.size) * 100)));
    }
  }

  // Concatenate all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let position = 0;

  for (const chunk of chunks) {
    combined.set(new Uint8Array(chunk), position);
    position += chunk.byteLength;
  }

  return calculateHash(combined.buffer);
}

// ============================================================================
// File Integrity Service
// ============================================================================

class FileIntegrityService {
  private dbPromise: Promise<IDBPDatabase<IntegrityDB>>;

  constructor() {
    this.dbPromise = openDB<IntegrityDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('fingerprints')) {
          db.createObjectStore('fingerprints');
        }
        if (!db.objectStoreNames.contains('entityHashes')) {
          db.createObjectStore('entityHashes');
        }
        if (!db.objectStoreNames.contains('filenameIndex')) {
          db.createObjectStore('filenameIndex');
        }
      }
    });
  }

  /**
   * Register a file and get its fingerprint
   * Returns existing fingerprint if file is a duplicate
   */
  async registerFile(
    file: File | Blob,
    entityId: string,
    filename?: string
  ): Promise<HashLookupResult> {
    const hash = await calculateHash(file);
    const db = await this.dbPromise;

    // Check if hash already exists
    const existing = await db.get('fingerprints', hash);

    if (existing) {
      // File is a duplicate - update associations
      if (!existing.entityIds.includes(entityId)) {
        existing.entityIds.push(entityId);
      }
      if (filename && !existing.filenames.includes(filename)) {
        existing.filenames.push(filename);
      }
      existing.lastVerified = Date.now();

      await db.put('fingerprints', existing, hash);
      await db.put('entityHashes', hash, entityId);

      return {
        exists: true,
        fingerprint: existing,
        isDuplicate: true,
        existingEntityId: existing.entityIds[0]
      };
    }

    // New file - create fingerprint
    const fingerprint: FileFingerprint = {
      hash,
      size: file.size,
      mimeType: file.type || 'application/octet-stream',
      firstSeen: Date.now(),
      lastVerified: Date.now(),
      entityIds: [entityId],
      filenames: filename ? [filename] : []
    };

    await db.put('fingerprints', fingerprint, hash);
    await db.put('entityHashes', hash, entityId);

    // Update filename index
    if (filename) {
      const existingFilenames = await db.get('filenameIndex', filename) || [];
      if (!existingFilenames.includes(hash)) {
        existingFilenames.push(hash);
        await db.put('filenameIndex', existingFilenames, filename);
      }
    }

    return {
      exists: false,
      fingerprint,
      isDuplicate: false
    };
  }

  /**
   * Get fingerprint by hash
   */
  async getFingerprint(hash: string): Promise<FileFingerprint | undefined> {
    const db = await this.dbPromise;
    return db.get('fingerprints', hash);
  }

  /**
   * Get hash for an entity ID
   */
  async getHashForEntity(entityId: string): Promise<string | undefined> {
    const db = await this.dbPromise;
    return db.get('entityHashes', entityId);
  }

  /**
   * Find files by filename (for consolidator flow)
   */
  async findByFilename(filename: string): Promise<FileFingerprint[]> {
    const db = await this.dbPromise;
    const hashes = await db.get('filenameIndex', filename) || [];
    const fingerprints: FileFingerprint[] = [];

    for (const hash of hashes) {
      const fp = await db.get('fingerprints', hash);
      if (fp) fingerprints.push(fp);
    }

    return fingerprints;
  }

  /**
   * Verify file integrity by comparing stored hash with actual content
   */
  async verifyFile(entityId: string, currentContent: Blob): Promise<IntegrityCheckResult> {
    const db = await this.dbPromise;
    const expectedHash = await db.get('entityHashes', entityId);

    if (!expectedHash) {
      return { id: entityId, status: 'missing' };
    }

    const actualHash = await calculateHash(currentContent);

    if (actualHash === expectedHash) {
      // Update last verified timestamp
      const fingerprint = await db.get('fingerprints', expectedHash);
      if (fingerprint) {
        fingerprint.lastVerified = Date.now();
        await db.put('fingerprints', fingerprint, expectedHash);
      }

      return { id: entityId, status: 'valid', expectedHash, actualHash };
    }

    // Hash mismatch - check if content matches a different known file
    const matchingFingerprint = await db.get('fingerprints', actualHash);
    if (matchingFingerprint) {
      return {
        id: entityId,
        status: 'moved',
        expectedHash,
        actualHash,
        suggestedPath: matchingFingerprint.filenames[0]
      };
    }

    return { id: entityId, status: 'corrupted', expectedHash, actualHash };
  }

  /**
   * Check for duplicate before import
   */
  async checkDuplicate(file: File | Blob): Promise<HashLookupResult> {
    const hash = await calculateHash(file);
    const db = await this.dbPromise;
    const existing = await db.get('fingerprints', hash);

    if (existing) {
      return {
        exists: true,
        fingerprint: existing,
        isDuplicate: true,
        existingEntityId: existing.entityIds[0]
      };
    }

    return { exists: false, isDuplicate: false };
  }

  /**
   * Remove entity association from fingerprint
   */
  async removeEntityAssociation(entityId: string): Promise<void> {
    const db = await this.dbPromise;
    const hash = await db.get('entityHashes', entityId);

    if (hash) {
      const fingerprint = await db.get('fingerprints', hash);
      if (fingerprint) {
        fingerprint.entityIds = fingerprint.entityIds.filter(id => id !== entityId);

        if (fingerprint.entityIds.length === 0) {
          // No more associations - remove fingerprint
          await db.delete('fingerprints', hash);
        } else {
          await db.put('fingerprints', fingerprint, hash);
        }
      }

      await db.delete('entityHashes', entityId);
    }
  }

  /**
   * Get all fingerprints (for diagnostics)
   */
  async getAllFingerprints(): Promise<FileFingerprint[]> {
    const db = await this.dbPromise;
    return db.getAll('fingerprints');
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    duplicatesAvoided: number;
    oldestFile: number;
  }> {
    const fingerprints = await this.getAllFingerprints();

    let totalSize = 0;
    let duplicatesAvoided = 0;
    let oldestFile = Date.now();

    for (const fp of fingerprints) {
      totalSize += fp.size;
      // Each additional entity ID beyond the first represents an avoided duplicate
      duplicatesAvoided += Math.max(0, fp.entityIds.length - 1);
      if (fp.firstSeen < oldestFile) {
        oldestFile = fp.firstSeen;
      }
    }

    return {
      totalFiles: fingerprints.length,
      totalSize,
      duplicatesAvoided,
      oldestFile
    };
  }

  /**
   * Clear all integrity data
   */
  async clear(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear('fingerprints');
    await db.clear('entityHashes');
    await db.clear('filenameIndex');
  }

  /**
   * Export integrity database for backup
   */
  async export(): Promise<{
    fingerprints: Record<string, FileFingerprint>;
    entityHashes: Record<string, string>;
  }> {
    const db = await this.dbPromise;
    const fingerprints: Record<string, FileFingerprint> = {};
    const entityHashes: Record<string, string> = {};

    const allFingerprints = await db.getAll('fingerprints');
    const allKeys = await db.getAllKeys('fingerprints');

    for (let i = 0; i < allKeys.length; i++) {
      fingerprints[allKeys[i]] = allFingerprints[i];
    }

    const allEntityHashes = await db.getAll('entityHashes');
    const allEntityKeys = await db.getAllKeys('entityHashes');

    for (let i = 0; i < allEntityKeys.length; i++) {
      entityHashes[allEntityKeys[i]] = allEntityHashes[i];
    }

    return { fingerprints, entityHashes };
  }
}

export const fileIntegrity = new FileIntegrityService();
