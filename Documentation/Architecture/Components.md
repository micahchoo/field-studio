# Field Studio: Component Catalog

Complete catalog of all React components in the application, including documented and undocumented components.

---

## Component Architecture Overview

Field Studio uses a hierarchical component structure with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            App.tsx                                      │
│                    (Root application component)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Sidebar    │  │   Workspace  │  │   Inspector  │                  │
│  │  Navigation  │  │  Main Views  │  │  Properties  │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                           │                                             │
│           ┌───────────────┼───────────────┐                            │
│           ▼               ▼               ▼                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                       │
│  │ViewRouter  │  │StagingArea │  │  BoardView │                       │
│  │(View Mode) │  │(Ingest)    │  │(Spatial)   │                       │
│  └────────────┘  └────────────┘  └────────────┘                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Documented Components (18)

### View Components

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| `ArchiveView` | `views/ArchiveView.tsx` | Hierarchical tree navigation | 40KB |
| `BoardView` | `views/BoardView.tsx` | Spatial canvas arrangement | 62KB |
| `CollectionsView` | `views/CollectionsView.tsx` | Collection management | 27KB |
| `MetadataSpreadsheet` | `views/MetadataSpreadsheet.tsx` | Table metadata editing | 30KB |
| `Viewer` | `views/Viewer.tsx` | Deep-zoom image viewer | 29KB |
| `SearchView` | `views/SearchView.tsx` | Full-text search | 12KB |

### Editor Components

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| `Inspector` | `Inspector.tsx` | Property editor panel | 41KB |
| `MetadataEditor` | `MetadataEditor.tsx` | Language-aware metadata | 22KB |
| `CanvasComposer` | `CanvasComposer.tsx` | Image layer composition | 29KB |
| `QCDashboard` | `QCDashboard.tsx` | Validation and healing | 25KB |
| `ImageRequestWorkbench` | `ImageRequestWorkbench.tsx` | IIIF Image API request builder | ~25KB |

### Staging Components

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| `StagingWorkbench` | `staging/StagingWorkbench.tsx` | Two-pane ingest container | ~15KB |
| `SourcePane` | `staging/SourcePane.tsx` | Uploaded manifests display | ~10KB |
| `ArchivePane` | `staging/ArchivePane.tsx` | Organization workspace | ~10KB |
| `CollectionCard` | `staging/CollectionCard.tsx` | Collection display card | ~5KB |

### System Components

| Component | File | Purpose | Lines |
|-----------|------|---------|-------|
| `ViewRouter` | `ViewRouter.tsx` | Mode-based view switching | ~3KB |
| `Workspace` | `Workspace.tsx` | Main layout container | ~8KB |
| `Sidebar` | `Sidebar.tsx` | Navigation sidebar (resizable) | ~10KB |
| `ResizablePanel` | `ResizablePanel.tsx` | Resizable panel wrapper | ~16KB |

---

### Layout Components

#### `ResizablePanel.tsx`

Consistent resizable panel system for Sidebar, Inspector, and split panes.

```typescript
// ResizablePanel - Wrapper component with integrated resize handle
interface ResizablePanelProps {
  config: Omit<ResizablePanelConfig, 'onCollapse' | 'onExpand'>;
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  showCollapseButton?: boolean;
  collapseButtonContent?: React.ReactNode;
  fieldMode?: boolean;
  'aria-label'?: string;
}

// ResizeHandle - Styled drag handle with visual feedback
interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  side: 'left' | 'right' | 'top' | 'bottom';
  isResizing: boolean;
  fieldMode?: boolean;
  handleProps: ReturnType<typeof useResizablePanel>['handleProps'];
}

// SplitPane - Two-pane split layout with resizable divider
interface SplitPaneProps {
  id: string;
  direction: 'horizontal' | 'vertical';
  primary: React.ReactNode;
  secondary: React.ReactNode;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  className?: string;
  fieldMode?: boolean;
  collapsible?: boolean;
  collapseThreshold?: number;
}
```

**Features:**
- Drag handle with visual feedback (blue/yellow for field mode)
- Keyboard accessible (Arrow keys, Home/End)
- Touch friendly with expanded hit areas
- Collapse/expand support with smooth transitions
- Persistence to localStorage
- Consistent styling across light/dark/field modes

**Exported Components:**
| Component | Purpose |
|-----------|---------|
| `ResizablePanel` | High-level panel wrapper with handle |
| `ResizeHandle` | Standalone resize handle |
| `SplitPane` | Two-pane split layout |
| `PANEL_DEFAULTS` | Default configurations |

**Usage:**
```tsx
import { ResizablePanel, SplitPane, PANEL_DEFAULTS } from './components/ResizablePanel';

// Resizable sidebar
<ResizablePanel
  config={PANEL_DEFAULTS.sidebar}
  fieldMode={settings.fieldMode}
  visible={sidebarVisible}
  onVisibilityChange={setSidebarVisible}
>
  <SidebarContent />
</ResizablePanel>

// Split pane layout
<SplitPane
  id="collections"
  direction="horizontal"
  primary={<TreeSidebar />}
  secondary={<MainContent />}
  defaultSize={280}
  minSize={200}
  maxSize={500}
/>
```

**Panel Default Configurations:**
| Panel | Default | Min | Max | Collapse |
|-------|---------|-----|-----|----------|
| Sidebar | 256px | 200px | 400px | 100px |
| Inspector | 320px | 280px | 480px | 200px |
| Collections Tree | 280px | 200px | 500px | 100px |

---

## Undocumented Components (6+)

### Board View Components

#### `BoardDesignPanel.tsx`

Visual styling panel for Board view items.

```typescript
interface BoardDesignPanelProps {
  item: BoardItem;
  onUpdate: (updates: Partial<BoardItem>) => void;
  settings: AppSettings;
}
```

**Features:**
- Background color picker
- Border style configuration
- Shadow/elevation controls
- Typography settings
- Preset templates

**Usage:**
```tsx
<BoardDesignPanel 
  item={activeItem}
  onUpdate={handleItemUpdate}
  settings={appSettings}
/>
```

---

#### `BoardExportDialog.tsx`

Board-specific export dialog with advanced options.

```typescript
interface BoardExportDialogProps {
  board: BoardState;
  onExport: (options: BoardExportOptions) => void;
  onClose: () => void;
}

interface BoardExportOptions {
  format: 'manifest' | 'image' | 'pdf';
  includeAnnotations: boolean;
  includeConnections: boolean;
  quality: 'draft' | 'standard' | 'high';
  dimensions?: { width: number; height: number };
}
```

**Features:**
- Export as IIIF Manifest (default)
- Export as static image
- Export as PDF
- Annotation inclusion toggle
- Connection/relationship inclusion
- Quality presets

---

#### `ItemDetailModal.tsx`

Extended metadata modal for board items.

```typescript
interface ItemDetailModalProps {
  item: BoardItem;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (item: BoardItem) => void;
}
```

**Features:**
- Full IIIF property display
- Metadata editing
- Thumbnail gallery
- Related items
- Provenance history
- IIIF JSON preview

---

#### `ItemPreviewPanel.tsx`

Thumbnail preview panel for selected board items.

```typescript
interface ItemPreviewPanelProps {
  item: BoardItem;
  onExpand?: (item: BoardItem) => void;
  fieldMode?: boolean;
}
```

**Features:**
- Large thumbnail display
- Quick metadata summary
- Expand to full modal
- Field mode optimized view

---

### Utility Components

#### `ShareButton.tsx`

IIIF resource sharing with multiple formats.

```typescript
interface ShareButtonProps {
  resource: IIIFItem;
  formats?: Array<'link' | 'embed' | 'iiif' | 'json'>;
  onShare?: (format: string, data: string) => void;
}
```

**Features:**
- Copyable permanent link
- Embed code generation
- IIIF Drag-and-drop manifest
- Raw JSON export
- QR code generation

**Usage:**
```tsx
<ShareButton 
  resource={manifest}
  formats={['link', 'embed', 'iiif']}
/>
```

---

#### `PolygonAnnotationTool.tsx`

Drawing tool for polygon/freehand annotations.

```typescript
interface PolygonAnnotationToolProps {
  canvas: IIIFCanvas;
  imageUrl: string;
  onCreateAnnotation: (annotation: IIIFAnnotation) => void;
  existingAnnotations?: IIIFAnnotation[];
  onClose: () => void;
}
```

**Features:**
- Polygon drawing mode
- Freehand drawing mode
- Rectangle selection
- Point/vertex editing
- SVG path generation
- IIIF Annotation output

**Annotation Types:**
| Tool | Output | Use Case |
|------|--------|----------|
| Polygon | SVG path | Irregular regions |
| Rectangle | xywh selector | Standard crops |
| Freehand | SVG path | Complex shapes |
| Point | Single coordinate | Location markers |

---

## Undocumented Views

### `MapView.tsx`

Geographic visualization using IIIF `navPlace` extension.

```typescript
interface MapViewProps {
  root: IIIFItem | null;
  settings: AppSettings;
}
```

**Features:**
- Interactive map display
- Item clustering by location
- navPlace coordinate parsing
- GeoJSON feature display
- Popup annotations
- Filter by geographic bounds

**Dependencies:**
- Leaflet or MapLibre GL
- `services/navPlaceService.ts`

---

### `TimelineView.tsx`

Temporal visualization using IIIF `navDate` property.

```typescript
interface TimelineViewProps {
  root: IIIFItem | null;
  settings: AppSettings;
  granularity?: 'year' | 'month' | 'day';
}
```

**Features:**
- Chronological item display
- navDate parsing
- Zoomable timeline
- Date range filtering
- Group by time period
- Event density visualization

**Dependencies:**
- D3.js or vis-timeline
- `services/vault.ts` for date extraction

---

## Component Hierarchy Diagram

```
App
├── Sidebar
│   ├── Navigation
│   └── QuickActions
├── Workspace
│   └── ViewRouter (mode-based)
│       ├── ArchiveView
│       │   └── ManifestTree
│       ├── CollectionsView
│       │   └── CollectionGrid
│       ├── BoardView
│       │   ├── BoardDesignPanel
│       │   ├── BoardExportDialog
│       │   ├── ItemDetailModal
│       │   ├── ItemPreviewPanel
│       │   └── PolygonAnnotationTool
│       ├── SearchView
│       │   └── SearchPanel
│       ├── Viewer
│       │   └── ViewportControls
│       ├── MetadataSpreadsheet
│       ├── MapView (undocumented)
│       └── TimelineView (undocumented)
├── Inspector
│   ├── MetadataEditor
│   └── ValidationPanel
└── StagingArea / StagingWorkbench
    ├── SourcePane
    │   └── SourceManifestItem
    ├── ArchivePane
    │   └── CollectionCard
    └── SendToCollectionModal
```

---

## Component Size Summary

| Category | Components | Total Size | Avg Size |
|----------|-----------|------------|----------|
| Views | 8 | ~200KB | ~25KB |
| Editors | 5 | ~140KB | ~28KB |
| Staging | 4 | ~40KB | ~10KB |
| System | 4 | ~21KB | ~5KB |
| Undocumented | 8+ | ~80KB+ | ~10KB |
| **Total** | **29+** | **~480KB+** | **~17KB** |

---

## Import Patterns

### Barrel Exports (Recommended)

```typescript
// From hooks/index.ts
import { useURLState, useResponsive, useViewport } from './hooks';

// From services/index.ts
import { exportService, vault, validator } from './services';
```

### Direct Imports

```typescript
// Component imports
import { BoardView } from './components/views/BoardView';
import { Inspector } from './components/Inspector';

// Hook imports
import { useURLState } from './hooks/useURLState';

// Service imports
import { exportService } from './services/exportService';
```

---

## Component Naming Conventions

| Pattern | Usage | Example |
|---------|-------|---------|
| PascalCase | Component names | `BoardView`, `Inspector` |
| camelCase | Hook names | `useURLState`, `useResponsive` |
| camelCase | Props interfaces | `BoardViewProps`, `InspectorProps` |
| Suffix `Props` | Props type definitions | `interface ButtonProps` |
| Suffix `Return` | Hook return types | `interface UseURLStateReturn` |

---

## Related Documentation

- [Services.md](./Services.md) - Service layer documentation
- [Hooks.md](./Hooks.md) - Custom hooks documentation
- [UX.md](./UX.md) - User experience patterns
- [Underneath.md](./Underneath.md) - Technical architecture
