# Field Studio: Development Patterns

These patterns govern the day-to-day coding practices within the codebase, ensuring consistency and type safety across the application.

---

## 1. Strict Typing Strategy

The project uses strict TypeScript definitions to model the complexity of the IIIF specification.

### Explicit Interfaces (`types.ts`)

Core IIIF types are comprehensively defined:

```typescript
export interface IIIFItem {
  "@context"?: string | string[];
  id: string;
  type: "Collection" | "Manifest" | "Canvas" | "Range" |
        "AnnotationPage" | "Annotation" | "AnnotationCollection" |
        "Agent" | "Text" | "Dataset" | "Image" | "Video" | "Sound";
  label?: Record<string, string[]>;
  summary?: Record<string, string[]>;
  metadata?: Array<{ label: Record<string, string[]>; value: Record<string, string[]> }>;
  // ... additional properties

  // Internal properties (prefixed with _)
  _fileRef?: File;
  _blobUrl?: string;
  _parentId?: string;
  _state?: ResourceState;
  _filename?: string;
}

export interface IIIFCanvas extends IIIFItem {
  type: "Canvas";
  width: number;
  height: number;
  duration?: number;
  items: IIIFAnnotationPage[];
}
```

### Type Guards

Runtime type narrowing for polymorphic IIIF JSON:

```typescript
export function isCanvas(item: IIIFItem | null | undefined): item is IIIFCanvas;
export function isManifest(item: IIIFItem | null | undefined): item is IIIFManifest;
export function isCollection(item: IIIFItem | null | undefined): item is IIIFCollection;
export function isRange(item: IIIFItem | null | undefined): item is IIIFRange;
export function isAnnotation(item: any): item is IIIFAnnotation;
export function isAnnotationPage(item: any): item is IIIFAnnotationPage;
export function isTextualBody(body: IIIFAnnotationBody): body is IIIFTextualBody;

// Usage
if (isCanvas(item)) {
  console.log(item.width, item.height);  // TypeScript knows these exist
}
```

### Immutable Value Objects

The `LanguageString` class wraps IIIF Language Maps:

```typescript
const label = new LanguageString({ en: ['Title'], fr: ['Titre'] });

// Immutable operations
const updated = label.set('es', 'Título');  // Returns new instance

// Safe accessors
label.get('en');           // "Title" (first value)
label.getAll('en');        // ["Title"] (all values)
label.entries();           // [{ locale: 'en', values: ['Title'] }, ...]
label.hasLocale('de');     // false
label.isEmpty();           // false

// Static constructors
LanguageString.of('Hello', 'en');
LanguageString.empty();
```

---

## 2. Hook Encapsulation

Logic is rarely placed directly inside components. Instead, it is wrapped in custom hooks that interface with singleton services.

### Architecture Pattern

```
┌──────────────┐     ┌──────────────┐     ┌───────────────────┐     ┌─────────────┐
│  Component   │ ──▶ │   useHook    │ ──▶ │ SingletonService  │ ──▶ │  Storage    │
│  (Render)    │     │  (Logic)     │     │  (Business)       │     │  (IndexedDB)│
└──────────────┘     └──────────────┘     └───────────────────┘     └─────────────┘
```

### Key Hooks (`hooks/`)

**State Management:**
```typescript
// Access normalized IIIF state
const { state, dispatch, getEntity, undo, redo } = useVault();

// Type-specific entity access with auto re-rendering
const canvas = useCanvas(canvasId);
const manifest = useManifest(manifestId);
const children = useChildren(parentId);
const parent = useParent(itemId);
```

**History & Undo:**
```typescript
const { state, update, undo, redo, canUndo, canRedo } = useHistory<BoardState>(initial);
```

**Viewport Interaction:**
```typescript
const { viewport, pan, zoom, reset, fitToContent } = useViewport({
  minScale: 0.1,
  maxScale: 5,
  initialScale: 1,
});

usePanZoomGestures(containerRef, viewport, {
  panButton: 'middle',
  requireCtrlForZoom: true,
});
```

**Application Settings:**
```typescript
const { settings, updateSettings, toggleFieldMode } = useAppSettings();
```

**UI State:**
```typescript
const { isOpen, open, close, toggle } = useDialogState();
const { currentTab, setTab } = useInspectorTabs('properties');
```

### Benefits

- Components are "dumb" — focused on rendering
- Business logic is testable in isolation
- Reusable across multiple components
- Clear separation of concerns

---

## 3. Configuration as Code

Magic strings and numbers are avoided through centralized configuration.

### Constants (`constants.ts`)

```typescript
export const CONSTANTS = {
  APP_NAME: "IIIF Field Archive Studio",
  VERSION: "3.0.0",
  DEFAULT_LANGUAGE: "en",
  TOAST_DURATION: 3000,
};

export const FEATURE_FLAGS = {
  USE_NEW_STAGING: true,  // Two-pane StagingWorkbench
};

export const IIIF_CONFIG = {
  BASE_URL: {
    DEFAULT: 'http://localhost/iiif',
    PATH_SEGMENT: 'iiif'
  },
  INGEST: {
    ROOT_NAME: 'Archive',
    COLLECTION_PREFIX: 'c-',
    META_FILE: 'info.yml',
    AUTO_DETECTION: {
      MIN_MEDIA_FILES_FOR_MANIFEST: 1,
      LEAF_DETECTION: true,
    }
  },
  IMAGE: {
    MIN_THUMB_WIDTH: 120,
    DEFAULT_CANVAS_WIDTH: 1200,
    DEFAULT_CANVAS_HEIGHT: 1600,
  },
};

export const DEFAULT_INGEST_PREFS = {
  defaultCanvasWidth: 1200,
  defaultCanvasHeight: 1600,
  generateThumbnails: true,
  detectDimensions: true,
  harvestMetadata: true,
  deduplicateFiles: true,
  generateManifests: true,
};
```

### Feature Flags / App Settings

User-adaptable features via `AppSettings`:

```typescript
export interface AppSettings {
  defaultBaseUrl: string;
  language: string;
  theme: 'light' | 'dark';
  fieldMode: boolean;                    // Simplified UI
  abstractionLevel: AbstractionLevel;    // 'simple' | 'standard' | 'advanced'
  metadataComplexity: MetadataComplexity;// 'basic' | 'standard' | 'advanced'
  showTechnicalIds: boolean;
  autoSaveInterval: number;
  // ...
}
```

### CSV Column Configuration

Centralized mapping for metadata import/export:

```typescript
export const CSV_SUPPORTED_PROPERTIES: string[] = [
  'label', 'summary', 'metadata.title', 'metadata.creator',
  'metadata.date', 'metadata.description', 'metadata.subject',
  'rights', 'navDate'
  // ...
];

export const CSV_COLUMN_ALIASES: Record<string, string> = {
  'title': 'label',
  'name': 'label',
  'description': 'summary',
  // ...
};
```

---

## 4. Zero-Copy Architecture

Handles large media files in the browser without memory exhaustion.

### Blob References

Files are stored by reference, never loaded fully into React state:

```typescript
interface IIIFItem {
  // Internal file reference (not serialized)
  _fileRef?: File;
  _blobUrl?: string;
}

// Files stored in IndexedDB, not state
await storage.saveFile(identifier, file);
const blob = await storage.getFile(identifier);
```

### Storage Architecture (`services/storage.ts`)

IndexedDB stores with separation of concerns:

| Store | Contents |
|-------|----------|
| `files` | Original uploaded blobs |
| `derivatives` | Pre-generated thumbnails/tiles |
| `vault` | JSON state snapshots |

### Virtualization

`VirtualManifestFactory` creates lightweight JSON wrappers:

```typescript
// Manifest contains reference, not binary
{
  "id": "manifest-123",
  "items": [{
    "type": "Canvas",
    "items": [{
      "body": {
        "id": "blob:localhost/abc123",  // Reference to IndexedDB
        "type": "Image"
      }
    }]
  }]
}
```

### Offscreen Processing

Heavy operations run on background threads:

```typescript
// Service Worker (public/sw.js)
const bitmap = await createImageBitmap(blob);
const canvas = new OffscreenCanvas(width, height);
const ctx = canvas.getContext('2d');
ctx.drawImage(bitmap, ...);
const result = await canvas.convertToBlob({ type: 'image/jpeg' });

// Web Worker (services/tileWorker.ts)
const pool = getTileWorkerPool();
const derivative = await generateDerivativeAsync(file, options);
```

---

## 5. Defensive Coding (Self-Healing)

Handles malformed external manifests gracefully.

### Validation Pipeline (`services/validator.ts`)

```typescript
const issues = validate(item);

interface ValidationIssue {
  id: string;
  itemId: string;
  itemLabel?: string;
  category: 'structural' | 'required' | 'recommended' | 'compatibility';
  message: string;
  fixable: boolean;
  suggestions?: string[];
}
```

**Issue Categories:**
- `structural` — IIIF spec violations
- `required` — Missing mandatory properties
- `recommended` — Missing best-practice properties
- `compatibility` — Viewer-specific issues

### Auto-Healing (`services/validationHealer.ts`)

```typescript
// Fix single issue
const { success, updatedItem } = healIssue(item, issue);

// Batch healing
const { item: healed, healed: count, failed } = healAllIssues(item, issues);

// Human-readable fix description
const description = getFixDescription(issue);
// "Will generate label from resource ID"
```

### Integration Points

- **Inspector.tsx** — Inline issue display with heal buttons
- **QCDashboard.tsx** — Batch validation and healing
- **exportService.ts** — Pre-export validation gate

---

## 6. Coordinate System Management

Consistent handling of screen vs. canvas coordinates in spatial views.

### Viewport State

```typescript
interface Viewport {
  x: number;      // Pan offset X
  y: number;      // Pan offset Y
  scale: number;  // Zoom level (0.1 to 5)
}
```

### Coordinate Conversion (`BoardView.tsx`)

```typescript
// Screen → Canvas (for mouse events)
const getCanvasCoords = (e: React.MouseEvent) => {
  const rect = containerRef.current?.getBoundingClientRect();
  let x = (e.clientX - rect.left - viewport.x) / viewport.scale;
  let y = (e.clientY - rect.top - viewport.y) / viewport.scale;
  if (snapToGrid) {
    x = Math.round(x / GRID_SIZE) * GRID_SIZE;
    y = Math.round(y / GRID_SIZE) * GRID_SIZE;
  }
  return { x, y };
};

// Canvas → Screen (for rendering)
const toScreen = (x: number, y: number) => ({
  x: x * viewport.scale + viewport.x,
  y: y * viewport.scale + viewport.y
});
```

---

## 7. Error Boundary Strategy

Graceful degradation when components fail.

### Implementation (`components/ErrorBoundary.tsx`)

```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <ComplexComponent />
</ErrorBoundary>
```

### Fallback UI

- User-friendly error message
- Option to retry or reset
- Error details for debugging (in dev mode)
