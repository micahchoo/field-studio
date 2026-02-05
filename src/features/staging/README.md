# Staging Feature (`src/features/staging/`)

The **staging feature** provides a two-pane workbench for importing and organizing IIIF resources.

## Scope

This feature handles:
- Source manifest management (left pane)
- Target collection management (right pane)
- Drag-drop between panes
- Canvas reordering within manifests
- Merging similar files (e.g., multi-angle shots)
- Checkpoint/resume for large imports

## Structure

```
staging/
├── ui/
│   ├── organisms/
│   │   └── StagingView.tsx       ← Main two-pane workbench
│   └── molecules/
│       └── SourcePane.tsx        ← Source manifest list pane
├── model/
│   └── index.ts                  ← Source manifest operations, collection creation
├── index.ts                      ← Public API
└── README.md                     ← This file
```

## Atomic Design Compliance

### Organisms (This Feature)
- **StagingView**: Composes ViewContainer, FilterInput, Toolbar, EmptyState molecules
- Receives `cx` and `fieldMode` via props from FieldModeTemplate
- No direct hook calls to useAppSettings or useContextualStyles

### Molecules Used (From Shared)
- `ViewContainer`: Consistent view wrapper with header
- `FilterInput`: Search/filter input with debounce
- `Toolbar`: Action button group
- `EmptyState`: Empty/loading states
- `CollectionCard`: Card representing a target collection
- `CanvasItem`: Thumbnail + label for canvases

### Atoms Used (From Shared)
- `Button`: Action buttons
- `Icon`: Icons for actions

## Usage

```typescript
import { StagingView, type SourceManifests } from '@/src/features/staging';

const sourceManifests: SourceManifests = {
  byId: { /* ... */ },
  allIds: ['manifest-1', 'manifest-2']
};

<FieldModeTemplate>
  {({ cx, fieldMode }) => (
    <StagingView
      sourceManifests={sourceManifests}
      targetCollections={collections}
      cx={cx}
      fieldMode={fieldMode}
      onAddToCollection={handleAdd}
      onCreateCollection={handleCreate}
      onReorderCanvases={handleReorder}
      onRemoveFromSource={handleRemove}
    />
  )}
</FieldModeTemplate>
```

## Model API

### Types

```typescript
interface SourceManifest {
  id: string;
  label: string;
  canvases: SourceCanvas[];
  isPartial?: boolean;
  sourceUrl?: string;
}

interface SourceCanvas {
  id: string;
  label: string;
  thumbnail?: string;
  blobUrl?: string;
  width?: number;
  height?: number;
}

interface SourceManifests {
  byId: Record<string, SourceManifest>;
  allIds: string[];
}

type StagingAction =
  | { type: 'ADD_TO_COLLECTION'; manifestIds: string[]; collectionId: string }
  | { type: 'REORDER_CANVASES'; manifestId: string; newOrder: string[] }
  | { type: 'REMOVE_FROM_SOURCE'; manifestId: string }
  | { type: 'CREATE_COLLECTION'; label: string; manifestIds: string[] }
  | { type: 'MERGE_MANIFESTS'; sourceIds: string[]; targetId: string };
```

### Source Manifest Operations

```typescript
import {
  createSourceManifest,
  addSourceManifest,
  removeSourceManifest,
  reorderCanvases,
  selectAllSourceManifests,
  selectTotalCanvasCount,
  mergeSourceManifests,
  findSimilarFilenames,
} from '@/src/features/staging';

// Create from IIIF manifest
const source = createSourceManifest(iiifManifest);

// Add to collection
const updated = addSourceManifest(sourceManifests, source);

// Reorder canvases
const reordered = reorderCanvases(sourceManifests, manifestId, newOrder);

// Find similar filenames for merging
const similar = findSimilarFilenames(sourceManifests);

// Merge manifests
const merged = mergeSourceManifests(sourceManifests, [id1, id2], targetId);
```

### Collection Creation

```typescript
import { createCollectionFromManifests } from '@/src/features/staging';

const collection = createCollectionFromManifests(
  selectedManifests,
  'My New Collection'
);
```

## Public API

```typescript
// Components
export { StagingView } from './ui/organisms/StagingView';
export { SourcePane } from './ui/molecules/SourcePane';

// Types
export type { StagingViewProps } from './ui/organisms/StagingView';
export type { SourcePaneProps } from './ui/molecules/SourcePane';

// Model
export {
  collection,
  manifest,
  createSourceManifest,
  addSourceManifest,
  removeSourceManifest,
  reorderCanvases,
  selectAllSourceManifests,
  selectTotalCanvasCount,
  createCollectionFromManifests,
  mergeSourceManifests,
  findSimilarFilenames,
  type SourceManifest,
  type SourceCanvas,
  type SourceManifests,
  type StagingAction,
} from './model';
```

## Molecules Used

| Molecule | Purpose | Source |
|----------|---------|--------|
| `ViewContainer` | View wrapper with header | `src/shared/ui/molecules/` |
| `FilterInput` | Search/filter input | `src/shared/ui/molecules/` |
| `Toolbar` | Action button group | `src/shared/ui/molecules/` |
| `EmptyState` | Empty/loading states | `src/shared/ui/molecules/` |
| `CollectionCard` | Target collection cards | `src/shared/ui/molecules/` |
| `CanvasItem` | Canvas thumbnails | `src/shared/ui/molecules/` |

## Future Enhancements

- [ ] Full drag-drop with `useDragDrop` hook
- [ ] Keyboard navigation for accessibility
- [ ] Checkpoint/resume functionality
- [ ] SendToCollectionModal for destination selection
- [ ] Similarity detection UI for merging files
