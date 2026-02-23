/**
 * useIngestProgress — Stub for Svelte Migration
 *
 * Provides types and utility functions for ingest progress management.
 * The React hook is replaced by IngestProgressStore in ingestProgress.svelte.ts
 */

/**
 * Control functions for ingest operations
 */
export interface IngestControls {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  retry: () => void;
}

/**
 * Format ETA in seconds to a human-readable string
 */
export function formatETA(seconds: number): string {
  if (seconds <= 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format speed in bytes/second to a human-readable string
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return '0 B/s';
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let value = bytesPerSecond;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
