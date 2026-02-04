# Canvas Entity (`src/entities/canvas/`)

The Canvas entity layer re-exports canvas-specific selectors and actions for safe feature access.

## Structure

```
canvas/
├── model.ts     ← Selectors for querying canvas state
├── actions.ts   ← Action creators for canvas mutations
├── index.ts     ← Public API
└── README.md    (this file)
```

## Selectors (model.ts)

### `selectById(state, id): IIIFCanvas | null`

Get a canvas by ID.

```typescript
import { canvas } from '@/src/entities';

const canvasData = canvas.model.selectById(state, 'canvas-id');
```

### `selectAll(state): IIIFCanvas[]`

Get all canvases in the vault.

```typescript
const allCanvases = canvas.model.selectAll(state);
```

### `selectAnnotationPages(state, canvasId): string[]`

Get annotation page IDs (children) of a canvas.

```typescript
const pageIds = canvas.model.selectAnnotationPages(state, canvasId);
```

### `selectParentManifest(state, canvasId): string | null`

Get the parent manifest ID.

```typescript
const manifestId = canvas.model.selectParentManifest(state, canvasId);
```

### `selectDimensions(state, canvasId): { width, height } | null`

Get canvas width and height.

```typescript
const dims = canvas.model.selectDimensions(state, canvasId);
if (dims) {
  console.log(`Canvas is ${dims.width}x${dims.height}`);
}
```

### `selectLabel(state, canvasId): LanguageMap | null`

Get canvas label.

```typescript
const label = canvas.model.selectLabel(state, canvasId);
```

### `selectAncestors(state, canvasId): string[]`

Get path to root (manifest → collection → ...).

```typescript
const ancestors = canvas.model.selectAncestors(state, canvasId);
```

### `selectDescendants(state, canvasId): string[]`

Get all nested items (annotation pages, annotations).

```typescript
const descendants = canvas.model.selectDescendants(state, canvasId);
```

### `hasAnnotations(state, canvasId): boolean`

Check if canvas has any annotations.

```typescript
if (canvas.model.hasAnnotations(state, canvasId)) {
  console.log('Canvas has annotations');
}
```

### `countAnnotations(state, canvasId): number`

Count total annotations.

```typescript
const count = canvas.model.countAnnotations(state, canvasId);
```

## Actions (actions.ts)

All action creators return an `Action` object. Features dispatch these via the Vault singleton's ActionDispatcher.

### `updateLabel(canvasId, label): Action`

Update canvas label.

```typescript
const action = canvas.actions.updateLabel(id, { en: ['New Label'] });
vault.dispatch(action);
```

### `updateSummary(canvasId, summary): Action`

Update canvas description.

```typescript
const action = canvas.actions.updateSummary(id, { en: ['Description'] });
```

### `updateDimensions(canvasId, width, height): Action`

Update canvas size.

```typescript
const action = canvas.actions.updateDimensions(id, 1024, 768);
```

### `addAnnotation(canvasId, annotation): Action`

Add annotation to canvas.

```typescript
const action = canvas.actions.addAnnotation(canvasId, {
  type: 'Annotation',
  id: 'anno-1',
  target: canvasId,
  body: { type: 'TextualBody', value: 'Note' }
});
```

### `removeAnnotation(canvasId, annotationId): Action`

Remove annotation from canvas.

```typescript
const action = canvas.actions.removeAnnotation(canvasId, 'anno-1');
```

### `moveToManifest(canvasId, manifestId, index?): Action`

Move canvas to different manifest.

```typescript
const action = canvas.actions.moveToManifest(canvasId, newManifestId);
```

### `batchUpdate(canvasId, changes): Action`

Batch update multiple canvas properties.

```typescript
const action = canvas.actions.batchUpdate(canvasId, {
  label: { en: ['Updated'] },
  width: 1024
});
```

## Usage in Features

```typescript
import { canvas, manifest } from '@/src/entities';
import { getVault } from '@/services';

export const CanvasCard = ({ canvasId, state }) => {
  const canvasData = canvas.model.selectById(state, canvasId);
  const dimensions = canvas.model.selectDimensions(state, canvasId);
  const annotationCount = canvas.model.countAnnotations(state, canvasId);
  const vault = getVault();

  const handleUpdateLabel = (newLabel) => {
    const action = canvas.actions.updateLabel(canvasId, { en: [newLabel] });
    vault.dispatch(action);
  };

  return (
    <div>
      <h3>{canvasData?.label?.en?.[0]}</h3>
      <p>{dimensions?.width}x{dimensions?.height}</p>
      <p>{annotationCount} annotations</p>
      <button onClick={() => handleUpdateLabel('New')}>Update</button>
    </div>
  );
};
```

## Rules

✅ **Canvas entity CAN:**
- Re-export canvas-specific selectors
- Re-export canvas-specific action creators
- Use vault functions for traversal

❌ **Canvas entity CANNOT:**
- Implement new business logic
- Access other entity models
- Manage global state
- Perform UI operations

## See Also

- `../README.md` — Entity layer philosophy
- `../manifest/README.md` — Manifest entity
- `../collection/README.md` — Collection entity
