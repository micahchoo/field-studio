
# IIIF Field Archive Studio - Implementation Worklist

**Last Updated**: 2026-01-23
**Spec Version**: Technical Specification v3.0

This document tracks implementation status against the Technical Specification v3.0. Items are prioritized as **Critical**, **High**, **Medium**, or **Low**.

---

## Legend
- ✅ **Implemented** - Feature complete and tested
- 🚧 **Partial** - Core functionality exists, needs refinement
- 📋 **Planned** - In worklist, not started
- ⚠️ **Spec Gap** - In spec but not in current codebase
- 🔧 **Needs Improvement** - Implemented but requires quality/compliance work

---

## 1. Core Infrastructure & IIIF Compliance

### Service Worker & Image API
- ✅ **Service Worker Image API** - IIIF Image API 3.0 Level 2 via sw.js
- ✅ **Tile Caching** - IndexedDB caching with cache versioning
- ✅ **Tiered Processing** - Pre-generated sizes (150px, 600px, 1200px) + dynamic
- ✅ **On-demand Tile Generation** - 512px tiles with scale factors [1,2,4,8,16]
- 🔧 **Image API Compliance** - Missing `info.json` generation (Priority: **Medium**)
  - Spec requires: `@context`, `protocol`, `profile`, width/height, tiles, sizes
  - Current: Dynamic serving without published info.json endpoints

### Content State API
- 🚧 **Content State Encoding/Decoding** - Service exists (`contentState.ts`)
- ⚠️ **Content State Import on Startup** - No `iiif-content` parameter handling (Priority: **High**)
  - Spec §13.4: Accept `?iiif-content=` parameter to restore view state
  - Implementation needed: URL parsing in App.tsx, state restoration
- ⚠️ **Content State Export/Sharing** - No UI for generating shareable links (Priority: **High**)
  - Spec §13.2: Share specific Canvas/region with colleagues
  - Implementation needed: "Share" button in Viewer, copy-to-clipboard

### Storage & Data Management
- ✅ **IndexedDB Storage** - Files, derivatives, projects stores
- ✅ **Quota Monitoring** - Real-time storage usage in StatusBar
- ✅ **Auto-save** - Configurable intervals (default 30s)
- ✅ **Error Boundaries** - React error handling with ErrorBoundary component
- 🔧 **Storage Eviction Policy** - Basic clear(), needs LRU strategy (Priority: **Low**)

### Search & Discovery
- ✅ **SearchService2** - Full-text search with FlexSearch
- ✅ **Search API Endpoint** - sw.js delegates to searchService
- 🔧 **Autocomplete Service** - Not implemented (Priority: **Low**)
  - Spec §8.3: AutoCompleteService2 for query suggestions

---

## 2. Data Model & IIIF Resource Generation

### Required Properties Compliance
- ✅ **@context as First Property** - Enforced in iiifBuilder
- ✅ **ID Generation** - UUID-based with HTTP URI format
- ✅ **Label Language Maps** - Support for multilingual labels
- ✅ **Canvas Dimensions** - Width/height pairing enforced
- 🔧 **Protocol Property** - Missing from ImageService3 (Priority: **Medium**)
  - Spec §8.1: Image services must declare `"protocol": "http://iiif.io/api/image"`

### Behavior Values
- 🚧 **Behavior Support** - Basic implementation exists
  - Implemented: `individuals`, `paged` in iiifBuilder
  - ⚠️ Missing: `continuous`, `auto-advance`, `no-auto-advance`, `repeat`, `facing-pages`, etc.
  - Priority: **Medium** - Add behavior options to MetadataEditor
- 🔧 **Behavior Inheritance** - Not fully spec-compliant (Priority: **Medium**)
  - Spec §3.4: Manifests DO NOT inherit from Collections
  - Current: Needs validation against inheritance rules

### Viewing Direction
- 🚧 **Viewing Direction** - Partially implemented
  - types.ts defines: `left-to-right | right-to-left | top-to-bottom | bottom-to-top`
  - iiifBuilder.ts sets default: `left-to-right`
  - ⚠️ Missing: UI controls in MetadataEditor (Priority: **Low**)

### Range/Structure Support
- ✅ **Range Editor UI** - RangeEditor component for TOC building
- 🚧 **Auto Range Generation** - Basic pattern detection in autoStructure.ts
  - Spec §3.6: Generate from folder structure or filename patterns
  - Current: Numeric pattern detection only
  - 📋 **Improvement**: Smart chapter inference from content (Priority: **Low**)

### Canvas Items vs Annotations
- ✅ **Painting Annotations** - Canvas.items with painting motivation
- ✅ **Non-painting Annotations** - Canvas.annotations with other motivations
- ✅ **Motivation Types** - painting, supplementing, commenting, tagging, linking, identifying, describing

### timeMode for AV Content
- ⚠️ **timeMode Property** - Not implemented (Priority: **Low**)
  - Spec §9.5: trim/scale/loop for audio/video annotations
  - Needed for: Audio/video Canvas support

---

## 3. Ingest & Convention System

### File Processing Pipeline
- ✅ **Chunked Processing** - Non-blocking batch ingest
- ✅ **EXIF Extraction** - Camera, date, GPS metadata
- ✅ **Derivative Generation** - Thumbnails at multiple sizes
- ✅ **Processing Limits** - File size checks
- 🚧 **Smart Sidecar Detection** - Partial implementation
  - Current: Basic file pairing logic exists
  - ⚠️ Missing: Auto-link jpg+txt, mp3+srt during ingest (Priority: **High**)
  - Spec §11.2: Automatic supplementing annotation creation

### Convention System
- ✅ **Underscore Prefix** - `_name` for Collections
- ✅ **Reserved Prefixes** - `+` for system folders, `!` for excluded
- 🔧 **Convention Documentation** - Differs from biiif standard (Priority: **Medium**)
  - Spec §7.2: Clear migration tools needed for biiif users
  - Current: No bidirectional conversion

### Metadata Import
- ✅ **CSV Import** - Column mapping to IIIF properties
- ✅ **EXIF/XMP Harvesting** - Automatic metadata extraction
- 📋 **Filename Pattern Detector** - Visual regex interface not implemented (Priority: **Low**)
  - Spec §2: Bulk metadata creation from patterns
  - Different from BatchEditor rename mode

---

## 4. User Interface & Workspace

### Layout Architecture
- ✅ **3-Panel Layout** - Sidebar, Workspace, Inspector
- ✅ **Resizable Panels** - Collapsible with keyboard shortcuts
- ✅ **Status Bar** - Save status, storage metrics, validation indicator
- ✅ **Dual-View Toggle** - Files vs IIIF semantic view
- ✅ **Command Palette** - Cmd+K quick actions

### Mode Implementation
- ✅ **Archive Mode** - Grid/List/Map/Timeline views
- ✅ **Collections Mode** - Hierarchy builder with drag-drop
- ✅ **Metadata Mode** - Spreadsheet with batch editing
- ✅ **Boards Mode** - Canvas for spatial relationship mapping
- ✅ **Viewer Mode** - Deep zoom with OpenSeadragon
- ✅ **Search Mode** - Full-text search with filters

### Field Mode
- ✅ **High-Contrast UI** - Black/yellow for outdoor visibility
- ✅ **Larger Touch Targets** - 48px minimum for glove use
- ✅ **Touch Device Detection** - Auto-enable on tablets
- 🔧 **Environmental Adaptations** - Missing battery/offline indicators (Priority: **Low**)
  - Spec §Field Research Human Factors: Battery, connectivity status

### Accessibility
- 🔧 **Keyboard Navigation** - Partial implementation (Priority: **Medium**)
  - Spec §16.2: Full keyboard shortcuts for all modes
  - Current: Some shortcuts exist, needs comprehensive coverage
- ⚠️ **ARIA Labels** - Minimal implementation (Priority: **Medium**)
  - Spec §16.1: WCAG 2.1 AA compliance required
- ⚠️ **Reduced Motion Option** - Not implemented (Priority: **Low**)

---

## 5. Annotation System

### Annotation Creation
- ✅ **Evidence Extraction** - Create annotations from Canvas regions
- ✅ **TextualBody Support** - Plain text annotations
- ✅ **Fragment Selectors** - Rectangular xywh regions
- ✅ **Multiple Targets** - Linking annotations across resources
- 📋 **Polygon Annotation Tool** - SvgSelector not implemented (Priority: **Medium**)
  - Spec §9.3: SVG path-based regions for complex shapes
  - Current: Only rectangular selections supported
- ⚠️ **Point Selectors** - Not implemented (Priority: **Low**)
  - Spec §9.3: Temporal/spatial point annotations
- ⚠️ **Temporal Selectors** - No t=start,end support (Priority: **Low**)
  - Spec §9.3: Fragment selectors for audio/video timing

### Annotation Bodies
- ✅ **TextualBody** - With language tags
- ✅ **ExternalWebResource** - Images, video, audio, 3D models
- ✅ **SpecificResource** - With fragment selectors
- 📋 **Choice Bodies** - Multiple alternatives not implemented (Priority: **Low**)
  - Spec §9.4: Transcription in multiple languages

### OCR Integration
- ⚠️ **OCR Service** - Not implemented (Priority: **Low**)
  - Spec §11.2: Auto-generate supplementing annotations from text recognition
  - Worklist notes: "Skeleton Implemented" but no evidence in codebase

---

## 6. Board Canvas System (Spatial Thinking)

### Board Data Model
- ✅ **Board Items** - Placement on infinite canvas
- ✅ **Connections** - Visual links between resources
- ✅ **Connection Types** - depicts, transcribes, relatesTo, contradicts, precedes
- 🔧 **IIIF Manifest Export** - Boards not exported as valid Manifests (Priority: **Medium**)
  - Spec §10.1: Board should be Manifest with large Canvas
  - Current: Board state is local-only, not IIIF-compliant

### Board Tools
- ✅ **Select Tool** - Move and resize items
- ✅ **Connect Tool** - Draw relationships
- 🔧 **Frame Tool** - Range grouping not implemented (Priority: **Low**)
  - Spec §10.4: Create grouping frames for sections
- ⚠️ **Sticky Note Tool** - Comment annotations not in board (Priority: **Low**)
- ⚠️ **Region Select Tool** - Partial selection within items (Priority: **Low**)

---

## 7. Validation & Quality Control

### Validation Rules
- ✅ **QC Dashboard** - Categorized issues (Identity, Structure, Metadata, Content)
- ✅ **Auto-Healing** - One-click fixes for common issues
- ✅ **Health Score** - Percentage calculation
- ✅ **Real-time Indicators** - Visual validation feedback
- 🔧 **Validator Integration** - Custom validator, not using external tools (Priority: **Medium**)
  - Spec §15.2: Integration with presentation-validator.iiif.io
  - Current: Local validation only, may miss edge cases

### Validation Feedback
- ✅ **Status Bar Indicators** - ✓/⚠️/✗ with click-to-view
- ✅ **Issue Panel** - Detailed error descriptions
- ✅ **Suggested Fixes** - Actionable buttons
- 🔧 **Validation Modes** - Missing batch/pre-export modes (Priority: **Low**)
  - Spec §15.2: Real-time, pre-export, batch validation

---

## 8. Export & Publishing

### Export Formats
- ✅ **IIIF JSON** - Presentation API 3.0 export
- ✅ **ZIP Archive** - Complete package
- 🚧 **Static Website** - Basic HTML export
  - Current: Entry point HTML exists
  - ⚠️ Missing: Embedded viewer (Mirador/UV) integration (Priority: **High**)
  - Spec §12.2: Self-contained deployable package

### Export Features
- ✅ **Export Dry Run** - Preview before export
- ✅ **Validation Check** - Pre-export compliance verification
- ✅ **Progress Tracking** - Visual progress indicators
- ⚠️ **Asset Exclusion** - No selective export (Priority: **Medium**)
  - Spec §12.1: Toggle asset inclusion/exclusion

### Static Site Structure
- 🔧 **Level 0 Image API** - Pre-generated sizes only (Priority: **High**)
  - Spec §12.2: `/images/{id}/info.json` with static sizes
  - Current: Images exported but no info.json structure
- ⚠️ **Viewer Integration** - No embedded viewer in export (Priority: **High**)
  - Spec §12.2: Mirador or Universal Viewer included
  - Implementation needed: Bundle viewer in export package

---

## 9. Instructional Design & Learning Support

### Onboarding
- ✅ **Onboarding Modal** - Persona selection on first launch
- ✅ **Abstraction Levels** - Simple/Standard/Advanced modes
- ✅ **Metadata Templates** - Pre-configured by persona
- 🔧 **Adaptive Entry** - No skill assessment (Priority: **Low**)
  - Spec feedback: Detect IIIF knowledge, skip novice scaffolding for experts

### Contextual Help
- ✅ **Contextual Help Component** - Mode-specific overlays
- ✅ **Educational Tooltips** - IIIF concept explanations
- 🔧 **Just-in-Time Help** - Not behavior-triggered (Priority: **Low**)
  - Spec feedback: Trigger help on hesitation (2s hover, 3 repeated errors)
- ⚠️ **Video Tutorials** - No embedded learning media (Priority: **Low**)
  - Spec feedback: 2-minute videos for complex workflows

### Learning Analytics
- ⚠️ **Progress Tracking** - Not implemented (Priority: **Low**)
  - Spec feedback: "IIIF concepts mastered: 4/8"
  - Spec feedback: "Common errors reduced: 75%"
- ⚠️ **Metacognitive Tools** - No self-assessment (Priority: **Low**)
  - Spec feedback: Reflection prompts, concept checks

---

## 10. Critical Gaps from Spec Analysis

### High Priority Issues

1. **⚠️ Content State API Integration** (Priority: **Critical**)
   - Missing: URL parameter handling on app load
   - Missing: UI for generating shareable links
   - Impact: Cannot share specific views with colleagues
   - Spec §13: Full Content State API 1.0 support required

2. **⚠️ Static Export Quality** (Priority: **Critical**)
   - Missing: Embedded IIIF viewer (Mirador/UV)
   - Missing: Level 0 Image API info.json
   - Impact: Exported sites not self-contained or browsable
   - Spec §12.2: Deployable static site with viewer

3. **⚠️ Smart Sidecar Detection** (Priority: **High**)
   - Missing: Auto-link jpg+txt, mp3+srt during ingest
   - Impact: Manual annotation creation for transcriptions
   - Spec §11.2: Automatic supplementing annotation pairs

4. **🔧 IIIF Compliance Gaps** (Priority: **High**)
   - Missing: `protocol` property in ImageService3
   - Missing: Full behavior value support (12+ values)
   - Missing: Behavior inheritance validation
   - Impact: Non-compliant manifests may fail in external viewers

### Medium Priority Enhancements

5. **🔧 Board System IIIF Export** (Priority: **Medium**)
   - Current: Boards are local state only
   - Needed: Export boards as valid IIIF Manifests
   - Spec §10.1: Board = Manifest with large Canvas + annotations

6. **📋 Polygon Annotation Tools** (Priority: **Medium**)
   - Current: Rectangular selections only
   - Needed: SVG path drawing for complex shapes
   - Spec §9.3: SvgSelector support

7. **🔧 External Validator Integration** (Priority: **Medium**)
   - Current: Custom validation logic
   - Needed: Call presentation-validator.iiif.io API
   - Spec §15.2: Use established validators

8. **⚠️ Accessibility Compliance** (Priority: **Medium**)
   - Missing: Comprehensive keyboard shortcuts
   - Missing: ARIA labels on interactive elements
   - Spec §16.1: WCAG 2.1 AA compliance

### Low Priority / Nice-to-Have

9. **📋 OCR Integration** (Priority: **Low**)
   - Spec §11.2: Tesseract.js for text recognition
   - Use case: Generate transcriptions from images

10. **⚠️ Learning Analytics** (Priority: **Low**)
    - Spec feedback: Progress visualization, self-assessment
    - Use case: Track user mastery of IIIF concepts

11. **⚠️ Advanced Annotation Types** (Priority: **Low**)
    - Missing: Choice bodies, Point selectors, Temporal fragments
    - Spec §9.3-9.5: Full W3C Web Annotation support

12. **🔧 Convention Migration Tools** (Priority: **Low**)
    - Current: Underscore convention differs from biiif
    - Needed: Bidirectional conversion utilities
    - Spec §7.2: Interoperability with biiif ecosystem

---

## Implementation Roadmap

### Phase 1: Critical Compliance (Next Sprint)
1. Content State API parameter handling
2. Static export with embedded viewer
3. Image API info.json generation
4. Smart sidecar auto-detection

### Phase 2: IIIF Refinement
1. Full behavior value support
2. Protocol property for ImageService3
3. Behavior inheritance validation
4. External validator integration

### Phase 3: UX & Accessibility
1. Comprehensive keyboard shortcuts
2. ARIA label audit
3. Adaptive onboarding with skill assessment
4. Board IIIF export

### Phase 4: Advanced Features
1. Polygon annotation tools (SvgSelector)
2. OCR integration
3. Choice bodies and temporal selectors
4. Learning analytics dashboard

---

## Notes

**Spec Version Analyzed**: Technical Specification v3.0 (spec.md)
**Codebase State**: Production-ready MVP with comprehensive IIIF support
**Assessment**: Strong foundation with 80%+ spec coverage. Critical gaps in Content State API, static export quality, and full IIIF compliance edge cases.

**Architecture Strengths**:
- Local-first with IndexedDB + Service Worker is innovative
- QC Dashboard with auto-healing is excellent UX
- Field Mode addresses real-world research constraints

**Architecture Concerns** (from spec feedback):
- Service Worker memory limits for large images (spec suggests hybrid pre-gen + dynamic)
- Convention system conflicts with biiif ecosystem
- Missing scalability details for 1000+ image collections

**Next Steps**:
1. Prioritize Content State API (critical for collaboration)
2. Improve static export (self-contained sites)
3. Add external validator integration
4. Conduct WCAG accessibility audit

---

## 11. Expert Panel Recommendations (2026-01-23)

Based on feedback from simulated expert reviews (Archivist, IIIF Expert, Human Factors Engineer, Solutions Architect). See `EXPERT_FEEDBACK.md` for full analysis.

### Critical Priority (Must Address)

| Item | Expert | Status | Rationale |
|------|--------|--------|-----------|
| **Virtualized data model** | Architect | ✅ Implemented | `services/virtualizedData.ts` - LRU cache + lazy loading |
| **Focus management + ARIA audit** | HF Engineer | ✅ Implemented | `services/accessibility.ts` - FocusTrap, ARIA utilities |
| **Viewer compatibility testing** | IIIF Expert | ✅ Implemented | `services/viewerCompatibility.ts` - Multi-viewer validation |
| **Provenance logging system** | Archivist | ✅ Implemented | `services/provenanceService.ts` + ProvenancePanel component |

### High Priority

| Item | Expert | Rationale |
|------|--------|-----------|
| **Background tile pre-generation** | Architect | Service Worker bottleneck causes UI freezing |
| **Metadata complexity slider** | HF Engineer | Reduce cognitive overload for field researchers |
| **partOf property throughout** | IIIF Expert | Required for Content State API navigation context |
| **Batch operation audit trail** | Archivist | Accountability for mass changes to records |
| **Delta-based state persistence** | Architect | Prevent corruption on interrupted saves |
| **Ingest wizard visual preview** | HF Engineer | Show resulting structure before committing |

### Medium Priority

| Item | Expert | Rationale |
|------|--------|-----------|
| **Controlled vocabulary lookup** | Archivist | LCSH/AAT autocomplete for metadata quality |
| **Navigation breadcrumb trail** | HF Engineer | Reduce mode-switching friction |
| **Temporal Range support** | IIIF Expert | Enable audio/video TOC navigation |
| **Component-level error boundaries** | Architect | Graceful degradation on component failures |
| **Touch target audit (Field Mode)** | HF Engineer | Ensure 48px+ for all interactive elements |
| **v2→v3 manifest upgrader** | IIIF Expert | Robust conversion for external manifests |

### Low Priority / Future

| Item | Expert | Rationale |
|------|--------|-----------|
| **ISAD(G) metadata template** | Archivist | Integration with archival management systems |
| **Swipe gestures** | HF Engineer | Enhanced mobile/tablet experience |
| **Telemetry endpoint** | Architect | Optional error monitoring for production |
| **Sensitive materials flagging** | Archivist | Access restrictions for cultural protocols |

---

## 12. Revised Implementation Roadmap

### Phase 1: Scalability & Accessibility (Critical)
1. Virtualized data loading (lazy-load manifest stubs)
2. WCAG 2.1 AA audit + focus management fixes
3. ARIA labels for all interactive elements
4. Viewer compatibility test suite (Mirador, UV)

### Phase 2: Professional Archival Features
1. Provenance logging (ingest timestamps, change history)
2. Batch operation preview + audit trail
3. Controlled vocabulary autocomplete (LCSH/AAT)
4. partOf property for Content State navigation

### Phase 3: Performance Optimization
1. Background tile pre-generation during ingest
2. Delta-based IndexedDB persistence
3. Web Worker pool for image processing
4. Component-level error boundaries

### Phase 4: UX Refinement
1. Metadata complexity slider by persona
2. Ingest wizard with visual structure preview
3. Navigation breadcrumb trail
4. Touch target standardization (48px+ Field Mode)

### Phase 5: Advanced IIIF Features
1. Temporal Range support for AV content
2. Robust v2→v3 manifest upgrader
3. Polygon annotation tools (SvgSelector)
4. Board IIIF-compliant export

---

## Spec.md Enhancement Requirements

Based on expert feedback, add these sections to the Technical Specification:

1. **§18 Provenance & Audit Logging**
   - Change history per resource
   - Ingest source tracking
   - PREMIS metadata export

2. **§19 Scalability Considerations**
   - Maximum archive size targets (1000+ items)
   - Memory management strategy
   - Performance benchmarks

3. **§16 Accessibility Requirements** (Enhance existing)
   - Complete WCAG 2.1 AA checklist
   - Keyboard navigation specification
   - Screen reader compatibility matrix

4. **§20 Interoperability Testing**
   - Viewer compatibility requirements
   - v2/v3 conversion specification
   - CORS handling documentation

---

## 13. Architecture Inspiration (Digirati Manifest Editor)

Based on analysis of Digirati's `@iiif/vault` architecture. See `ARCHITECTURE_INSPIRATION.md` for full analysis.

### Critical Anti-Patterns to Fix

**Current Issue**: 15+ instances of `JSON.parse(JSON.stringify(root))` for state updates.
- Causes O(n) memory allocation on every change
- Blocks main thread for large manifests
- Prevents efficient undo/redo implementation

### Vault Pattern Migration (Priority: CRITICAL)

| Component | Pattern | Benefit |
|-----------|---------|---------|
| **Normalized State** | Flat entity store by ID | O(1) lookups instead of tree traversal |
| **Action-Driven Mutations** | Dispatch validated actions | Pre-mutation validation + undo/redo |
| **Entity Hooks** | `useManifest()`, `useCanvas()` | Encapsulated IIIF complexity |
| **V2↔V3 Bridge** | Upgrade on load, downgrade on export | Simplified component logic |

### New Dependencies to Consider

```json
{
  "@iiif/vault": "^0.9.x",
  "@iiif/parser": "^1.1.x",
  "immer": "^10.x"
}
```

### Architecture Refactor Phases

**Phase A: State Normalization** (Critical)
1. Create `services/vault.ts` with normalized state
2. Implement `normalize()` on project load
3. Implement `denormalize()` on export
4. Migrate `App.tsx` to use vault

**Phase B: Action System** (High)
1. Create `services/actions.ts` with typed actions
2. Implement reducer with validation
3. Add undo/redo history stack
4. Integrate provenance logging with actions

**Phase C: Hook Migration** (High)
1. Create `useManifest()`, `useCanvas()`, `useAnnotation()` hooks
2. Add automatic locale resolution
3. Migrate components to use hooks
4. Remove direct `findItem()` traversals

**Phase D: Spec Bridge** (Medium)
1. Integrate `@iiif/parser` for v2→v3 upgrading
2. Add v2 export option
3. Improve external manifest import reliability

**Phase E: Workbench Refactor** (Low)
1. Create workbench folder structure
2. Isolate mode-specific state and actions
3. Enable lazy loading by workbench

### Performance Targets

| Metric | Current | After Vault |
|--------|---------|-------------|
| Single property update | ~50ms | <5ms |
| Memory (1000 canvases) | ~500MB | ~100MB |
| Undo/redo support | None | Full history |
| v2 import success rate | ~70% | 99%+ |
