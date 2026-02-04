/**
 * Archive Feature Model
 *
 * Domain-specific selectors and helpers for the archive feature.
 * Re-exports from entities and adds archive-specific logic.
 */

import type { IIIFCanvas, IIIFItem } from '@/types';
import { getIIIFValue } from '@/types';
import { canvas, manifest } from '@/src/entities';
import type { NormalizedState } from '@/services/vault';

// Re-export entity models for convenience
export { manifest, canvas };

// ============================================================================
// Archive-Specific Selectors
// ============================================================================

/**
 * Get all canvases from a root item (flattened from all manifests)
 */
export const selectAllCanvases = (root: IIIFItem | null): IIIFCanvas[] => {
  if (!root) return [];

  const canvases: IIIFCanvas[] = [];

  const traverse = (item: IIIFItem) => {
    if (item.type === 'Canvas') {
      canvases.push(item as IIIFCanvas);
    }
    if ('items' in item && Array.isArray(item.items)) {
      item.items.forEach(traverse);
    }
  };

  traverse(root);
  return canvases;
};

/**
 * Filter canvases by search term (matches label)
 */
export const filterByTerm = (canvases: IIIFCanvas[], term: string): IIIFCanvas[] => {
  // Guard against non-string term
  const safeTerm = typeof term === 'string' ? term : '';
  if (!safeTerm.trim()) return canvases;

  const lowerTerm = safeTerm.toLowerCase();
  return canvases.filter(c => {
    const label = getIIIFValue(c.label);
    return label.toLowerCase().includes(lowerTerm);
  });
};

/**
 * Sort canvases by name or date
 */
export const sortCanvases = (
  canvases: IIIFCanvas[],
  sortBy: 'name' | 'date'
): IIIFCanvas[] => {
  return [...canvases].sort((a, b) => {
    if (sortBy === 'name') {
      return getIIIFValue(a.label).localeCompare(getIIIFValue(b.label));
    }
    // Sort by navDate (descending - newest first)
    return (b.navDate || '').localeCompare(a.navDate || '');
  });
};

/**
 * Get file "DNA" - metadata presence indicators
 */
export interface FileDNA {
  hasTime: boolean;
  hasLocation: boolean;
  hasDevice: boolean;
}

export const getFileDNA = (item: IIIFItem): FileDNA => {
  const dna: FileDNA = { hasTime: false, hasLocation: false, hasDevice: false };

  if (!item.metadata) return dna;

  // Check for date
  const hasDate = item.navDate || item.metadata.some(m => {
    const label = getIIIFValue(m.label).toLowerCase();
    return label === 'date created' || label === 'date';
  });
  dna.hasTime = !!hasDate;

  // Check for location
  const hasLocation = item.metadata.some(m => {
    const label = getIIIFValue(m.label).toLowerCase();
    return label === 'location' || label === 'gps' || label === 'coordinates';
  });
  dna.hasLocation = hasLocation;

  // Check for device/camera
  const hasDevice = item.metadata.some(m => {
    const label = getIIIFValue(m.label).toLowerCase();
    return label === 'camera' || label === 'device' || label === 'make';
  });
  dna.hasDevice = hasDevice;

  return dna;
};

/**
 * Get selection DNA - aggregate metadata presence for selected items
 */
export interface SelectionDNA {
  hasGPS: boolean;
  hasTime: boolean;
  count: number;
}

export const getSelectionDNA = (items: IIIFItem[]): SelectionDNA => {
  const dna: SelectionDNA = {
    hasGPS: false,
    hasTime: false,
    count: items.length
  };

  for (const item of items) {
    const fileDNA = getFileDNA(item);
    if (fileDNA.hasLocation) dna.hasGPS = true;
    if (fileDNA.hasTime) dna.hasTime = true;
    if (dna.hasGPS && dna.hasTime) break; // Early exit if both found
  }

  return dna;
};

// ============================================================================
// View Mode Types
// ============================================================================

export type ArchiveViewMode = 'grid' | 'list' | 'map' | 'timeline';

export const VIEW_MODE_OPTIONS: Array<{ value: ArchiveViewMode; icon: string; label: string }> = [
  { value: 'grid', icon: 'grid_view', label: 'Grid' },
  { value: 'list', icon: 'view_list', label: 'List' },
  { value: 'map', icon: 'map', label: 'Map' },
  { value: 'timeline', icon: 'timeline', label: 'Timeline' }
];

export type SortMode = 'name' | 'date';

export const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'name', label: 'Name' },
  { value: 'date', label: 'Date' }
];

// ============================================================================
// Local Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  VIEW_MODE: 'field-studio:archive-view-mode',
  SORT_MODE: 'field-studio:archive-sort-mode'
} as const;

/**
 * Load persisted view mode from localStorage
 */
export const loadViewMode = (): ArchiveViewMode => {
  if (typeof window === 'undefined') return 'grid';
  const saved = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
  if (saved && ['grid', 'list', 'map', 'timeline'].includes(saved)) {
    return saved as ArchiveViewMode;
  }
  return 'grid';
};

/**
 * Persist view mode to localStorage
 */
export const saveViewMode = (mode: ArchiveViewMode): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
};
