# Expert Review Panel: IIIF Field Archive Studio

**Review Date**: 2026-01-23
**Documents Reviewed**: spec.md v3.0, Codebase (Current)

---

## 1. Digital Archivist Perspective

**Reviewer**: Dr. Elena Vasquez, National Archives

### 🌟 Executive Summary: Strengths
The system demonstrates exceptional alignment with archival principles through its hierarchical model (Collection/Manifest/Canvas) and local-first architecture. The implementation of "Archive DNA" for metadata extraction and the comprehensive **Provenance Service** (SHA-256 fixity, full chain-of-custody, PREMIS export) sets a new standard for field documentation tools.

### ⚠️ Critical Gaps & Recommendations

**1. Vocabulary & Authority Control (PENDING)**
*   **Issue:** No integration with controlled vocabularies (LCSH, AAT) or autocomplete services.
*   **Risk:** Inconsistent metadata limits cross-collection discoverability.
*   **Recommendation:** Implement a lookup service for standard taxonomies.

**2. Batch Operation Safety (NEW CONCERN)**
*   **Issue:** `BatchEditor` allows mass-overwriting of any field, including unique identifiers like Title or ID.
*   **Risk:** Accidental destruction of unique item metadata.
*   **Recommendation:** Add "Field Locking" for unique properties and a "Safe Mode" for batch edits.

**3. Rights Management Inheritance (NEW CONCERN)**
*   **Issue:** No mechanism to apply rights statements recursively from Collection to Manifests/Canvases.
*   **Risk:** Inconsistent licensing across the archive.
*   **Recommendation:** Implement "Cascade Rights" feature in the Inspector.

**4. Archival Templates (PENDING)**
*   **Issue:** Lack of ISAD(G), EAD, or MODS export templates.
*   **Recommendation:** Expand `exportService` to support archival XML standards.

**5. Access Control (PENDING)**
*   **Issue:** No `accessHint` or embargo flagging for sensitive materials.
*   **Recommendation:** Add a "Sensitivity" metadata field affecting export visibility.

---

## 2. IIIF Technical Expert Perspective

**Reviewer**: Marcus Chen, Stanford Libraries

### 🌟 Executive Summary: Strengths
The platform provides a solid IIIF Presentation API 3.0 foundation with correct context handling and Content State navigation (`partOf`). The **Service Worker Image API** and static site export capabilities are innovative, enabling true offline-first archival workflows.

### ⚠️ Critical Gaps & Recommendations

**1. AV Synchronization & Presentation 3.0 (NEW CONCERN)**
*   **Issue:** Missing support for advanced Presentation 3.0 features like `accompanyingCanvas` and `placeholderCanvas`.
*   **Risk:** Cannot support common archival use cases like "Audio with Score" or "Video with Poster Frame".
*   **Recommendation:** Implement `accompanyingCanvas` property handling to allow synchronizing a static canvas (score/slide) with a time-based canvas (audio/video).

**2. Deep Linking & Content State (NEW CONCERN)**
*   **Issue:** No standardized mechanism to initialize the viewer at a specific region or time point from an external link.
*   **Recommendation:** Implement the **IIIF Content State API 1.0**. Specifically, support the `iiif-content` query parameter with base64url encoding to allow researchers to share exact views (e.g., specific regions of a map or timestamps in an interview).

**3. Authorization Flow (NEW CONCERN)**
*   **Issue:** No handling of restricted resources (401 Unauthorized).
*   **Risk:** Field researchers cannot view sensitive materials that require authentication.
*   **Recommendation:** Implement the **IIIF Authorization Flow API 2.0**. The client must handle the "Access Service" tab-opening pattern and "Token Service" postMessage exchange. Support "Tiered Access" by rendering `substitute` resources when the primary resource is forbidden.

**4. Range & Structure Editing (PENDING)**
*   **Issue:** `ManifestTree` does not support creating or editing IIIF Ranges (Structures).
*   **Recommendation:** Implement a "Structure Mode" for defining table of contents.

---

## 3. Human Factors Engineer Perspective

**Reviewer**: Dr. Aisha Patel, HCI Lab

### 🌟 Executive Summary: Strengths
The application excels in progressive disclosure (Simple/Standard/Advanced modes) and tactile design (Field Mode). The newly implemented **Quality Control Dashboard** effectively uses a "flight check" metaphor to guide users through error recovery, and the "Reveal in Context" features support non-linear exploration.

### ⚠️ Critical Gaps & Recommendations

**1. "Cold Start" Experience (NEW CONCERN)**
*   **Issue:** The application opens to a blank state with no guidance.
*   **Risk:** High abandonment rate for new users.
*   **Recommendation:** Add an "Onboarding" modal with options to "Load Sample Project" or "Start Guided Tour".

**2. Metadata Complexity Management (PENDING)**
*   **Issue:** `MetadataEditor` overwhelms users with technical tabs instead of progressive complexity.
*   **Recommendation:** Implement a "Complexity Slider" to hide advanced fields by default.

**3. Ingest Visual Feedback (PARTIAL)**
*   **Issue:** `CSVImportDialog` shows data rows but no visual tree structure preview.
*   **Recommendation:** Add a visual "Tree Preview" to the import wizard.

**4. Shortcut Discoverability (NEW CONCERN)**
*   **Issue:** Keyboard shortcuts (Cmd+Z, Cmd+S) exist but are invisible to the user.
*   **Recommendation:** Add a "Keyboard Shortcuts" overlay (press `?`) or tooltips on buttons.

**5. Accessibility & Focus (PARTIAL)**
*   **Issue:** Inconsistent focus rings and lack of arrow-key navigation in trees.
*   **Recommendation:** Conduct a full keyboard navigation audit.

---

## 4. Solutions Architect Perspective

**Reviewer**: James Okonkwo, Cloud Heritage Systems

### 🌟 Executive Summary: Strengths
The architecture is robust and scalable, successfully solving the "Memory Management" and "Blocking Main Thread" issues via **Virtualized Data** and **Web Workers**. The normalized "Vault" state management and delta-based persistence ensure reliability at scale.

### ⚠️ Critical Gaps & Recommendations

**1. Search Architecture (NEW CONCERN)**
*   **Issue:** Client-side search is good for small collections, but scaling to thousands of manifests requires a strategy.
*   **Recommendation:** Adopt the **IIIF Content Search API 2.0**. Implement a hybrid approach: use FlexSearch for offline/local-first search, but expose it via a standard `SearchService2` endpoint within the manifest. This makes the local archive interoperable with external IIIF viewers.

**2. Testing Strategy (PENDING)**
*   **Issue:** Zero unit or integration tests found in the codebase.
*   **Risk:** High regression risk during refactoring.
*   **Recommendation:** Initialize Vitest and add core service tests immediately.

**3. CI/CD & Build Pipeline (NEW CONCERN)**
*   **Issue:** No GitHub Actions or CI configuration (`.github/workflows`) exists.
*   **Risk:** Manual deployments are error-prone; code quality is not enforced on commit.
*   **Recommendation:** Add a basic CI pipeline for linting, building, and (future) testing.

**4. Security Patterns (NEW CONCERN)**
*   **Issue:** Bearer tokens from Auth API must be handled securely.
*   **Recommendation:** Ensure access tokens are stored in memory only (not localStorage) and attached to requests via an interceptor pattern. Implement the "Probe-First" pattern to avoid unnecessary 401 errors.

---

## 5. Interaction & Instruction Designer Perspective

**Reviewer**: Prof. Sarah Jenkins, Instructional Design Institute

### 🌟 Executive Summary: Strengths
The application employs excellent instructional scaffolding through the **"Archive Academy"** contextual help system, which delivers just-in-time terminology explanations. The **Compatibility Report** provides high-quality corrective feedback, moving beyond error reporting to actionable "Fix it" guidance, which is crucial for learning.

### ⚠️ Critical Gaps & Recommendations

**1. "Cold Start" Scaffolding (NEW CONCERN)**
*   **Issue:** New users face an empty screen ("The Blank Slate Problem") without a clear "Call to Action."
*   **Recommendation:** Implement an "Empty State" illustration with three clear starting paths: "Start New Project," "Open Demo," or "Import Folder."

**2. Conceptual Bridging (PENDING)**
*   **Issue:** The mental model shift from "Files" to "Manifests" is abrupt.
*   **Recommendation:** Add a visual "Translation Layer" during ingest that explicitly shows how folder structure can relate to iiif concepts

**3. Proactive Error Prevention (NEW CONCERN)**
*   **Issue:** `CSVImportDialog` reports errors *after* parsing.
*   **Recommendation:** Provide a downloadable "Starter Template" CSV to prevent formatting errors before they happen.

---

## ✅ Recent Accomplishments (Resolved Items)
*   **Provenance:** Full chain of custody with PREMIS export.
*   **Performance:** Virtualized lists and Service Worker tile generation.
*   **Resilience:** Error boundaries and auto-save persistence.
*   **Navigation:** `partOf` linking and deep-link support.
*   **Touch:** Mobile-optimized Field Mode.
*   **Guidance:** Contextual Help ("Archive Academy") implementation.

## 📊 Consolidated Priority Matrix

| Priority | Item | Domain | Effort | Status |
|----------|------|--------|--------|--------|
| **P0** | **Unit Test Suite** | Architect | High | ❌ |
| **P0** | **Keyboard/Focus Access** | UX | Medium | ⚠️ |
| **P1** | **Cold Start / Onboarding** | Instruction | Medium | ❌ |
| **P1** | **Metadata Complexity Slider** | UX | Medium | ❌ |
| **P1** | **Batch Edit Safeguards** | Archivist | Low | ❌ |
| **P2** | **Structure/Range Editor** | IIIF | High | ❌ |
| **P2** | **Controlled Vocabulary** | Archivist | High | ❌ |
| **P2** | **AV/Sound Support** | IIIF | High | ❌ |
| **P3** | **CI/CD Pipeline** | Architect | Low | ❌ |
