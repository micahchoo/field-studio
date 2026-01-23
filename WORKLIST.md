# IIIF Field Archive Studio - Implementation Worklist

**Last Updated**: 2026-01-23
**Spec Version**: Technical Specification v3.0

---

## 🚀 Active Sprint (Next Batch)

These tasks prioritize offline reliability, spec compliance, and foundational accessibility.

- [x] **Static Export: Offline Viewer Bundling** (Critical)
  - Replace CDN links in `exportService.ts` with bundled Universal Viewer assets.
  - Ensure exported ZIP is fully self-contained and works without internet.
- [x] **Ingest: Smart Sidecar Detection** (High)
  - Automatically link `.txt` (transcriptions) and `.srt` (captions) to media files during ingest in `iiifBuilder.ts`.
  - Create `supplementing` annotations for detected sidecars.
- [x] **Accessibility: ARIA & Keyboard Audit** (Critical)
  - Add missing ARIA labels to Sidebar, Toolbar, and Inspector components.
  - Verify focus traps for modals and resizable panels.
- [x] **Compliance: Image API Protocol Property** (Medium)
  - Add `"protocol": "http://iiif.io/api/image"` to `info.json` generation in `exportService.ts` and `sw.js`.
- [x] **IIIF Compliance: Full Behavior Support** (High)
  - Added all 12+ IIIF spec behavior values with descriptions and category labels.
  - Implemented behavior conflict detection and auto-resolution in MetadataEditor.
  - Created `BEHAVIOR_DEFINITIONS` with full spec-compliant descriptions.
- [x] **Board System: IIIF Manifest Export** (High)
  - Export boards as valid IIIF Manifests with large Canvases.
  - Items positioned as painting annotations with fragment selectors.
  - Connections exported as linking annotations with relationship metadata.
- [x] **Performance: Background Tile Pre-generation** (High)
  - Created `tileWorker.ts` with Web Worker pool for parallel tile generation.
  - Thumbnails generated immediately for UI; larger sizes (600, 1200) queued for background processing.
  - Non-blocking ingest with progress reporting.
- [x] **Archival: Provenance PREMIS Export** (Medium)
  - Full PREMIS 3.0 compliant XML export with intellectual entities, events, agents, and relationships.
  - Added `exportMultiplePREMIS()` for batch export.
  - Enhanced event detail structure with property change tracking.

---

## 📋 Backlog (Prioritized)

### High Priority - Next Batch
- [x] **Spec Bridge: V2/V3 Import** - Auto-upgrade IIIF v2 manifests on import.
  - Detect version from @context, normalize to v3 internally
  - Implemented `services/specBridge.ts` with `upgradeToV3()`, `detectVersion()`
- [x] **Selector Abstraction** - Parse URI fragments into editable objects.
  - Implemented `services/selectors.ts` with full W3C Media Fragments support
  - Parse `#xywh=` for spatial, `#t=` for temporal, SVG and Point selectors
- [x] **Migrate App.tsx to Vault** - Replace deep-clone pattern with vault actions.
  - VaultProvider wired at app root level ✅
  - Undo/redo keyboard shortcuts enabled (Cmd+Z, Cmd+Shift+Z) ✅
  - `handleItemUpdate` now uses `dispatch(actions.batchUpdate(...))` ✅
  - `BatchEditor.onApply` now uses `useBulkOperations().batchUpdate()` ✅
  - Storage sync via `exportRoot()` after vault mutations ✅

### Medium Priority
- [x] **UX: Metadata Complexity Slider** - Toggle visible metadata fields based on user persona.
  - Added `METADATA_FIELD_DEFINITIONS` with complexity levels (simple/standard/advanced)
  - Created visual slider in PersonaSettings with field preview
  - Updated Inspector to conditionally show fields based on complexity
- [x] **Search: Autocomplete Service** - Enhanced searchService.ts with autocomplete.
  - Prefix matching with frequency-based ranking
  - Fuzzy matching using Levenshtein distance
  - Recent searches persistence and type filter suggestions
- [x] **Annotation: Polygon Tool (SvgSelector)** - Non-rectangular selection regions.
  - Created `PolygonAnnotationTool.tsx` with polygon, rectangle, and freehand modes
  - SVG selector generation and parsing with Douglas-Peucker simplification
  - Integrated with selectors.ts service

### High Priority - Phase 3 Refinement (from Architecture Patterns)
- [x] **Extension Preservation (Round-Tripping)** - Store unknown JSON-LD properties during import.
  - Added `extensions` map to NormalizedState in vault.ts
  - `extractExtensions()` preserves vendor properties (mirador, tify configs)
  - `applyExtensions()` restores them on denormalize/export
- [x] **Content-Addressable Storage (Hashing)** - SHA-256 file integrity (Tropy pattern).
  - Created `services/fileIntegrity.ts` with SHA-256 hashing
  - Deduplication via content fingerprinting
  - Consolidator flow for moved/broken file links
- [x] **Activity Stream (Change Discovery API)** - Track changes for sync.
  - Created `services/activityStream.ts` with IIIF Change Discovery 1.0
  - Activity types: Create, Update, Delete, Move, Add, Remove
  - Export as OrderedCollection/OrderedCollectionPage for sync

### Medium Priority
- [x] **Ingest: Visual Preview Wizard** - Show the proposed IIIF structure before committing files.
  - `StagingArea.tsx` implements 6-step wizard (analyze→structure→details→identity→review→processing)
  - Schematic preview shows proposed IIIF hierarchy before commit
- [ ] **CSV/Spreadsheet Sync** - Bulk metadata import/export (Wax pattern).
  - Import: ✅ `csvImporter.ts` + `CSVImportDialog.tsx` exist
  - Export: 🔲 Missing - need `csvExporter.ts` for round-trip
- [ ] **Lazy Selector Hydration** - Performance for large manifests.
  - Parse SVG/complex selectors only on interaction
  - Reduce initial compute for OCR-heavy manifests

### Low Priority / Future
- [ ] **AI: OCR Integration** - Tesseract.js integration for auto-transcription of image sidecars.
- [ ] **Learning: Progress Analytics** - Dashboard showing IIIF concepts mastered by the user.
- [ ] **Convention: biiif Migration Tools** - Bidirectional conversion for standard `biiif` folder structures.
- [ ] **Workbench Architecture** - Refactor views into self-contained workbench modules.
- [ ] **Static Site Export (Wax pattern)** - Generate static IIIF site from boards.

---

## ✅ Completed Items

### Architecture Foundation (Vault Pattern)
- [x] **Vault: Normalized State** - `services/vault.ts` with O(1) entity lookup.
  - Flat storage by type (Collection, Manifest, Canvas, Range, Annotation)
  - `normalize()` / `denormalize()` for tree conversion
  - Reference tracking: parent→children, child→parent
- [x] **Vault: Action-Driven Mutations** - `services/actions.ts` with undo/redo.
  - 15+ typed actions with pre-mutation validation
  - `ActionHistory` with configurable max size
  - `ActionDispatcher` with subscribe/onError listeners
- [x] **LanguageString Class** - Immutable language map wrapper in `types.ts`.
  - Fallback chain: locale → none → @none → en → first
  - Operations: get, set, append, remove, merge, equals
- [x] **Entity Hooks** - `hooks/useIIIFEntity.ts` with VaultProvider.
  - Specialized: useManifest, useCanvas, useAnnotation, useCollection, useRange
  - Utilities: useHistory, useRoot, useBulkOperations, useEntitySearch
- [x] **Spec Bridge** - `services/specBridge.ts` for V2→V3 manifest upgrading.
  - Auto-detect version from @context, normalize to v3 internally
  - Handles sequences→items, label strings→language maps, viewingHint→behavior
- [x] **Selector Abstraction** - `services/selectors.ts` for URI fragment parsing.
  - Full W3C Media Fragments support (xywh, t, percent)
  - SVG and Point selector support, serialization for round-trip
- [x] **App.tsx Vault Integration** - Full migration to Vault dispatch pattern.
  - VaultProvider at app root with normalized state
  - Undo/redo keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
  - `handleItemUpdate` and `BatchEditor.onApply` use dispatch actions
  - Storage sync via `exportRoot()` after all mutations
- [x] **Ingest Visual Preview Wizard** - `StagingArea.tsx` wizard.
  - 6-step flow: analyze→structure→details→identity→review→processing
  - Shows proposed IIIF hierarchy before committing to IndexedDB
- [x] **Metadata Complexity Slider** - Field visibility based on user expertise.
  - `METADATA_FIELD_DEFINITIONS` with 16 fields across 4 categories
  - Visual slider with field preview in PersonaSettings
  - Inspector conditionally shows rights, navDate, behavior, viewingDirection
- [x] **Search Autocomplete** - Enhanced searchService with intelligent suggestions.
  - Word index for prefix matching with frequency ranking
  - Fuzzy matching using Levenshtein distance algorithm
  - Recent searches persistence with type filter syntax
- [x] **Polygon Annotation Tool** - SvgSelector support for non-rectangular regions.
  - PolygonAnnotationTool.tsx with polygon, rectangle, freehand modes
  - Douglas-Peucker path simplification for freehand
  - SVG selector serialization compatible with IIIF spec
- [x] **Extension Preservation** - Round-trip unknown JSON-LD properties.
  - `extensions` map in vault.ts NormalizedState
  - `KNOWN_IIIF_PROPERTIES` defines spec properties by type
  - Vendor extensions survive import→edit→export cycle
- [x] **File Integrity (SHA-256)** - Content-addressable storage in `services/fileIntegrity.ts`.
  - SHA-256 hashing via Web Crypto API
  - Duplicate detection before import
  - Consolidator flow for broken/moved file links
- [x] **Activity Stream** - IIIF Change Discovery 1.0 in `services/activityStream.ts`.
  - Activity types: Create, Update, Delete, Move, Add, Remove
  - Export as OrderedCollection with pagination
  - Sync support via `getActivitiesSince()` and `importActivities()`

### Core Infrastructure
- [x] **Static Export Offline Bundling** - Self-contained exports with local viewer assets.
- [x] **Smart Sidecar Detection** - Auto-linking of transcriptions and captions during ingest.
- [x] **Service Worker Image API** - IIIF Image API 3.0 Level 2 implementation.
- [x] **IndexedDB Storage** - Local-first persistence for files and project state.
- [x] **Search Service** - Full-text search using FlexSearch.
- [x] **Content State API** - `iiif-content` parameter handling and link generation.
- [x] **Virtualized Data Model** - LRU cache and lazy loading in `services/virtualizedData.ts`.
- [x] **Provenance System** - Full PREMIS 3.0 export with history panel.
- [x] **Background Tile Generation** - Web Worker pool in `services/tileWorker.ts`.
- [x] **Full Behavior Support** - All 12+ IIIF behaviors with conflict detection.
- [x] **Board Export** - Export boards as IIIF Manifests with spatial annotations.

### User Interface
- [x] **3-Panel Layout** - Responsive workspace with resizable panels.
- [x] **Field Mode** - High-contrast, touch-optimized UI for outdoor research.
- [x] **Archive Views** - Grid, List, Map, and Timeline visualizations.
- [x] **Onboarding** - Persona selection and abstraction level scaffolding.
- [x] **Command Palette** - Quick navigation and actions (Cmd+K).

---

## Notes
- **Architecture**: Moving toward `@iiif/vault` pattern for state normalization (See `ARCHITECTURE_INSPIRATION.md`).
- **Expert Feedback**: Incorporated recommendations from simulated Archivist, HF Engineer, and IIIF Expert reviews.
