# IIIF Field Archive Studio — Technical Specification

**Version**: 3.1
**Status**: Active Development
**Architecture**: Local-First / Browser-Based

---

## 1. Vision & Overview

**The Concept:** IIIF Field Archive Studio is a "Darkroom for Digital Humanities." It is a local-first, browser-based workbench that acts as a bridge between the chaos of field research and the structured standards of the digital archive. It allows researchers to drag-and-drop raw heterogeneous media (images, audio, video, text), organize them spatially and logically, and export standards-compliant IIIF packages without server infrastructure.

**Core Philosophy:**
1.  **Local-First & Private:** Data lives in the browser (IndexedDB/FileSystem API). No server uploads required. This ensures privacy and offline capability.
2.  **Structure as a Creative Act:** Organizing manifests is treated as a visual, creative process.
3.  **Bridge the Gap:** The UI translates "Archival Intent" (e.g., "This is a photo album") into "Technical Implementation" (e.g., "Collection containing Manifests").
4.  **Zero-Config Infrastructure:** The application runs a full IIIF Image and Presentation API server *inside* the browser service worker.

---

## 2. Technical Architecture

### Tech Stack
*   **Framework:** React 18+ (Vite).
*   **Language:** TypeScript (Strict Mode).
*   **State Management:** **Vault** (Normalized O(1) Store with Undo/Redo).
*   **Persistence:** `idb` (IndexedDB) for storing binary blobs and JSON graphs.
*   **Server Layer:** Service Worker intercepting fetch requests to simulate a IIIF Image API 3.0 server.
*   **AI:** `ollama` integration for local intelligence.

### Data Model
The internal data model mirrors the IIIF spec but adds editor-specific state.

*   **Archive:** The total store of all ingested blobs (Files).
*   **Vault:** A normalized graph of IIIF entities (Collections, Manifests, Canvases, Annotations).
*   **Virtual Server:** A Service Worker that handles `https://field-studio/iiif/...` requests, slicing images on the fly via `OffscreenCanvas`.

---

## 3. User Workflow (The "Happy Path")

### Phase 1: Ingest (The Staging Area)
*   **Input:** Drag-and-drop folders containing mixed media.
*   **Heuristic Analysis:** The app scans directory structures to propose a IIIF hierarchy (Folder = Collection, Sub-folder = Manifest).
*   **Action:** User refines structure in the **Staging Area**, toggling between "Manifest" and "Collection" types before import.

### Phase 2: Curation (The Studio)
*   **Archive View:** A searchable grid/list of all assets.
*   **Board Canvas:** An infinite whiteboard for spatial organization.
    *   **Spatial Linking:** Draw lines between items to create `linking` Annotations.
    *   **Composition:** Arrange Canvases visually to explore relationships.
*   **Enrichment:**
    *   **Metadata:** Batch-edit Dublin Core fields.
    *   **Deep Zoom:** Inspect high-resolution images via the internal Image API.

### Phase 3: Export (The Publication)
*   **Static Site Generation:** Generates a self-contained ZIP.
    *   Includes a static HTML/JS viewer (Mirador/UV).
    *   Includes standardized IIIF JSON files.
    *   Includes tiled images generated in the browser.
*   **Result:** A fully functional digital archive deployable to any static host (GitHub Pages, Netlify, USB drive).

---

## 4. Functional Specifications

### A. Archive Management (Virtual Image API 3.0)
The Service Worker functions as a local IIIF Image API 3.0 server.

**Capabilities:**
*   **Dynamic Region Slicing:** Serves `/x,y,w,h/` requests from source blobs.
*   **On-the-fly Transcoding:** Converts formats/quality requested by viewers.
*   **Tile Generation:** Background Web Workers pre-generate tiles for smooth deep zoom.

**URI Pattern:**
`{scheme}://{local-domain}/iiif/image/{identifier}/{region}/{size}/{rotation}/{quality}.{format}`

### B. Collection Editor (Presentation API 3.0)
Manages the hierarchy of the archive.

**Structure:**
*   **Collection:** Container for Manifests or Sub-Collections.
*   **Manifest:** The intellectual object (Book, Scroll, Album).
*   **Canvas:** The view (Page, Slide, Surface).

**Features:**
*   **Drag-and-Drop Reordering:** Manipulate `items` arrays visually.
*   **Metadata Complexity Slider:** Progressive disclosure of fields (Simple -> Standard -> Advanced).
*   **Validation:** Real-time checking against IIIF 3.0 schema specs.

### C. Board Canvas (Spatial Web Annotations)
A distinctive feature for mapping relationships.

**IIIF Representation:**
*   The **Board** is a Manifest with a single, massive Canvas.
*   **Items** on the board are `painting` Annotations targeting specific regions of the Board Canvas.
*   **Connections** are `linking` Annotations with multiple targets (Source Item, Destination Item).

**Annotation Types:**
*   **Sticky Note:** `commenting` TextualBody.
*   **Zone:** `highlighting` FragmentSelector.
*   **Link:** `linking` SpecificResource.

### D. Item Viewer & Annotation
Deep viewing and annotation using W3C Web Annotation Data Model.

**Tools:**
*   **Deep Zoom:** OpenSeadragon integration.
*   **AV Support:** Waveform visualization for Audio/Video.
*   **Selectors:**
    *   `FragmentSelector` (Rectangle, Time Range).
    *   `SvgSelector` (Polygon, Freehand).

---

## 5. IIIF Resource Mapping

| Application Concept | IIIF Resource Type | Notes |
|---------------------|-------------------|-------|
| Archive Item | Content Resource | Served via Service Worker Image API |
| Collection | Collection | Hierarchical grouping |
| Project Folder | Collection/Manifest | Context-dependent import |
| Board | Manifest + Canvas | Large 2D canvas for spatial arrangement |
| Board Item | Annotation (painting) | Places content onto the Board Canvas |
| Connection | Annotation (linking) | Semantic link between resources |
| Region Selection | SpecificResource | FragmentSelector (xywh) |

---

## 6. Interaction Specifications

### Click-to-Zoom Annotations
*   **Visuals:** Annotation regions render as overlays.
*   **Interaction:** Clicking an annotation smoothly zooms the viewport to fill that region.
*   **AV:** Clicking a time-based annotation seeks the media player to `t=start`.

### Board Interactions
*   **Placement:** Drag from Archive -> Creates Annotation on Board.
*   **Linking:** Draw line between items -> Creates `linking` Annotation.
*   **Selection:** Double-click item to "enter" deeper inspection mode.

---

## 7. Export Formats

| Format | Description |
|--------|-------------|
| **IIIF 3.0 Package** | Full hierarchy of Collections/Manifests (JSON-LD) |
| **Static Website** | Ready-to-deploy site with embedded Mirador/UV |
| **Archive Backup** | Full project state including original assets |
| **CSV Metadata** | Flattened metadata for spreadsheet analysis |
| **W3C Annotations** | Standard Annotation Lists/Pages |

---

## 8. Future Roadmap


### Advanced Discovery
*   **Content Search API:** Client-side search service integration.
*   **Content State:** Deep linking via `iiif-content` parameter.

### Ecosystem
*   **IPFS Export:** Decentralized archiving.
*   **3D Support:** `<model-viewer>` integration for GLB artifacts.

---

*Spec updated 2026-01-23 to reflect Phase 4 Implementation Status.*
