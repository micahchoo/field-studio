/**
 * Metadata Edit Feature Model
 *
 * Domain-specific selectors and helpers for the metadata-edit feature.
 * Manages metadata editing state: flat items, columns, filters, and validation.
 *
 * ATOMIC REFACTOR NOTE: This feature slice follows the Atomic Design philosophy.
 * - Organisms receive cx and fieldMode via props from FieldModeTemplate
 * - Molecules from shared/ui/molecules are composed here
 * - No prop-drilling of fieldMode - context is injected at template level
 *
 * LEGACY DECOMPOSITION:
 * - MetadataSpreadsheet.tsx (722 lines) → MetadataView organism
 * - MetadataEditor.tsx (395 lines) → MetadataEditorPanel organism
 * - Shared metadata logic → This model file
 *
 * TODO: Full refactoring requires extracting:
 *   - MetadataSpreadsheet table logic → MetadataView organism
 *   - MetadataEditor panel → MetadataEditorPanel organism  
 *   - CSV export/import → Export/Import molecules
 *   - Navigation guard logic → App-level hook
 *
 * @module features/metadata-edit/model
 */

import type { IIIFItem } from '@/types';
import { getIIIFValue } from '@/types';

/**
 * IIIF metadata pair structure
 * Follows IIIF Presentation API 3.0 metadata format
 */
interface IIIFMetadataPair {
  label: Record<string, string[]>;
  value: Record<string, string[]>;
}
import { canvas, collection, manifest } from '@/src/entities';

// Re-export entity models for convenience
export { manifest, canvas, collection };

// ============================================================================
// Types
// ============================================================================

/**
 * Flattened item for spreadsheet view
 * All IIIF resources are normalized to a common structure
 */
export interface FlatItem {
  id: string;
  type: string;
  label: string;
  summary: string;
  metadata: Record<string, string>;
  rights: string;
  navDate: string;
  viewingDirection: string;
  _blobUrl?: string;
}

/**
 * Resource type tabs for filtering
 */
export type ResourceTab = 'All' | 'Collection' | 'Manifest' | 'Canvas';

/**
 * Suggested Dublin Core properties for metadata editing
 */
export const IIIF_PROPERTY_SUGGESTIONS = [
  'Title',
  'Creator',
  'Date',
  'Description',
  'Subject',
  'Rights',
  'Source',
  'Type',
  'Format',
  'Identifier',
  'Language',
  'Coverage',
  'Publisher',
  'Contributor',
  'Relation',
] as const;

// ============================================================================
// Flattening & Normalization
// ============================================================================

/**
 * Flatten IIIF item to spreadsheet-compatible format
 * Recursively extracts metadata from nested structures
 *
 * @param item - IIIF item to flatten
 * @param typeFilter - Optional type filter (Collection, Manifest, Canvas)
 * @returns Array of flattened items
 */
export const flattenIIIFItem = (
  item: IIIFItem,
  typeFilter: ResourceTab = 'All'
): FlatItem[] => {
  const results: FlatItem[] = [];

  const shouldInclude = (type: string) => {
    if (typeFilter === 'All') return true;
    return type === typeFilter;
  };

  const flatten = (current: IIIFItem, depth = 0): void => {
    if (shouldInclude(current.type)) {
      const metadata: Record<string, string> = {};

      // Extract metadata pairs
      if (current.metadata) {
        current.metadata.forEach((m: IIIFMetadataPair) => {
          const key = getIIIFValue(m.label);
          const value = getIIIFValue(m.value);
          if (key && value) {
            metadata[key] = value;
          }
        });
      }

      results.push({
        id: current.id,
        type: current.type,
        label: getIIIFValue(current.label),
        summary: getIIIFValue(current.summary),
        metadata,
        rights: current.rights || '',
        navDate: current.navDate || '',
        viewingDirection: (current as any).viewingDirection || '',
      });
    }

    // Recurse into children
    if ('items' in current && Array.isArray(current.items)) {
      current.items.forEach((child) => flatten(child, depth + 1));
    }
  };

  flatten(item);
  return results;
};

/**
 * Flatten entire tree starting from root
 *
 * @param root - Root IIIF item
 * @param typeFilter - Optional type filter
 * @returns Array of all flattened items
 */
export const flattenTree = (
  root: IIIFItem | null,
  typeFilter: ResourceTab = 'All'
): FlatItem[] => {
  if (!root) return [];
  return flattenIIIFItem(root, typeFilter);
};

// ============================================================================
// Column Management
// ============================================================================

/**
 * Extract unique column names from flattened items
 * Combines standard columns with dynamic metadata columns
 *
 * @param items - Flattened items
 * @param maxDynamicCols - Maximum number of dynamic columns (prevents column explosion)
 * @returns Array of column names
 */
export const extractColumns = (
  items: FlatItem[],
  maxDynamicCols = 20
): string[] => {
  const standardCols = ['id', 'type', 'label', 'summary', 'rights', 'navDate'];
  const dynamicCols = new Set<string>();

  items.forEach((item) => {
    Object.keys(item.metadata).forEach((key) => dynamicCols.add(key));
  });

  // Sort dynamic columns by frequency (most common first)
  const sortedDynamic = Array.from(dynamicCols)
    .map((col) => ({
      name: col,
      count: items.filter((i) => i.metadata[col]).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, maxDynamicCols)
    .map((c) => c.name);

  return [...standardCols, ...sortedDynamic];
};

// ============================================================================
// Filtering
// ============================================================================

/**
 * Filter items by search term
 * Searches across label, summary, and metadata values
 *
 * @param items - Items to filter
 * @param term - Search term
 * @returns Filtered items
 */
export const filterByTerm = (items: FlatItem[], term: string): FlatItem[] => {
  if (!term.trim()) return items;

  const lowerTerm = term.toLowerCase();

  return items.filter((item) => {
    // Search in standard fields
    if (item.label.toLowerCase().includes(lowerTerm)) return true;
    if (item.summary.toLowerCase().includes(lowerTerm)) return true;
    if (item.id.toLowerCase().includes(lowerTerm)) return true;

    // Search in metadata
    return Object.entries(item.metadata).some(
      ([key, value]) =>
        key.toLowerCase().includes(lowerTerm) ||
        value.toLowerCase().includes(lowerTerm)
    );
  });
};

/**
 * Filter items by specific IDs
 * Used when showing filtered selection from other views
 *
 * @param items - Items to filter
 * @param ids - IDs to include
 * @returns Filtered items
 */
export const filterByIds = (items: FlatItem[], ids: string[]): FlatItem[] => {
  if (!ids || ids.length === 0) return items;
  return items.filter((item) => ids.includes(item.id));
};

// ============================================================================
// CSV Export/Import
// ============================================================================

/**
 * Convert flattened items to CSV format
 *
 * @param items - Items to export
 * @param columns - Column definitions
 * @returns CSV string
 */
export const itemsToCSV = (items: FlatItem[], columns: string[]): string => {
  const escapeCSV = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const headers = columns.join(',');
  const rows = items.map((item) =>
    columns
      .map((col) => {
        if (col === 'id') return escapeCSV(item.id);
        if (col === 'type') return escapeCSV(item.type);
        if (col === 'label') return escapeCSV(item.label);
        if (col === 'summary') return escapeCSV(item.summary);
        if (col === 'rights') return escapeCSV(item.rights);
        if (col === 'navDate') return escapeCSV(item.navDate);
        return escapeCSV(item.metadata[col] || '');
      })
      .join(',')
  );

  return [headers, ...rows].join('\n');
};

/**
 * Parse CSV string to items (basic implementation)
 * TODO: Full CSV import with validation
 *
 * @param csv - CSV string
 * @returns Parsed items
 */
export const parseCSV = (csv: string): Partial<FlatItem>[] => {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const items: Partial<FlatItem>[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Simple CSV parsing (doesn't handle quoted fields)
    const values = lines[i].split(',');
    const item: Partial<FlatItem> = { metadata: {} };

    headers.forEach((header, idx) => {
      const value = values[idx]?.trim() || '';
      if (header === 'id') item.id = value;
      else if (header === 'type') item.type = value;
      else if (header === 'label') item.label = value;
      else if (header === 'summary') item.summary = value;
      else if (header === 'rights') item.rights = value;
      else if (header === 'navDate') item.navDate = value;
      else if (item.metadata) {
        item.metadata[header] = value;
      }
    });

    items.push(item);
  }

  return items;
};

// ============================================================================
// Change Detection
// ============================================================================

/**
 * Check if two flat items are equal
 * Used for detecting unsaved changes
 *
 * @param a - First item
 * @param b - Second item
 * @returns True if equal
 */
export const itemsEqual = (a: FlatItem, b: FlatItem): boolean => {
  if (a.label !== b.label) return false;
  if (a.summary !== b.summary) return false;
  if (a.rights !== b.rights) return false;
  if (a.navDate !== b.navDate) return false;

  const aKeys = Object.keys(a.metadata).sort();
  const bKeys = Object.keys(b.metadata).sort();
  if (aKeys.length !== bKeys.length) return false;
  if (JSON.stringify(aKeys) !== JSON.stringify(bKeys)) return false;

  return aKeys.every((key) => a.metadata[key] === b.metadata[key]);
};

/**
 * Detect changes between current and original items
 *
 * @param current - Current items
 * @param original - Original items
 * @returns Array of changed item IDs
 */
export const detectChanges = (
  current: FlatItem[],
  original: FlatItem[]
): string[] => {
  const changed: string[] = [];

  current.forEach((curr) => {
    const orig = original.find((o) => o.id === curr.id);
    if (!orig || !itemsEqual(curr, orig)) {
      changed.push(curr.id);
    }
  });

  return changed;
};
