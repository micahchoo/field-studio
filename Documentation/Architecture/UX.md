# Field Studio: User Experience (UX)

The user experience of Field Studio is grounded in the metaphor of a physical **Workbench**, explicitly separating the "raw material" of field data from the "constructed" archival object. It prioritizes transparency in how digital requests are made and emphasizes spatial thinking.

---

## Design Philosophy: "Request, Don't Edit"

A key UX principle is exposing the mechanics of the IIIF Image API. Instead of "cropping" or "resizing" an image—which implies destructive editing of the source file—the interface visualizes the **Image Request**.

### Visual Formula

The UI displays the Image API URL being constructed in real-time:

```
/iiif/image/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
                           ▲        ▲       ▲          ▲         ▲
                           │        │       │          │         │
                    ┌──────┘  ┌─────┘ ┌─────┘    ┌─────┘   ┌─────┘
                    │         │       │          │         │
              Region Panel  Size   Rotation   Quality   Format
              (crop box)   Slider  Control    Toggle    Select
```

### Source vs. Output

Overlays clearly distinguish between:
- **Source Image** — The full, unaltered original (solid border)
- **Requested Output** — The derived view (dashed border, highlighted region)

### Parameter Visualization

Controls map directly to API parameters:

| Control | API Parameter | Visual Representation |
|---------|---------------|----------------------|
| Crop box | `region` | Draggable rectangle overlay |
| Size slider | `size` | Percentage indicator + pixel preview |
| Rotation dial | `rotation` | Circular control with snap points |
| Quality toggle | `quality` | Live preview (color/gray/bitonal) |
| Format select | `format` | Dropdown with size estimation |

---

## Core Workflows & Affordances

### 1. The Board (Spatial Thinking)

**Component:** `components/views/BoardView.tsx`

A spatial canvas that breaks free from linear file lists.

#### Features

| Feature | Description |
|---------|-------------|
| **Infinite Canvas** | Pan/zoom with configurable scale (0.1x–5x) |
| **Grid Snapping** | Optional 24px grid alignment |
| **Piles & Clusters** | Natural grouping like a physical research desk |
| **Visual Connections** | Typed relationships between items |

#### Tools

| Tool | Icon | Action |
|------|------|--------|
| Select | ↖ | Move items, select connections |
| Connect | ↗ | Draw relationships between items |
| Pan | ✋ | Navigate the canvas |
| Note | 📝 | Add text annotations |

#### Connection Types

| Type | Meaning | Visual |
|------|---------|--------|
| `depicts` | Image shows the subject | Solid line |
| `transcribes` | Text represents content | Dashed line |
| `relatesTo` | General association | Dotted line |
| `contradicts` | Conflicting information | Red line |
| `precedes` | Temporal ordering | Arrow |

#### De Facto Manifest

The spatial arrangement serializes as a IIIF Manifest, preserving intellectual context.

---

### 2. The Workbench (Request Composition)

**Component:** `components/ImageRequestWorkbench.tsx`

A dedicated view for fine-tuning IIIF Image API requests.

#### Principles

- **No "Save" Button** — Actions result in "Copy URI" or "Use Request"
- **Non-Destructive** — Original asset is never modified
- **Real-Time Feedback** — URI updates instantly on parameter change

#### Workflow

```
┌────────────────────────────────────────────────────────────────┐
│                    Image Request Workbench                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────┐    ┌─────────────────────┐           │
│  │                     │    │    Parameter Panel   │           │
│  │   Source Preview    │    ├─────────────────────┤           │
│  │   (with crop box)   │    │ Region: 100,200,... │           │
│  │                     │    │ Size:   800,        │           │
│  │                     │    │ Rotation: 0         │           │
│  └─────────────────────┘    │ Quality: default    │           │
│                              │ Format:  jpg        │           │
│  ┌─────────────────────┐    └─────────────────────┘           │
│  │   Output Preview    │                                      │
│  │   (derived view)    │    URI:                              │
│  │                     │    /iiif/image/abc/100,200,500,400/  │
│  └─────────────────────┘    800,/0/default.jpg                │
│                                                                │
│                    [ Copy URI ]  [ Use Request ]               │
└────────────────────────────────────────────────────────────────┘
```

---

### 3. State Awareness (Offline First)

The UI provides distinct visual states for resources to prevent data loss confusion.

#### Resource States

| State | Visual | Meaning |
|-------|--------|---------|
| **Cached** | Solid border | Content available offline |
| **Stub** | Dashed/dimmed | Metadata exists, content not downloaded |
| **Local-only** | Badge icon | Created in session, not yet exported |
| **Stale** | Warning icon | Local version differs from remote |
| **Conflict** | Error icon | Merge required |

#### Type Definition

```typescript
type ResourceState = 'cached' | 'stub' | 'local-only' | 'stale' | 'conflict';
```

#### Visual Indicators

```
┌───────────────┐  ┌ ─ ─ ─ ─ ─ ─ ┐  ┌───────────────┐
│               │                    │  ⚡ LOCAL     │
│   CACHED      │  │   STUB        │ │               │
│               │                    │   LOCAL-ONLY  │
└───────────────┘  └ ─ ─ ─ ─ ─ ─ ┘  └───────────────┘
  Solid border      Dashed border      Badge indicator
```

---

### 4. Navigation & Views

**Component:** `components/ViewRouter.tsx`

The interface switches between distinct modes of interaction.

#### View Modes

| Mode | Component | Purpose |
|------|-----------|---------|
| `archive` | `ArchiveView` | Hierarchical tree navigation |
| `collections` | `CollectionsView` | Collection management |
| `boards` | `BoardView` | Spatial arrangement |
| `search` | `SearchView` | Full-text search |
| `viewer` | `Viewer` | Deep-zoom image viewing |
| `metadata` | `MetadataSpreadsheet` | Bulk table editing |

#### App Mode Type

```typescript
type AppMode = 'archive' | 'collections' | 'boards' | 'search' | 'viewer' | 'metadata';
```

#### View-Specific Features

**Archive View:**
- Collapsible tree with drag-drop
- Multi-selection and batch operations
- Context menu for item management

**Collections View:**
- Non-hierarchical IIIF 3.0 collections
- Membership management
- Quick-add from search

**Metadata Spreadsheet:**
- Inline editing
- Language-aware columns
- CSV export/import
- Validation highlighting

**Search View:**
- Full-text search via Lunr.js
- Faceted filtering
- Result highlighting
- Quick navigation to items

---

### 5. The Inspector (Property Editing)

**Component:** `components/Inspector.tsx`

The main property editor for selected IIIF items.

#### Tabs

| Tab | Content |
|-----|---------|
| **Properties** | IIIF metadata fields |
| **Design** | Layout and styling (Board view) |
| **Validation** | Issues with heal buttons |

#### Features

- Language-aware metadata editing
- Inline validation with auto-heal UI
- Rights statement management
- Thumbnail preview
- Provenance history

---

### 6. Staging Workbench (Ingest)

**Directory:** `components/staging/`

A two-pane interface for organizing ingested content.

#### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                       Staging Workbench                         │
├──────────────────────────┬──────────────────────────────────────┤
│                          │                                      │
│      SOURCE PANE         │          ARCHIVE PANE                │
│                          │                                      │
│  ┌────────────────────┐  │  ┌────────────────────────────────┐ │
│  │ Uploaded Manifest 1 │  │  │        Collection A            │ │
│  │   • Canvas 1       │  │  │  ┌──────────┐ ┌──────────┐    │ │
│  │   • Canvas 2       │──┼──▶  │ Manifest │ │ Manifest │    │ │
│  │   • Canvas 3       │  │  │  └──────────┘ └──────────┘    │ │
│  └────────────────────┘  │  └────────────────────────────────┘ │
│                          │                                      │
│  ┌────────────────────┐  │  ┌────────────────────────────────┐ │
│  │ Uploaded Manifest 2 │  │  │        Collection B            │ │
│  │   • Canvas 1       │  │  │  ┌──────────┐                  │ │
│  │   • Canvas 2       │  │  │  │ Manifest │                  │ │
│  └────────────────────┘  │  │  └──────────┘                  │ │
│                          │  └────────────────────────────────┘ │
└──────────────────────────┴──────────────────────────────────────┘
```

#### Panes

| Pane | Purpose |
|------|---------|
| **Source** | Uploaded manifests and files |
| **Archive** | Organization workspace with collections |

#### Actions

- Drag from Source to Archive
- Create/rename/delete collections
- Move manifests between collections
- Export metadata template (CSV)

---

## Interaction Patterns

### Drag and Drop

Used extensively throughout the application:

| Context | Drag Source | Drop Target | Action |
|---------|-------------|-------------|--------|
| Ingest | Desktop files | Staging area | Import media |
| Board | Archive items | Canvas | Add to spatial layout |
| Staging | Source manifest | Collection | Organize |
| Archive | Tree item | Tree item | Reparent |

### Keyboard Shortcuts

**Global:**
| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Save/Export |
| `Ctrl+F` | Search |
| `Escape` | Cancel/Close |

**Archive View:**
| Shortcut | Action |
|----------|--------|
| `↑/↓` | Navigate items |
| `←/→` | Collapse/Expand |
| `Delete` | Delete item |
| `Enter` | Edit item |
| `Ctrl+D` | Duplicate |

**Board View:**
| Shortcut | Action |
|----------|--------|
| `Space` | Pan mode (hold) |
| `+/-` | Zoom in/out |
| `G` | Toggle grid |
| `C` | Connect mode |
| `N` | Add note |

### Contextual Help

**Component:** `components/ContextualHelp.tsx`

Inline guidance on IIIF concepts:

- Tooltips on technical terms
- "Learn more" links to IIIF documentation
- Concept explanations (Canvas vs. Image)
- Validation issue descriptions

---

## Abstraction Levels

The interface adapts to user expertise via `AppSettings.abstractionLevel`:

| Level | Exposed Features |
|-------|------------------|
| **Simple** | Basic metadata, hide technical IDs |
| **Standard** | Full metadata, behaviors, thumbnails |
| **Advanced** | Raw JSON, extensions, provenance |

```typescript
type AbstractionLevel = 'simple' | 'standard' | 'advanced';
```

---

## Visual Hierarchy System

**Location:** [`constants.ts:717-795`](../../constants.ts:717)

The Structure view uses a sophisticated visual hierarchy to emphasize the Manifest > Canvas > AnnotationPage relationship.

### Prominence Levels

```typescript
type VisualProminence = 'primary' | 'secondary' | 'tertiary' | 'reference' | 'minimal';
```

| Level | Description | Used By |
|-------|-------------|---------|
| **primary** | Most prominent, full card display | Manifest |
| **secondary** | Clear visual hierarchy | Canvas |
| **tertiary** | Subtle, badge-style | AnnotationPage, Range |
| **reference** | Container style, secondary info | Collection |
| **minimal** | Inline, lowest prominence | Annotation |

### Card Sizes

```typescript
type CardSize = 'large' | 'medium' | 'badge' | 'container' | 'inline';

const STRUCTURE_CARD_SIZES: Record<CardSize, { minWidth: number; aspectRatio: string }> = {
  large: { minWidth: 200, aspectRatio: '3/4' },
  medium: { minWidth: 150, aspectRatio: '1/1' },
  badge: { minWidth: 80, aspectRatio: '1/1' },
  container: { minWidth: 250, aspectRatio: 'auto' },
  inline: { minWidth: 0, aspectRatio: 'auto' }
};
```

### Per-Type Configuration

```typescript
const STRUCTURE_VISUAL_HIERARCHY: Record<string, VisualHierarchyConfig> = {
  Manifest: {
    prominence: 'primary',
    cardSize: 'large',
    showThumbnail: true,
    showChildCount: true
  },
  Canvas: {
    prominence: 'secondary',
    cardSize: 'medium',
    showThumbnail: true,
    showAnnotationCount: true
  },
  AnnotationPage: {
    prominence: 'tertiary',
    cardSize: 'badge',
    showThumbnail: false,
    showCount: true
  },
  Collection: {
    prominence: 'reference',
    cardSize: 'container',
    showThumbnail: true,
    showReferenceIndicator: true
  },
  Annotation: {
    prominence: 'minimal',
    cardSize: 'inline',
    showThumbnail: false
  },
  Range: {
    prominence: 'tertiary',
    cardSize: 'badge',
    showThumbnail: false,
    showChildCount: true
  }
};
```

**Helper Function:**
```typescript
import { getVisualHierarchy } from './constants';

const config = getVisualHierarchy('Canvas');
// Returns: { prominence: 'secondary', cardSize: 'medium', showThumbnail: true, ... }
```

---

## BoardView Advanced Features

**Component:** [`components/views/BoardView.tsx:23-68`](../../components/views/BoardView.tsx:23)

### Extended BoardItem Properties

The Board view supports advanced IIIF features beyond basic positioning:

```typescript
interface BoardItem {
  // Basic properties
  id: string;
  resourceId: string;
  x: number; y: number;
  w: number; h: number;
  resourceType: string;
  label: string;
  
  // Advanced features
  isMetadataNode?: boolean;      // Dynamic metadata linking nodes
  annotations?: IIIFAnnotation[]; // Drawing annotations
  layers?: any[];                 // Composed layers
  
  // Full IIIF properties
  metadata?: IIIFItem['metadata'];
  summary?: IIIFItem['summary'];
  requiredStatement?: IIIFItem['requiredStatement'];
  rights?: IIIFItem['rights'];
  provider?: IIIFItem['provider'];
  behavior?: IIIFItem['behavior'];
}
```

#### `isMetadataNode`

Dynamic metadata linking nodes enable non-linear relationships between items.

```typescript
// Metadata nodes appear with distinct styling
isMetadataNode: true
// Visual: Purple dashed border, tag icon
// Use case: Link items by shared metadata values
```

### Connection Advanced Features

```typescript
interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: ConnectionType;
  label?: string;
  fromAnchor?: AnchorSide;  // 'T' | 'R' | 'B' | 'L'
  toAnchor?: AnchorSide;
  
  // Advanced routing
  waypoints?: { x: number, y: number }[];
  style?: 'straight' | 'elbow' | 'curved';
  direction?: 'auto' | 'horizontal-first' | 'vertical-first';
  
  // IIIF annotation motivation mapping
  purpose?: string;
  displayMode?: 'none' | 'purpose-only' | 'full';
  
  // Full IIIF properties
  metadata?: IIIFItem['metadata'];
  summary?: IIIFItem['summary'];
  requiredStatement?: IIIFItem['requiredStatement'];
  rights?: IIIFItem['rights'];
}
```

#### Connection Routing Styles

| Style | Description | Visual |
|-------|-------------|--------|
| `straight` | Direct line between anchors | ──────── |
| `elbow` | Right-angle routing with midpoint | ─┐<br>&nbsp;&nbsp;&nbsp;└─ |
| `curved` | Bezier curve | ╭────╮ |

#### Waypoints

Waypoints enable custom connection routing:

```typescript
waypoints: [
  { x: 100, y: 200 },
  { x: 150, y: 200 }
]
```

- Maximum 5 waypoints per connection
- Draggable in edit mode
- Double-click to remove
- Hold Shift to snap to 90° angles

#### Direction Control

```typescript
direction: 'horizontal-first'  // Horizontal then vertical
direction: 'vertical-first'    // Vertical then horizontal
direction: 'auto'              // Based on relative positions
```

#### IIIF Purpose Mapping

Connections can represent IIIF annotation motivations:

```typescript
purpose: 'commenting'      // User comments
purpose: 'tagging'         // Keyword tags
purpose: 'linking'         // Generic relationships
purpose: 'identifying'     // Entity identification
```

Display modes control how purpose appears:
- `none` - Hidden
- `purpose-only` - Shows motivation only
- `full` - Shows both label and motivation

---

## Persona Settings

**Component:** `components/PersonaSettings.tsx`

User preferences that shape the interface:

| Setting | Effect |
|---------|--------|
| `fieldMode` | Simplified UI for fieldwork |
| `theme` | Light/dark mode |
| `language` | Interface language |
| `metadataComplexity` | Basic/standard/advanced metadata fields |
| `showTechnicalIds` | Show/hide internal identifiers |
| `autoSaveInterval` | Background save frequency |
