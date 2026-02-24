# Using Field Studio

_A quick reference for everything you can do in the app._

---

## What is this?

Field Studio turns messy field data — photos, recordings, notes — into structured, standards-compliant archives. Everything stays in your browser. Nothing is uploaded to a server.

---

## The 7 Views

Switch views with the sidebar icons or keyboard shortcuts.

### 1. Archive (Cmd+1)

Your main library. Shows all items as a grid or list.

- **Select** an item to open it in the viewer panel on the right
- **Drag** items to reorder them within a manifest
- **Multi-select** with Shift+click or Cmd+click for batch operations
- **Right-click** any item for a context menu (rename, delete, move, duplicate)
- Validation badges show which items need attention

### 2. Viewer (Cmd+5)

Full-screen media viewer for close inspection.

- **Images:** Deep zoom with mouse wheel or +/- keys. Pan by dragging. Rotate with R.
- **Audio/Video:** Playback controls, waveform display, time-based annotations
- **Filmstrip** at top shows all pages — click to navigate
- **Annotations:** Draw regions on images or mark time ranges on audio/video
- Flip horizontal (H) or vertical (V). Reset zoom with 0.

### 3. Boards (Cmd+2)

An infinite canvas for visual thinking.

- **Drag** items from the archive onto the board
- **Connect** items with typed relationship lines (depicts, transcribes, relates to, contradicts, precedes)
- **Add notes** as text cards
- **Pan** the canvas by holding Space and dragging
- **Zoom** with Cmd+Plus/Minus or mouse wheel
- **Presentation mode** for slideshow display
- Alignment guides snap items into position

### 4. Metadata (Cmd+3)

Spreadsheet-style editor for bulk metadata.

- Every row is an item (manifest, canvas, or collection)
- Columns are metadata fields — click a cell to edit inline
- **Filter** by item type using the dropdown
- **Export** the table to CSV
- Changes save automatically

### 5. Search (Cmd+4)

Full-text search across all labels, descriptions, annotations, and metadata.

- Type in the search bar — results appear as cards
- **Filter** by type: Manifest, Canvas, Annotation
- Click a result to jump to it in the Archive

### 6. Map

Geographic view for geotagged items.

- Items with location data appear as markers on the map
- **Clusters** group nearby items at low zoom levels
- Click a marker to jump to that item

### 7. Timeline

Chronological view for dated items.

- Items are grouped by date ranges (year, month, day)
- **Zoom** into time periods
- Navigate with the date-range minimap in the toolbar
- Click an item to open it

---

## Importing Media

### Drag and drop a folder

Drop a folder from your desktop onto the app window. Field Studio will:

1. Scan the folder structure
2. Show a staging preview with proposed manifests and collections
3. Let you adjust the organization before confirming
4. Import everything into your archive

### Use the file picker

Press **Cmd+Shift+I** or use the import menu to open a folder selection dialog.

### Import an external IIIF manifest

Press **Cmd+Shift+I** and paste a URL to a remote IIIF manifest or collection. The app will:

1. Fetch and validate the manifest
2. Show a preview card (thumbnail, title, type)
3. Add it to your archive on confirmation

Supports IIIF Presentation API 3.0 manifests and collections.

### Import metadata from CSV

In the Staging Workbench, you can map CSV columns to IIIF metadata fields for bulk import.

### Supported file types

| Type | Formats |
|------|---------|
| Images | JPEG, PNG, WebP, GIF, TIFF, BMP, SVG |
| Video | MP4, WebM, MOV, FLV |
| Audio | MP3, WAV, OGG, FLAC |
| Metadata | CSV |
| Manifests | IIIF JSON (v3.0) |

---

## Exporting

Press **Cmd+E** to open the export wizard. Five formats are available:

### Canopy IIIF Site

A ready-to-deploy static website with:
- Full-text search with facets
- Configurable theme (accent color, light/dark mode)
- Featured items showcase
- Landing page metadata

### Raw IIIF

Plain JSON manifests and collections, optionally with embedded media assets. Use this when you need clean IIIF 3.0 output for another system.

### OCFL Package

Oxford Common File Layout 1.1 — a versioned archival format with:
- Immutable object structure
- Configurable digest algorithm (SHA256 default)
- Organization and version metadata

### BagIt Bag

RFC 8493 archival container with:
- Checksummed payload verification
- Provenance metadata (user, organization, description)
- Portable, self-describing format

### Activity Log

IIIF Change Discovery API 1.0 — a chronological changelog of all changes, suitable for federation and discovery endpoints.

### Export steps

1. Choose format and general settings
2. Configure format-specific options (site theme, package metadata, etc.)
3. Dry-run integrity check — validation issues are shown before export
4. Generate and download

---

## Keyboard Shortcuts

Press **Cmd+?** at any time to see the full searchable shortcut overlay.

### Global (all views)

| Shortcut | Action |
|----------|--------|
| Cmd+K | Command Palette |
| Cmd+Z | Undo |
| Cmd+Shift+Z | Redo |
| Cmd+S | Save project |
| Cmd+E | Export archive |
| Cmd+, | Settings |
| Cmd+B | Toggle sidebar |
| Cmd+I | Toggle inspector |
| Cmd+F | Find in archive |
| Cmd+Shift+F | Toggle field mode |
| Cmd+Shift+I | Import external IIIF |
| Cmd+Q | Quality control dashboard |
| Cmd+? | Keyboard shortcuts |
| Escape | Clear selection |
| Delete | Delete selected |
| Cmd+D | Duplicate selected |
| Cmd+A | Select all |
| F11 | Toggle fullscreen |

### Archive

| Shortcut | Action |
|----------|--------|
| Cmd+Shift+N | New collection |
| Cmd+N | New manifest |
| Alt+Arrow Up/Down | Move item up/down |
| Alt+Arrow Right | Expand all |
| Alt+Arrow Left | Collapse all |

### Viewer

| Shortcut | Action |
|----------|--------|
| +/- | Zoom in/out |
| 0 | Reset zoom |
| Arrow keys | Pan |
| R | Rotate clockwise |
| Shift+R | Rotate counter-clockwise |
| H | Flip horizontal |
| V | Flip vertical |
| PageDown/PageUp | Next/previous canvas |
| Space | Play/pause media |
| M | Mute/unmute |

### Metadata

| Shortcut | Action |
|----------|--------|
| Tab / Shift+Tab | Next/previous field |
| Cmd+Shift+M | Add metadata field |
| Cmd+Delete | Remove metadata field |

---

## Undo and Redo

Every change is tracked. Press **Cmd+Z** to undo and **Cmd+Shift+Z** to redo.

- History holds up to 100 steps
- Rapid edits within 500ms are grouped into a single undo step
- Undo works for metadata edits, item moves, deletions, annotations, and most other actions

---

## Settings

Press **Cmd+,** to open settings.

| Setting | What it does |
|---------|-------------|
| Field Mode | High-contrast black and yellow UI for outdoor/accessibility use |
| Theme | Light, dark, or field mode |
| Abstraction Level | Standard (simplified) or Advanced (shows technical IDs, raw JSON) |

---

## Quality Control

Press **Cmd+Q** to open the QC Dashboard. It shows:

- Validation issues across your entire archive (missing labels, dimensions, rights, etc.)
- Issue severity: error, warning, info
- **Auto-heal** buttons that fix common issues automatically (missing labels from filenames, default dimensions, etc.)

---

## Staging Workbench

When you import a folder, the Staging Workbench opens as a three-pane dialog to guide you from raw files to organized archive.

### The three panes

**Left — Source Tree:**
Your uploaded files as a folder tree. Filter with the search bar at top. Right-click any folder to mark it as a Collection or Manifest.

**Center — Archive:**
Your target organization. Click "New Collection" to create containers, then drag manifests from the source tree into collections.

**Right — Preview:**
When you select a file, this pane shows a thumbnail, file type, size, and format. Collapse it if you don't need it.

### The workflow

1. **Import a folder** — the workbench analyzes your files automatically (progress: analyzing, detecting sequences, building manifests)
2. **Review the proposed structure** — the source tree shows what Field Studio thinks each folder should become
3. **Adjust** — right-click to override types, drag items between collections, create new collections
4. **Check for conflicts** — if duplicate manifests are detected, a red banner shows the conflicts with resolution options
5. **Ingest** — click to start processing. A progress bar tracks creation of manifests and canvases.
6. **Done** — a summary shows what was created (manifests, canvases, files processed). Click "Undo" if something went wrong.

After ingest, you can export a CSV template for bulk metadata entry.

---

## Board Connections

In the Boards view, you can draw connections between items to map relationships.

### Connection types

| Type | Meaning | Line style |
|------|---------|-----------|
| Sequence | Items appear in order | Solid with arrow |
| Reference | One item refers to another | Dashed with arrow |
| Supplement | One item adds context to another | Dotted |
| Custom | Any relationship you define | User-chosen color |

### How to create a connection

1. Switch to the **Connect tool** in the toolbar (or press the connect shortcut)
2. Click on the **source item** (the starting card)
3. Click on the **target item** — a line appears between them
4. The **connection edit panel** opens on the right side

### Editing connections

In the edit panel you can:

- **Change type** — dropdown: Sequence, Reference, Supplement, Custom
- **Add a label** — optional text describing the relationship
- **Pick a color** — choose the line color
- **Delete** — remove the connection

Select multiple connections with Shift+Click to batch-change type, color, or delete.

### Other board features

- **Grid snapping** — optional alignment grid
- **Alignment guides** — appear when dragging items near other items
- **Grouping** — select items, right-click "Group" to create a container
- **Presentation mode** — fullscreen slideshow through items

---

## Annotations

Field Studio supports drawing annotations on images and marking time ranges on audio/video.

### Annotating images

1. Open an image in the **Viewer** (Cmd+5)
2. Click the annotation tool in the toolbar
3. Choose a drawing tool:

| Tool | Shortcut | How to draw |
|------|----------|------------|
| Polygon | P | Click vertices, press Enter to close |
| Rectangle | R | Click and drag from corner to corner |
| Freehand | F | Click and drag to draw a path |
| Select | S | Click existing annotations to edit |

4. After drawing, the **annotation form** appears:
   - Choose a **motivation**: Comment, Tag, or Describe
   - Type your **annotation text**
   - Click **Save**

**Undo** removes the last vertex. **Clear** resets the drawing and text. Press **Escape** to cancel.

### Annotating audio and video

1. Open an audio or video file in the **Viewer**
2. Click the annotation tool
3. **Click on the timeline** to set the start time
4. **Click again** to set the end time — the selected range highlights
5. Fill in the annotation form (motivation + text) and **Save**

For audio files, annotations appear as colored regions on the waveform. You can:
- Adjust playback speed (0.5x, 1x, 1.5x, 2x)
- Click existing regions to select and edit them
- Use the transport controls (play/pause, volume, seek)

### Annotation motivations

| Motivation | When to use it |
|-----------|---------------|
| Comment | General feedback or discussion |
| Tag | Short labels or categories |
| Describe | Detailed information about the content |

Annotations are saved automatically to the archive in standard W3C format and included when you export.

---

## Where is my data?

Everything is stored in your browser's local storage (IndexedDB). No server, no cloud, no account required.

- **Save** happens automatically on every change
- **Export** (Cmd+E) to get your data out as files
- **Clearing browser data will delete your archive** — export first if you need a backup
