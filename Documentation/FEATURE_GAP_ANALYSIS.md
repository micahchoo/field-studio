# Feature Gap Analysis & Implementation Plan

This document analyzes the requirements for implementing the requested "Interaction & Publishing" features within the current Field Studio codebase.

## 1. Dynamic Canvas Wrapper for Single Image Ingest

**Goal:** Paste a raw image URL -> Auto-generated Manifest.

**Current State:**
- `ExternalImportDialog.tsx` uses `fetchRemoteManifest` which likely expects a valid IIIF Manifest JSON.
- `iiifBuilder.ts` constructs manifests from local files but not ad-hoc URLs.

**Implementation Plan:**
1.  **Modify `fetchRemoteManifest`** in `services/remoteLoader.ts`:
    - Add error handling fallback: if JSON parse fails, check if URL is an image.
    - If Image API (ends in `info.json`), fetch dimensions.
    - If raw image (jpg/png), fetch `HEAD` or load `Image` object to get dimensions.
2.  **Virtual Manifest Factory:**
    - Create a factory function `wrapImageInManifest(url, width, height)` in `iiifBuilder.ts`.
    - Generate a V3 Manifest with a single Canvas and a `painting` annotation pointing to the URL.
3.  **UI Update:**
    - Update `ExternalImportDialog` to accept non-JSON URLs without erroring immediately.

**Effort:** Medium (Logic heavy)

---

## 2. Spatial Annotation Workbench (SVG Selector Support)

**Goal:** Rect, Poly, Ellipse tools for drawing clickable regions.

**Current State:**
- `PolygonAnnotationTool.tsx` exists and supports:
    - `polygon` (SVG path)
    - `rectangle` (SVG path)
    - `freehand` (SVG path)
- **Missing:** `ellipse` / `circle` support.
- **Storage:** Correctly saves as `SvgSelector` in `Annotation`.

**Implementation Plan:**
1.  **Add Ellipse Tool:**
    - Update `PolygonAnnotationTool` to include an "Ellipse" mode.
    - Implement drag-to-draw logic for ellipses (center + radius or bbox).
    - Serialize as SVG `<ellipse cx cy rx ry />`.
2.  **Refine UI:**
    - Ensure the tool is accessible from the main Viewer for "Interactive" layer creation, not just transcription.

**Effort:** Low (Extending existing tool)

---

## 3. Interaction Action Mapper (Annotation 'Body' Logic)

**Goal:** Define click actions (Link, Popup, JS Event).

**Current State:**
- `Inspector.tsx` edits generic metadata (`label`, `summary`).
- `PolygonAnnotationTool.tsx` creates `TextualBody` with `motivation: commenting`.
- **Missing:** A specialized UI to define *behavior*.

**Implementation Plan:**
1.  **New Inspector Panel:** `InteractionPanel.tsx`.
    - When an annotation is selected, allow switching "Action Type":
        - **None** (Static highlight)
        - **Link** (Open URL) -> Edit `body.id` and set `purpose: linking`.
        - **Popup** (Tooltip) -> Edit `body.value` and set `format: text/html`.
2.  **Data Model:**
    - Use `motivation: linking` for links.
    - Use standard `describing` for popups.

**Effort:** Medium (New UI component)

---

## 4. Content State Serializer

**Goal:** "Save View" (Zoom/Pan persistence).

**Current State:**
- ✅ `services/contentState.ts` is fully implemented (Encode/Decode/Generate Link).
- ✅ `ShareButton.tsx` uses it to generate links.
- **Gap:** It currently defaults to "Whole Resource" unless a region is explicitly passed.

**Implementation Plan:**
1.  **Capture Viewport:**
    - In `Viewer.tsx`, expose the current OpenSeadragon viewport bounds.
    - Pass these bounds to `ShareButton` as the default `selectedRegion` if no annotation is selected.
2.  **UI Tweak:**
    - Rename/Add option in `ShareButton`: "Copy Link to Current View" (vs "Copy Link to Resource").

**Effort:** Low (wiring existing service)

---

## 5. One-Click Embed Code Generator

**Goal:** `<iframe src="...">` snippet generation.

**Current State:**
- `ExportDialog.tsx` handles "Static Site" (Zip) and "Raw IIIF".
- **Missing:** A "Share/Embed" tab.

**Implementation Plan:**
1.  **Hosted Runtime:**
    - This requires a hosted version of the viewer to point to (e.g., `https://viewer.field-studio.org`).
    - *Alternative (Local-First):* Generate a `data:` URI based iframe or a blob-based loader script (complex).
    - *Recommendation:* Assume a generic IIIF viewer (like Universal Viewer) or a lightweight hosted "Field Player".
2.  **Generator UI:**
    - Add "Embed" tab to `ShareButton` popover (better context than Export).
    - Generate: `<iframe src="https://universalviewer.io/embed?manifest={manifestUrl}&iiif-content={contentState}" ...></iframe>`.

**Effort:** Medium (Depends on hosting strategy)

---

## 6. Customizable CSS/Theme Injection

**Goal:** Style regions (stroke color, fill opacity, hover effect).

**Current State:**
- `PolygonAnnotationTool` uses hardcoded colors (`green-400`, etc.).
- No storage for style preferences in the IIIF JSON.

**Implementation Plan:**
1.  **Schema Extension:**
    - Adopt the **IIIF Presentation 3 CSS extension** or a custom `service` block in the Annotation:
      ```json
      {
        "service": [{
          "@context": "http://iiif.io/api/annex/services/css/context.json",
          "profile": "http://iiif.io/api/annex/services/css",
          "value": ".annotation-123 { stroke: red; stroke-width: 2px; }"
        }]
      }
      ```
    - Or simpler local `stylesheet` property.
2.  **Style Editor:**
    - Add "Appearance" section to `Inspector` / `InteractionPanel`.
    - Controls: Stroke Color (Picker), Fill Opacity (Slider), Line Width.
3.  **Renderer Update:**
    - Update `Viewer` to apply these styles to the SVG overlays.

**Effort:** High (Requires schema decision and rendering engine update)
