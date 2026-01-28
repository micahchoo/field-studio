# Field Studio: Utility & Functionality

Field Archive Studio is a local-first, browser-based workbench designed to bridge the gap between unstructured field research data and standards-compliant IIIF archives. It operates entirely within the user's browser, requiring no external server infrastructure during the authoring process.

---

## Core Capabilities

### 1. Universal Media Ingest

The tool accepts raw media files and instantly "virtualizes" them into standards-compliant IIIF resources.

#### Supported Formats

| Type | Formats |
|------|---------|
| Images | JPG, PNG, TIFF, WebP, GIF |
| Audio | MP3, WAV, OGG, FLAC |
| Video | MP4, WebM, OGV |
| Documents | PDF |

#### Ingest Services

**IIIFBuilder (`services/iiifBuilder.ts`):**
- Transforms folder hierarchies into IIIF collections
- Two-pass analysis: detect types first, then build
- Queues tile generation for async processing

```typescript
const result = await buildTree(fileTree, baseUrl, {
  defaultCanvasWidth: 1200,
  defaultCanvasHeight: 1600,
  generateThumbnails: true,
  detectDimensions: true,
  harvestMetadata: true,
  deduplicateFiles: true,
});
```

**IngestAnalyzer (`services/ingestAnalyzer.ts`):**
- Folder structure analysis for IIIF type detection
- User-confirmable type overrides
- Handles ambiguous structures gracefully

```typescript
const analysis = analyzeForIngest(fileTree, config);
const proposedManifests = getProposedManifests(analysis);
const withOverride = overrideNodeType(tree, nodeId, 'Manifest');
```

**VirtualManifestFactory (`services/virtualManifestFactory.ts`):**
- Creates manifests from disparate resources
- Probes media for dimensions and duration
- Constructs valid JSON-LD skeletons

#### Zero-Copy Architecture

Large files are stored by reference in IndexedDB:

```typescript
// Manifest holds reference, not binary
{
  "body": {
    "id": "blob:localhost/abc123",  // Reference to IndexedDB
    "type": "Image",
    "format": "image/jpeg"
  }
}
```

---

### 2. Local IIIF Image Server

**File:** `public/sw.js`

A Service Worker implements IIIF Image API 3.0 entirely in-browser.

#### Request Interception

```
/iiif/image/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

#### Parameter Support

| Parameter | Supported Values |
|-----------|------------------|
| **Region** | `full`, `x,y,w,h`, `pct:x,y,w,h`, `square` |
| **Size** | `max`, `w,h`, `w,`, `,h`, `pct:n`, `^w,h` |
| **Rotation** | `0`, `90`, `180`, `270`, `!n` (mirror) |
| **Quality** | `default`, `color`, `gray`, `bitonal` |
| **Format** | `jpg`, `png`, `webp`, `gif` |

#### Processing Pipeline

1. **Cache Check** — Return cached response if available
2. **IndexedDB Lookup** — Retrieve original blob from `files` store
3. **Derivative Check** — Check pre-generated thumbnails in `derivatives` store
4. **On-Demand Processing** — Use OffscreenCanvas for real-time transformation
5. **Cache & Return** — Store in cache, return blob response with CORS headers

#### Deep Zoom Support

True IIIF deep zoom without a backend server:

```typescript
// Generate tile pyramid for Level 0 IIIF
const tiles = await exportService.generateTilePyramid(file, width, height, assetId);
// Output: tiles at multiple scale factors (1x, 2x, 4x, 8x, ...)
```

---

### 3. Archive Management & Curation

#### The Vault (`services/vault.ts`)

Normalized state management for complex IIIF structures:

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
  references: Record<string, string[]>;     // Hierarchical ownership
  collectionMembers: Record<string, string[]>;  // Non-hierarchical membership
  // ...
}
```

**Key Operations:**
- O(1) entity lookup and update
- Hierarchical + collection relationships (IIIF 3.0)
- Extension preservation for round-tripping

#### Metadata Editing

**MetadataSpreadsheet (`components/views/MetadataSpreadsheet.tsx`):**
- Spreadsheet-style bulk editing
- Inline validation
- Language-aware fields

**CSV Round-Trip (`services/csvImporter.ts`):**
```typescript
// Export template
await metadataTemplateService.downloadMetadataTemplate(root, 'metadata.csv');

// Import with auto-mapping
const mappings = autoDetectMappings(headers, filenameColumn);
await applyMappings(root, rows, filenameColumn, mappings);
```

#### Validation & Auto-Healing

**Validator (`services/validator.ts`):**
```typescript
const issues = validate(item);
// Returns: ValidationIssue[] with category, message, fixable flag
```

**ValidationHealer (`services/validationHealer.ts`):**
```typescript
// Fix single issue
const { success, updatedItem } = healIssue(item, issue);

// Batch healing
const { item: healed, healed: count } = healAllIssues(item, issues);
```

**Fixable Issues:**
| Issue | Auto-Fix |
|-------|----------|
| Missing label | Derive from ID/filename |
| Missing dimensions | Set defaults (1200×1600) |
| Invalid HTTP URIs | Generate valid ones |
| Duplicate IDs | Append unique suffix |
| Empty items array | Add placeholder canvas |
| Conflicting behaviors | Clear and reset |

#### Provenance Tracking (`services/provenanceService.ts`)

PREMIS-compliant audit trail:

- Every modification tracked
- Ingest events logged
- Checksum verification
- User agent attribution

#### Duplicate Detection (`services/fileIntegrity.ts`)

```typescript
const result = await checkIntegrity(items);
// Returns: duplicate groups, hash conflicts, missing files
```

---

### 4. Static Site Generation (Export)

**Files:** `services/exportService.ts`, `services/staticSiteExporter.ts`

#### Export Formats

| Format | Output | Use Case |
|--------|--------|----------|
| **Standard** | IIIF JSON + tiles | Generic IIIF deployment |
| **Canopy** | Jekyll + Canopy viewer | Interactive exhibit |
| **WAX** | Jekyll + Lunr.js search | Minicomp/Wax sites |

#### Export Options

```typescript
interface ExportOptions {
  format: 'standard' | 'canopy' | 'wax';
  includeDerivatives?: boolean;
  canopyConfig?: {
    baseUrl?: string;    // Default: http://localhost:8765
    port?: number;
  };
  imageApiOptions?: {
    generateTiles?: boolean;
    tileSize?: number;   // Default: 512
    maxZoomLevel?: number;
    derivativePresets?: 'standard' | 'custom';
  };
}
```

#### Generated Assets

**Standard Export:**
```
output/
├── iiif/
│   ├── collection.json
│   └── {manifest-id}/
│       ├── manifest.json
│       └── tiles/{canvas-id}/{z}/{x}_{y}.jpg
└── assets/
```

**Canopy/WAX Export:**
```
output/
├── _config.yml
├── _data/
│   ├── items.json
│   └── items.yml
├── _items/{item-id}.md
├── iiif/
├── search/index.json
└── js/lunr-config.js
```

#### Level 0 IIIF Tiles

Pre-computed image tiles eliminate the need for an image server:

```typescript
// Generate tile pyramid
const tiles = await generateTilePyramid(file, width, height, assetId);
// Output structure: tiles/{z}/{x}_{y}.jpg
```

#### Search Index

Lunr.js compatible full-text search:

```typescript
const index = generateSearchIndex(root, config);
// Indexes: label, summary, metadata values
```

---

### 5. Spatial Synthesis ("The Board")

**File:** `components/views/BoardView.tsx` (62KB)

A spatial canvas for arranging IIIF items and mapping relationships.

#### Board State

```typescript
interface BoardState {
  items: BoardItem[];
  connections: Connection[];
}

interface BoardItem {
  id: string;
  resourceId: string;
  x: number; y: number;      // Position
  w: number; h: number;      // Dimensions
  resourceType: string;
  label: string;
  blobUrl?: string;
  isNote?: boolean;
  annotations?: IIIFAnnotation[];
  layers?: any[];
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: 'depicts' | 'transcribes' | 'relatesTo' | 'contradicts' | 'precedes';
  label?: string;
}
```

#### Features

| Feature | Description |
|---------|-------------|
| **Infinite Canvas** | Pan/zoom with configurable scale (0.1x–5x) |
| **Grid Snapping** | Optional 24px grid alignment |
| **Tools** | select, connect, pan, note |
| **Connections** | Typed relationships between items |
| **Annotations** | Polygon/freehand drawing on items |
| **Image Composition** | Layer management via CanvasComposer |

#### Tools

- **Select** — Move items, select connections
- **Connect** — Draw relationships between items
- **Pan** — Navigate the canvas
- **Note** — Add text annotations

#### De Facto Manifest

The spatial arrangement serializes as a IIIF Manifest with `navPlace` and annotation extensions.

---

### 6. Audio/Video Support

**File:** `services/avService.ts`

IIIF 3.0 time-based media handling.

#### Capabilities

```typescript
// Check if canvas has duration
const isAV = avService.isTimeBasedMedia(canvas);

// Get duration
const duration = avService.getDuration(canvas);

// Get placeholder thumbnail
const placeholder = avService.getPlaceholderCanvas(canvas);

// Get captions/transcripts
const accompanying = avService.getAccompanyingCanvas(canvas);
```

#### Time Modes

```typescript
type TimeMode = 'trim' | 'scale' | 'loop';

// Parse from behaviors
const config = parseTimeMode(canvas.behaviors);

// Apply to canvas
const effective = applyTimeMode(duration, config, canvasDuration);
```

#### Caption Sync Points

```typescript
const syncPoints = generateSyncPoints(annotations);
// Returns: [{ mainTime: 0.5, text: "Hello" }, ...]
```

---

### 7. Viewer Compatibility

**File:** `services/viewerCompatibility.ts`

Check IIIF items for compatibility with popular viewers.

```typescript
const report = checkCompatibility(item);
// Returns: compatibility flags for Mirador, UV, OpenSeadragon, etc.
```

---

### 8. IIIF Content State

**File:** `services/contentState.ts`

IIIF Content State API for viewport serialization.

```typescript
// Encode viewport state
const encoded = contentStateService.encode(viewportState);

// Decode from URL parameter
const state = contentStateService.decode(param);
```

Use cases:
- Deep linking to specific regions
- Sharing annotations
- Embedding viewers with preset views

---

## Derivative Presets

**Location:** [`constants.ts:582-702`](../../constants.ts:582)

Field Studio uses configurable derivative presets for image size generation, replacing hardcoded `[150, 600, 1200]` values throughout the codebase.

### Preset Interface

```typescript
interface DerivativePreset {
  name: string;
  label: string;
  description: string;
  thumbnailWidth: number;
  sizes: number[];
  fullWidth: number;
  tileSize: number;
  scaleFactors: number[];
}
```

### Available Presets

| Preset | Label | Best For |
|--------|-------|----------|
| `wax-compatible` | WAX Compatible | Jekyll/WAX static sites |
| `level0-static` | Level 0 Static | Serverless/static hosting (default) |
| `level2-dynamic` | Level 2 Dynamic | Dynamic image servers |
| `mobile-optimized` | Mobile Optimized | Bandwidth-constrained environments |
| `archive-quality` | Archive Quality | Preservation and print |

### Preset Configurations

```typescript
const DERIVATIVE_PRESETS: Record<string, DerivativePreset> = {
  'wax-compatible': {
    name: 'wax-compatible',
    label: 'WAX Compatible',
    description: 'Matches minicomp/wax defaults for static Jekyll sites',
    thumbnailWidth: 250,
    sizes: [250, 1140],
    fullWidth: 1140,
    tileSize: 256,
    scaleFactors: [1, 2, 4, 8]
  },

  'level0-static': {
    name: 'level0-static',
    label: 'Level 0 Static',
    description: 'Pre-generated sizes for static/serverless hosting (default)',
    thumbnailWidth: 150,
    sizes: [150, 600, 1200],
    fullWidth: 1200,
    tileSize: 512,
    scaleFactors: [1, 2, 4, 8]
  },

  'level2-dynamic': {
    name: 'level2-dynamic',
    label: 'Level 2 Dynamic',
    description: 'Minimal derivatives for Level 2 image server deployment',
    thumbnailWidth: 150,
    sizes: [150],
    fullWidth: 0,  // Server generates on demand
    tileSize: 512,
    scaleFactors: [1, 2, 4, 8, 16]
  },

  'mobile-optimized': {
    name: 'mobile-optimized',
    label: 'Mobile Optimized',
    description: 'Smaller derivatives optimized for mobile viewing',
    thumbnailWidth: 100,
    sizes: [100, 400, 800],
    fullWidth: 800,
    tileSize: 256,
    scaleFactors: [1, 2, 4]
  },

  'archive-quality': {
    name: 'archive-quality',
    label: 'Archive Quality',
    description: 'Larger derivatives for archival and print use',
    thumbnailWidth: 250,
    sizes: [250, 800, 1600, 3200],
    fullWidth: 3200,
    tileSize: 512,
    scaleFactors: [1, 2, 4, 8, 16]
  }
};
```

### Usage

```typescript
import { getDerivativePreset, DEFAULT_DERIVATIVE_PRESET } from './constants';

// Get default preset
const preset = getDerivativePreset();
// Returns: level0-static preset

// Get specific preset
const waxPreset = getDerivativePreset('wax-compatible');

// Use in export
const sizes = preset.sizes;           // [150, 600, 1200]
const thumbnail = preset.thumbnailWidth; // 150
const tileSize = preset.tileSize;     // 512
```

### Export Options Integration

```typescript
interface ExportOptions {
  format: 'standard' | 'canopy' | 'wax';
  imageApiOptions?: {
    derivativePreset?: string;  // Name of preset to use
    generateTiles?: boolean;
    tileSize?: number;
  };
}

// Example: WAX export with wax-compatible preset
const options: ExportOptions = {
  format: 'wax',
  imageApiOptions: {
    derivativePreset: 'wax-compatible',
    generateTiles: true
  }
};
```

### Backward Compatibility

For existing code using deprecated constants:

```typescript
// Old (deprecated)
import { DEFAULT_DERIVATIVE_SIZES } from './constants';
const sizes = DEFAULT_DERIVATIVE_SIZES; // [150, 600, 1200]

// New
import { getDerivativePreset } from './constants';
const preset = getDerivativePreset('level0-static');
const sizes = preset.sizes; // [150, 600, 1200]
```

See [Deprecated.md](./Deprecated.md) for full migration guide.
