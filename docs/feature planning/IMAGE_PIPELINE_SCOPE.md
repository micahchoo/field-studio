# Image Pipeline Scoping Document

## Current State Analysis

### Existing Architecture (Well-Designed)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CURRENT PIPELINE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐  │
│  │   File Upload   │────▶│  TileWorkerPool  │────▶│  IndexedDB Storage  │  │
│  │                 │     │  (Web Workers)   │     │  (files,derivatives)│  │
│  └─────────────────┘     └──────────────────┘     └─────────────────────┘  │
│            │                      │                          │             │
│            ▼                      ▼                          ▼             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    Service Worker (sw.js)                            │  │
│  │  ┌──────────────────────────────────────────────────────────────┐   │  │
│  │  │         Internal IIIF Image API 3.0 Server                    │   │  │
│  │  │  - info.json generation (Level 2 profile)                     │   │  │
│  │  │  - Tile caching                                               │   │  │
│  │  │  - Derivative serving (thumb/small/medium)                    │   │  │
│  │  │  - On-the-fly resizing via OffscreenCanvas                    │   │  │
│  │  └──────────────────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                     Viewer Components                                │  │
│  │  - OpenSeadragon (deep zoom)                                        │  │
│  │  - CanvasComposer (annotations)                                     │  │
│  │  - ImageRequestWorkbench (IIIF URL builder)                         │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### What's Working Well

| Component | Implementation | Assessment |
|-----------|---------------|------------|
| **Derivative Generation** | Web Workers + Canvas API | ✅ Good - Non-blocking, parallel processing |
| **IIIF API Service** | Service Worker interceptor | ✅ Excellent - Standards compliant |
| **Storage** | IndexedDB (idb library) | ✅ Good - Structured, versioned |
| **Resolution Strategy** | imageSourceResolver.ts | ✅ Excellent - Fallback chain design |

### Current Limitations

```typescript
// From services/tileWorker.ts - Current approach
// Uses browser Canvas API for resizing
const canvas = new OffscreenCanvas(targetWidth, targetHeight);
const ctx = canvas.getContext('2d');
ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
```

**Problems:**
1. **No true deep zoom tiles** - Only 3 derivatives (thumb, small, medium)
2. **Canvas API limitations** - No rotation, limited format support
3. **Memory intensive** - Full image loaded into Canvas for every resize
4. **No progressive JPEG** - Missing optimization for large images
5. **CPU-bound** - All processing on main thread or Web Workers

---

## Evaluation: Browser-Based Image Processing Libraries

### Option 1: **WASM-vips** (Recommended)

```
Library: wasm-vips (libvips compiled to WebAssembly)
Size: ~3MB (can be lazy-loaded)
Performance: Near-native speed
```

**Pros:**
- Full libvips feature set in browser
- DZI (Deep Zoom Image) generation
- Excellent format support (TIFF, JP2, WebP)
- Memory efficient (streaming processing)
- Battle-tested (Sharp.js uses libvips)

**Cons:**
- Large initial download
- Complex WASM loading
- Browser compatibility (SharedArrayBuffer requirements)

**Implementation:**
```typescript
// services/imagePipeline/wasmVipsAdapter.ts
import Vips from 'wasm-vips';

export class WasmVipsPipeline {
  private vips: any;
  
  async initialize() {
    this.vips = await Vips();
  }
  
  async generateDZI(
    imageBuffer: ArrayBuffer,
    options: {
      tileSize?: number;
      overlap?: number;
      format?: 'jpg' | 'png';
    } = {}
  ): Promise<{
    tiles: Map<string, ArrayBuffer>;
    dziDescriptor: DeepZoomDescriptor;
  }> {
    const image = this.vips.Image.newFromBuffer(imageBuffer);
    
    // Generate DZI tiles
    const tiles = new Map<string, ArrayBuffer>();
    const { width, height } = image;
    const levels = Math.ceil(Math.log2(Math.max(width, height)));
    
    for (let level = 0; level < levels; level++) {
      const scale = Math.pow(2, levels - level - 1);
      const levelWidth = Math.floor(width / scale);
      const levelHeight = Math.floor(height / scale);
      
      // Resize for this level
      const levelImage = image.resize(1 / scale);
      
      // Slice into tiles
      const tilesX = Math.ceil(levelWidth / 512);
      const tilesY = Math.ceil(levelHeight / 512);
      
      for (let y = 0; y < tilesY; y++) {
        for (let x = 0; x < tilesX; x++) {
          const tile = levelImage.crop(
            x * 512, y * 512, 512, 512
          );
          const tileBuffer = tile.writeToBuffer('.jpg');
          tiles.set(`${level}/${x}_${y}.jpg`, tileBuffer);
        }
      }
    }
    
    return {
      tiles,
      dziDescriptor: {
        width,
        height,
        tileSize: 512,
        overlap: 0,
        format: 'jpg'
      }
    };
  }
}
```

---

### Option 2: **ImageScript** (Lightweight Alternative)

```
Library: ImageScript (pure JS + WASM for decoding)
Size: ~500KB
Performance: Good for moderate sizes
```

**Pros:**
- Smaller bundle than wasm-vips
- Pure JavaScript with WASM decoders
- Good for thumbnails and simple operations

**Cons:**
- No built-in DZI generation
- Limited to basic operations
- Not as mature as libvips

**When to use:** If bundle size is critical and you only need derivative generation (not deep zoom)

---

### Option 3: **Canvas API + Custom Tiling** (Current, Improved)

Keep current architecture but enhance:

```typescript
// services/tileWorker.ts - Enhanced version
export interface TileGenerationOptions {
  // Current: just derivatives
  derivatives: boolean;
  
  // New: IIIF-compliant tile pyramid
  generateTiles: boolean;
  tileSize: number;
  maxLevel: number;
  
  // New: Progressive loading
  progressiveJPEG: boolean;
}

// Generate proper IIIF tile structure
async function generateIIIFTiles(
  bitmap: ImageBitmap,
  options: TileGenerationOptions
): Promise<Map<string, Blob>> {
  const tiles = new Map<string, Blob>();
  const { width, height } = bitmap;
  
  // Calculate levels (like DZI)
  const maxDimension = Math.max(width, height);
  const levels = Math.ceil(Math.log2(maxDimension / options.tileSize)) + 1;
  
  for (let level = 0; level < levels; level++) {
    const scale = Math.pow(2, levels - level - 1);
    const levelWidth = Math.floor(width / scale);
    const levelHeight = Math.floor(height / scale);
    
    // Create scaled version for this level
    const levelCanvas = new OffscreenCanvas(levelWidth, levelHeight);
    const ctx = levelCanvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, levelWidth, levelHeight);
    
    // Slice into tiles
    const tilesX = Math.ceil(levelWidth / options.tileSize);
    const tilesY = Math.ceil(levelHeight / options.tileSize);
    
    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const tileCanvas = new OffscreenCanvas(
          options.tileSize, 
          options.tileSize
        );
        const tileCtx = tileCanvas.getContext('2d');
        
        // Extract tile from level canvas
        tileCtx.drawImage(
          levelCanvas,
          tx * options.tileSize, ty * options.tileSize,
          options.tileSize, options.tileSize,
          0, 0,
          options.tileSize, options.tileSize
        );
        
        const blob = await tileCanvas.convertToBlob({
          type: 'image/jpeg',
          quality: 0.85
        });
        
        // IIIF-style path: {level}/{x}_{y}.jpg
        tiles.set(`${level}/${tx}_${ty}.jpg`, blob);
      }
    }
  }
  
  return tiles;
}
```

**Pros:**
- No new dependencies
- Works in all browsers
- Can achieve IIIF-compliant tiling

**Cons:**
- Memory intensive (multiple canvas copies)
- No rotation/quality features
- Slower than WASM solutions

---

## Recommended Implementation Roadmap

### Phase 1: Enhanced Canvas-Based Tiling (2-3 weeks)

**Goal**: Extend current pipeline to support proper IIIF deep zoom

**Changes:**
1. Extend `TileWorkerPool` to generate tile pyramids
2. Modify `sw.js` to serve tiles from new structure
3. Update `imageSourceResolver.ts` for tile URLs

**Storage Schema:**
```typescript
// IndexedDB structure
interface TileStorage {
  // Current (keep)
  files: { key: string; value: Blob };           // Original files
  derivatives: { key: string; value: Blob };     // thumb, small, medium
  
  // New
  tiles: { 
    key: string;  // {assetId}/{level}/{x}_{y}.jpg
    value: Blob;
  };
  tileManifests: {
    key: string;  // {assetId}_manifest
    value: {
      levels: number;
      tileSize: number;
      width: number;
      height: number;
      format: string;
    };
  };
}
```

**Code Changes:**
```typescript
// services/tileWorker.ts
export async function generateTilePyramid(
  assetId: string,
  file: Blob,
  options: {
    tileSize?: number;
    maxTiles?: number;  // Limit for memory management
  } = {}
): Promise<TilePyramidResult> {
  const { tileSize = 512, maxTiles = 10000 } = options;
  
  // Memory-conscious processing
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  
  // Calculate if we can fit in memory
  const estimatedTiles = estimateTileCount(width, height, tileSize);
  if (estimatedTiles > maxTiles) {
    // Fall back to derivative-only mode
    return generateDerivativesOnly(assetId, file);
  }
  
  // Generate full pyramid
  return generateFullPyramid(bitmap, tileSize);
}
```

---

### Phase 2: WASM-vips Integration (3-4 weeks)

**Goal**: Add professional-grade image processing

**Architecture:**
```typescript
// services/imagePipeline/index.ts
export interface ImagePipeline {
  // Phase 1 features (Canvas-based)
  generateDerivatives: (file: Blob) => Promise<Derivatives>;
  generateTiles: (file: Blob) => Promise<TilePyramid>;
  
  // Phase 2 features (WASM-vips)
  convertFormat: (file: Blob, format: string) => Promise<Blob>;
  applyRotation: (file: Blob, degrees: number) => Promise<Blob>;
  generateDZI: (file: Blob) => Promise<DZIResult>;
  extractRegion: (file: Blob, region: Region) => Promise<Blob>;
}

// Lazy-load WASM-vips only when needed
async function getVipsPipeline(): Promise<ImagePipeline> {
  const { WasmVipsPipeline } = await import('./wasmVipsAdapter');
  return new WasmVipsPipeline();
}
```

**Lazy Loading Strategy:**
```typescript
// components/ImageProcessingSettings.tsx
export function ImageProcessingSettings() {
  const [vipsAvailable, setVipsAvailable] = useState(false);
  
  useEffect(() => {
    // Check if we can load WASM-vips
    import('wasm-vips')
      .then(() => setVipsAvailable(true))
      .catch(() => setVipsAvailable(false));
  }, []);
  
  return (
    <div>
      <h3>Image Processing</h3>
      {vipsAvailable ? (
        <AdvancedProcessingOptions />
      ) : (
        <BasicProcessingOptions />
      )}
    </div>
  );
}
```

---

### Phase 3: IIIF Host Server Compatibility (Optional)

**Goal**: Export archives compatible with external IIIF servers

```typescript
// services/export/iiifServerFormat.ts
export async function exportForIIIFServer(
  archive: IIIFItem,
  options: {
    format: 'cantaloupe' | 'iiif-host' | 'static';
    includeTiles: boolean;
  }
): Promise<Blob> {
  // Generate server-compatible structure
  // - Cantaloupe: info.json + tiled TIFF
  // - iiif-host: Pre-generated tiles + manifests
  // - static: Flat files + modified manifests
}
```

---

## Decision Matrix

| Requirement | Canvas API | ImageScript | WASM-vips |
|------------|------------|-------------|-----------|
| Bundle Size | ✅ Built-in | ⚠️ ~500KB | ❌ ~3MB |
| Deep Zoom | ⚠️ Manual | ❌ No | ✅ Native |
| Rotation | ❌ No | ⚠️ Basic | ✅ Yes |
| Format Support | ❌ Limited | ⚠️ Moderate | ✅ Excellent |
| Speed | ⚠️ Slow | ⚠️ Moderate | ✅ Fast |
| Memory Efficiency | ❌ Poor | ⚠️ Moderate | ✅ Good |
| Browser Support | ✅ Universal | ✅ Universal | ⚠️ Modern only |

---

## Recommendation

### For Field Studio v1 (Current Scope)

**Stick with Canvas API** but enhance it:

1. **Implement proper tile pyramids** using Canvas API
2. **Add memory management** (limit concurrent processing)
3. **Progressive enhancement** - detect capabilities

```typescript
// constants.ts - Add image processing config
export const IMAGE_PIPELINE_CONFIG = {
  // Tile generation
  TILE_SIZE: 512,
  MAX_TILES_PER_IMAGE: 10000,
  
  // Derivative sizes
  DERIVATIVE_SIZES: {
    thumb: 150,
    small: 600,
    medium: 1200,
    large: 2000,  // New
  },
  
  // Memory limits
  MAX_CONCURRENT_PROCESSING: 4,
  MAX_MEMORY_USAGE_MB: 512,
  
  // WASM-vips (future)
  ENABLE_WASM_VIPS: false,  // Feature flag
};
```

### For Field Studio v2 (Future)

**Add WASM-vips as optional enhancement:**

```typescript
// Feature detection and progressive enhancement
const pipeline = await detectOptimalPipeline();
// Returns: CanvasPipeline | WasmVipsPipeline

switch (pipeline.type) {
  case 'wasm-vips':
    // Full features: DZI, rotation, format conversion
    break;
  case 'canvas':
    // Basic features: derivatives, simple tiles
    break;
}
```

---

## Migration Path

```
Current ──▶ Enhanced Canvas ──▶ WASM-vips (optional)
   │              │                    │
   │              │                    │
   ▼              ▼                    ▼
Derivatives   Tile Pyramid        Full IIIF Server
(thumb/med)   (Deep zoom)         (Rotation, formats)
```

### No Breaking Changes
- Keep existing derivative generation
- Add tile generation as new feature
- WASM-vips as opt-in enhancement

---

## Open Questions

1. **Maximum image size?** What dimensions do field researchers typically use?
2. **Format requirements?** Are TIFF/JP2 sources common?
3. **Server export?** Do users need Cantaloupe/iiif-host compatible exports?
4. **Rotation needs?** Is on-the-fly rotation important for field archives?

---

## Files to Modify

| File | Changes |
|------|---------|
| `services/tileWorker.ts` | Add tile pyramid generation |
| `public/sw.js` | Serve tiles from new structure |
| `services/storage.ts` | Add tiles store |
| `constants.ts` | Add IMAGE_PIPELINE_CONFIG |
| `services/imageSourceResolver.ts` | Support tile URLs |
| `components/Viewer.tsx` | Use tiles for deep zoom |

## New Files

```
services/imagePipeline/
├── index.ts              # Pipeline interface
├── canvasPipeline.ts     # Canvas-based implementation
├── wasmVipsAdapter.ts    # WASM-vips wrapper (future)
├── memoryManager.ts      # Memory budget tracking
└── tileCalculator.ts     # Tile math utilities
```
