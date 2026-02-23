/**
 * useConflictDetection Hook
 *
 * Pre-ingest scan for duplicate filenames and merge conflicts.
 * Scans the FileTree to detect potential naming collisions before ingest.
 *
 * @module features/staging/model/useConflictDetection
 */

import { useMemo } from 'react';
import type { FileTree, IIIFItem } from '@/src/shared/types';

export interface DuplicateEntry {
  name: string;
  paths: string[];
}

export interface ConflictReport {
  duplicateNames: DuplicateEntry[];
  totalDuplicates: number;
  hasConflicts: boolean;
}

/**
 * Recursively collect all filenames with their full paths
 */
function collectFilePaths(tree: FileTree, result: Map<string, string[]>): void {
  for (const [fileName] of tree.files) {
    const filePath = tree.path ? `${tree.path}/${fileName}` : fileName;
    const existing = result.get(fileName) || [];
    existing.push(filePath);
    result.set(fileName, existing);
  }
  for (const dir of tree.directories.values()) {
    collectFilePaths(dir, result);
  }
}

/**
 * Detect naming conflicts in a file tree
 */
export function detectConflicts(tree: FileTree, existingRoot?: IIIFItem | null): ConflictReport {
  const filesByName = new Map<string, string[]>();
  collectFilePaths(tree, filesByName);

  const duplicateNames: DuplicateEntry[] = [];

  for (const [name, paths] of filesByName) {
    if (paths.length > 1) {
      duplicateNames.push({ name, paths });
    }
  }

  return {
    duplicateNames,
    totalDuplicates: duplicateNames.reduce((sum, d) => sum + d.paths.length, 0),
    hasConflicts: duplicateNames.length > 0,
  };
}

/**
 * Hook that computes conflict detection for a FileTree
 */
export function useConflictDetection(
  tree: FileTree,
  existingRoot: IIIFItem | null,
): ConflictReport {
  return useMemo(
    () => detectConflicts(tree, existingRoot),
    [tree, existingRoot],
  );
}
