
# IIIF Field Archive Studio - Implementation Worklist

This document outlines the pending features and improvements required to fully realize the **Technical Specification v3.0**.

## 1. Core Infrastructure & Services
- [x] **Service Worker Image API**: Migrate `LocalIIIFServer` to a Service Worker to handle IIIF Image API 3.0 requests.
- [ ] **Content State API**: Implement support for `iiif-content` parameter (Import/Load) on app startup.
- [ ] **Content State Export**: Generate encoded `iiif-content` links/bookmarks for sharing specific views (Canvas/Region).
- [x] **Validation Service**: Integrate a IIIF validator for real-time compliance checks.
- [x] **Storage Management**: Implement quota checking and eviction policies.
- [x] **SearchService2 Declaration**: Manifests declare SearchService2 in their `service` array.
- [x] **Content Search API Endpoint**: `sw.js` handles search requests and delegates to main thread search service.
- [x] **Tiered Image Processing**: Implement hybrid strategy (Level 0 pre-generated static sizes + Level 1 dynamic resizing).
- [x] **Chunked Ingest Processing**: Implement non-blocking, chunked processing for large file sets to prevent UI freezing.
- [x] **On-demand Tile Caching**: Service Worker caches generated tiles after first request.
- [x] **Error Boundaries**: Implement robust error handling for React components and Service Worker failures.
- [x] **Reliability & Recovery**: Implement "Safe Mode" and data rescue workflows for crashed sessions.
- [x] **Differentiated Explorer Views**: Semantic IIIF view vs. Physical Disk view toggle.
- [x] **Pre-ingest Base URL**: Allow researchers to specify the target hosting URL for portable identifiers.

## 2. Ingest & Convention Layer
- [x] **Full IIIF Property Mapping**: `provider`, `homepage`, `seeAlso`, etc. (Via Metadata Editor and Batch Tools).
- [x] **Range Editing**: RangeEditor UI for building `structures` (table of contents).
- [ ] **Auto Range Generation**: Infer Ranges from folder structure or numbered filename patterns automatically.
- [x] **Processing Limits**: Max file size checks.
- [x] **Staging Area 3.0**: Questions-driven wizard with archival implication summaries.
- [ ] **Smart Sidecar Detection**: Auto-detect and link `jpg+txt` (transcription), `mp3+srt` (captions) during ingest.
- [x] **EXIF/XMP Metadata Extraction**: Extract camera, date, GPS data from images automatically.
- [x] **Robust Label Detection**: Support for `none` and `@none` in IIIF language maps.
- [ ] **Filename Pattern Detector**: Visual regex/pattern extraction interface for bulk metadata creation (distinct from renaming).
- [x] **CSV Metadata Import**: Map spreadsheet columns to IIIF properties.

## 3. Workspace Layout & UI (v3.0)
- [x] **Layout Architecture**: Standard 3-pane layout.
- [x] **Status Bar**: Global status indicators with Save Status and Storage metrics.
- [x] **Dual-View Toggle**: Persistent Files vs IIIF view.
- [x] **Command Palette**: `Cmd+K` global menu.
- [x] **Field Mode**: High-contrast toggle with larger touch targets for outdoor use.
- [x] **Interruption Handling**: Robust auto-save and state restoration.
- [x] **Metadata Row Previews**: Expandable visual proof in spreadsheet view.

## 4. Mode Enhancements (Organization & Analysis)
- [x] **Collections Mode**: Hierarchy builder & Range editor with structural conversion assistant.
- [x] **Boards Mode**: Fixed connection anchoring, state sync, and delete logic.
- [x] **Viewer Mode**: Deep zoom (OpenSeadragon) with evidence extraction tools.
- [x] **Search Mode**: Global full-text index with type filtering.
- [x] **Archive: File DNA**: Visual metadata glyphs on thumbnails (Time, Location, Source).
- [x] **Collections: Drag-Drop Hierarchy**: Sidebar drag-and-drop for regrouping resources.
- [x] **Viewer: Image API Request Builder**: Full specify compliance for 3.0 parameters.
- [x] **Viewer: Canvas Composer**: Compound Synthesis Workspace with z-index and opacity.
- [x] **Archive: Map View**: Spatial view for geotagged items with cluster support.
- [x] **Archive: Timeline View**: Chronological grouping by day/month/year.

## 5. Quality Control & Validation
- [x] **Real-time Validation**: Immediate visual indicators on items violating IIIF specs.
- [x] **QC Dashboard**: Aggregated view with "Heal" (one-click fix) engine.
- [x] **Export Dry Run**: Detailed visual preview of generated files before export.

## 8. Annotation System
- [x] **Evidence Extraction**: Create supplementing annotations from specific regions with derived Image API bodies.
- [ ] **Polygon Annotation Tool**: SvgSelector support in viewer (Current implementation supports Rectangular FragmentSelector).
- [ ] **OCR Integration**: Auto-generate supplementing annotations from image text recognition (Skeleton Implemented).
