/**
 * Archive Feature Model
 *
 * Domain-specific selectors and helpers for the archive feature.
 * Re-exports from entities and adds archive-specific logic.
 */

import { getIIIFValue, type IIIFCanvas, type IIIFItem } from '@/src/shared/types';
import { canvas, manifest } from '@/src/entities';

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

export type SortDirection = 'asc' | 'desc';

/**
 * Sort canvases by name or date with direction control
 */
export const sortCanvases = (
  canvases: IIIFCanvas[],
  sortBy: 'name' | 'date',
  direction: SortDirection = 'asc'
): IIIFCanvas[] => {
  return [...canvases].sort((a, b) => {
    let result: number;
    if (sortBy === 'name') {
      result = getIIIFValue(a.label).localeCompare(getIIIFValue(b.label));
    } else {
      result = (a.navDate || '').localeCompare(b.navDate || '');
    }
    return direction === 'desc' ? -result : result;
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
// Manifest Grouping
// ============================================================================

export interface ManifestGroup {
  manifestId: string;
  manifestLabel: string;
  canvases: IIIFCanvas[];
}

/**
 * Group canvases by their parent manifest.
 * Traverses the tree to build manifestId -> label lookup,
 * then groups canvases by _parentId.
 */
export const groupByManifestFn = (root: IIIFItem): ManifestGroup[] => {
  if (!root) return [];

  const manifestLabels = new Map<string, string>();
  const manifestCanvases = new Map<string, IIIFCanvas[]>();

  const traverse = (item: IIIFItem, parentManifestId: string | null) => {
    if (item.type === 'Manifest') {
      const label = getIIIFValue(item.label) || 'Untitled Manifest';
      manifestLabels.set(item.id, label);
      parentManifestId = item.id;
    }

    if (item.type === 'Canvas' && parentManifestId) {
      const list = manifestCanvases.get(parentManifestId) || [];
      list.push(item as IIIFCanvas);
      manifestCanvases.set(parentManifestId, list);
    }

    if ('items' in item && Array.isArray(item.items)) {
      item.items.forEach(child => traverse(child, parentManifestId));
    }
  };

  // If root is a Manifest itself, use it as parent
  if (root.type === 'Manifest') {
    traverse(root, root.id);
  } else {
    traverse(root, null);
  }

  // Collect ungrouped canvases (direct children of root Collection with no manifest parent)
  const ungrouped: IIIFCanvas[] = [];
  if (root.type === 'Collection' && 'items' in root && Array.isArray(root.items)) {
    for (const item of root.items) {
      if (item.type === 'Canvas') {
        ungrouped.push(item as IIIFCanvas);
      }
    }
  }

  const groups: ManifestGroup[] = [];

  for (const [manifestId, canvases] of manifestCanvases) {
    groups.push({
      manifestId,
      manifestLabel: manifestLabels.get(manifestId) || 'Untitled Manifest',
      canvases,
    });
  }

  if (ungrouped.length > 0) {
    groups.push({
      manifestId: '__ungrouped__',
      manifestLabel: 'Ungrouped',
      canvases: ungrouped,
    });
  }

  return groups;
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
  viewMode: 'field-studio:archive-view-mode',
  sortMode: 'field-studio:archive-sort-mode'
} as const;

/**
 * Load persisted view mode from localStorage
 */
export const loadViewMode = (): ArchiveViewMode => {
  if (typeof window === 'undefined') return 'grid';
  const saved = localStorage.getItem(STORAGE_KEYS.viewMode);
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
  localStorage.setItem(STORAGE_KEYS.viewMode, mode);
};
