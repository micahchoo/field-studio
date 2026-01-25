## IIIF Presentation API 3.0 Hierarchy (Expanded with Property Requirements)

---

### Collection

**Purpose**: A grouping mechanism. Can contain Manifests and/or other Collections.

**Required properties**: `id`, `type`, `label`, `items`

**Recommended**: `metadata`, `summary`, `provider`, `thumbnail`

**Optional**: `requiredStatement`, `rights`, `navDate`, `homepage`, `seeAlso`, `service`, `services`, `rendering`, `partOf`

**Not allowed**: `language`, `height`, `width`, `duration`, `format`, `profile`, `start`, `supplementary`, `timeMode`, `structures`, `annotations`, `placeholderCanvas`, `accompanyingCanvas`

**Behavior values allowed**: `auto-advance`, `continuous`, `individuals`, `multi-part`, `no-auto-advance`, `no-repeat`, `non-paged`, `hidden`, `paged`, `repeat`, `sequence`, `thumbnail-nav`, `together`, `unordered`

**Behavior values NOT allowed**: `facing-pages`, `no-nav`

**Non-hierarchical use**: Yes, extensively.
- Collections can reference the same Manifest that appears in other Collections (many-to-many)
- A Manifest doesn't "belong" to a Collection—it's referenced by URI
- Collections can be dynamically generated (search results, user-curated sets, cross-institutional aggregations)
- `partOf` allows a Collection to declare membership in parent Collections without the parent knowing

**Ingestion implications**: Your tool needs to generate `id`, `type`, `label` at minimum. `items` holds the child Manifests/Collections. The `viewingDirection` property lets you hint at reading order. `behavior: "unordered"` is useful when folder contents have no inherent sequence.

---

### Manifest

**Purpose**: Represents a single coherent "object"—a book, a painting, a map, a video, an audio recording.

**Required properties**: `id`, `type`, `label`, `items` (the Canvases)

**Recommended**: `metadata`, `summary`, `provider`, `thumbnail`

**Optional**: `requiredStatement`, `rights`, `navDate`, `viewingDirection`, `behavior`, `homepage`, `seeAlso`, `service`, `services`, `rendering`, `partOf`, `start`, `structures`, `annotations`, `placeholderCanvas`, `accompanyingCanvas`

**Not allowed**: `language`, `height`, `width`, `duration`, `format`, `profile`, `supplementary`, `timeMode`

**Behavior values allowed**: `auto-advance`, `continuous`, `individuals`, `multi-part`, `no-auto-advance`, `no-repeat`, `non-paged`, `hidden`, `paged`, `repeat`, `sequence`, `thumbnail-nav`, `together`, `unordered`

**Behavior values NOT allowed**: `facing-pages`, `no-nav`

**Non-hierarchical use**: Yes.
- A Manifest can exist standalone without being in any Collection
- `partOf` lets a Manifest declare its parent Collection(s) without being embedded
- `seeAlso` and `homepage` link to external related resources
- `rendering` can point to alternative formats (PDF download, etc.)

**Ingestion implications**: Each "leaf folder" (folder with images) typically becomes a Manifest. `viewingDirection` matters—default is `left-to-right`. Use `paged` behavior for books, `individuals` for unrelated images. `start` can point to a specific Canvas to open on.

---

### Canvas

**Purpose**: An abstract coordinate space representing one "view"—a page, a frame, a time segment.

**Required properties**: `id`, `type`, `items` (Annotation Pages with painting annotations)

**Recommended**: `label`, `thumbnail`

**Conditionally required**: If `height` is present, `width` must be present (and vice versa). For spatial content, both are effectively required.

**Optional**: `metadata`, `summary`, `requiredStatement`, `rights`, `navDate`, `height`, `width`, `duration`, `behavior`, `homepage`, `seeAlso`, `service`, `services`, `rendering`, `partOf`, `annotations`, `placeholderCanvas*`, `accompanyingCanvas*`

**Not allowed**: `language`, `format`, `profile`, `viewingDirection`, `start`, `supplementary`, `timeMode`, `structures`

*A Canvas used as a `placeholderCanvas` or `accompanyingCanvas` may not itself have these properties.

**Behavior values allowed**: `auto-advance`, `no-auto-advance`, `no-repeat`, `hidden`, `repeat`

**Behavior values NOT allowed**: `continuous`, `facing-pages`, `individuals`, `multi-part`, `no-nav`, `non-paged`, `paged`, `sequence`, `thumbnail-nav`, `together`, `unordered`

**Non-hierarchical use**: Limited but possible.
- Canvases have URIs and can be targeted by Content State API
- `partOf` can declare the parent Manifest
- Ranges reference Canvases by URI without owning them
- Same Canvas could theoretically appear in multiple Manifests (rare)

**Ingestion implications**: Each image file becomes a Canvas. You must read image dimensions for `height`/`width`. The Canvas dimensions should match or proportionally relate to the image dimensions. `duration` is for time-based media.

---

### Range

**Purpose**: Defines logical structure within a Manifest—chapters, movements, sections. The table of contents.

**Required properties**: `id`, `type`, `items` (references to Canvases, parts of Canvases, or other Ranges)

**Recommended**: `label`

**Optional**: `metadata`, `summary`, `requiredStatement`, `rights`, `navDate`, `thumbnail`, `homepage`, `seeAlso`, `service`, `services`, `rendering`, `partOf`, `start`, `supplementary`, `annotations`

**Not allowed**: `language`, `height`, `width`, `duration`, `format`, `profile`, `viewingDirection`, `behavior`, `timeMode`, `structures`, `placeholderCanvas`, `accompanyingCanvas`

**Structural**: `items` is required (what the Range contains). `structures` is not allowed (Ranges don't nest via `structures`, they nest via `items`).

**Non-hierarchical use**: Yes, by design.
- Ranges reference Canvases—they don't contain them
- A Canvas can be referenced by multiple Ranges
- Ranges can reference time/space segments of Canvases
- `supplementary` can link to related Annotation Collections (e.g., transcription layer for this chapter)

**Ingestion implications**: Ranges are optional but valuable. If your folder structure has semantic meaning (chapters, sections), that can map to Ranges. Nested folders below the Manifest level could become nested Ranges rather than being flattened.

---

### Annotation Page

**Purpose**: A container for Annotations. Groups them for pagination and performance.

**Required properties**: `id`, `type`, `items` (the Annotations)

**Recommended**: (none explicitly, but `items` with actual annotations is expected)

**Optional**: `label`, `metadata`, `summary`, `requiredStatement`, `rights`, `thumbnail`, `homepage`, `seeAlso`, `service`, `services`, `rendering`, `partOf`

**Not allowed**: `language`, `navDate`, `height`, `width`, `duration`, `format`, `profile`, `viewingDirection`, `behavior`, `timeMode`, `start`, `supplementary`, `structures`, `annotations`, `placeholderCanvas`, `accompanyingCanvas`

**Behavior**: `hidden` is allowed (for non-rendering annotation pages)

**Non-hierarchical use**: Yes.
- Annotation Pages have their own URIs—often served separately (referenced, not embedded)
- Can be attached to any Canvas via `annotations` array
- Content Search API returns Annotation Pages
- External services can provide Annotation Pages that attach to your Canvases

**Ingestion implications**: For basic image display, you create one Annotation Page per Canvas containing the painting annotation for the image. These can be inline or referenced. For OCR/transcription, you'd add additional Annotation Pages to the Canvas's `annotations` array later.

---

### Annotation

**Purpose**: Associates content with a Canvas. Follows W3C Web Annotation model.

**Required properties**: `id`, `type`, `target`, `body` (for most motivations)

**Recommended**: (none specifically, context-dependent)

**Optional**: `label`, `metadata`, `summary`, `requiredStatement`, `rights`, `thumbnail`, `timeMode`, `homepage`, `seeAlso`, `service`, `services`, `rendering`, `partOf`

**Not allowed**: `language`, `navDate`, `height`, `width`, `duration`, `format`, `profile`, `viewingDirection`, `behavior`, `start`, `supplementary`, `structures`, `annotations`, `placeholderCanvas`, `accompanyingCanvas`

**Behavior**: `hidden` is allowed

**Non-hierarchical use**: Inherently non-hierarchical.
- `target` is a URI—can point to any Canvas anywhere
- Multiple bodies allowed (image + transcription)
- Multiple targets allowed (linking annotations)
- Can exist in external annotation stores
- First-class searchable objects via Content Search API

**Ingestion implications**: The "painting" annotation is what actually puts the image on the Canvas. Motivation is `painting`. The `body` points to your image (or IIIF Image API service). The `target` is the Canvas URI.

---

### Annotation Collection

**Purpose**: A collection of Annotation Pages, typically used for content search results or thematic annotation sets.

**Required properties**: `id`, `type`

**Recommended**: `label`

**Optional**: `metadata`, `summary`, `requiredStatement`, `rights`, `thumbnail`, `homepage`, `seeAlso`, `service`, `services`, `rendering`, `partOf`

**Not allowed**: `language`, `navDate`, `height`, `width`, `duration`, `format`, `profile`, `viewingDirection`, `behavior`, `timeMode`, `start`, `supplementary`, `structures`, `annotations`, `placeholderCanvas`, `accompanyingCanvas`

**Behavior**: `hidden` is allowed

**Non-hierarchical use**: Yes.
- Referenced by Ranges via `supplementary` (e.g., "transcriptions for this chapter")
- Returned by Content Search API
- Can aggregate Annotation Pages from multiple sources

**Ingestion implications**: Usually not needed for basic folder-to-IIIF. Becomes relevant when you have searchable text layers or want to group annotations thematically.

---

### Content Resources

**Purpose**: The actual media—images, audio, video, text, VTT files, etc.

**Required properties**: `id`, `type`, `format`

**Recommended**: `thumbnail`

**Optional**: `label`, `metadata`, `summary`, `language`, `height`, `width`, `duration`, `service`, `services`, `rendering`, `partOf`

**Not allowed**: `requiredStatement`, `rights`, `navDate`, `profile`, `viewingDirection`, `behavior`, `timeMode`, `homepage`, `seeAlso`, `start`, `supplementary`, `structures`, `annotations`, `placeholderCanvas`, `accompanyingCanvas`

**Key point**: `height`/`width` are optional here (the Canvas defines the coordinate space), but recommended for performance (lets viewers know dimensions before fetching).

**Non-hierarchical use**: Entirely.
- Just URIs to files
- Same image can be body of multiple Annotations
- IIIF Image API services are completely independent
- Can be on different servers than the Manifest

**Ingestion implications**: This is your image file. You need to determine `format` (MIME type: `image/jpeg`, `image/tiff`, etc.). If using IIIF Image API, the `service` property points to the Image API endpoint. If serving static images, just use the direct image URL.

---

## Property Requirements Summary for Ingestion Tool

**Minimum viable Manifest generation requires:**

| Resource | Must generate |
|----------|---------------|
| Manifest | `id`, `type`, `label`, `items` |
| Canvas | `id`, `type`, `height`, `width`, `items` |
| Annotation Page | `id`, `type`, `items` |
| Annotation | `id`, `type`, `motivation`, `body`, `target` |
| Content Resource | `id`, `type`, `format` (+ `height`/`width` recommended) |

**For Collections, add:**

| Resource | Must generate |
|----------|---------------|
| Collection | `id`, `type`, `label`, `items` |

**What your tool needs to derive from files/folders:**

| Property | Source |
|----------|--------|
| `id` | Generated URI based on your URL scheme + folder/file path |
| `label` | Folder name (or metadata file override) |
| `height`/`width` | Read from image file headers |
| `format` | File extension → MIME type mapping |
| `items` ordering | Filename natural sort (or sequence file override) |

**Behaviors your tool might set based on content detection:**

| Scenario | Suggested behavior |
|----------|-------------------|
| Numbered pages (001.jpg, 002.jpg) | `behavior: ["paged"]`, `viewingDirection: "left-to-right"` |
| Unrelated images in folder | `behavior: ["individuals"]` |
| Audio/video files present | Include `duration`, potentially `behavior: ["auto-advance"]` |
| Mixed content, no clear order | `behavior: ["unordered"]` on Collection |