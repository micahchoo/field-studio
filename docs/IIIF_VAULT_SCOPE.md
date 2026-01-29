# IIIF Vault Scoping Document

## Current State: Custom Vault Implementation

### What You've Built

Your `services/vault.ts` implements the **Digirati Manifest Editor pattern**:

```typescript
// services/vault.ts - Your implementation
export interface NormalizedState {
  entities: {
    Collection: Record<string, IIIFCollection>;
    Manifest: Record<string, IIIFManifest>;
    Canvas: Record<string, IIIFCanvas>;
    Range: Record<string, IIIFRange>;
    AnnotationPage: Record<string, IIIFAnnotationPage>;
    Annotation: Record<string, IIIFAnnotation>;
  };
  references: Record<string, string[]>;        // parent → children
  reverseRefs: Record<string, string>;         // child → parent
  collectionMembers: Record<string, string[]>; // many-to-many
  memberOfCollections: Record<string, string[]>;
  rootId: string | null;
  typeIndex: Record<string, EntityType>;       // O(1) type lookup
  extensions: Record<string, Record<string, unknown>>;
}
```

**Assessment**: This is a well-designed, production-quality implementation.

---

## Comparison: @iiif/vault

The IIIF Consortium maintains an official vault library:

```
Library: @iiif/vault + @iiif/vault-helpers
Size: ~50KB gzipped
Maintainer: IIIF Consortium (Digirati)
Used by: Mirador 3, Universal Viewer, Clover
```

### @iiif/vault Architecture

```typescript
// @iiif/vault approach
import { Vault } from '@iiif/vault';
import { normalize } from '@iiif/vault/actions';

const vault = new Vault();

// Load a manifest
vault.loadManifest('https://example.com/manifest.json');

// Access normalized state
const manifest = vault.get('https://example.com/manifest.json');
const canvases = vault.getManifestCanvases(manifest.id);

// Subscribe to changes
vault.subscribe(
  (state) => state.iiif.entities.Manifest,
  (manifests) => console.log('Manifests updated:', manifests)
);
```

### Key Differences

| Feature | Your Vault | @iiif/vault |
|---------|------------|-------------|
| **Bundle Size** | ~5KB (your code) | ~50KB |
| **Dependencies** | None | Several (@iiif/parser, etc.) |
| **IIIF Compliance** | ✅ Full 3.0 | ✅ Full 3.0 |
| **External Resources** | ❌ Manual | ✅ Built-in loading |
| **Serialization** | ❌ Custom | ✅ Standardized |
| **Ecosystem** | Custom | Mirador/UV compatible |
| **Type Safety** | ✅ Excellent | ✅ Good |
| **Undo/Redo** | ✅ Built-in | ❌ Separate concern |
| **React Integration** | ✅ Custom hooks | ✅ @iiif/react-vault |

---

## Deep Dive: @iiif/vault Features

### 1. Resource Loading

```typescript
// @iiif/vault handles external resources
const vault = new Vault();

// Automatically fetches and normalizes
await vault.loadManifest('https://example.com/manifest.json');

// Handles collections recursively
await vault.loadCollection('https://example.com/collection.json');

// Caching built-in
const cached = vault.get('https://example.com/manifest.json');
```

**Your equivalent**: `services/remoteLoader.ts` (manual implementation)

### 2. Selector System

```typescript
// @iiif/vault-helpers selectors
import { getCanvasPainting, getThumbnail } from '@iiif/vault-helpers';

const painting = getCanvasPainting(vault, canvasId);
const thumbnail = getThumbnail(vault, canvasId, { preferredWidth: 200 });
```

**Your equivalent**: `services/selectors.ts` (similar pattern)

### 3. Standardized Serialization

```typescript
// @iiif/vault serialization
const serialized = vault.serialize('https://example.com/manifest.json');
// Returns IIIF-compliant JSON

const state = vault.getState();
// Returns full normalized state (can be persisted)
```

**Your equivalent**: `denormalize()` function in `services/vault.ts`

---

## Other Libraries to Consider

### iiif-host (Server-side)

```
Library: iiif-host / iiif-host-simple
Type: Node.js server
Use case: Self-hosted IIIF Image API server
```

**Not applicable** to Field Studio (browser-only architecture).

### @iiif/parser

```
Library: @iiif/parser
Size: ~15KB
Purpose: IIIF JSON parsing and normalization
```

**Could replace**: Your `normalize()` function

```typescript
// Using @iiif/parser
import { normalize } from '@iiif/parser';

const normalized = normalize(manifest);
// Returns normalized structure similar to your vault
```

### @iiif/presentation-3

```
Library: @iiif/presentation-3
Size: ~10KB
Purpose: Type definitions and validators
```

**Could enhance**: Your `types.ts` with official IIIF types

---

## Recommendation: Keep Custom, Borrow Ideas

### Why Keep Your Implementation

1. **Bundle Size**: Your vault is ~10x smaller
2. **No Dependencies**: Easier maintenance, security auditing
3. **Undo/Redo**: Built-in, @iiif/vault doesn't have this
4. **Field-Specific**: Designed for your use case
5. **Full Control**: No upstream breaking changes

### What to Borrow from @iiif/vault

#### 1. Selector Helpers

```typescript
// services/selectors.ts - Enhanced with vault-helpers patterns
export function getCanvasPainting(canvas: IIIFCanvas): IIIFExternalWebResource | null {
  // Your current implementation is good, but could be more robust
  const paintingPage = canvas.items?.find(page => 
    page.items?.some(anno => 
      anno.motivation === 'painting' || 
      (Array.isArray(anno.motivation) && anno.motivation.includes('painting'))
    )
  );
  
  const paintingAnno = paintingPage?.items?.find(anno =>
    anno.motivation === 'painting' ||
    (Array.isArray(anno.motivation) && anno.motivation.includes('painting'))
  );
  
  const body = paintingAnno?.body;
  if (Array.isArray(body)) {
    return body.find(b => b.type === 'Image') as IIIFExternalWebResource || null;
  }
  return body?.type === 'Image' ? body as IIIFExternalWebResource : null;
}
```

#### 2. Thumbnail Resolution

```typescript
// services/thumbnailResolver.ts - Inspired by @iiif/vault-helpers
interface ThumbnailOptions {
  preferredWidth?: number;
  preferredHeight?: number;
  fallbackToCanvas?: boolean;
}

export function resolveThumbnail(
  vault: NormalizedState,
  entityId: string,
  options: ThumbnailOptions = {}
): ResolvedImageSource {
  const entity = getEntity(vault, entityId);
  if (!entity) return createPlaceholderSource();
  
  // 1. Check entity.thumbnail
  if (entity.thumbnail?.length) {
    const bestThumb = findBestSize(entity.thumbnail, options);
    if (bestThumb) return createSource(bestThumb);
  }
  
  // 2. For Canvases, check painting annotation
  if (isCanvas(entity)) {
    const painting = getCanvasPainting(entity);
    if (painting?.service) {
      // Use IIIF service for dynamic thumbnail
      return createIIIFThumbnailSource(painting.service, options);
    }
  }
  
  // 3. For Manifests, check first Canvas
  if (isManifest(entity)) {
    const firstCanvasId = getChildIds(vault, entityId)[0];
    if (firstCanvasId) {
      return resolveThumbnail(vault, firstCanvasId, options);
    }
  }
  
  return createPlaceholderSource();
}
```

#### 3. Reference Traversal

```typescript
// services/traversal.ts - Vault-style helpers
export function* traverseDepthFirst(
  vault: NormalizedState,
  startId: string
): Generator<IIIFItem, void, unknown> {
  const visited = new Set<string>();
  const stack = [startId];
  
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    
    const entity = getEntity(vault, id);
    if (entity) {
      yield entity;
      // Add children to stack
      const children = getChildIds(vault, id);
      stack.push(...children.reverse()); // Reverse for correct order
    }
  }
}

// Usage
for (const entity of traverseDepthFirst(vault, rootId)) {
  console.log(entity.type, entity.id);
}
```

---

## Interoperability: Export to @iiif/vault Format

If you want compatibility with Mirador/Universal Viewer:

```typescript
// services/interop/iiifVaultExport.ts
export function exportToVaultFormat(
  yourVault: NormalizedState
): VaultCompatibleState {
  // Convert your normalized state to @iiif/vault format
  return {
    iiif: {
      entities: {
        Manifest: yourVault.entities.Manifest,
        Canvas: yourVault.entities.Canvas,
        Collection: yourVault.entities.Collection,
        Annotation: yourVault.entities.Annotation,
        // ... map all entities
      },
      ordering: {
        Manifest: Object.keys(yourVault.entities.Manifest),
        // ... ordering info
      }
    },
    // Vault-specific metadata
    meta: {
      // ...
    }
  };
}
```

---

## Enhanced Architecture: Hybrid Approach

Keep your vault but add @iiif/vault compatibility layer:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Field Studio App                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Your Vault (services/vault.ts)               │  │
│  │  - Normalized state                                        │  │
│  │  - O(1) lookups                                            │  │
│  │  - Undo/redo                                               │  │
│  │  - Action-based mutations                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Compatibility Layer (optional)                  │  │
│  │  - Export to @iiif/vault format                           │  │
│  │  - Import from @iiif/vault                                │  │
│  │  - Mirador/UV export                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              IIIF Presentation API 3.0                   │  │
│  │  - JSON-LD export (existing)                              │  │
│  │  - Standards compliant                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Action Items

### Immediate (No Changes Required)

Your vault implementation is solid. No urgent changes needed.

### Short-term (Quality Improvements)

1. **Add @iiif/presentation-3 types** for stricter compliance:

```typescript
// types.ts - Add official IIIF types
import type { Manifest, Canvas, Collection } from '@iiif/presentation-3';

// Extend or map to your types
export interface IIIFManifest extends Manifest {
  // Your extensions
  _fileRef?: File;
  _blobUrl?: string;
  _state?: ResourceState;
}
```

2. **Add vault-helpers style selectors**:

```typescript
// services/selectors.ts - Expand with more helpers
export const selectors = {
  getManifestCanvases,
  getCanvasPainting,
  getThumbnail,
  getLabel,
  getMetadata,
  // ... more
};
```

### Long-term (Ecosystem Compatibility)

3. **Export compatibility** for Mirador/UV:

```typescript
// export formats
export type ExportFormat = 
  | 'iiif-presentation-3'  // Current
  | 'mirador-3'            // @iiif/vault compatible
  | 'universal-viewer'     // UV compatible
  | 'clover'               // Clover compatible
```

---

## Files to Review

| File | Assessment | Action |
|------|------------|--------|
| `services/vault.ts` | ✅ Excellent | Keep as-is |
| `services/actions.ts` | ✅ Excellent | Keep as-is |
| `hooks/useIIIFEntity.tsx` | ✅ Good | Minor enhancements |
| `services/selectors.ts` | ⚠️ Basic | Add more helpers |
| `types.ts` | ✅ Good | Consider @iiif/presentation-3 |

---

## Conclusion

**Your custom vault is a strength, not a weakness.**

- It's smaller, faster, and purpose-built
- You have full control over undo/redo
- No external dependencies to break

**The @iiif/vault ecosystem is valuable for:**
- Interoperability with Mirador/UV
- Learning patterns (selectors, helpers)
- Type definitions (@iiif/presentation-3)

**Recommendation**: Stay with custom vault, add compatibility layer if needed for external viewers.
