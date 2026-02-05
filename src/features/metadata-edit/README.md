# Metadata Edit Feature (`src/features/metadata-edit/`)

The **metadata-edit feature** provides spreadsheet-style bulk editing of IIIF resource metadata.

## Scope

This feature handles:
- Flattening IIIF hierarchies (Collection → Manifest → Canvas) to spreadsheet rows
- Tabular editing of metadata fields
- CSV import/export for external editing
- Dynamic column detection from existing metadata
- Change tracking and unsaved changes warnings

## Structure

```
metadata-edit/
├── ui/
│   ├── organisms/
│   │   ├── MetadataView.tsx        ← Main spreadsheet view
│   │   └── MetadataEditorPanel.tsx ← Side panel for single-item editing
│   └── molecules/
│       └── CSVImportModal.tsx      ← CSV import wizard
├── model/
│   └── index.ts                    ← Flattening, CSV, filtering, change detection
├── index.ts                        ← Public API
└── README.md                       ← This file
```

## Atomic Design Compliance

### Organisms (This Feature)
- **MetadataView**: Composes ViewContainer, FilterInput, Toolbar, EmptyState molecules
- **MetadataEditorPanel**: Side panel for editing single item metadata
- Receives `cx` and `fieldMode` via props from FieldModeTemplate
- No direct hook calls to useAppSettings or useContextualStyles

### Molecules Used (From Shared)
- `ViewContainer`: Consistent view wrapper with header
- `FilterInput`: Search/filter input with debounce
- `Toolbar`: Action button group
- `EmptyState`: Empty/loading states

### Atoms Used (From Shared)
- `Button`: Action buttons
- `Input`: Form inputs

## Usage

```typescript
import { MetadataView, MetadataEditorPanel } from '@/src/features/metadata-edit';

<FieldModeTemplate>
  {({ cx, fieldMode }) => (
    <MetadataView
      root={root}
      cx={cx}
      fieldMode={fieldMode}
      onUpdate={handleUpdate}
      filterIds={selectedIds}
      onClearFilter={clearSelection}
    />
  )}
</FieldModeTemplate>
```

## Model API

### Types

```typescript
interface FlatItem {
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

type ResourceTab = 'All' | 'Collection' | 'Manifest' | 'Canvas';
```

### Flattening

```typescript
import { flattenIIIFItem, type FlatItem } from '@/src/features/metadata-edit';

const items: FlatItem[] = flattenIIIFItem(root, 'All'); // or 'Collection', 'Manifest', 'Canvas'
```

### Filtering

```typescript
import { filterByTerm, filterByType } from '@/src/features/metadata-edit';

const filtered = filterByTerm(items, 'search term');
const byType = filterByType(items, 'Manifest');
```

### CSV Export

```typescript
import { itemsToCSV, extractColumns } from '@/src/features/metadata-edit';

const columns = extractColumns(items);
const csv = itemsToCSV(items, columns);
```

### CSV Import

```typescript
import { parseCSV, validateImport } from '@/src/features/metadata-edit';

const result = parseCSV(csvText);
const validation = validateImport(result.items, existingItems);
```

### Change Detection

```typescript
import { detectChanges, hasUnsavedChanges } from '@/src/features/metadata-edit';

const changedIds = detectChanges(currentItems, originalItems);
const hasChanges = hasUnsavedChanges(currentItems, originalItems);
```

## Public API

```typescript
// Components
export { MetadataView } from './ui/organisms/MetadataView';
export { MetadataEditorPanel } from './ui/organisms/MetadataEditorPanel';
export { CSVImportModal } from './ui/molecules/CSVImportModal';

// Types
export type { MetadataViewProps } from './ui/organisms/MetadataView';
export type { MetadataEditorPanelProps } from './ui/organisms/MetadataEditorPanel';
export type { CSVImportModalProps, ImportStep, CSVImportResult } from './ui/molecules/CSVImportModal';

// Model
export {
  manifest,
  canvas,
  collection,
  flattenIIIFItem,
  filterByTerm,
  filterByType,
  itemsToCSV,
  parseCSV,
  validateImport,
  extractColumns,
  detectChanges,
  hasUnsavedChanges,
  IIIF_PROPERTY_SUGGESTIONS,
  type FlatItem,
  type ResourceTab,
} from './model';
```

## Suggested Properties

The following Dublin Core properties are suggested for metadata editing:

```typescript
const IIIF_PROPERTY_SUGGESTIONS = [
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
];
```

## Molecules Used

| Molecule | Purpose | Source |
|----------|---------|--------|
| `ViewContainer` | View wrapper with header | `src/shared/ui/molecules/` |
| `FilterInput` | Search/filter input | `src/shared/ui/molecules/` |
| `Toolbar` | Action button group | `src/shared/ui/molecules/` |
| `EmptyState` | Empty/loading states | `src/shared/ui/molecules/` |
| `DebouncedInput` | Cell editing | `src/shared/ui/molecules/` |
