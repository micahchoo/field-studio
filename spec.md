
# IIIF Field Archive Studio — Technical Specification v3.0

## Executive Summary

IIIF Field Archive Studio is a local-first application that bridges the gap between unstructured field data and standards-compliant IIIF archives. It provides a visual, browser-based workbench where researchers can organize heterogeneous media, annotate content, map relationships, and export interoperable packages—all without writing code or managing servers.

The application operates through three conceptual layers:

1. **Convention Layer** — File-based organization using biiif naming patterns
2. **Semantic Layer** — IIIF resource model (Collections, Manifests, Canvases, Annotations)
3. **Output Layer** — Standards-compliant IIIF Presentation API 3.0 and Web Annotations

Users can work at any abstraction level, from simple drag-and-drop organization to direct IIIF property manipulation.

### What's New in v3.0

This revision incorporates findings from a comprehensive compliance evaluation against official IIIF specifications and lessons learned from existing ecosystem tools:

- **Full IIIF Specification Compliance** — Corrected all critical issues identified in the compliance evaluation
- **Complete Required Properties** — All JSON examples now include `@context`, `protocol`, and other mandatory fields
- **Comprehensive Behavior Values** — Full documentation of all behavior values and inheritance rules
- **Content State API Support** — Deep linking and bookmarking capabilities
- **Enhanced Validation** — Built-in validation using established validators
- **Improved Naming Convention Documentation** — Clear explanation of differences from biiif conventions

---

## Table of Contents

1. [Core Philosophy](#1-core-philosophy)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Model & IIIF Mapping](#3-data-model--iiif-mapping)
4. [User Interface Structure](#4-user-interface-structure)
5. [Workspace Modes](#5-workspace-modes)
6. [Interaction Patterns](#6-interaction-patterns)
7. [Convention System](#7-convention-system)
8. [IIIF Resource Generation](#8-iiif-resource-generation)
9. [Annotation System](#9-annotation-system)
10. [Board Canvas System](#10-board-canvas-system)
11. [Import & Ingest](#11-import--ingest)
12. [Export & Publishing](#12-export--publishing)
13. [Content State API](#13-content-state-api)
14. [Settings Architecture](#14-settings-architecture)
15. [Validation & Error Prevention](#15-validation--error-prevention)
16. [Accessibility](#16-accessibility)
17. [Technical Implementation](#17-technical-implementation)

---

## 1. Core Philosophy

### 1.1 Design Principles

**Local-First & Private**
- All data resides in browser storage (IndexedDB/FileSystem API)
- No server uploads required for core functionality
- Full offline operation for remote fieldwork
- Optional sync features clearly marked

**Convention Over Configuration**
- Sensible defaults derived from folder structure and naming
- Automatic IIIF generation from file organization
- Manual override available at every level

**Progressive Disclosure**
- Simple mode: Drag files, organize folders
- Standard mode: See and control naming conventions
- Advanced mode: Direct IIIF property manipulation

**Dual-Model Transparency**
- Always show both the file convention view and IIIF semantic view
- Users understand how their organization translates to standards
- Contextual education bridges knowledge gaps

**Specification Compliance**
- All output strictly follows IIIF Presentation API 3.0
- Web Annotations conform to W3C Web Annotation Data Model
- Built-in validation prevents non-compliant exports

### 1.2 Target Users

| User Type | Primary Needs | Mode |
|-----------|--------------|------|
| Field Researcher | Quick organization, offline work, photo management | Simple |
| Digital Archivist | Metadata standards, controlled vocabularies, batch operations | Standard |
| IIIF Developer | Custom annotations, complex structures, API integration | Advanced |
| Cultural Heritage Staff | Publication, accessibility, long-term preservation | Standard/Advanced |

---

## 2. Architecture Overview

### 2.1 System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                     User Interface Layer                        │
│  ┌─────────┐ ┌─────────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Archive │ │ Collections │ │ Boards │ │ Viewer │ │ Search │  │
│  └─────────┘ └─────────────┘ └────────┘ └────────┘ └────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Convention Engine                            │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────┐  │
│  │ Name Parser   │ │ Structure     │ │ YAML Processor        │  │
│  │               │ │ Analyzer      │ │                       │  │
│  └───────────────┘ └───────────────┘ └───────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    IIIF Generation Layer                        │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────┐  │
│  │ Manifest      │ │ Canvas        │ │ Annotation            │  │
│  │ Builder       │ │ Builder       │ │ Builder               │  │
│  └───────────────┘ └───────────────┘ └───────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Validation Layer                             │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────┐  │
│  │ IIIF          │ │ JSON-LD       │ │ Web Annotation        │  │
│  │ Validator     │ │ Validator     │ │ Validator             │  │
│  └───────────────┘ └───────────────┘ └───────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Service Layer                                │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────────────┐  │
│  │ Image API     │ │ Storage       │ │ AI Integration        │  │
│  │ (Local)       │ │ (IndexedDB)   │ │ (Ollama)              │  │
│  └───────────────┘ └───────────────┘ └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

```
User Action                Convention Engine              IIIF Output
─────────────             ─────────────────              ───────────
                                                         
Drop folder        →      Analyze structure      →       Generate Collection
Rename folder      →      Parse convention       →       Update Manifest type
Add metadata       →      Write info.yml         →       Populate IIIF properties
Draw annotation    →      Create annotation.yml  →       W3C Web Annotation
Export             →      Validate structure     →       IIIF Presentation 3.0
```

---

## 3. Data Model & IIIF Mapping

### 3.1 Resource Type Hierarchy

```
Project (root)
├── Collection (folder with underscore prefix: _name)
│   ├── Collection (nested _name folders)
│   └── Manifest (folder without underscore: name)
│       ├── Canvas (image file or subfolder)
│       │   ├── Content Resource (image, audio, video)
│       │   └── Annotation (*.yml files)
│       └── Range (defined in info.yml or structures/)
└── Manifest (top-level folder without underscore)
```

### 3.2 Convention-to-IIIF Mapping

| File/Folder Pattern | IIIF Resource Type | Example |
|---------------------|-------------------|---------|
| `_name/` | Collection | `_2023_Field_Season/` |
| `name/` (contains images) | Manifest | `manuscript_001/` |
| `name/` (contains only folders) | Collection | `site_photos/` |
| `image.jpg` | Canvas + painting Annotation | `page_001.jpg` |
| `image.jpg` + `image.txt` | Canvas with supplementing text | Transcription pair |
| `folder/` inside Manifest | Canvas (multi-resource) | `spread_01/` |
| `info.yml` | Manifest/Canvas metadata | Dublin Core fields |
| `*.annotation.yml` | Web Annotation | Comments, links |
| `+tiles/` | Pre-generated IIIF tiles | Image API assets |
| `!folder/` | Excluded from processing | Working files |

**Note on Convention Differences:** This application uses underscore prefix (`_name`) for Collections, which differs from the biiif tool that uses underscore prefix for Canvases. This convention was chosen because Collections represent organizational groupings, making the underscore a natural visual separator.

### 3.3 IIIF Resource Structures

All IIIF resources follow the [IIIF Presentation API 3.0](https://iiif.io/api/presentation/3.0/) specification with strict compliance to required properties.

#### Collection Structure (Complete Example)

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/iiif/collection/2023-field-season",
  "type": "Collection",
  "label": { "en": ["2023 Field Season"] },
  "summary": { "en": ["Materials from the 2023 excavation at Site A."] },
  "metadata": [
    {
      "label": { "en": ["Project Director"] },
      "value": { "en": ["Dr. Jane Smith"] }
    },
    {
      "label": { "en": ["Date Range"] },
      "value": { "en": ["June - August 2023"] }
    }
  ],
  "requiredStatement": {
    "label": { "en": ["Attribution"] },
    "value": { "en": ["Provided by Example Institution under CC BY 4.0"] }
  },
  "rights": "http://creativecommons.org/licenses/by/4.0/",
  "provider": [
    {
      "id": "https://example.org/about",
      "type": "Agent",
      "label": { "en": ["Example Institution"] },
      "homepage": [
        {
          "id": "https://example.org/",
          "type": "Text",
          "label": { "en": ["Example Institution Homepage"] },
          "format": "text/html"
        }
      ],
      "logo": [
        {
          "id": "https://example.org/logo.png",
          "type": "Image",
          "format": "image/png"
        }
      ]
    }
  ],
  "homepage": [
    {
      "id": "https://example.org/collections/2023-field-season",
      "type": "Text",
      "label": { "en": ["Collection Homepage"] },
      "format": "text/html"
    }
  ],
  "items": [
    {
      "id": "https://example.org/iiif/manifest/site-a",
      "type": "Manifest",
      "label": { "en": ["Site A Documentation"] },
      "thumbnail": [
        {
          "id": "https://example.org/iiif/image/site-a-thumb/full/100,/0/default.jpg",
          "type": "Image",
          "format": "image/jpeg"
        }
      ]
    },
    {
      "id": "https://example.org/iiif/collection/finds",
      "type": "Collection",
      "label": { "en": ["Archaeological Finds"] }
    }
  ]
}
```

**Required Properties for Collection:**
- `@context` — Must be first property
- `id` — Globally unique URI
- `type` — Must be "Collection"
- `label` — Language map with array values
- `items` — Array of Manifests and/or Collections (may be empty)

#### Manifest Structure (Complete Example)

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/iiif/manifest/manuscript-001",
  "type": "Manifest",
  "label": { "en": ["Archaeological Survey Site A"] },
  "summary": { "en": ["Photographs from the 2023 excavation season at Site A, documenting ceramic finds and architectural features."] },
  "metadata": [
    {
      "label": { "en": ["Creator"] },
      "value": { "en": ["Jane Researcher"] }
    },
    {
      "label": { "en": ["Date"] },
      "value": { "en": ["2023-06-15"] }
    },
    {
      "label": { "en": ["Subject"] },
      "value": { "en": ["Archaeology", "Ceramics", "Architecture"] }
    }
  ],
  "requiredStatement": {
    "label": { "en": ["Attribution"] },
    "value": { "en": ["Provided by Example Institution"] }
  },
  "rights": "http://creativecommons.org/licenses/by/4.0/",
  "navDate": "2023-06-15T00:00:00Z",
  "provider": [
    {
      "id": "https://example.org/about",
      "type": "Agent",
      "label": { "en": ["Example Institution"] }
    }
  ],
  "homepage": [
    {
      "id": "https://example.org/objects/manuscript-001",
      "type": "Text",
      "label": { "en": ["Object Record"] },
      "format": "text/html"
    }
  ],
  "seeAlso": [
    {
      "id": "https://example.org/api/objects/manuscript-001.json",
      "type": "Dataset",
      "format": "application/json",
      "profile": "https://example.org/profiles/object-record"
    }
  ],
  "rendering": [
    {
      "id": "https://example.org/objects/manuscript-001.pdf",
      "type": "Text",
      "label": { "en": ["PDF Version"] },
      "format": "application/pdf"
    }
  ],
  "viewingDirection": "left-to-right",
  "behavior": ["paged"],
  "service": [
    {
      "id": "https://example.org/search/manuscript-001",
      "type": "SearchService2"
    }
  ],
  "items": [
    {
      "id": "https://example.org/iiif/manifest/manuscript-001/canvas/p1",
      "type": "Canvas",
      "label": { "none": ["p. 1"] },
      "height": 4000,
      "width": 3000,
      "thumbnail": [
        {
          "id": "https://example.org/iiif/image/page1/full/100,/0/default.jpg",
          "type": "Image",
          "format": "image/jpeg",
          "height": 133,
          "width": 100
        }
      ],
      "items": [
        {
          "id": "https://example.org/iiif/manifest/manuscript-001/canvas/p1/page/1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://example.org/iiif/manifest/manuscript-001/canvas/p1/annotation/1",
              "type": "Annotation",
              "motivation": "painting",
              "body": {
                "id": "https://example.org/iiif/image/page1/full/max/0/default.jpg",
                "type": "Image",
                "format": "image/jpeg",
                "height": 4000,
                "width": 3000,
                "service": [
                  {
                    "id": "https://example.org/iiif/image/page1",
                    "type": "ImageService3",
                    "profile": "level2"
                  }
                ]
              },
              "target": "https://example.org/iiif/manifest/manuscript-001/canvas/p1"
            }
          ]
        }
      ],
      "annotations": [
        {
          "id": "https://example.org/iiif/manifest/manuscript-001/canvas/p1/annotations/1",
          "type": "AnnotationPage"
        }
      ]
    }
  ],
  "structures": [
    {
      "id": "https://example.org/iiif/manifest/manuscript-001/range/toc",
      "type": "Range",
      "label": { "en": ["Table of Contents"] },
      "items": [
        {
          "id": "https://example.org/iiif/manifest/manuscript-001/range/chapter1",
          "type": "Range",
          "label": { "en": ["Introduction"] },
          "items": [
            {
              "id": "https://example.org/iiif/manifest/manuscript-001/canvas/p1",
              "type": "Canvas"
            }
          ]
        }
      ]
    }
  ]
}
```

**Required Properties for Manifest:**
- `@context` — Must be first property
- `id` — Globally unique URI
- `type` — Must be "Manifest"
- `label` — Language map with array values
- `items` — Array with at least one Canvas

#### Canvas Dimension Rules

Per IIIF Presentation API 3.0:
- A Canvas MAY have `height` and `width` for spatial content
- A Canvas MAY have `duration` for temporal content
- **If a Canvas has `height`, it MUST also have `width` (and vice versa)**
- A Canvas can have both spatial and temporal dimensions (for video)

```json
{
  "id": "https://example.org/canvas/1",
  "type": "Canvas",
  "label": { "none": ["Video with overlay"] },
  "height": 1080,
  "width": 1920,
  "duration": 300.5,
  "items": [...]
}
```

#### Canvas Items vs Annotations

**Critical Distinction:**

`Canvas.items` contains AnnotationPages with `painting` motivation Annotations (content OF the Canvas):
```json
{
  "type": "Canvas",
  "items": [
    {
      "type": "AnnotationPage",
      "items": [
        {
          "type": "Annotation",
          "motivation": "painting",
          "body": { "id": "image.jpg", "type": "Image" },
          "target": "canvas_uri"
        }
      ]
    }
  ]
}
```

`Canvas.annotations` contains references to AnnotationPages with non-painting Annotations (content ABOUT the Canvas):
```json
{
  "type": "Canvas",
  "annotations": [
    {
      "id": "https://example.org/canvas/1/annotations/1",
      "type": "AnnotationPage"
    }
  ]
}
```

### 3.4 Behavior Values (Complete Reference)

The `behavior` property affects how clients render resources. Values are inherited with specific rules.

**Layout Behaviors:**
| Value | Description | Valid On |
|-------|-------------|----------|
| `unordered` | No inherent order to items | Collection, Manifest, Range |
| `individuals` | Distinct views, no page-turning (DEFAULT) | Collection, Manifest, Range |
| `continuous` | Items virtually stitched together | Collection, Manifest, Range |
| `paged` | Page-turning interface | Collection, Manifest, Range |

**Temporal Behaviors:**
| Value | Description | Valid On |
|-------|-------------|----------|
| `auto-advance` | Proceed to next Canvas automatically | Collection, Manifest, Range |
| `no-auto-advance` | Don't auto-advance (DEFAULT) | Collection, Manifest, Range |
| `repeat` | Loop back to beginning | Collection, Manifest |
| `no-repeat` | Don't loop (DEFAULT) | Collection, Manifest |

**Canvas-specific Behaviors:**
| Value | Description | Valid On |
|-------|-------------|----------|
| `facing-pages` | Canvas shows both pages of opening | Canvas |
| `non-paged` | Skip in page-turning interface | Canvas |

**Collection-specific Behaviors:**
| Value | Description | Valid On |
|-------|-------------|----------|
| `multi-part` | Logical whole across multiple Manifests | Collection |
| `together` | Show all children simultaneously | Collection |

**Range-specific Behaviors:**
| Value | Description | Valid On |
|-------|-------------|----------|
| `sequence` | Alternative ordering | Range |
| `thumbnail-nav` | Thumbnail-based navigation | Range |
| `no-nav` | Don't show in navigation | Range |

**Miscellaneous:**
| Value | Description | Valid On |
|-------|-------------|----------|
| `hidden` | Don't render by default | AnnotationPage, AnnotationCollection, Range |

**Behavior Inheritance Rules:**
- Collections inherit from parent Collection
- **Manifests DO NOT inherit from Collections**
- Canvases inherit from Manifest, NOT from Ranges
- Ranges inherit from parent Range and Manifest

### 3.5 Viewing Direction

| Value | Description | Use Case |
|-------|-------------|----------|
| `left-to-right` | Western reading order (DEFAULT) | Books, manuscripts |
| `right-to-left` | Hebrew, Arabic, manga | RTL scripts |
| `top-to-bottom` | Traditional CJK | Scrolls, vertical text |
| `bottom-to-top` | Rare/specialized | Specific presentation needs |

### 3.6 Range Structure

Ranges provide navigational structure (table of contents). They can reference whole Canvases, parts of Canvases, or other Ranges.

```json
{
  "id": "https://example.org/iiif/book1/range/chapter1",
  "type": "Range",
  "label": { "en": ["Chapter 1: Introduction"] },
  "items": [
    {
      "id": "https://example.org/iiif/book1/canvas/p1",
      "type": "Canvas"
    },
    {
      "type": "SpecificResource",
      "source": "https://example.org/iiif/book1/canvas/p2",
      "selector": {
        "type": "FragmentSelector",
        "value": "xywh=0,0,750,300"
      }
    },
    {
      "id": "https://example.org/iiif/book1/range/section1-1",
      "type": "Range",
      "label": { "en": ["Section 1.1"] },
      "items": [...]
    }
  ]
}
```

**Important:** The `structures` property belongs on the Manifest, not on Canvas or Range:

```json
{
  "type": "Manifest",
  "structures": [
    {
      "id": "https://example.org/manifest/range/toc",
      "type": "Range",
      "label": { "en": ["Table of Contents"] },
      "items": [...]
    }
  ]
}
```

### 3.7 Annotation Motivation Mapping

| Motivation | Convention File | Use Case |
|------------|----------------|----------|
| `painting` | Image/video/audio in canvas folder | Primary content OF Canvas |
| `supplementing` | `{name}.txt` paired with `{name}.jpg` | Transcription, translation |
| `commenting` | `*.comment.yml` | User commentary |
| `tagging` | `tags` field in info.yml | Classification keywords |
| `linking` | `*.link.yml` | Cross-references |
| `describing` | `description` field | Resource description |
| `identifying` | `*.identify.yml` | "This depicts X" |
| `highlighting` | `*.highlight.yml` | Visual emphasis |
| `bookmarking` | `*.bookmark.yml` | Navigation markers |

---

## 4. User Interface Structure

### 4.1 Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Menu Bar                                          [User] [Settings]│
│  File  Edit  View  Tools  Help                                      │
├────────────┬────────────────────────────────────────┬───────────────┤
│            │  Breadcrumb: 🏠 > _2023 > Site_A >    │               │
│  Sidebar   │                                        │  Inspector    │
│            ├────────────────────────────────────────┤               │
│  [Archive] │                                        │  ┌─────────┐  │
│  [Collect] │      Main Workspace                    │  │ Preview │  │
│  [Boards]  │                                        │  └─────────┘  │
│  [Search]  │      (content varies by mode)          │               │
│            │                                        │  Metadata     │
│ ─────────  │                                        │  ──────────   │
│ Navigation │                                        │  Title: ___   │
│ Tree       │                                        │  Creator: ___ │
│            │                                        │  Date: ___    │
│ _2023      │                                        │               │
│  └─Site_A  │                                        │  Annotations  │
│    └─img01 │                                        │  ──────────   │
│            │                                        │  [+ Add]      │
├────────────┴────────────────────────────────────────┴───────────────┤
│  Status: 156 items • Last saved 2 min ago • IIIF Valid ✓           │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Panel Specifications

**Left Sidebar (Navigation)**
- Width: 240px default, resizable 180-400px
- Collapsible: `Cmd+B`
- Contains: Mode switcher, navigation tree, quick filters
- Behavior: Scrolls independently, remembers expansion state

**Main Workspace**
- Flexible width: fills remaining space
- Content: Mode-specific (grid, canvas, editor, viewer)
- Toolbar: Context-sensitive, appears above workspace

**Right Inspector**
- Width: 320px default, resizable 280-480px
- Collapsible: `Cmd+I`
- Contains: Preview, metadata editor, annotations, properties
- Behavior: Updates based on selection

**Status Bar**
- Height: 24px fixed
- Contains: Item count, selection info, save status, validation status
- Actions: Click elements for details

### 4.3 Dual-View Toggle

A persistent toggle allows switching between convention view and IIIF view:

```
┌─────────────────────────────────────┐
│  View:  [📁 Files] [🏛️ IIIF]       │
└─────────────────────────────────────┘

Files View:                    IIIF View:
_2023_Field_Season/           Collection: "2023 Field Season"
├── Site_A/                   └── Manifest: "Site A"
│   ├── photo_001.jpg             ├── Canvas: "photo_001"
│   ├── photo_001.txt             │   ├── painting: photo_001.jpg
│   └── info.yml                  │   └── supplementing: transcription
└── Site_B/                   └── Manifest: "Site B"
```

---

## 5. Workspace Modes

### 5.1 Archive Mode

**Purpose**: Import, organize, and tag raw materials

**Interface**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Archive                              [Import] [New Folder]     │
├─────────────────────────────────────────────────────────────────┤
│  View: [Grid ▼]  Sort: [Date Added ▼]  Filter: [All Types ▼]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │               │
│  │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │ │ ░░░░░░░ │               │
│  │ IMG_001 │ │ IMG_002 │ │ IMG_003 │ │ IMG_004 │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │ 🎵      │ │ 📄      │ │ 🎬      │ │ ░░░░░░░ │               │
│  │         │ │         │ │         │ │ ░░░░░░░ │               │
│  │ audio01 │ │ notes   │ │ video01 │ │ IMG_005 │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features**:
- Grid view with adjustable thumbnail size
- List view with sortable columns
- Map view for geotagged items
- Timeline view ordered by navDate
- Multi-select with batch operations
- Quick-tag panel
- Drag to create structure

**Supported Content Types**:

| Type | Formats | IIIF `type` | Icon |
|------|---------|-------------|------|
| Images | TIFF, JPEG, PNG, WebP, HEIC | `Image` | 🖼️ |
| Documents | PDF (as image sequence) | `Image` | 📄 |
| Audio | MP3, WAV, FLAC, OGG | `Sound` | 🎵 |
| Video | MP4, WebM, MOV | `Video` | 🎬 |
| Text | TXT, MD, RTF | `Text` | 📝 |
| Data | JSON, XML, CSV | `Dataset` | 📊 |

### 5.2 Collections Mode

**Purpose**: Organize materials into IIIF-compliant structures

**Interface**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Collections                    [New Collection] [New Manifest] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  _2023_Field_Season (Collection)              [⋮]        │   │
│  │  ├── Site_A (Manifest)                        [⋮]        │   │
│  │  │   ├── Canvas: photo_001                               │   │
│  │  │   ├── Canvas: photo_002                               │   │
│  │  │   └── Canvas: photo_003                               │   │
│  │  ├── Site_B (Manifest)                        [⋮]        │   │
│  │  │   └── (drag items here)                               │   │
│  │  └── _Finds (Collection)                      [⋮]        │   │
│  │      ├── Ceramics (Manifest)                             │   │
│  │      └── Metal (Manifest)                                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  IIIF Preview:                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  {"@context": "http://iiif.io/api/presentation/3/...",   │   │
│  │   "type": "Collection",                                  │   │
│  │   "label": {"en": ["2023 Field Season"]},                │   │
│  │   "items": [...]}                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Features**:
- Drag-and-drop hierarchy building
- Live IIIF preview panel
- Metadata inheritance visualization
- Range builder for table of contents
- Canvas reordering
- Bulk metadata editing
- Manifest viewer preview (embedded Mirador/UV)

### 5.3 Boards Mode

**Purpose**: Spatial relationship mapping using Web Annotations

**Interface**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Board: Manuscript Connections              [Share] [Export]    │
├─────────────────────────────────────────────────────────────────┤
│  Tools: [↖️] [▭] [⟋] [💬] [🔗]     Zoom: [−] 100% [+] [Fit]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌─────────────┐                      ┌─────────────┐         │
│    │  Manuscript │ ─────────────────────│  Translation│         │
│    │     A       │    "transcribes"     │             │         │
│    └─────────────┘                      └─────────────┘         │
│           │                                                     │
│           │ "depicts"                                           │
│           ▼                                                     │
│    ┌─────────────┐         ┌─────────────┐                      │
│    │   Photo     │         │   Note      │                      │
│    │   of scene  │         │  "Compare   │                      │
│    └─────────────┘         │   style"    │                      │
│                            └─────────────┘                      │
│                                                     ┌────────┐  │
│                                                     │Minimap │  │
│                                                     │ ▓░░░░░ │  │
│                                                     └────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

See [Section 10](#10-board-canvas-system) for detailed board system documentation.

### 5.4 Viewer Mode

**Purpose**: Deep inspection and annotation of individual items

**Interface**:
```
┌─────────────────────────────────────────────────────────────────┐
│  Viewer: manuscript_page_001.jpg         [Annotate] [Compare]   │
├─────────────────────────────────────────────────────────────────┤
│  [−] [+] [🏠] [🔄 90°] [⛶ Fullscreen]    Tools: [▭] [○] [✏️]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│       ┌─────────────────────────────────────────────┐           │
│       │                                             │           │
│       │              High-res image                 │           │
│       │              with deep zoom                 │           │
│       │                                             │           │
│       │         ┌───────────┐                       │           │
│       │         │ [Annotation marker]              │           │
│       │         └───────────┘                       │           │
│       │                                             │           │
│       └─────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────┐  Thumbnail strip:                                 │
│  │ ░░░░░░░░ │  [1] [2] [3] [4] [5] [6] [7] [8] →               │
│  └──────────┘                                                   │
│   Navigator                                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Viewer Capabilities**:
- OpenSeadragon-based deep zoom (IIIF Image API 3.0)
- Audio waveform display with playback
- Video player with frame-accurate navigation
- PDF page navigation (each page as Canvas)
- Side-by-side comparison (synced pan/zoom)
- Overlay comparison (opacity slider, difference mode)
- Light table mode for multiple Canvases

### 5.5 Search Mode

**Purpose**: Find and filter content across the archive

See [Section 8.3](#83-content-search-api-20) for search API implementation.

---

## 6. Interaction Patterns

### 6.1 Drag-and-Drop Matrix

| Source | Target | Result | Feedback |
|--------|--------|--------|----------|
| External files | Archive | Import | Upload progress |
| Archive item | Collection | Add to collection | Ghost + drop zone |
| Archive item | Board | Place on board | Position preview |
| Archive item | Another item | Create canvas set | "Link" indicator |
| Collection | Collection | Nest or reorder | Insert line |
| Board item | Board item | Create connection | Bezier preview |
| Item | Trash zone | Delete | Expand + red glow |
| External URL | Archive | Import IIIF manifest | Fetch + validate |

### 6.2 Multi-Select

| Method | Action |
|--------|--------|
| Click | Select one, deselect others |
| `Cmd+Click` | Toggle selection |
| `Shift+Click` | Range select |
| Marquee drag | Select in rectangle |
| `Cmd+A` | Select all visible |

### 6.3 Inline Metadata Editing

Fields edit in-place without modal dialogs:

```
View mode:           Hover:               Edit mode:
Title: Field Notes   Title: Field Notes ✏️  Title: [Field Notes___]
                                            [✓ Save] [× Cancel]
```

### 6.4 Command Palette

Activated with `Cmd+K` for quick access to all commands.

---

## 7. Convention System

### 7.1 Folder Naming Conventions

**Collection vs Manifest Determination**:
```
_underscore_prefix → Collection
no_underscore      → Manifest (if contains images)
no_underscore      → Collection (if contains only folders)
```

**Reserved Prefixes**:
- `_` — Collection marker
- `+` — System folders (e.g., `+tiles/`)
- `!` — Excluded from processing

### 7.2 info.yml Structure

```yaml
# Manifest-level info.yml
label: "Archaeological Survey Site A"
summary: "Photographs from the 2023 excavation season"
metadata:
  Creator: "Jane Researcher"
  Date: "2023-06-15"
  Subject: "Archaeology, Ceramics"
rights: "http://creativecommons.org/licenses/by/4.0/"
requiredStatement:
  label: "Attribution"
  value: "Provided by Example Institution"
behavior:
  - paged
viewingDirection: left-to-right
navDate: "2023-06-15T00:00:00Z"

# Provider information
provider:
  id: "https://example.org/about"
  label: "Example Institution"
  homepage: "https://example.org/"

# Related resources
homepage:
  id: "https://example.org/objects/site-a"
  label: "Object Record"
rendering:
  - id: "https://example.org/objects/site-a.pdf"
    label: "PDF Version"
    format: "application/pdf"
seeAlso:
  - id: "https://example.org/api/objects/site-a.json"
    format: "application/json"

# Canvas ordering (optional, defaults to filesystem order)
sequence:
  - page_001.jpg
  - page_002.jpg
  - page_003.jpg

# Ranges for table of contents
structures:
  - label: "Introduction"
    items:
      - page_001.jpg
      - page_002.jpg
  - label: "Chapter 1"
    items:
      - page_003.jpg
```

### 7.3 Annotation YAML Files

**Comment annotation** (`photo_001.comment.yml`):
```yaml
motivation: commenting
target:
  selector: "xywh=100,200,300,150"
body:
  type: TextualBody
  value: "Notice the unusual firing pattern here"
  format: text/plain
  language: en
creator:
  name: "Jane Researcher"
created: "2024-01-15T10:30:00Z"
```

**Linking annotation with multiple targets** (`photo_001.link.yml`):
```yaml
motivation: linking
target:
  - source: photo_001.jpg
    selector: "xywh=100,100,200,200"
    purpose: identifying
  - source: ../Site_B/photo_042.jpg
    selector: "xywh=300,150,250,180"
    purpose: identifying
body:
  type: TextualBody
  value: "Same vessel type identified in both contexts"
```

### 7.4 External Manifest References

**manifests.yml** (in Collection folder):
```yaml
# Link external IIIF manifests into this collection
- uri: "https://example.org/iiif/manifest/external-1"
  label: "Related Manuscript from Partner Institution"
- uri: "https://iiif.example.edu/item/12345/manifest"
  label: "Comparative Example"
```

---

## 8. IIIF Resource Generation

### 8.1 Image API 3.0

The application runs a local IIIF Image API 3.0 compliant server via Service Worker.

**URI Template**:
```
{scheme}://{server}{/prefix}/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

**Parameter Reference**:

| Parameter | Values | Description |
|-----------|--------|-------------|
| Region | `full` | Full image |
| | `square` | Square region from center |
| | `x,y,w,h` | Pixels from top-left |
| | `pct:x,y,w,h` | Percentages |
| Size | `max` | Maximum size without upscaling |
| | `^max` | Maximum size with upscaling |
| | `w,` | Width (height calculated) |
| | `,h` | Height (width calculated) |
| | `pct:n` | Percentage |
| | `w,h` | Exact dimensions |
| | `!w,h` | Best fit within dimensions |
| | `^w,h` | Exact with upscaling |
| Rotation | `0`, `90`, `180`, `270` | Degrees clockwise |
| | `!0`, `!90`, etc. | Mirror then rotate |
| Quality | `default` | Server's default |
| | `color` | Full color |
| | `gray` | Grayscale |
| | `bitonal` | Black and white |

**Order of Operations**: Region → Size → Rotation → Quality → Format

**info.json (Complete Example)**:
```json
{
  "@context": "http://iiif.io/api/image/3/context.json",
  "id": "https://example.org/iiif/image/page001",
  "type": "ImageService3",
  "protocol": "http://iiif.io/api/image",
  "profile": "level2",
  "width": 6000,
  "height": 4000,
  "tiles": [
    {
      "width": 512,
      "scaleFactors": [1, 2, 4, 8, 16]
    }
  ],
  "sizes": [
    { "width": 150, "height": 100 },
    { "width": 600, "height": 400 },
    { "width": 1200, "height": 800 }
  ],
  "extraQualities": ["gray", "bitonal"],
  "extraFormats": ["webp", "png"]
}
```

**Required info.json Properties:**
- `@context` — Must be "http://iiif.io/api/image/3/context.json"
- `id` — Base URI for this image
- `type` — Must be "ImageService3"
- `protocol` — Must be "http://iiif.io/api/image"
- `profile` — "level0", "level1", or "level2"
- `width` — Pixel width of full image
- `height` — Pixel height of full image

### 8.2 Presentation API 3.0 Generation

**Build Process**:
1. Walk folder structure
2. Apply naming conventions to determine types
3. Read info.yml files for metadata
4. Process annotation YAML files
5. Generate Canvas dimensions from images
6. Assemble Manifest/Collection JSON-LD
7. **Validate against IIIF Presentation Validator**

**ID Generation Strategy**:
```
Base URI: https://example.org/iiif

Collection: {base}/collection/{path_hash}
Manifest:   {base}/manifest/{path_hash}
Canvas:     {manifest}/canvas/{index}
Annotation: {canvas}/annotation/{index}
AnnotationPage: {canvas}/page/{index}
Range:      {manifest}/range/{index}
```

### 8.3 Content Search API 2.0

**Service Declaration in Manifest**:
```json
{
  "service": [
    {
      "id": "https://example.org/search/manifest1",
      "type": "SearchService2",
      "service": [
        {
          "id": "https://example.org/autocomplete/manifest1",
          "type": "AutoCompleteService2"
        }
      ]
    }
  ]
}
```

**Query Parameters**:
- `q` — Search terms (REQUIRED to support)
- `motivation` — Filter by motivation
- `date` — Filter by date
- `user` — Filter by creator

**Example Query**:
```
GET /search/manifest1?q=ceramic&motivation=supplementing
```

**Response Structure**:
```json
{
  "@context": "http://iiif.io/api/search/2/context.json",
  "id": "https://example.org/search/manifest1?q=ceramic",
  "type": "AnnotationPage",
  "items": [
    {
      "id": "https://example.org/annotation/1",
      "type": "Annotation",
      "motivation": "supplementing",
      "body": {
        "type": "TextualBody",
        "value": "...ceramic vessel fragment found in context 42...",
        "format": "text/plain"
      },
      "target": "https://example.org/canvas/1#xywh=100,200,300,50"
    }
  ]
}
```

---

## 9. Annotation System

### 9.1 W3C Web Annotation Data Model

All annotations follow the [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/):

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "https://example.org/annotation/1",
  "type": "Annotation",
  "motivation": "commenting",
  "created": "2024-01-15T12:00:00Z",
  "modified": "2024-01-16T09:30:00Z",
  "creator": {
    "id": "https://example.org/users/researcher1",
    "type": "Person",
    "name": "Jane Researcher",
    "nickname": "jresearcher"
  },
  "body": {
    "type": "TextualBody",
    "value": "This appears to be a later addition to the manuscript.",
    "format": "text/plain",
    "language": "en"
  },
  "target": {
    "type": "SpecificResource",
    "source": "https://example.org/iiif/book1/canvas/p1",
    "selector": {
      "type": "FragmentSelector",
      "conformsTo": "http://www.w3.org/TR/media-frags/",
      "value": "xywh=100,200,300,150"
    }
  }
}
```

### 9.2 Target Patterns

**Whole Canvas (simple form)**:
```json
{
  "target": "https://example.org/iiif/book1/canvas/p1"
}
```

**Region of Canvas (SpecificResource)**:
```json
{
  "target": {
    "type": "SpecificResource",
    "source": "https://example.org/iiif/book1/canvas/p1",
    "selector": {
      "type": "FragmentSelector",
      "conformsTo": "http://www.w3.org/TR/media-frags/",
      "value": "xywh=100,200,300,150"
    }
  }
}
```

**Multiple Targets (for linking)**:
```json
{
  "target": [
    {
      "type": "SpecificResource",
      "source": "https://example.org/canvas/1",
      "selector": { "type": "FragmentSelector", "value": "xywh=100,100,200,200" },
      "purpose": "identifying"
    },
    {
      "type": "SpecificResource",
      "source": "https://example.org/canvas/2",
      "selector": { "type": "FragmentSelector", "value": "xywh=300,150,250,180" },
      "purpose": "identifying"
    }
  ]
}
```

### 9.3 Selector Types

**FragmentSelector (spatial, pixels)**:
```json
{ "type": "FragmentSelector", "value": "xywh=100,100,200,150" }
```

**FragmentSelector (spatial, percentage)**:
```json
{ "type": "FragmentSelector", "value": "xywh=percent:10,10,20,15" }
```

**FragmentSelector (temporal)**:
```json
{ "type": "FragmentSelector", "value": "t=30.5,60.0" }
```

**FragmentSelector (combined spatial + temporal)**:
```json
{ "type": "FragmentSelector", "value": "xywh=100,100,200,150&t=10,20" }
```

**SvgSelector (polygon)**:
```json
{
  "type": "SvgSelector",
  "value": "<svg xmlns='http://www.w3.org/2000/svg'><polygon points='100,100 150,50 200,100 175,150 125,150'/></svg>"
}
```

**PointSelector**:
```json
{ "type": "PointSelector", "x": 150, "y": 200 }
```

### 9.4 Body Types

**TextualBody**:
```json
{
  "type": "TextualBody",
  "value": "Annotation content here",
  "format": "text/plain",
  "language": "en"
}
```

**Choice (multiple alternatives)**:
```json
{
  "type": "Choice",
  "items": [
    { "type": "TextualBody", "value": "Incipit liber primus", "language": "la" },
    { "type": "TextualBody", "value": "Here begins the first book", "language": "en" }
  ]
}
```

**External Resource**:
```json
{
  "id": "https://example.org/vocabulary/ceramic-type-a",
  "type": "SpecificResource",
  "source": "https://example.org/vocabularies/ceramic-types"
}
```

### 9.5 timeMode for AV Content

For audio/video annotations, the `timeMode` property controls how content fills the Canvas duration:

| Value | Description |
|-------|-------------|
| `trim` | Cut content at Canvas end (DEFAULT) |
| `scale` | Stretch/compress to fit |
| `loop` | Repeat to fill duration |

```json
{
  "type": "Annotation",
  "motivation": "painting",
  "timeMode": "loop",
  "body": { "id": "audio.mp3", "type": "Sound", "duration": 30 },
  "target": "canvas_uri"
}
```

---

## 10. Board Canvas System

### 10.1 Board Data Model

Each board is a Manifest with a single large Canvas:

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/board/1",
  "type": "Manifest",
  "label": { "en": ["Research Board: Manuscript Connections"] },
  "items": [{
    "id": "https://example.org/board/1/canvas/1",
    "type": "Canvas",
    "width": 10000,
    "height": 10000,
    "items": [{
      "id": "https://example.org/board/1/canvas/1/page/1",
      "type": "AnnotationPage",
      "items": []
    }],
    "annotations": [{
      "id": "https://example.org/board/1/annotations/1",
      "type": "AnnotationPage"
    }]
  }]
}
```

### 10.2 Connection Annotation Structure

Connections between items use `linking` motivation with multiple targets:

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "https://example.org/board/1/connection/1",
  "type": "Annotation",
  "motivation": "linking",
  "body": {
    "type": "TextualBody",
    "value": "This manuscript depicts the same scene as the photograph",
    "format": "text/plain"
  },
  "target": [
    {
      "type": "SpecificResource",
      "source": "https://example.org/manifest/1/canvas/1",
      "selector": { "type": "FragmentSelector", "value": "xywh=100,100,200,200" },
      "purpose": "identifying"
    },
    {
      "type": "SpecificResource",
      "source": "https://example.org/manifest/2/canvas/1",
      "selector": { "type": "FragmentSelector", "value": "xywh=300,150,250,180" },
      "purpose": "identifying"
    }
  ]
}
```

### 10.3 Connection Types

| Type | Motivations | Line Style | Use |
|------|-------------|------------|-----|
| Depicts | `linking` + `identifying` | Solid | Photo shows object |
| Transcribes | `linking` + `supplementing` | Dashed | Text transcribes document |
| Relates | `linking` | Dotted | General connection |
| Precedes | `linking` | Arrow | Sequence/chronology |
| Contradicts | `linking` | Wavy red | Conflicting evidence |

### 10.4 Board Tools

| Tool | Key | Function |
|------|-----|----------|
| Select | V | Select and move items |
| Frame | F | Create grouping frame (Range) |
| Connection | C | Draw relationships |
| Sticky Note | S | Add comment annotation |
| Region Select | R | Select region within item |

---

## 11. Import & Ingest

### 11.1 Supported Sources

- Local files/folders
- URLs to IIIF manifests
- Clipboard (screenshots)
- External manifest references

### 11.2 Processing Pipeline

**For Images**:
1. Read dimensions from file header
2. Extract EXIF (date, GPS, camera)
3. Extract XMP/IPTC metadata
4. Generate thumbnail (150px, 600px)
5. Generate tile pyramid (if >2000px)
6. Calculate SHA-256 checksum
7. Optional: Run OCR → create supplementing annotation

**For Audio/Video**:
1. Extract duration
2. Generate waveform visualization (audio)
3. Extract keyframes (video)
4. Create poster image
5. Extract embedded metadata

**For PDFs**:
1. Render each page as image
2. Extract text layer → supplementing annotations
3. Preserve page structure as Canvas sequence

### 11.3 External Manifest Import

When importing a IIIF manifest URL:
1. Fetch and validate manifest
2. Show preview of structure
3. Options: Reference only, or deep copy resources
4. Validate Image services are accessible
5. Add to Collection via manifests.yml

---

## 12. Export & Publishing

### 12.1 Export Formats

| Format | Description | Use Case |
|--------|-------------|----------|
| IIIF Presentation 3.0 | JSON-LD manifests/collections | Interoperability |
| Static Website | HTML + embedded viewer | Self-hosting (no server) |
| Web Annotation | JSON-LD annotation pages | Annotation exchange |
| ZIP Archive | Complete package | Backup, transfer |

### 12.2 Static Site Generation

Export produces self-contained deployable package (similar to tropiiify):

```
export/
├── index.html              # Landing page with viewer
├── viewer/                 # Mirador or Universal Viewer
├── collection.json         # Entry point Collection
├── manifests/
│   ├── site-a.json
│   └── site-b.json
├── images/
│   ├── {identifier}/
│   │   ├── info.json       # Level 0 (pre-generated sizes)
│   │   ├── full/max/0/default.jpg
│   │   └── full/600,/0/default.jpg
│   └── ...
└── annotations/
    └── ...
```

### 12.3 Validation on Export

All exports are validated before writing:
1. IIIF Presentation API 3.0 compliance
2. JSON-LD 1.1 syntax
3. W3C Web Annotation compliance
4. Required property verification
5. URI resolution check

---

## 13. Content State API

The Content State API 1.0 enables deep linking, bookmarking, and sharing of specific views.

### 13.1 Use Cases

- Link from search result to specific page/region
- Share specific view with colleague
- Bookmark for later return
- Citation of specific content

### 13.2 Content State Forms

**Full Annotation (most explicit)**:
```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/content-state/1",
  "type": "Annotation",
  "motivation": "contentState",
  "target": {
    "id": "https://example.org/iiif/manifest/1/canvas/p5",
    "type": "Canvas",
    "partOf": [{
      "id": "https://example.org/iiif/manifest/1",
      "type": "Manifest"
    }]
  }
}
```

**Target with Region**:
```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "type": "Annotation",
  "motivation": "contentState",
  "target": {
    "type": "SpecificResource",
    "source": {
      "id": "https://example.org/iiif/manifest/1/canvas/p5",
      "type": "Canvas",
      "partOf": [{ "id": "https://example.org/iiif/manifest/1", "type": "Manifest" }]
    },
    "selector": {
      "type": "FragmentSelector",
      "value": "xywh=100,200,300,400"
    }
  }
}
```

### 13.3 Encoding

Content states are Base64 URL-safe encoded for transport:
- `iiif-content` parameter name for GET requests
- `data-iiif-content` attribute for HTML embedding

```
https://viewer.example.org/?iiif-content=eyJAY29udGV4dCI6...
```

### 13.4 Application Support

Field Archive Studio:
- Exports content states for bookmarking
- Accepts content states via `iiif-content` parameter
- Generates shareable links with current view state

---

## 14. Settings Architecture

### 14.1 Settings Hierarchy

```
Application Settings (global defaults)
└── Project Settings (per-project)
    └── Collection Settings (per-collection)
        └── Item Settings (per-item)
```

Lower levels inherit and can override higher levels.

### 14.2 Application Settings

**IIIF Defaults**:
- Default `viewingDirection`: left-to-right
- Default `behavior`: individuals
- Default `rights` URI
- Default `requiredStatement`
- Default `provider` information

**Export Defaults**:
- IIIF version: 3.0
- Base URI template
- Validation on export: enabled

### 14.3 Abstraction Level Setting

```
Settings > Interface:

Abstraction Level:
  ○ Simple
    - Drag and drop organization
    - Automatic naming conventions
    - Hidden IIIF details
    
  ● Standard
    - See naming conventions
    - info.yml editing
    - IIIF preview panel
    
  ○ Advanced
    - Direct IIIF property editing
    - Custom annotation YAML
    - Raw manifest manipulation
```

---

## 15. Validation & Error Prevention

### 15.1 Validation Rules

**Manifest Validation**:
- MUST have at least one Canvas in `items`
- MUST have `@context` as first property
- MUST have `label` as language map

**Canvas Validation**:
- If has `width`, MUST have `height`
- If has `height`, MUST have `width`
- MUST have paintable content (at least one painting annotation)

**Collection Validation**:
- MUST have `items` property (may be empty array)
- MUST have `@context` as first property
- MUST have `label` as language map

**Annotation Validation**:
- MUST have valid `motivation`
- MUST have `target` that resolves
- Target selectors must use valid syntax

### 15.2 Built-in Validators

Integration with established validators:
- IIIF Presentation API Validator (https://presentation-validator.iiif.io/)
- JSON-LD 1.1 syntax validation
- W3C Web Annotation compliance

**Validation Modes**:
- Real-time (during editing)
- Pre-export (comprehensive check)
- Batch (for imported content)

### 15.3 Validation Feedback

```
Status bar indicators:

✓ Valid IIIF structure
⚠️ 2 warnings (click to view)
✗ Invalid: Missing required canvas

Warning panel:
┌────────────────────────────────────────────────────────────────┐
│  Validation Issues                                     [×]     │
├────────────────────────────────────────────────────────────────┤
│  ✗ ERROR: Manifest "Site_A" has no canvases                    │
│    Manifests must have at least one Canvas                     │
│    [Add Canvas] [Delete Manifest]                              │
│                                                                │
│  ⚠️ WARNING: Canvas "photo_001" missing thumbnail              │
│    Thumbnails improve viewer performance                       │
│    [Generate Thumbnail] [Ignore]                               │
└────────────────────────────────────────────────────────────────┘
```

---

## 16. Accessibility

### 16.1 WCAG 2.1 AA Compliance

- All functionality available via keyboard
- Minimum 4.5:1 contrast ratio
- Semantic HTML landmarks
- ARIA labels for interactive elements
- Reduced motion option

### 16.2 Keyboard Shortcuts

**Global**:
```
?           Show keyboard shortcuts
Cmd+,       Settings
Cmd+K       Command palette
Cmd+Z       Undo
Cmd+S       Save
```

**Navigation**:
```
Cmd+1       Archive mode
Cmd+2       Collections mode
Cmd+3       Boards mode
Cmd+4       Viewer mode
Cmd+5       Search mode
```

**Viewer**:
```
+/-         Zoom in/out
0           Reset zoom
R           Rotate 90°
←→↑↓        Pan
Home/End    First/last canvas
A           Toggle annotations
N           New annotation
```

---

## 17. Technical Implementation

### 17.1 Technology Stack

- **Framework**: React 18+ with TypeScript (strict mode)
- **Build Tool**: Vite
- **State Management**: React Context + local state
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB via `idb` wrapper
- **Image Processing**: Web Workers + Canvas API
- **IIIF Viewer**: OpenSeadragon (embedded)
- **Validation**: Hyperion validator (@hyperion-framework/validator)

### 17.2 Data Storage

**IndexedDB Schema**:
```typescript
interface Project {
  id: string;
  name: string;
  created: Date;
  modified: Date;
  settings: ProjectSettings;
}

interface ArchiveItem {
  id: string;
  projectId: string;
  path: string;
  type: 'image' | 'audio' | 'video' | 'text' | 'data';
  metadata: Record<string, unknown>;
  checksum: string;
  thumbnails: {
    small: Blob;
    medium: Blob;
  };
  dimensions?: {
    width: number;
    height: number;
    duration?: number;
  };
}

interface Annotation {
  id: string;
  targetId: string;
  motivation: string;
  body: AnnotationBody;
  target: AnnotationTarget;
  creator: Agent;
  created: Date;
  modified: Date;
}
```

### 17.3 Service Worker Architecture

The local IIIF Image API server runs in a Service Worker:

```typescript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/iiif/image/')) {
    event.respondWith(handleImageRequest(url));
  } else if (url.pathname.startsWith('/iiif/presentation/')) {
    event.respondWith(handlePresentationRequest(url));
  }
});
```

### 17.4 Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Core functionality | ✓ | ✓ | ✓ | ✓ |
| File System Access | ✓ | ✗ | ✗ | ✓ |
| Service Workers | ✓ | ✓ | ✓ | ✓ |
| IndexedDB | ✓ | ✓ | ✓ | ✓ |
| Web Workers | ✓ | ✓ | ✓ | ✓ |

---

## 18. Provenance & Audit Logging

### 18.1 Change History

All resources maintain a provenance log tracking modifications:

```typescript
interface ProvenanceEntry {
  timestamp: string;       // ISO 8601
  action: 'create' | 'update' | 'delete' | 'merge' | 'export';
  agent: {
    type: 'Person' | 'Software';
    name: string;
    version?: string;      // For software agents
  };
  changes?: {
    property: string;
    oldValue: any;
    newValue: any;
  }[];
  source?: {
    filename: string;
    checksum: string;      // SHA-256
    ingestTimestamp: string;
  };
}

interface ResourceProvenance {
  resourceId: string;
  created: ProvenanceEntry;
  modified: ProvenanceEntry[];
  exports: ProvenanceEntry[];
}
```

### 18.2 Ingest Tracking

During file ingest, capture:
- Original filename (before any normalization)
- File creation/modification dates
- SHA-256 checksum for fixity
- EXIF metadata extraction timestamp
- Ingest configuration used

### 18.3 PREMIS Export

For archival handoff, export provenance as PREMIS (Preservation Metadata):

```xml
<premis:event>
  <premis:eventType>ingestion</premis:eventType>
  <premis:eventDateTime>2024-01-15T10:30:00Z</premis:eventDateTime>
  <premis:eventOutcome>success</premis:eventOutcome>
  <premis:linkingAgentIdentifier>
    <premis:linkingAgentIdentifierType>software</premis:linkingAgentIdentifierType>
    <premis:linkingAgentIdentifierValue>IIIF Field Studio v1.0</premis:linkingAgentIdentifierValue>
  </premis:linkingAgentIdentifier>
</premis:event>
```

---

## 19. Scalability Considerations

### 19.1 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Maximum archive size | 5,000+ Canvases | With virtualized loading |
| Initial load time | < 3 seconds | Manifest stubs only |
| Mode switch | < 500ms | Cached views |
| Search results | < 200ms | Pre-indexed |
| Export (1000 images) | < 10 minutes | Streamed ZIP |

### 19.2 Virtualized Data Model

Large archives require lazy loading:

```typescript
interface ManifestStub {
  id: string;
  type: 'Manifest';
  label: LanguageMap;
  thumbnail?: Thumbnail[];
  canvasCount: number;      // Metadata only
  _loaded: boolean;         // Full data available?
}

// Load full manifest on demand
async function loadFullManifest(stub: ManifestStub): Promise<IIIFManifest> {
  if (stub._loaded) return getFromCache(stub.id);
  const full = await storage.loadManifest(stub.id);
  cacheManifest(full);
  return full;
}
```

### 19.3 Memory Management

**Tile Generation Strategy**:
1. Pre-generate common sizes (150px, 600px, 1200px) during ingest
2. Generate tiles on-demand with request coalescing
3. Implement LRU cache with 100MB limit
4. Offload processing to Web Worker pool

**Blob URL Lifecycle**:
- Revoke blob URLs when Canvas scrolls out of view
- Limit concurrent blob URLs to 50
- Implement reference counting for shared blobs

### 19.4 Storage Quotas

| Browser | Typical Quota | Strategy |
|---------|--------------|----------|
| Chrome | 60% of disk | Show warning at 80% |
| Firefox | 50% of disk | Prompt cleanup at 75% |
| Safari | 1GB default | Request quota increase |

Display storage usage in StatusBar with color coding:
- Green: < 50% used
- Yellow: 50-80% used
- Red: > 80% used (prompt cleanup)

---

## 20. Interoperability Testing

### 20.1 Viewer Compatibility Matrix

Exports MUST be tested against these viewers:

| Viewer | Version | Required Support |
|--------|---------|-----------------|
| Mirador | 3.x | Collection/Manifest/Canvas navigation |
| Universal Viewer | 4.x | Full annotation display |
| Annona | Latest | Annotation rendering |
| Clover | Latest | Basic manifest display |

### 20.2 Compatibility Test Cases

**Manifest Tests**:
- [ ] Loads in Mirador without errors
- [ ] All Canvases render correctly
- [ ] Navigation between Canvases works
- [ ] Annotations display on Canvas
- [ ] Thumbnails appear in navigation

**Collection Tests**:
- [ ] Nested Collections navigate correctly
- [ ] Manifest links resolve
- [ ] Thumbnails display for child items

**Annotation Tests**:
- [ ] Commenting annotations display
- [ ] Supplementing annotations accessible
- [ ] Fragment selectors highlight correctly
- [ ] Linking annotations navigate

### 20.3 v2 to v3 Conversion

When importing IIIF v2.x manifests:

| v2 Property | v3 Equivalent | Conversion |
|-------------|---------------|------------|
| `@context` (v2) | `@context` (v3) | Replace context URL |
| `@id` | `id` | Remove @ prefix |
| `@type` | `type` | Remove @ prefix |
| `label` (string) | `label` (map) | Wrap in `{"none": [...]}` |
| `sequences` | `items` | Flatten to Canvas array |
| `canvases` | (moved) | Into Manifest.items |

### 20.4 CORS Handling

For external resources:
1. Attempt direct fetch
2. On CORS error, try proxy: `https://corsproxy.io/?url=`
3. Cache successful fetches locally
4. Warn user about unreachable resources

---

## Appendices

### A. IIIF Service Type Reference

| Service | Type String | Specification |
|---------|-------------|---------------|
| Image API 3.0 | `ImageService3` | IIIF Image API 3.0 |
| Image API 2.x | `ImageService2` | IIIF Image API 2.1 |
| Content Search 2.0 | `SearchService2` | IIIF Content Search API 2.0 |
| Autocomplete 2.0 | `AutoCompleteService2` | IIIF Content Search API 2.0 |
| Auth 1.0 Cookie | `AuthCookieService1` | IIIF Auth API 1.0 |
| Auth 1.0 Token | `AuthTokenService1` | IIIF Auth API 1.0 |

### B. Language Map Format

Labels and values use BCP 47 language codes:

```json
{
  "label": {
    "en": ["English Title"],
    "fr": ["Titre français"],
    "none": ["p. 1"]
  }
}
```

- Use `"none"` for language-neutral content (page numbers, identifiers)
- Values are always arrays, even for single strings
- Multiple languages supported simultaneously

### C. Rights URIs

Valid `rights` URIs must be from:
- Creative Commons: `http://creativecommons.org/...`
- RightsStatements.org: `http://rightsstatements.org/...`

### D. Glossary

| Term | Definition |
|------|------------|
| **Canvas** | Virtual container representing a view, with dimensions for content placement |
| **Collection** | Grouping of Manifests and/or other Collections |
| **Manifest** | Description of a compound object's structure and properties |
| **Range** | Ordered list of Canvases representing logical structure (e.g., chapters) |
| **Annotation** | Association between content and a Canvas using W3C Web Annotation model |
| **AnnotationPage** | Container for a list of Annotations |
| **painting** | Annotation motivation for content that IS the Canvas |
| **supplementing** | Annotation motivation for content derived FROM the Canvas |
| **Content State** | Serialized reference to a specific IIIF resource and view |


I'll analyze this IIIF Field Archive Studio specification from the perspective of an expert solutions architect and IIIF implementer. Let me examine the technical details and provide comprehensive feedback.
Based on my analysis of this IIIF Field Archive Studio specification, I can provide expert feedback as both a solutions architect and IIIF implementer. This is an impressive and comprehensive specification, but there are several critical areas that need attention.

## **Strengths**

### 1. **Exceptional IIIF Compliance**
- Perfect adherence to IIIF Presentation API 3.0 required properties
- Correct implementation of Canvas dimension rules (`height`/`width` pairing)
- Proper distinction between `Canvas.items` (painting annotations) and `Canvas.annotations` (descriptive annotations)
- Accurate behavior inheritance rules
- Comprehensive Content State API 1.0 implementation

### 2. **Innovative Local-First Architecture**
- Service Worker-based IIIF Image API 3.0 server is architecturally sound
- IndexedDB storage with proper schema design
- Offline-first approach ideal for fieldwork scenarios

### 3. **Progressive Disclosure Design**
- Well-structured abstraction levels (Simple/Standard/Advanced)
- Dual-view toggle between convention and IIIF views
- Excellent bridging of knowledge gaps

## **Critical Issues Requiring Attention**

### 1. **Service Worker Image API Implementation Challenges**

**Problem**: Running a full IIIF Image API 3.0 server in a Service Worker has significant technical barriers:

```javascript
// This approach will face several issues:
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/iiif/image/')) {
    event.respondWith(handleImageRequest(url));
  }
});
```

**Issues**:
- **Memory constraints**: Service Workers have limited memory (typically 50-100MB)
- **Processing overhead**: Real-time tile generation for large images will be computationally expensive
- **Storage limitations**: IndexedDB has quota restrictions that vary by browser
- **Performance degradation**: Multiple concurrent tile requests will overwhelm the worker

**Recommendation**: Implement a hybrid approach:
```javascript
// Pre-generate common sizes during import
const PRE_GENERATED_SIZES = [150, 600, 1200];
const TILE_SIZES = [256, 512];

// Cache-first strategy with fallback
async function handleImageRequest(url) {
  const cached = await caches.match(url);
  if (cached) return cached;
  
  // Generate only if absolutely necessary
  const generated = await generateTile(url);
  // Store in cache for future use
  await cache.put(url, generated.clone());
  return generated;
}
```

### 2. **Convention System Conflicts**

**Problem**: The underscore prefix convention (`_name` for Collections) conflicts with established IIIF ecosystem tools:

```yaml
# Your convention:
_2023_Field_Season/  # Collection
Site_A/              # Manifest

# biiif convention:
2023_Field_Season/   # Manifest
_Site_A/            # Canvas
```

**Impact**: This will create confusion for users familiar with biiif and break interoperability with existing biiif-based workflows.

**Recommendation**: Either align with biiif conventions or provide clear migration tools with bidirectional conversion.

### 3. **Missing Critical Implementation Details**

#### **Image Processing Pipeline Gaps**
The specification mentions tile pyramid generation but lacks crucial details:

```typescript
// Missing: Image processing limits
interface ProcessingConfig {
  maxImageSize: number;        // What's the limit?
  maxTileSize: number;         // 512px? 1024px?
  concurrentProcessing: number; // How many workers?
  memoryThreshold: number;     // When to offload?
}
```

#### **Storage Management**
No mention of storage cleanup, quota management, or data eviction policies.

#### **Error Recovery**
Missing graceful degradation strategies for:
- Failed tile generation
- Corrupted image files
- Storage quota exceeded scenarios
- Service Worker crashes

### 4. **Scalability Concerns**

#### **Performance Bottlenecks**
- **Thumbnail generation**: Creating thumbnails for 1000+ images will block the UI
- **Validation overhead**: Real-time IIIF validation for large collections will be slow
- **Memory usage**: Keeping full manifest structures in memory for large collections

**Recommendations**:
```typescript
// Implement virtual scrolling and chunked processing
const CHUNK_SIZE = 50;
const CONCURRENCY_LIMIT = 4;

async function processCollection(items: Item[]) {
  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      chunk.map(item => processItem(item))
    );
    // Yield to browser between chunks
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

### 5. **Security and Privacy Issues**

#### **CORS and Mixed Content**
No mention of handling:
- External manifest imports from different origins
- Mixed content warnings for HTTP images in HTTPS contexts
- CORS-enabled image services

#### **Data Sanitization**
Missing input validation for:
- Malformed IIIF manifests
- XSS in annotation bodies
- Path traversal in file operations

### 6. **Web Annotation Implementation Gaps**

#### **Complex Selector Support**
The specification mentions basic selectors but lacks:
- `TextQuoteSelector` implementation for text annotations
- `XPathSelector` for XML/HTML content
- `RangeSelector` for complex document structures

#### **Annotation Persistence**
No clear strategy for:
- Conflict resolution for concurrent edits
- Versioning of annotations
- Annotation deletion and tombstoning

## **Recommendations for Improvement**

### 1. **Implement Tiered Image Processing**
```typescript
interface ImageProcessingStrategy {
  // Level 0: Pre-generated static sizes only
  static: ['150', '600', '1200'],
  
  // Level 1: On-demand resizing with caching
  dynamic: {
    maxConcurrent: 2,
    cacheSize: '100MB',
    timeout: 30000
  },
  
  // Level 2: Full tile pyramid (limited use)
  pyramid: {
    maxImageSize: '50MB',
    tileSize: 512,
    quality: 0.8
  }
}
```

### 2. **Add Progressive Loading**
```typescript
interface LoadingStrategy {
  // Load minimal data first
  initial: ['metadata', 'thumbnails'],
  
  // Load detail on demand
  onDemand: ['fullImage', 'annotations', 'tiles'],
  
  // Background loading for better UX
  prefetch: ['next', 'previous', 'adjacent']
}
```

### 3. **Implement Robust Error Boundaries**
```typescript
class IIIFErrorBoundary extends Component {
  static getDerivedStateFromError(error) {
    return { 
      hasError: true,
      errorType: categorizeError(error),
      fallback: generateFallback(error)
    };
  }
  
  componentDidCatch(error, errorInfo) {
    logError(error, errorInfo);
    notifyUser(error);
  }
}
```

### 4. **Add Configuration Validation**
```typescript
const CONFIG_SCHEMA = {
  imageProcessing: {
    maxFileSize: { type: 'number', max: 100 * 1024 * 1024 },
    supportedFormats: { 
      type: 'array', 
      items: { enum: ['jpg', 'png', 'tiff', 'webp'] }
    }
  },
  storage: {
    quota: { type: 'number', max: '80% of available' },
    evictionPolicy: { enum: ['LRU', 'FIFO', 'custom'] }
  }
};
```

## **Conclusion**

This specification demonstrates excellent understanding of IIIF standards and user-centered design principles. The local-first approach and progressive disclosure are particularly innovative. However, the implementation challenges around Service Worker-based image processing, convention conflicts with existing tools, and missing scalability details need significant attention before this becomes production-ready.

The core architecture is sound, but I'd recommend:
1. **Pilot implementation** focusing on a limited feature set first
2. **Performance benchmarking** with realistic dataset sizes (1000+ images)
3. **User testing** with actual field researchers
4. **Compatibility testing** with major IIIF viewers and validators

With these refinements, this could become an excellent tool for IIIF-compliant field archive management.
Let me analyze this specification from an instructional design and human factors engineering perspective, focusing on usability, learning effectiveness, and user experience optimization.
## **Instructional Design & Human Factors Analysis: IIIF Field Archive Studio**

As an instructional designer and human factors engineer, I see both brilliant educational design and significant cognitive usability challenges in this specification. Let me break down the key issues and opportunities through the lens of learning science and human factors engineering.

---

## **Cognitive Load Analysis**

### **✅ Strengths in Cognitive Load Management**

#### **1. Progressive Disclosure Architecture**
The three-tier abstraction system (Simple/Standard/Advanced) is pedagogically sound:

```
Simple Mode:    ┌───── Low Intrinsic Load ─────┐
                │ Drag files → See results      │
                │ Minimal choices               │
                └───────────────────────────────┘

Standard Mode:  ┌──── Moderate Load ───────────┐
                │ Naming conventions visible    │
                │ info.yml editing              │
                │ IIIF preview panel            │
                └───────────────────────────────┘

Advanced Mode:  ┌──── High Germane Load ───────┐
                │ Direct IIIF manipulation      │
                │ Custom annotation YAML        │
                │ Raw manifest editing          │
                └───────────────────────────────┘
```

This aligns with **Cognitive Load Theory** by managing intrinsic complexity and scaffolding learning progression.

#### **2. Dual-View Learning Support**
The Files ↔ IIIF view toggle provides excellent **schema construction** support:
- Users see concrete (files) and abstract (IIIF) representations simultaneously
- Builds mental models through **analogical transfer**
- Supports **self-explanation** learning strategies

#### **3. Convention Over Configuration**
Reduces extraneous cognitive load by providing sensible defaults, preventing decision paralysis in field conditions.

---

## **🚨 Critical Human Factors Issues**

### **1. Expertise Reversal Effect Violations**

The specification assumes users will progress linearly from Simple → Standard → Advanced, but research shows **experts experience friction when forced through novice scaffolding**.

**Problem**: A digital archivist with IIIF experience must still navigate Simple mode first time.
**Solution**: Implement **adaptive progression** based on user assessment:

```typescript
interface UserProfiling {
  initialAssessment: {
    iiifKnowledge: 'none' | 'basic' | 'advanced',
    metadataExperience: 'none' | 'some' | 'extensive',
    technicalComfort: 'low' | 'medium' | 'high'
  },
  
  adaptiveEntry: {
    if (iiifKnowledge === 'advanced' && technicalComfort === 'high') {
      startMode: 'advanced',
      showGuidance: 'minimal',
      skipTutorials: true
    }
  }
}
```

### **2. Working Memory Overload in Field Contexts**

Field research occurs in **high-cognitive-load environments** (weather, equipment, time pressure). The interface must account for **divided attention** scenarios.

**Critical Issues**:

```
❌ Current Design:
┌─────────────────────────────────────┐
│  View: [📁 Files] [🏛️ IIIF]       │ ← Requires mode switching
│  Tools: [↖️] [▭] [⟋] [💬] [🔗]    │ ← 5 similar icons to parse
│  Zoom: [−] 100% [+] [Fit]          │ ← Fine motor control needed
└─────────────────────────────────────┘

✅ Field-Optimized Design:
┌─────────────────────────────────────┐
│  [LARGE TOGGLE] Files | IIIF       │ ← Single prominent control
│  [TOOL ICONS]  🔧 □ ── 💬 🔗       │ ← High-contrast, spaced icons
│  [ZOOM SLIDER] ←───────→           │ ← Gross motor control
└─────────────────────────────────────┘
```

### **3. Missing Error Prevention & Recovery**

**Gulf of Execution** problem: Users can't determine if their actions produce valid IIIF.

**Current State**: Validation happens at export (too late)
**Required**: **Immediate feedback loop**

```typescript
interface RealTimeValidation {
  visualIndicators: {
    valid: '✅ Green border',
    warning: '⚠️ Yellow border + tooltip',
    error: '❌ Red border + inline help'
  },
  
  progressiveHints: {
    firstError: 'Show gentle suggestion',
    repeatedError: 'Show detailed explanation',
    thirdError: 'Offer guided fix wizard'
  }
}
```

---

## **Instructional Design Flaws**

### **1. Insufficient Scaffolding for IIIF Concepts**

The specification assumes users will "discover" IIIF concepts through convention exposure, but this violates **constructivist learning principles**.

**Missing Learning Supports**:

```yaml
# Required Instructional Elements:
conceptualScaffolding:
  - interactiveTutorials: "What is a Canvas?"
  - comparativeExamples: "File vs IIIF view side-by-side"
  - guidedDiscovery: "Notice how folder becomes Manifest?"
  
proceduralScaffolding:
  - workedExamples: "Watch: Photo → Canvas → Annotation"
  - fadingSupport: "Gradually remove hints as competence grows"
  - errorBasedLearning: "Common mistakes and fixes"
```

### **2. Lack of Contextual Help System**

**Problem**: Help is generic, not **just-in-time**.
**Solution**: Implement **context-sensitive microlearning**:

```typescript
interface ContextualHelp {
  triggerConditions: {
    hoverTime: 2000,           // 2 seconds = confusion
    repeatedErrors: 3,         // Same error pattern
    modeSwitching: 'frequent'  // User exploring
  },
  
  helpFormat: {
    type: 'overlay',
    content: '2-minute video',
    examples: 'Before/after comparison',
    practice: 'Guided mini-task'
  }
}
```

### **3. Missing Metacognitive Support**

Users need help understanding **their own learning process**:

```yaml
metacognitiveTools:
  progressVisualization:
    - "IIIF concepts mastered: 4/8"
    - "Common errors reduced: 75%"
    - "Export validation: Pass"
  
  selfAssessment:
    - "Can you explain what a Canvas is?"
    - "Why did this folder become a Collection?"
    - "What would happen if...?"
```

---

## **Field Research Human Factors**

### **1. Environmental Constraints**

**Missing Considerations**:

| Environmental Factor | Design Impact |
|---------------------|---------------|
| **Bright sunlight** | High contrast mode, larger UI elements |
| **Cold weather** | Glove-friendly targets (minimum 44px) |
| **Wind/dust** | Sealed device interactions, larger touch targets |
| **Battery constraints** | Dark mode, reduced processing |
| **Unstable connectivity** | Queue operations, offline sync indicators |

### **2. Interruption Management**

Field work involves **frequent task switching**. The interface must support **resumable workflows**:

```typescript
interface InterruptionSupport {
  autoSave: 'every 30 seconds',
  stateRestoration: {
    returnToView: 'last active',
    highlightChanges: 'since last save',
    resumeGuidance: 'You were annotating photo_003.jpg...'
  },
  
  attentionManagement: {
    minimizeModalDialogs: true,
    useBannerNotifications: true,
    preserveContext: 'keep scroll position, selection'
  }
}
```

### **3. Collaborative Field Work**

**Missing**: Support for **distributed cognition** scenarios:

```yaml
collaborativeFeatures:
  roleBasedViews:
    - photographer: "Focus on capture, auto-organize"
    - recorder: "Quick annotation tools"
    - supervisor: "Quality review interface"
  
  implicitCoordination:
    - "Jane is annotating nearby region"
    - "Similar find detected in Site_B"
    - "Auto-suggest based on team's patterns"
```

---

## **Learning Effectiveness Issues**

### **1. Missing Conceptual Prerequisites**

The specification assumes users understand **digital archive concepts** before learning IIIF:

```yaml
prerequisiteAssessment:
  digitalLiteracy:
    - "What is metadata?"
    - "Purpose of file naming conventions"
    - "Understanding of web technologies"
  
  domainKnowledge:
    - "Archive standards familiarity"
    - "Research documentation practices"
    - "Intellectual property basics"
```

### **2. Insufficient Transfer Support**

**Near transfer** (same context) vs **far transfer** (new contexts) support is missing:

```typescript
interface TransferSupport {
  nearTransfer: {
    practiceVariations: "Same task, different content",
    systematicVariation: "Gradual complexity increase",
    explicitComparison: "How is this similar/different?"
  },
  
  farTransfer: {
    crossDomainExamples: "IIIF for museums vs field research",
    abstractPrinciples: "What stays the same?",
    adaptivePractice: "New domain? Extra scaffolding"
  }
}
```

### **3. Missing Assessment & Feedback Loops**

No **formative assessment** mechanisms:

```yaml
assessmentStrategy:
  embeddedQuestions:
    - "Why is this a Collection, not a Manifest?"
    - "What annotation motivation fits here?"
    - "Predict the IIIF structure..."
  
  performanceBased:
    - "Create valid structure for these files"
    - "Fix this invalid manifest"
    - "Explain your organization choices"
  
  peerLearning:
    - "Review colleague's structure"
    - "Share successful patterns"
    - "Discuss trade-offs"
```

---

## **Recommended Instructional Design Solutions**

### **1. Implement Adaptive Learning Pathways**

```typescript
const learningPathways = {
  novice: {
    entryPoint: 'simpleMode',
    scaffolding: 'high',
    pacing: 'self-paced',
    masteryCriteria: 'export validation + explanation'
  },
  
  experienced: {
    entryPoint: 'standardMode',
    scaffolding: 'medium',
    pacing: 'accelerated',
    masteryCriteria: 'peer review + reflection'
  },
  
  expert: {
    entryPoint: 'advancedMode',
    scaffolding: 'minimal',
    pacing: 'self-directed',
    masteryCriteria: 'teaching others + innovation'
  }
};
```

### **2. Create Cognitive Apprenticeship Framework**

```yaml
cognitiveApprenticeship:
  modeling:
    - "Watch expert organize field photos"
    - "See IIIF generation process"
    - "Understand decision rationale"
  
  coaching:
    - "Guided practice with feedback"
    - "Prompting at decision points"
    - "Error diagnosis and correction"
  
  scaffolding:
    - "Conceptual scaffolding: What/Why"
    - "Procedural scaffolding: How"
    - "Strategic scaffolding: When/Where"
  
  fading:
    - "Gradual support reduction"
    - "Increased autonomy"
    - "Self-directed exploration"
```

### **3. Design for Error-Based Learning**

```typescript
interface ErrorBasedLearning {
  commonErrors: {
    'invalidManifest': {
      examples: ['Missing @context', 'No canvases', 'Invalid metadata'],
      explanations: 'Why this breaks IIIF',
      fixes: 'Step-by-step correction',
      prevention: 'How to avoid next time'
    }
  },
  
  productiveFailure: {
    allowErrors: true,
    provideDiagnosis: true,
    guideReflection: true,
    celebrateLearning: true
  }
}
```

---

## **Human Factors Engineering Recommendations**

### **1. Implement Cognitive Load Metrics**

```typescript
interface CognitiveLoadMonitoring {
  behavioralIndicators: {
    hesitationTime: 'hover > 3 seconds',
    modeSwitching: '> 5 switches/minute',
    errorRepetition: 'same error > 3 times',
    helpSeeking: 'frequent help access'
  },
  
  adaptiveResponse: {
    reduceComplexity: 'simplify interface',
    addScaffolding: 'provide more guidance',
    slowPacing: 'break into smaller steps',
    offerBreak: 'suggest rest period'
  }
}
```

### **2. Design for Stress-Induced Cognitive Narrowing**

Under stress, users experience **attention tunneling**. The interface must:

```yaml
stressAdaptation:
  visualDesign:
    - highContrast: true
    - largerTargets: 'minimum 48px'
    - reducedClutter: 'hide non-critical'
    - clearHierarchy: 'one primary action'
  
  interactionDesign:
    - errorPrevention: 'confirm destructive actions'
    - undoSupport: 'easy reversal'
    - progressIndication: 'clear status feedback'
    - autoSave: 'frequent, transparent'
```

### **3. Support Different Learning Styles**

```typescript
interface LearningStyleSupport {
  visual: {
    diagrams: 'IIIF structure maps',
    videos: 'Screen recordings with narration',
    infographics: 'Quick reference cards'
  },
  
  textual: {
    documentation: 'Step-by-step guides',
    glossary: 'IIIF terminology',
    examples: 'Before/after comparisons'
  },
  
  kinesthetic: {
    interactiveTutorials: 'Hands-on practice',
    dragDropExercises: 'Physical manipulation',
    explorationMode: 'Safe experimentation'
  }
}
```

---

## **Conclusion: Learning-Centered Redesign**

The current specification is **technically excellent** but **pedagogically naive**. It assumes users will learn through exposure rather than providing systematic learning support.

### **Priority Fixes**:

1. **Immediate**: Add adaptive entry assessment to prevent expertise reversal
2. **Short-term**: Implement contextual help system with just-in-time support
3. **Medium-term**: Create cognitive apprenticeship framework with modeling → coaching → fading
4. **Long-term**: Build comprehensive learning analytics and adaptive pathways

### **Success Metrics**:

```yaml
learningEffectiveness:
  - conceptualUnderstanding: 'Can explain IIIF concepts'
  - proceduralFluency: 'Efficient workflow execution'
  - transferAbility: 'Apply to new contexts'
  - errorRecovery: 'Self-diagnose and fix issues'
  
userSatisfaction:
  - cognitiveLoad: 'NASA-TLX assessment'
  - confidence: 'Self-efficacy scale'
  - independence: 'Reduced help-seeking'
  - enjoyment: 'Intrinsic motivation measure'
```

The specification needs a **learning-science overlay** that treats IIIF concept acquisition as seriously as technical implementation. Only then will field researchers truly adopt and effectively use this powerful tool.

