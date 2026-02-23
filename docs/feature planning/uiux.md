---                                                                                                                 
  Field Studio — Complete UI Surface Audit                                                                            
                                                                                                                      
  How to Read This Audit                                                           

  Each surface is analyzed in two parts:
  - Current State — What exists today
  - Ideal UX — What a best-in-class implementation would look like (elements, optimizations, pipelines, interactions)

  Gap indicators: [GAP] = missing entirely, [PARTIAL] = exists but incomplete, [OK] = solid

  ---
  1. SIDEBAR (Navigation)

  File: src/widgets/NavigationSidebar/ui/organisms/Sidebar.tsx

  Current State

  - View switcher buttons (Archive, Structure, Metadata, Boards, Map, Timeline, Search)
  - Project tree browser with expand/collapse, filter
  - Import (folder/URL), Export, Settings buttons
  - Field Mode toggle, abstraction level slider
  - React.memo with custom comparison (root.id, selectedId, currentMode)
  - Tree is recursive DOM (not virtualized)

  Ideal UX
  ┌───────────────────┬───────────────────────────────────────────┬───────────────────────┬──────────────────────────┐
  │      Element      │                   Ideal                   │        Current        │          Status          │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Active view       │ Bold highlight + icon animation on active │ Blue text + underline │ [PARTIAL] — no           │
  │ indicator         │  tab                                      │                       │ transition animation     │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Collapse/expand   │ Animated width transition (260px → 48px   │ Binary show/hide, no  │ [GAP] — no collapsed     │
  │                   │ icon rail) with hover-expand              │ icon rail             │ icon mode                │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Tree              │ Virtual scrolling for 1000+ node trees    │ Full DOM recursion    │ [GAP] — works for ~500   │
  │ virtualization    │                                           │                       │ items, degrades beyond   │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Drag-drop         │ Ghost preview, insertion line,            │ Basic drop handler,   │ [PARTIAL] — functional   │
  │ feedback          │ valid/invalid cursor, shake-to-cancel     │ no visual preview     │ but no polish            │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Breadcrumb        │ Show current path (Collection > Manifest  │ Nothing when          │ [GAP]                    │
  │ context           │ > Canvas) in collapsed header             │ collapsed             │                          │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Quick actions     │ Right-click on tree node → context menu   │ No context menu on    │ [GAP]                    │
  │                   │ (rename, delete, duplicate, move)         │ tree nodes            │                          │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Badge indicators  │ Validation error count, unsaved changes   │ None                  │ [GAP]                    │
  │                   │ dot, new items badge                      │                       │                          │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Keyboard nav      │ Arrow keys traverse tree, Enter opens,    │ Click-only            │ [GAP]                    │
  │                   │ Space selects, / to filter                │                       │                          │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Search            │ Type-ahead filter with highlight matching │ Filter input exists   │ [PARTIAL]                │
  │ integration       │  text in tree                             │ but no highlight      │                          │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Mobile drawer     │ Gesture-swipeable, backdrop dismiss,      │ Auto-close on select  │ [PARTIAL] — functional   │
  │                   │ spring physics                            │                       │ but no gesture           │
  ├───────────────────┼───────────────────────────────────────────┼───────────────────────┼──────────────────────────┤
  │ Resize handle     │ Drag border to resize 200-400px,          │ Fixed width           │ [GAP]                    │
  │                   │ double-click to reset                     │                       │                          │
  └───────────────────┴───────────────────────────────────────────┴───────────────────────┴──────────────────────────┘
  Ideal Pipeline: Open app → sidebar auto-expands → tree loads progressively → user navigates via keyboard or click →
  sidebar remembers expanded state across sessions → collapses to icon rail on small screens

  ---
  2. ARCHIVE VIEW (Main Grid)

  File: src/features/archive/ui/organisms/ArchiveView.tsx

  Current State

  - Grid/list toggle with density controls (compact/comfortable/spacious)
  - Multi-select (Shift+Click, Cmd+Click)
  - Context menu with bulk actions
  - Virtualized grid (useGridVirtualization, overscan=3)
  - Drag-to-reorder with Alt+Arrow keyboard support
  - Filter input, sort controls
  - GuidedEmptyState for onboarding
  - Filmstrip mode when viewer panel open

  Ideal UX
  ┌──────────────────┬──────────────────────────────────────────────────┬────────────────────────────────┬───────────┐
  │     Element      │                      Ideal                       │            Current             │  Status   │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Thumbnail        │ Progressive: blur-up placeholder → thumbnail →   │ Lazy-load with loading="lazy", │ [PARTIAL] │
  │ quality          │ sharp on hover                                   │  no blur-up                    │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Selection        │ Blue border + checkmark overlay + count badge    │ Checkmark on selected,         │ [OK]      │
  │ feedback         │ floats                                           │ floating toolbar               │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Drag             │ Rubber-band lasso selection (click+drag on empty │ Shift/Cmd click only           │ [GAP]     │
  │ multi-select     │  space)                                          │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Infinite scroll  │ Smooth scroll with skeleton placeholders during  │ Virtualized grid (works well)  │ [OK]      │
  │                  │ load                                             │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Sort indicators  │ Column header arrows, visual sort animation      │ Sort dropdown, no animation    │ [PARTIAL] │
  │                  │ (items slide into position)                      │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Hover preview    │ Larger preview tooltip with metadata summary on  │ Nothing on hover               │ [GAP]     │
  │                  │ hover                                            │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Keyboard grid    │ Arrow keys move focus cell-by-cell in grid,      │ Alt+Arrow for reorder only     │ [PARTIAL] │
  │ nav              │ Enter to open                                    │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Drag-drop import │ Drop zone with visual target, file type          │ Triggers staging modal         │ [OK]      │
  │                  │ validation, progress                             │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Batch operations │ Sticky bottom bar with count + available actions │ Floating selection toolbar     │ [OK]      │
  │  bar             │                                                  │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Empty state      │ Animated illustration + 3-step guide + sample    │ GuidedEmptyState with steps    │ [OK]      │
  │                  │ data option                                      │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Type grouping    │ Optional group-by-manifest view (collapsible     │ Flat list only                 │ [GAP]     │
  │                  │ sections)                                        │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ Status           │ Validation badges, missing metadata dots per     │ None per-item                  │ [GAP]     │
  │ indicators       │ thumbnail                                        │                                │           │
  ├──────────────────┼──────────────────────────────────────────────────┼────────────────────────────────┼───────────┤
  │ View persistence │ Remember grid/list, density, sort per session    │ saveViewMode exists            │ [OK]      │
  └──────────────────┴──────────────────────────────────────────────────┴────────────────────────────────┴───────────┘
  Ideal Pipeline: User opens archive → grid renders with thumbnails → mouse hover shows preview card →
  rubber-band select multiple → floating bar shows actions → batch edit metadata / compose board / set rights →
  changes auto-save with status indicator

  ---
  3. VIEWER VIEW (Canvas/Media Player)

  File: src/features/viewer/ui/organisms/ViewerView.tsx

  Current State

  - OpenSeadragon for images with zoom/rotate/flip
  - MediaPlayer for audio/video with time range selection
  - Annotation overlay (polygon/freehand/point drawing)
  - Filmstrip navigator with current/total indicator
  - Toolbar: zoom, rotation, screenshot, navigator toggle
  - Throttled playback updates (500ms)
  - Service Worker IIIF Image API Level 2

  Ideal UX
  Element: Zoom controls
  Ideal: Smooth pinch-zoom (touch), scroll zoom with inertia, minimap navigator
  Current: Scroll zoom + buttons, OSD navigator toggle
  Status: [OK]
  ────────────────────────────────────────
  Element: Annotation UX
  Ideal: Toolbar with shape tools, color picker, line width, undo stack, layers panel
  Current: 3 modes (polygon/freehand/point), single undo
  Status: [PARTIAL] — functional but minimal tooling
  ────────────────────────────────────────
  Element: Annotation display
  Ideal: Hover to highlight, click to select, opacity slider, hide/show toggle
  Current: SVG overlay, basic show/hide
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Comparison mode
  Ideal: Side-by-side or overlay comparison of two canvases
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Filmstrip
  Ideal: Horizontal strip below viewer, drag-scrollable, keyboard left/right
  Current: Exists with index display
  Status: [OK]
  ────────────────────────────────────────
  Element: Loading states
  Ideal: Tile-by-tile progressive rendering with blur placeholder
  Current: OSD handles natively
  Status: [OK]
  ────────────────────────────────────────
  Element: Screenshot
  Ideal: Region selection tool, format picker (PNG/JPEG/WebP), copy to clipboard
  Current: Full canvas download as PNG
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Measurement tool
  Ideal: Ruler/scale bar overlay for archival documents
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Color adjustment
  Ideal: Brightness/contrast/invert for degraded documents
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Audio waveform
  Ideal: Visual waveform display with scrubbing
  Current: Basic progress bar
  Status: [GAP]
  ────────────────────────────────────────
  Element: Video chapters
  Ideal: Range markers on timeline, chapter navigation
  Current: Time range selection exists
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Fullscreen
  Ideal: True fullscreen with all controls available
  Current: Fullscreen button exists
  Status: [OK]
  ────────────────────────────────────────
  Element: Keyboard shortcuts
  Ideal: Z zoom, R rotate, A annotate, Esc exit modes, Space pause media
  Current: Shortcuts modal exists but limited bindings
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: IIIF deep zoom
  Ideal: Multi-resolution tile streaming, zoom-dependent detail
  Current: Service Worker Image API Level 2
  Status: [OK]
  Ideal Pipeline: User selects canvas → viewer loads with progressive tiles → pinch/scroll to zoom → press A to
  annotate → draw region → type annotation text → select motivation → save → annotation persists in vault → visible on
   filmstrip as indicator dot

  ---
  4. INSPECTOR PANEL (Detail Editor)

  File: src/features/metadata-edit/ui/organisms/Inspector.tsx

  Current State

  - Tabs: Metadata, Annotations, Structure, Learn, Design
  - Inline field editing (label, summary, rights, navDate, behaviors, custom metadata)
  - Validation panel with auto-fix
  - Annotation CRUD with time range support
  - Resizable panel (280-480px)
  - React.memo with custom comparison excluding currentPlaybackTime

  Ideal UX
  Element: Tab indicators
  Ideal: Badge counts (annotations: 3, issues: 2) on tab labels
  Current: Validation badge on annotations tab only
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Metadata form
  Ideal: Grouped sections (Identity, Description, Rights, Technical) with collapse
  Current: Flat list of fields
  Status: [PARTIAL] — field grouping exists but no collapse
  ────────────────────────────────────────
  Element: Field auto-detect
  Ideal: Suggest fields based on resource type (Canvas → dimensions, Manifest → viewingDirection)
  Current: Available properties dropdown
  Status: [OK]
  ────────────────────────────────────────
  Element: Undo per field
  Ideal: Ctrl+Z reverts individual field, not entire state
  Current: Global vault undo
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Rich text
  Ideal: Markdown editor for summary/description with preview
  Current: Plain textarea
  Status: [GAP]
  ────────────────────────────────────────
  Element: Linked data
  Ideal: Auto-suggest from Getty AAT, LCSH, Wikidata for metadata values
  Current: No linked data integration
  Status: [GAP]
  ────────────────────────────────────────
  Element: Version history
  Ideal: Show field change history with timestamps
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Validation inline
  Ideal: Red border + tooltip on invalid fields, green check on valid
  Current: Validation panel separate from fields
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Resize
  Ideal: Smooth drag resize with snap points, double-click to reset
  Current: Resize handle works (280-480px)
  Status: [OK]
  ────────────────────────────────────────
  Element: Annotation list
  Ideal: Sortable by date/motivation, preview on hover, bulk delete
  Current: Basic list
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Structure tab
  Ideal: Drag-reorder canvases with thumbnail preview, add/remove
  Current: Canvas list exists
  Status: [OK]
  ────────────────────────────────────────
  Element: Learn tab
  Ideal: IIIF spec explanation + example for current field
  Current: Exists with spec description
  Status: [OK]
  ────────────────────────────────────────
  Element: Keyboard
  Ideal: Tab between fields, Enter to save, Esc to cancel
  Current: Basic tab/escape
  Status: [OK]
  Ideal Pipeline: User selects item → inspector animates open → metadata tab shows grouped fields → user edits label →
   validation runs inline → green check appears → auto-save triggers → user switches to annotations tab → sees
  annotation list with count badge → creates new annotation → saves → count updates

  ---
  5. METADATA VIEW (Spreadsheet)

  File: src/features/metadata-edit/ui/organisms/MetadataView.tsx

  Current State

  - Table with sticky header, dynamic columns
  - Resource type tabs (All/Collection/Manifest/Canvas)
  - Click cell to edit inline
  - Filter by term, sort by columns
  - CSV import/export
  - Unsaved changes warning on unload
  - flattenTree() + extractColumns() for dynamic schema

  Ideal UX
  ┌────────────────┬───────────────────────────────────────────────┬──────────────────────────┬─────────────────────┐
  │    Element     │                     Ideal                     │         Current          │       Status        │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Virtualized    │ Virtual rows + columns for 10K+ items with    │ Full DOM table           │ [GAP] — works for   │
  │ table          │ smooth scroll, with preview of item           │                          │ ~200 items          │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Column resize  │ Drag column borders, double-click to auto-fit │ Fixed widths             │ [GAP]               │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Column reorder │ Drag column headers to rearrange              │ Fixed order              │ [GAP]               │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Column         │ Checkbox dropdown for visible columns         │ All columns shown        │ [GAP]               │
  │ show/hide      │                                               │                          │                     │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Multi-cell     │ Select range → type → apply to all selected   │ Single cell edit         │ [GAP]               │
  │ edit           │                                               │                          │                     │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Find/replace   │ Ctrl+H for bulk text replacement across cells │ Filter only              │ [GAP]               │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Cell           │ Type-aware rendering (dates as pickers, URLs  │ Basic text/date inputs   │ [PARTIAL]           │
  │ formatting     │ as links, rights as badges)                   │                          │                     │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Diff           │ Changed cells highlighted until save          │ No visual diff           │ [GAP]               │
  │ highlighting   │                                               │                          │                     │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ CSV round-trip │ Import CSV → preview mapping → apply with     │ Import/export exists but │ [PARTIAL]           │
  │                │ conflict resolution                           │  no preview              │                     │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Freeze panes   │ Lock first 2 columns (type + label) while     │ Sticky header, no frozen │ [PARTIAL]           │
  │                │ scrolling                                     │  columns                 │                     │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Validation     │ Inline cell validation (red outline, tooltip) │ No per-cell validation   │ [GAP]               │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Undo           │ Ctrl+Z per cell or per batch                  │ Global undo              │ [PARTIAL]           │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Copy/paste     │ Ctrl+C/V cells, paste from Excel/Sheets       │ Not implemented          │ [GAP]               │
  ├────────────────┼───────────────────────────────────────────────┼──────────────────────────┼─────────────────────┤
  │ Row grouping   │ Group by manifest, expand/collapse            │ Tab filter by type       │ [PARTIAL]           │
  └────────────────┴───────────────────────────────────────────────┴──────────────────────────┴─────────────────────┘
  Ideal Pipeline: User opens metadata view → table virtualizes 5000 items smoothly → user selects column range → types
   replacement value → preview shows affected cells highlighted → apply → diff highlighting shows changes → auto-save
  → Ctrl+Z to undo batch

  ---
  6. BOARD VIEW (Visual Designer)

  File: src/features/board-design/ui/organisms/BoardView.tsx

  Current State

  - Freeform canvas with draggable items
  - Tool selector (select/connect/note/text)
  - Connection lines between items
  - Group overlays with dashed borders
  - Undo/redo via vault history
  - Export as IIIF Manifest
  - Snap-to-grid toggle
  - Alignment controls
  - Template onboarding for new boards

  Ideal UX
  Element: Infinite canvas
  Ideal: Pan/zoom with inertia, minimap navigator, zoom to fit
  Current: Viewport management exists
  Status: [OK]
  ────────────────────────────────────────
  Element: Item cards
  Ideal: Thumbnail + label + type badge + metadata preview on hover
  Current: Thumbnails + labels
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Connection types
  Ideal: Labeled edges (e.g., "depicts", "part of"), curved/straight toggle, color
  Current: Type indicators on lines
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Smart layout
  Ideal: Force-directed, hierarchical, circular auto-layout options
  Current: Auto-arrange exists
  Status: [OK]
  ────────────────────────────────────────
  Element: Annotations on board
  Ideal: Add notes/sticky notes at arbitrary positions
  Current: Note tool exists
  Status: [OK]
  ────────────────────────────────────────
  Element: Multi-select
  Ideal: Rubber-band + Shift+Click, group operations
  Current: Click to select
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Alignment guides
  Ideal: Smart guides (snap to center/edge of nearby items)
  Current: Snap to grid
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Export options
  Ideal: PNG, SVG, IIIF Manifest, JSON-LD
  Current: IIIF Manifest export
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Collaborative
  Ideal: Real-time multi-user editing
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Presentation mode
  Ideal: Step-through narrative (follow connections as slides)
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Template gallery
  Ideal: Pre-built layouts (narrative, comparison, timeline, thematic)
  Current: Template selector on new board
  Status: [OK]
  ────────────────────────────────────────
  Element: Content State drop
  Ideal: Drag IIIF Content State URL onto board to add external item
  Current: Integration exists
  Status: [OK]
  Ideal Pipeline: User creates board → selects template → drags items from archive sidebar → positions with alignment
  guides → connects items with labeled relationships → adds narrative notes → exports as IIIF Manifest → shares via
  Content State URL

  ---
  7. SEARCH VIEW

  File: src/features/search/ui/organisms/SearchView.tsx

  Current State

  - Full-text search via FlexSearch (in-memory)
  - Autocomplete with suggestions + recent searches
  - Type filter pills (All/Manifest/Canvas/Annotation)
  - Result cards with navigation
  - Keyboard nav (Arrow keys in autocomplete)
  - Index rebuilt on every app load

  Ideal UX
  Element: Index persistence
  Ideal: Persist FlexSearch index to IndexedDB, incremental updates
  Current: Rebuilds on every load
  Status: [GAP]
  ────────────────────────────────────────
  Element: Fuzzy matching
  Ideal: Typo tolerance, phonetic matching, stemming
  Current: Levenshtein ≤ 2
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Highlighting
  Ideal: Highlight matching terms in results
  Current: No highlighting
  Status: [GAP]
  ────────────────────────────────────────
  Element: Faceted filters
  Ideal: Filter by type, date range, has-GPS, has-annotations
  Current: Type filter pills only
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Sort results
  Ideal: By relevance, date, type, name
  Current: Relevance only
  Status: [GAP]
  ────────────────────────────────────────
  Element: Preview panel
  Ideal: Hover/click result → inline preview with thumbnail + metadata
  Current: Navigate to archive only
  Status: [GAP]
  ────────────────────────────────────────
  Element: Search operators
  Ideal: type:canvas label:"sunset" syntax
  Current: Plain text only
  Status: [GAP]
  ────────────────────────────────────────
  Element: Web Worker search
  Ideal: Offload to worker for large archives
  Current: USE_WORKER_SEARCH flag exists but partial
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Search analytics
  Ideal: Track popular queries, surface common patterns
  Current: Recent searches stored
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Annotation content search
  Ideal: Search within annotation text bodies
  Current: Annotation type filter exists
  Status: [OK]
  Ideal Pipeline: User presses Cmd+K or navigates to search → type query → instant fuzzy results with highlighted
  matches → filter by facets → hover result for preview → click to navigate → search history persists

  ---
  8. STRUCTURE TREE VIEW

  File: src/features/structure-view/ui/organisms/StructureTreeView.tsx

  Current State

  - Hierarchical tree (Collection → Manifest → Canvas)
  - Virtual scrolling (VirtualTreeList) for 1000+ nodes
  - Search with auto-expand
  - Drag-drop reordering with validation
  - Multi-select (shift/cmd)
  - Keyboard navigation

  Ideal UX
  Element: Tree virtualization
  Ideal: Virtual scroll with 10K+ nodes, smooth
  Current: VirtualTreeList exists
  Status: [OK]
  ────────────────────────────────────────
  Element: Drag-drop
  Ideal: Ghost preview, insertion indicator, parent highlight, invalid cursor
  Current: Drop indicator line exists
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Bulk operations
  Ideal: Multi-select → merge, group, move to collection
  Current: Multi-select exists, limited ops
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Inline rename
  Ideal: Double-click label to edit in-place
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Icon indicators
  Ideal: Type icons + validation dots + annotation count
  Current: Type icons with colors
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Context menu
  Ideal: Right-click → rename, delete, duplicate, move, create child
  Current: No context menu
  Status: [GAP]
  ────────────────────────────────────────
  Element: Clipboard
  Ideal: Cut/Copy/Paste tree nodes
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Range support
  Ideal: Show IIIF Ranges as nested structure within manifests
  Current: Range infrastructure ready, not shown
  Status: [GAP]
  ────────────────────────────────────────
  Element: Filter highlight
  Ideal: Highlight matching text in labels when filtering
  Current: Filter works, no text highlight
  Status: [GAP]
  Ideal Pipeline: User opens structure → tree virtualizes instantly → type to filter with highlighted matches → drag
  items to reorganize → right-click for context actions → inline rename with Enter → changes reflect in archive view
  immediately

  ---
  9. MAP VIEW

  File: src/features/map/ui/organisms/MapView.tsx

  Current State

  - Grid-based map with markers and clustering (Supercluster)
  - Hover tooltips with thumbnail preview
  - Cluster expansion on click
  - Zoom controls
  - Client-side clustering via useMap() hook

  Ideal UX
  ┌─────────────────┬────────────────────────────────────────────────────┬────────────────────┬──────────────────────┐
  │     Element     │                       Ideal                        │      Current       │        Status        │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Real map tiles  │ OpenStreetMap/MapTiler tiles with satellite toggle │ Grid background    │ [GAP] — no real map  │
  │                 │                                                    │ only               │ tiles                │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Cluster         │ Smooth zoom-to-cluster animation, spiderfication   │ Click to list      │ [PARTIAL]            │
  │ animation       │ for overlaps                                       │                    │                      │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Heatmap mode    │ Density heatmap as alternative to markers          │ Not implemented    │ [GAP]                │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Draw selection  │ Lasso/rectangle region to select items by          │ Not implemented    │ [GAP]                │
  │                 │ geography                                          │                    │                      │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Geocoding       │ Search for place names, auto-zoom to location      │ Not implemented    │ [GAP]                │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Timeline scrub  │ Filter markers by date range slider                │ Not implemented    │ [GAP]                │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Path/route      │ Show travel path between dated+geotagged items     │ Not implemented    │ [GAP]                │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Geo-edit        │ Click map to set/correct navPlace coordinates      │ GeoEditor in       │ [PARTIAL]            │
  │                 │                                                    │ Inspector          │                      │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Export          │ Download map as image, export GeoJSON              │ Not implemented    │ [GAP]                │
  ├─────────────────┼────────────────────────────────────────────────────┼────────────────────┼──────────────────────┤
  │ Performance     │ WebGL rendering for 10K+ markers                   │ DOM-based markers  │ [PARTIAL]            │
  └─────────────────┴────────────────────────────────────────────────────┴────────────────────┴──────────────────────┘
  Ideal Pipeline: User opens map → real map tiles load → geotagged items cluster on map → zoom in to uncluster → hover
   for preview → click to select → lasso select region → batch edit selected → scrub timeline to filter by date →
  export view as image

  ---
  10. TIMELINE VIEW

  File: src/features/timeline/ui/organisms/TimelineView.tsx

  Current State

  - Chronological groups by navDate
  - Zoom levels (Day/Month/Year)
  - Minimap with date ticks
  - Item cards with thumbnails in groups
  - Click to select canvas

  Ideal UX
  Element: Smooth zoom
  Ideal: Pinch/scroll zoom between day→year with animation
  Current: Button-based zoom level switch
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Date range filter
  Ideal: Draggable range handles on minimap
  Current: Date ticks, no range handles
  Status: [GAP]
  ────────────────────────────────────────
  Element: Gap visualization
  Ideal: Show temporal gaps visually (compressed empty periods)
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Multiple timelines
  Ideal: Compare timelines from different manifests
  Current: Single timeline
  Status: [GAP]
  ────────────────────────────────────────
  Element: Item preview
  Ideal: Hover card with thumbnail, label, full date
  Current: Thumbnail + label
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Playback mode
  Ideal: Auto-advance through items chronologically
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Date editing
  Ideal: Click date label to edit navDate inline
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Keyboard
  Ideal: Arrow left/right between groups, up/down between items
  Current: Click only
  Status: [GAP]
  ────────────────────────────────────────
  Element: Virtualization
  Ideal: Virtual scroll for 1000+ dated items
  Current: Full DOM rendering
  Status: [GAP]
  Ideal Pipeline: User opens timeline → items group by navDate → minimap shows full range with draggable handles →
  zoom from years to days smoothly → hover item for preview → click to open in viewer → arrow keys to navigate
  chronologically

  ---
  11. STAGING / INGEST WORKBENCH

  Files: src/features/staging/ui/organisms/StagingView.tsx, StagingWorkbench.tsx

  Current State

  - Two-pane layout (source manifests → target collections)
  - File/folder drag-drop import
  - Manifest checkbox selection
  - Create collection from selection
  - Context menus for behavior/rights/navDate
  - Ingest progress tracking with worker pool
  - Keyboard DnD (feature-flagged)

  Ideal UX
  Element: Preview pane
  Ideal: 3rd pane showing selected file preview before ingest
  Current: Two panes only
  Status: [GAP]
  ────────────────────────────────────────
  Element: Smart detection
  Ideal: Show detected structure (manifest/collection) with confidence
  Current: Detection runs but minimal UI feedback
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Progress detail
  Ideal: Per-file progress bars, estimated time, pause/cancel
  Current: Stage name + file counts + activity log
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Conflict resolution
  Ideal: Detect duplicate IDs, name conflicts before ingest
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Metadata template
  Ideal: Apply metadata template to all items during ingest
  Current: Template export UI exists
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Format support
  Ideal: Show supported formats, warn on unsupported
  Current: No format validation UI
  Status: [GAP]
  ────────────────────────────────────────
  Element: Undo ingest
  Ideal: Roll back an ingest operation
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Batch annotation
  Ideal: Add annotations per-file/directory during staging
  Current: Annotation map per path exists
  Status: [OK]
  ────────────────────────────────────────
  Element: Drag feedback
  Ideal: Ghost preview, drop zone highlight, invalid target indicator
  Current: Basic drag handlers
  Status: [PARTIAL]
  Ideal Pipeline: User drops folder → analyzer detects structure with confidence scores → user reviews/adjusts mapping
   → applies metadata template → sets batch rights/behavior → starts ingest → per-file progress bars → completion
  summary → navigates to archive

  ---
  12. QC DASHBOARD

  File: src/widgets/QCDashboard/ui/QCDashboard.tsx

  Current State

  - Health score (0-100%)
  - Category tabs (Identity, Structure, Metadata, Content)
  - Issue list with descriptions
  - Fix individual / Fix all buttons
  - Item path breadcrumbs
  - Metadata field suggestions

  Ideal UX
  Element: Health visualization
  Ideal: Donut chart with category breakdown, trend over time
  Current: Percentage display
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Issue grouping
  Ideal: Group by severity (error/warning/info), sortable
  Current: Category tabs
  Status: [OK]
  ────────────────────────────────────────
  Element: Bulk fix preview
  Ideal: Preview all changes before "Fix All", with diff
  Current: Fix all with no preview
  Status: [GAP]
  ────────────────────────────────────────
  Element: Fix undo
  Ideal: Undo individual fixes
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Navigate to source
  Ideal: Click issue → jump to item in archive/viewer
  Current: Selection + path breadcrumb
  Status: [PARTIAL]
  ────────────────────────────────────────
  Element: Export report
  Ideal: Download validation report as PDF/JSON
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: IIIF compliance
  Ideal: Show IIIF Presentation API 3.0 compliance level
  Current: Not explicitly shown
  Status: [GAP]
  ────────────────────────────────────────
  Element: Custom rules
  Ideal: User-defined validation rules
  Current: Fixed ruleset
  Status: [GAP]
  Ideal Pipeline: User opens QC → sees donut chart of health → drills into category → reviews individual issues with
  preview → applies fix → sees health score update → exports compliance report

  ---
  13. COMMAND PALETTE

  File: src/widgets/CommandPalette/ui/CommandPalette.tsx

  Current State

  - Fuzzy search with fzf-style scoring
  - History tracking (recent + frequent)
  - Keyboard nav (Arrow keys + Enter)
  - Sections (Navigation, Actions, View, Admin)

  Ideal UX
  ┌────────────────┬──────────────────────────────────────────────────┬──────────────────────────────────┬───────────┐
  │    Element     │                      Ideal                       │             Current              │  Status   │
  ├────────────────┼──────────────────────────────────────────────────┼──────────────────────────────────┼───────────┤
  │ Fuzzy matching │ Highlighted match characters in results          │ Fuzzy matching, no char          │ [PARTIAL] │
  │                │                                                  │ highlighting                     │           │
  ├────────────────┼──────────────────────────────────────────────────┼──────────────────────────────────┼───────────┤
  │ Context        │ Show different commands based on current         │ Static command list              │ [GAP]     │
  │ commands       │ view/selection                                   │                                  │           │
  ├────────────────┼──────────────────────────────────────────────────┼──────────────────────────────────┼───────────┤
  │ Nested         │ Type "export" → submenu (IIIF, CSV, Image)       │ Flat list                        │ [GAP]     │
  │ commands       │                                                  │                                  │           │
  ├────────────────┼──────────────────────────────────────────────────┼──────────────────────────────────┼───────────┤
  │ Recent files   │ Show recently opened items alongside commands    │ Not implemented                  │ [GAP]     │
  ├────────────────┼──────────────────────────────────────────────────┼──────────────────────────────────┼───────────┤
  │ Pinned         │ User-pinnable favorite commands                  │ Not implemented                  │ [GAP]     │
  │ commands       │                                                  │                                  │           │
  └────────────────┴──────────────────────────────────────────────────┴──────────────────────────────────┴───────────┘
  ---
  14. ONBOARDING / PERSONA SETTINGS

  Files: src/widgets/OnboardingModal/ui/OnboardingModal.tsx, src/widgets/PersonaSettings/ui/PersonaSettings.tsx

  Current State

  - Welcome → Experience selector → Settings wizard
  - Abstraction levels: Simple/Standard/Advanced
  - Auto-save frequency, base URL, metadata complexity

  Ideal UX
  Element: Interactive tour
  Ideal: Step-by-step guided walkthrough with spotlight on UI elements
  Current: Static modal
  Status: [GAP]
  ────────────────────────────────────────
  Element: Sample project
  Ideal: Load demo IIIF manifest to explore features
  Current: Not implemented
  Status: [GAP]
  ────────────────────────────────────────
  Element: Progressive disclosure
  Ideal: Unlock features as user gains experience
  Current: Static level selection
  Status: [GAP]
  ────────────────────────────────────────
  Element: Persona presets
  Ideal: "Archivist", "Researcher", "Developer" with tuned defaults
  Current: Simple/Standard/Advanced mapping
  Status: [OK]
  ────────────────────────────────────────
  Element: Theme selection
  Ideal: Choose theme during onboarding
  Current: Not in onboarding flow
  Status: [GAP]
  ---
  15. AUTH DIALOG

  File: src/widgets/AuthDialog/ui/AuthDialog.tsx

  Current State

  - IIIF Auth 2.0 probe flow
  - Login button → token exchange
  - Degraded content fallback
  - Error handling
  - No token persistence (lost on reload)

  Ideal UX
  Element: Token persistence
  Ideal: Store in sessionStorage with expiry
  Current: In-memory Map (lost on reload)
  Status: [GAP]
  ────────────────────────────────────────
  Element: Multi-resource auth
  Ideal: Batch auth for manifests from same institution
  Current: Per-resource probing
  Status: [GAP]
  ────────────────────────────────────────
  Element: Status indicator
  Ideal: Lock/unlock icon on authenticated resources in archive
  Current: No visual indicator
  Status: [GAP]
  ────────────────────────────────────────
  Element: Auto-retry
  Ideal: Automatically retry with stored token on 401
  Current: Manual retry button
  Status: [PARTIAL]
  ---
  16. STATUS BAR

  File: src/widgets/StatusBar/ui/organisms/StatusBar.tsx

  Current State

  - Item count, selection count
  - Save status indicator (pulsing/green/red)
  - Validation error/warning count (clickable)
  - Storage usage bar
  - Quick help toggle, keyboard shortcuts button

  Ideal UX
  ┌───────────────────┬────────────────────────────────────────────────────────┬──────────────────┬───────────┐
  │      Element      │                         Ideal                          │     Current      │  Status   │
  ├───────────────────┼────────────────────────────────────────────────────────┼──────────────────┼───────────┤
  │ Activity feed     │ Expandable log of recent actions with timestamps       │ Save status only │ [GAP]     │
  ├───────────────────┼────────────────────────────────────────────────────────┼──────────────────┼───────────┤
  │ Storage breakdown │ Pie chart of storage by type (images, audio, metadata) │ Single bar       │ [PARTIAL] │
  ├───────────────────┼────────────────────────────────────────────────────────┼──────────────────┼───────────┤
  │ Undo indicator    │ "Last action: added canvas. Undo?" in status bar       │ Not shown        │ [GAP]     │
  ├───────────────────┼────────────────────────────────────────────────────────┼──────────────────┼───────────┤
  │ Performance stats │ Frame rate, memory usage for power users               │ Not implemented  │ [GAP]     │
  ├───────────────────┼────────────────────────────────────────────────────────┼──────────────────┼───────────┤
  │ Network status    │ Online/offline indicator, sync status                  │ Not implemented  │ [GAP]     │
  └───────────────────┴────────────────────────────────────────────────────────┴──────────────────┴───────────┘
  ---
  17. SHARED ATOMS & MOLECULES — Cross-Cutting Concerns

  Current Strengths

  - Strict atomic design (atoms zero-logic, molecules minimal state)
  - Comprehensive ARIA roles, labels, keyboard handling
  - useFocusTrap for modals, useKeyboardNav for lists
  - useReducedMotion respects accessibility preferences
  - Field Mode (high-contrast yellow/black) across all components
  - Theme system with CSS custom properties
  - Toast notifications with type-specific styling and auto-dismiss

  Cross-Cutting Gaps
  ┌────────────────┬───────────────────────────────────────────┬─────────────────────────────────────────┬───────────┐
  │    Concern     │                   Ideal                   │                 Current                 │  Status   │
  ├────────────────┼───────────────────────────────────────────┼─────────────────────────────────────────┼───────────┤
  │ Skeleton       │ Consistent skeleton placeholders for all  │ LoadingState has skeleton option,       │ [PARTIAL] │
  │ loading        │ async content                             │ rarely used                             │           │
  ├────────────────┼───────────────────────────────────────────┼─────────────────────────────────────────┼───────────┤
  │ Error states   │ Per-component error boundaries with retry │ ErrorBoundary exists, ViewErrorFallback │ [OK]      │
  │                │                                           │  per view                               │           │
  ├────────────────┼───────────────────────────────────────────┼─────────────────────────────────────────┼───────────┤
  │ Empty states   │ Consistent illustration + action CTA for  │ Some views have, others show plain text │ [PARTIAL] │
  │                │ every view                                │                                         │           │
  ├────────────────┼───────────────────────────────────────────┼─────────────────────────────────────────┼───────────┤
  │ Transitions    │ Smooth enter/exit animations on panels,   │ fade-in zoom-in-95 on some, none on     │ [PARTIAL] │
  │                │ modals, views                             │ view switches                           │           │
  ├────────────────┼───────────────────────────────────────────┼─────────────────────────────────────────┼───────────┤
  │ Focus          │ Visible focus rings on all interactive    │ Tailwind focus rings present            │ [OK]      │
  │ indicators     │ elements                                  │                                         │           │
  ├────────────────┼───────────────────────────────────────────┼─────────────────────────────────────────┼───────────┤
  │ Touch targets  │ 44x44px minimum for mobile                │ Varies, some buttons smaller            │ [PARTIAL] │
  ├────────────────┼───────────────────────────────────────────┼─────────────────────────────────────────┼───────────┤
  │ Responsive     │ Fluid layouts for all breakpoints         │ Some views responsive, others           │ [PARTIAL] │
  │                │                                           │ desktop-only                            │           │
  ├────────────────┼───────────────────────────────────────────┼─────────────────────────────────────────┼───────────┤
  │ Dark mode      │ Full dark theme beyond field mode         │ Dark theme exists via theme system      │ [OK]      │
  └────────────────┴───────────────────────────────────────────┴─────────────────────────────────────────┴───────────┘
  ---
  18. DATA FLOW & PERFORMANCE — Systemic Concerns

  Current Architecture Strengths

  - Normalized vault with O(1) lookups
  - Split context (state vs dispatch) prevents unnecessary re-renders
  - Gzip-compressed IndexedDB persistence
  - Dual storage (IndexedDB + OPFS) for different file sizes
  - Worker pool for ingest (4 workers)
  - 30s auto-save interval
  - Lossless round-trip (extensions preserve unknown IIIF properties)

  Systemic Gaps
  ┌─────────────────────┬─────────────────────────────────────┬───────────────────────────┬──────────────────────────┐
  │       Concern       │                Ideal                │          Current          │          Status          │
  ├─────────────────────┼─────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
  │ Main thread         │ Use CompressionStream API in Worker │ Gzip on main thread       │ [GAP] — potential jank   │
  │ compression         │                                     │                           │ on large projects        │
  ├─────────────────────┼─────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
  │ Search index        │ Persist FlexSearch index in         │ Rebuild on every load     │ [GAP]                    │
  │ persistence         │ IndexedDB, incremental update       │                           │                          │
  ├─────────────────────┼─────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
  │ Optimistic updates  │ UI updates immediately, persistence │ UI waits for state update │ [PARTIAL] — dispatch is  │
  │                     │  async                              │                           │ synchronous              │
  ├─────────────────────┼─────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
  │ Selective re-render │ Only re-render affected subtree on  │ exportRoot() reconstructs │ [GAP]                    │
  │                     │ entity update                       │  full tree on any change  │                          │
  ├─────────────────────┼─────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
  │ Worker-based        │ Offload tree reconstruction to      │ Main thread               │ [GAP] for large archives │
  │ denormalization     │ worker                              │                           │                          │
  ├─────────────────────┼─────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
  │ Undo granularity    │ Coalesce rapid edits (typing) into  │ Every dispatch = undo     │ [GAP]                    │
  │                     │ single undo step                    │ step                      │                          │
  ├─────────────────────┼─────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
  │ Auth token          │ sessionStorage with expiry checks   │ In-memory Map             │ [GAP]                    │
  │ persistence         │                                     │                           │                          │
  ├─────────────────────┼─────────────────────────────────────┼───────────────────────────┼──────────────────────────┤
  │ Content State deep  │ Full Content State 1.0 parsing      │                           │ [PARTIAL] — service      │
  │ link                │ (canvas, range, annotation target)  │ Hash-based canvasId only  │ exists but not fully     │
  │                     │                                     │                           │ wired                    │
  └─────────────────────┴─────────────────────────────────────┴───────────────────────────┴──────────────────────────┘
  ---
  Summary: Priority Matrix

  High Impact, Feasible Now

  1. Search index persistence — avoid rebuild on every load
  2. Metadata table virtualization — breaks at ~200 items
  3. Sidebar collapse to icon rail — major space recovery on small screens
  4. Result highlighting in search — basic UX expectation
  5. Auth token persistence — reload loses tokens
  6. Hover preview on archive grid — high-value low-effort

  High Impact, Medium Effort

  7. Real map tiles — grid background severely limits map utility
  8. Column resize/reorder in metadata — spreadsheet baseline expectation
  9. Structure tree context menu — right-click is natural for tree operations
  10. Undo coalescing — typing creates hundreds of undo steps
  11. Comparison mode in viewer — common archival workflow
  12. Bulk fix preview in QC — safety before batch operations

  Aspirational

  13. Collaborative editing — multi-user boards
  14. Interactive onboarding tour — spotlight-based walkthrough
  15. Presentation mode — boards as slide decks
  16. Measurement tools — ruler/scale for documents
  17. Path/route on map — travel visualization
  18. Audio waveform — visual audio editing


