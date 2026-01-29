/**
 * Ingest State - Checkpoint System for Resumable Imports
 *
 * Provides persistence for long-running import operations, allowing
 * users to resume interrupted imports and recover from errors.
 *
 * Features:
 * - Save checkpoints during import
 * - Resume from checkpoints
 * - List available checkpoints
 * - Auto-cleanup of completed checkpoints
 * - Progress tracking with file hashes
 */

import { storage } from './storage';

const CHECKPOINTS_STORE = 'checkpoints';
const CHECKPOINT_PREFIX = 'ingest_checkpoint_';
const MAX_CHECKPOINT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CHECKPOINTS = 10; // Keep only recent checkpoints

/**
 * File tracking information for checkpoint
 */
export interface CheckpointFile {
  /** File path relative to root */
  path: string;
  /** SHA-256 hash of file content */
  hash: string;
  /** Whether this file has been processed */
  processed: boolean;
  /** Error message if processing failed */
  error?: string;
  /** File size in bytes */
  size?: number;
  /** Last modified timestamp */
  lastModified?: number;
}

/**
 * Import checkpoint for resumable operations
 */
export interface IngestCheckpoint {
  /** Unique checkpoint ID */
  id: string;
  /** Creation timestamp */
  timestamp: number;
  /** Last updated timestamp */
  updatedAt: number;
  /** Source identifier (e.g., folder path or import ID) */
  sourceId: string;
  /** Human-readable source name */
  sourceName: string;
  /** Files being imported */
  files: CheckpointFile[];
  /** Associated manifest ID if created */
  manifestId?: string;
  /** Import metadata (settings, mappings, etc.) */
  metadata: Record<string, unknown>;
  /** Current import progress (0-100) */
  progress: number;
  /** Import status */
  status: 'in_progress' | 'completed' | 'failed' | 'paused';
  /** Error message if failed */
  errorMessage?: string;
  /** Total files count (for progress calculation) */
  totalFiles: number;
  /** Processed files count */
  processedFiles: number;
  /** Failed files count */
  failedFiles: number;
}

/**
 * Options for creating a new checkpoint
 */
export interface CreateCheckpointOptions {
  sourceId: string;
  sourceName: string;
  files: Array<{
    path: string;
    hash?: string;
    size?: number;
    lastModified?: number;
  }>;
  metadata?: Record<string, unknown>;
}

/**
 * Calculate SHA-256 hash of file content
 */
export async function calculateFileHash(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique checkpoint ID
 */
function generateCheckpointId(): string {
  return `${CHECKPOINT_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new checkpoint
 */
export async function createCheckpoint(
  options: CreateCheckpointOptions
): Promise<IngestCheckpoint> {
  const checkpoint: IngestCheckpoint = {
    id: generateCheckpointId(),
    timestamp: Date.now(),
    updatedAt: Date.now(),
    sourceId: options.sourceId,
    sourceName: options.sourceName,
    files: options.files.map(f => ({
      path: f.path,
      hash: f.hash || '',
      size: f.size,
      lastModified: f.lastModified,
      processed: false
    })),
    metadata: options.metadata || {},
    progress: 0,
    status: 'in_progress',
    totalFiles: options.files.length,
    processedFiles: 0,
    failedFiles: 0
  };

  await saveCheckpoint(checkpoint);
  await cleanupOldCheckpoints();

  return checkpoint;
}

/**
 * Save checkpoint to storage
 */
export async function saveCheckpoint(checkpoint: IngestCheckpoint): Promise<void> {
  checkpoint.updatedAt = Date.now();

  try {
    await storage.saveCheckpoint(checkpoint.id, checkpoint);
  } catch (error) {
    console.error('Failed to save checkpoint:', error);
    throw new Error(`Failed to save checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load checkpoint from storage
 */
export async function loadCheckpoint(id: string): Promise<IngestCheckpoint | null> {
  try {
    return await storage.loadCheckpoint(id);
  } catch (error) {
    console.error('Failed to load checkpoint:', error);
    return null;
  }
}

/**
 * List all available checkpoints
 */
export async function listCheckpoints(): Promise<IngestCheckpoint[]> {
  try {
    const checkpoints = await storage.listCheckpoints();

    // Filter out expired checkpoints
    const now = Date.now();
    const validCheckpoints = checkpoints.filter(cp =>
      now - cp.timestamp < MAX_CHECKPOINT_AGE_MS
    );

    // Sort by timestamp (newest first)
    return validCheckpoints.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to list checkpoints:', error);
    return [];
  }
}

/**
 * List checkpoints for a specific source
 */
export async function listCheckpointsForSource(sourceId: string): Promise<IngestCheckpoint[]> {
  const all = await listCheckpoints();
  return all.filter(cp => cp.sourceId === sourceId);
}

/**
 * Get the most recent active checkpoint for a source
 */
export async function getActiveCheckpoint(sourceId: string): Promise<IngestCheckpoint | null> {
  const checkpoints = await listCheckpointsForSource(sourceId);

  // Find first in-progress or paused checkpoint
  return checkpoints.find(cp => cp.status === 'in_progress' || cp.status === 'paused') || null;
}

/**
 * Delete a checkpoint
 */
export async function deleteCheckpoint(id: string): Promise<void> {
  try {
    await storage.deleteCheckpoint(id);
  } catch (error) {
    console.error('Failed to delete checkpoint:', error);
    throw new Error(`Failed to delete checkpoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Resume from a checkpoint
 */
export async function resumeFromCheckpoint(id: string): Promise<IngestCheckpoint> {
  const checkpoint = await loadCheckpoint(id);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${id} not found`);
  }

  if (checkpoint.status === 'completed') {
    throw new Error('Cannot resume a completed checkpoint');
  }

  // Update status to in_progress
  checkpoint.status = 'in_progress';
  checkpoint.errorMessage = undefined;
  await saveCheckpoint(checkpoint);

  return checkpoint;
}

/**
 * Mark a file as processed in the checkpoint
 */
export async function markFileProcessed(
  checkpointId: string,
  filePath: string,
  error?: string
): Promise<void> {
  const checkpoint = await loadCheckpoint(checkpointId);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  const file = checkpoint.files.find(f => f.path === filePath);

  if (file) {
    file.processed = true;
    file.error = error;

    if (error) {
      checkpoint.failedFiles++;
    } else {
      checkpoint.processedFiles++;
    }

    // Update progress
    checkpoint.progress = Math.round(
      (checkpoint.processedFiles / checkpoint.totalFiles) * 100
    );

    await saveCheckpoint(checkpoint);
  }
}

/**
 * Update checkpoint progress
 */
export async function updateCheckpointProgress(
  checkpointId: string,
  progress: number,
  message?: string
): Promise<void> {
  const checkpoint = await loadCheckpoint(checkpointId);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  checkpoint.progress = Math.min(100, Math.max(0, progress));

  if (message) {
    checkpoint.metadata.lastMessage = message;
  }

  await saveCheckpoint(checkpoint);
}

/**
 * Mark checkpoint as completed
 */
export async function completeCheckpoint(
  checkpointId: string,
  manifestId?: string
): Promise<void> {
  const checkpoint = await loadCheckpoint(checkpointId);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  checkpoint.status = 'completed';
  checkpoint.progress = 100;
  checkpoint.manifestId = manifestId;
  checkpoint.processedFiles = checkpoint.files.filter(f => f.processed && !f.error).length;
  checkpoint.failedFiles = checkpoint.files.filter(f => f.error).length;

  await saveCheckpoint(checkpoint);
}

/**
 * Mark checkpoint as failed
 */
export async function failCheckpoint(
  checkpointId: string,
  errorMessage: string
): Promise<void> {
  const checkpoint = await loadCheckpoint(checkpointId);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  checkpoint.status = 'failed';
  checkpoint.errorMessage = errorMessage;

  await saveCheckpoint(checkpoint);
}

/**
 * Pause a checkpoint (user-initiated)
 */
export async function pauseCheckpoint(checkpointId: string): Promise<void> {
  const checkpoint = await loadCheckpoint(checkpointId);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  checkpoint.status = 'paused';

  await saveCheckpoint(checkpoint);
}

/**
 * Get unprocessed files from checkpoint
 */
export async function getUnprocessedFiles(checkpointId: string): Promise<CheckpointFile[]> {
  const checkpoint = await loadCheckpoint(checkpointId);

  if (!checkpoint) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  return checkpoint.files.filter(f => !f.processed);
}

/**
 * Clean up old checkpoints (keep only MAX_CHECKPOINTS most recent)
 */
async function cleanupOldCheckpoints(): Promise<void> {
  try {
    const checkpoints = await listCheckpoints();

    // Remove expired checkpoints
    const now = Date.now();
    const expiredCheckpoints = checkpoints.filter(cp =>
      now - cp.timestamp > MAX_CHECKPOINT_AGE_MS
    );

    for (const cp of expiredCheckpoints) {
      await deleteCheckpoint(cp.id);
    }

    // Keep only MAX_CHECKPOINTS most recent
    const remaining = checkpoints.filter(cp =>
      now - cp.timestamp <= MAX_CHECKPOINT_AGE_MS
    );

    if (remaining.length > MAX_CHECKPOINTS) {
      const toDelete = remaining.slice(MAX_CHECKPOINTS);
      for (const cp of toDelete) {
        await deleteCheckpoint(cp.id);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old checkpoints:', error);
  }
}

/**
 * Clear all checkpoints
 */
export async function clearAllCheckpoints(): Promise<void> {
  try {
    const checkpoints = await listCheckpoints();

    for (const cp of checkpoints) {
      await deleteCheckpoint(cp.id);
    }
  } catch (error) {
    console.error('Failed to clear checkpoints:', error);
    throw new Error(`Failed to clear checkpoints: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format checkpoint age for display
 */
export function formatCheckpointAge(timestamp: number): string {
  const age = Date.now() - timestamp;

  if (age < 60000) {
    return 'Just now';
  } else if (age < 3600000) {
    const minutes = Math.floor(age / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (age < 86400000) {
    const hours = Math.floor(age / 3600000);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(age / 86400000);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Get checkpoint status display text
 */
export function getCheckpointStatusText(status: IngestCheckpoint['status']): string {
  const statusMap: Record<IngestCheckpoint['status'], string> = {
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'failed': 'Failed',
    'paused': 'Paused'
  };

  return statusMap[status];
}

/**
 * Get checkpoint status color
 */
export function getCheckpointStatusColor(status: IngestCheckpoint['status']): string {
  const colorMap: Record<IngestCheckpoint['status'], string> = {
    'in_progress': 'blue',
    'completed': 'green',
    'failed': 'red',
    'paused': 'amber'
  };

  return colorMap[status];
}

// Export default
export default {
  createCheckpoint,
  saveCheckpoint,
  loadCheckpoint,
  listCheckpoints,
  listCheckpointsForSource,
  getActiveCheckpoint,
  deleteCheckpoint,
  resumeFromCheckpoint,
  markFileProcessed,
  updateCheckpointProgress,
  completeCheckpoint,
  failCheckpoint,
  pauseCheckpoint,
  getUnprocessedFiles,
  clearAllCheckpoints,
  calculateFileHash,
  formatCheckpointAge,
  getCheckpointStatusText,
  getCheckpointStatusColor
};
