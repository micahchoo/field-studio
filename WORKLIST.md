
# IIIF Field Archive Studio - Implementation Worklist

This document outlines the pending features and improvements required to fully realize the **Technical Specification v3.0**.

## 1. Core Infrastructure & Services
- [x] **Service Worker Image API**: Migrate `LocalIIIFServer` to a Service Worker to handle IIIF Image API 3.0 requests.
- [x] **Content State API**: Implement support for `iiif-content` parameter.
- [x] **Validation Service**: Integrate a IIIF validator for real-time compliance checks.
- [x] **Storage Management**: Implement quota checking and eviction policies.
- [x] **Content Search API**: Implement local API endpoint.
- [x] **Optimized Image Processing**: Implement tiered caching (Level 0/1) in Service Worker.
- [x] **Error Boundaries**: Implement robust error handling for React components and Service Worker failures.
- [x] **Reliability & Recovery**: Implement "Safe Mode" and data rescue workflows for crashed sessions (Auto-save indicators added).

## 2. Ingest & Convention Layer
- [x] **Full IIIF Property Mapping**: `provider`, `homepage`, `seeAlso`, etc.
- [x] **Range Generation**: `structures` parsing.
- [x] **Processing Limits**: Max file size checks.
- [x] **Staging Area 2.0**: Implement "Non-Presumptive Staging Workflow" (Question-driven ingest wizard).
- [x] **Smart Sidecar Detection**: Auto-detect and link `jpg+txt` (transcription), `mp3+srt` (captions), and `tif+jpg` (derivatives).
- [x] **Batch Metadata Harvester**: Extract EXIF/XMP data and map CSV/Spreadsheet columns to IIIF properties.
- [ ] **Filename Pattern Detector**: Visual regex/pattern renaming interface for bulk file organization.
- [ ] **Duplicate Resolver**: Visual cluster view for handling file collisions (Keep A, Keep B, Keep Both).
- [ ] **Convention Configuration**: Toggle between "Standard biiif" and "Field Studio" naming conventions.

## 3. Workspace Layout & UI (v3.0)
- [x] **Layout Architecture**: Standard 3-pane layout.
- [x] **Status Bar**: Global status indicators.
- [x] **Dual-View Toggle**: Persistent Files vs IIIF view.
- [x] **Command Palette**: `Cmd+K` global menu.
- [x] **Adaptive Entry**: Initial user assessment to auto-configure abstraction level (Simple/Standard/Advanced).
- [x] **Field Mode**: High-contrast toggle with larger touch targets (>48px) for outdoor use.
- [x] **Interruption Handling**: Robust auto-save and state restoration to handle browser unloads/crashes.

## 4. Mode Enhancements (Organization & Analysis)
- [x] **Collections Mode**: Hierarchy builder & Range editor.
- [x] **Boards Mode**: Spatial organization.
- [x] **Viewer Mode**: Deep zoom & annotation.
- [x] **Search Mode**: Full-text index.
- [x] **Archive: File DNA**: Visual metadata glyphs on thumbnails (Time, Location, Source).
- [x] **Archive: Drag-to-Compare**: Lightbox for side-by-side comparison of up to 4 items with synced zoom.
- [ ] **Collections: Visual Builder**: Drag-and-drop structure manipulation with "Convert to Manifest/Collection" context actions.
- [ ] **Collections: Drag-to-Sequence**: Lasso tool to define Canvas ordering spatially.
- [ ] **Collections: Template Library**: Pre-configured IIIF structures (e.g., Oral History, Codex, Site Survey).
- [ ] **Viewer: Canvas Composer**: Visual interface for assembling multi-resource Canvases (images + AV + text).
- [ ] **Viewer: Overlay Comparison**: Opacity slider and difference mode for near-duplicate analysis.

## 5. Quality Control & Validation
- [x] **Real-time Validation**: Immediate visual indicators (borders, icons) on items violating IIIF specs.
- [x] **QC Dashboard**: Aggregated view of validation issues, image quality warnings, and metadata completeness.
- [ ] **Export Dry Run**: Detailed visual preview of the generated directory structure and JSON files before export.
- [ ] **Provenance Tracker**: Track and visualize file transformations and source history.

## 6. Instructional Design & Help
- [x] **Contextual Help**: Just-in-time micro-learning tooltips.
- [x] **Contextual Help 2.0**: Trigger-based guidance (e.g., show tip after 3 repeated errors or long hesitation).
- [x] **Scaffolding**: "Just-in-time" micro-learning overlays explaining IIIF concepts (Manifest, Canvas) when encountered.
- [ ] **Metacognitive Tools**: "Concepts Mastered" progress visualization.

## 7. Accessibility
- [ ] **Keyboard Navigation**: Comprehensive shortcuts for all new tools.
- [ ] **ARIA**: Focus management and labels.
