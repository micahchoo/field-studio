# IIIF Field Studio: Affordance & Integration Matrix v2.0

This document defines the interoperability of the Studio's workspace modes, mapping user personas to specific affordances and defining the "Connective Tissue" that enables the end-to-end archival workflow.

## 1. View Roles & Responsibilities

| Workspace | Primary Role | Archival Responsibility | Experience Focus |
|:---|:---|:---|:---|
| **Archive** | Intake & Curation | Physical-to-Digital Bridge. Extracting "Archive DNA" (EXIF/GPS). | **High Velocity**: Rapid selection and bulk folder management. |
| **Collections** | Semantic Architect | Defining Hierarchy (Series/Items). Modeling the reading order and TOC. | **Logical Clarity**: Visualizing nested structures and inheritance. |
| **Metadata** | Mass Cataloger | Data integrity & Synchronization. Pattern-based labeling. | **Precision**: Spreadsheet efficiency for hundreds of records. |
| **Viewer** | Forensic Analysis | Spatial analysis & Evidence extraction. Multimodal synthesis. | **Immersion**: Deep zoom and layering for analytical proof. |
| **Boards** | Scholar Lab | Cross-manifest synthesis. Visualization of relationships. | **Serendipity**: Non-linear space for finding new connections. |
| **Search** | Global Navigator | Context-aware retrieval. Jump-to-point bookmarks. | **Instant Recall**: Global index with cross-view jumping. |

## 2. Integrated Workflow (The Pipeline)

| Trigger View | Action | Target View | Context Transferred |
|:---|:---|:---|:---|
| Archive | "Catalog Metadata" | Metadata | Selection subset is pre-filtered in spreadsheet. |
| Archive | "Map Selected" | Archive (Map) | Viewport centers on the GPS cluster of selection. |
| Archive | "Pin to Board" | Boards | Items appear as nodes in the active workspace. |
| Collections | "Synthesize" | Viewer | Manifest canvases are pre-loaded into the Layer Composer. |
| Search | "Reveal on Map" | Archive (Map) | Jumps directly to the spatial coordinates of the result. |
| Search | "Open Inspector" | Any | Opens the right panel with the target resource focused. |

## 3. Persona Configurations

### Field Researcher (Tactical)
*   **Focus**: Capture and simple grouping.
*   **UI**: Large touch targets, simplified IIIF terminology (e.g., "Folder" instead of "Collection").
*   **Affordance**: One-click "Geotagging Fix" using current location.

### Digital Archivist (Standards)
*   **Focus**: Descriptive precision and validation.
*   **UI**: Metadata templates (Dublin Core), validation "heatmaps" in Sidebar.
*   **Affordance**: Batch regex pattern extraction from filenames.

### IIIF Developer (API)
*   **Focus**: Interoperability and deep-linking.
*   **UI**: Raw JSON-LD editors, ID transparency.
*   **Affordance**: "Copy Content State 1.0" URL generation for Mirador/UV.