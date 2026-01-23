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

---

## 📋 Backlog (Prioritized)

### Critical / High Priority
- [ ] **IIIF Compliance: Full Behavior Support** - Add all 12+ spec behavior values to MetadataEditor.
- [ ] **Board System: IIIF Manifest Export** - Export boards as valid IIIF Manifests with large Canvases.
- [ ] **Performance: Background Tile Pre-generation** - Move tile generation to a background Web Worker during ingest.
- [ ] **Archival: Provenance PREMIS Export** - Complete the PREMIS XML mapping for resource history.

### Medium Priority
- [ ] **UX: Metadata Complexity Slider** - Toggle visible metadata fields based on user persona (Simple vs Expert).
- [ ] **Ingest: Visual Preview Wizard** - Show the proposed IIIF structure before committing files to IndexedDB.
- [ ] **Annotation: Polygon Tool (SvgSelector)** - Implementation of non-rectangular selection regions.
- [ ] **Search: Autocomplete Service** - Implement `AutoCompleteService2` for global search.

### Low Priority / Future
- [ ] **AI: OCR Integration** - Tesseract.js integration for auto-transcription of image sidecars.
- [ ] **Learning: Progress Analytics** - Dashboard showing IIIF concepts mastered by the user.
- [ ] **Convention: biiif Migration Tools** - Bidirectional conversion for standard `biiif` folder structures.

---

## ✅ Completed Items

### Core Infrastructure
- [x] **Static Export Offline Bundling** - Self-contained exports with local viewer assets.
- [x] **Smart Sidecar Detection** - Auto-linking of transcriptions and captions during ingest.
- [x] **Service Worker Image API** - IIIF Image API 3.0 Level 2 implementation.
- [x] **IndexedDB Storage** - Local-first persistence for files and project state.
- [x] **Search Service** - Full-text search using FlexSearch.
- [x] **Content State API** - `iiif-content` parameter handling and link generation (Verified in `App.tsx`).
- [x] **Virtualized Data Model** - LRU cache and lazy loading implemented in `services/virtualizedData.ts`.
- [x] **Provenance System** - Change tracking and history panel.

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
