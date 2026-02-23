/**
 * Conflict Detection — Pure computation (Category 1)
 *
 * Replaces useConflictDetection React hook.
 * Architecture doc §4 Cat 1: plain function.
 *
 * Pre-ingest conflict detection for duplicate filenames.
 */

export interface ConflictInfo {
  filename: string;
  existingId: string;
  newFile: File;
}

/**
 * Detect filename conflicts between new files and existing canvases.
 *
 * @param newFiles - Files about to be ingested
 * @param existingLabels - Map of canvas ID → label (from vault)
 * @returns Array of conflicts
 */
export function detectConflicts(
  newFiles: File[],
  existingLabels: Map<string, string>
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // Build a reverse map: label → id for O(1) lookups
  const labelToId = new Map<string, string>();
  for (const [id, label] of existingLabels) {
    labelToId.set(label.toLowerCase(), id);
  }

  for (const file of newFiles) {
    const nameWithoutExt = file.name.replace(/\.[^.]+$/, '').toLowerCase();
    const existing = labelToId.get(nameWithoutExt) || labelToId.get(file.name.toLowerCase());
    if (existing) {
      conflicts.push({
        filename: file.name,
        existingId: existing,
        newFile: file,
      });
    }
  }

  return conflicts;
}

/**
 * Detect duplicate filenames within a batch (not against existing).
 */
export function detectDuplicatesInBatch(files: File[]): Map<string, File[]> {
  const byName = new Map<string, File[]>();

  for (const file of files) {
    const key = file.name.toLowerCase();
    const group = byName.get(key);
    if (group) {
      group.push(file);
    } else {
      byName.set(key, [file]);
    }
  }

  // Only return groups with duplicates
  const duplicates = new Map<string, File[]>();
  for (const [name, group] of byName) {
    if (group.length > 1) {
      duplicates.set(name, group);
    }
  }
  return duplicates;
}
