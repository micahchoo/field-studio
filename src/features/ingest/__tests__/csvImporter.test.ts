import { describe, it, expect, vi, beforeEach } from 'vitest';
import { csvImporter, CSVImporterService } from '../model/csvImporter';
import type { CSVColumnMapping, IIIFItem, IIIFCanvas } from '@/src/shared/types';
import { CSV_SUPPORTED_PROPERTIES } from '@/src/shared/constants';

// Mock the logger so uiLog.warn calls in applyPropertyToCanvas don't error
vi.mock('@/src/shared/services/logger', () => ({
  uiLog: { warn: vi.fn(), info: vi.fn(), error: vi.fn() }
}));

// ---------------------------------------------------------------------------
// Test Data Factories
// ---------------------------------------------------------------------------

function createTestManifest(canvasLabels: string[]): IIIFItem {
  return {
    id: 'https://example.org/manifest/1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: canvasLabels.map((label, i) => ({
      id: `https://example.org/canvas/${i + 1}`,
      type: 'Canvas' as const,
      label: { none: [label] },
      width: 1000,
      height: 800,
      items: [{
        id: `https://example.org/canvas/${i + 1}/page`,
        type: 'AnnotationPage' as const,
        items: []
      }]
    }))
  };
}

function createCanvasWithMetadata(
  label: string,
  metadata: Array<{ label: string; value: string }> = []
): IIIFCanvas {
  return {
    id: `https://example.org/canvas/${label}`,
    type: 'Canvas',
    label: { none: [label] },
    width: 1000,
    height: 800,
    metadata: metadata.map(m => ({
      label: { en: [m.label] },
      value: { en: [m.value] }
    })),
    items: [{
      id: `https://example.org/canvas/${label}/page`,
      type: 'AnnotationPage',
      items: []
    }]
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let service: CSVImporterService;

beforeEach(() => {
  service = new CSVImporterService();
});

// ==========================================================================
// parseCSV
// ==========================================================================

describe('parseCSV', () => {
  it('parses basic CSV with headers and one row', () => {
    const text = 'filename,label\nimage1.jpg,My Image';
    const result = service.parseCSV(text);
    expect(result.headers).toEqual(['filename', 'label']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ filename: 'image1.jpg', label: 'My Image' });
  });

  it('parses multiple rows', () => {
    const text = 'filename,label,summary\na.jpg,Label A,Summary A\nb.jpg,Label B,Summary B\nc.jpg,Label C,Summary C';
    const result = service.parseCSV(text);
    expect(result.headers).toEqual(['filename', 'label', 'summary']);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].filename).toBe('a.jpg');
    expect(result.rows[1].label).toBe('Label B');
    expect(result.rows[2].summary).toBe('Summary C');
  });

  it('returns empty result for empty string', () => {
    const result = service.parseCSV('');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('returns empty result for single header line with no data rows', () => {
    const result = service.parseCSV('filename,label,summary');
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it('handles quoted fields containing commas', () => {
    const text = 'filename,label\nimage.jpg,"Hello, World"';
    const result = service.parseCSV(text);
    expect(result.rows[0].label).toBe('Hello, World');
  });

  it('handles escaped quotes (doubled "")', () => {
    const text = 'filename,label\nimage.jpg,"He said ""hello"""';
    const result = service.parseCSV(text);
    expect(result.rows[0].label).toBe('He said "hello"');
  });

  it('trims whitespace from fields', () => {
    const text = 'filename , label \n  image.jpg , My Label  ';
    const result = service.parseCSV(text);
    expect(result.headers).toEqual(['filename', 'label']);
    expect(result.rows[0].filename).toBe('image.jpg');
    expect(result.rows[0].label).toBe('My Label');
  });

  it('handles Windows-style \\r\\n line endings', () => {
    const text = 'filename,label\r\nimage.jpg,My Image\r\n';
    const result = service.parseCSV(text);
    expect(result.headers).toEqual(['filename', 'label']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ filename: 'image.jpg', label: 'My Image' });
  });

  it('fills missing trailing values with empty string', () => {
    const text = 'filename,label,summary\nimage.jpg,My Label';
    const result = service.parseCSV(text);
    expect(result.rows[0].summary).toBe('');
  });

  it('handles a row with only commas (empty values)', () => {
    const text = 'a,b,c\n,,';
    const result = service.parseCSV(text);
    expect(result.rows[0]).toEqual({ a: '', b: '', c: '' });
  });

  it('handles completely quoted header names', () => {
    const text = '"filename","label"\nimage.jpg,Test';
    const result = service.parseCSV(text);
    expect(result.headers).toEqual(['filename', 'label']);
    expect(result.rows[0].filename).toBe('image.jpg');
  });

  it('handles many columns correctly', () => {
    const headers = 'a,b,c,d,e,f';
    const values = '1,2,3,4,5,6';
    const result = service.parseCSV(`${headers}\n${values}`);
    expect(result.headers).toHaveLength(6);
    expect(result.rows[0]).toEqual({ a: '1', b: '2', c: '3', d: '4', e: '5', f: '6' });
  });
});

// ==========================================================================
// detectFilenameColumn
// ==========================================================================

describe('detectFilenameColumn', () => {
  it('finds "filename" (case-insensitive)', () => {
    expect(service.detectFilenameColumn(['Title', 'FileName', 'Label'])).toBe('FileName');
    expect(service.detectFilenameColumn(['Title', 'filename', 'Label'])).toBe('filename');
    expect(service.detectFilenameColumn(['FILENAME', 'Label'])).toBe('FILENAME');
  });

  it('finds "file" as candidate', () => {
    expect(service.detectFilenameColumn(['Label', 'File'])).toBe('File');
  });

  it('finds "image" as candidate', () => {
    expect(service.detectFilenameColumn(['Label', 'Image'])).toBe('Image');
  });

  it('finds "id", "identifier", and "asset" as candidates', () => {
    expect(service.detectFilenameColumn(['Label', 'ID'])).toBe('ID');
    expect(service.detectFilenameColumn(['Label', 'Identifier'])).toBe('Identifier');
    expect(service.detectFilenameColumn(['Label', 'Asset'])).toBe('Asset');
  });

  it('falls back to first header when no candidate matches', () => {
    expect(service.detectFilenameColumn(['Custom Column', 'Another'])).toBe('Custom Column');
  });

  it('returns null for empty headers', () => {
    expect(service.detectFilenameColumn([])).toBeNull();
  });
});

// ==========================================================================
// autoDetectMappings
// ==========================================================================

describe('autoDetectMappings', () => {
  it('maps known aliases like Title -> metadata.title and Label -> label', () => {
    const mappings = service.autoDetectMappings(['filename', 'Title', 'Label'], 'filename');
    expect(mappings).toContainEqual(expect.objectContaining({
      csvColumn: 'Title',
      iiifProperty: 'metadata.title'
    }));
    expect(mappings).toContainEqual(expect.objectContaining({
      csvColumn: 'Label',
      iiifProperty: 'label'
    }));
  });

  it('skips the filename column', () => {
    const mappings = service.autoDetectMappings(['filename', 'label'], 'filename');
    expect(mappings).toHaveLength(1);
    expect(mappings[0].csvColumn).toBe('label');
  });

  it('skips the "manifest" column (case-insensitive)', () => {
    const mappings = service.autoDetectMappings(['filename', 'Manifest', 'label'], 'filename');
    const manifestMapping = mappings.find(m => m.csvColumn === 'Manifest');
    expect(manifestMapping).toBeUndefined();
  });

  it('produces no mapping for unknown column names', () => {
    const mappings = service.autoDetectMappings(['filename', 'foobar', 'xyzzy'], 'filename');
    expect(mappings).toHaveLength(0);
  });

  it('performs case-insensitive matching via CSV_COLUMN_ALIASES', () => {
    const mappings = service.autoDetectMappings(['filename', 'title', 'SUMMARY'], 'filename');
    expect(mappings).toContainEqual(expect.objectContaining({
      csvColumn: 'title',
      iiifProperty: 'metadata.title'
    }));
    // 'SUMMARY' is not an alias key but 'summary' is -- check case-insensitive lookup
    // The code does: CSV_COLUMN_ALIASES[header] || CSV_COLUMN_ALIASES[lowerHeader]
    // CSV_COLUMN_ALIASES has 'summary' -> 'summary', so lowerHeader 'summary' should match
    const summaryMapping = mappings.find(m => m.csvColumn === 'SUMMARY');
    expect(summaryMapping).toBeDefined();
    expect(summaryMapping!.iiifProperty).toBe('summary');
  });

  it('maps all recognized Dublin Core columns', () => {
    const dcHeaders = [
      'filename', 'Creator', 'Date', 'Description', 'Subject',
      'Source', 'Type', 'Format', 'Language', 'Coverage', 'Publisher'
    ];
    const mappings = service.autoDetectMappings(dcHeaders, 'filename');
    expect(mappings).toHaveLength(10);
    expect(mappings.find(m => m.csvColumn === 'Creator')!.iiifProperty).toBe('metadata.creator');
    expect(mappings.find(m => m.csvColumn === 'Publisher')!.iiifProperty).toBe('metadata.publisher');
  });

  it('maps attribution aliases', () => {
    const mappings = service.autoDetectMappings(['filename', 'Attribution'], 'filename');
    expect(mappings).toContainEqual(expect.objectContaining({
      csvColumn: 'Attribution',
      iiifProperty: 'requiredStatement.value'
    }));
  });

  it('sets default language to "en" for all mappings', () => {
    const mappings = service.autoDetectMappings(['filename', 'label', 'summary'], 'filename');
    for (const m of mappings) {
      expect(m.language).toBe('en');
    }
  });
});

// ==========================================================================
// isFromStagingTemplate
// ==========================================================================

describe('isFromStagingTemplate', () => {
  it('returns true for headers with filename + manifest + label', () => {
    expect(service.isFromStagingTemplate(['filename', 'manifest', 'label'])).toBe(true);
  });

  it('returns true for headers with filename + manifest + metadata.title', () => {
    expect(service.isFromStagingTemplate(['filename', 'manifest', 'metadata.title'])).toBe(true);
  });

  it('returns false if missing filename', () => {
    expect(service.isFromStagingTemplate(['manifest', 'label'])).toBe(false);
  });

  it('returns false if missing manifest', () => {
    expect(service.isFromStagingTemplate(['filename', 'label'])).toBe(false);
  });

  it('returns false if missing IIIF property columns', () => {
    expect(service.isFromStagingTemplate(['filename', 'manifest', 'custom_field'])).toBe(false);
  });

  it('is case-insensitive for filename and manifest checks', () => {
    expect(service.isFromStagingTemplate(['Filename', 'MANIFEST', 'summary'])).toBe(true);
  });
});

// ==========================================================================
// applyMappings
// ==========================================================================

describe('applyMappings', () => {
  it('applies label mapping to matching canvas', () => {
    const root = createTestManifest(['image1.jpg', 'image2.jpg']);
    const rows = [{ filename: 'image1.jpg', label: 'New Label' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'label', iiifProperty: 'label', language: 'en' }
    ];

    const { updatedRoot, result } = service.applyMappings(root, rows, 'filename', mappings);
    expect(result.matched).toBe(1);
    expect(result.unmatched).toBe(0);
    const canvas = updatedRoot.items![0] as IIIFCanvas;
    expect(canvas.label).toEqual({ en: ['New Label'] });
  });

  it('applies summary mapping', () => {
    const root = createTestManifest(['photo.jpg']);
    const rows = [{ filename: 'photo.jpg', summary: 'A beautiful photo' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'summary', iiifProperty: 'summary', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas = updatedRoot.items![0] as any;
    expect(canvas.summary).toEqual({ en: ['A beautiful photo'] });
  });

  it('applies navDate mapping with valid date as ISO format', () => {
    const root = createTestManifest(['doc.pdf']);
    const rows = [{ filename: 'doc.pdf', navDate: '2024-06-15' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'navDate', iiifProperty: 'navDate', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas = updatedRoot.items![0] as IIIFCanvas;
    // formatNavDate calls toISOString, so it should be a full ISO string
    expect(canvas.navDate).toContain('2024-06-15');
  });

  it('applies navDate with invalid date string as-is', () => {
    const root = createTestManifest(['doc.pdf']);
    const rows = [{ filename: 'doc.pdf', navDate: 'not-a-date' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'navDate', iiifProperty: 'navDate', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas = updatedRoot.items![0] as IIIFCanvas;
    expect(canvas.navDate).toBe('not-a-date');
  });

  it('applies rights mapping', () => {
    const root = createTestManifest(['art.jpg']);
    const rows = [{ filename: 'art.jpg', rights: 'https://creativecommons.org/licenses/by/4.0/' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'rights', iiifProperty: 'rights', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas = updatedRoot.items![0] as any;
    expect(canvas.rights).toBe('https://creativecommons.org/licenses/by/4.0/');
  });

  it('applies metadata.* mapping and creates new metadata entry', () => {
    const root = createTestManifest(['image1.jpg']);
    const rows = [{ filename: 'image1.jpg', title: 'Test Title' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'title', iiifProperty: 'metadata.title', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas = updatedRoot.items![0] as IIIFCanvas;
    expect(canvas.metadata).toHaveLength(1);
    expect(canvas.metadata![0].label).toEqual({ en: ['Title'] });
    expect(canvas.metadata![0].value).toEqual({ en: ['Test Title'] });
  });

  it('updates existing metadata entry instead of duplicating', () => {
    const root: IIIFItem = {
      id: 'https://example.org/manifest/1',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [createCanvasWithMetadata('image1.jpg', [{ label: 'Title', value: 'Old Title' }])]
    };
    const rows = [{ filename: 'image1.jpg', title: 'New Title' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'title', iiifProperty: 'metadata.title', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas = updatedRoot.items![0] as IIIFCanvas;
    expect(canvas.metadata).toHaveLength(1);
    expect(canvas.metadata![0].value).toEqual({ en: ['New Title'] });
  });

  it('applies requiredStatement.value mapping', () => {
    const root = createTestManifest(['img.jpg']);
    const rows = [{ filename: 'img.jpg', attribution: 'Credit: Museum' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'attribution', iiifProperty: 'requiredStatement.value', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas = updatedRoot.items![0] as any;
    expect(canvas.requiredStatement).toBeDefined();
    expect(canvas.requiredStatement.value).toEqual({ en: ['Credit: Museum'] });
    // Default label should be set to "Attribution"
    expect(canvas.requiredStatement.label).toEqual({ en: ['Attribution'] });
  });

  it('applies requiredStatement.label mapping', () => {
    const root = createTestManifest(['img.jpg']);
    const rows = [{ filename: 'img.jpg', attrLabel: 'Rights Holder' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'attrLabel', iiifProperty: 'requiredStatement.label', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas = updatedRoot.items![0] as any;
    expect(canvas.requiredStatement.label).toEqual({ en: ['Rights Holder'] });
  });

  it('counts matched vs unmatched rows correctly', () => {
    const root = createTestManifest(['image1.jpg', 'image2.jpg']);
    const rows = [
      { filename: 'image1.jpg', label: 'Match' },
      { filename: 'nonexistent.jpg', label: 'No Match' },
      { filename: 'also-missing.png', label: 'Also No Match' }
    ];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'label', iiifProperty: 'label', language: 'en' }
    ];

    const { result } = service.applyMappings(root, rows, 'filename', mappings);
    expect(result.matched).toBe(1);
    expect(result.unmatched).toBe(2);
  });

  it('records errors for rows missing filename column value', () => {
    const root = createTestManifest(['image1.jpg']);
    const rows = [
      { filename: '', label: 'Missing Filename' },
      { filename: 'image1.jpg', label: 'Good Row' }
    ];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'label', iiifProperty: 'label', language: 'en' }
    ];

    const { result } = service.applyMappings(root, rows, 'filename', mappings);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('missing filename');
    expect(result.matched).toBe(1);
  });

  it('does not modify canvases that are not matched by any row', () => {
    const root = createTestManifest(['image1.jpg', 'image2.jpg']);
    const rows = [{ filename: 'image1.jpg', label: 'Updated' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'label', iiifProperty: 'label', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas2 = updatedRoot.items![1] as IIIFCanvas;
    // Should retain original label
    expect(canvas2.label).toEqual({ none: ['image2.jpg'] });
  });

  it('matches canvas by filename without extension', () => {
    const root = createTestManifest(['photo.jpg']);
    const rows = [{ filename: 'photo', label: 'Matched Without Extension' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'label', iiifProperty: 'label', language: 'en' }
    ];

    const { result } = service.applyMappings(root, rows, 'filename', mappings);
    expect(result.matched).toBe(1);
  });

  it('matches canvas case-insensitively', () => {
    const root = createTestManifest(['Photo.JPG']);
    const rows = [{ filename: 'photo.jpg', label: 'Case Insensitive Match' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'label', iiifProperty: 'label', language: 'en' }
    ];

    const { result } = service.applyMappings(root, rows, 'filename', mappings);
    expect(result.matched).toBe(1);
  });

  it('does not mutate the original root', () => {
    const root = createTestManifest(['image1.jpg']);
    const originalLabel = JSON.parse(JSON.stringify((root.items![0] as IIIFCanvas).label));
    const rows = [{ filename: 'image1.jpg', label: 'Changed' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'label', iiifProperty: 'label', language: 'en' }
    ];

    service.applyMappings(root, rows, 'filename', mappings);
    expect((root.items![0] as IIIFCanvas).label).toEqual(originalLabel);
  });

  it('skips mapping values that are empty strings', () => {
    const root = createTestManifest(['image1.jpg']);
    const rows = [{ filename: 'image1.jpg', label: '' }];
    const mappings: CSVColumnMapping[] = [
      { csvColumn: 'label', iiifProperty: 'label', language: 'en' }
    ];

    const { updatedRoot } = service.applyMappings(root, rows, 'filename', mappings);
    const canvas = updatedRoot.items![0] as IIIFCanvas;
    // Original label should remain since empty values are skipped
    expect(canvas.label).toEqual({ none: ['image1.jpg'] });
  });
});

// ==========================================================================
// exportCSV
// ==========================================================================

describe('exportCSV', () => {
  it('exports canvases with id, filename, type, and properties', () => {
    const root = createTestManifest(['image1.jpg', 'image2.jpg']);
    const result = service.exportCSV(root, { properties: ['label'] });

    expect(result.itemCount).toBe(2);
    expect(result.csv).toContain('id,filename,type,label');
    expect(result.csv).toContain('image1.jpg');
    expect(result.csv).toContain('image2.jpg');
  });

  it('excludes id column when includeId is false', () => {
    const root = createTestManifest(['image1.jpg']);
    const result = service.exportCSV(root, { properties: ['label'], includeId: false });

    const lines = result.csv.split('\n');
    const headers = lines[0];
    expect(headers).not.toContain('id,');
    expect(headers.startsWith('filename')).toBe(true);
  });

  it('excludes type column when includeType is false', () => {
    const root = createTestManifest(['image1.jpg']);
    const result = service.exportCSV(root, { properties: ['label'], includeType: false });

    const lines = result.csv.split('\n');
    const headers = lines[0];
    expect(headers).not.toContain('type');
  });

  it('respects itemTypes filter', () => {
    const root = createTestManifest(['image1.jpg']);
    const result = service.exportCSV(root, {
      properties: ['label'],
      itemTypes: ['Manifest']
    });

    expect(result.itemCount).toBe(1);
    expect(result.csv).toContain('Test Manifest');
    expect(result.csv).not.toContain('image1.jpg');
  });

  it('respects properties filter', () => {
    const root: IIIFItem = {
      id: 'https://example.org/manifest/1',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [{
        ...createCanvasWithMetadata('photo.jpg', [{ label: 'Title', value: 'My Photo' }]),
        summary: { en: ['A summary'] }
      } as any]
    };
    const result = service.exportCSV(root, { properties: ['label', 'summary'] });

    const lines = result.csv.split('\n');
    expect(lines[0]).toContain('label');
    expect(lines[0]).toContain('summary');
    expect(lines[0]).not.toContain('metadata.title');
    expect(result.columnCount).toBe(5); // id + filename + type + label + summary = 5
  });

  it('returns correct columnCount', () => {
    const root = createTestManifest(['image1.jpg']);
    const result = service.exportCSV(root, { properties: ['label', 'summary', 'rights'] });
    // id + filename + type + label + summary + rights = 6
    expect(result.columnCount).toBe(6);
  });
});

// ==========================================================================
// exportCSVSmart
// ==========================================================================

describe('exportCSVSmart', () => {
  it('only includes columns that have values', () => {
    const root: IIIFItem = {
      id: 'https://example.org/manifest/1',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [createCanvasWithMetadata('image.jpg', [{ label: 'Title', value: 'My Title' }])]
    };

    const result = service.exportCSVSmart(root);
    // Should include label (canvas has a label) and metadata.title, but not summary, rights, etc.
    expect(result.csv).toContain('label');
    expect(result.csv).toContain('metadata.title');
    // Properties with no values should be excluded
    expect(result.csv).not.toContain('navDate');
    expect(result.csv).not.toContain('metadata.coverage');
  });

  it('skips columns where no item has a value', () => {
    const root = createTestManifest(['image.jpg']);
    const result = service.exportCSVSmart(root);
    // Canvas has a label but no summary, rights, navDate, etc.
    const headers = result.csv.split('\n')[0];
    expect(headers).toContain('label');
    expect(headers).not.toContain('summary');
    expect(headers).not.toContain('rights');
  });

  it('includes id and type columns by default', () => {
    const root = createTestManifest(['image.jpg']);
    const result = service.exportCSVSmart(root);
    const headers = result.csv.split('\n')[0];
    expect(headers).toContain('id');
    expect(headers).toContain('type');
  });
});

// ==========================================================================
// exportCSVByIds
// ==========================================================================

describe('exportCSVByIds', () => {
  it('only exports items matching given IDs', () => {
    const root = createTestManifest(['image1.jpg', 'image2.jpg', 'image3.jpg']);
    const ids = ['https://example.org/canvas/1', 'https://example.org/canvas/3'];
    const result = service.exportCSVByIds(root, ids, { properties: ['label'] });

    expect(result.itemCount).toBe(2);
    expect(result.csv).toContain('image1.jpg');
    expect(result.csv).toContain('image3.jpg');
    expect(result.csv).not.toContain('image2.jpg');
  });

  it('returns empty export for empty IDs array', () => {
    const root = createTestManifest(['image1.jpg']);
    const result = service.exportCSVByIds(root, [], { properties: ['label'] });
    expect(result.itemCount).toBe(0);
    // Should only contain the header line
    const lines = result.csv.split('\n');
    expect(lines).toHaveLength(1);
  });

  it('returns empty export when no IDs match', () => {
    const root = createTestManifest(['image1.jpg']);
    const result = service.exportCSVByIds(root, ['nonexistent-id'], { properties: ['label'] });
    expect(result.itemCount).toBe(0);
  });
});

// ==========================================================================
// escapeCSVField (tested via exports)
// ==========================================================================

describe('escapeCSVField (via export roundtrip)', () => {
  it('quotes fields containing commas', () => {
    const root: IIIFItem = {
      id: 'https://example.org/manifest/1',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [{
        id: 'https://example.org/canvas/1',
        type: 'Canvas' as const,
        label: { none: ['image.jpg'] },
        summary: { en: ['Hello, World'] },
        width: 100,
        height: 100,
        items: [{ id: 'ap1', type: 'AnnotationPage' as const, items: [] }]
      }]
    };
    const result = service.exportCSV(root, { properties: ['label', 'summary'] });
    // The summary field "Hello, World" should be quoted
    expect(result.csv).toContain('"Hello, World"');
  });

  it('double-escapes fields containing quotes', () => {
    const root: IIIFItem = {
      id: 'https://example.org/manifest/1',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [{
        id: 'https://example.org/canvas/1',
        type: 'Canvas' as const,
        label: { none: ['image.jpg'] },
        summary: { en: ['She said "hello"'] },
        width: 100,
        height: 100,
        items: [{ id: 'ap1', type: 'AnnotationPage' as const, items: [] }]
      }]
    };
    const result = service.exportCSV(root, { properties: ['label', 'summary'] });
    // "She said "hello"" should become """She said ""hello"""""
    expect(result.csv).toContain('"She said ""hello"""');
  });

  it('quotes fields containing newlines', () => {
    const root: IIIFItem = {
      id: 'https://example.org/manifest/1',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [{
        id: 'https://example.org/canvas/1',
        type: 'Canvas' as const,
        label: { none: ['image.jpg'] },
        summary: { en: ['Line 1\nLine 2'] },
        width: 100,
        height: 100,
        items: [{ id: 'ap1', type: 'AnnotationPage' as const, items: [] }]
      }]
    };
    const result = service.exportCSV(root, { properties: ['label', 'summary'] });
    expect(result.csv).toContain('"Line 1\nLine 2"');
  });
});

// ==========================================================================
// getExportColumns
// ==========================================================================

describe('getExportColumns', () => {
  it('returns expected column definitions with categories', () => {
    const columns = service.getExportColumns();
    expect(columns.length).toBeGreaterThanOrEqual(15);

    // Check Core category
    const coreColumns = columns.filter(c => c.category === 'Core');
    expect(coreColumns.map(c => c.key)).toContain('label');
    expect(coreColumns.map(c => c.key)).toContain('summary');
    expect(coreColumns.map(c => c.key)).toContain('rights');
    expect(coreColumns.map(c => c.key)).toContain('navDate');

    // Check Dublin Core category
    const dcColumns = columns.filter(c => c.category === 'Dublin Core');
    expect(dcColumns.map(c => c.key)).toContain('metadata.title');
    expect(dcColumns.map(c => c.key)).toContain('metadata.creator');
    expect(dcColumns.map(c => c.key)).toContain('metadata.date');

    // Check Attribution category
    const attrColumns = columns.filter(c => c.category === 'Attribution');
    expect(attrColumns.map(c => c.key)).toContain('requiredStatement.label');
    expect(attrColumns.map(c => c.key)).toContain('requiredStatement.value');

    // Each column should have key, label, and category
    for (const col of columns) {
      expect(col.key).toBeTruthy();
      expect(col.label).toBeTruthy();
      expect(col.category).toBeTruthy();
    }
  });
});

// ==========================================================================
// getSupportedProperties
// ==========================================================================

describe('getSupportedProperties', () => {
  it('returns a copy of the supported properties array', () => {
    const props = service.getSupportedProperties();
    expect(props).toEqual(CSV_SUPPORTED_PROPERTIES);
    // Should be a copy, not the same reference
    expect(props).not.toBe(CSV_SUPPORTED_PROPERTIES);
  });
});

// ==========================================================================
// Singleton export
// ==========================================================================

describe('csvImporter singleton', () => {
  it('is an instance of CSVImporterService', () => {
    expect(csvImporter).toBeInstanceOf(CSVImporterService);
  });

  it('exposes the same public methods', () => {
    expect(typeof csvImporter.parseCSV).toBe('function');
    expect(typeof csvImporter.autoDetectMappings).toBe('function');
    expect(typeof csvImporter.applyMappings).toBe('function');
    expect(typeof csvImporter.exportCSV).toBe('function');
    expect(typeof csvImporter.exportCSVSmart).toBe('function');
    expect(typeof csvImporter.exportCSVByIds).toBe('function');
    expect(typeof csvImporter.detectFilenameColumn).toBe('function');
    expect(typeof csvImporter.isFromStagingTemplate).toBe('function');
    expect(typeof csvImporter.getExportColumns).toBe('function');
  });
});

// ==========================================================================
// Integration: parse -> detect -> autoDetect -> apply roundtrip
// ==========================================================================

describe('CSV import roundtrip integration', () => {
  it('parses CSV, detects filename, auto-maps, and applies to a manifest', () => {
    const csvText = [
      'filename,Title,Creator,label',
      'image1.jpg,Sunset Photo,John Doe,Beautiful Sunset',
      'image2.jpg,Mountain View,Jane Smith,Mountain Panorama'
    ].join('\n');

    const root = createTestManifest(['image1.jpg', 'image2.jpg', 'image3.jpg']);

    // Step 1: Parse
    const { headers, rows } = service.parseCSV(csvText);
    expect(headers).toEqual(['filename', 'Title', 'Creator', 'label']);
    expect(rows).toHaveLength(2);

    // Step 2: Detect filename column
    const filenameCol = service.detectFilenameColumn(headers);
    expect(filenameCol).toBe('filename');

    // Step 3: Auto-detect mappings
    const mappings = service.autoDetectMappings(headers, filenameCol!);
    expect(mappings).toHaveLength(3); // Title, Creator, label (filename skipped)
    expect(mappings.find(m => m.csvColumn === 'Title')!.iiifProperty).toBe('metadata.title');
    expect(mappings.find(m => m.csvColumn === 'Creator')!.iiifProperty).toBe('metadata.creator');
    expect(mappings.find(m => m.csvColumn === 'label')!.iiifProperty).toBe('label');

    // Step 4: Apply
    const { updatedRoot, result } = service.applyMappings(root, rows, filenameCol!, mappings);
    expect(result.matched).toBe(2);
    expect(result.unmatched).toBe(0);
    expect(result.errors).toHaveLength(0);

    const canvas1 = updatedRoot.items![0] as IIIFCanvas;
    expect(canvas1.label).toEqual({ en: ['Beautiful Sunset'] });
    expect(canvas1.metadata).toHaveLength(2);
    expect(canvas1.metadata![0].label).toEqual({ en: ['Title'] });
    expect(canvas1.metadata![0].value).toEqual({ en: ['Sunset Photo'] });
    expect(canvas1.metadata![1].label).toEqual({ en: ['Creator'] });
    expect(canvas1.metadata![1].value).toEqual({ en: ['John Doe'] });

    // image3.jpg should be untouched
    const canvas3 = updatedRoot.items![2] as IIIFCanvas;
    expect(canvas3.label).toEqual({ none: ['image3.jpg'] });
    expect(canvas3.metadata).toBeUndefined();
  });

  it('handles export -> reimport roundtrip preserving label', () => {
    const root = createTestManifest(['image1.jpg', 'image2.jpg']);
    // Set distinct labels
    (root.items![0] as IIIFCanvas).label = { en: ['First Image'] };
    (root.items![1] as IIIFCanvas).label = { en: ['Second Image'] };

    // Export
    const exportResult = service.exportCSV(root, { properties: ['label'], includeId: false, includeType: false });

    // Re-parse
    const { headers, rows } = service.parseCSV(exportResult.csv);
    expect(headers).toContain('filename');
    expect(headers).toContain('label');
    expect(rows).toHaveLength(2);

    // The filenames in the export use the label (getFilename extracts from label)
    // So row filenames will be "First Image" and "Second Image"
    expect(rows[0].filename).toBe('First Image');
    expect(rows[1].filename).toBe('Second Image');
  });
});
