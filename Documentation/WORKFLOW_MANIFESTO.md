
# IIIF Field Archive Studio: Workflow Manifesto

This document outlines the ideal roles, responsibilities, and experiential goals of each workspace within the Studio, emphasizing their interdependence in the archival lifecycle.

## 1. The Archive View (The Staging Area)
*   **Role**: Physical-to-Digital bridge.
*   **Responsibility**: Raw ingest, "DNA" extraction (EXIF/GPS), and primary selection.
*   **Experience**: High-throughput, visual-first.
*   **Interdependence**: Feeds raw items into the **Collections** view for modeling and the **Metadata** view for cataloging.
*   **Affordance**: "Create Manifest from Selection" — turning a group of photos into an atomic digital object.

## 2. The Collections View (The Architect)
*   **Role**: Semantic Modeling.
*   **Responsibility**: Building the IIIF Hierarchy (Collections/Manifests/Ranges). Defining the "Reading Order".
*   **Experience**: Structural, hierarchical, logical.
*   **Interdependence**: Uses the **Archive** items as its building blocks. Passes structured data to the **Viewer** for deep inspection.
*   **Affordance**: "Auto Range Building" — grouping items by file pattern into a Table of Contents.

## 3. The Metadata View (The Librarian)
*   **Role**: Mass Cataloging.
*   **Responsibility**: Ensuring data integrity, batch editing, and controlled vocabulary compliance.
*   **Experience**: Spreadsheet-driven, high-density, text-focused.
*   **Interdependence**: Synchronizes with the **Archive**. Metadata refined here is instantly available in **Search** results and **Viewer** descriptions.
*   **Affordance**: "Pattern Extraction" — pulling metadata from filenames using regex.

## 4. The Viewer View (The Microscope)
*   **Role**: Deep Analysis.
*   **Responsibility**: Spatial inspection (Deep Zoom), Evidence Extraction (Region Annotation), and Transcription (OCR).
*   **Experience**: Immersive, detail-oriented, analytical.
*   **Interdependence**: Generates "Supplementing" annotations that populate the **Search** index and **Archive** item DNA.
*   **Affordance**: "Evidence Snippet" — clipping a region of an image to serve as a standalone citation.

## 5. The Boards View (The Laboratory)
*   **Role**: Synthesis & Synthesis.
*   **Responsibility**: Visualizing cross-manifest relationships and temporal sequences.
*   **Experience**: Infinite canvas, non-linear, spatial reasoning.
*   **Interdependence**: Pulls items from the **Archive**. Its "Links" are saved as `linking` annotations back to the original resources.
*   **Affordance**: "Relationship Anchoring" — visually mapping how two disparate artifacts relate.

## 6. The Search View (The Navigator)
*   **Role**: Discovery.
*   **Responsibility**: Cross-project retrieval and rapid context switching.
*   **Experience**: Lightning fast, keyword-centric.
*   **Interdependence**: Indexes everything from all other views.
*   **Affordance**: "Reveal in Context" — jumping from a search result directly into the **Viewer** or **Archive** location.
