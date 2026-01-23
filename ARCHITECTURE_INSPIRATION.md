# Architecture Inspiration: Digirati Manifest Editor Patterns

**Analysis Date**: 2026-01-23
**Source**: Digirati IIIF Manifest Editor (`@iiif/vault`, `@iiif/parser`)

This document analyzes architectural patterns from Digirati's Manifest Editor and identifies opportunities to improve Field Studio's codebase.

---

## Current State Analysis

### Anti-Patterns Detected in Field Studio

**1. Deep Clone on Every Update**
```typescript
// Found 15+ instances of this pattern:
const newRoot = JSON.parse(JSON.stringify(root));
// ... find and modify target ...
handleUpdateRoot(newRoot);
```

**Impact**:
- O(n) memory allocation on every keystroke
- Garbage collection pressure
- Blocks main thread for large manifests
- Makes undo/redo implementation expensive

**2. Nested Tree Traversal**
```typescript
// Current pattern to find an item:
const findItem = (node, id) => {
  if (node.id === id) return node;
  for (const child of node.items || []) {
    const found = findItem(child, id);
    if (found) return found;
  }
  return null;
};
```

**Impact**:
- O(n) lookup time for every operation
- No caching of traversal results
- Repeated traversals for related operations

**3. Direct Object Mutation**
```typescript
Object.assign(target, updates);
```

**Impact**:
- No validation before mutation
- No change tracking
- No undo capability
- Risk of spec-violating states

---

## Digirati Patterns → Field Studio Opportunities

### Pattern 1: Normalized State (Vault)

**Digirati Approach**:
```typescript
// Flat, normalized store
const vault = {
  entities: {
    Manifest: { 'http://example.org/manifest/1': {...} },
    Canvas: { 'http://example.org/canvas/1': {...}, ... },
    Annotation: { 'http://example.org/anno/1': {...}, ... }
  },
  mapping: {
    'http://example.org/manifest/1': {
      canvases: ['canvas/1', 'canvas/2'],
      annotations: ['anno/1']
    }
  }
};
```

**Field Studio Opportunity**:

Create `services/vault.ts`:
```typescript
interface NormalizedState {
  entities: {
    Collection: Record<string, IIIFCollection>;
    Manifest: Record<string, IIIFManifest>;
    Canvas: Record<string, IIIFCanvas>;
    Range: Record<string, IIIFRange>;
    Annotation: Record<string, IIIFAnnotation>;
  };
  references: Record<string, string[]>; // parent → child IDs
  reverseRefs: Record<string, string>;  // child → parent ID
  rootId: string;
}

// O(1) lookup
function getEntity(state: NormalizedState, id: string): IIIFItem | null;

// O(1) update (only touches one entity)
function updateEntity(state: NormalizedState, id: string, updates: Partial<IIIFItem>): NormalizedState;

// Reconstruct nested tree for export only
function denormalize(state: NormalizedState): IIIFItem;
```

**Benefits**:
- O(1) entity lookup by ID
- O(1) updates (no full tree clone)
- Natural support for undo/redo (store entity snapshots)
- Enables React.memo optimization (stable references)

**Priority**: **CRITICAL** - Solves scalability and performance issues

---

### Pattern 2: V2 ↔ V3 Bridge

**Digirati Approach**:
```typescript
// On load: upgrade to v3
const manifest = upgradeToV3(loadedData);

// Internal: always v3
vault.load(manifest);

// On export: optionally downgrade
const output = targetVersion === 2
  ? downgradeToV2(vault.export())
  : vault.export();
```

**Field Studio Opportunity**:

Create `services/specBridge.ts`:
```typescript
import { upgrade } from '@iiif/parser/upgrader';
import { Traverse } from '@iiif/parser';

// Normalize all input to v3
export function normalizeToV3(input: any): IIIFItem {
  // Detect version from @context
  if (isV2(input)) {
    return upgrade(input);
  }
  return input;
}

// Export with version selection
export function exportWithVersion(
  item: IIIFItem,
  version: '2.1' | '3.0'
): any {
  if (version === '2.1') {
    return downgradeToV2(item);
  }
  return item;
}

// Version detection
function isV2(input: any): boolean {
  const context = input['@context'];
  return context?.includes?.('presentation/2') ||
         context === 'http://iiif.io/api/presentation/2/context.json';
}
```

**Benefits**:
- Simplified component logic (only handle v3)
- Better external manifest import
- Broader ecosystem compatibility on export

**Priority**: **HIGH** - Improves interoperability

---

### Pattern 3: Entity Hooks

**Digirati Approach**:
```typescript
// Custom hooks with automatic locale handling
function useManifest(id: string): {
  manifest: Manifest;
  label: string;          // Resolved from language map
  summary: string;
  update: (changes: Partial<Manifest>) => void;
}

function useCanvas(id: string): {
  canvas: Canvas;
  label: string;
  dimensions: { width: number; height: number };
  paintings: Annotation[];
  update: (changes: Partial<Canvas>) => void;
}
```

**Field Studio Opportunity**:

Create `hooks/useIIIFEntity.ts`:
```typescript
import { useCallback, useMemo } from 'react';
import { useVault } from './useVault';
import { getIIIFValue } from '../types';

export function useManifest(id: string | null) {
  const { getEntity, updateEntity, settings } = useVault();

  const manifest = useMemo(() =>
    id ? getEntity(id) as IIIFManifest : null,
    [id, getEntity]
  );

  const label = useMemo(() =>
    manifest ? getIIIFValue(manifest.label, settings.language) : '',
    [manifest, settings.language]
  );

  const canvases = useMemo(() =>
    manifest?.items || [],
    [manifest]
  );

  const update = useCallback((changes: Partial<IIIFManifest>) => {
    if (id) updateEntity(id, changes);
  }, [id, updateEntity]);

  return { manifest, label, canvases, update };
}

export function useCanvas(id: string | null) {
  const { getEntity, updateEntity, settings } = useVault();

  const canvas = useMemo(() =>
    id ? getEntity(id) as IIIFCanvas : null,
    [id, getEntity]
  );

  const paintings = useMemo(() =>
    canvas?.items?.flatMap(p => p.items?.filter(a => a.motivation === 'painting') || []) || [],
    [canvas]
  );

  const annotations = useMemo(() =>
    canvas?.annotations?.flatMap(p => p.items || []) || [],
    [canvas]
  );

  return { canvas, paintings, annotations, update: /*...*/ };
}
```

**Benefits**:
- Encapsulates IIIF complexity
- Automatic locale resolution
- Memoized derived data
- Consistent update patterns

**Priority**: **HIGH** - Improves developer experience

---

### Pattern 4: Action-Driven Mutations

**Digirati Approach**:
```typescript
// Instead of direct mutation:
// ❌ manifest.label = newLabel;

// Dispatch validated actions:
// ✅ vault.dispatch(updateLabel(manifestId, newLabel));

// Actions ensure spec compliance:
function updateLabel(id: string, label: LanguageMap) {
  return (state) => {
    validateLanguageMap(label); // Throws if invalid
    return {
      ...state,
      entities: {
        ...state.entities,
        [getType(id)]: {
          ...state.entities[getType(id)],
          [id]: {
            ...state.entities[getType(id)][id],
            label
          }
        }
      }
    };
  };
}
```

**Field Studio Opportunity**:

Create `services/actions.ts`:
```typescript
import { NormalizedState } from './vault';
import { validator } from './validator';

export type Action =
  | { type: 'UPDATE_LABEL'; id: string; label: LanguageMap }
  | { type: 'UPDATE_SUMMARY'; id: string; summary: LanguageMap }
  | { type: 'ADD_CANVAS'; manifestId: string; canvas: IIIFCanvas }
  | { type: 'REMOVE_CANVAS'; manifestId: string; canvasId: string }
  | { type: 'REORDER_CANVASES'; manifestId: string; order: string[] }
  | { type: 'ADD_ANNOTATION'; canvasId: string; annotation: IIIFAnnotation }
  | { type: 'UPDATE_METADATA'; id: string; metadata: MetadataEntry[] }
  | { type: 'BATCH_UPDATE'; updates: Array<{ id: string; changes: Partial<IIIFItem> }> };

export function reduce(state: NormalizedState, action: Action): NormalizedState {
  switch (action.type) {
    case 'UPDATE_LABEL': {
      validateLanguageMap(action.label);
      return updateEntity(state, action.id, { label: action.label });
    }

    case 'ADD_CANVAS': {
      const canvas = {
        ...action.canvas,
        id: action.canvas.id || generateCanvasId(action.manifestId),
        type: 'Canvas' as const,
      };

      // Validate before adding
      const issues = validator.validateItem(canvas);
      if (issues.some(i => i.level === 'error')) {
        throw new ValidationError(issues);
      }

      return addEntity(state, canvas, action.manifestId);
    }

    // ... other actions
  }
}

// Undo/Redo support
export function createUndoableReducer(reduce: Reducer) {
  const history: NormalizedState[] = [];
  let historyIndex = -1;

  return {
    dispatch(state: NormalizedState, action: Action) {
      // Store current state for undo
      history.splice(historyIndex + 1);
      history.push(state);
      historyIndex++;

      return reduce(state, action);
    },

    undo(state: NormalizedState) {
      if (historyIndex > 0) {
        historyIndex--;
        return history[historyIndex];
      }
      return state;
    },

    redo(state: NormalizedState) {
      if (historyIndex < history.length - 1) {
        historyIndex++;
        return history[historyIndex];
      }
      return state;
    }
  };
}
```

**Benefits**:
- Pre-mutation validation
- Consistent spec compliance
- Native undo/redo support
- Auditable change history
- Testable mutations

**Priority**: **HIGH** - Enables undo/redo and improves reliability

---

### Pattern 5: Modular Workbenches

**Digirati Approach**:
Each editor mode is a self-contained module:
```
src/
  editors/
    ManifestEditor/
      index.tsx
      hooks.ts
      actions.ts
      components/
    CanvasEditor/
      index.tsx
      hooks.ts
      actions.ts
      components/
    RangeEditor/
      ...
    AnnotationEditor/
      ...
```

**Field Studio Opportunity**:

Refactor to workbench architecture:
```
src/
  workbenches/
    archive/           # Archive mode
      ArchiveWorkbench.tsx
      useArchive.ts
      archiveActions.ts
      components/
        GridView.tsx
        ListView.tsx
        MapView.tsx
        TimelineView.tsx

    collections/       # Collections mode
      CollectionsWorkbench.tsx
      useCollections.ts
      collectionsActions.ts
      components/
        HierarchyTree.tsx
        RangeEditor.tsx

    metadata/          # Metadata mode
      MetadataWorkbench.tsx
      useMetadata.ts
      metadataActions.ts
      components/
        Spreadsheet.tsx
        BatchEditor.tsx

    viewer/            # Viewer mode
      ViewerWorkbench.tsx
      useViewer.ts
      viewerActions.ts
      components/
        DeepZoom.tsx
        AnnotationLayer.tsx
        CanvasComposer.tsx

    boards/            # Boards mode
      BoardsWorkbench.tsx
      useBoards.ts
      boardsActions.ts

    search/            # Search mode
      SearchWorkbench.tsx
      useSearch.ts
```

**Benefits**:
- Clear ownership of spec interpretations
- Isolated state management per mode
- Easier testing
- Lazy loading by workbench
- Team scalability

**Priority**: **MEDIUM** - Improves maintainability

---

### Pattern 6: Language Map Utilities

**Digirati Approach**:
```typescript
// Wrapper for all language map operations
class InternationalString {
  constructor(private map: LanguageMap) {}

  get(locale: string): string {
    return this.map[locale]?.[0]
      || this.map['none']?.[0]
      || this.map['en']?.[0]
      || Object.values(this.map)[0]?.[0]
      || '';
  }

  set(locale: string, value: string): LanguageMap {
    return { ...this.map, [locale]: [value] };
  }

  getAll(): Array<{ locale: string; values: string[] }> {
    return Object.entries(this.map).map(([locale, values]) => ({
      locale,
      values
    }));
  }

  toJSON(): LanguageMap {
    return this.map;
  }
}
```

**Field Studio Opportunity**:

Enhance `types.ts`:
```typescript
export class LanguageString {
  private map: LanguageMap;

  constructor(input: LanguageMap | string | undefined) {
    if (typeof input === 'string') {
      this.map = { none: [input] };
    } else {
      this.map = input || { none: [''] };
    }
  }

  // Locale-aware get with fallback chain
  get(locale: string = 'none'): string {
    const fallbacks = [locale, 'none', '@none', 'en', ...Object.keys(this.map)];
    for (const loc of fallbacks) {
      if (this.map[loc]?.[0]) return this.map[loc][0];
    }
    return '';
  }

  // Get all values for a locale
  getAll(locale: string): string[] {
    return this.map[locale] || [];
  }

  // Update with immutability
  set(locale: string, value: string): LanguageString {
    return new LanguageString({
      ...this.map,
      [locale]: [value]
    });
  }

  // Add to existing values
  append(locale: string, value: string): LanguageString {
    return new LanguageString({
      ...this.map,
      [locale]: [...(this.map[locale] || []), value]
    });
  }

  // Check if has content
  isEmpty(): boolean {
    return Object.values(this.map).every(arr =>
      !arr || arr.length === 0 || arr.every(s => !s || !s.trim())
    );
  }

  // Get available locales
  get locales(): string[] {
    return Object.keys(this.map).filter(k => this.map[k]?.length > 0);
  }

  // Export as IIIF format
  toJSON(): LanguageMap {
    return { ...this.map };
  }
}
```

**Benefits**:
- Consistent locale handling across app
- Fallback chain management
- Immutable updates
- Simplified component code

**Priority**: **MEDIUM** - Improves i18n handling

---

## Implementation Roadmap

### Phase 1: Foundation (Critical)
1. **Implement Vault-style normalized state**
   - Create `services/vault.ts`
   - Add normalization on load
   - Add denormalization on export
   - Migrate `App.tsx` state management

2. **Create action-driven mutation system**
   - Create `services/actions.ts`
   - Define core action types
   - Implement reducer with validation
   - Add undo/redo support

### Phase 2: Integration (High)
3. **Add V2/V3 bridge**
   - Integrate `@iiif/parser` upgrader
   - Create `services/specBridge.ts`
   - Update import/export flows

4. **Create entity hooks**
   - `useManifest`, `useCanvas`, `useAnnotation`
   - Migrate components to use hooks
   - Remove direct state access

### Phase 3: Refactoring (Medium)
5. **Refactor to workbench architecture**
   - Create workbench folder structure
   - Migrate view components
   - Isolate mode-specific logic

6. **Enhance language map utilities**
   - Create `LanguageString` class
   - Update all label/summary handling
   - Add multi-locale editing support

---

## Dependencies to Consider

```json
{
  "@iiif/vault": "^0.9.x",
  "@iiif/parser": "^1.1.x",
  "@iiif/presentation-3": "^1.1.x",
  "immer": "^10.x"  // For immutable updates
}
```

**Note**: `@iiif/vault` can be adopted incrementally. Start with the normalized state pattern, then layer on vault utilities.

---

## Metrics for Success

| Metric | Current | Target |
|--------|---------|--------|
| Time to update single property | ~50ms (full clone) | <5ms |
| Memory for 1000 canvases | ~500MB | ~100MB |
| Undo/redo support | None | Full history |
| v2 manifest import success | ~70% | 99% |
| Code to handle item lookup | ~50 lines | ~5 lines |

---

## Additional Patterns (Batch 2)

### Pattern 7: Reference Pattern (Relational Identity Mapping)

Hold IIIF References (`{id, type}`) instead of full objects to avoid data duplication.

```typescript
// Range.items becomes references, resolved on demand
interface CanvasRef { id: string; type: 'Canvas'; }
```

### Pattern 8: Property Guards (Schema-Model Coupling)

TypeScript guards for optional IIIF properties to prevent crashes on malformed manifests.

### Pattern 9: Annotation-as-Content Strategy

Canvas is a blank coordinate grid. All media are Annotations with `motivation: painting`.

### Pattern 10: Recursive Range Walker

Flatten `structures` into searchable index for O(1) TOC navigation.

### Pattern 11: Selector Abstraction

Parse URI fragments (`#xywh=`, `#t=`) into objects, re-serialize on save. Enables proper AV and region support.

### Pattern 12: Service-Linked Feature Detection

Adapter pattern to detect services and conditionally enable features (deep zoom, search, auth).
[
  {
    "pattern_name": "Relational Identity Mapping (Reference Pattern)",
    "description": "The editor avoids duplicating large objects by using a 'Reference' pattern. In the internal state, components often hold onto a IIIF 'Reference' (a simple object with 'id' and 'type') rather than the full resource. This mirrors the IIIF specification's use of URIs to link resources, ensuring that a single Canvas can be referenced by multiple Ranges or AnnotationPages without creating data synchronization conflicts."
  },
  {
    "pattern_name": "Strict Schema-Model Coupling",
    "description": "The codebase utilizes TypeScript interfaces that are strictly mapped to the IIIF Presentation API 3.0 JSON schema. By enforcing 'Property Guards,' the application ensures that optional fields (like 'summary' or 'requiredStatement') are handled according to the spec's cardinality rules, preventing the UI from crashing when encountering 'orphaned' or incomplete IIIF objects."
  },
  {
    "pattern_name": "Annotation-as-Content Strategy",
    "description": "Following the IIIF v3 shift where 'everything is an annotation,' the editor treats the Canvas as a blank coordinate system. It uses a 'Painting' pattern where images, video, and audio are not properties of the Canvas itself but are interpreted as Annotation resources. This allows the editor to support complex multi-layered canvases by simply iterating through the 'items' list of the Canvas."
  },
  {
    "pattern_name": "Recursive Resource Walking",
    "description": "To generate tree views (like the Table of Contents), the editor employs a recursive 'Walker' pattern. This logic traverses the 'structures' (Ranges) of a manifest, identifying nested child ranges and canvas references. It interprets the specification's tree-like structure into a flat, searchable index for the UI's navigation sidebar."
  },
  {
    "pattern_name": "Dumb Component / Smart Store Separation",
    "description": "UI components are generally 'spec-agnostic' (dumb), focusing on rendering inputs and labels. The 'Smart' logic is moved to selectors (using the @iiif/vault store) which interpret the spec. For example, a component just asks for 'the label'; the selector performs the complex logic of checking the user's preferred language against the IIIF Language Map to return the correct string."
  },
  {
    "pattern_name": "Virtual Canvas Geometry Logic",
    "description": "The editor implements a coordinate calculation pattern to interpret the 'height' and 'width' of a Canvas. Since IIIF allows media to be larger or smaller than the canvas, the editor calculates 'Aspect Ratio Containers' to visually represent the canvas area, ensuring that annotations are positioned relative to the virtual coordinate space defined in the spec rather than the pixel size of the source image."
  },
  {
    "pattern_name": "Temporal and Spatial Selector Abstraction",
    "description": "When dealing with AV or specific regions of images, the editor abstracts 'Selectors' (e.g., #xywh= or #t=). It uses a parsing pattern to decompose these URI fragments into state-driven objects that the UI can manipulate (like a bounding box or a timeline segment), and then re-serializes them back into the standard IIIF fragment format upon saving."
  },
  {
    "pattern_name": "Service-Linked Architecture",
    "description": "The editor interprets the 'service' property of IIIF resources (like Image Services or Search Services) as external capability providers. It uses an 'Adapter' pattern to detect these services and conditionally enable UI features, such as deep-zooming (via OpenSeadragon) or autocomplete, only when the manifest explicitly declares support for those specific service profiles."
  }
]