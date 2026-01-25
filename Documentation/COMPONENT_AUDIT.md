# IIIF Field Studio - Comprehensive Component Audit

**Audit Date**: 2026-01-24
**Purpose**: Identify wiring gaps, missing functionality, improvement opportunities, and bug risks
**Scope**: All frontend components (44), services (30), and hooks (13)
**Architecture**: Normalized Vault Pattern (Digirati-inspired)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Completed Stability Sprint](#completed-stability-sprint)
3. [Global Application Layer](#1-global-application-layer)
4. [Layout Components](#2-layout-components)
5. [View Components](#3-view-components)
6. [Editing Components](#4-editing-components)
7. [Import/Export Components](#5-importexport-components)
8. [Media Components](#6-media-components)
9. [Search & Organization](#7-search--organization)
10. [Quality & Validation](#8-quality--validation)
11. [Core Services](#9-core-services)
12. [Export Services](#10-export-services)
13. [Media Services](#11-media-services)
14. [Hooks](#12-hooks)
15. [Dead Code & Disconnected Features](#13-dead-code--disconnected-features)
16. [Priority Matrix](#14-priority-matrix)
17. [Next Actions](#15-next-actions)

---

## Executive Summary

### Codebase Statistics
| Category | Count | Lines of Code |
|----------|-------|---------------|
| Components | 44 | ~8,500 |
| Services | 30 | ~14,000 |
| Hooks | 1 suite (13 hooks) | ~622 |
| Types/Constants | 3 files | ~1,500 |
| **Total** | **78 modules** | **~24,600** |

### Architecture Health
- **State Management**: Normalized Vault with O(1) lookups - HEALTHY
- **Undo/Redo**: ActionDispatcher with history stack - HEALTHY
- **Storage**: IndexedDB with quota monitoring - HEALTHY (improved)
- **Error Handling**: Per-view ErrorBoundaries - HEALTHY (improved)
- **Accessibility**: Keyboard navigation added - IMPROVED

### Risk Assessment
| Risk Level | Count | Trend |
|------------|-------|-------|
| Critical | 0 | ↓ (was 4) |
| High | 6 | → |
| Medium | 12 | → |
| Low | 8 | → |

---

## Completed Stability Sprint

The following critical issues were resolved in the previous sprint:

| Issue | Component | Resolution |
|-------|-----------|------------|
| ~~No per-view error boundaries~~ | App.tsx | ✅ Each view wrapped in ErrorBoundary with ViewErrorFallback |
| ~~No storage quota warning~~ | storage.ts | ✅ Checks at 90%/95%, toast warnings, callback system |
| ~~OSD memory leaks~~ | Viewer.tsx | ✅ Proper cleanup with removeAllHandlers() and destroy() |
| ~~Stack overflow on deep trees~~ | CollectionsView.tsx | ✅ MAX_NESTING_DEPTH = 15 with visual warnings |
| ~~No keyboard tree navigation~~ | ManifestTree.tsx | ✅ Full WCAG keyboard nav (arrows, Home/End, Enter/Space) |
| ~~No unsaved changes warning~~ | MetadataSpreadsheet.tsx | ✅ beforeunload handler with confirmation |
| ~~No fetch timeout~~ | ExternalImportDialog.tsx | ✅ 30s AbortController timeout |

---

## 1. Global Application Layer

### App.tsx

**Current Wiring:**
- Routes between 6 view modes with URL deep linking
- VaultProvider for normalized state management
- Per-view ErrorBoundary wrappers ✅
- Storage quota monitoring with toast warnings ✅
- Undo/redo keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
- Command palette (Cmd+K) with 11 commands
- Auto-save interval (30 seconds) with status indicator
- Content State API URL parsing for deep links
- Auth dialog integration for restricted resources
- Pipeline context for cross-view data transfer

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No React.Suspense boundaries | No loading states during transitions | Add Suspense with fallback spinners |
| No session recovery | Draft state lost on crash | localStorage backup every 10 seconds |
| No multi-tab coordination | Edits in one tab not reflected | BroadcastChannel sync |
| No offline indicator | Users unaware when offline | Add connection status |

**Bug Likelihood: LOW** (improved from HIGH)

---

### types.ts

**Current Wiring:**
- All IIIF types with proper interfaces
- `LanguageString` class with immutable operations and fallback chain
- `getIIIFValue()` utility for display extraction
- Resource state tracking ('cached' | 'stub' | 'local-only' | 'stale' | 'conflict')

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No type guards | Runtime errors from bad casts | Add isCanvas(), isManifest(), etc. |
| No runtime validation | Invalid manifests crash app | Add Zod schemas or runtime checks |

**Improvement (No New Features):**
```typescript
// Type guards for safe narrowing
export const isCanvas = (item: IIIFItem): item is IIIFCanvas => item.type === 'Canvas';
export const isManifest = (item: IIIFItem): item is IIIFManifest => item.type === 'Manifest';
export const isCollection = (item: IIIFItem): item is IIIFCollection => item.type === 'Collection';
export const isRange = (item: IIIFItem): item is IIIFRange => item.type === 'Range';
```

**Bug Likelihood: MEDIUM**

---

## 2. Layout Components

### Sidebar.tsx

**Current Wiring:**
- ManifestTree with keyboard navigation ✅
- Mode selection (6 modes with icons)
- Import/Export buttons
- Settings and Field Mode toggles
- Collapse all / Expand all buttons

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No tree search/filter | Hard to find items in large trees | Add inline filter input |
| No drag-drop from desktop | Must use import dialog | Wire ondragover/ondrop |
| No context menu on tree nodes | Limited quick actions | Add right-click menu |

**Bug Likelihood: LOW** (improved from MEDIUM)

---

### Inspector.tsx

**Current Wiring:**
- 4 tabs: Metadata, Provenance, Location (Geo), Learn
- MetadataEditor for IIIF properties
- GeoEditor for navPlace editing
- Contextual help per resource type

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Tab state not persisted | Always resets to first tab on selection change | Save to localStorage by resource type |
| No collapsible sections | Long metadata lists overwhelming | Add accordion sections |
| No relationship display | Can't see parent/children/siblings | Add Relationships section |

**Improvement (No New Features):**
```typescript
// Persist tab state per resource type
const [activeTab, setActiveTab] = useState(() =>
  localStorage.getItem(`inspector-tab-${resource?.type}`) || 'metadata'
);
useEffect(() => {
  if (resource?.type) {
    localStorage.setItem(`inspector-tab-${resource.type}`, activeTab);
  }
}, [activeTab, resource?.type]);
```

**Bug Likelihood: MEDIUM**

---

### StatusBar.tsx

**Current Wiring:**
- Total item count display
- Selected item label
- Validation issue count (clickable to open QC)
- Storage usage percentage with visual bar
- Save status indicator (saved/saving/error)

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No progress indicator for long ops | Blind during exports/imports | Add progress bar |
| No quick undo button | Must use keyboard shortcut | Add undo/redo buttons |
| No offline indicator | Users unaware when offline | Add connection status icon |

**Bug Likelihood: LOW**

---

### CommandPalette.tsx

**Current Wiring:**
- Cmd+K activation
- Fuzzy search with scoring
- Keyboard navigation (Up/Down/Enter/Escape)
- Command categories with icons

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No recent commands | Must search each time | Track last 5 in localStorage |
| Commands not contextual | Shows unavailable commands | Filter by current mode/selection |

**Bug Likelihood: LOW**

---

## 3. View Components

### ArchiveView.tsx

**Current Wiring:**
- 4 sub-views: Grid, List, Map, Timeline
- Virtualized rendering for Grid and List ✅
- Multi-select with Cmd/Ctrl+click
- Context menu (right-click)
- Selection actions bar
- Name filter input

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No rubber-band selection | Tedious multi-select for large sets | Implement drag-to-select rectangle |
| Only name filter | Can't filter by type/date | Add filter dropdowns |
| List columns not sortable | Can't organize by date/type | Add sort on header click |
| No batch delete in selection bar | Must use context menu | Add delete button |

**Bug Likelihood: MEDIUM**

---

### Viewer.tsx

**Current Wiring:**
- OpenSeadragon for image viewing with proper cleanup ✅
- AVPlayer integration for audio/video canvases
- Polygon annotation tool (draw button)
- Evidence extraction (crop region)
- Filmstrip navigation for multi-canvas manifests
- Search panel integration (when manifest has search service)
- Share button with Content State

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No rotation controls | Can't correct orientation | Add 90° CW/CCW buttons |
| No annotation list panel | Hard to manage existing annotations | Add sidebar annotation list |
| No annotation editing | Create only, can't modify | Add edit/delete for annotations |
| No fullscreen mode | Limited viewing space | Add fullscreen toggle |
| Transcription panel underdeveloped | Limited transcript display | Improve transcript rendering |

**Bug Likelihood: MEDIUM** (improved from HIGH)

---

### MetadataSpreadsheet.tsx

**Current Wiring:**
- Table view with inline editing
- Type filter tabs (All/Collection/Manifest/Canvas)
- CSV export and import ✅
- Commit changes button
- Row expansion for detail view
- Unsaved changes warning ✅

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No cell copy/paste | Tedious data entry | Add Ctrl+C/Ctrl+V handlers |
| No fill-down | Repetitive entry for similar items | Add Ctrl+D or fill-down button |
| No column reordering | Fixed column order | Add drag-drop column headers |
| No local undo | Can't undo uncommitted edits | Track edit history before commit |

**Bug Likelihood: LOW** (improved from MEDIUM)

---

### CollectionsView.tsx

**Current Wiring:**
- Hierarchical tree with depth limiting ✅
- Drag-drop reordering and nesting
- Auto-structure button (TOC generation)
- Behavior policy configuration
- Visual depth limit warnings ✅

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No multi-select in tree | Can't batch move items | Add Shift+click range select |
| No search within tree | Can't find items | Add Cmd+F filter |
| Drop zone feedback could improve | Sometimes unclear where drop will land | Better visual indicators |

**Bug Likelihood: LOW** (improved from HIGH)

---

### BoardView.tsx

**Current Wiring:**
- Kanban-style columns
- Drag-drop cards between columns
- Export board as IIIF Manifest

**Status: PARTIALLY IMPLEMENTED**

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Fixed column names | Can't customize workflow | Allow column rename |
| No card preview | Can't see content | Add hover preview |
| No filters | No way to find cards | Add filter input |
| Limited integration | Feels disconnected from main workflow | Better data binding |

**Bug Likelihood: MEDIUM**

---

### SearchView.tsx

**Current Wiring:**
- Full-text search across items
- Autocomplete suggestions
- Search result display with breadcrumb
- Recent searches
- Type filter dropdown

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No saved searches | Can't save complex queries | Add save search feature |
| No export results | Can't share search results | Add CSV export |
| No advanced filters | Limited query options | Add date range, metadata filters |

**Bug Likelihood: LOW**

---

## 4. Editing Components

### MetadataEditor.tsx

**Current Wiring:**
- Label/summary with language map support
- Rights dropdown (6 common licenses)
- Viewing direction selector
- Behavior checkboxes with conflict detection
- Complexity slider (simple/standard/advanced)
- Dublin Core mapping hints

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Plain text summary only | No formatting support | Add basic markdown preview |
| Single language view | Can't see all translations at once | Add "View All Languages" toggle |
| No field validation | Invalid URLs/dates accepted | Add format validators per field |

**Bug Likelihood: MEDIUM**

---

### BatchEditor.tsx

**Current Wiring:**
- Rename patterns with {orig}, {nnn} placeholders
- Shared metadata application
- Regex pattern extraction
- Preview of changes before apply

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No preview pagination | Slow for large batches | Add virtualization |
| No undo after apply | Can't revert batch changes | Create undo snapshot before apply |
| No selective apply | All-or-nothing | Add item checkboxes |
| No template save | Must re-enter patterns | Save to localStorage |

**Bug Likelihood: MEDIUM**

**Failsafe:**
```typescript
// Create undo snapshot before batch apply
const handleApply = () => {
  const snapshot = vault.exportRoot();
  localStorage.setItem('batch-undo-snapshot', JSON.stringify(snapshot));
  applyBatchChanges();
  showToast('Changes applied. Undo with Cmd+Z or use batch rollback.', 'success');
};
```

---

### CanvasComposer.tsx

**Current Wiring:**
- Layer management (z-order, opacity, lock)
- Position/size via inputs
- Alignment tools
- Background modes
- Undo/redo with history ✅
- Zoom controls

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No direct manipulation | Must use inputs for position | Add drag handles on canvas |
| No multi-select layers | Can't align multiple | Add Shift+click selection |
| No snapping | Hard to align precisely | Add snap-to-grid/guides |
| No layer thumbnails | Hard to identify layers | Add mini preview in layer list |

**Bug Likelihood: MEDIUM**

---

### PolygonAnnotationTool.tsx

**Current Wiring:**
- Draw polygons on canvas
- Click to add points
- Double-click to complete
- Save as IIIF annotation with SVG selector

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Can't edit existing polygons | Create only | Add vertex handles for editing |
| Can't delete individual points | Mistakes permanent | Add right-click delete point |
| Polygon shape only | No ellipse, rectangle, freehand | Add shape selector |

**Bug Likelihood: LOW**

---

## 5. Import/Export Components

### ExportDialog.tsx

**Current Wiring:**
- Format selection (static-site, raw-iiif)
- Include assets checkbox
- Progress display
- Download result

**Status: PARTIALLY WIRED**

The following export formats exist in services but lack UI:
- OCFL packages (archivalPackageService.ts)
- BagIt bags (archivalPackageService.ts)
- Activity Log (activityStream.ts)

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Missing OCFL/BagIt UI | Can't export archival packages | Add format options |
| Missing Activity Log UI | Can't export change history | Add format option |
| No export presets | Repeat configuration each time | Add preset save/load |
| No selective export | Exports entire root | Add tree selector |

**Bug Likelihood: MEDIUM**

---

### ExternalImportDialog.tsx

**Current Wiring:**
- URL input for remote manifests
- 30-second fetch timeout ✅
- IIIF Auth flow integration
- Version upgrade (v2 to v3)
- Preview before import

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Single URL only | Tedious batch import | Add textarea for multiple URLs |
| No import history | Re-type URLs | Store recent URLs in localStorage |
| No partial import | All-or-nothing | Add canvas/manifest selector |

**Bug Likelihood: LOW** (improved from MEDIUM)

---

### StagingArea.tsx

**Current Wiring:**
- File drag-drop zone
- 6-step ingest wizard
- Folder structure preservation
- Sidecar detection
- Progress indicators

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No resume interrupted ingest | Start over on crash | Checkpoint progress to IndexedDB |
| No duplicate detection | Same files imported multiple times | Hash and check existing assets |
| Large file handling | Memory issues with many large files | Process files in chunks |

**Bug Likelihood: HIGH**

---

### CSVImportDialog.tsx

**Current Wiring:**
- CSV file uploader
- Column mapping interface
- Preview parsed data
- Create vs update toggle

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No ID matching options | Limited update scenarios | Add flexible ID matching |
| No error rows display | Silent failures | Show rows that failed |
| No mapping presets | Re-configure each import | Save/load mapping profiles |

**Bug Likelihood: MEDIUM**

---

## 6. Media Components

### AVPlayer.tsx

**Current Wiring:**
- HTML5 audio/video playback
- Placeholder canvas (poster image)
- Accompanying canvas (sync content)
- TimeMode support (trim, scale, loop)
- Transcript synchronization

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No playback rate control | Can't speed up/slow down | Add speed dropdown (0.5x, 1x, 1.5x, 2x) |
| No skip controls | Tedious seeking | Add 10/30-second skip buttons |
| No keyboard shortcuts | Accessibility gap | Space=play/pause, arrows=seek |
| No chapter markers | Can't see ranges on timeline | Render range markers |

**Bug Likelihood: MEDIUM**

---

### GeoEditor.tsx

**Current Wiring:**
- Leaflet map for location editing
- Geocoding via Nominatim
- Marker and polygon drawing
- Coordinate display

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Single location only | Can't add multiple markers | Allow FeatureCollection |
| Geocoding requires network | Fails offline | Cache results, show offline message |

**Bug Likelihood: LOW**

---

## 7. Search & Organization

### SearchPanel.tsx

**Current Wiring:**
- Search within manifest annotations
- Hit highlighting
- Navigation to matching regions

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No search history persistence | Lose history on refresh | Store in localStorage |
| No result grouping | Long flat list | Group by canvas/resource |

**Bug Likelihood: LOW**

---

### ManifestTree.tsx

**Current Wiring:**
- Virtualized flat rendering (only visible items + overscan buffer) ✅
- Expand/collapse with arrow keys ✅
- Full keyboard navigation ✅
- Type icons per node
- Roving tabindex pattern
- Item count display for large trees (100+ items) ✅
- ResizeObserver for dynamic container sizing ✅
- Programmatic scroll-into-view on focus ✅

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No child count badges | Can't see nested item count | Add count badges |
| No inline rename | Must use Inspector | Add F2 or double-click rename |

**Bug Likelihood: LOW** (improved from MEDIUM)

---

## 8. Quality & Validation

### QCDashboard.tsx

**Current Wiring:**
- Issue list with severity levels
- Filter by category
- Click issue to navigate
- Some quick-fix actions

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No batch fix | Must fix issues one by one | Add "Fix All" for fixable issues |
| No issue suppression | Can't ignore known issues | Add "Ignore" with reason |
| No export report | Can't share QC status | Add PDF/CSV export |

**Bug Likelihood: LOW**

---

### CompatibilityReport.tsx

**Current Wiring:**
- Tests against Mirador, Universal Viewer, Annona, Clover
- Shows compatibility issues per viewer
- Links to documentation

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No embedded viewer preview | Must export to test | Add iframe preview |
| No custom viewer profiles | Fixed viewer list | Allow custom rules |

**Bug Likelihood: LOW**

---

## 9. Core Services

### vault.ts

**Current Wiring:**
- Normalized state with O(1) entity lookups
- Parent/child relationship tracking
- Extension preservation for vendor properties
- Immutable update helpers

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No named snapshots | Can't branch/compare states | Add snapshot save/restore API |
| No memory limit warnings | Can grow unbounded | Monitor entity count |

**Bug Likelihood: LOW**

---

### actions.ts

**Current Wiring:**
- 15+ action types for mutations
- Pre-mutation validation
- ActionHistory for undo/redo (100 steps)
- ActionDispatcher with subscriptions

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| History lost on reload | Undo unavailable after refresh | Persist recent actions to IndexedDB |
| No selective undo | Can't skip actions | Add action history browser |

**Bug Likelihood: LOW**

---

### storage.ts

**Current Wiring:**
- IndexedDB with 3 stores (files, derivatives, project)
- Storage quota monitoring ✅
- Warning callbacks at 90%/95% ✅
- Asset and derivative management

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No full backup option | Only per-project export | Add complete IndexedDB backup |
| No corruption recovery | Bad data causes issues | Add checksum verification |

**Bug Likelihood: LOW** (improved from HIGH)

---

### validator.ts

**Current Wiring:**
- Structural validation
- Metadata completeness checks
- IIIF compliance validation
- Behavior conflict detection

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Detection only, limited repair | Manual fix required | Add more auto-fix suggestions |
| No custom rules | Can't add institution rules | Allow rule plugins |

**Bug Likelihood: LOW**

---

## 10. Export Services

### exportService.ts

**Current Wiring:**
- JSON export with formatting
- ZIP packaging with JSZip
- Progress callbacks
- Asset rewriting for portability

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Loads all into memory | Large exports may fail | Use streaming approach |
| No encryption | Sensitive data exposed | Add password protection option |

**Bug Likelihood: MEDIUM**

---

### staticSiteExporter.ts (1076 lines)

**Current Wiring:**
- Complete static site generation
- IIIF tiles (Level 0)
- Lunr.js search index
- Item pages with metadata
- Gallery views

**Status: SERVICE COMPLETE, LIMITED UI**

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Fixed HTML templates | Can't customize design | Allow template overrides |
| Full rebuild every time | Slow for large sites | Add incremental builds |
| No preview server | Must download to test | Add local preview |

**Bug Likelihood: MEDIUM**

---

### archivalPackageService.ts (631 lines)

**Current Wiring:**
- OCFL 1.1 package generation
- BagIt 1.0 bag creation
- SHA-256/512 checksums
- Version management

**Status: SERVICE COMPLETE, NO UI**

This service is fully implemented but has no UI integration in ExportDialog.

**Bug Likelihood: LOW** (but unused)

---

## 11. Media Services

### avService.ts

**Current Wiring:**
- Audio/video state management
- TimeMode parsing
- Sync point generation
- Placeholder/accompanying canvas handling

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| Single track only | No multi-track audio | Add track management |
| No subtitle file import | WebVTT must be manual | Add VTT/SRT import |

**Bug Likelihood: MEDIUM**

---

### tileWorker.ts

**Current Wiring:**
- Background tile generation (Web Worker)
- Derivative sizes (150, 600, 1200px)
- Queue management

**Bug Likelihood: LOW**

---

## 12. Hooks

### useIIIFEntity.tsx (13 hooks)

**Current Wiring:**
- VaultProvider context
- Entity-specific hooks (useManifest, useCanvas, useAnnotation, etc.)
- useHistory for undo/redo access
- useBulkOperations for batch updates
- useEntitySearch for querying

**Remaining Issues:**
| Issue | Impact | Mitigation |
|-------|--------|------------|
| No fine-grained subscriptions | Excessive re-renders on any change | Add entity-specific subscriptions |
| Hook errors can cascade | Single error affects tree | Add try-catch wrappers |

**Bug Likelihood: MEDIUM**

---

## 13. Dead Code & Disconnected Features

### Fully Implemented but Not Wired to UI

| Service/Component | Lines | Status | Fix |
|-------------------|-------|--------|-----|
| archivalPackageService.ts | 631 | No UI in ExportDialog | Add format options |
| activityStream.ts | 532 | No export UI | Add to ExportDialog |
| contentAddressableStorage.ts | ~300 | Unused | Wire to ingest for dedup |
| autocompleteService (in searchService) | ~50 | Logic ready, UI disconnected | Connect to search inputs |

### Partially Implemented

| Component | Issue | Status |
|-----------|-------|--------|
| BoardView.tsx | Limited functionality, feels disconnected | Needs data model work |
| TimelineView.tsx | Basic, no grouping | Needs polish |
| ImageRequestWorkbench.tsx | No clear UI trigger | Add to Viewer tools |

### Potential Dead Code

| Item | Location | Recommendation |
|------|----------|----------------|
| Unused PREMIS export | provenanceService.ts | Document or remove |
| localIIIFServer.ts | Dev-only, no prod use | Mark as dev-only |
| virtualized data stubs | virtualizedData.ts | Complete or document |

---

## 14. Priority Matrix

### ✅ Completed (Previous Sprints)

| Component | Issue | Resolution |
|-----------|-------|------------|
| ExportDialog.tsx | Missing OCFL/BagIt/Activity export options | ✅ Already wired |
| ManifestTree.tsx | No virtualization for large trees | ✅ Custom virtualization implemented |
| StagingArea.tsx | No duplicate detection | ✅ fileIntegrity wired into iiifBuilder |
| AVPlayer.tsx | No keyboard shortcuts | ✅ Full WCAG keyboard controls |
| types.ts | No type guards | ✅ Type guards added |
| ArchiveView.tsx | No rubber-band selection | ✅ Drag-to-select implemented |
| Viewer.tsx | No rotation controls | ✅ 90° rotation buttons added |
| BatchEditor.tsx | No undo after apply | ✅ Snapshot + rollback added |
| Inspector.tsx | Tab state not persisted | ✅ localStorage persistence |
| Sidebar.tsx | No inline tree filter | ✅ Already implemented |

### Medium Priority (Backlog)

| Component | Issue | Impact | Effort |
|-----------|-------|--------|--------|
| App.tsx | No React.Suspense boundaries | No loading states | Medium |
| App.tsx | No multi-tab coordination | Edit conflicts | High |
| ManifestTree.tsx | No child count badges | Can't see nested count | Low |
| CommandPalette.tsx | No recent commands | Minor UX | Low |

### Low Priority (Nice to Have)

| Component | Issue | Impact | Effort |
|-----------|-------|--------|--------|
| CommandPalette.tsx | No recent commands | Minor UX | Low |
| CanvasComposer.tsx | No direct manipulation | Power user feature | High |
| BoardView.tsx | Custom columns | Flexibility | Medium |
| StatusBar.tsx | Offline indicator | Awareness | Low |

---

## 15. Next Actions

### ✅ Completed Sprints

#### Integration & Polish Sprint (COMPLETE)
1. ✅ Wire archival export formats - Already wired
2. ✅ Add type guards to types.ts - isCanvas(), isManifest(), etc.
3. ✅ Add AVPlayer keyboard shortcuts - Full WCAG controls
4. ✅ Add inline tree filter - Already implemented

#### Performance & Data Quality Sprint (COMPLETE)
5. ✅ Add tree virtualization to ManifestTree - Custom virtualization
6. ✅ Add duplicate detection in ingest - fileIntegrity wired
7. ✅ Add rubber-band selection to ArchiveView - Drag-to-select
8. ✅ Add undo snapshot to BatchEditor - Snapshot + rollback
9. ✅ Add rotation controls to Viewer.tsx - 90° CW/CCW buttons
10. ✅ Add Inspector tab persistence - localStorage per type

### Recommended Next Sprint: Resilience & UX

#### High Priority Tasks

1. **Add React.Suspense boundaries to App.tsx**
   - Wrap lazy-loaded views with loading fallbacks
   - Effort: Medium, Impact: Medium (UX polish)

2. **Add multi-tab coordination**
   - BroadcastChannel for cross-tab state sync
   - Prevent edit conflicts across tabs
   - Effort: High, Impact: Medium (data integrity)

3. **Add session recovery/auto-backup**
   - localStorage snapshot every 10 seconds
   - Recovery dialog on crash detection
   - Effort: Medium, Impact: High (data safety)

4. **Add offline indicator**
   - Connection status in StatusBar
   - Queue operations when offline
   - Effort: Low, Impact: Medium (awareness)

#### Medium Priority Tasks

5. Add child count badges to ManifestTree
6. Add recent commands to CommandPalette
7. Wire autocomplete service to SearchPanel
8. Add batch QC fix actions to QCDashboard

---

## Summary Statistics

| Metric | Value | Change |
|--------|-------|--------|
| Components Audited | 44 | - |
| Services Audited | 30 | - |
| Hooks Audited | 13 | - |
| Critical Issues | 0 | ✅ Resolved |
| High Priority Issues | 0 | ↓ -6 (all resolved) |
| Medium Priority Issues | 4 | ↓ -8 |
| Low Priority Issues | 4 | ↓ -4 |
| Disconnected Features | 4 | Identified |
| Dead Code Items | 3 | Identified |
| **Sprints Completed** | **3** | +2 |

---

## Appendix: Code Health Metrics

### Services by Size (Lines of Code)
1. staticSiteExporter.ts - 1,076
2. vault.ts - 876
3. specBridge.ts - 774
4. actions.ts - 733
5. archivalPackageService.ts - 631
6. contentSearchService.ts - 623
7. provenanceService.ts - 661
8. accessibility.ts - 555
9. navPlaceService.ts - 532
10. activityStream.ts - 532

### Components by Complexity
1. App.tsx - High (state management, routing, 10+ modals)
2. Viewer.tsx - High (OSD, annotations, media)
3. MetadataSpreadsheet.tsx - Medium (table, CSV, filters)
4. ArchiveView.tsx - Medium (4 sub-views, virtualization)
5. Inspector.tsx - Medium (4 tabs, multiple editors)

---

*Last Updated: 2026-01-24*
*Audit conducted using automated codebase exploration and manual review*
