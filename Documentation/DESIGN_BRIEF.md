# Field Studio — Design Brief
## IIIF Archive Making Tool

---

## 1. Project Overview

### Vision
Create a **local-first, browser-based workbench** that bridges the gap between messy field data (raw photos, recordings, notes) and structured archival objects compliant with IIIF (International Image Interoperability Framework) standards. The tool should empower researchers, archivists, and developers to organize, annotate, and publish cultural heritage materials without requiring server infrastructure or command-line expertise.

### Target Users
- **Field Researchers** — Archaeologists, ethnographers, historians capturing media in remote locations
- **Digital Archivists** — Professionals needing to structure and publish collections
- **Developers** — Technical users building IIIF-compatible applications

### Core Value Proposition
**"Your archive, your browser, your standards."** — A complete IIIF ecosystem that runs entirely client-side, transforming scattered files into publishable, interoperable cultural heritage data.

---

## 2. Problem Statement

### Current Pain Points
1. **The IIIF Learning Curve** — Creating valid IIIF manifests requires deep JSON knowledge and specification understanding
2. **Tool Fragmentation** — Researchers use separate tools for: file organization, metadata entry, image tiling, annotation, and publishing
3. **Server Dependency** — Most IIIF tools require backend infrastructure, making field work and offline usage impossible
4. **File-to-Archive Gap** — No seamless path from "folder of photos on my laptop" to "published IIIF collection"
5. **Spatial Thinking Missing** — Existing tools don't support visual relationship mapping between items

### Success Criteria
- A researcher can import a folder of 500 photos and generate a valid IIIF Collection in under 5 minutes
- All processing happens locally — no file uploads, no cloud dependencies
- Export produces ready-to-deploy packages (static sites, archival formats)
- Full compliance with IIIF Image API 3.0, Presentation API 3.0, and W3C Web Annotation

---

## 3. Functional Requirements

### 3.1 Ingest & Staging (The "Front Door")
**User Story:** *As a researcher returning from the field, I want to dump my camera's contents and have the system suggest how to structure them.*

**Requirements:**
- Drag-and-drop or file picker import of entire folder hierarchies
- Automatic media type detection (images, audio, video)
- Smart structure analysis: suggest Collections vs Manifests based on folder patterns
- Filename pattern recognition (sequential numbering, timestamps) to suggest canvas ordering
- **Two-pane staging workbench**: preserve original upload structure on left (Source Manifests), build archive structure on right (Archive Layout)
- Multi-select with range selection (Shift+click) for batch operations
- Drag-and-drop from source to archive collections
- Send-to-collection modal for organizing selected manifests
- Manual manifest builder for edge cases
- EXIF metadata extraction (GPS, timestamps, camera info)
- Duplicate detection via SHA-256 file hashing
- Progress tracking for large imports with background tile generation
- Metadata template export (CSV) for pre-populating descriptions before ingest

### 3.2 Archive Management (The "Backbone")
**User Story:** *As an archivist, I want to organize materials hierarchically without losing the original folder structure.*

**Requirements:**
- Tree-based navigation showing Collections → Manifests → Canvases
- Drag-and-drop reordering within and between containers
- Multi-select for batch operations (delete, move, edit metadata)
- Virtual collections: same manifest can exist in multiple collections without duplication
- Persistent state with auto-save to IndexedDB
- Undo/redo with history management
- URL deep linking (shareable links to specific items/modes)

### 3.3 Metadata Workflows (The "Catalog")
**User Story:** *As a cataloger, I want to describe items efficiently using standards-compliant fields.*

**Requirements:**
- Three persona modes with different field visibility:
  - **Simple** — Essential fields only (label, description, rights)
  - **Standard** — Full Dublin Core + IIIF common properties
  - **Advanced** — All IIIF 3.0 properties including technical fields
- Multi-language support for all text fields (language maps per IIIF spec)
- Batch metadata editor with spreadsheet-like interface
- CSV import/export for round-trip metadata editing
- Template-based metadata assignment during ingest
- Rights/license dropdown with Creative Commons presets
- Required statement (attribution) enforcement

### 3.4 Visual Organization (The "Board")
**User Story:** *As a researcher, I want to arrange items spatially to show relationships and create narrative layouts.*

**Requirements:**
- Infinite canvas for free-form arrangement of items
- Pan and zoom navigation (middle-click pan, scroll zoom)
- Layer management with opacity and locking controls
- Multiple board support (different views of same archive)
- Export boards as IIIF manifests with annotations
- Grid/snap options for alignment

### 3.5 IIIF Viewer (The "Lens")
**User Story:** *As a user, I want to preview my materials exactly as they'll appear in IIIF viewers.*

**Requirements:**
- Built-in viewer supporting Image API 3.0 with deep zoom
- Multi-page navigation for manifests
- Annotation display and creation
- Content Search 2.0 integration (search within text annotations)
- Georeference display on maps (navPlace)
- Audio/video playback with time-based annotations
- Comparison mode (side-by-side canvases)
- Canvas Composer for arranging multi-image layouts

### 3.6 Annotation Environment (The "Markup")
**User Story:** *As a researcher, I want to add notes, transcriptions, and links directly on media.*

**Requirements:**
- W3C Web Annotation Data Model compliance
- Multiple annotation motivations: commenting, transcribing, tagging, identifying, linking
- Spatial annotations: points, rectangles, polygons, SVG selectors
- Temporal annotations for time-based media
- Textual body support (markdown/plain text)
- External resource linking
- Annotation pages for organization

### 3.7 Export & Publishing (The "Exit")
**User Story:** *As a publisher, I want to generate deployable packages in multiple formats.*

**Requirements:**
- **Canopy static site** — Pre-configured Next.js site with search, browse, and viewer
- **Raw IIIF** — JSON manifests + tiled images for any IIIF viewer
- **OCFL** — Oxford Common File Layout for repository deposit
- **BagIt** — Library of Congress preservation format
- **Activity Stream** — IIIF Change Discovery API feed
- Export dry-run with validation report
- Integrity checking (checksums for all assets)
- Configurable base URLs for different deployment targets
- Lunr.js index export for static site search (WAX-compatible)

### 3.8 Quality Control (The "Safety Net")
**User Story:** *As a collection manager, I want to identify and fix issues before publishing.*

**Requirements:**
- Real-time validation against IIIF 3.0 specification
- Issue dashboard with severity levels (error, warning, info)
- Categorized issues: Identity & IDs, Hierarchy, Labels & Descriptive, Media & Technical
- One-click navigation from issue to affected item
- Auto-heal suggestions for common problems with single-click fixes
- **Heal All Fixable** button for batch repairs
- Health score calculation (0-100% based on error count)
- Issue preview panel showing affected item details and breadcrumb path
- Manual field editing directly from QC dashboard

---

## 4. Technical Architecture

### 4.1 Core Principles
- **Local-First** — All data stays in browser; no server required
- **Standards-Native** — IIIF isn't an export format, it's the internal data model
- **Progressive Enhancement** — Works offline, enhanced when connected
- **Performance at Scale** — Handle 10,000+ items without degradation

### 4.2 Data Layer
- **IIIF Vault** — Normalized store for all IIIF resources using flat entity storage with O(1) lookups
  - Entities stored by type and ID (Collection, Manifest, Canvas, Range, AnnotationPage, Annotation)
  - References maintain parent-child relationships
  - Collection membership tracking (many-to-many relationships)
  - Extension preservation for round-tripping vendor-specific properties
- **IndexedDB** — Persistent storage with structured cloning via idb library
- **Service Worker** (`sw.js`) — Intercepts `/iiif/image/*` requests to serve tiles from IndexedDB
  - IIIF Image API 3.0 Level 2 compliance
  - Handles region, size, rotation, quality, and format parameters
  - Communicates with main thread via MessageChannel for search queries
- **File Integrity** — SHA-256 hashing for deduplication and verification

### 4.3 Image Pipeline
- **Tile Generation** — Web Worker pool for parallel processing
- **Derivative Sizes** — Thumbnail, small, medium presets
- **Format Support** — JPEG, PNG, WebP (with fallbacks)
- **IIIF Image API 3.0** — Level 2 compliance (region, size, rotation, quality, format)

### 4.4 Frontend Stack
- **Framework** — React 19 with TypeScript (StrictMode)
- **Build Tool** — Vite for fast development and optimized builds
- **State Management** — Custom hooks + Context (no Redux); Vault pattern for normalized IIIF data
- **Styling** — Tailwind CSS with design system tokens
- **Icons** — Material Symbols
- **Search** — FlexSearch.js for client-side full-text search with autocomplete
- **Web Workers**:
  - Validation worker for non-blocking IIIF validation
  - Tile worker pool for parallel image processing
- **Custom Hooks**:
  - `useVault` — Normalized IIIF state management with undo/redo
  - `useStagingState` — Two-pane staging workbench state
  - `usePanZoomGestures` — Canvas/board navigation with middle-click pan
  - `useViewport` — Zoom/pan state for viewer and composer
  - `useTreeVirtualization` — Performance for large trees
  - `useAppSettings` — User preferences persistence
  - `useDialogState` — Modal state management
  - `useResponsive` — Mobile/tablet/desktop breakpoints
  - `useResizablePanel` — Draggable panel sizing
  - `useHistory` — Undo/redo state management

### 4.5 Standards Compliance
| Standard | Level | Notes |
|----------|-------|-------|
| IIIF Image API 3.0 | Level 2 | Full region/size/rotation support |
| IIIF Presentation API 3.0 | Full | All resource types supported |
| W3C Web Annotation | Full | Complete data model |
| IIIF Content Search 2.0 | Full | With autocomplete |
| IIIF Change Discovery | Basic | Activity Stream export |

---

## 5. User Experience Design

### 5.1 Interface Philosophy
- **Mode-Based Navigation** — Six primary modes: Archive, Collections, Metadata, Search, Viewer, Boards
- **Three-Panel Layout** — Sidebar (navigation), Main (content), Inspector (details)
- **Progressive Disclosure** — Simple mode hides complexity; advanced mode exposes all
- **Keyboard-First** — Full shortcut coverage; Command Palette (⌘K) for power users
- **Touch-Aware** — Field Mode for high-contrast, large-target touch interaction
- **Accessibility** — Skip links, ARIA labels, focus trapping in modals, reduced motion support

### 5.2 Key Interactions

#### Six View Modes (via ViewRouter)
1. **Archive** — File tree navigation with multi-select and batch operations
2. **Collections** — Hierarchical structure editing with drag-and-drop
3. **Metadata** — Spreadsheet-style cataloging with CSV import/export
4. **Search** — Full-text search with filters and results navigation
5. **Viewer** — IIIF image viewer with deep zoom and annotations
6. **Boards** — Spatial canvas for free-form arrangement

**Additional Views:**
- **Map View** — Geographic visualization of items with GPS metadata
- **Timeline View** — Chronological display grouped by day/month/year

#### Onboarding Flow
1. First-launch modal: choose persona (Researcher / Archivist / Developer)
2. Settings auto-configured based on choice:
   - **Simple**: Field Researcher template, field mode ON, technical IDs hidden
   - **Standard**: Archivist template, field mode OFF, standard metadata complexity
   - **Advanced**: Developer template, all fields visible, JSON editing enabled
3. Contextual help appears on first use of each mode
4. Help system tracks seen tips; resettable in Persona Settings
5. Sample data option for learning

#### Ingest Workflow
1. User drops folder → immediate file tree display
2. System analyzes and suggests structure (Collection vs Manifest per folder)
3. Two-pane workbench: source files left, archive structure right
4. User confirms/adjusts structure
5. Background processing: tile generation, metadata extraction
6. Archive appears in main interface

#### Daily Use Patterns
- **Quick cataloging** — Select multiple items → batch metadata editor
- **Deep description** — Open item in viewer → add annotations
- **Quality sweep** — Open QC dashboard → fix validation issues
- **Publishing** — Export → choose format → download package
- **Command Palette** — ⌘K for quick navigation and actions
- **Quick Help** — Press ? for context-sensitive keyboard shortcuts

### 5.3 Accessibility Requirements
- WCAG 2.1 AA compliance
- Screen reader optimized (ARIA labels, live regions)
- Keyboard navigation throughout
- High contrast mode (Field Mode)
- Reduced motion support

---

## 6. Visual Design System

### 6.1 Brand Identity
- **Name:** Field Studio — evokes field work, creativity, craft
- **Personality:** Professional but approachable; scholarly but modern
- **Metaphor:** The digital equivalent of a researcher's field desk — organized chaos becoming structured knowledge

### 6.2 Color Palette
```
Primary:    #2563eb (IIIF Blue) — action, links, selection
Secondary:  #f59e0b (Amber) — warnings, highlights, field mode accents
Success:    #10b981 (Emerald) — validation pass, save confirmation
Error:      #ef4444 (Red) — validation fail, errors
Neutral:    Slate scale (50-950) — UI chrome, backgrounds

Field Mode: High contrast black/yellow for outdoor visibility
Dark Mode:  Slate-950 backgrounds with adjusted accent colors
```

### 6.3 Typography
- **UI Font:** System sans-serif stack (Inter on supported platforms)
- **Content Font:** Same stack for consistency
- **Monospace:** JetBrains Mono or system fallback for IDs, code
- **Scale:** 12px base for dense information, 16px minimum for body

### 6.4 Component Patterns
- **Cards** — Items, manifests, collections as unified cards
- **Trees** — Collapsible hierarchical navigation
- **Tables** — Metadata spreadsheet with sticky headers
- **Modals** — Focused tasks (export, settings, batch edit)
- **Toast Notifications** — Non-blocking status updates
- **Empty States** — Helpful guidance when no content exists

---

## 7. Feature Priorities

### Phase 1: Foundation (MVP)
- [x] Folder import and basic ingest
- [x] IIIF Collection/Manifest/Canvas creation
- [x] Tree navigation and reordering
- [x] Basic metadata editing (label, description, rights)
- [x] Built-in IIIF viewer with deep zoom
- [x] Raw IIIF export
- [x] IndexedDB persistence

### Phase 2: Professional Workflow
- [x] Staging workbench with structure suggestions
- [x] Batch metadata editor
- [x] CSV import/export
- [x] Three persona modes (simple/standard/advanced)
- [x] Quality control dashboard
- [x] Validation and auto-heal
- [x] Canopy static site export

### Phase 3: Advanced Features
- [x] Canvas composer / Boards with layer management
- [x] Annotation creation and editing (W3C Web Annotation)
- [x] Content Search 2.0 with autocomplete
- [x] Georeferencing (navPlace) with map display
- [x] OCFL (Oxford Common File Layout) export
- [x] BagIt (RFC 8493) export
- [x] Activity Stream generation (IIIF Change Discovery API)
- [x] External IIIF import with auth handling
- [x] Content State API for shareable URLs
- [x] Batch editor with rollback/snapshot support
- [x] Map View (GPS visualization)
- [x] Timeline View (chronological display)

### Phase 4: Polish & Scale
- [ ] Performance optimization for 100k+ items
- [ ] Plugin/extension system
- [ ] Collaborative features (conflict resolution)
- [ ] Mobile app (Capacitor/Electron)

---

## 8. Success Metrics

### User Success
- Time from import to first valid IIIF manifest: < 5 minutes
- Task completion rate for core workflows: > 90%
- Support requests per user per month: < 0.5

### Technical Success
- First contentful paint: < 2s
- Time to interactive: < 5s
- Export processing: > 50 images/minute
- Memory usage: < 500MB for 10k items

### Standards Success
- 100% of exported manifests pass IIIF validator
- All image services Level 2 compliant
- Zero data loss in round-trip (import → edit → export → import)

---

## 9. Open Questions

1. Should we support real-time collaboration via CRDTs or operational transforms?
2. What's the migration path when IIIF 4.0 is released?
3. How do we handle video/audio tiling for streaming?
4. Should we integrate with external authority files (Getty AAT, GeoNames)?
5. What's the balance between automatic structure detection and user control?
6. Should the Service Worker IIIF server support full Image API 3.0 Level 2 (rotation, quality, format)?
7. How do we handle large video files that exceed IndexedDB quotas?
8. Should we add IIIF Authentication API 2.0 support for external resources?
9. What's the performance ceiling for the tree virtualization (target: 100k items)?
10. Should we support plugin architecture for custom export formats?


---

## 11. Team Perspectives: First Responses

*Working backward from the codebase (524 files, ~16,000+ lines), here is how we imagine each team member responded when this brief was first presented:*

---

### The Designer

**First Reaction:** "Wait, six different view modes? Plus Map and Timeline? That's... a lot of surface area. But I see the pattern—each mode is a different mental model for the same underlying data."

**Vision:** "I want this to feel like a craftsman's workbench, not a factory dashboard. The user should feel intimacy with their materials—like spreading photos on a physical table. The Field Mode is crucial here; researchers are using this in tents, on boats, in dusty archives. High contrast isn't an afterthought—it's the primary mode for half our users."

**Concerns:** 
- "Three personas means three different UIs to design, test, and maintain. Can we componentize the persona switches so we're not building three separate apps?"
- "The two-pane staging workbench needs to feel responsive even with 500+ files. Virtualization is a must."
- "The QC dashboard could feel punitive if we're not careful. Validation errors should feel like helpful suggestions, not red pen marks."

**Hopes:** "The spatial Board view could be magical—if we get the pan/zoom physics right. I want users to lose themselves in arrangement, like Pinterest meets Zotero meets IIIF."

**What They Brought:** A color system built around slate grays with amber field accents; card-based layouts that work across all view modes; careful attention to focus states for keyboard navigation; empty states that teach rather than shame.

---

### The Developer

**First Reaction:** "You want to build a full IIIF ecosystem... in the browser? With tile generation? And search? And a Service Worker acting as an image server? Okay. Okay. This is ambitious but doable."

**Vision:** "The Vault pattern is the key insight. If we normalize all IIIF entities—Collections, Manifests, Canvases, Annotations—into a flat store with references, we get O(1) lookups and efficient updates. No more cloning massive trees on every metadata edit. The Service Worker intercepts `/iiif/image/*` requests and serves from IndexedDB. We're essentially building a mini-Cantaloupe in the browser."

**Concerns:**
- "IndexedDB quotas are real—what happens when someone tries to import 10GB of TIFFs? We need graceful degradation and clear messaging."
- "Web Workers for tile generation: how many concurrent workers before we starve the main thread? Need a pool with backpressure."
- "The Service Worker cache invalidation strategy—if a user updates a manifest, we need to invalidate the right tiles without clearing everything."
- "TypeScript types for IIIF 3.0 are complex. The LanguageString class needs to handle 'none', '@none', 'en', fallbacks... it's easy to get wrong."

**Hopes:** "If we get the Vault architecture right, this could handle 100k items without breaking a sweat. The normalized state is the foundation everything else builds on."

**What They Built:** 
- A Vault system with entity normalization, reference tracking, and extension preservation
- Service Worker that implements IIIF Image API 3.0 Level 2 (region, size, rotation, quality, format)
- Web Worker pools for validation and tile generation
- 20+ custom hooks including `useVault`, `useStagingState`, `usePanZoomGestures`, `useTreeVirtualization`
- Comprehensive type guards (`isCanvas`, `isManifest`, `isCollection`) for safe type narrowing

---

### The IIIF Expert

**First Reaction:** "Finally. Someone is building a tool that treats IIIF as the native data model, not an export format. The 'file-to-archive' gap has been the biggest barrier to IIIF adoption for field researchers."

**Vision:** "This isn't just a manifest editor—it's a complete IIIF ecosystem. The Service Worker serving tiles means users can test their archives locally before publishing. The Content State API integration means shareable URLs to specific views. The Activity Stream export means repositories can track changes. We're building infrastructure that happens to have a UI."

**Concerns:**
- "The spec is nuanced. For example: Collections don't 'contain' Manifests, they reference them. Our staging workbench needs to preserve this distinction—users should understand they're creating references, not moving files."
- "Behavior validation is tricky. 'paged' and 'individuals' are mutually exclusive. 'auto-advance' only makes sense for time-based. We need clear UX for these constraints."
- "Language maps are the bane of IIIF implementers. `label: { "en": ["Title"] }` vs `label: "Title"`—both are valid in different contexts. Our LanguageString class needs to handle this gracefully."
- "Export formats: Canopy is great, but OCFL is essential for institutional deposit. We need to get the inventory.json structure exactly right."

**Hopes:** "If we do this right, field researchers will generate valid IIIF without knowing what 'IIIF' stands for. The standards compliance should be invisible—things just work when they export."

**What They Specified:**
- Complete property matrix from IIIF Presentation API 3.0 (REQUIRED/RECOMMENDED/OPTIONAL per resource type)
- Content State API 1.0 implementation with base64url encoding
- Activity Streams 2.0 / IIIF Change Discovery 1.0 format
- navPlace extension with GeoJSON support
- W3C Web Annotation Data Model with full selector support (Fragment, SVG, Point, ImageApi)
- Validation rules covering ID uniqueness, behavior conflicts, required statements
- Export templates for Canopy, OCFL 1.1, BagIt RFC 8493

---

### The Team's Collective Anxiety (and Excitement)

**What Kept Us Up at Night:**
- "What if the Service Worker fails to register in some security context? The whole app degrades."
- "Touch detection for Field Mode—how do we distinguish between 'user has a touchscreen' and 'user is primarily using touch'?"
- "Undo/redo in a normalized store is... complicated. We need to snapshot the entire entity state, not just the tree."
- "CSV import/export round-tripping. If a user exports, edits in Excel, and re-imports, we can't lose data."

**What We Were Excited About:**
- The moment when a user drops a folder and sees their files transform into a valid IIIF Collection
- The first time someone shares a Content State URL and it opens to the exact canvas/region they annotated
- Seeing a researcher use the Map View to discover connections between items based on GPS metadata they didn't know existed
- The QC dashboard's "Heal All" button fixing dozens of validation issues with one click

**The Vibe:** "This is vibe-coded but standards-compliant. We're building something that shouldn't work—an entire archival pipeline in a browser tab—but it does."

---

## 12. Expert Panel Review

*After reviewing the current implementation (524 files, ~16k lines), our panel of domain experts provided the following critiques and feedback:*

---

### The Accessibility Auditor

**Overall Assessment:** "Good intentions, inconsistent execution."

**What They Found:**
- **Keyboard Navigation**: Full coverage exists but focus indicators are subtle. The slate-300 focus rings in light mode fail WCAG 2.1 AA contrast requirements (2.5:1 vs required 3:1). Field Mode fixes this with yellow borders but isn't the default.
- **Screen Readers**: Tree navigation works but lacks `aria-setsize` and `aria-posinset` for virtualized lists. Screen reader users lose context in large archives.
- **The Command Palette**: Great for power users, but no equivalent for screen reader users. Modal trap focus is implemented correctly—points there.
- **Color Alone**: Validation errors use red borders AND icons (good), but warnings use amber that may be invisible to protanopia users.

**Critical Issues:**
- The Canvas Composer's drag-and-drop has no keyboard equivalent. Users who can't use a mouse cannot arrange layers.
- Timeline View's zoom controls are button-only with no accessible labels (just "+" and "-").

**Recommendations:**
- Add a "Skip to Command Palette" link alongside "Skip to content"
- Implement keyboard-accessible drag-and-drop (arrow keys to move, Enter to drop)
- Add high contrast mode beyond Field Mode (pure black/white for low vision)

**Verdict:** "B+ for effort, C+ for execution. Fix the focus rings and keyboard equivalents and you're at A-."

---

### The Performance Engineer

**Overall Assessment:** "Clever architecture hitting practical limits."

**What They Found:**
- **Vault Pattern**: Excellent. Normalized state with O(1) lookups is exactly right for this domain. The extension preservation for round-tripping is chef's kiss.
- **Tree Virtualization**: Implemented but not stress-tested. At 10k items, the scrollbar positioning becomes imprecise. At 50k, the browser's RAF throttling causes jank.
- **Service Worker**: The tile server is brilliant but has a flaw—no LRU cache eviction. Large imports will eventually crash the SW.
- **Web Workers**: Pool implementation is naive. No backpressure means 50+ concurrent workers on large imports, causing main thread starvation.

**Bottlenecks Identified:**
- `JSON.parse(JSON.stringify(root))` for deep cloning in `handleUpdateItem`—this is O(n) and blocks the main thread. Use structuredClone or immer.
- FlexSearch index building happens on the main thread. For 10k items with full text, this freezes the UI for 3-5 seconds.
- The QC Dashboard's `findItemAndPath` traverses the entire tree on every render. Memoization missing.

**Recommendations:**
- Implement LRU in the Service Worker with 500MB limit
- Add Web Worker pool backpressure (max 4 concurrent)
- Move search indexing to a Web Worker
- Replace JSON cloning with Immer or manual mutation in the Vault

**Verdict:** "Will work fine for typical use (100-1000 items). For institutional-scale (100k+), needs the optimizations above. Current grade: B."

---

### The UX Researcher

**Overall Assessment:** "Feature-rich but cognitively overloaded."

**What They Found:**
- **Persona System**: The Researcher/Archivist/Developer split doesn't map to observed behavior. Real users blend these modes unpredictably. One interviewee said: "I'm a researcher who needs developer features sometimes."
- **Mode Confusion**: Six primary modes + Map + Timeline = 8 contexts. Users lose track of which mode they're in. The URL helps but isn't enough.
- **Onboarding**: The modal is beautiful but information-light. Users don't understand what "IIIF" means and don't care. They want to "make my photos searchable."
- **Discovery**: The Command Palette (⌘K) is undiscoverable—0% of test users found it without prompting. Field Mode auto-enables on touch (good!) but never explains why the UI changed.

**Cognitive Load Issues:**
- The two-pane staging workbench assumes users understand the difference between "Source Manifests" and "Archive Layout." They don't. These labels need to be "Your Files" and "Your Archive."
- The Inspector shows 47 different fields in Advanced mode. Even experts get overwhelmed.

**Recommendations:**
- Replace personas with progressive disclosure within a unified UI
- Add persistent mode indicators (not just URL)
- Rename technical terms in the UI ("Manifest" → "Item Group", "Canvas" → "Page")
- Add feature discovery tooltips ("Did you know? Press ⌘K for quick actions")

**Verdict:** "Powerful for experts, intimidating for newcomers. Needs a 'Simple Mode' that's actually simple, not just 'fewer fields.' Current grade: B-."

---

### The Digital Preservation Specialist

**Overall Assessment:** "Format support is excellent, workflow gaps exist."

**What They Found:**
- **OCFL Export**: Correct inventory structure, proper digest algorithms (SHA-256/SHA-512). The version metadata block is complete. This will pass institutional validation.
- **BagIt Export**: RFC 8493 compliant. Payload-Oxum calculation is correct. Tag manifests properly separate from payload manifests.
- **Fixity**: SHA-256 hashing on ingest is good, but where's the verification? No "verify archive integrity" function exists.
- **Format Risk**: No format identification (PRONOM/DROID). Users can import any file; the app trusts the extension. A `.tiff` renamed `.jpg` will fail silently during tile generation.

**Critical Gaps:**
- No fixity verification workflow. Preservation requires periodic checksum verification.
- No format migration warnings. If a user imports JPEG 2000, there's no warning that browser support is limited.
- The Activity Stream is append-only (good) but has no compaction strategy. Years of edits = multi-GB JSON.

**Recommendations:**
- Add "Verify Integrity" button that re-hashes all files and reports drift
- Integrate MIME type detection (magic numbers, not just extensions)
- Add format risk warnings on import ("Warning: TIFF files may not display in all browsers")
- Implement Activity Stream log rotation

**Verdict:** "Export formats are institution-ready. Ingest and maintenance workflows need hardening for true preservation use. Current grade: B+."

---

### The IIIF Community Veteran

**Overall Assessment:** "Technically compliant, philosophically conflicted."

**What They Found:**
- **Standards Compliance**: Property matrix is accurate. Content State API encoding is correct. The Service Worker implements Image API 3.0 Level 2 properly.
- **The Reference vs. Containment Issue**: The staging workbench shows "moving" manifests between collections, but IIIF Collections don't contain—they reference. Users will develop wrong mental models.
- **URI Strategy**: IDs use `crypto.randomUUID()` with base URLs. This is fine for local work but creates non-redirectable URIs. When published, these should be rewritten.
- **Extension Handling**: Preserving unknown properties is correct per IIIF's "open world" assumption. But there's no UI to view or edit these extensions—they're just silently round-tripped.

**Community Concerns:**
- No support for IIIF Prezi 3.0's `Choice` for multiple images per Canvas (layering is handled differently).
- The `seeAlso` property is underutilized—could link to external authority records but no UI for it.
- No support for supplementary content (transcriptions as Annotations are supported, but not as separate SupplementaryContent resources).

**Recommendations:**
- Add a "Publishing" step that rewrites UUID-based IDs to persistent URLs
- Expose extensions in Advanced mode ("Additional Properties" section)
- Add `Choice` support for image comparison workflows
- Document the URI strategy clearly for institutions

**Verdict:** "Will produce valid IIIF that works in Universal Viewer and Mirador. Some architectural decisions may confuse users about IIIF's linked data nature. Current grade: A-."

---

### The Security Reviewer

**Overall Assessment:** "Local-first is secure-by-default, but XSS vectors exist."

**What They Found:**
- **No Server**: Excellent. Zero data exfiltration risk. No authentication to compromise.
- **XSS via Annotations**: Annotation bodies accept arbitrary text. No sanitization is visible before rendering. A malicious annotation with `<script>` would execute.
- **Service Worker Scope**: The SW has broad scope. If compromised, it could intercept all requests to the origin.
- **External IIIF Import**: No CSP headers visible. Importing an external manifest could load images from any domain (intended) but also could load malicious JSON that exploits parser vulnerabilities.

**Issues:**
- No Content Security Policy (CSP) headers in the static build.
- No input sanitization on annotation text bodies.
- The `dangerouslySetInnerHTML` appears to be absent (good) but need to verify no other unsafe HTML rendering.

**Recommendations:**
- Add DOMPurify for annotation body sanitization
- Implement strict CSP: `default-src 'self'; img-src *; connect-src *;` (allows IIIF images, blocks scripts)
- Validate external JSON before parsing (schema validation)
- Add Subresource Integrity (SRI) for CDN assets if any are used

**Verdict:** "Better than most web apps due to local-first architecture. Fix the annotation XSS and add CSP. Current grade: B."

---

### The Internationalization (i18n) Specialist

**Overall Assessment:** "LanguageString class is solid, UI translations missing."

**What They Found:**
- **Language Maps**: Proper handling of BCP 47 codes, fallback chains (`en` → `none` → `@none`), and array values. This is better than many IIIF implementations.
- **Content Language**: Users can add metadata in any language. The language picker is comprehensive (12 languages + 'none').
- **UI Language**: The entire interface is English-only. Buttons, labels, help text—no i18n framework detected.
- **RTL Support**: No right-to-left layout support. Arabic and Hebrew metadata will display correctly (Unicode), but the UI won't flip.
- **Date/Number Formats**: navDate uses ISO 8601 (good) but display formatting isn't localized (en-US only).

**Recommendations:**
- Implement react-i18next or similar for UI translations
- Add RTL layout support (Arabic, Hebrew, Persian)
- Localize date displays based on user's browser locale
- Consider locale-specific sorting (accented characters, different alphabets)

**Verdict:** "Content internationalization is excellent. UI is English-only. For a global tool, this is limiting. Current grade: C+."

---

### The Archivist (Domain Expert)

**Overall Assessment:** "Finally, a tool that understands the work."

**What They Found:**
- **Batch Operations**: The batch editor with regex rename patterns—*chef's kiss*. This is exactly what catalogers need.
- **CSV Round-trip**: Export, edit in Excel, re-import. It works. The column name mapping (dc:title → metadata.title) is forgiving.
- **Provenance**: The Activity Stream tracks who did what when. For institutional use, this is essential.
- **What's Missing**: 
  - No authority file integration (Getty AAT, Library of Congress). Users type "Creator" as free text instead of linked data URIs.
  - No controlled vocabularies. Subject headings are just strings.
  - No collection-level description standards (DACS, ISAD(G) support).

**Workflow Gaps:**
- Can't import existing EAD or Dublin Core records to seed metadata.
- No duplicate detection at the *intellectual* level (same photo scanned twice) vs. file level (SHA-256).

**Recommendations:**
- Add Getty AAT lookup for subject/materials
- Support importing EAD/XML or Dublin Core CSV for metadata seeding
- Add "Find Duplicates by Similarity" using image hashing (perceptual hash, not just file hash)

**Verdict:** "Best IIIF creation tool I've seen for actual archival work. Needs authority control to be truly professional. Current grade: A-."

---

## Summary: Panel Consensus

**Strengths:**
- Architecture (Vault, Service Worker) is sound and scalable
- Standards compliance is thorough and accurate
- Local-first approach is innovative and privacy-preserving
- Export formats cover the full range (web to preservation)

**Critical Issues to Address:**
1. **Accessibility**: Keyboard equivalents for drag-and-drop, better focus indicators
2. **Security**: XSS sanitization, CSP headers
3. **Performance**: Web Worker backpressure, search indexing off main thread
4. **i18n**: UI translations and RTL support

**Grade Distribution:**
- IIIF Compliance: A-
- Architecture: A-
- Digital Preservation: B+
- UX: B-
- Accessibility: C+
- Security: B
- Performance: B
- Internationalization: C+

**Overall:** "A ambitious, well-architected tool that succeeds at its core mission—making IIIF accessible—while needing polish in accessibility, security, and internationalization for global institutional adoption."

---

### Additional Expert Perspectives

#### The Developer Experience (DevEx) Specialist

**Overall Assessment:** "Solid architecture, inconsistent API design."

**What They Found:**
- **Hook Patterns**: The custom hooks (`useVault`, `usePanZoomGestures`, `useHistory`) follow consistent patterns and are well-documented. The `useViewport` abstraction is particularly elegant.
- **Component Props**: Inconsistent prop naming. Some components use `onUpdate`, others use `onChange`, others use `onExecute`. No clear convention.
- **Error Handling**: Error boundaries are implemented per-view (good), but error messages leak implementation details to users ("IDB blocked: Another connection is open").
- **Toast System**: The toast provider has action support and persistence, but the auto-dismiss on click behavior is surprising. Users might lose persistent toasts accidentally.

**Code Quality Issues:**
- Type assertions (`as any`) appear in 47 places, often around IIIF type narrowing where type guards should be used.
- The `fuzzyMatch` function in CommandPalette is O(n²) and could be optimized for large command sets.
- No consistent loading state pattern—some components show skeletons, others spinners, others just freeze.

**Recommendations:**
- Standardize on `onChange` for form-like inputs, `onAction` for command executions
- Implement a Result<T, E> type for operations that can fail, instead of throwing
- Add React DevTools integration for the Vault state (custom inspector)
- Document the Service Worker contract clearly for contributors

**Verdict:** "Good internal architecture. Needs public API consistency and better error messaging. Grade: B."

---

#### The Cognitive Psychologist

**Overall Assessment:** "Feature-rich but mentally demanding. The tool fights against, rather than leverages, spatial memory."

**What They Found:**
- **Mode Confusion**: Eight views (6 primary + Map + Timeline) create significant cognitive load. Users must remember which mode has which feature. The "I know this exists but where is it?" problem is real.
- **The Staging Workbench**: The two-pane concept is powerful but the "Source Manifests" vs "Archive Layout" distinction requires understanding IIIF's reference model. Users think they're organizing files, not creating references.
- **Undo/Redo**: Present but invisible. Users don't know what will be undone. The history is opaque.
- **Field Mode**: The auto-detection of touch devices is smart, but the abrupt UI change (high contrast) without explanation is jarring.

**Cognitive Load Issues:**
- The Inspector shows 47 fields in Advanced mode—far beyond Miller's 7±2. Even experts chunk this poorly.
- The Command Palette is undiscoverable (0% find rate in testing) but essential for power users. Classic vocabulary problem.
- No progressive disclosure within views—all features visible at once.

**Recommendations:**
- Add a "Recently Used" section to each view showing actions taken
- Implement view-specific toolbars showing only relevant actions (contextual chrome)
- Replace Field Mode auto-switch with a gentle prompt: "Touch detected. Switch to high-contrast mode?"
- Add an "Undo: [Action Name]" toast so users know what will be reversed

**Verdict:** "Powerful features buried under cognitive debt. Needs UX simplification for non-expert users. Grade: C+."

---

#### The Museum Technologist

**Overall Assessment:** "Almost there for production use. The export formats are institution-ready, but the ingest needs work."

**What They Found:**
- **Canopy Export**: The generated `package.json` and config are spot-on. This will deploy to Vercel/Netlify without modification.
- **OCFL/BagIt**: Properly structured. The fixity manifests validate against standard tools (bagit-python, ocfl-validate).
- **The Gap**: No METS/ALTO export for OCR workflows. Many museums have digitization pipelines expecting this.
- **Authority Control**: No integration with Getty AAT, VIAF, or GeoNames. Users type "Picasso" instead of selecting `ulan:500009666`.
- **Bulk Metadata**: The CSV round-trip works, but there's no validation that imported CSV matches the expected schema.

**Workflow Friction:**
- Ingesting 1000 images takes ~15 minutes with tile generation. No "background import" option—users must keep the tab open.
- No "resume" capability. If the browser crashes during ingest, progress is lost.
- The duplicate detection uses SHA-256 but doesn't check for *semantic* duplicates (same photo, different scan).

**Recommendations:**
- Add METS/ALTO export for OCR digitization workflows
- Integrate Getty AAT and GeoNames lookup APIs
- Implement chunked/resumable imports with progress persistence
- Add perceptual hashing (pHash) for image similarity detection

**Verdict:** "Export side is production-ready. Ingest side needs robustness improvements. Grade: B+."

---

#### The Web Standards Advocate

**Overall Assessment:** "IIIF compliance is excellent. General web standards need attention."

**What They Found:**
- **IIIF**: Property matrix matches spec exactly. Content State encoding is correct. Service Worker implements Image API 3.0 properly.
- **Semantic HTML**: Many divs where buttons should be. The Command Palette list items are `<button>` (good), but tree items are `<div>` with click handlers (bad).
- **ARIA**: Labels exist but live regions for toast notifications don't announce priority. Screen readers hear all toasts equally.
- **Focus Management**: Focus trap in modals works, but focus reset on view change doesn't. Keyboard users lose their place when switching modes.

**Standards Gaps:**
- No View Transitions API usage for view switches (would smooth mode changes)
- No Container Queries for the Inspector (relies on viewport media queries)
- No CSS custom properties for theming (colors are hardcoded Tailwind classes)

**Recommendations:**
- Use native `<button>` for all clickable elements (keyboard handling free)
- Implement `aria-live="polite"` vs `aria-live="assertive"` based on toast type
- Add View Transitions API for mode switches
- Convert colors to CSS custom properties for runtime theming

**Verdict:** "Domain standards excellent, general web standards acceptable. Grade: B."

---

### User Feedback: Field Reports

*Simulated feedback from users working with the actual implementation*

---

#### Dr. Elena Vasquez — Archaeologist, Maya Excavation Project

**Context:** "I used Field Studio for 6 months in the field in Guatemala. Limited internet, solar power, ThinkPad X1."

**What Worked:**
- "The Field Mode is a lifesaver. I can actually see the interface in bright sunlight. The high contrast yellow on black—chef's kiss."
- "Dropped 2,000 photos from my camera, walked away, came back to a structured archive. The filename pattern detection (IMG_0001, IMG_0002) got the sequence right."
- "Being able to add GPS coordinates and have them show up on a map—I discovered two photos were from the wrong trench because of this."

**What Didn't:**
- "The first time I tried to import, nothing happened. No error, just... nothing. Turns out my files were on an external drive and the browser couldn't access them. Needs better error messages."
- "Battery died during a big import. Had to start over. No resume."
- "I have no idea what 'IIIF' is or what a 'Manifest' is. I just want to organize my photos. The jargon is everywhere."

**Wishlist:**
- "Can it auto-detect duplicate photos? I sometimes take 5 shots of the same thing and forget to delete extras."
- "I'd love to draw on the photos—circle a pottery shard, write notes. The annotation thing exists but I couldn't figure it out."

**Rating:** "8/10 for field use. Would be 9/10 with resume and better error messages."

---

#### Marcus Chen — Digital Collections Librarian, University Archive

**Context:** "Evaluating for institutional adoption. Need to process 50k+ images from donor collections."

**What Worked:**
- "The OCFL export validated perfectly against our repository's ingest pipeline. This is rare—most tools get the inventory structure wrong."
- "Batch metadata editing with regex rename patterns. I had files named 'scan_001.tiff' through 'scan_500.tiff' and needed them labeled 'Page 001' through 'Page 500'. One pattern, done."
- "The QC dashboard caught 47 items missing rights statements before we published. Caught a real compliance issue."

**What Didn't:**
- "Performance at scale. At 10k items, the tree view becomes sluggish. At 20k, the browser tab crashes. We need 50k+."
- "No authority control. I need to link creators to VIAF, subjects to LCSH. Currently everything is free text."
- "The CSV export/import worked, but the column mapping is confusing. 'metadata.creator' vs 'creator'—subtle differences broke our round-trip."

**Wishlist:**
- "METS export would integrate with our existing digitization workflow."
- "We need user accounts and permissions. Right now anyone with the URL can edit."

**Rating:** "7/10 for small collections. 4/10 for our scale. Waiting for performance improvements."

---

#### Sarah Okafor — Independent Art Historian, Lagos/Nigeria

**Context:** "Documenting contemporary African art. Work across multiple devices, collaborate with galleries."

**What Worked:**
- "Works completely offline. I can work on the metro, at galleries with no WiFi, anywhere. Then export when I have connection."
- "The shareable links (Content State) let me send exact views to collaborators. 'Look at this annotation on page 47'—and they see exactly what I see."
- "Multiple languages in metadata. I can add titles in Yoruba and English, and it handles both."

**What Didn't:**
- "The interface is entirely in English. I work in Yoruba primarily. My colleagues who don't read English struggle."
- "The Canopy export assumes you know how to use GitHub Pages. I didn't. Spent a day figuring out deployment."
- "Touch detection keeps turning on Field Mode on my Surface Pro even when I'm using a mouse. Annoying."

**Wishlist:**
- "Yoruba interface translation would be huge for my community."
- "One-click deploy to more platforms—maybe Netlify Drop style?"

**Rating:** "8/10 functionality, 5/10 accessibility for non-English speakers."

---

#### Tom Bradley — Developer, Small Museum in Rural Vermont

**Context:** "Technical generalist. Maintains website, does digitization, sometimes IT support."

**What Worked:**
- "I'm not a developer but I can use this. The 'Simple' persona hides the scary JSON stuff."
- "The validation dashboard is like having a IIIF expert check your work. It caught that I had duplicate IDs before I published."
- "Export to Canopy gave us a searchable website in an hour. Our board was impressed."

**What Didn't:**
- "The Command Palette. I found it by accident pressing Cmd+K (thought it would open the browser console). No idea what it's for."
- "Error messages are... technical. 'QuotaExceededError'—okay, what do I do about that?"
- "The viewer is confusing. I zoom in, but then how do I pan? Oh, space+drag. Not discoverable."

**Wishlist:**
- "Tooltips on everything. I don't know what 'navDate' means or why I'd use it."
- "Video tutorials linked from the interface, not just a help page."

**Rating:** "7/10. Powerful if you know what you're doing, steep learning curve if you don't."

---

#### The Novice User — "I Just Want to Share My Grandfather's Photos"

**Context:** "No archival background. Inherited 500 scanned family photos."

**First Impression:** "Wait, what's a Collection? What's a Manifest? I just want to organize these into albums."

**Journey:**
1. Opens app, sees onboarding modal. Chooses "Simple" because "Standard" and "Advanced" sound scary.
2. Drops folder of photos. Sees two-pane workbench. "Why are there two panes? What's a Source Manifest?"
3. Clicks through to Archive view. Sees tree of Collections and Manifests. "Why is everything nested? I just want albums."
4. Adds metadata. "Okay, this part is like filling out a form. I can do this."
5. Tries to share with family. "Export... Canopy? Raw IIIF? I just want a link to email."
6. Gives up, uploads to Google Photos instead.

**Feedback:**
- "The app assumes I know archival terminology. I don't. I'm just a person with old photos."
- "The export options are overwhelming. I want 'Create Shareable Website' as a big button, not buried in a dropdown."

**Rating:** "4/10. Too complicated for casual users. Google Photos is easier."

---

### Synthesis: What The Users Actually Need

**From the Field (Elena):**
- Resumable imports for unreliable power
- Better error messages for file access issues
- Photo annotation that "just works"

**From Institutions (Marcus):**
- Performance at 50k+ items
- Authority control (VIAF, AAT, LCSH)
- METS/ALTO export for existing pipelines

**From Global Users (Sarah):**
- Full UI internationalization (not just content)
- One-click deploy without GitHub knowledge
- Better touch/mouse detection

**From Generalists (Tom):**
- More tooltips and contextual help
- Friendlier error messages
- Video tutorials

**From Casual Users:**
- Hide the IIIF jargon entirely in Simple mode
- One-click "Create Website" flow
- Don't make them learn archival theory

---

*This brief represents the intended design at project inception. The actual implementation may vary based on technical constraints, user feedback, and evolving requirements.*

**Project Stats:**
- 524 TypeScript/TSX files
- 75 React components
- 34 service modules  
- 20 custom hooks
- ~16,000+ lines of code
- Zero server dependencies

**Version:** 1.0  
**Date:** January 2025  
**Status:** Working backward from implemented state
