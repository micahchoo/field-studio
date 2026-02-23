/**
 * statusBarHelpers.ts
 *
 * Pure utility functions extracted from StatusBar.svelte.
 * Handles byte formatting, storage bar colour selection, and severity counting.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationIssue {
  id: string;
  level: 'error' | 'warning' | 'info';
  message: string;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Convert a byte count to a human-readable string with the appropriate unit
 * (B, KB, MB, GB, TB).
 *
 * @param bytes    - The number of bytes.
 * @param decimals - Decimal places in the output (default 1, clamped to >= 0).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Return a Tailwind background-colour class for the storage usage bar
 * based on the usage percentage.
 *
 *   > 80 %  -> red   (bg-nb-red)
 *   > 50 %  -> orange (bg-nb-orange)
 *   <= 50 % -> green  (bg-nb-green)
 */
export function getStorageBarColor(percent: number): string {
  if (percent > 80) return 'bg-nb-red';
  if (percent > 50) return 'bg-nb-orange';
  return 'bg-nb-green';
}

/**
 * Count validation issues by severity, returning separate totals for
 * errors and warnings. Items with level 'info' are not counted.
 */
export function countBySeverity(
  issues: { level: string }[],
): { errorCount: number; warningCount: number } {
  let errorCount = 0;
  let warningCount = 0;
  for (const issue of issues) {
    if (issue.level === 'error') errorCount++;
    else if (issue.level === 'warning') warningCount++;
  }
  return { errorCount, warningCount };
}
