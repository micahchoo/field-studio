# IIIF Field Archive Studio — Technical Specification

## Overview

application for field researchers to organize, annotate, and connect heterogeneous media. The application functions as a personal IIIF ecosystem: Image API server, Presentation API manifest editor, W3C Web Annotation environment, and visual connection mapper in one interface.

All outputs comply with the following IIIF and W3C specifications:
- **IIIF Image API 3.0** — for image delivery and manipulation
- **IIIF Presentation API 3.0** — for manifests, collections, canvases, and ranges
- **W3C Web Annotation Data Model** — for all annotation storage and exchange
- **IIIF Content Search API 2.0** — for searching annotations
- **IIIF Change Discovery API 1.0** — for synchronization and discovery

---

## Core Mental Model

The application has three conceptual layers mapped to IIIF resource types:

1. **Archive** — Raw materials (images, documents, audio, video) served via the IIIF Image API
2. **Collections** — Organized groupings with metadata, output as IIIF Collections and Manifests
3. **Boards** — Spatial canvases where relationships are mapped, represented as IIIF Canvases with Web Annotations

Users move fluidly between these layers. An image exists in the archive (served via Image API), appears in multiple collections (referenced in Manifests), and can be placed on any number of boards where its relationships to other materials are articulated through Web Annotations.

---

## Application Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Menu Bar                                                       │
├───────────┬─────────────────────────────────────────────────────┤
│           │                                                     │
│  Sidebar  │              Main Workspace                         │
│           │                                                     │
│  - Archive│   (Archive Browser / Collection Editor /            │
│  - Collec-│    Board Canvas / Item Viewer)                      │
│  - Boards │                                                     │
│  - Search │                                                     │
│           │                                                     │
├───────────┴─────────────────────────────────────────────────────┤
│  Status Bar                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## IIIF Resource Mapping

### How Application Concepts Map to IIIF Resources

| Application Concept | IIIF Resource Type | Notes |
|---------------------|-------------------|-------|
| Archive Item | Content Resource + Image API Service | Images served via Image API 3.0 |
| Collection | Collection | Hierarchical groupings with `type: "Collection"` |
| Collection Item | Manifest | Each item becomes a Manifest with Canvases |
| Board | Manifest with synthetic Canvas | Board itself is a Canvas; items are Annotations |
| Connection | Web Annotation with `linking` motivation | Links between regions via SpecificResource |
| Annotation | Web Annotation | Full W3C Web Annotation Data Model compliance |
| Region Selection | SpecificResource with Selector | FragmentSelector for spatial/temporal regions |

---

## Functional Specifications

### 1. Archive Management (IIIF Image API 3.0 Server)

The archive functions as a local IIIF Image API 3.0 compliant server.

**Ingest**
- Drag-and-drop files or folders
- Watch folders for automatic import
- Capture from clipboard (screenshots)
- Import from URLs (including existing IIIF manifests via `partOf` relationships)
- Batch import with CSV metadata sidecar

**Supported Content Resource Formats**

| Type | Formats | IIIF `type` Value |
|------|---------|-------------------|
| Images | TIFF, JPEG, PNG, JPEG2000, WebP, HEIC | `Image` |
| Documents | PDF (rendered as image sequences), DJVU | `Image` (per page) |
| Audio | MP3, WAV, FLAC, OGG | `Sound` |
| Video | MP4, WebM, MOV | `Video` |
| Text | Plain text, Markdown, RTF | `Text` |
| Data | JSON, XML, CSV | `Dataset` |

**Automatic Processing on Ingest**

For each ingested image, generate IIIF Image API 3.0 compliant resources:

```json
{
  "@context": "http://iiif.io/api/image/3/context.json",
  "id": "https://localhost:8080/iiif/image/{identifier}",
  "type": "ImageService3",
  "protocol": "http://iiif.io/api/image",
  "profile": "level2",
  "width": 6000,
  "height": 4000,
  "tiles": [
    { "width": 512, "scaleFactors": [1, 2, 4, 8, 16] }
  ],
  "sizes": [
    { "width": 150, "height": 100 },
    { "width": 600, "height": 400 }
  ]
}
```

**Processing Pipeline:**
- Generate IIIF Image API tiles (stored locally)
- Extract embedded metadata (EXIF, XMP, IPTC) → map to `metadata` property
- Generate thumbnails at configurable sizes
- Calculate checksums for integrity verification
- OCR for images containing text (optional) → stored as `supplementing` Annotations

**Image API URI Pattern:**
```
{scheme}://{server}{/prefix}/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

**Required Image API Features (Level 2 Compliance):**
- Region: `full`, `square`, `x,y,w,h`, `pct:x,y,w,h`
- Size: `max`, `w,`, `,h`, `pct:n`, `w,h`, `!w,h`
- Rotation: `0`, `90`, `180`, `270`, arbitrary rotation
- Quality: `default`, `color`, `gray`, `bitonal`
- Format: `jpg`, `png`, `webp`

**Archive Browser Views**
- Grid view with adjustable thumbnail size
- List view with sortable columns
- Map view (items with `navPlace` extension coordinates plotted)
- Timeline view (items arranged by `navDate`)
- Filterable by: date range, file type, tags, metadata fields, annotation status

---

### 2. Collection Editor (IIIF Presentation API 3.0)

Collections become IIIF Presentation API 3.0 Manifests and Collections when exported.

**Collection Structure (IIIF Mapping)**

```
Collection (type: "Collection")
├── items: [
│   ├── Manifest (type: "Manifest")
│   │   └── items: [Canvas, Canvas, ...]
│   ├── Manifest
│   └── Collection (nested sub-collection)
│       └── items: [...]
]
```

**Manifest Structure:**

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/iiif/manifest/1",
  "type": "Manifest",
  "label": { "en": ["Example Document"] },
  "summary": { "en": ["A brief description"] },
  "metadata": [
    {
      "label": { "en": ["Creator"] },
      "value": { "en": ["Jane Researcher"] }
    }
  ],
  "requiredStatement": {
    "label": { "en": ["Attribution"] },
    "value": { "en": ["Provided by Field Archive Studio"] }
  },
  "rights": "http://creativecommons.org/licenses/by/4.0/",
  "provider": [{
    "id": "https://example.org/about",
    "type": "Agent",
    "label": { "en": ["Example Organization"] }
  }],
  "thumbnail": [{
    "id": "https://example.org/iiif/image/1/full/200,/0/default.jpg",
    "type": "Image",
    "format": "image/jpeg"
  }],
  "items": [
    {
      "id": "https://example.org/iiif/manifest/1/canvas/1",
      "type": "Canvas",
      "label": { "none": ["Page 1"] },
      "width": 3000,
      "height": 4000,
      "items": [{
        "id": "https://example.org/iiif/manifest/1/canvas/1/page/1",
        "type": "AnnotationPage",
        "items": [{
          "id": "https://example.org/iiif/manifest/1/canvas/1/page/1/anno/1",
          "type": "Annotation",
          "motivation": "painting",
          "body": {
            "id": "https://example.org/iiif/image/1/full/max/0/default.jpg",
            "type": "Image",
            "format": "image/jpeg",
            "service": [{
              "id": "https://example.org/iiif/image/1",
              "type": "ImageService3",
              "profile": "level2"
            }]
          },
          "target": "https://example.org/iiif/manifest/1/canvas/1"
        }]
      }]
    }
  ]
}
```

**Editing Interface**
- Drag items from archive into collection
- Reorder via drag-and-drop (changes Canvas order in `items` array)
- Bulk metadata editing for selected items
- Side-by-side preview of how manifest will render in standard viewers (Mirador, Universal Viewer)

**Metadata Entry (IIIF Properties)**

| UI Field | IIIF Property | Notes |
|----------|---------------|-------|
| Title | `label` | Required. Language map: `{ "en": ["Title"] }` |
| Description | `summary` | Language map with HTML allowed |
| Metadata pairs | `metadata` | Array of `{label, value}` objects |
| Rights | `rights` | URI from Creative Commons or RightsStatements.org |
| Attribution | `requiredStatement` | `{label, value}` object |
| Provider | `provider` | Agent objects with id, type, label |
| Navigation date | `navDate` | XSD dateTime: `2010-01-01T00:00:00Z` |

**Fuzzy Date Support**

Fuzzy dates ("Spring 1923", "circa 1850") are stored in `metadata` for human display and `navDate` for machine navigation using best-guess ISO 8601.

**Multilingual Labels**

```json
{
  "label": {
    "en": ["English Title"],
    "fr": ["Titre français"],
    "none": ["Untranslated identifier"]
  }
}
```

**Behavior Values**

| Value | Use Case |
|-------|----------|
| `paged` | Book-like page turning interface |
| `continuous` | Long scroll (panoramas, scrolls) |
| `individuals` | Distinct images (default) |
| `unordered` | No inherent sequence |
| `auto-advance` | Automatically proceed to next Canvas |

**Viewing Direction**

| Value | Description |
|-------|-------------|
| `left-to-right` | Default, Western books |
| `right-to-left` | Hebrew, Arabic, manga |
| `top-to-bottom` | Traditional Chinese, Japanese |
| `bottom-to-top` | Rare, specialized uses |

**Manifest Output Options**
- IIIF Presentation API 3.0 compliant JSON-LD
- Optional IIIF Presentation API 2.1 for legacy viewer compatibility
- Validate against IIIF Presentation API validator before export
- Export as standalone JSON or publish to configured endpoint

---

### 3. Board Canvas (Relationship Mapping via Web Annotations)

The distinctive feature: a freeform spatial canvas for mapping connections using the W3C Web Annotation Data Model.

**Board as IIIF Canvas**

Each board is represented as a Manifest containing a single large Canvas:

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/board/1",
  "type": "Manifest",
  "label": { "en": ["Research Board: Manuscript Connections"] },
  "items": [{
    "id": "https://example.org/board/1/canvas/1",
    "type": "Canvas",
    "label": { "none": ["Main Board"] },
    "width": 10000,
    "height": 10000,
    "items": [{
      "id": "https://example.org/board/1/canvas/1/page/1",
      "type": "AnnotationPage",
      "items": []
    }],
    "annotations": [{
      "id": "https://example.org/board/1/canvas/1/annotations/1",
      "type": "AnnotationPage"
    }]
  }]
}
```

**Placing Items on Board**

Items placed on the board become Annotations with `motivation: "painting"` that target specific regions of the board Canvas:

```json
{
  "id": "https://example.org/board/1/anno/item-1",
  "type": "Annotation",
  "motivation": "painting",
  "body": {
    "id": "https://example.org/iiif/manifest/1/canvas/1",
    "type": "Canvas"
  },
  "target": {
    "type": "SpecificResource",
    "source": "https://example.org/board/1/canvas/1",
    "selector": {
      "type": "FragmentSelector",
      "value": "xywh=100,200,500,400"
    }
  }
}
```

**Connection Drawing (Web Annotations with `linking` motivation)**

Connections between items are represented as Web Annotations:

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "https://example.org/board/1/connection/1",
  "type": "Annotation",
  "motivation": "linking",
  "body": {
    "type": "TextualBody",
    "value": "This manuscript depicts the same scene",
    "format": "text/plain"
  },
  "target": [
    {
      "type": "SpecificResource",
      "source": "https://example.org/iiif/manifest/1/canvas/1",
      "selector": {
        "type": "FragmentSelector",
        "value": "xywh=100,100,200,200"
      },
      "purpose": "identifying"
    },
    {
      "type": "SpecificResource",
      "source": "https://example.org/iiif/manifest/2/canvas/1",
      "selector": {
        "type": "FragmentSelector",
        "value": "xywh=300,150,250,180"
      },
      "purpose": "identifying"
    }
  ]
}
```

**Connection Types (Custom Motivation Extensions)**

| Type | Motivation | Description |
|------|------------|-------------|
| Depicts | `linking` + `depicting` | This photo shows this object |
| Transcribes | `linking` + `describing` | This text transcribes this document |
| Relates to | `linking` | General connection |
| Contradicts | `linking` + custom | Conflicting evidence |
| Precedes/Follows | `linking` + custom | Temporal sequence |

**Region-to-Region Connections**

Using SpecificResource with FragmentSelector:

```json
{
  "type": "SpecificResource",
  "source": "https://example.org/iiif/manifest/1/canvas/1",
  "selector": {
    "type": "FragmentSelector",
    "conformsTo": "http://www.w3.org/TR/media-frags/",
    "value": "xywh=pixel:100,100,200,200"
  }
}
```

**Annotation Types on Boards**

| Element | Web Annotation Representation |
|---------|------------------------------|
| Sticky note | Annotation with `commenting` motivation, TextualBody |
| Freehand drawing | Annotation with `highlighting` motivation, SvgSelector |
| Shape highlight | Annotation with `highlighting` motivation, FragmentSelector |
| Text label | Annotation with `describing` motivation, TextualBody |

**Board Organization Features**
- Named frames/sections (Ranges within the board Manifest)
- Minimap for navigation
- Layers (separate AnnotationPages, toggled via `behavior: "hidden"`)
- Snapshots (versioned copies of the Manifest)

---

### 4. Item Viewer & Annotation (W3C Web Annotation)

Deep viewing and annotation of individual items using W3C Web Annotation Data Model.

**Viewer Capabilities**
- OpenSeadragon-based deep zoom for images (IIIF Image API 3.0)
- Audio waveform display with playback (`duration` property on Canvas)
- Video player with frame-accurate navigation
- PDF page navigation (each page as a Canvas)
- Side-by-side comparison (multiple Canvases in viewport)
- Overlay comparison (Choice body with multiple images)
- Light table mode (Manifest with `behavior: "individuals"`)

**Annotation Model (W3C Web Annotation)**

All annotations follow the W3C Web Annotation Data Model:

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "https://example.org/annotation/1",
  "type": "Annotation",
  "motivation": "commenting",
  "created": "2025-01-21T12:00:00Z",
  "creator": {
    "id": "https://example.org/users/researcher",
    "type": "Person",
    "name": "Jane Researcher"
  },
  "body": {
    "type": "TextualBody",
    "value": "This appears to be a later addition to the manuscript.",
    "format": "text/plain",
    "language": "en"
  },
  "target": {
    "type": "SpecificResource",
    "source": "https://example.org/iiif/manifest/1/canvas/1",
    "selector": {
      "type": "FragmentSelector",
      "conformsTo": "http://www.w3.org/TR/media-frags/",
      "value": "xywh=100,200,300,150"
    }
  }
}
```

**Annotation Tools**

| Tool | Selector Type | Motivation |
|------|--------------|------------|
| Rectangle | FragmentSelector (`xywh=`) | varies |
| Polygon | SvgSelector | varies |
| Freehand | SvgSelector | varies |
| Point | PointSelector or FragmentSelector | varies |
| Time range (AV) | FragmentSelector (`t=`) | varies |

**Selector Types**

```json
// Spatial region (pixels)
{
  "type": "FragmentSelector",
  "conformsTo": "http://www.w3.org/TR/media-frags/",
  "value": "xywh=100,100,200,150"
}

// Spatial region (percentage)
{
  "type": "FragmentSelector",
  "conformsTo": "http://www.w3.org/TR/media-frags/",
  "value": "xywh=percent:10,10,20,15"
}

// Temporal range (audio/video)
{
  "type": "FragmentSelector",
  "conformsTo": "http://www.w3.org/TR/media-frags/",
  "value": "t=30.5,60.0"
}

// SVG selector (polygon/freehand)
{
  "type": "SvgSelector",
  "value": "<svg><polygon points='100,100 150,50 200,100 150,150'/></svg>"
}

// Point selector
{
  "type": "PointSelector",
  "x": 150,
  "y": 200
}
```

**Motivation Values (IIIF + W3C)**

| Motivation | Use |
|------------|-----|
| `painting` | Content that IS the Canvas (IIIF specific) |
| `supplementing` | Content FROM the Canvas (transcription, translation) |
| `commenting` | Commentary about the resource |
| `describing` | Description of the resource |
| `tagging` | Tags from vocabulary |
| `identifying` | Identifying what something depicts |
| `linking` | Linking to other resources |
| `highlighting` | Visual emphasis |
| `classifying` | Formal classification |
| `bookmarking` | Navigation markers |

**Annotation Body Types**

```json
// Text body
{
  "type": "TextualBody",
  "value": "Annotation text",
  "format": "text/plain",
  "language": "en"
}

// Choice of bodies (e.g., transcription + translation)
{
  "type": "Choice",
  "items": [
    {
      "type": "TextualBody",
      "value": "Original text",
      "language": "la"
    },
    {
      "type": "TextualBody",
      "value": "English translation",
      "language": "en"
    }
  ]
}

// Link to another resource
{
  "id": "https://example.org/related-item",
  "type": "Text",
  "format": "text/html"
}
```

**Confidence/Certainty (Custom Extension)**

```json
{
  "@context": [
    "http://www.w3.org/ns/anno.jsonld",
    {
      "certainty": "https://example.org/ns/certainty",
      "certain": "https://example.org/ns/certainty#certain",
      "probable": "https://example.org/ns/certainty#probable",
      "uncertain": "https://example.org/ns/certainty#uncertain",
      "speculative": "https://example.org/ns/certainty#speculative"
    }
  ],
  "certainty": "probable"
}
```

**Annotation Display & Interaction**
- Clickable annotation markers on viewer
- Click annotation → smooth zoom/pan to region (padding percentage configurable)
- For audio/video, click seeks to annotation start time
- Annotation panel lists all annotations (sortable, filterable)
- Color-coded by motivation or creator

**Annotation Storage**
- W3C Web Annotation compliant JSON-LD
- Stored in AnnotationPages referenced from Canvas `annotations` property
- Exportable per-item, per-collection, or bulk
- Syncable to external annotation servers (SimpleAnnotationServer, Annotot, etc.)

---

## Settings Architecture

Settings exist at four levels, with inheritance following IIIF patterns:

```
Application Settings (global defaults)
    └── Project Settings (per-project, stored in Collection metadata)
            └── Collection Settings (per-collection, stored in Manifest)
                    └── Item Settings (per-item, stored in Canvas)
```

### Application Settings

**General**
- Language: BCP 47 language tag for UI and default `label` language
- Theme: Light / Dark / System
- Default `rights` URI for new items
- Default `requiredStatement` template
- Auto-save interval
- Undo history depth

**Image API Server**
- Local server port (default: 8080)
- Tile format: JPEG / WebP / PNG
- Tile quality: 60-100
- Tile size: 256 / 512 / 1024
- Compliance level: level0 / level1 / level2
- `maxWidth`, `maxHeight`, `maxArea` limits

**Presentation API Defaults**
- Default `viewingDirection`: left-to-right
- Default `behavior`: individuals / paged / continuous
- Default language for `label` and `summary`
- Custom `metadata` schema (fields to prompt for)

**Annotation Defaults**
- Default `creator` object
- Default `motivation` for new annotations
- Annotation color palette by motivation
- Auto-save annotations

**Export**
- IIIF Presentation API version: 3.0 / 2.1 / Both
- Pretty-print JSON
- Base URI template for published resources
- External annotation server URL

### Project Settings

Stored in a Collection-level `seeAlso` resource:

```json
{
  "seeAlso": [{
    "id": "https://example.org/project/1/settings.json",
    "type": "Dataset",
    "format": "application/json",
    "profile": "https://example.org/profiles/project-settings"
  }]
}
```

**Project-specific:**
- Project name, description (Collection `label`, `summary`)
- Project URI for linked data identifiers
- Custom controlled vocabularies (for tagging)
- Required metadata fields checklist
- Collaborator permissions (if multi-user)

### Collection Settings

Stored directly in Manifest properties:

- `label`, `summary` (multilingual)
- `behavior` array
- `viewingDirection`
- `start` (initial Canvas)
- `thumbnail` selection method
- `provider` information
- `rights` and `requiredStatement`

### Item Settings

Stored in Canvas properties:

- `label` override
- `width`, `height`, `duration`
- `behavior` (e.g., `facing-pages`, `non-paged`)
- Rotation (via Image API URL or custom property)
- Crop region (SpecificResource with selector stored in `seeAlso`)

---

## Interaction Specifications

### Click-to-Zoom Annotations

When annotations are displayed:

1. Annotation regions render as semi-transparent overlays
2. Hover shows tooltip with annotation `body` preview
3. Click triggers:
   - Smooth animated transition to region
   - Viewport centers on FragmentSelector region
   - Zoom adjusts so region fills viewport with configurable padding
   - If `linking` motivation with external target, show "navigate" option

**For Audio/Video:**
- Annotations with `t=` selectors appear on timeline
- Click seeks to `t` start time
- Optionally auto-plays the segment

### Board Interactions

**Placing Items**
- Drag from archive → creates `painting` Annotation on board Canvas
- Paste from clipboard → creates new archive item + Annotation
- Items render at placed position using FragmentSelector `xywh`

**Drawing Connections**
1. Select connection tool
2. Click source (item or region within item)
3. Drag to target
4. Release creates Annotation with:
   - `motivation: "linking"`
   - Multiple targets (source and destination as SpecificResource)
5. Connection type selector sets additional motivation or custom property
6. Optional label stored in TextualBody

**Region Selection**
- Double-click item to "enter" for region selection
- Draw selection → creates SpecificResource with FragmentSelector
- Escape or click outside to exit

---

## Keyboard Shortcuts

### Global
- `Ctrl/Cmd + ,` — Settings
- `Ctrl/Cmd + N` — New project
- `Ctrl/Cmd + S` — Save (exports current Manifest)
- `Ctrl/Cmd + Z` — Undo
- `Ctrl/Cmd + F` — Search (Content Search API)
- `F11` — Fullscreen

### Viewer
- `+` / `-` — Zoom
- `0` — Reset to `full/max`
- `R` — Rotate 90°
- Arrow keys — Pan
- `Home` / `End` — First/last Canvas
- `Page Up/Down` — Previous/next Canvas
- `A` — Toggle annotations
- `N` — New annotation

### Annotation Mode
- `Escape` — Cancel
- `Enter` — Confirm
- `R` — Rectangle (FragmentSelector)
- `P` — Polygon (SvgSelector)
- `F` — Freehand (SvgSelector)
- `T` — Text annotation

### Board
- `V` — Select tool
- `C` — Connection tool
- `S` — Sticky note (commenting Annotation)
- `Delete` — Remove selected

---

## Export Formats

### IIIF Outputs

| Output | IIIF Type | Format |
|--------|-----------|--------|
| Manifest | Presentation API 3.0 Manifest | JSON-LD |
| Collection | Presentation API 3.0 Collection | JSON-LD |
| Legacy Manifest | Presentation API 2.1 Manifest | JSON-LD |
| Annotation Page | W3C Web Annotation AnnotationPage | JSON-LD |
| Image Info | Image API 3.0 info.json | JSON-LD |
| Search Results | Content Search API 2.0 | JSON-LD |

### Board Exports

| Format | Description |
|--------|-------------|
| Board Manifest | Complete IIIF Manifest with Canvas and all Annotations |
| PNG/SVG snapshot | Static image render of current board state |
| JSON workspace | Full fidelity backup (internal format) |

### Annotation Exports

| Format | Description |
|--------|-------------|
| W3C Web Annotation | JSON-LD per W3C spec |
| AnnotationCollection | Grouped annotations with paging |
| CSV | Flattened for spreadsheet analysis |
| Plain text | Transcriptions only (`supplementing` motivation) |

### Static Site Generation

Export options for self-contained deployment:
- Complete static website with embedded Mirador viewer
- All images tiled with IIIF Image API directory structure
- Works offline / deployable to any static web host
- Includes:
  - `/collection.json` — Entry point Collection
  - `/manifests/` — All Manifest JSON files
  - `/images/` — Tiled images with `info.json`
  - `/annotations/` — AnnotationPage JSON files
  - `/viewer/` — Mirador or Universal Viewer files

---

## Data Structures Reference

### Manifest Template

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "{base_uri}/manifest/{id}",
  "type": "Manifest",
  "label": { "en": ["{title}"] },
  "summary": { "en": ["{description}"] },
  "metadata": [],
  "requiredStatement": {
    "label": { "en": ["Attribution"] },
    "value": { "en": ["{attribution}"] }
  },
  "rights": "{rights_uri}",
  "provider": [{
    "id": "{provider_uri}",
    "type": "Agent",
    "label": { "en": ["{provider_name}"] }
  }],
  "thumbnail": [{
    "id": "{thumbnail_url}",
    "type": "Image",
    "format": "image/jpeg"
  }],
  "viewingDirection": "left-to-right",
  "behavior": ["individuals"],
  "items": [],
  "structures": [],
  "annotations": []
}
```

### Canvas Template

```json
{
  "id": "{manifest_uri}/canvas/{n}",
  "type": "Canvas",
  "label": { "none": ["{label}"] },
  "width": 0,
  "height": 0,
  "duration": null,
  "items": [{
    "id": "{canvas_uri}/page/1",
    "type": "AnnotationPage",
    "items": []
  }],
  "annotations": []
}
```

### Painting Annotation Template

```json
{
  "id": "{canvas_uri}/page/1/anno/{n}",
  "type": "Annotation",
  "motivation": "painting",
  "body": {
    "id": "{image_uri}/full/max/0/default.jpg",
    "type": "Image",
    "format": "image/jpeg",
    "width": 0,
    "height": 0,
    "service": [{
      "id": "{image_uri}",
      "type": "ImageService3",
      "profile": "level2"
    }]
  },
  "target": "{canvas_uri}"
}
```

### Web Annotation Template

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "{annotation_uri}",
  "type": "Annotation",
  "motivation": "{motivation}",
  "created": "{iso_datetime}",
  "creator": {
    "id": "{user_uri}",
    "type": "Person",
    "name": "{user_name}"
  },
  "body": {
    "type": "TextualBody",
    "value": "{text}",
    "format": "text/plain",
    "language": "{lang}"
  },
  "target": {
    "type": "SpecificResource",
    "source": "{canvas_uri}",
    "selector": {
      "type": "FragmentSelector",
      "conformsTo": "http://www.w3.org/TR/media-frags/",
      "value": "{fragment}"
    }
  }
}
```

### Range Template (Table of Contents)

```json
{
  "id": "{manifest_uri}/range/{n}",
  "type": "Range",
  "label": { "en": ["{section_title}"] },
  "items": [
    { "id": "{canvas_uri}", "type": "Canvas" },
    {
      "id": "{manifest_uri}/range/{n}/sub/{m}",
      "type": "Range",
      "label": { "en": ["{subsection_title}"] },
      "items": []
    }
  ]
}
```

---

## API Endpoints (Local Server)

The application runs a local IIIF-compliant server:

### Image API 3.0

```
GET /iiif/image/{identifier}/info.json
GET /iiif/image/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

### Presentation API 3.0

```
GET /iiif/collection/{id}
GET /iiif/manifest/{id}
GET /iiif/manifest/{id}/canvas/{n}
GET /iiif/manifest/{id}/canvas/{n}/annotations
```

### Web Annotation Protocol

```
GET    /annotations/{collection}
POST   /annotations/{collection}
GET    /annotations/{collection}/{id}
PUT    /annotations/{collection}/{id}
DELETE /annotations/{collection}/{id}
```

### Content Search API 2.0

```
GET /search/{manifest_id}?q={query}
```

---

## Validation

Before export, all outputs are validated against:

1. **IIIF Presentation API Validator** — https://iiif.io/api/presentation/validator/
2. **JSON-LD Syntax** — Valid JSON-LD 1.1
3. **Web Annotation Validator** — W3C compliance check

Validation errors are displayed with:
- Property path to error
- Expected vs. actual value
- Link to relevant specification section

---

## Offline-First Design

- All functionality works without network
- Sync features are optional add-ons
- Export produces self-contained packages
- No account required for core features
- Cloud/server features clearly marked as requiring connectivity

---

## Progressive Disclosure

The application remains approachable for basic use:

- First launch: wizard for creating first project
- Default settings optimized for simple workflows
- Advanced panels collapsed by default
- Settings: "Simple" and "Advanced" modes
- Contextual help: `?` icons link to IIIF specification
- Templates: pre-built structures for common use cases
  - Archaeological survey
  - Document digitization
  - Oral history
  - Art collection

---

# IIIF Field Archive Studio — Product Specification & Ideal State

## 1. Vision & Intent

**The Problem:** IIIF (International Image Interoperability Framework) offers powerful standards for sharing digital heritage, but the barrier to entry is high. Researchers must typically navigate complex servers, JSON-LD syntax, and rigid DAMs (Digital Asset Management systems). Field data is inherently messy—heterogeneous, unstructured, and evolving—while IIIF is strict and structured.

**The Solution:** **IIIF Field Archive Studio** is a "Darkroom for Digital Humanities." It is a local-first, browser-based workbench that acts as a bridge between the chaos of the field and the structure of the archive. It allows researchers to drag-and-drop raw files, organize them spatially and logically, enrich them with AI, and export standards-compliant static websites or IIIF packages without writing a single line of code.

**Core Philosophy:**
1.  **Local-First & Private:** Data lives in the browser (IndexedDB/FileSystem API). No server uploads required. This ensures privacy for sensitive field data and enables offline work in remote locations.
2.  **Structure as a Creative Act:** Organizing manifests is treated as a visual, creative process, not a data entry task. The interface bridges the gap between file-system logic and archival logic.
3.  **Bridge the Gap:** The UI constantly educates the user, translating "Archival Intent" (e.g., "This is a photo album") into "Technical Implementation" (e.g., "This is a Collection containing Manifests").
4.  **Zero-Config Infrastructure:** The application runs a full IIIF Image and Presentation API server *inside* the browser service worker, removing the need for backend DevOps.

---

## 2. The User Workflow (The "Happy Path")

The application is designed around a linear workflow with cyclical refinement:

### Phase 1: Ingest (The Staging Area)
*   **Input:** User drags a folder containing 10,000+ mixed files (JPG, MP3, PDF, TXT) into the app.
*   **Processing:** The app recursively scans the directory. It does not upload files. It creates handles and generates local blob URLs.
*   **The "Magic" Step:** The app analyzes folder structures and file names to *guess* the intent.
    *   *Example:* A folder named `Site_A` containing subfolders `Trench_1` and `Trench_2` is automatically proposed as a **Collection** containing two **Manifests**.
    *   *Example:* `Image.jpg` and `Image.txt` are automatically proposed as a **Canvas** with a painting annotation (image) and a supplementing annotation (text).
*   **Action:** User accepts or overrides these guesses in a spreadsheet-like view (The Staging Area). They can toggle folders between being "Collections" (containers) or "Manifests" (objects) and batch-edit metadata (Dublin Core terms) before committing to the archive.

### Phase 2: Curation (The Studio)
*   **The Virtual Server:** Once ingested, the browser spins up a `LocalIIIFServer` service worker. The app now behaves *exactly* like a IIIF Viewer connected to a remote server, but with 0ms latency.
*   **Organization:** User drags items from the sidebar (Archive) onto a **Whiteboard** (Infinite Canvas).
    *   **Spatial arrangement:** Group items visually to discover relationships.
    *   **Spatial Linking:** Draw lines between items to create semantic links (e.g., "transcribes", "depicts").
    *   **Structure:** Drag Canvases between Manifests to re-order pages or create new volumes.
*   **Enrichment:**
    *   **AI Assistant:** User selects a batch of photos and asks Gemini: "Describe these artifacts and transcribe any visible text." The metadata fields populate automatically.
    *   **Geotagging:** User places items on a map interface to generate `navPlace` data.
    *   **Deep Zoom:** Inspect high-resolution images using the internal Image API server.

### Phase 3: Export (The Publication)
*   **Static Export:** The user clicks "Export Website."
*   **Output:** The app generates a zip file containing:
    *   A static HTML/JS viewer (Mirador, Universal Viewer, or a minimal custom viewer).
    *   A directory of standardized IIIF JSON files (Manifests, Collections).
    *   An `images/` directory with standardized naming and optional tile generation.
*   **Result:** The user unzips this to GitHub Pages, Netlify, or a USB drive. They have a fully functional, deep-zoom capable digital archive for free, requiring no database or maintenance.

---

## 3. Functional Modules

### A. The Staging Area (Ingest & Triage)
The Staging Area is a "Pre-IIIF" limbo where files are cleaned before becoming official archival objects.

*   **Recursive Folder Walker:** Handles deeply nested directories without freezing the UI using Web Workers.
*   **Heuristic Engine:** Detects Biiif-like naming conventions (e.g., `_manifest`, `file.jpg` + `file.yml`) to auto-configure structure.
*   **Spreadsheet View:** A highly performant table to batch-edit metadata. Supports custom columns and Dublin Core terms.
*   **Visual Structure Builder:** A tree view where folders can be context-switched:
    *   **Treat as Collection:** A container for other items.
    *   **Treat as Manifest:** A compound object (e.g., a book).
    *   **Treat as Canvas:** A single view (e.g., a page).
    *   **Treat as Range:** A logical section (e.g., "Chapter 1").

### B. The Virtual IIIF Server
A minimal implementation of the IIIF Image and Presentation APIs running entirely within the Service Worker / Logic layer.

*   **Image API 3.0 Support:**
    *   Handles dynamic region requests (`/x,y,w,h/`) via HTML5 Canvas slicing.
    *   Handles resizing, rotation, and quality conversion on the fly.
    *   **Benefit:** Allows the "Image Request Console" to work, letting users crop and annotate images non-destructively without generating new files.
*   **Presentation API 3.0 Generation:**
    *   Generates `manifest.json` and `collection.json` on the fly from the IndexedDB state.
    *   Ensures all IDs are stable and referentially integral.

### C. The Workspace (Whiteboard & Viewers)
The primary interface for "thinking with data."

*   **Infinite Canvas:** Users can scatter Manifests and Canvases on a 2D plane.
*   **Spatial Linking:** Drawing a line between "Photo A" and "Diary Entry B" creates a Web Annotation with `motivation: linking`.
*   **Deep Zoom Viewer:** Built-in OpenSeadragon implementation for high-res inspection.
*   **Comparison View:** Side-by-side comparison of multiple canvases (Mirador-style) with synchronized zoom.
*   **Image Request Console:** A GUI for constructing Image API URLs visually (Region, Size, Rotation), useful for creating detail views or derived annotations.

### D. AI & Intelligence Layer
Integrates ollama to reduce archival drudgery.

*   **Visual Analysis:** "What is in this image?" (Fills `summary` and `tags`).
*   **Transcription:** OCR for handwritten or printed text (Fills `supplementing` annotation).
*   **Entity Extraction:** "Find all dates and names in these documents."
*   **Validation:** "Does this manifest structure comply with IIIF Presentation 3.0?"

---

## 4. Technical Architecture

### Tech Stack
*   **Framework:** React 18+ (Vite).
*   **Language:** TypeScript (Strict Mode).
*   **Storage:** `idb` (IndexedDB wrapper) for storing binary blobs and JSON graphs.
*   **State Management:** React Context + Local State (for performance).
*   **Styling:** Tailwind CSS (Utility-first).
*   **AI:** `ollama`.

### Data Model
The internal data model mirrors the IIIF spec but adds "Editor State".

*   **Archive:** The total store of all ingested blobs (Files).
*   **Project:** A serialized JSON object containing the hierarchy of Collections and Manifests.
*   **Shadow DOM for IIIF:** The app maintains an internal `FileTree` structure that maps 1:1 to a IIIF Collection hierarchy during staging.
*   **Canvas & Annotation Stores:** Persistent storage for coordinates, bodies, and targets.

---

## 5. Ideal UX/UI Characteristics

### Mechanical Lightness
*   **Optimistic UI:** Dragging a 50MB image should feel instant. The app uses low-res thumbnails generated during ingest while the full blob loads in the background.
*   **Non-Blocking:** Heavy operations (ingest, export) run in Web Workers or use `requestIdleCallback`.

### Cognitive Bridges
*   **Tooltips:** Every technical term (Manifest, Canvas, Range) has a tooltip explaining it in researcher terms (Object, Page, Section).
*   **Contextual Help:** "Why do I need a Manifest?" explanations appear when users hesitate.
*   **Preview First:** Metadata edits immediately reflect in a "Viewer Preview" so users understand the consequence of the data change.

### Aesthetics
*   **Clean & Academic:** Whitespace-heavy, highly readable typography (Inter/system fonts).
*   **Color Coded Intent:**
    *   🟢 Green = Manifest (Object)
    *   🟡 Amber = Collection (Folder)
    *   🔵 Blue = Canvas (Page)
    *   🟣 Purple = Range (Section)

---

## 6. Future Roadmap (Beyond MVP)

1.  **P2P Sync:** Two researchers working on the same archive via WebRTC/Yjs (CRDTs).
2.  **Audio/Video Segmentation:** A waveform editor for creating temporal fragment selectors (`t=10,20`).
3.  **3D Model Support:** Integrating `<model-viewer>` for `.glb`/`.gltf` artifacts with annotation support.
4.  **IPFS Export:** One-click publishing to the decentralized web for permanent archiving.
# Combined Functionalities: Presentation + Image API

## The Intersection

When both APIs work together, new capabilities emerge that neither provides alone:

| Presentation API | Image API | Combined Capability |
|------------------|-----------|---------------------|
| Canvas (coordinate space) | Region/Size parameters | Precise content positioning |
| Manifest (sequence) | Thumbnails at specific sizes | Efficient navigation |
| Range (structure) | Region extraction | Navigate to image details |
| Annotation (association) | Derived images | Contextual content delivery |
| Collection (grouping) | Batch parameters | Consistent treatment across sets |

---

## 1. Canvas-Aware Image Requesting

### Automatic Fit Calculation

When associating an image with a Canvas, the tool calculates optimal Image API parameters.

**Functionality:**
- User drops image onto Canvas
- Tool reads image dimensions from info.json
- Tool calculates region/size to fit Canvas dimensions
- Generates appropriate painting Annotation automatically

**Visual affordance:**

```
┌─────────────────────────────────────────────────────┐
│  Canvas: 1000 × 750                                 │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │   Image: 6000 × 4000 (from service)         │    │
│  │   ┌───────────────────┐                     │    │
│  │   │  Fit options:     │                     │    │
│  │   │  ○ Fill (crop)    │                     │    │
│  │   │  ● Contain (fit)  │                     │    │
│  │   │  ○ Stretch        │                     │    │
│  │   └───────────────────┘                     │    │
│  │                                             │    │
│  │   Generated request: .../full/1000,/0/...   │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

**What the tool generates:**
```json
{
  "type": "Annotation",
  "motivation": "painting",
  "body": {
    "id": "https://example.org/image/full/1000,/0/default.jpg",
    "type": "Image",
    "format": "image/jpeg",
    "service": [{ "id": "https://example.org/image", "type": "ImageService3" }]
  },
  "target": "https://example.org/canvas/1"
}
```

---

### Multi-Image Canvas Composition

Place multiple images (or image regions) onto a single Canvas with precise positioning.

**Functionality:**
- Define Canvas dimensions as the working space
- Place multiple images with position/scale controls
- Each placement becomes a painting Annotation with spatial target
- Image API parameters calculated per-placement

**Visual affordance:**

```
┌─────────────────────────────────────────────────────┐
│  Canvas: 2000 × 1500 (composite workspace)          │
│  ┌─────────────────────────────────────────────┐    │
│  │ ┌─────────┐                                 │    │
│  │ │ Image A │  ┌──────────────────┐           │    │
│  │ │ region  │  │     Image B      │           │    │
│  │ │ 0,0     │  │     full         │           │    │
│  │ └─────────┘  │     positioned   │           │    │
│  │              │     at 600,200   │           │    │
│  │              └──────────────────┘           │    │
│  │                        ┌────────┐           │    │
│  │                        │Image C │           │    │
│  │                        │rotated │           │    │
│  │                        └────────┘           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Layers:  [A: .../full/400,/0/...]                  │
│           [B: .../full/800,/0/...]                  │
│           [C: .../square/200,200/90/...]            │
└─────────────────────────────────────────────────────┘
```

**Use cases:**
- Composite photographs of fragmented objects
- Comparative layouts (before/after, recto/verso)
- Assembly of dispersed manuscript pages

---

## 2. Structure-Driven Image Extraction

### Range-to-Region Linking

Ranges can reference Canvas fragments. The tool can derive Image API requests for those fragments.

**Functionality:**
- Define a Range that references part of a Canvas (via SpecificResource with selector)
- Tool calculates corresponding Image API region
- Generate detail views, thumbnails, or exports for the Range

**Visual affordance:**

```
┌─────────────────────────────────────────────────────┐
│  Range: "Chapter 3 Illuminated Initial"             │
│                                                     │
│  References:                                        │
│  ┌───────────────────┐    ┌───────────────────┐     │
│  │ Canvas: Folio 23r │    │ Extracted Region  │     │
│  │ ┌─────────────┐   │    │                   │     │
│  │ │             │   │    │   ┌───────────┐   │     │
│  │ │   [═══]←────┼───┼────┼──→│  Detail   │   │     │
│  │ │             │   │    │   │  View     │   │     │
│  │ │             │   │    │   └───────────┘   │     │
│  │ └─────────────┘   │    │                   │     │
│  └───────────────────┘    └───────────────────┘     │
│                                                     │
│  Canvas selector: xywh=100,50,300,400               │
│  Image request:   .../100,50,300,400/max/0/...      │
│                                                     │
│  [Generate thumbnail] [Export region] [Deep zoom]   │
└─────────────────────────────────────────────────────┘
```

**What this enables:**
- Table of contents with visual previews of each section
- Direct navigation to details without loading full image
- Export of structured selections

---

### Automatic Range Thumbnails

When Ranges reference specific Canvas regions, generate appropriate thumbnails.

**Functionality:**
- Tool traverses Range structure
- For each Range item, determines the Canvas region
- Calculates Image API request for a thumbnail of that region
- Populates Range's `thumbnail` property

```
Range: "Illustrations"
├─ "Figure 1" → Canvas 3, xywh=0,0,500,400 → .../0,0,500,400/150,/0/default.jpg
├─ "Figure 2" → Canvas 5, xywh=200,100,600,500 → .../200,100,600,500/150,/0/default.jpg
└─ "Figure 3" → Canvas 8, full → .../full/150,/0/default.jpg
```

---

## 3. Annotation-Image Coordination

### Supplementing Annotations with Derived Images

Create annotations that provide alternative views of Canvas content.

**Functionality:**
- User selects a Canvas region
- Tool offers to create supplementing Annotation with:
  - Enhanced version (different quality parameters)
  - Cropped detail (region extraction)
  - Transformed view (rotation, grayscale)
- All derived from the same Image service

**Visual affordance:**

```
┌─────────────────────────────────────────────────────┐
│  Canvas: "Damaged Manuscript Page"                  │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │      [Selected region]                      │    │
│  │      ╔═══════════╗                          │    │
│  │      ║           ║                          │    │
│  │      ║  faded    ║                          │    │
│  │      ║  text     ║                          │    │
│  │      ╚═══════════╝                          │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Create supplementing annotation:                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ [Grayscale] │ │ [Enhanced]  │ │ [Enlarged]  │   │
│  │ .../gray    │ │ (external)  │ │ .../800,    │   │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Generated annotation:**
```json
{
  "type": "Annotation",
  "motivation": "supplementing",
  "body": {
    "id": "https://example.org/image/100,200,300,250/800,/0/gray.jpg",
    "type": "Image",
    "label": { "en": ["Enhanced grayscale detail"] }
  },
  "target": {
    "type": "SpecificResource",
    "source": "https://example.org/canvas/1",
    "selector": { "type": "FragmentSelector", "value": "xywh=100,200,300,250" }
  }
}
```

---

### Transcription Region Alignment

Link textual annotations to precise image regions.

**Functionality:**
- User draws region on Canvas for text block
- Creates supplementing Annotation with transcription body
- Tool can extract that region as reference image
- Bidirectional navigation: text ↔ image region

**Visual affordance:**

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────┐  ┌─────────────────────────┐   │
│  │     Canvas View         │  │   Transcription Panel   │   │
│  │ ┌─────────────────────┐ │  │                         │   │
│  │ │ [1]▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪  │ │  │ [1] "In the beginning  │   │
│  │ │ ▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪  │ │  │      of the year..."   │   │
│  │ │                      │ │  │                         │   │
│  │ │ [2]▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪  │ │  │ [2] "The king ordered  │   │
│  │ │ ▪▪▪▪▪▪▪▪▪▪▪▪▪▪       │ │  │      his servants..."  │   │
│  │ └─────────────────────┘ │  │                         │   │
│  └─────────────────────────┘  └─────────────────────────┘   │
│                                                             │
│  Hover [1]: Shows .../50,100,400,80/max/0/default.jpg       │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Navigation and Viewing Optimization

### Intelligent Thumbnail Generation

Generate thumbnails appropriate to context using Image API capabilities.

**Functionality:**
- For Manifest navigation: use `sizes` from info.json if available
- For Range navigation: calculate region-specific thumbnails
- For search results: generate consistent dimensions across heterogeneous sources
- Respect server limits (`maxWidth`, `maxHeight`, `maxArea`)

**Decision logic:**

```
Generating thumbnail for Canvas:
├─ Check info.json for this image
│   ├─ Has sizes? → Use closest match to target
│   ├─ Has tiles? → Use appropriate tile
│   └─ Neither? → Request .../full/!200,200/0/default.jpg
├─ Check server profile
│   ├─ level0? → Must use declared sizes only
│   ├─ level1? → Can use w, or ,h
│   └─ level2? → Full flexibility
└─ Cache the info.json response for efficiency
```

**Visual affordance:**

```
┌─────────────────────────────────────────────────────┐
│  Thumbnail Settings                                 │
│                                                     │
│  Target size: [150] × [150] px                      │
│                                                     │
│  Strategy per image:                                │
│  ┌────────────────────────────────────────────┐     │
│  │ Image A (level2): .../full/!150,150/0/...  │     │
│  │ Image B (level0): .../full/150,100/0/...   │     │
│  │          (using declared size 150×100)     │     │
│  │ Image C (level1): .../full/150,/0/...      │     │
│  └────────────────────────────────────────────┘     │
│                                                     │
│  [Generate all] [Preview] [Apply to Manifest]       │
└─────────────────────────────────────────────────────┘
```

---

### Deep Zoom Integration

When viewing a Canvas, use Image API tiles for efficient deep zoom.

**Functionality:**
- Parse `tiles` from info.json
- Calculate tile requests for current viewport
- Progressive loading: show lower resolution immediately, refine
- Pan/zoom generates new tile requests dynamically

**Visual affordance:**

```
┌─────────────────────────────────────────────────────┐
│  Canvas Viewer                          [Zoom: 4x]  │
│  ┌─────────────────────────────────────────────┐    │
│  │ ┌─────┬─────┬─────┬─────┐                   │    │
│  │ │  ✓  │  ✓  │ ... │ ... │  ← Loaded tiles   │    │
│  │ ├─────┼─────┼─────┼─────┤                   │    │
│  │ │  ✓  │ [█] │ ... │ ... │  ← Current view   │    │
│  │ ├─────┼─────┼─────┼─────┤                   │    │
│  │ │ ... │ ... │ ... │ ... │                   │    │
│  │ └─────┴─────┴─────┴─────┘                   │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Tile requests:                                     │
│  .../0,0,512,512/512,/0/default.jpg ✓               │
│  .../512,0,512,512/512,/0/default.jpg ✓             │
│  .../0,512,512,512/512,/0/default.jpg (loading)     │
└─────────────────────────────────────────────────────┘
```

---

## 5. Comparison and Analysis

### Side-by-Side Comparison

Compare images or image regions using coordinated Image API requests.

**Functionality:**
- Select two or more Canvases/regions
- Synchronized pan/zoom across all views
- Apply same or different Image API parameters
- Useful for: manuscript variants, conservation states, related objects

**Visual affordance:**

```
┌─────────────────────────────────────────────────────────────┐
│  Comparison View                              [Sync: ON]    │
│  ┌───────────────────────┐  ┌───────────────────────┐       │
│  │ Manuscript A, f.12r   │  │ Manuscript B, f.8v    │       │
│  │ ┌───────────────────┐ │  │ ┌───────────────────┐ │       │
│  │ │                   │ │  │ │                   │ │       │
│  │ │    [Detail]       │ │  │ │    [Detail]       │ │       │
│  │ │                   │ │  │ │                   │ │       │
│  │ └───────────────────┘ │  │ └───────────────────┘ │       │
│  │ .../100,50,300,300/.. │  │ .../150,80,300,300/.. │       │
│  └───────────────────────┘  └───────────────────────┘       │
│                                                             │
│  Treatment: [Color ▼] [Color ▼]                             │
│             [Grayscale] [Bitonal] ← Apply different quality │
└─────────────────────────────────────────────────────────────┘
```

---

### Overlay/Difference View

Superimpose images for comparison using Image API transformations.

**Functionality:**
- Align two images on a shared Canvas coordinate space
- Toggle between: overlay, difference, swipe
- Adjust opacity, apply different quality parameters
- Export comparison as new Canvas with both images annotated

**Visual affordance:**

```
┌─────────────────────────────────────────────────────┐
│  Overlay Comparison                                 │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │        [Image A + Image B overlaid]         │    │
│  │                                             │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  Mode: ○ Overlay  ○ Difference  ● Swipe            │
│  ──────────────────●────────────────────            │
│                  swipe position                     │
│                                                     │
│  Image A opacity: ████████░░ 80%                    │
│  Image B opacity: ██████░░░░ 60%                    │
│                                                     │
│  [Save as composite Canvas]                         │
└─────────────────────────────────────────────────────┘
```

---

### Detail Extraction for Analysis

Extract and organize image regions for detailed study.

**Functionality:**
- Select multiple regions across multiple Canvases
- Each selection generates an Image API request
- Organize extractions into a new Collection/Manifest
- Add analytical annotations to extracted regions

**Visual affordance:**

```
┌─────────────────────────────────────────────────────────────┐
│  Detail Extraction: "Watermark Analysis"                    │
│                                                             │
│  Source Canvases:              Extracted Details:           │
│  ┌─────────────────────┐       ┌────┬────┬────┬────┐        │
│  │ [●] [●]             │       │    │    │    │    │        │
│  │      [●]            │  →    │ W1 │ W2 │ W3 │ W4 │        │
│  │           [●]       │       │    │    │    │    │        │
│  └─────────────────────┘       └────┴────┴────┴────┘        │
│                                                             │
│  Each extraction:                                           │
│  - Source: Canvas + region selector                         │
│  - Image: .../region/max/0/default.jpg                      │
│  - Becomes Canvas in new "Watermarks" Manifest              │
│                                                             │
│  [Add selection] [Generate Manifest] [Export images]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Authoring Workflows

### Image-to-Manifest Builder

Create IIIF structure from a set of images.

**Functionality:**
- Import images (local or via Image API URIs)
- Auto-detect dimensions (from info.json or file)
- Create Canvases with matching dimensions
- Generate painting Annotations
- Organize into Manifest with sensible defaults

**Visual affordance:**

```
┌─────────────────────────────────────────────────────────────┐
│  New Manifest from Images                                   │
│                                                             │
│  Images:                        Generated Structure:        │
│  ┌─────────────────────┐        ┌─────────────────────┐     │
│  │ [img1.jpg] 4000×3000│        │ Manifest            │     │
│  │ [img2.jpg] 4000×3000│   →    │ ├─ Canvas 1 (4000×3000)  │
│  │ [img3.jpg] 3000×4000│        │ ├─ Canvas 2 (4000×3000)  │
│  │ [service URL]       │        │ ├─ Canvas 3 (3000×4000)  │
│  └─────────────────────┘        │ └─ Canvas 4 (6000×4000)  │
│                                 └─────────────────────┘     │
│  Options:                                                   │
│  ☑ Generate thumbnails (.../full/!200,200/0/...)           │
│  ☑ Detect Image services (check for info.json)             │
│  ☐ Normalize Canvas dimensions                              │
│                                                             │
│  [Import more] [Configure Manifest metadata] [Create]       │
└─────────────────────────────────────────────────────────────┘
```

---

### Derivative Set Generation

Create multiple Image API derivatives for each Canvas in a Manifest.

**Functionality:**
- Define derivative specifications (size, quality, format)
- Apply across entire Manifest
- Generate URI list or download package
- Optionally create alternate Annotation bodies (Choice)

**Visual affordance:**

```
┌─────────────────────────────────────────────────────────────┐
│  Generate Derivatives for: "Field Survey 2024"              │
│                                                             │
│  Derivative Specs:                                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Name        Size        Quality   Format   Count    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ Thumbnail   !150,150    default   jpg      24       │    │
│  │ Preview     !800,800    default   jpg      24       │    │
│  │ Print       max         color     tif      24       │    │
│  │ Analysis    max         gray      png      24       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Output:                                                    │
│  ○ URI list (CSV)                                           │
│  ● Download package                                         │
│  ○ Add as Choice alternatives in Manifest                   │
│                                                             │
│  [Add derivative] [Preview URIs] [Generate]                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Publishing and Export

### Static Site Generation

Export a Collection/Manifest as a self-contained static package.

**Functionality:**
- Download all Image API derivatives needed for viewing
- Generate Manifest/Collection JSON with local references
- Include viewer (e.g., embedded UV or Mirador)
- Result: folder that works without server

**Visual affordance:**

```
┌─────────────────────────────────────────────────────────────┐
│  Export: "Archaeological Survey"                            │
│                                                             │
│  Include:                                                   │
│  ☑ Manifest JSON                                            │
│  ☑ All Canvas images                                        │
│     Size: ○ Original  ● Max 2000px  ○ Custom: [____]       │
│  ☑ Thumbnails (150px)                                       │
│  ☑ Embedded viewer                                          │
│  ☐ Source info.json files                                   │
│                                                             │
│  Estimated size: 245 MB                                     │
│  Image requests: 48 (24 full + 24 thumbnails)               │
│                                                             │
│  Output structure:                                          │
│  survey/                                                    │
│  ├─ index.html (viewer)                                     │
│  ├─ manifest.json                                           │
│  └─ images/                                                 │
│     ├─ canvas-1/full.jpg, thumb.jpg                         │
│     └─ ...                                                  │
│                                                             │
│  [Configure viewer] [Preview] [Export]                      │
└─────────────────────────────────────────────────────────────┘
```

---

### Service Configuration Helper

Help users configure Image API service references in their Manifests.

**Functionality:**
- Validate Image service URLs (fetch info.json)
- Show service capabilities
- Generate correct service block for Annotation body
- Detect version (ImageService2 vs ImageService3)

**Visual affordance:**

```
┌─────────────────────────────────────────────────────────────┐
│  Configure Image Service                                    │
│                                                             │
│  Service URL: [https://example.org/iiif/image1          ]   │
│  [Validate]                                                 │
│                                                             │
│  ✓ Valid ImageService3                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Profile: level2                                     │    │
│  │ Dimensions: 6000 × 4000                             │    │
│  │ Max size: 3000 × 2000                               │    │
│  │ Features: arbitrary rotation, mirroring             │    │
│  │ Formats: jpg, png, webp (preferred)                 │    │
│  │ Sizes: 150×100, 600×400, 3000×2000                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Generated service block:                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ {                                                   │    │
│  │   "id": "https://example.org/iiif/image1",          │    │
│  │   "type": "ImageService3",                          │    │
│  │   "profile": "level2"                               │    │
│  │ }                                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  [Copy] [Apply to selected Canvas] [Apply to all]           │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary: Combined Capabilities

| Category | Functionality | Presentation API Role | Image API Role |
|----------|---------------|----------------------|----------------|
| **Composition** | Multi-image Canvas | Coordinate space, Annotations | Sized/positioned content |
| **Navigation** | Smart thumbnails | Manifest/Range structure | Efficient size requests |
| **Structure** | Range detail views | Fragment references | Region extraction |
| **Annotation** | Derived content | Supplementing motivation | Quality/region transforms |
| **Analysis** | Comparison views | Canvas alignment | Synchronized requests |
| **Authoring** | Image-to-Manifest | Structure generation | Dimension detection |
| **Publishing** | Static export | JSON packaging | Derivative downloads |

The key insight: **Presentation API defines *what* and *where*; Image API defines *how* to get it.** The tool's power comes from making these relationships explicit and manipulable.