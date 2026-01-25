
# UX Specification: Affordances and Interaction Patterns

This section defines the user experience patterns, affordances, and interaction design based on established patterns from IIIF viewers (Mirador, Universal Viewer), manifest editors (Digirati Manifest Editor, Bodleian Manifest Editor), digital asset management systems, and spatial canvas tools (Figma, Miro).

---

## Design Principles

### 1. Progressive Disclosure
- Show essential information by default; hide complexity
- "Simple" and "Advanced" mode toggle in settings
- Expandable panels for detailed metadata
- Contextual help with `?` icons linking to IIIF specification

### 2. Visual Teaching of IIIF Concepts
- The UI should convey IIIF structure through visual design
- Users develop understanding through exploration, not documentation
- Use familiar metaphors: "Slide" for Canvas, "Album" for Manifest, "Folder" for Collection

### 3. Forgiving Interaction
- Undo/redo for all operations (min 100 steps)
- Non-destructive editing (original files never modified)
- Auto-save with manual save confirmation
- Clear visual feedback for all actions

### 4. Accessibility First
- WCAG 2.1 AA compliance minimum
- Keyboard navigation for all functions
- Screen reader compatibility
- Configurable zoom, contrast, and animation preferences

---

## Core Navigation Patterns

### Sidebar Navigation

```
┌─────────────────┐
│ 🏠 Home         │  ← Return to dashboard
├─────────────────┤
│ 📦 Archive      │  ← Asset library (source materials)
│ 📚 Collections  │  ← Manifests and Collections
│ 🎯 Boards       │  ← Relationship mapping canvases
│ 🔍 Search       │  ← Content Search API interface
├─────────────────┤
│ ⚙️ Settings     │  ← Application preferences
│ ❓ Help         │  ← Documentation and tutorials
└─────────────────┘
```

**Affordances:**
- Icons + text labels (text can be hidden in collapsed mode)
- Current section highlighted with accent color + left border
- Hover state shows tooltip with description
- Keyboard: `Cmd/Ctrl + 1-5` to switch sections

### Breadcrumb Navigation

For hierarchical content (Collections, Ranges):

```
Home > Collections > "Medieval Manuscripts" > "MS 123" > Canvas 5
```

**Affordances:**
- Each segment is clickable
- Current location is not a link (bold text)
- Truncation with ellipsis for long labels, full text on hover
- Dropdown on hover showing siblings at each level

---

## Archive Browser UX

### View Modes

| Mode | Icon | Description | Use Case |
|------|------|-------------|----------|
| Grid | ⊞ | Thumbnail grid, adjustable size | Visual browsing |
| List | ≡ | Table with sortable columns | Metadata review |
| Timeline | ═ | Items on temporal axis | Date-based exploration |
| Map | 🗺 | Geographic placement | Location-based content |

**Grid View Specifics:**
- Thumbnail size slider (50px - 300px)
- Lazy loading with placeholder shimmer
- Selection: Click to select, Cmd/Ctrl+Click for multi-select, Shift+Click for range
- Drag selection rectangle for bulk selection
- Right-click context menu

**List View Columns:**
- Thumbnail (fixed)
- Label (sortable)
- Date (sortable, `navDate`)
- Type (filterable)
- Size (sortable)
- Tags (filterable)
- Actions (…)

### Filtering and Search

**Filter Bar:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search...  │ Type: ▾ │ Date: ▾ │ Tags: ▾ │ ✕ Clear All │
└─────────────────────────────────────────────────────────────┘
```

**Affordances:**
- Instant search-as-you-type (debounced 300ms)
- Filter chips appear below bar showing active filters
- Click chip `×` to remove individual filter
- "Clear All" resets to unfiltered state
- Saved searches/filters for repeated use

### Drag and Drop Ingest

**Drop Zone States:**

| State | Visual | Feedback |
|-------|--------|----------|
| Idle | Subtle dashed border | "Drag files here to import" |
| Drag over | Highlighted border, background tint | "Drop to import X files" |
| Processing | Progress bar | "Importing... 3/10 files" |
| Complete | Success checkmark | "10 files imported" (auto-dismiss 3s) |
| Error | Error icon | "2 files failed" with expandable details |

**Accepted Content:**
- Files dragged from OS file manager
- Images dragged from web browser
- IIIF Manifest URLs (auto-fetch and import)
- Folders (recursive import with confirmation)

---

## Collection Editor UX

### Canvas Management

**Visual Representation:**
```
┌─────────────────────────────────────────────┐
│  Collection: "Medieval Manuscripts"         │
├─────────────────────────────────────────────┤
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐       │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ + │       │
│  │   │ │   │ │   │ │   │ │   │ │   │       │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘       │
│                                             │
│  ← Drag to reorder | Click to select →      │
└─────────────────────────────────────────────┘
```

**Affordances:**
- Thumbnails represent Canvases
- Drag handle appears on hover (grip icon)
- Drag-and-drop reordering with insertion indicator
- Multi-select with Cmd/Ctrl+Click
- `+` button opens "Add Canvas" panel
- Double-click opens Canvas in Item Viewer
- Right-click context menu: Edit, Duplicate, Delete, Move to...

### Metadata Editor Panel

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Manifest Metadata                     [X]   │
├─────────────────────────────────────────────┤
│ ┌─Descriptive─┬─Metadata─┬─Technical─┬─Links─┐
│                                             │
│ Label *                                     │
│ ┌───────────────────────────────────────┐   │
│ │ Medieval Manuscript Collection        │   │
│ └───────────────────────────────────────┘   │
│ + Add translation                           │
│                                             │
│ Summary                                     │
│ ┌───────────────────────────────────────┐   │
│ │ A collection of 12th century...       │   │
│ │                                       │   │
│ └───────────────────────────────────────┘   │
│ Supports <b>HTML</b> formatting             │
│                                             │
│ Rights *                                    │
│ ┌───────────────────────────────────────┐   │
│ │ CC BY 4.0                          ▾  │   │
│ └───────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**Affordances:**
- Tab navigation between property groups
- Required fields marked with `*`
- Inline validation with error messages
- Multilingual fields show language selector
- Rights dropdown with Creative Commons presets
- Auto-save indicator (saved ✓ / saving... / unsaved •)

### Range Editor (Table of Contents)

**Visual Tree Builder:**
```
┌─────────────────────────────────────────────┐
│ Structure                              [+]   │
├─────────────────────────────────────────────┤
│ ▼ Table of Contents                         │
│   ├─ Introduction (Canvas 1-3)              │
│   ├─ ▼ Chapter 1: Origins                   │
│   │   ├─ Section 1.1 (Canvas 4-8)           │
│   │   └─ Section 1.2 (Canvas 9-12)          │
│   └─ Chapter 2: Development (Canvas 13-20)  │
└─────────────────────────────────────────────┘
```

**Affordances (from Digirati Manifest Editor patterns):**
- Tree view with expand/collapse
- Drag-and-drop nesting (indent/outdent)
- Click to select, double-click to rename
- Canvas range shown in parentheses
- Visual indicator of which Canvases are covered
- "+" button at each level for adding children
- Right-click: Add sibling, Add child, Delete, Edit

---

## Board Canvas UX (Infinite Canvas)

### Canvas Navigation

**Patterns from Figma/Miro:**

| Action | Mouse | Trackpad | Keyboard |
|--------|-------|----------|----------|
| Pan | Middle-click drag | Two-finger drag | Arrow keys |
| Zoom | Scroll wheel (with Ctrl) | Pinch | `+` / `-` |
| Zoom to fit | — | — | `Shift + 1` |
| Zoom to selection | — | — | `Shift + 2` |
| Zoom 100% | — | — | `Ctrl/Cmd + 0` |

**Configurable Controls:**
- "Scroll to zoom" toggle (accessibility concern for content below viewer)
- "Trackpad mode" vs "Mouse mode" preference
- Zoom speed slider
- Pan inertia on/off

### Minimap

```
┌─────────────────────────────────┐
│                                 │
│     Main Canvas                 │
│                                 │
│                    ┌────────┐   │
│                    │Minimap │   │
│                    │ ┌──┐   │   │
│                    │ │▓▓│   │   │
│                    │ └──┘   │   │
│                    └────────┘   │
└─────────────────────────────────┘
```

**Affordances:**
- Shows full board extent
- Viewport rectangle (draggable)
- Click to jump to location
- Collapsible (remembers state)
- Position: configurable corner

### Placing Items on Board

**Drag from Sidebar:**
1. User drags item from Archive/Collection sidebar
2. Ghost preview follows cursor
3. Drop zone highlights on board
4. Release places item at cursor position
5. Item appears with subtle scale animation

**Paste from Clipboard:**
1. User pastes (Cmd/Ctrl+V)
2. Image appears at center of viewport
3. Optional: paste at cursor position (Shift+Cmd/Ctrl+V)

**Add via Search:**
1. Double-click empty space
2. Quick search modal appears
3. Type to search archive
4. Select item to place

### Item Display Modes on Board

| Mode | Display | Use Case |
|------|---------|----------|
| Full Viewer | Interactive IIIF viewer | Deep examination |
| Thumbnail | Static preview | Overview |
| Icon + Label | Minimal footprint | Dense boards |
| Collapsed | Icon only | Maximum density |

**Toggle:** Click display mode button in item header

### Connection Drawing

**Connection Tool Flow:**
1. Select connection tool (C key or toolbar)
2. Cursor changes to crosshair
3. Click source (item or region within item)
4. Drag line to target
5. Click target to complete
6. Connection type popup appears
7. Select type and optional label
8. Connection renders with configured style

**Connection Appearance:**

| Type | Line Style | Color (default) | Arrowhead |
|------|------------|-----------------|-----------|
| Depicts | Solid | Blue | Single |
| Transcribes | Dashed | Green | Single |
| Relates to | Dotted | Gray | None |
| Contradicts | Solid | Red | Double |
| Precedes | Solid | Purple | Single |

**Connection Editing:**
- Click connection to select
- Drag endpoints to reconnect
- Double-click to edit label
- Delete key to remove
- Right-click: Change type, Edit, Delete

### Region Selection within Board Items

**"Enter" Item Mode:**
1. Double-click item on board
2. Item expands to fill viewport
3. Full annotation tools available
4. ESC or click outside to exit
5. Board view restored with item highlighted

**Quick Region Selection:**
1. Hold Shift + drag on item
2. Rectangle selection appears
3. Release to create SpecificResource
4. Can be used as connection endpoint

---

## Item Viewer UX

### Deep Zoom Image Viewer

**Based on OpenSeadragon patterns:**

**Toolbar:**
```
┌────────────────────────────────────────────────────────┐
│ 🔍+ │ 🔍- │ 🏠 │ ↺ │ 📐 │ ◐ │ 💬 │ ⬇️ │ ⋯ │
│ Zoom│Zoom │Home│Rot│Full│Over│Anno│Down│More│
│ In  │Out  │    │ate│scr │lay │tate│load│    │
└────────────────────────────────────────────────────────┘
```

**Navigation:**
- Click+drag to pan
- Double-click to zoom in at point
- Mouse wheel to zoom (centered on cursor)
- Keyboard: arrows pan, +/- zoom

**Rotation:**
- 90° snap by default
- Hold Shift for free rotation
- Rotation indicator shows current angle

### Annotation Overlay

**Annotation Display:**
```
┌──────────────────────────────────────────┐
│                                          │
│    Image with annotation regions         │
│                                          │
│      ┌─────────┐                         │
│      │ Region 1│ ← Semi-transparent fill │
│      └─────────┘   Color by motivation   │
│                                          │
│           ┌─────────┐                    │
│           │ Region 2│                    │
│           └─────────┘                    │
│                                          │
└──────────────────────────────────────────┘
```

**Hover State:**
- Increased opacity
- Tooltip with annotation preview
- Cursor: pointer

**Click Behavior:**
1. Click annotation region
2. Smooth animated zoom to region
3. Region fills viewport with padding (configurable %)
4. Annotation panel scrolls to highlight entry
5. If linking motivation, show "Go to linked item" button

### Annotation Tools

**Toolbar:**
```
┌──────────────────────────────────────────┐
│ ▢ │ ⬡ │ ✎ │ • │ T │ 🏷 │ ↗ │
│Rect│Poly│Free│Pnt│Text│Tag │Link│
└──────────────────────────────────────────┘
```

**Drawing Affordances:**

| Tool | Action | Feedback |
|------|--------|----------|
| Rectangle | Click+drag | Rubber band rectangle |
| Polygon | Click points, double-click to close | Line segments with vertices |
| Freehand | Click+drag continuously | Smooth path following cursor |
| Point | Single click | Crosshair snaps to click |
| Text | Click to place, type | Text cursor with input field |

**After Drawing:**
1. Shape appears with class selector
2. Select motivation from dropdown
3. Enter annotation body (text)
4. Optional: add tags, links
5. Save or Cancel

### Annotation List Panel

```
┌─────────────────────────────────────────────┐
│ Annotations (12)                    🔍 ⚙️    │
├─────────────────────────────────────────────┤
│ Sort: Position ▾ │ Filter: All ▾            │
├─────────────────────────────────────────────┤
│ ┌─ commenting ──────────────────────────┐   │
│ │ 1. "This appears to be a later..."    │   │
│ │    by Jane R. • 2 days ago            │   │
│ └───────────────────────────────────────┘   │
│ ┌─ transcribing ────────────────────────┐   │
│ │ 2. "In principio erat verbum..."      │   │
│ │    by OCR • auto-generated            │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Affordances:**
- Color-coded by motivation
- Click to zoom to annotation
- Hover to highlight on image
- Edit/delete via hover icons or right-click
- Drag to reorder (if applicable)

---

## Time-Based Media UX

### Audio/Video Player

**Timeline Interface:**
```
┌─────────────────────────────────────────────────────────────┐
│ ▶ │ 00:45 / 03:22 │ 🔊━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ 1x ▾ │
├─────────────────────────────────────────────────────────────┤
│ ════════════●════════════════════════════════════════════   │
│     ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │
│     └─Annotation 1─┘    └──Annotation 2──┘                  │
└─────────────────────────────────────────────────────────────┘
```

**Annotation on Timeline:**
- Colored bars below playhead
- Click annotation bar to jump to start
- Hover shows annotation preview
- Drag edges to adjust time range

**Creating Time Annotations:**
1. Play/scrub to start point
2. Press `I` to mark in-point
3. Play/scrub to end point
4. Press `O` to mark out-point
5. Annotation form appears

---

## Search and Discovery UX

### Global Search (Content Search API)

**Search Interface:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Search across all content...                              │
├─────────────────────────────────────────────────────────────┤
│ Scope: ○ Everything ● This Collection ○ This Item           │
│ Type:  ☑ Metadata ☑ Annotations ☑ Full text (OCR)          │
└─────────────────────────────────────────────────────────────┘
```

**Search Results:**
```
┌─────────────────────────────────────────────────────────────┐
│ Results for "illuminated" (47 matches)                      │
├─────────────────────────────────────────────────────────────┤
│ ┌───┐ MS 123, Canvas 5                                      │
│ │ 🖼 │ "...the illuminated initial shows..."                │
│ └───┘ Annotation by Jane R. • Medieval Manuscripts          │
├─────────────────────────────────────────────────────────────┤
│ ┌───┐ MS 456, Canvas 12                                     │
│ │ 🖼 │ "Illuminated border with foliate design"             │
│ └───┘ OCR transcription • French Books of Hours            │
└─────────────────────────────────────────────────────────────┘
```

**Affordances:**
- Instant search with debounce
- Keyword highlighting in results
- Thumbnail preview
- Click result to navigate to item+region
- "Search within results" refinement

---

## Feedback and Status

### Loading States

| State | Visual | Description |
|-------|--------|-------------|
| Initial load | Skeleton shimmer | Gray placeholder shapes |
| Image loading | Progressive JPEG / blur-up | Low-res → high-res |
| Processing | Progress bar + percentage | "Processing tiles... 45%" |
| Saving | Spinner + "Saving..." | Brief, non-blocking |

### Error Handling

**Error Toast Pattern:**
```
┌─────────────────────────────────────────────┐
│ ⚠️ Failed to load image                      │
│ Network error. Check your connection.       │
│                              [Retry] [Dismiss] │
└─────────────────────────────────────────────┘
```

**Affordances:**
- Non-blocking (user can continue)
- Auto-dismiss after 5s (unless error)
- Stack multiple toasts
- Click to expand details
- Retry action where applicable

### Success Feedback

- Subtle checkmark animation
- Brief toast "Saved" / "Exported"
- Visual change confirmation (item appears in list)
- Sound feedback (optional, off by default)

---

## Onboarding and Help

### First-Run Experience

**Step 1: Welcome**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              Welcome to IIIF Field Archive Studio           │
│                                                             │
│    Organize, annotate, and connect your research materials  │
│                                                             │
│              [ Get Started ] [ Skip Tutorial ]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Step 2: Create First Project**
- Guided project creation
- Import sample content option
- Template selection (Archaeological, Documentary, etc.)

**Step 3: Quick Tour**
- Highlight key UI elements
- 3-5 steps maximum
- Skip at any time
- Don't repeat (remember in preferences)

### Contextual Help

**Tooltip Help:**
- `?` icon next to complex controls
- Hover reveals explanation
- Link to full documentation

**Empty State Guidance:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    📦 No items yet                          │
│                                                             │
│    Drag and drop files here to start your archive           │
│                                                             │
│    Or: [Import from folder] [Import IIIF Manifest]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Responsive Behavior

### Panel Layout

**Desktop (>1200px):**
- Sidebar + Main + Properties panel
- All three visible simultaneously

**Tablet (768-1200px):**
- Collapsible sidebar (hamburger menu)
- Properties panel as overlay

**Narrow (<768px):**
- Single column layout
- Bottom navigation bar
- Full-screen viewers

### Touch Adaptations

| Mouse Action | Touch Equivalent |
|--------------|------------------|
| Hover | Long press |
| Right-click | Long press menu |
| Drag | Touch and drag |
| Double-click | Double tap |
| Scroll | Swipe |
| Pinch zoom | Two-finger pinch |

---

## Accessibility Compliance

### Keyboard Navigation

**Focus Management:**
- Visible focus indicator (2px outline)
- Logical tab order
- Skip links for main content
- Trap focus in modals

**Keyboard Shortcuts (Global):**

| Action | Shortcut |
|--------|----------|
| Open command palette | `Cmd/Ctrl + K` |
| Save | `Cmd/Ctrl + S` |
| Undo | `Cmd/Ctrl + Z` |
| Redo | `Cmd/Ctrl + Shift + Z` |
| Search | `Cmd/Ctrl + F` |
| Close panel/modal | `Escape` |
| Help | `F1` or `?` |

### Screen Reader Support

- Semantic HTML structure
- ARIA landmarks and labels
- Live regions for status updates
- Alt text for all images
- Announce loading/processing states

### Reduced Motion

- Respect `prefers-reduced-motion`
- Disable parallax, spring animations
- Instant transitions
- Static loading indicators

### Color and Contrast

- 4.5:1 minimum contrast ratio
- Don't rely on color alone
- Colorblind-safe palette option
- High contrast mode

---

## Performance Patterns

### Lazy Loading

- Images: Load only visible + 1 screen buffer
- Annotations: Load on Canvas visibility
- Metadata: Load on panel open
- Tiles: Progressive loading (low-res → high-res)

### Optimistic Updates

- Show change immediately
- Sync in background
- Revert on failure with notification

### Caching Strategy

- Tile cache: configurable size (default 1GB)
- Manifest cache: 24-hour TTL
- Annotation cache: invalidate on edit
- Offline support: mark items for offline use

---

## References

- [IIIF Image API 3.0](https://iiif.io/api/image/3.0/)
- [IIIF Presentation API 3.0](https://iiif.io/api/presentation/3.0/)
- [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)
- [W3C Web Annotation Protocol](https://www.w3.org/TR/annotation-protocol/)
- [IIIF Content Search API 2.0](https://iiif.io/api/search/2.0/)
- [IIIF Change Discovery API 1.0](https://iiif.io/api/discovery/1.0/)
- [IIIF Authorization Flow API 2.0](https://iiif.io/api/auth/2.0/)
- [IIIF Cookbook](https://iiif.io/api/cookbook/)
- [Media Fragments URI 1.0](https://www.w3.org/TR/media-frags/)

### UX Pattern Sources

- [Mirador Viewer](https://projectmirador.org/) — Multi-window IIIF viewer with annotation support
- [Universal Viewer](https://universalviewer.io/) — Flexible IIIF presentation viewer
- [Digirati Manifest Editor](https://manifest-editor.digirati.services/) — IIIF Manifest creation and editing
- [Bodleian Manifest Editor](https://digital.bodleian.ox.ac.uk/manifest-editor/) — Web-based manifest generator
- [CRKN IIIF UX Study](https://crkn-rcdr.gitbook.io/user-centered-design/) — Accessibility and usability research
- [Figma](https://figma.com/) — Collaborative design tool (canvas navigation patterns)
- [Miro](https://miro.com/) — Online whiteboard (infinite canvas, collaboration patterns)
- [OpenSeadragon](https://openseadragon.github.io/) — Deep zoom image viewer (pan/zoom interactions)


