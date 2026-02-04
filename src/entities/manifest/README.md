# Manifest Entity (`src/entities/manifest/`)

The Manifest entity layer re-exports manifest-specific selectors and actions for safe feature access.

## Structure

```
manifest/
├── model.ts     ← Selectors for querying manifest state
├── actions.ts   ← Action creators for manifest mutations
├── index.ts     ← Public API
└── README.md    (this file)
```

## Selectors (model.ts)

### `selectById(state, id): IIIFManifest | null`

Get a manifest by ID.

```typescript
import { manifest } from '@/src/entities';

const manifestData = manifest.model.selectById(state, 'manifest-id');
```

### `selectAll(state): IIIFManifest[]`

Get all manifests in the vault.

```typescript
const allManifests = manifest.model.selectAll(state);
```

### `selectCanvases(state, manifestId): string[]`

Get canvas IDs (children) of a manifest.

```typescript
const canvasIds = manifest.model.selectCanvases(state, manifestId);
```

### `selectParentCollection(state, manifestId): string | null`

Get parent collection ID (hierarchical ownership).

```typescript
const collectionId = manifest.model.selectParentCollection(state, manifestId);
```

### `selectCollectionMemberships(state, manifestId): string[]`

Get all collections that reference this manifest (many-to-many).

```typescript
const memberOfCollections = manifest.model.selectCollectionMemberships(state, manifestId);
```

### `selectLabel(state, manifestId): LanguageMap | null`

Get manifest label.

```typescript
const label = manifest.model.selectLabel(state, manifestId);
console.log(label?.en?.[0]);
```

### `selectSummary(state, manifestId): LanguageMap | null`

Get manifest description.

```typescript
const summary = manifest.model.selectSummary(state, manifestId);
```

### `selectMetadata(state, manifestId): Metadata[]`

Get manifest metadata fields.

```typescript
const metadata = manifest.model.selectMetadata(state, manifestId);
```

### `selectRights(state, manifestId): string | null`

Get rights URI.

```typescript
const rights = manifest.model.selectRights(state, manifestId);
```

### `selectAncestors(state, manifestId): string[]`

Get path to root (collection → parent collection → ...).

```typescript
const ancestors = manifest.model.selectAncestors(state, manifestId);
```

### `selectDescendants(state, manifestId): string[]`

Get all nested items (canvases, annotation pages, annotations).

```typescript
const descendants = manifest.model.selectDescendants(state, manifestId);
```

### `isOrphan(state, manifestId): boolean`

Check if manifest is not in any collection.

```typescript
if (manifest.model.isOrphan(state, manifestId)) {
  console.log('Manifest is standalone');
}
```

### `countCanvases(state, manifestId): number`

Count total canvases.

```typescript
const count = manifest.model.countCanvases(state, manifestId);
```

### `hasCanvases(state, manifestId): boolean`

Check if manifest has any canvases.

```typescript
if (manifest.model.hasCanvases(state, manifestId)) {
  console.log('Manifest has canvases');
}
```

## Actions (actions.ts)

All action creators return an `Action` object. Features dispatch these via the Vault singleton's ActionDispatcher.

### `updateLabel(manifestId, label): Action`

Update manifest label.

```typescript
const action = manifest.actions.updateLabel(id, { en: ['New Label'] });
vault.dispatch(action);
```

### `updateSummary(manifestId, summary): Action`

Update manifest description.

```typescript
const action = manifest.actions.updateSummary(id, { en: ['Description'] });
```

### `updateMetadata(manifestId, metadata): Action`

Update manifest metadata.

```typescript
const action = manifest.actions.updateMetadata(id, [
  { label: { en: ['Date'] }, value: { en: ['2024-02-03'] } }
]);
```

### `updateRights(manifestId, rights): Action`

Update rights URI.

```typescript
const action = manifest.actions.updateRights(id, 'https://example.org/rights');
```

### `updateNavDate(manifestId, navDate): Action`

Update navigation date (ISO 8601).

```typescript
const action = manifest.actions.updateNavDate(id, '2024-02-03');
```

### `updateBehavior(manifestId, behavior): Action`

Update viewing behaviors (paged, paginated, continuous, etc.).

```typescript
const action = manifest.actions.updateBehavior(id, ['paged']);
```

### `updateViewingDirection(manifestId, direction): Action`

Update viewing direction (left-to-right, right-to-left, etc.).

```typescript
const action = manifest.actions.updateViewingDirection(id, 'left-to-right');
```

### `addCanvas(manifestId, canvas, index?): Action`

Add canvas to manifest.

```typescript
const action = manifest.actions.addCanvas(manifestId, {
  type: 'Canvas',
  id: 'canvas-1',
  label: { en: ['Canvas 1'] },
  width: 1024,
  height: 768,
  items: []
});
```

### `removeCanvas(manifestId, canvasId): Action`

Remove canvas from manifest.

```typescript
const action = manifest.actions.removeCanvas(manifestId, 'canvas-1');
```

### `reorderCanvases(manifestId, order): Action`

Reorder canvases within manifest.

```typescript
const action = manifest.actions.reorderCanvases(manifestId, [
  'canvas-2',
  'canvas-1',
  'canvas-3'
]);
```

### `moveToCollection(manifestId, collectionId, index?): Action`

Move manifest to different collection.

```typescript
const action = manifest.actions.moveToCollection(manifestId, newCollectionId);
```

### `batchUpdate(manifestId, changes): Action`

Batch update multiple properties.

```typescript
const action = manifest.actions.batchUpdate(manifestId, {
  label: { en: ['Updated'] },
  rights: 'https://example.org/rights'
});
```

## Usage in Features

```typescript
import { manifest, canvas } from '@/src/entities';
import { getVault } from '@/services';

export const ManifestView = ({ manifestId, state }) => {
  const manifestData = manifest.model.selectById(state, manifestId);
  const canvasIds = manifest.model.selectCanvases(state, manifestId);
  const vault = getVault();

  const handleAddCanvas = (newCanvas) => {
    const action = manifest.actions.addCanvas(manifestId, newCanvas);
    vault.dispatch(action);
  };

  const handleReorderCanvases = (newOrder) => {
    const action = manifest.actions.reorderCanvases(manifestId, newOrder);
    vault.dispatch(action);
  };

  return (
    <div>
      <h2>{manifestData?.label?.en?.[0]}</h2>
      <p>{canvasIds.length} canvases</p>
      <CanvasList canvasIds={canvasIds} state={state} />
    </div>
  );
};
```

## Rules

✅ **Manifest entity CAN:**
- Re-export manifest-specific selectors
- Re-export manifest-specific action creators
- Use vault functions for traversal

❌ **Manifest entity CANNOT:**
- Implement new business logic
- Access other entity models
- Manage global state
- Perform UI operations

## See Also

- `../README.md` — Entity layer philosophy
- `../canvas/README.md` — Canvas entity
- `../collection/README.md` — Collection entity
