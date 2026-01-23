# Expert Review Panel: IIIF Field Archive Studio

**Review Date**: 2026-01-23
**Documents Reviewed**: spec.md v3.0, WORKFLOW_MANIFESTO.md, AFFORDANCE_MATRIX.md, Codebase

---

## 1. Digital Archivist Perspective

**Reviewer**: Dr. Elena Vasquez, Head of Digital Collections, National Archives
**Focus**: Archival standards, preservation workflows, metadata quality, professional practice

### Strengths

**Exceptional Alignment with Archival Principles**
- The hierarchical model (Collection → Manifest → Canvas) maps perfectly to archival arrangement (Fonds → Series → Item)
- The "Archive DNA" concept for EXIF/GPS extraction addresses a critical pain point in field documentation
- Batch metadata editing with Dublin Core mapping shows understanding of professional cataloging needs

**Preservation-Ready Design**
- Local-first architecture ensures researchers retain custody of their materials
- The export to static IIIF packages creates preservation-ready outputs
- Checksum generation (mentioned in spec §11.2) provides fixity verification

### Critical Gaps

**1. Provenance Chain is Incomplete**
```
MISSING: Capture the full chain of custody from ingest to export
- Who ingested these files? When?
- What transformations were applied?
- What was the original filename before normalization?
```
**Recommendation**: Add a `provenance` log stored with each resource, exportable as PREMIS metadata.

**2. No Controlled Vocabulary Integration**
```
MISSING: Connection to authority files
- Library of Congress Subject Headings (LCSH)
- Getty Art & Architecture Thesaurus (AAT)
- Local controlled vocabularies
```
**Recommendation**: Add vocabulary lookup service with autocomplete for metadata fields. The `seeAlso` property should link to authority records.

**3. Bulk Operations Lack Audit Trail**
```
CONCERN: Batch edits are immediate and irreversible
- No confirmation of scope before execution
- No rollback capability for batch changes
- No log of what was changed
```
**Recommendation**: Implement operation preview + confirmation for batch edits. Store change history per resource.

**4. Missing Archival Metadata Templates**
```
MISSING: Standard archival description schemas
- ISAD(G) General International Standard Archival Description
- EAD (Encoded Archival Description) export
- METS/MODS structural metadata
```
**Recommendation**: Add schema presets beyond Dublin Core. Consider EAD export for integration with archival management systems.

**5. Access Control Considerations**
```
CONCERN: No support for restricted materials
- Sensitive field research (Indigenous heritage, human remains)
- Embargoed materials awaiting publication
- Materials with cultural protocols
```
**Recommendation**: Add `accessHint` metadata field and export filtering for sensitive content. Consider IIIF Auth API for published collections.

### Priority Additions for Worklist

1. **Provenance logging system** (Critical)
2. **Controlled vocabulary autocomplete** (High)
3. **Batch operation audit trail** (High)
4. **ISAD(G) metadata template** (Medium)
5. **Sensitive materials flagging** (Medium)

---

## 2. IIIF Technical Expert Perspective

**Reviewer**: Marcus Chen, IIIF Technical Coordinator, Stanford Libraries
**Focus**: Specification compliance, ecosystem interoperability, viewer compatibility

### Strengths

**Solid v3.0 Foundation**
- Correct use of `@context` placement as first property
- Proper Canvas dimension rules (width+height pairing)
- SearchService2 integration shows forward-thinking approach
- Content State API implementation enables deep linking

**Smart Convention Choices**
- The underscore prefix for Collections is intuitive for archival users
- info.yml approach mirrors successful tools like biiif and iiif-builder
- Service Worker Image API is innovative for offline-first scenarios

### Critical Compliance Issues

**1. Image Service Missing Required Properties**
```json
// CURRENT (incomplete)
{
  "id": "https://example.org/image/1",
  "type": "ImageService3",
  "profile": "level2"
}

// REQUIRED (spec §8.1)
{
  "@context": "http://iiif.io/api/image/3/context.json",
  "id": "https://example.org/image/1",
  "type": "ImageService3",
  "protocol": "http://iiif.io/api/image",  // MISSING
  "profile": "level2",
  "width": 4000,   // SHOULD include
  "height": 3000   // SHOULD include
}
```
**Status**: Partially fixed in recent commits. Verify `protocol` property in all Image Services.

**2. Annotation Context Inconsistency**
```json
// IIIF Annotations should use Presentation context
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "type": "Annotation"
}

// W3C Annotations (external) should use Web Annotation context
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "type": "Annotation"
}
```
**Recommendation**: Ensure embedded annotations use Presentation context, external annotation pages use W3C context.

**3. Missing `partOf` for Navigation Context**
```json
// Canvas should indicate its parent Manifest
{
  "type": "Canvas",
  "partOf": [{
    "id": "https://example.org/manifest/1",
    "type": "Manifest"
  }]
}
```
**Recommendation**: Add `partOf` to Canvases for Content State API navigation.

**4. Range Implementation Gaps**
```yaml
# Current: Basic range support
# Missing:
- supplementary property for Range resources
- Range-specific behaviors (thumbnail-nav, no-nav)
- Temporal ranges for AV content (t=10,20)
```
**Recommendation**: Enhance RangeEditor to support temporal segments and supplementary annotation collections.

**5. External Manifest Handling**
```
CONCERN: Remote manifests are fetched but not normalized
- v2→v3 conversion may lose information
- External image services may not be CORS-enabled
- No caching strategy for remote resources
```
**Recommendation**: Implement robust v2→v3 upgrader. Cache remote manifests locally. Warn on CORS issues.

### Interoperability Testing Needed

| Viewer | Test Status | Known Issues |
|--------|-------------|--------------|
| Mirador 3 | ❓ Untested | Canvas annotations may not display |
| Universal Viewer 4 | ❓ Untested | Multi-page navigation needs verification |
| Annona | ❓ Untested | Annotation rendering compatibility |
| IIIF Curation Viewer | ❓ Untested | Range navigation support |

### Priority Additions for Worklist

1. **Viewer compatibility test suite** (Critical)
2. **partOf property for all resources** (High)
3. **Annotation context normalization** (High)
4. **v2→v3 manifest upgrader improvements** (Medium)
5. **Temporal Range support** (Medium)

---

## 3. Human Factors Engineer Perspective

**Reviewer**: Dr. Aisha Patel, UX Research Lead, Human-Computer Interaction Lab
**Focus**: Cognitive load, learnability, accessibility, error prevention

### Strengths

**Excellent Progressive Disclosure**
- Three abstraction levels (Simple/Standard/Advanced) correctly scaffold complexity
- Field Mode shows awareness of environmental constraints
- The dual-view toggle (Files ↔ IIIF) brilliantly bridges mental models

**Strong Affordance Design**
- The Workflow Manifesto shows clear role differentiation
- Pipeline transitions (Archive → Catalog → Metadata) reduce context switching
- "Reveal in Context" supports non-linear exploration

### Critical Usability Issues

**1. Cognitive Overload in Metadata View**
```
PROBLEM: Spreadsheet view presents all fields simultaneously
- 15+ columns visible by default
- No progressive disclosure within the view
- Field researchers overwhelmed by archival terminology
```
**Recommendation**: Implement "metadata complexity slider" that shows:
- Level 1: Label, Date, Location (3 fields)
- Level 2: + Creator, Description, Rights (6 fields)
- Level 3: + All Dublin Core fields

**2. Mode Switching Friction**
```
PROBLEM: Navigating between 6 modes requires explicit action
- Cmd+1 through Cmd+6 shortcuts are not discoverable
- Context is lost when switching modes
- No "back" navigation after deep exploration
```
**Recommendation**:
- Add breadcrumb trail showing navigation path
- Implement "Quick Peek" overlays instead of full mode switches
- Show keyboard shortcuts in mode tabs on hover

**3. Error Recovery is Punitive**
```
PROBLEM: Validation errors block export without guidance
- "Archive Integrity Failed" message is intimidating
- Errors are listed without priority or grouping
- No "fix all similar issues" batch action
```
**Recommendation**:
- Rename to "Pre-flight Check" with friendly tone
- Group errors by category with expandable details
- Add "Auto-fix all" for common issues (missing labels, invalid IDs)

**4. Touch Target Inconsistency**
```
PROBLEM: Field Mode touch targets vary across views
- Some buttons are 44px (WCAG minimum)
- Others remain at 32px (desktop-sized)
- No consistent gesture vocabulary
```
**Recommendation**:
- Audit all interactive elements for 48px+ in Field Mode
- Implement swipe gestures for common actions
- Add haptic feedback on touch devices

**5. Cognitive Load During Ingest**
```
PROBLEM: Staging wizard asks too many questions upfront
- Users must understand Collection vs Manifest before seeing content
- Technical terminology exposed prematurely
- No preview of what structure will result
```
**Recommendation**:
- Show visual preview of resulting structure
- Use plain language ("Folder" → "Group", "Manifest" → "Object")
- Offer "Quick Import" that uses smart defaults, refine later

### Accessibility Audit Findings

| WCAG Criterion | Status | Issue |
|----------------|--------|-------|
| 1.4.3 Contrast | ⚠️ Partial | Some gray text on light backgrounds fails 4.5:1 |
| 2.1.1 Keyboard | ⚠️ Partial | Modal dialogs trap focus but tree views lack arrow nav |
| 2.4.7 Focus Visible | ❌ Fail | Focus rings inconsistent, some buttons have none |
| 4.1.2 Name/Role | ⚠️ Partial | Icon buttons missing aria-label attributes |

### Priority Additions for Worklist

1. **Focus management audit + fixes** (Critical - Accessibility)
2. **Metadata complexity slider** (High)
3. **Ingest wizard visual preview** (High)
4. **Navigation breadcrumb trail** (Medium)
5. **Touch target audit for Field Mode** (Medium)

---

## 4. Solutions Architect Perspective

**Reviewer**: James Okonkwo, Principal Architect, Cloud Heritage Systems
**Focus**: Scalability, maintainability, performance, technical debt

### Strengths

**Innovative Local-First Architecture**
- Service Worker approach enables true offline operation
- IndexedDB storage avoids server infrastructure costs
- Clever use of blob URLs for in-memory image handling

**Clean Separation of Concerns**
- Services layer (iiifBuilder, validator, exportService) is well-factored
- Types file provides strong TypeScript contracts
- Component structure follows React best practices

### Critical Technical Concerns

**1. Memory Management at Scale**
```javascript
// PROBLEM: All resources loaded into single state tree
const [root, setRoot] = useState<IIIFItem | null>(null);

// With 1000+ canvases, this causes:
// - Slow re-renders on any change
// - Memory pressure from blob URLs
// - JSON.parse/stringify bottlenecks
```
**Recommendation**: Implement virtualized data model:
- Load manifest stubs initially (id, label, thumbnail only)
- Lazy-load full canvas data on demand
- Use React Query or similar for caching

**2. Service Worker Tile Generation Bottleneck**
```javascript
// CURRENT: Generate tiles on-demand in SW
// PROBLEM: Multiple concurrent tile requests overwhelm single thread

// 8 tiles visible × 4 scale levels = 32 simultaneous requests
// Each requires: Blob read → ImageBitmap → Canvas → Blob write
```
**Recommendation**:
- Pre-generate common tile sizes during ingest (background)
- Implement request coalescing for concurrent requests
- Add tile generation queue with priority

**3. No State Persistence Strategy**
```
PROBLEM: Project state is a single JSON blob
- Saving 100MB of canvas data on every change
- No incremental saves
- Corruption risk if save interrupted
```
**Recommendation**:
- Implement delta-based saving (only changed resources)
- Add write-ahead log for crash recovery
- Split large manifests into separate IndexedDB entries

**4. Export Performance for Large Archives**
```javascript
// CURRENT: Generate all files synchronously
const files = await this.prepareExport(root, options);

// For 500 images:
// - 500 × 3 derivative sizes = 1500 image operations
// - All held in memory before ZIP creation
```
**Recommendation**:
- Stream files directly to ZIP (JSZip supports this)
- Generate derivatives in Web Worker pool
- Show incremental progress per-resource

**5. Missing Error Boundaries at Component Level**
```
CURRENT: Single ErrorBoundary wraps entire app
PROBLEM: One component crash takes down everything

// Tree view error → entire workspace gone
// Image load failure → cascading failures
```
**Recommendation**: Add granular error boundaries:
- Per-view error boundaries with retry
- Per-component fallbacks (broken image placeholder)
- Error reporting to optional telemetry endpoint

### Technical Debt Inventory

| Area | Debt Type | Severity | Effort |
|------|-----------|----------|--------|
| State management | Monolithic state tree | High | Large |
| Image processing | Blocking main thread | High | Medium |
| Type safety | `any` casts in services | Medium | Small |
| Testing | No unit/integration tests | High | Large |
| Build | No production optimization | Medium | Small |

### Performance Benchmarks Needed

```
Target: Smooth operation with 1000 canvases
- Initial load: < 3 seconds
- Mode switch: < 500ms
- Search results: < 200ms
- Export 500 images: < 5 minutes

Current (estimated):
- Initial load: Unknown (likely 10s+ at scale)
- Mode switch: Causes full re-render
- Search: Full-text index is fast
- Export: Likely memory-constrained
```

### Priority Additions for Worklist

1. **Virtualized data loading** (Critical)
2. **Background tile pre-generation** (High)
3. **Delta-based state persistence** (High)
4. **Web Worker pool for image processing** (High)
5. **Component-level error boundaries** (Medium)

---

## Consolidated Priority Matrix

| Priority | Item | Source | Impact |
|----------|------|--------|--------|
| **CRITICAL** | Virtualized data model | Architect | Enables scale beyond 100 items |
| **CRITICAL** | Focus management + ARIA labels | HF Engineer | Accessibility compliance |
| **CRITICAL** | Viewer compatibility testing | IIIF Expert | Validates interoperability |
| **HIGH** | Provenance logging | Archivist | Professional archival practice |
| **HIGH** | Background tile generation | Architect | UX performance |
| **HIGH** | Metadata complexity slider | HF Engineer | Reduces cognitive overload |
| **HIGH** | partOf property throughout | IIIF Expert | Content State navigation |
| **HIGH** | Batch operation audit trail | Archivist | Accountability |
| **MEDIUM** | Controlled vocabulary lookup | Archivist | Metadata quality |
| **MEDIUM** | Ingest wizard visual preview | HF Engineer | Learnability |
| **MEDIUM** | Temporal Range support | IIIF Expert | AV content handling |
| **MEDIUM** | Delta-based persistence | Architect | Reliability |
| **LOW** | ISAD(G) template | Archivist | Professional archives |
| **LOW** | Swipe gestures | HF Engineer | Mobile UX |
| **LOW** | Telemetry endpoint | Architect | Error monitoring |

---

## Recommended Spec.md Additions

Based on this review, the following sections should be added to the Technical Specification:

### New Section: Provenance & Audit (§18)
- Change logging for all resources
- Ingest timestamp and source tracking
- Export of PREMIS preservation metadata

### New Section: Scalability Considerations (§19)
- Maximum supported archive size
- Memory management strategy
- Performance benchmarks

### New Section: Accessibility Requirements (§16 Enhancement)
- WCAG 2.1 AA checklist
- Keyboard navigation specification
- Screen reader compatibility requirements

### New Section: Interoperability Testing (§20)
- Required viewer compatibility matrix
- v2/v3 conversion requirements
- CORS handling specification

---

*This review was conducted by simulating expert perspectives based on professional standards and best practices in each domain.*
