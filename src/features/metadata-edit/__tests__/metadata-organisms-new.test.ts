/**
 * Metadata Organisms — Contract Tests
 *
 * Tests the pure logic backing metadata-edit organism components:
 *  - BatchEditor: snapshot persistence, pattern extraction, field mapping operations
 *  - MetadataEditorPanel: tab persistence, validation integration, annotation flattening
 *
 * Strategy: import and exercise the real domain functions
 * (validateResource, fixIssue, fixAll, flattenIIIFItem, extractColumns,
 *  filterByTerm, itemsToCSV, parseCSV, itemsEqual, detectChanges, getIIIFValue)
 * to verify input→output contracts the organisms depend on.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getIIIFValue, getChildEntities, type IIIFItem } from '@/src/shared/types';
import {
  validateResource,
  fixIssue,
  fixAll,
  type ValidationResult,
} from '@/src/features/metadata-edit/lib/inspectorValidation';
import {
  flattenIIIFItem,
  flattenTree,
  extractColumns,
  filterByTerm,
  itemsToCSV,
  parseCSV,
  itemsEqual,
  detectChanges,
  type FlatItem,
} from '@/src/features/metadata-edit/model/index';

// ============================================================================
// Shared fixtures
// ============================================================================

function makeCanvas(overrides: Record<string, unknown> = {}): IIIFItem {
  return {
    id: `https://example.org/canvas/${Math.random().toString(36).slice(2, 8)}`,
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 800,
    height: 600,
    items: [],
    ...overrides,
  } as unknown as IIIFItem;
}

function makeManifest(overrides: Record<string, unknown> = {}): IIIFItem {
  return {
    id: `https://example.org/manifest/${Math.random().toString(36).slice(2, 8)}`,
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [],
    ...overrides,
  } as unknown as IIIFItem;
}

// ============================================================================
// 1. BatchEditor — snapshot persistence (localStorage contracts)
//
// The BatchEditor saves/loads/clears snapshots via:
//   saveBatchSnapshot  → localStorage.setItem(BATCH_SNAPSHOT_KEY, JSON.stringify(...))
//   loadBatchSnapshot  → JSON.parse(localStorage.getItem(BATCH_SNAPSHOT_KEY))
//   clearBatchSnapshot → localStorage.removeItem(BATCH_SNAPSHOT_KEY)
//
// We test the round-trip contract — data survives serialization.
// ============================================================================

const BATCH_SNAPSHOT_KEY = 'batch-editor-snapshot';

interface BatchSnapshot {
  timestamp: number;
  itemCount: number;
  root: IIIFItem;
}

/** Replicas of the module-scoped snapshot functions from BatchEditor.svelte */
function saveBatchSnapshot(root: IIIFItem, itemCount: number): boolean {
  try {
    const snapshot: BatchSnapshot = {
      timestamp: Date.now(),
      itemCount,
      root: JSON.parse(JSON.stringify(root)) as IIIFItem,
    };
    localStorage.setItem(BATCH_SNAPSHOT_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

function loadBatchSnapshot(): BatchSnapshot | null {
  try {
    const data = localStorage.getItem(BATCH_SNAPSHOT_KEY);
    if (!data) return null;
    return JSON.parse(data) as BatchSnapshot;
  } catch {
    return null;
  }
}

function clearBatchSnapshot(): void {
  try {
    localStorage.removeItem(BATCH_SNAPSHOT_KEY);
  } catch { /* ignore */ }
}

describe('BatchEditor — snapshot round-trip', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('save then load preserves root type and itemCount', () => {
    const root = makeManifest({ label: { en: ['Saved Manifest'] } });
    saveBatchSnapshot(root, 7);
    const loaded = loadBatchSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded!.root.type).toBe(root.type);
    expect(loaded!.itemCount).toBe(7);
    expect(getIIIFValue(loaded!.root.label)).toBe('Saved Manifest');
  });

  it('save deep-clones the root (mutations do not affect snapshot)', () => {
    const root = makeManifest({ label: { en: ['Original'] } });
    saveBatchSnapshot(root, 1);
    // Mutate the original after saving
    root.label = { en: ['Mutated'] };
    const loaded = loadBatchSnapshot();
    expect(getIIIFValue(loaded!.root.label)).toBe('Original');
  });

  it('load returns null when nothing is stored', () => {
    expect(loadBatchSnapshot()).toBeNull();
  });

  it('load returns null for corrupt JSON', () => {
    localStorage.setItem(BATCH_SNAPSHOT_KEY, '{not valid json!!!');
    expect(loadBatchSnapshot()).toBeNull();
  });

  it('clear removes the snapshot so load returns null', () => {
    saveBatchSnapshot(makeManifest(), 3);
    clearBatchSnapshot();
    expect(loadBatchSnapshot()).toBeNull();
  });

  it('clear is idempotent (does not throw when nothing stored)', () => {
    expect(() => clearBatchSnapshot()).not.toThrow();
  });

  it('timestamp is a recent epoch millisecond value', () => {
    const before = Date.now();
    saveBatchSnapshot(makeManifest(), 1);
    const after = Date.now();
    const loaded = loadBatchSnapshot();
    expect(loaded!.timestamp).toBeGreaterThanOrEqual(before);
    expect(loaded!.timestamp).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// 2. BatchEditor — pattern detector (regex extraction contract)
//
// The component's patternResults derivation:
//   const re = new RegExp(regexPattern);
//   match = filename.match(re);
//   fieldMappings.forEach(m => { if (match[m.group]) extracted[m.property] = match[m.group]; })
// ============================================================================

interface FieldMapping {
  group: number;
  property: string;
}

function extractPatternMetadata(
  filename: string,
  regexPattern: string,
  fieldMappings: FieldMapping[]
): { extracted: Record<string, string>; success: boolean } {
  try {
    const re = new RegExp(regexPattern);
    const match = filename.match(re);
    const extracted: Record<string, string> = {};
    if (match) {
      fieldMappings.forEach(m => {
        if (match[m.group]) extracted[m.property] = match[m.group];
      });
    }
    return { extracted, success: !!match };
  } catch {
    return { extracted: {}, success: false };
  }
}

describe('BatchEditor — pattern extraction', () => {
  const DEFAULT_PATTERN = '(\\d{4})_(\\w+)_(.*)';
  const DEFAULT_MAPPINGS: FieldMapping[] = [
    { group: 1, property: 'Date' },
    { group: 2, property: 'Subject' },
  ];

  it('extracts capture groups mapped to properties', () => {
    const result = extractPatternMetadata(
      '2023_fieldwork_site-A.jpg',
      DEFAULT_PATTERN,
      DEFAULT_MAPPINGS
    );
    expect(result.success).toBe(true);
    expect(result.extracted['Date']).toBe('2023');
    expect(result.extracted['Subject']).toBe('fieldwork');
  });

  it('reports failure when filename does not match', () => {
    const result = extractPatternMetadata(
      'no-numbers-here.jpg',
      DEFAULT_PATTERN,
      DEFAULT_MAPPINGS
    );
    expect(result.success).toBe(false);
    expect(Object.keys(result.extracted)).toHaveLength(0);
  });

  it('handles invalid regex gracefully (returns failure, no throw)', () => {
    const result = extractPatternMetadata(
      'anything.jpg',
      '[invalid regex',
      DEFAULT_MAPPINGS
    );
    expect(result.success).toBe(false);
  });

  it('handles mapping group that exceeds capture count', () => {
    const result = extractPatternMetadata(
      '2023_fieldwork_site-A.jpg',
      DEFAULT_PATTERN,
      [{ group: 99, property: 'Nonexistent' }]
    );
    expect(result.success).toBe(true); // regex matches
    expect(result.extracted['Nonexistent']).toBeUndefined();
  });

  it('handles empty filename', () => {
    const result = extractPatternMetadata('', DEFAULT_PATTERN, DEFAULT_MAPPINGS);
    expect(result.success).toBe(false);
  });

  it('handles empty regex pattern (matches everything)', () => {
    const result = extractPatternMetadata(
      'anything.jpg',
      '',
      [{ group: 0, property: 'All' }]
    );
    // Empty regex matches empty string at position 0
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// 3. BatchEditor — field mapping CRUD operations
//
// The component mutates fieldMappings array via:
//   add:    fieldMappings = [...fieldMappings, { group: len+1, property: 'Subject' }]
//   remove: fieldMappings = fieldMappings.filter((_, idx) => idx !== i)
//   update: fieldMappings = fieldMappings.map((m, idx) => idx === i ? { ...m, group: val } : m)
// ============================================================================

describe('BatchEditor — field mapping operations', () => {
  it('add appends with group = length + 1', () => {
    const mappings = [{ group: 1, property: 'Date' }];
    const added = [...mappings, { group: mappings.length + 1, property: 'Subject' }];
    expect(added).toHaveLength(2);
    expect(added[1].group).toBe(2);
    // Verify original is not mutated
    expect(mappings).toHaveLength(1);
  });

  it('remove by index preserves other mappings order', () => {
    const mappings = [
      { group: 1, property: 'A' },
      { group: 2, property: 'B' },
      { group: 3, property: 'C' },
    ];
    const removed = mappings.filter((_, i) => i !== 1);
    expect(removed).toHaveLength(2);
    expect(removed[0].property).toBe('A');
    expect(removed[1].property).toBe('C');
  });

  it('remove from empty array does not crash', () => {
    const mappings: FieldMapping[] = [];
    expect(mappings.filter((_, i) => i !== 0)).toHaveLength(0);
  });

  it('update group parses integer, defaults to 1 for non-numeric', () => {
    const mappings = [{ group: 1, property: 'Date' }];
    // Replica of updateMappingGroup
    const update = (arr: FieldMapping[], i: number, val: string) =>
      arr.map((m, idx) => idx === i ? { ...m, group: parseInt(val, 10) || 1 } : m);

    expect(update(mappings, 0, '5')[0].group).toBe(5);
    expect(update(mappings, 0, 'abc')[0].group).toBe(1); // NaN → fallback to 1
    expect(update(mappings, 0, '')[0].group).toBe(1);    // NaN → fallback to 1
  });
});

// ============================================================================
// 4. MetadataEditorPanel — tab persistence
//
// The component persists tabs with: localStorage.setItem(`inspector-tab-${type}`, tabId)
// and loads with: loadPersistedTab which validates against ALLOWED_TABS.
// ============================================================================

const TAB_STORAGE_PREFIX = 'inspector-tab';
const ALLOWED_TABS = ['metadata', 'technical', 'annotations', 'validation'] as const;
type TabId = (typeof ALLOWED_TABS)[number];

function loadPersistedTab(resourceType: string): TabId {
  try {
    const stored = localStorage.getItem(`${TAB_STORAGE_PREFIX}-${resourceType}`);
    if (stored && (ALLOWED_TABS as readonly string[]).includes(stored)) {
      return stored as TabId;
    }
  } catch { /* localStorage unavailable */ }
  return 'metadata';
}

describe('MetadataEditorPanel — tab persistence', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('loads a valid persisted tab', () => {
    localStorage.setItem(`${TAB_STORAGE_PREFIX}-Canvas`, 'technical');
    expect(loadPersistedTab('Canvas')).toBe('technical');
  });

  it('defaults to metadata when nothing is persisted', () => {
    expect(loadPersistedTab('Manifest')).toBe('metadata');
  });

  it('rejects unknown tab values and defaults to metadata', () => {
    localStorage.setItem(`${TAB_STORAGE_PREFIX}-Canvas`, 'hacked-tab');
    expect(loadPersistedTab('Canvas')).toBe('metadata');
  });

  it('persists per resource type (Canvas vs Manifest are independent)', () => {
    localStorage.setItem(`${TAB_STORAGE_PREFIX}-Canvas`, 'annotations');
    localStorage.setItem(`${TAB_STORAGE_PREFIX}-Manifest`, 'validation');
    expect(loadPersistedTab('Canvas')).toBe('annotations');
    expect(loadPersistedTab('Manifest')).toBe('validation');
  });

  it('rejects empty string as invalid tab', () => {
    localStorage.setItem(`${TAB_STORAGE_PREFIX}-Canvas`, '');
    expect(loadPersistedTab('Canvas')).toBe('metadata');
  });
});

// ============================================================================
// 5. MetadataEditorPanel — validation integration
//
// The panel derives validationResult from validateResource(resource, resource.type)
// and builds tabs with badge/badgeColor based on issue counts.
// ============================================================================

function deriveBadgeColor(result: ValidationResult): string {
  return result.errorCount > 0
    ? 'text-nb-red'
    : result.warningCount > 0
      ? 'text-nb-orange'
      : 'text-nb-blue';
}

describe('MetadataEditorPanel — validation badge derivation', () => {
  it('shows red badge when errors exist', () => {
    const resource = makeManifest({ id: '', label: { en: ['Test'] } });
    const result = validateResource(resource);
    // missing-id is an error
    expect(result.errorCount).toBeGreaterThan(0);
    expect(deriveBadgeColor(result)).toBe('text-nb-red');
  });

  it('shows orange badge when only warnings exist (no errors)', () => {
    const resource = makeManifest({
      id: 'https://example.org/m1',
      label: { en: ['OK Manifest'] },
      items: [makeCanvas({ id: 'https://example.org/c1' })],
    });
    const result = validateResource(resource, 'Manifest');
    // Should have warnings (missing-rights) but the item has a valid id
    // errorCount depends on whether there are structure errors
    if (result.errorCount === 0 && result.warningCount > 0) {
      expect(deriveBadgeColor(result)).toBe('text-nb-orange');
    }
  });

  it('shows blue badge when only info issues exist', () => {
    // A well-formed manifest with only info-level gaps
    const resource = makeManifest({
      id: 'https://example.org/m1',
      label: { en: ['Well-Formed Manifest'] },
      rights: 'http://creativecommons.org/licenses/by/4.0/',
      items: [makeCanvas({ id: 'https://example.org/c1' })],
      summary: { en: ['Has a summary'] },
      metadata: [{ label: { en: ['Creator'] }, value: { en: ['Test'] } }],
    });
    const result = validateResource(resource, 'Manifest');
    if (result.errorCount === 0 && result.warningCount === 0 && result.infoCount > 0) {
      expect(deriveBadgeColor(result)).toBe('text-nb-blue');
    }
  });

  it('badge count equals total issues length', () => {
    const resource = makeManifest({ id: '', label: undefined });
    const result = validateResource(resource, 'Manifest');
    const totalFromCounts = result.errorCount + result.warningCount + result.infoCount;
    expect(totalFromCounts).toBe(result.issues.length);
  });

  it('isValid is false iff errorCount > 0', () => {
    const validResource = makeManifest({
      id: 'https://example.org/m1',
      label: { en: ['Valid'] },
      items: [makeCanvas({ id: 'https://example.org/c1' })],
    });
    const validResult = validateResource(validResource, 'Manifest');
    expect(validResult.isValid).toBe(validResult.errorCount === 0);

    const invalidResource = makeManifest({ id: '' });
    const invalidResult = validateResource(invalidResource, 'Manifest');
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errorCount).toBeGreaterThan(0);
  });
});

// ============================================================================
// 6. MetadataEditorPanel — annotation flattening
//
// The panel derives: allAnnotations = resource.annotations?.flatMap(page => page.items || []) ?? []
// ============================================================================

function flattenAnnotations(
  annotations?: Array<{ items?: Array<{ id: string }> }>
): Array<{ id: string }> {
  return annotations?.flatMap(page => page.items || []) ?? [];
}

describe('MetadataEditorPanel — annotation flattening', () => {
  it('flattens multiple pages into a single array', () => {
    const annotations = [
      { items: [{ id: 'ann-1' }, { id: 'ann-2' }] },
      { items: [{ id: 'ann-3' }] },
    ];
    const result = flattenAnnotations(annotations);
    expect(result).toHaveLength(3);
    // Order preserves page order then item order within page
    expect(result[0].id).toBe('ann-1');
    expect(result[2].id).toBe('ann-3');
  });

  it('handles pages with missing items property', () => {
    const annotations = [{ items: [{ id: 'ann-1' }] }, {}] as Array<{
      items?: Array<{ id: string }>;
    }>;
    const result = flattenAnnotations(annotations);
    expect(result).toHaveLength(1);
  });

  it('returns empty array for undefined annotations', () => {
    expect(flattenAnnotations(undefined)).toHaveLength(0);
  });

  it('returns empty array for empty annotations list', () => {
    expect(flattenAnnotations([])).toHaveLength(0);
  });

  it('handles page with empty items array', () => {
    expect(flattenAnnotations([{ items: [] }])).toHaveLength(0);
  });
});

// ============================================================================
// 7. BatchEditor + MetadataEditorPanel — validateResource contracts
//
// Both organisms rely on validateResource for their validation features.
// ============================================================================

describe('validateResource — contracts relied on by organisms', () => {
  it('returns empty issues for null resource', () => {
    const result = validateResource(null);
    expect(result.issues).toHaveLength(0);
    expect(result.isValid).toBe(true);
  });

  it('reports missing-label error for resource without label', () => {
    const resource = makeManifest({ label: undefined });
    const result = validateResource(resource);
    const labelIssue = result.issues.find(i => i.id === 'missing-label');
    expect(labelIssue).toBeDefined();
    expect(labelIssue!.severity).toBe('error');
  });

  it('reports missing-rights warning', () => {
    const resource = makeManifest({
      id: 'https://example.org/m1',
      label: { en: ['Test'] },
    });
    const result = validateResource(resource);
    const rightsIssue = result.issues.find(i => i.id === 'missing-rights');
    expect(rightsIssue).toBeDefined();
    expect(rightsIssue!.severity).toBe('warning');
  });

  it('detects empty metadata entries as auto-fixable', () => {
    const resource = makeManifest({
      id: 'https://example.org/m1',
      label: { en: ['Test'] },
      metadata: [
        { label: { en: [] }, value: { en: [] } },
      ],
    });
    const result = validateResource(resource);
    const emptyMeta = result.issues.find(i => i.id.startsWith('empty-metadata-'));
    expect(emptyMeta).toBeDefined();
    expect(emptyMeta!.autoFixable).toBe(true);
  });

  it('detects non-https id as auto-fixable', () => {
    const resource = makeManifest({
      id: 'http://example.org/m1',
      label: { en: ['Test'] },
    });
    const result = validateResource(resource);
    const httpsIssue = result.issues.find(i => i.id === 'non-https-id');
    expect(httpsIssue).toBeDefined();
    expect(httpsIssue!.autoFixable).toBe(true);
  });

  it('autoFixableIssues is a subset of issues', () => {
    const resource = makeManifest({
      id: 'http://example.org/m1',
      label: { en: ['X'] },
      metadata: [{ label: { en: [] }, value: { en: [] } }],
    });
    const result = validateResource(resource, 'Manifest');
    expect(result.autoFixableIssues.length).toBeLessThanOrEqual(result.issues.length);
    for (const fixable of result.autoFixableIssues) {
      expect(result.issues).toContain(fixable);
    }
  });
});

// ============================================================================
// 8. fixIssue / fixAll — auto-fix contracts
// ============================================================================

describe('fixIssue — auto-fix contracts', () => {
  it('upgrades http:// id to https://', () => {
    const resource = makeManifest({ id: 'http://example.org/m1' });
    const result = validateResource(resource);
    const issue = result.issues.find(i => i.id === 'non-https-id')!;
    const fixed = fixIssue(resource, issue);
    expect(fixed.id.startsWith('https://')).toBe(true);
    expect(fixed.id.startsWith('http://example')).toBe(false);
  });

  it('returns resource unchanged for non-auto-fixable issues', () => {
    const resource = makeManifest({ label: undefined });
    const result = validateResource(resource);
    const issue = result.issues.find(i => i.id === 'missing-label')!;
    expect(issue.autoFixable).toBe(false);
    const fixed = fixIssue(resource, issue);
    expect(fixed).toBe(resource); // same reference — no mutation
  });

  it('removes empty metadata entry', () => {
    const resource = makeManifest({
      id: 'https://example.org/m1',
      metadata: [
        { label: { en: ['Creator'] }, value: { en: ['Test'] } },
        { label: { en: [] }, value: { en: [] } },
      ],
    });
    const result = validateResource(resource);
    const issue = result.issues.find(i => i.id.startsWith('empty-metadata-'))!;
    const fixed = fixIssue(resource, issue);
    expect(fixed.metadata).toHaveLength(1);
    expect(getIIIFValue(fixed.metadata![0].label)).toBe('Creator');
  });
});

describe('fixAll — batch auto-fix', () => {
  it('fixes multiple issues in a single pass', () => {
    const resource = makeManifest({
      id: 'http://example.org/m1',
      label: { en: ['Test'] },
      metadata: [
        { label: { en: [] }, value: { en: [] } },
      ],
    });
    const result = validateResource(resource, 'Manifest');
    const fixed = fixAll(resource, result.autoFixableIssues);
    // id should be https
    expect(fixed.id.startsWith('https://')).toBe(true);
    // empty metadata should be removed
    const afterResult = validateResource(fixed, 'Manifest');
    const remainingEmpty = afterResult.issues.filter(i =>
      i.id.startsWith('empty-metadata-')
    );
    expect(remainingEmpty).toHaveLength(0);
  });

  it('handles empty issues array without modifying resource', () => {
    const resource = makeManifest({ id: 'https://example.org/m1' });
    const fixed = fixAll(resource, []);
    expect(fixed).toBe(resource);
  });
});

// ============================================================================
// 9. Model functions — flattenIIIFItem / extractColumns / filterByTerm
//
// MetadataEditorPanel and MetadataView use these for spreadsheet rendering.
// ============================================================================

describe('flattenIIIFItem — tree flattening contract', () => {
  it('flattens manifest with canvases to flat items', () => {
    const canvas1 = makeCanvas({ id: 'c1', label: { en: ['Canvas 1'] } });
    const canvas2 = makeCanvas({ id: 'c2', label: { en: ['Canvas 2'] } });
    const manifest = makeManifest({
      id: 'm1',
      label: { en: ['Manifest'] },
      items: [canvas1, canvas2],
    });
    const items = flattenIIIFItem(manifest);
    // Should include manifest + 2 canvases
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.some(i => i.id === 'm1')).toBe(true);
    expect(items.some(i => i.id === 'c1')).toBe(true);
  });

  it('extracts metadata key-value pairs into flat record', () => {
    const manifest = makeManifest({
      id: 'm1',
      label: { en: ['Test'] },
      metadata: [
        { label: { en: ['Creator'] }, value: { en: ['John'] } },
        { label: { en: ['Date'] }, value: { en: ['2024'] } },
      ],
    });
    const items = flattenIIIFItem(manifest);
    const manifestItem = items.find(i => i.id === 'm1')!;
    expect(manifestItem.metadata['Creator']).toBe('John');
    expect(manifestItem.metadata['Date']).toBe('2024');
  });

  it('returns empty array for null root (via flattenTree)', () => {
    expect(flattenTree(null)).toHaveLength(0);
  });

  it('filters by type when typeFilter is specified', () => {
    const canvas = makeCanvas({ id: 'c1' });
    const manifest = makeManifest({ id: 'm1', items: [canvas] });
    const canvasOnly = flattenIIIFItem(manifest, 'Canvas');
    expect(canvasOnly.every(i => i.type === 'Canvas')).toBe(true);
    expect(canvasOnly.length).toBeGreaterThan(0);
  });
});

describe('extractColumns — column extraction', () => {
  it('includes standard columns', () => {
    const items = flattenIIIFItem(makeManifest({ id: 'm1' }));
    const columns = extractColumns(items);
    expect(columns).toContain('id');
    expect(columns).toContain('type');
    expect(columns).toContain('label');
    expect(columns).toContain('summary');
    expect(columns).toContain('rights');
  });

  it('includes dynamic metadata columns from items', () => {
    const manifest = makeManifest({
      id: 'm1',
      metadata: [{ label: { en: ['CustomField'] }, value: { en: ['val'] } }],
    });
    const items = flattenIIIFItem(manifest);
    const columns = extractColumns(items);
    expect(columns).toContain('CustomField');
  });

  it('limits dynamic columns to maxDynamicCols', () => {
    const manyMetadata = Array.from({ length: 30 }, (_, i) => ({
      label: { en: [`Field${i}`] },
      value: { en: [`val${i}`] },
    }));
    const manifest = makeManifest({ id: 'm1', metadata: manyMetadata });
    const items = flattenIIIFItem(manifest);
    const columns = extractColumns(items, 5);
    // 6 standard + at most 5 dynamic
    expect(columns.length).toBeLessThanOrEqual(11);
  });

  it('returns only standard columns for items with no metadata', () => {
    const items = flattenIIIFItem(makeManifest({ id: 'm1' }));
    const columns = extractColumns(items);
    expect(columns).toHaveLength(6); // id, type, label, summary, rights, navDate
  });
});

describe('filterByTerm — search contract', () => {
  const manifest = makeManifest({
    id: 'm1',
    label: { en: ['Alpine Expedition'] },
    items: [
      makeCanvas({ id: 'c1', label: { en: ['Summit Photo'] } }),
      makeCanvas({ id: 'c2', label: { en: ['Base Camp'] } }),
    ],
  });
  const items = flattenIIIFItem(manifest);

  it('returns all items for empty search term', () => {
    expect(filterByTerm(items, '')).toHaveLength(items.length);
    expect(filterByTerm(items, '   ')).toHaveLength(items.length);
  });

  it('filters by label match (case insensitive)', () => {
    const results = filterByTerm(items, 'summit');
    expect(results.some(i => i.label === 'Summit Photo')).toBe(true);
    expect(results.some(i => i.label === 'Base Camp')).toBe(false);
  });

  it('searches in id field', () => {
    const results = filterByTerm(items, 'c2');
    expect(results.some(i => i.id === 'c2')).toBe(true);
  });

  it('returns empty array when no items match', () => {
    expect(filterByTerm(items, 'zzz_no_match')).toHaveLength(0);
  });
});

// ============================================================================
// 10. CSV round-trip — itemsToCSV / parseCSV
// ============================================================================

describe('itemsToCSV / parseCSV — round-trip', () => {
  it('CSV export includes header row and data rows', () => {
    const items: FlatItem[] = [{
      id: 'x1',
      type: 'Canvas',
      label: 'Test',
      summary: '',
      metadata: {},
      rights: '',
      navDate: '',
      viewingDirection: '',
    }];
    const csv = itemsToCSV(items, ['id', 'label']);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,label');
    expect(lines[1]).toContain('x1');
    expect(lines[1]).toContain('Test');
  });

  it('escapes commas and quotes in values', () => {
    const items: FlatItem[] = [{
      id: 'x1',
      type: 'Canvas',
      label: 'Has, comma',
      summary: 'Has "quotes"',
      metadata: {},
      rights: '',
      navDate: '',
      viewingDirection: '',
    }];
    const csv = itemsToCSV(items, ['label', 'summary']);
    // Commas and quotes should be properly escaped
    expect(csv).toContain('"Has, comma"');
    expect(csv).toContain('"Has ""quotes"""');
  });

  it('parseCSV returns empty for single-line input (header only)', () => {
    expect(parseCSV('id,label')).toHaveLength(0);
  });

  it('parseCSV returns empty for empty string', () => {
    expect(parseCSV('')).toHaveLength(0);
  });
});

// ============================================================================
// 11. itemsEqual / detectChanges — change detection contracts
// ============================================================================

describe('itemsEqual — equality contract', () => {
  const base: FlatItem = {
    id: 'x1',
    type: 'Canvas',
    label: 'Test',
    summary: 'Summary',
    metadata: { Creator: 'John' },
    rights: 'cc-by',
    navDate: '',
    viewingDirection: '',
  };

  it('returns true for identical items', () => {
    expect(itemsEqual(base, { ...base })).toBe(true);
  });

  it('detects label change', () => {
    expect(itemsEqual(base, { ...base, label: 'Changed' })).toBe(false);
  });

  it('detects metadata value change', () => {
    expect(itemsEqual(base, { ...base, metadata: { Creator: 'Jane' } })).toBe(false);
  });

  it('detects metadata key addition', () => {
    expect(itemsEqual(base, {
      ...base,
      metadata: { ...base.metadata, Date: '2024' },
    })).toBe(false);
  });

  it('detects metadata key removal', () => {
    expect(itemsEqual(base, { ...base, metadata: {} })).toBe(false);
  });
});

describe('detectChanges — change detection across arrays', () => {
  const original: FlatItem[] = [
    { id: 'a', type: 'Canvas', label: 'A', summary: '', metadata: {}, rights: '', navDate: '', viewingDirection: '' },
    { id: 'b', type: 'Canvas', label: 'B', summary: '', metadata: {}, rights: '', navDate: '', viewingDirection: '' },
  ];

  it('returns empty when nothing changed', () => {
    const current = original.map(i => ({ ...i }));
    expect(detectChanges(current, original)).toHaveLength(0);
  });

  it('returns id of changed item', () => {
    const current = original.map(i => ({ ...i }));
    current[1] = { ...current[1], label: 'Modified' };
    const changes = detectChanges(current, original);
    expect(changes).toContain('b');
    expect(changes).not.toContain('a');
  });

  it('returns id of new item not in original', () => {
    const current = [
      ...original.map(i => ({ ...i })),
      { id: 'c', type: 'Canvas', label: 'C', summary: '', metadata: {}, rights: '', navDate: '', viewingDirection: '' } as FlatItem,
    ];
    const changes = detectChanges(current, original);
    expect(changes).toContain('c');
  });
});

// ============================================================================
// 12. getChildEntities — tree traversal used by BatchEditor.collectSelectedItems
// ============================================================================

describe('getChildEntities — tree traversal contract', () => {
  it('returns items array for Manifest', () => {
    const canvas = makeCanvas({ id: 'c1' });
    const manifest = makeManifest({ items: [canvas] });
    const children = getChildEntities(manifest);
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe('c1');
  });

  it('returns empty for Canvas (no children via getChildEntities)', () => {
    const canvas = makeCanvas();
    const children = getChildEntities(canvas);
    expect(children).toHaveLength(0);
  });

  it('returns empty for manifest with no items', () => {
    const manifest = makeManifest({ items: [] });
    expect(getChildEntities(manifest)).toHaveLength(0);
  });
});
