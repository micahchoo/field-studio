# IIIF Field Archive Studio - Implementation Worklist

**Last Updated**: 2026-01-23
**Spec Version**: Technical Specification v3.0
**Current Phase**: Phase 4 - Discovery, Access, and Advanced Integration

---

## 🚀 Active Sprint: Discovery & Access

These tasks focus on implementing the advanced IIIF APIs (Authorization, Content Search, Content State) to enable deep linking, secure access, and rich discovery.

- [x] **Content State API Support** - Deep linking and view initialization. ✅
  - **Rationale**: Allow researchers to share exact views (zoom, time) via URL (Expert: Technical Expert).
  - **Mechanics**: COMPLETED: Enhanced `services/contentState.ts` with full Content State API 1.0 implementation. `ShareButton.tsx` updated with Copy View Link, Embed Code, JSON export, and drag-and-drop. Added `useContentStateFromUrl` and `useContentStateDrop` hooks.
  - **Source**: `IIIF Content State API 1.0`, `ARCHITECTURE_INSPIRATION.md` (Deep Linking Pattern).

- [ ] **Authorization Flow 2.0** - Support for restricted content. ⚠️ PARTIAL
  - **Rationale**: Enable access to sensitive field materials while respecting archival access controls (Expert: Technical Expert).
  - **Mechanics**: PARTIAL: `services/authService.ts` implements probe-first pattern. `components/AuthDialog.tsx` exists but is **disconnected** (not mounted in App or Viewer).
  - **Source**: `IIIF Authorization Flow API 2.0`, `ARCHITECTURE_INSPIRATION.md` (Probe-First Authorization).

- [ ] **Content Search API 2.0** - In-object search. ⚠️ PARTIAL
  - **Rationale**: Scalable search for large collections beyond client-side limits (Expert: Solutions Architect).
  - **Mechanics**: PARTIAL: `services/contentSearchService.ts` implements client. `components/SearchPanel.tsx` exists but is **unused**. App uses global `SearchView.tsx` instead of dedicated content search UI.
  - **Source**: `IIIF Content Search API 2.0`, `ARCHITECTURE_INSPIRATION.md` (Annotation-Based Search).

- [ ] **Advanced AV Support** - Richer audio/video presentation. ⚠️ PARTIAL
  - **Rationale**: Support complex archival objects like oral histories with transcripts or music with scores (Expert: Technical Expert).
  - **Mechanics**: PARTIAL: `services/avService.ts` implements logic. `components/AVPlayer.tsx` is fully built but **not rendered** in `Viewer.tsx` (only generic icons shown).
  - **Source**: `Presentation API 3.0` (Audio Recipe), `ARCHITECTURE_INSPIRATION.md` (Canvas-Bound Accompaniment).

---
# Most requested featureset
It maps new capabilities to the core architectural phases: **Ingest**, **Curation**, **State Management**, and **Export**.

---

## 1. Ingest Phase (The Staging Area)

**Feature:** **Dynamic Canvas Wrapper for Single Image Ingest** ✅

*   **Status:** COMPLETED - `services/virtualManifestFactory.ts` and enhanced `services/remoteLoader.ts`
*   **Integration Point:** `ExternalImportDialog.tsx` & `services/remoteLoader.ts`.
*   **Workflow:**
    1.  User opens "Import External IIIF" dialog.
    2.  User pastes a direct image URL (e.g., `https://site.com/image.jpg`) instead of a Manifest URL.
    3.  **Pipeline Hook:** The `remoteLoader` service detects the non-JSON content type.
    4.  **Transformation:** Instead of failing, it invokes `VirtualManifestFactory`.
    5.  **Result:** A fully-formed IIIF Manifest (Version 3.0) is generated in memory, wrapping the image as a Painting Annotation on a Canvas sized to the image dimensions.
    6.  **Handoff:** This virtual manifest is passed to `ingestTree` just like a real file import, allowing the user to edit metadata immediately in the Staging Area.

---

## 2. Curation Phase (The Studio & Inspector)

**Feature:** **Spatial Annotation Workbench**
**Feature:** **Interaction Action Mapper**
**Feature:** **Customizable CSS/Theme Injection**

*   **Integration Point:** `Viewer.tsx`, `Inspector.tsx`, and `PolygonAnnotationTool.tsx`.
*   **Workflow:**
    1.  **Creation:** In the `Viewer`, the user activates the annotation tool. The tool now offers "Ellipse" alongside Polygon/Rect.
    2.  **Definition:** Upon completing the shape, the **Inspector** panel opens automatically (replacing the simple text prompt).
    3.  **Action Logic:** A new "Interaction" tab in the Inspector allows the user to define behavior:
        *   *Link:* Enter a URL (`purpose: linking`).
        *   *Popup:* Enter HTML content (`motivation: describing`).
    4.  **Styling:** A new "Appearance" tab allows picking stroke color and opacity.
    5.  **Pipeline Hook:** These settings are saved as specific properties (`service`, `style`, `purpose`) within the Web Annotation JSON in the Vault.

---

## 3. State Management (Vault & Service Worker)

**Feature:** **Content State Serializer**

*   **Integration Point:** `services/contentState.ts`, `hooks/useIIIFEntity`, `App.tsx`.
*   **Workflow:**
    1.  **Capture:** As the user pans/zooms in the `Viewer`, the viewport coordinates (`xywh`) are tracked in React state.
    2.  **Serialization:** When "Share" is clicked, `contentStateService` encodes the current Canvas ID + Viewport Coordinates into a base64url token.
    3.  **Persistence:** This token is appended to the URL (`?iiif-content=...`).
    4.  **Restoration:** On load, `App.tsx` parses this token and directs the Viewer to zoom specifically to that region, overriding the default "fit to screen" behavior.

---

## 4. Export & Publishing Phase

**Feature:** **One-Click Embed Code Generator**

*   **Integration Point:** `ExportDialog.tsx` & `ShareButton.tsx`.
*   **Workflow:**
    1.  **Trigger:** User selects "Embed" in the Share/Export menu.
    2.  **Pipeline Hook:** The system constructs a specific URL pattern using the **Content State** generated in step 3.
    3.  **Generation:** It outputs an HTML snippet:
        ```html
        <iframe src="https://viewer.field-studio.org/?iiif-content={base64_token}" ...></iframe>
        ```
    4.  **Runtime:** The hosted viewer (or the static export viewer) reads the token, fetches the Manifest (or uses the embedded one), and renders the *exact* interactive experience defined in the Curation phase, including the custom CSS styles and click actions.

---

## Summary of Data Flow

```mermaid
graph LR
    A[Raw Image URL] -->|Dynamic Wrapper| B(Virtual Manifest)
    B --> C[Staging Area]
    C --> D[Vault / IndexedDB]
    D --> E[Viewer / Inspector]
    E -->|Spatial Workbench| D
    E -->|Action Mapper| D
    E -->|CSS Injection| D
    D --> F[Content State Serializer]
    F --> G[Embed Code Generator]
    G --> H[Final Published Experience]

---

## ✅ Completed Items

### Recent Accomplishments (Phase 4 - Discovery & Access) ⚠️ SPRINT PARTIAL
- [ ] **Content Search API 2.0** - SearchService2 client ready. `SearchPanel` disconnected.
- [ ] **Advanced AV Support** - Logic ready. `AVPlayer` disconnected from Viewer.
- [ ] **Authorization Flow 2.0** - Service ready. `AuthDialog` disconnected.
- [x] **Content State API 1.0** - Full deep linking with share button, embed code, drag-and-drop.

### Recent Accomplishments (Phase 5 - Ingest & Integration Enhancements) ✅
- [x] **Virtual Manifest Factory** - Auto-wrap images/audio/video URLs in IIIF Manifests for seamless import.
- [x] **OCFL/BagIt Archival Export** - Digital preservation packages with checksums and inventories.
- [ ] **NavPlace Geospatial Workbench** - Map-based editing. ⚠️ PARTIAL: `GeoEditor` disconnected.
- [x] **Static Site Export (Wax Pattern)** - Full static exhibition generator with IIIF tiles, Lunr.js search, item pages.
- [x] **Static Export: Offline Viewer Bundling** - Self-contained exports with local viewer assets.
- [x] **Ingest: Smart Sidecar Detection** - Auto-linking of transcriptions/captions during ingest.
- [x] **Accessibility: ARIA & Keyboard Audit** - Full accessibility pass on Sidebar and Inspector.
- [x] **Compliance: Image API Protocol Property** - Added protocol support to info.json.
- [x] **IIIF Compliance: Full Behavior Support** - Implemented all 12+ IIIF behaviors.
- [x] **Board System: IIIF Manifest Export** - Export boards as valid IIIF Manifests.
- [x] **Performance: Background Tile Pre-generation** - Web Worker pool for tile generation.
- [x] **Archival: Provenance PREMIS Export** - Full PREMIS 3.0 compliant XML export.
- [x] **Spec Bridge: V2/V3 Import** - Auto-upgrade IIIF v2 manifests.
- [ ] **Selector Abstraction** - Service ready. ⚠️ PARTIAL: UI integration incomplete.
- [x] **Migrate App.tsx to Vault** - Full migration to Vault state management.
- [x] **UX: Metadata Complexity Slider** - Progressive disclosure of metadata fields.
- [ ] **Search: Autocomplete Service** - Logic ready. ⚠️ PARTIAL: UI disconnected.
- [ ] **Annotation: Polygon Tool** - Component ready. ⚠️ PARTIAL: Unused in Composer.
- [ ] **Extension Preservation** - ⚠️ PARTIAL: SpecBridge cleans unknown properties.
- [ ] **Content-Addressable Storage (Hashing)** - Service ready. ⚠️ PARTIAL: Unused.
- [ ] **Activity Stream** - Service ready. ⚠️ PARTIAL: Unused.
- [x] **Ingest: Visual Preview Wizard** - 6-step ingest flow with preview.
- [ ] **CSV/Spreadsheet Sync** - Component ready. ⚠️ PARTIAL: Unused.

### Core Infrastructure (Phase 1 & 2)
- [x] **Vault: Normalized State** - O(1) entity lookup and normalization.
- [x] **Vault: Action-Driven Mutations** - Undo/redo capable state changes.
- [x] **Entity Hooks** - React hooks for Vault interaction.
- [x] **Service Worker Image API** - IIIF Image API 3.0 Level 2 implementation.
- [x] **IndexedDB Storage** - Local-first persistence.
- [x] **Search Service** - Full-text search using FlexSearch.
- [ ] **Virtualized Data Model** - Service ready. ⚠️ PARTIAL: Unused.

### User Interface (Phase 1 & 2)
- [x] **3-Panel Layout** - Resizable workspace.
- [x] **Field Mode** - High-contrast, touch-optimized UI.
- [x] **Archive Views** - Grid, List, Map, and Timeline visualizations.
- [ ] **Command Palette** - Quick navigation (Cmd+K). ⚠️ PARTIAL (Disconnected)



## 📋 Feature Backlog

### Performance & Scale
- [ ] **Lazy Selector Hydration** - Performance for large manifests.
  - **Rationale**: Reduce initial compute load for manifests with thousands of OCR/transcription regions.
  - **Mechanics**: Parse SVG/complex selectors only on interaction or viewport visibility.


### Intelligence & Automation (Future)
- [ ] **AI: OCR Integration** - Auto-transcription.
  - Integration of Tesseract.js for automatic transcription of image sidecars.

### Ecosystem Integration (Future)
[
  {
    "feature": "Convention: biiif Bidirectional Sync",
    "rationale": "Enable a seamless 'Local-First' workflow where folder structures are automatically converted to IIIF Manifests and vice-versa, catering to field researchers with limited connectivity.",
    "mechanics": "Implement a 'Folder-to-Manifest' interpreter based on the biiif naming convention. Map local directory hierarchies to IIIF Ranges and filename patterns to Canvas labels. Use a 'Watch' pattern to trigger re-generation of the JSON-LD when local assets are modified.",
    "source": "biiif (IIIF Static Site Generator), ARCHITECTURE_INSPIRATION.md (Local-First Pattern)"
  },
  {
    "feature": "Static Site Export (Wax/Jekyll Integration) ✅",
    "rationale": "Provide a low-cost, high-durability publication path for archival collections without requiring a complex backend.",
    "mechanics": "COMPLETED: services/staticSiteExporter.ts - Generates complete static exhibition sites with pre-computed IIIF tiles, item pages, search index (Lunr.js), YAML/JSON metadata, gallery views, and OpenSeadragon viewer. Integrated into ExportDialog.tsx as 'Wax Exhibition' format with full configuration UI.",
    "source": "Wax (Exhibitions Framework), IIIF Presentation API 3.0 (Collections)"
  },
  {
    "feature": "Multi-Viewer Workbench (Mirador/Clover/UV)",
    "rationale": "Allow curators to validate how their manifests will perform across the most common industry viewers.",
    "mechanics": "Utilize a 'Portal' pattern to mount isolated instances of Mirador (for deep-grid comparison) and Clover (for accessible slider views). Implement a 'Cross-Frame State Sync' that passes the current 'Content State' from the Editor to the child viewer via postMessage.",
    "source": "Clover IIIF, Mirador 3, IIIF Content State API"
  },
  {
    "feature": "Archival Package Export (OCFL/BagIt) ✅",
    "status": "COMPLETED - services/archivalPackageService.ts",
    "rationale": "Ensure manifests created in the studio meet long-term digital preservation standards for repository ingest.",
    "mechanics": "Implemented 'Object Encapsulation' pattern. Wraps IIIF Manifest and associated media/metadata into OCFL 1.1 structure with inventory.json and version management. Generates BagIt 1.0 bags with SHA-256/512 checksums, bag-info.txt, payload-oxum, and tagmanifests. Includes validation and ZIP download.",
    "source": "OCFL Specification 1.1, BagIt RFC 8493"
  },
  {
    "feature": "NavPlace & Geospatial Workbench ✅",
    "status": "COMPLETED - services/navPlaceService.ts, components/GeoEditor.tsx",
    "rationale": "Support field archives that rely heavily on geographic context and mapping.",
    "mechanics": "Implemented 'Leaflet-based Geo-Selector' with navPlaceService for GeoJSON-to-IIIF mapping. GeoEditor component provides map-based editing with geocoding (Nominatim), marker/polygon drawing, coordinate display. Supports Feature and FeatureCollection, point/polygon/linestring geometries, bounds calculation, and distance measurement.",
    "source": "IIIF navPlace Extension, GeoJSON Specification"
  }, 
  {
    "feature": "Omeka S Resource Template Synchronizer",
    "rationale": "Enable seamless synchronization between institutional archival catalogs and the flexible IIIF Manifest structure.",
    "mechanics": "Implement a 'Schema Mapping Adapter' that translates Omeka S Resource Templates into IIIF 'metadata' pairs. Use the Omeka S API to push updates back to the repository, utilizing a 'Delta-Update' pattern to avoid overwriting existing archival descriptions while adding new IIIF-specific properties.",
    "source": "Omeka S IIIF Server, ARCHITECTURE_INSPIRATION.md (Metadata Mapping Pattern)"
  },
  {
    "feature": "ArchivesSpace PUID/URI Resolver",
    "rationale": "Maintain the chain of provenance by linking IIIF Canvases directly to physical archival components or digital objects in ArchivesSpace.",
    "mechanics": "Implement a 'SeeAlso Linker' that automatically populates the 'seeAlso' property of a Manifest or Canvas by querying ArchivesSpace RefIDs. Use a 'Reverse-Proxy' pattern to ensure that the Studio can fetch descriptive EAD (Encoded Archival Description) fragments and render them as tooltips within the editor.",
    "source": "ArchivesSpace API, IIIF seeAlso Specification"
  },
  {
    "feature": "FromThePage Transcription Import/Export",
    "rationale": "Integrate with community-driven transcription workflows to bring OCR and corrected text back into the archival manifest.",
    "mechanics": "Develop an 'Annotation Page Polling' pattern. The studio monitors FromThePage 'export' URLs for a manifest and merges returned AnnotationLists into the local Vault state as 'supplemental' content. Implement a 'Conflict Resolution UI' for cases where local manifest structures and remote transcription IDs have drifted.",
    "source": "FromThePage IIIF Integration, Web Annotation Data Model"
  },
  {
    "feature": "Madoc Task-Based Workflow Integration",
    "rationale": "Allow the Studio to act as a specialized 'Workbench' within a larger crowdsourcing or archival management ecosystem like Madoc.",
    "mechanics": "Implement a 'Manifest Delegation' pattern where the Studio accepts a 'Task' payload from Madoc. The Studio locks specific ranges of the manifest based on the task scope and uses a 'Post-Back' hook to notify the Madoc parent container when the editing session is complete and ready for review.",
    "source": "Madoc (Digirati), IIIF Task API (Draft)"
  },
  {
    "feature": "Cantaloupe/IIIF-Image-Server Profile Negotiator",
    "rationale": "Optimize media delivery by detecting the specific capabilities and processing power of the underlying image server.",
    "mechanics": "Implement a 'Capability Detection' pattern that parses the `info.json` from image services (e.g., Cantaloupe, Loris). This logic automatically adjusts the editor's export settings for 'thumbnail' and 'square' regions to match the server's supported scaling factors and qualities, reducing server-side compute overhead.",
    "source": "IIIF Image API 3.0, ARCHITECTURE_INSPIRATION.md (Service-Linked Architecture)"
  },
  {
    "feature": "Zotero / Citation Manager Integration",
    "rationale": "Bridge the gap between archival editing and scholarly citation for researchers using the field materials.",
    "mechanics": "Implement a 'COinS Metadata Embedding' pattern within the Manifest's 'homepage' and 'metadata' fields. Develop a 'Zotero Translator Adapter' that allows the Zotero browser extension to recognize the Studio's active Manifest and extract high-level archival metadata and IIIF Content States as a 'Research Item'.",
    "source": "Zotero Translators, COinS Metadata Standard"
  }
]
