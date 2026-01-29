# Field Studio: Design Patterns

The architecture of Field Studio follows several established software design patterns to manage complexity and ensure scalability of the client-side logic.

---

## 1. Singleton Services Pattern

**Context:** The application needs global access to complex logic (like generating manifests or tracking provenance) without prop-drilling or complex context setups.

**Implementation:**
- Logic is encapsulated in classes within the `services/` directory.
- A single instance of each class is exported for global access.

**Key Services:**
| Service | File | Purpose |
|---------|------|---------|
| `exportService` | `services/exportService.ts` | Archive export with image optimization |
| `provenanceService` | `services/provenanceService.ts` | Edit history and audit trails |
| `searchService` | `services/searchService.ts` | Full-text search indexing |
| `csvImporterService` | `services/csvImporter.ts` | CSV metadata round-trip |
| `avService` | `services/avService.ts` | Audio/video canvas handling |

**Example Usage:**
```typescript
// Direct import anywhere in the codebase
import { exportService } from './services/exportService';

// Use without instantiation
const archive = await exportService.exportArchive(root, options, onProgress);
```

**Benefits:**
- Single source of truth for service state
- Easy import across any component or hook
- No prop-drilling or complex context hierarchies

---

## 2. Normalized State Pattern (The Vault)

**Context:** IIIF data is inherently recursive and deeply nested (Collection → Manifest → Canvas → AnnotationPage → Annotation). Managing this in a standard React state tree would lead to performance issues and update complexity.

**Implementation (`services/vault.ts`):**

The Vault breaks down nested IIIF trees into flat tables by entity type:

```typescript
interface NormalizedState {
  entities: {
    Collection: Record<string, IIIFCollection>;
    Manifest: Record<string, IIIFManifest>;
    Canvas: Record<string, IIIFCanvas>;
    Range: Record<string, IIIFRange>;
    AnnotationPage: Record<string, IIIFAnnotationPage>;
    Annotation: Record<string, IIIFAnnotation>;
  };
  references: Record<string, string[]>;           // Parent → child IDs
  reverseRefs: Record<string, string>;            // Child → parent ID
  collectionMembers: Record<string, string[]>;    // Collection → members (non-hierarchical)
  memberOfCollections: Record<string, string[]>;  // Resource → collections
  rootId: string | null;
  typeIndex: Record<string, EntityType>;
  extensions: Record<string, Record<string, unknown>>; // Vendor properties
}
```

**Key Operations:**
| Function | Complexity | Purpose |
|----------|------------|---------|
| `getEntity(state, id)` | O(1) | Direct lookup by ID |
| `updateEntity(state, id, updates)` | O(1) | Update single entity |
| `addEntity(state, entity, parentId)` | O(1) | Add with parent reference |
| `moveEntity(state, id, newParentId, index)` | O(1) | Reorder/reparent |
| `normalize(root)` | O(n) | Convert tree to flat state |
| `denormalize(state)` | O(n) | Reconstruct tree for export |

**Dual Relationship Model (IIIF 3.0):**
- **Hierarchical:** `references`/`reverseRefs` for Manifest→Canvas ownership
- **Non-hierarchical:** `collectionMembers`/`memberOfCollections` for Collection membership

**Benefits:**
- Updates are O(1) (direct dictionary access)
- Prevents data duplication (Canvas stored once, referenced many times)
- Simplifies move operations (change parent reference only)
- Extension preservation for round-tripping unknown properties

---

## 3. Service Worker as Backend Pattern

**Context:** The application must function offline but needs to support the IIIF Image API, which is defined as a server-side HTTP protocol.

**Implementation (`public/sw.js`):**

The Service Worker intercepts fetch requests and resolves them using IndexedDB:

```
┌─────────────────┐     fetch('/iiif/image/...')     ┌──────────────────┐
│  OpenSeadragon  │ ─────────────────────────────▶  │  Service Worker  │
│    (Viewer)     │                                  │                  │
└─────────────────┘                                  └────────┬─────────┘
                                                              │
                     ┌────────────────────────────────────────┼────────────────────────────┐
                     │                                        ▼                            │
                     │  1. Check cache (iiif-tile-cache-v3)                                │
                     │  2. Parse IIIF URL parameters                                       │
                     │  3. Lookup file in IndexedDB (files store)                          │
                     │  4. Check derivatives store (pre-generated thumbnails)              │
                     │  5. Process on-demand with OffscreenCanvas                          │
                     │  6. Cache and return response                                       │
                     └─────────────────────────────────────────────────────────────────────┘
```

**URL Pattern:**
```
/iiif/image/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

**Supported Parameters:**
- **Region:** `full`, `x,y,w,h`, `pct:x,y,w,h`
- **Size:** `max`, `w,h`, `w,`, `,h`, `pct:n`
- **Rotation:** `0`, `90`, `180`, `270`, `!0` (mirrored)
- **Quality:** `default`, `color`, `gray`, `bitonal`
- **Format:** `jpg`, `png`, `webp`, `gif`

**Benefits:**
- Frontend components (OpenSeadragon, Mirador) are server-agnostic
- True IIIF Image API 3.0 compliance
- Offline deep-zoom capability

---

## 4. Factory Pattern

**Context:** Ingesting raw files requires creating complex IIIF structures with sensible defaults.

**Implementation:**

Two complementary factories handle resource creation:

**VirtualManifestFactory (`services/virtualManifestFactory.ts`):**
- Creates manifests from disparate resources
- Handles dimension probing and MIME type detection
- Constructs valid JSON-LD skeletons

**IIIFBuilder (`services/iiifBuilder.ts`):**
- Transforms folder hierarchies into IIIF collections
- Two-pass analysis: detect types, then build
- Queues tile generation for async processing

```typescript
// Ingest a folder tree
const result = await buildTree(fileTree, baseUrl, {
  defaultCanvasWidth: 1200,
  defaultCanvasHeight: 1600,
  generateThumbnails: true,
  detectDimensions: true,
  harvestMetadata: true,
});
```

**Benefits:**
- Centralizes object creation logic
- Ensures all resources comply with IIIF 3.0 spec
- Consistent defaults across ingest paths

---

## 5. Healer Pattern

**Context:** Imported data or user inputs may be invalid or incomplete according to the IIIF spec.

**Implementation (`services/validationHealer.ts`):**

```typescript
interface HealResult {
  success: boolean;
  updatedItem?: IIIFItem;
  message?: string;
}

// Heal single issue
const result = healIssue(item, issue);

// Heal all fixable issues
const { item: healed, healed: count, failed } = healAllIssues(item, issues);

// Apply fix back to tree
const updatedRoot = applyHealToTree(root, itemId, healedItem);
```

**Auto-Fix Capabilities:**
| Issue | Fix Applied |
|-------|-------------|
| Missing label | Derive from ID or filename |
| Missing dimensions | Set defaults (1200×1600) |
| Invalid HTTP URIs | Generate valid ones |
| Duplicate IDs | Append unique suffix |
| Empty items array | Add placeholder canvas |
| Conflicting behaviors | Clear and reset |
| Structures on Collection | Remove (invalid in 3.0) |

**Integration Points:**
- `Inspector.tsx` — Shows issues with inline heal buttons
- `QCDashboard.tsx` — Batch healing interface
- `exportService.ts` — Pre-export validation pipeline

**Benefits:**
- System degrades gracefully on bad data
- Users can fix issues without understanding the spec
- Pre-export validation prevents invalid output

---

## 6. Action Dispatcher Pattern

**Context:** Complex state changes need history tracking (undo/redo) and consistent mutation semantics.

**Implementation (`services/actions.ts`):**

```typescript
interface Action {
  type: string;
  payload: any;
  inverse?: Action;  // For undo
}

class ActionDispatcher {
  dispatch(action: Action): boolean;
  undo(): boolean;
  redo(): boolean;
  subscribe(callback: (state) => void): () => void;
}
```

**Benefits:**
- Consistent mutation semantics
- Full undo/redo support
- Event-driven UI updates via subscriptions

---

## 7. Immutable Value Object Pattern

**Context:** IIIF Language Maps (`{ "en": ["value"] }`) are complex and error-prone to manipulate directly.

**Implementation (`types.ts` — `LanguageString` class):**

```typescript
const label = new LanguageString({ en: ['Title'], fr: ['Titre'] });

// Immutable operations return new instances
const updated = label
  .set('es', 'Título')
  .append('en', 'Subtitle')
  .remove('fr');

// Safe accessors
label.get('en');        // "Title"
label.getAll('en');     // ["Title"]
label.hasLocale('fr');  // true
label.locales;          // ["en", "fr"]

// JSON-LD serialization
label.toJSON();         // { "en": ["Title"], "fr": ["Titre"] }
```

**Benefits:**
- Abstracts JSON-LD complexity
- Prevents accidental mutation
- Type-safe locale handling
