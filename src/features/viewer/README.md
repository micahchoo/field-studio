# Viewer Feature (`src/features/viewer/`)

IIIF canvas viewer with OpenSeadragon deep zoom, annotations, and media playback.

## Architecture

This feature follows Atomic Design + Feature-Sliced Design principles:

```
src/features/viewer/
├── ui/
│   ├── organisms/
│   │   ├── ViewerView.tsx           ← Main viewer organism
│   │   ├── CanvasComposerPanel.tsx  ← Canvas composition panel
│   │   └── AnnotationToolPanel.tsx  ← Annotation editing panel
│   └── molecules/
│       ├── index.ts                 ← Barrel export
│       ├── ComposerToolbar.tsx      ← Composer toolbar
│       ├── ComposerSidebar.tsx      ← Composer sidebar
│       ├── ComposerCanvas.tsx       ← Composer canvas area
│       └── AnnotationToolbar.tsx    ← Annotation tools toolbar
├── model/
│   ├── index.ts                     ← useViewer hook
│   ├── composer.ts                  ← Composer state
│   └── annotation.ts                ← Annotation state
├── index.ts                         ← Public API
└── README.md                        ← This file
```

## Organism: ViewerView

The ViewerView organism receives context via props from FieldModeTemplate:

```typescript
<FieldModeTemplate>
  {({ cx, fieldMode, t, isAdvanced }) => (
    <ViewerView
      item={canvas}
      manifest={manifest}
      manifestItems={canvases}
      onUpdate={handleUpdate}
      cx={cx}
      fieldMode={fieldMode}
      t={t}
      isAdvanced={isAdvanced}
    />
  )}
</FieldModeTemplate>
```

**Key Design Decisions:**
- No `useAppSettings()` or `useContextualStyles()` calls in organism
- `cx`, `fieldMode`, `t`, `isAdvanced` received via props from template
- All UI elements composed from molecules in `src/shared/ui/molecules/`
- OpenSeadragon lifecycle managed in `useViewer` hook

## Model: useViewer Hook

Encapsulates all viewer state and OSD integration:

```typescript
const {
  mediaType,
  annotations,
  zoomLevel,
  viewerRef,
  osdContainerRef,
  containerRef,
  zoomIn,
  zoomOut,
  resetView,
  rotateCW,
  rotateCCW,
  toggleFullscreen,
  toggleTranscriptionPanel,
  toggleSearchPanel,
  toggleMetadataPanel,
  selectAnnotation,
  addAnnotation,
  removeAnnotation,
  hasSearchService,
  canDownload,
  // ...more
} = useViewer(item, manifest, autoOpenComposer, onComposerOpened);
```

**Responsibilities:**
- OpenSeadragon initialization and cleanup
- Media type detection (image/video/audio)
- Annotation extraction from canvas
- Image URL resolution (blob, file ref, IIIF service)
- Zoom/rotation state management
- Panel visibility state
- Memory cleanup (object URLs, OSD instances)

## Media Types

```typescript
type MediaType = 'image' | 'video' | 'audio' | 'other';
```

The viewer automatically detects media type from canvas content and renders the appropriate player:
- **Image**: OpenSeadragon deep zoom viewer
- **Video**: HTML5 video player
- **Audio**: HTML5 audio player
- **Other**: Fallback display

## Composer Sub-Feature

The Canvas Composer allows creating multi-canvas compositions:

```typescript
const {
  layers,
  activeLayerId,
  composition,
  addLayer,
  removeLayer,
  reorderLayers,
  updateLayer,
  exportComposition,
} = useComposer();
```

Components:
- `ComposerToolbar`: Layer management tools
- `ComposerSidebar`: Layer list and properties
- `ComposerCanvas`: Composition canvas area

## Annotation Sub-Feature

Annotation tools for marking up canvas content:

```typescript
const {
  mode,
  points,
  currentAnnotation,
  setMode,
  addPoint,
  undo,
  clear,
  save,
  pointsToSvgPath,
} = useAnnotation();
```

Drawing modes:
- `rectangle`: Rectangular regions
- `polygon`: Freehand polygons
- `circle`: Circular regions
- `point`: Single point markers

## Molecules Used

| Molecule | Purpose |
|----------|---------|
| `ZoomControl` | Zoom in/out/reset buttons |
| `PageCounter` | "Canvas X of Y" display |
| `EmptyState` | Empty states (no selection, unsupported) |
| `LoadingState` | Loading indicators |

## Public API

```typescript
// Main Component
export { ViewerView } from './ui/organisms/ViewerView';
export type { ViewerViewProps } from './ui/organisms/ViewerView';

// Composer Components
export {
  ComposerToolbar,
  ComposerSidebar,
  ComposerCanvas,
  type ComposerToolbarProps,
  type ComposerSidebarProps,
  type ComposerCanvasProps,
} from './ui/molecules';

export { CanvasComposerPanel } from './ui/organisms/CanvasComposerPanel';
export type { CanvasComposerPanelProps } from './ui/organisms/CanvasComposerPanel';

// Model
export {
  useViewer,
  type MediaType,
  type ViewerState,
  type UseViewerReturn,
} from './model';

export {
  useComposer,
  type UseComposerReturn,
} from './model';

export {
  useAnnotation,
  pointsToSvgPath,
  createSvgSelector,
  parseSvgSelector,
  getBoundingBox,
  simplifyPath,
  type DrawingMode,
  type UseAnnotationReturn,
} from './model';
```

## Usage

```typescript
import { ViewerView } from '@/src/features/viewer';

<FieldModeTemplate>
  {({ cx, fieldMode, t, isAdvanced }) => (
    <ViewerView
      item={selectedCanvas}
      manifest={currentManifest}
      manifestItems={manifestCanvases}
      onUpdate={handleCanvasUpdate}
      cx={cx}
      fieldMode={fieldMode}
      t={t}
      isAdvanced={isAdvanced}
    />
  )}
</FieldModeTemplate>
```

## Performance Considerations

- OpenSeadragon instances are cleaned up on unmount
- Object URLs are revoked to prevent memory leaks
- Heavy components are lazy-loaded where possible
- Viewport state is memoized to prevent unnecessary re-renders

## Future Decomposition

The Viewer is the most complex feature. The following components should be
extracted to molecules/organisms in future iterations:

- **AnnotationCanvas** - The annotation drawing overlay
- **TranscriptionPanel** - OCR text display
- **SearchPanel** - Content search within canvas
- **MetadataPanel** - Canvas metadata display
- **Filmstrip** - Canvas navigation thumbnails
