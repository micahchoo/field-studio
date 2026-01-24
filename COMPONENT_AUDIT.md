# Frontend Component Audit

This document provides a comprehensive audit of the major frontend components and screens in the Field Studio application. For each component, we analyze its current functionality, identify missing "obvious" features, propose improvements that can be achieved without significant new feature development, and assess the likelihood of bugs.

## 1. Global App Controller (`App.tsx`)

**Current Wiring:**
-   **Routing & State:** Manages high-level view modes (`archive`, `collections`, `metadata`, `search`, `viewer`, `boards`) and global state (sidebar visibility, selected ID, authentication).
-   **Integration:** Connects `Sidebar`, `Inspector`, `StatusBar`, and various modal dialogs (`ExportDialog`, `QCDashboard`, `BatchEditor`).
-   **Data Flow:** Orchestrates data loading via `useVault` and `storage`, and handles saving.
-   **Responsiveness:** Manages mobile/desktop layouts and "Field Mode".

**What it should be able to do (Missing):**
-   **Deep Linking:** The URL does not seem to update to reflect the current view or selected item (except for `contentState` handling), making browser back/forward buttons ineffective for navigation.
-   **Error Boundary:** While there is an `ErrorBoundary` component, `App.tsx` doesn't seem to wrap major views in granular error boundaries to prevent a single view crash from taking down the whole app.
-   **Keyboard Navigation:** Global keyboard shortcuts are limited (mostly Command Palette and Undo/Redo); navigating between views or panels via keyboard is not standardized.

**Possibilities (No New Features):**
-   **Unified Context:** Consolidate prop drilling (passing `root`, `onUpdate`, `settings` everywhere) into a more robust Context or hook-based system for cleaner component interfaces.
-   **Transition States:** Improve visual feedback during view transitions (e.g., loading states or smooth cross-fades) to make the app feel more "native" and polished.
-   **Layout Persistence:** Remember the state of panels (Sidebar width, Inspector visibility) across sessions more consistently.

**Likelihood of Bugs: HIGH**
-   **Reasons:** Massive prop drilling creates fragility; adding a new prop requires updating many intermediate components. State management is complex, mixing `useState` with `useVault`, increasing the risk of state desynchronization. Global error handling is coarse.

---

## 2. Archive View (`ArchiveView.tsx`)

**Current Wiring:**
-   **Function:** Displays a flat list of all Canvases (assets).
-   **Views:** Grid, List, Map, Timeline.
-   **Interaction:** Multi-select, Filtering (by label), Sorting (Name, Date).
-   **Actions:** "Synthesis" (Group, Map, Catalog), Delete.

**What it should be able to do (Missing):**
-   **Pagination/Virtualization:** Renders all assets at once; this will degrade performance significantly with large archives.
-   **Advanced Filtering:** Only filters by name/label. Should filter by Type, Date range, Tags, or Metadata presence.
-   **Drag Selection:** Standard "rubber band" selection box for the Grid view is missing.

**Possibilities (No New Features):**
-   **Visual Hierarchy:** Use existing metadata (like `partOf`) to visually group items in the Grid view (e.g., "stacks" for items in the same Manifest) to reduce visual clutter.
-   **Enhanced List View:** Add more columns to the List view (from available metadata) and make them sortable by clicking headers.
-   **Empty State Guidance:** Improve the "No items found" state to suggest clearing filters or importing content, guiding the user back to a working state.

**Likelihood of Bugs: MEDIUM**
-   **Reasons:** Filtering and sorting logic is manual and client-side; performance will degrade linearly with archive size, potentially freezing the UI. Multi-select state management can be error-prone during complex interactions.

---

## 3. Structure View (`CollectionsView.tsx`)

**Current Wiring:**
-   **Function:** Hierarchical tree management of Collections and Manifests.
-   **Interaction:** Drag-and-drop reordering, nesting.
-   **Features:** Auto-structure (TOC), Behavior Policy configuration.
-   **Navigation:** Deep links to "Reveal in Archive" or "Synthesis Workbench".

**What it should be able to do (Missing):**
-   **Multi-Select:** Tree view only supports single selection. Batch moving/deleting items in the structure is impossible.
-   **Search within Tree:** No way to find a specific Manifest or Canvas within a deep hierarchy.
-   **Visual Drop Feedback:** Drag-and-drop feedback is minimal; it's hard to tell if you are dropping *inside* or *between* items.

**Possibilities (No New Features):**
-   **Contextual Actions:** Expose more actions in the item row (e.g., "Add Sibling", "Duplicate") to speed up structure creation without leaving the tree context.
-   **Better Metadata Preview:** The right-hand panel for a selected node is sparse. Show a summary of child items (counts, types) or a mini-grid of contents to provide better context.
-   **Inheritance Visualization:** Visually indicate which properties (like behaviors or metadata) are being inherited from parent collections vs. explicitly set.

**Likelihood of Bugs: HIGH**
-   **Reasons:** Recursive component rendering (`TreeNode`) and manual recursion for finding/updating nodes (`findNode`, `cloneTree`) are notorious for stack overflow errors and performance bottlenecks. Drag-and-drop logic on trees is mathematically complex and edge-case prone.

---

## 4. Metadata Catalog (`MetadataSpreadsheet.tsx`)

**Current Wiring:**
-   **Function:** Flattened spreadsheet view for bulk editing.
-   **Columns:** Core fields (Title, Summary, Date) + Dynamic metadata keys.
-   **Sync:** "Commit Changes" model (edit, then save).
-   **Preview:** Expanded row view for detailed inspection.

**What it should be able to do (Missing):**
-   **Bulk Operations:** No way to copy/paste a value to multiple rows or "Fill Down".
-   **Sorting:** Column headers are static; clicking them does not sort the table.
-   **Export/Import:** Cannot export the table to CSV or paste from Excel, which is a standard expectation for "spreadsheet" views.

**Possibilities (No New Features):**
-   **Smart Inputs:** Use existing type information to provide better input widgets for specific metadata fields (e.g., dropdowns for known vocabularies) instead of generic text inputs.
-   **Focus Management:** Improve keyboard navigation within the grid (Arrow keys to move between cells) to make data entry faster.
-   **Validation Feedback:** Highlight cells with validation warnings (using the existing `validator` service) directly in the grid (e.g., red borders for missing required fields).

**Likelihood of Bugs: MEDIUM**
-   **Reasons:** The "Commit Changes" model introduces a risk of data loss if the user navigates away or crashes before saving. Dynamic column generation from metadata keys can be fragile if keys vary slightly (case sensitivity, whitespace).

---

## 5. Resource Inspector (`Inspector.tsx`)

**Current Wiring:**
-   **Function:** Side panel for detailed editing of the selected resource.
-   **Tabs:** Metadata, Provenance, Geo, Learn.
-   **Features:** Field-level editing, GeoEditor integration.

**What it should be able to do (Missing):**
-   **Rich Text:** Summary and other long-text fields use basic textareas; no support for basic formatting (bold/italic) or language maps beyond the current app language.
-   **Image Manipulation:** Shows a static preview; cannot set a custom thumbnail or adjust the region of interest from here.
-   **Relationships:** No interface to view or edit "Related" items, "See Also" links, or structural relationships (parent/children) directly.

**Possibilities (No New Features):**
-   **Contextual Help:** The "Learn" tab is good, but help tooltips could be inline with specific complex fields (like `viewingDirection` or `behavior`) to assist decision-making in real-time.
-   **Compact Mode:** Allow the inspector to be collapsed or minimized to a "toolbar" state to maximize screen real estate while keeping key actions accessible.
-   **Direct Navigation:** Make the "Parent" or "Children" links in the breadcrumb/header clickable to navigate the hierarchy without switching views.

**Likelihood of Bugs: MEDIUM**
-   **Reasons:** Custom `DebouncedInput` implementation carries risks of race conditions (e.g., typing quickly while a background update occurs). Multiple tabs sharing state increases complexity.

---

## 6. Synthesis Workspace (`CanvasComposer.tsx`)

**Current Wiring:**
-   **Function:** Visual editor for composing annotations on a Canvas.
-   **Features:** Layer management (z-index, opacity, locking), positioning (x, y, w, h).

**What it should be able to do (Missing):**
-   **Direct Manipulation:** Users must use sidebar inputs to move/resize layers. There are no on-canvas handles for dragging or resizing.
-   **Multi-Select:** Cannot select multiple layers to move or align them together.
-   **Undo/Redo:** No local undo history for composition changes; if you mess up a layout, you have to fix it manually or cancel everything.

**Possibilities (No New Features):**
-   **Alignment Tools:** Add simple buttons to "Align Left", "Align Top", "Distribute Vertically" using the existing coordinate data.
-   **Visual Guides:** Render a simple grid or center lines (using CSS) to help with manual alignment.
-   **Layer Previews:** Show a mini-thumbnail in the layer list (sidebar) instead of just the label, making it easier to identify layers in complex compositions.

**Likelihood of Bugs: HIGH**
-   **Reasons:** Relying on manual coordinate entry is error-prone for users. Programmatic layer management (z-indexing, array reordering) often has off-by-one errors. Coordinate system mismatches between "screen pixels" and "canvas coordinates" are a common source of visual bugs.

---

## 7. Item Viewer (`Viewer.tsx`)

**Current Wiring:**
-   **Function:** Deep zoom viewer (OpenSeadragon) and AV player.
-   **Features:** Evidence extraction (cropping), Annotation drawing, Transcription view.

**What it should be able to do (Missing):**
-   **Gallery View:** When viewing a Manifest, there's no "filmstrip" or thumbnail drawer to navigate to other canvases without returning to the main list.
-   **Annotation List Management:** The "Evidence & Notes" panel lists annotations but doesn't offer robust management (edit, delete, reply) for them.

**Possibilities (No New Features):**
-   **Synced Views:** If `showTranscriptionPanel` is open, clicking an annotation should zoom the viewer to that region (and vice-versa). Currently, this might be partial; ensuring tight coupling improves usability.
-   **Metadata Overlay:** Allow toggling a transparent overlay of key metadata (Label, Date) on top of the viewer for quick reference without opening the Inspector.

**Likelihood of Bugs: HIGH**
-   **Reasons:** Integrating third-party canvas libraries (OpenSeadragon) with React lifecycle is notoriously difficult (e.g., proper cleanup, event binding). Coordinate transforms between the OSD viewport and IIIF image coordinates are mathematically sensitive and prone to precision errors.
