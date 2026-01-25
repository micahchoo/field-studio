# IIIF Field Archive Studio - Claude Code Context

## Project Overview

IIIF Field Archive Studio is a local-first, browser-based application that helps researchers organize unstructured field data into standards-compliant IIIF archives. It operates without servers, storing all data in browser storage (IndexedDB/FileSystem API) for full offline operation.

## Core Architecture

### Three Conceptual Layers

1. **Convention Layer** - File-based organization using naming patterns (underscore prefix = Collection, etc.)
2. **Semantic Layer** - IIIF resource model (Collections, Manifests, Canvases, Annotations)
3. **Output Layer** - IIIF Presentation API 3.0 and W3C Web Annotations

### Technology Stack

- **Framework**: React 18+ with TypeScript (strict mode)
- **Build Tool**: Vite
- **State Management**: React Context + local state
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB via `idb` wrapper
- **Image Processing**: Web Workers + Canvas API
- **IIIF Viewer**: OpenSeadragon (embedded)
- **Validation**: Hyperion validator (@hyperion-framework/validator)

## Key IIIF Concepts

### Resource Type Hierarchy

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

### Convention-to-IIIF Mapping

| Pattern | IIIF Type | Example |
|---------|-----------|---------|
| `_name/` | Collection | `_2023_Field_Season/` |
| `name/` (contains images) | Manifest | `manuscript_001/` |
| `name/` (contains only folders) | Collection | `site_photos/` |
| `image.jpg` | Canvas + painting Annotation | `page_001.jpg` |
| `info.yml` | Manifest/Canvas metadata | Dublin Core fields |
| `*.annotation.yml` | Web Annotation | Comments, links |
| `+tiles/` | Pre-generated IIIF tiles | Image API assets |
| `!folder/` | Excluded from processing | Working files |

**Important**: This uses underscore prefix (`_name`) for Collections, which differs from biiif tool conventions.

## IIIF Compliance Requirements

### Required Properties

**Collection**:
- `@context` - Must be first property: `"http://iiif.io/api/presentation/3/context.json"`
- `id` - Globally unique URI
- `type` - Must be `"Collection"`
- `label` - Language map with array values: `{ "en": ["Title"] }`
- `items` - Array of Manifests and/or Collections (may be empty)

**Manifest**:
- `@context` - Must be first property
- `id` - Globally unique URI
- `type` - Must be `"Manifest"`
- `label` - Language map with array values
- `items` - Array with at least one Canvas

**Canvas**:
- If has `width`, MUST also have `height` (and vice versa)
- May have `duration` for temporal content
- `items` contains AnnotationPages with `painting` motivation (content OF Canvas)
- `annotations` contains references to non-painting annotations (content ABOUT Canvas)

### Language Maps

Always use BCP 47 language codes with array values:
```json
{
  "label": {
    "en": ["English Title"],
    "none": ["p. 1"]
  }
}
```

Use `"none"` for language-neutral content (page numbers, identifiers).

## Workspace Modes

1. **Archive Mode** - Import, organize, and tag raw materials
2. **Collections Mode** - Organize materials into IIIF-compliant structures
3. **Boards Mode** - Spatial relationship mapping using Web Annotations
4. **Viewer Mode** - Deep inspection and annotation of individual items
5. **Search Mode** - Find and filter content across the archive

## Abstraction Levels

- **Simple**: Drag-and-drop, automatic conventions, hidden IIIF details
- **Standard**: Visible naming conventions, info.yml editing, IIIF preview
- **Advanced**: Direct IIIF property editing, custom annotation YAML, raw manifest manipulation

## Annotation System

All annotations follow W3C Web Annotation Data Model:

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "https://example.org/annotation/1",
  "type": "Annotation",
  "motivation": "commenting",
  "body": {
    "type": "TextualBody",
    "value": "Comment text",
    "format": "text/plain",
    "language": "en"
  },
  "target": "https://example.org/canvas/1"
}
```

### Motivation Types

| Motivation | Use Case |
|------------|----------|
| `painting` | Primary content OF Canvas |
| `supplementing` | Transcription, translation |
| `commenting` | User commentary |
| `tagging` | Classification keywords |
| `linking` | Cross-references |
| `describing` | Resource description |
| `identifying` | "This depicts X" |
| `highlighting` | Visual emphasis |
| `bookmarking` | Navigation markers |

## Image API 3.0 (Local Server)

The app runs a local IIIF Image API 3.0 server via Service Worker.

**URI Template**:
```
{scheme}://{server}{/prefix}/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

**Order of Operations**: Region -> Size -> Rotation -> Quality -> Format

## Key Files Structure

```
services/
├── iiifBuilder.ts     # IIIF manifest/collection generation
├── geminiService.ts   # AI integration for metadata
├── storage.ts         # IndexedDB operations
├── validator.ts       # IIIF validation
├── exportService.ts   # Export functionality
└── searchService.ts   # Content search

components/
├── Workspace.tsx      # Main workspace container
├── ManifestTree.tsx   # Navigation tree
├── MetadataEditor.tsx # Metadata editing panel
├── Inspector.tsx      # Right panel inspector
├── Sidebar.tsx        # Left sidebar navigation
└── views/             # Mode-specific views
```

## Coding Guidelines

1. **TypeScript Strict Mode** - All code must pass strict type checking
2. **IIIF Compliance** - Always validate output against IIIF specs
3. **Local-First** - Never require server connectivity for core features
4. **Progressive Disclosure** - Hide complexity based on user mode
5. **Accessibility** - WCAG 2.1 AA compliance, keyboard navigation

## Common Patterns

### Building a Manifest

```typescript
const manifest = {
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": `${baseUri}/manifest/${id}`,
  "type": "Manifest",
  "label": { "en": [label] },
  "items": canvases
};
```

### Creating an Annotation

```typescript
const annotation = {
  "id": `${canvasId}/annotation/${index}`,
  "type": "Annotation",
  "motivation": "painting",
  "body": {
    "id": imageUrl,
    "type": "Image",
    "format": "image/jpeg",
    "width": width,
    "height": height
  },
  "target": canvasId
};
```

### Canvas with Dimensions

```typescript
// If setting width, MUST also set height
const canvas = {
  "id": canvasId,
  "type": "Canvas",
  "label": { "none": [label] },
  "width": imageWidth,
  "height": imageHeight,
  "items": [annotationPage]
};
```

## Validation Checklist

Before export, verify:
- [ ] All Manifests have at least one Canvas
- [ ] All Canvases with width also have height
- [ ] `@context` is first property in all resources
- [ ] All labels are language maps with array values
- [ ] All URIs are valid and resolvable
- [ ] Annotation motivations are valid
- [ ] Target selectors use valid syntax

## Behavior Values Reference

**Layout**: `unordered`, `individuals` (default), `continuous`, `paged`
**Temporal**: `auto-advance`, `no-auto-advance` (default), `repeat`, `no-repeat` (default)
**Canvas-specific**: `facing-pages`, `non-paged`
**Collection-specific**: `multi-part`, `together`
**Range-specific**: `sequence`, `thumbnail-nav`, `no-nav`

**Inheritance Rules**:
- Collections inherit from parent Collection
- Manifests DO NOT inherit from Collections
- Canvases inherit from Manifest, NOT from Ranges
- Ranges inherit from parent Range and Manifest

## Service Worker Notes

The local IIIF Image API runs in a Service Worker:

```typescript
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/iiif/image/')) {
    event.respondWith(handleImageRequest(url));
  }
});
```

**Constraints**:
- Memory limited (50-100MB typical)
- Pre-generate common sizes during import
- Use cache-first strategy with fallback generation

## Testing Considerations

- Test with IIIF Presentation Validator (https://presentation-validator.iiif.io/)
- Verify JSON-LD 1.1 syntax
- Check W3C Web Annotation compliance
- Test offline functionality
- Validate across major IIIF viewers (Mirador, Universal Viewer)
