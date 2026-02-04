# Entity Layer (`src/entities/`)

The **entity layer** establishes FSD (Feature-Sliced Design) boundaries. It provides thin wrappers that expose domain-specific selectors and actions, preventing features from reaching directly into the service layer.

## Philosophy

**"Features import from entities, not from services."**

Instead of:
```typescript
// ❌ WRONG: Features reach into services directly
import { getEntity, updateEntity } from '@/services/vault';
import { actions } from '@/services/actions';

const canvas = getEntity(state, id);
updateEntity(state, id, newData);
```

Use:
```typescript
// ✅ CORRECT: Features import from entities
import { canvas } from '@/src/entities/canvas';

const canvasData = canvas.model.selectById(state, id);
canvas.actions.updateLabel(id, newData);
```

## Structure

```
src/entities/
├── canvas/
│   ├── model.ts          ← Canvas-specific selectors
│   ├── actions.ts        ← Canvas-specific action creators
│   ├── index.ts          ← Public API
│   └── README.md
├── manifest/
│   ├── model.ts
│   ├── actions.ts
│   ├── index.ts
│   └── README.md
├── collection/
│   ├── model.ts
│   ├── actions.ts
│   ├── index.ts
│   └── README.md
└── README.md             (this file)
```

## What Each Entity Provides

### `model.ts` (Selectors)

Re-exports vault queries for that entity type. Example for canvas:

```typescript
import { getEntity, getChildIds, getParentId, getEntitiesByType } from '@/services';

export const selectById = (state, id) => getEntity(state, id);
export const selectAnnotations = (state, canvasId) => getChildIds(state, canvasId);
export const selectParent = (state, canvasId) => getParentId(state, canvasId);
export const selectAll = (state) => getEntitiesByType(state, 'Canvas');
```

### `actions.ts` (Actions)

Re-exports action creators for that entity type. Example for canvas:

```typescript
import { actions as vaultActions } from '@/services/actions';

export const updateLabel = (id, label) =>
  vaultActions.updateLabel(id, label);

export const updateDimensions = (id, width, height) =>
  vaultActions.updateCanvasDimensions(id, width, height);

export const addAnnotation = (canvasId, annotation) =>
  vaultActions.addAnnotation(canvasId, annotation);
```

### `index.ts` (Public API)

```typescript
export * as model from './model';
export * as actions from './actions';
export { IIIFCanvas } from '@/types';
```

## Usage in Features

```typescript
import { canvas, manifest, collection } from '@/src/entities';

export const ArchiveGrid = ({ root }) => {
  const manifests = manifest.model.selectAll(root);

  const handleUpdateCanvas = (canvasId, newLabel) => {
    // Dispatch action
    const action = canvas.actions.updateLabel(canvasId, { en: [newLabel] });
    // Feature would typically pass this to ActionDispatcher
  };

  return (
    <>
      {manifests.map(m =>
        m.items.map(cv =>
          <CanvasCard
            key={cv.id}
            canvas={cv}
            onUpdate={() => handleUpdateCanvas(cv.id, 'new label')}
          />
        )
      )}
    </>
  );
};
```

## Rules

✅ **Entities ARE:**
- Thin re-export layers (no new logic)
- Domain-specific facades (canvas, manifest, collection)
- One-way access to services
- Consistent APIs across domains

❌ **Entities are NOT:**
- Business logic (that's in services)
- State management (that's in vault)
- UI components (that's in features)
- Route handlers (that's in app)

## Dependency Flow

```
Feature (archive)
  └── Imports from: entity/manifest, entity/canvas
      └── Which re-exports from: services/actions, services/vault
          └── Which read/write: vault state
```

**Unidirectional:** Features → Entities → Services → Vault

## Next Steps

See individual README files:
- `canvas/README.md` — Canvas entity specification
- `manifest/README.md` — Manifest entity specification
- `collection/README.md` — Collection entity specification
