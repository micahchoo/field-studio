IIIF Field Archive Studio is a local-first application that bridges the gap between unstructured field data and standards-compliant IIIF archives. It provides a visual, browser-based workbench where researchers can organize heterogeneous media, annotate content, map relationships, and export interoperable packages—all without writing code or managing servers.


The ingesting process should have 2 stages

    Clean and structure
    choose how and where manifests will be based on the existing folder structure, add tools to create the resource types in the gui from the iiif presentation api. context menu drag and drop and other ways of CRUD for iiif resource types and structures

    Add metadata - create a spreadsheet where the user can add bulk metadata directly with the option to add fields from dublincore or the extended dublincore


The curation process should allow for remixing of the archive with annotations, other media, interactivity, and custom linkable image requests, adding metadata fields

The synthesis process should have a board which functions as a defacto manifest and canvas painted with other canvas that are dragged in (but are essentially linked by uri) and you can make diagrams and connections with different types of media 

The export process should export all the media, manifests, annotations, collections in a upload ready format with a reedme file with instruction on how to host it and pass values to a iiiif viewer

The overall idea is to build a tool for meaning making in as many ways as possible



# IIIF Image API: Visual Affordances for the Organizer Tool

## The Core Challenge with the Image API

The Image API is fundamentally a **URL construction system** for requesting transformed versions of images. It's not about the image itself—it's about how you *ask* for the image.

Key conceptual distinctions users need to grasp:

- The **identifier** points to underlying image content (which may not be a single file)
- The **parameters** (region/size/rotation/quality/format) describe a *derived* output
- The **info.json** describes server capabilities, not image metadata
- Multiple URIs can produce the same visual result (canonical vs non-canonical)

Metaphors like "cropping" or "resizing" are partially accurate but miss that this is a **request language**, not image editing.

---

## Recommended Visual Affordances

### 1. Image Request as Recipe/Formula

**Why:** Users need to understand they're composing a request, not manipulating the image directly.

**Visual treatment:**
- Show the image with an overlay that represents the *current request parameters*
- Display the URI being constructed in real-time, segmented by parameter
- Parameter changes update both the preview and the URI simultaneously
- Clear visual distinction: "Source image" (full, untransformed) vs "Requested output" (derived)

```
┌─────────────────────────────────────────────┐
│  Source: 6000 × 4000 px                     │
│  ┌─────────────────────────────────────┐    │
│  │   ┌─────────┐                       │    │
│  │   │ region  │  ← draggable overlay  │    │
│  │   │ 125,15  │                       │    │
│  │   │ 120×140 │                       │    │
│  │   └─────────┘                       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Request: .../125,15,120,140/90,/0/default.jpg
│           ───────────────── ─── ─ ───────────
│           region            size rotation    │
└─────────────────────────────────────────────┘
```

**Interactions:**
- Drag on image to define region (updates URI region segment)
- Slider/input for size (shows both pixel values and percentage)
- Rotation dial that snaps to 90° increments but allows arbitrary values
- Quality/format as dropdown selectors

**Avoid:** Photoshop-style "apply crop" workflows—nothing is being *done* to the image; a request is being *composed*

---

### 2. Region as Selection Frame (Not Crop Tool)

**Why:** Region defines what portion of the full image to request, not a destructive crop.

**Visual treatment:**
- Resizable frame overlay on the full image
- Show coordinates updating in real-time (both pixel and percentage modes)
- `full` and `square` as one-click presets that snap the frame
- Out-of-bounds regions show what the server will return (cropped at edge)

**Input modes:**
- **Drag mode:** Draw rectangle directly on image
- **Numeric mode:** Enter x,y,w,h values
- **Percentage mode:** Toggle to show pct: values
- **Presets:** `full`, `square`, or saved selections

**Visual feedback:**
- Dimmed area outside selection (but still visible—this isn't deletion)
- Coordinate display at corners of selection
- Warning indicator if selection extends beyond image bounds

**Avoid:** Scissors icons, "crop" labels, or anything suggesting the original is modified

---

### 3. Size as Output Dimension Specifier

**Why:** Size controls the dimensions of the *returned* image, which may involve scaling but isn't "resizing" the source.

**Visual treatment:**
- Show requested output dimensions alongside source dimensions
- Visual scale indicator (e.g., "1:4" or "25%")
- Clear indication of aspect ratio preservation vs distortion
- Upscaling indicator (^) shown prominently with server capability check

**Size modes with visual cues:**

| Mode | Visual | Behavior |
|------|--------|----------|
| `max` | Bounding box at server limits | Largest without upscaling |
| `^max` | Expanded bounding box | Largest with upscaling allowed |
| `w,` | Width-locked bar | Height scales proportionally |
| `,h` | Height-locked bar | Width scales proportionally |
| `pct:n` | Percentage slider | Uniform scaling |
| `w,h` | Lock icon broken | Aspect ratio may change (distortion warning) |
| `!w,h` | Fit-within box | Constrained to box, maintains ratio |

**Server limits visualization:**
- If `maxWidth`, `maxHeight`, or `maxArea` exist in info.json, show as boundary lines
- Requests exceeding limits should show warning before attempting

**Avoid:** "Resize" buttons or workflows that suggest permanent changes

---

### 4. Rotation as Orientation Dial

**Why:** Rotation happens *after* region and size in the processing order, and can include mirroring.

**Visual treatment:**
- Circular dial control with 90° detents
- Mirror toggle (!) shown as a flip button adjacent to rotation
- Preview shows rotated result with any added transparent areas
- Rotation value displayed (integer preferred, float allowed)

**Key visual feedback:**
- When rotation isn't a multiple of 90°, show transparency warning
- Indicate that output dimensions will change
- Show the processing order: "Region → Size → Mirror → Rotate"

**Avoid:** Suggesting rotation is a viewport change—it's part of the request

---

### 5. Quality and Format as Output Settings

**Why:** These determine the rendering characteristics of the returned image.

**Visual treatment:**
- Quality as visual preview tiles: `color | gray | bitonal | default`
- Format as file type selector with size/compatibility notes
- Server's `preferredFormats` highlighted as recommended options
- `extraQualities` and `extraFormats` shown as available options

**Format guidance:**
- Show MIME type alongside extension
- Note when format supports transparency (relevant for non-90° rotation)
- Indicate lossy vs lossless

**Avoid:** Implying quality affects the source image

---

### 6. Info.json as Server Capabilities Panel

**Why:** The info.json describes what the *server* can do, not what the *image* is.

**Visual treatment:**
- Collapsible "Server Info" panel
- Capability badges: compliance level, supported features
- Available sizes shown as thumbnail options
- Tile grid visualization (if tiles defined)

**Key displays:**

| Property | Visual Treatment |
|----------|------------------|
| `width`, `height` | Shown on source image frame |
| `sizes` | Clickable thumbnail strip |
| `tiles` | Grid overlay option on source image |
| `profile` | Compliance badge (level0/1/2) |
| `extraFeatures` | Feature pills (e.g., "arbitrary rotation", "mirroring") |
| `maxWidth`/`maxHeight`/`maxArea` | Boundary indicators on size controls |

**Interactions:**
- Click a `sizes` entry to populate size parameters
- Toggle tile grid visibility to understand efficient request patterns
- Feature badges affect which controls are enabled

**Avoid:** Conflating server capabilities with image metadata (EXIF, etc.)

---

### 7. URI Preview as Live Construction

**Why:** The URI *is* the request—users should see it being built.

**Visual treatment:**
- Always-visible URI bar, segmented by parameter
- Each segment color-coded and clickable to edit
- Canonical vs current URI indicator
- Copy button for the constructed URI

```
https://example.org/image-service/abcd1234/125,15,120,140/90,/0/default.jpg
└──────────────────────────────────────┘ └──────────────┘ └──┘└┘ └─────────┘
          base URI (identifier)             region       size rot  qual.fmt
```

**Interactions:**
- Click segment to focus that control
- Paste a URI to populate all controls
- Toggle between canonical and convenient forms
- Validation feedback (highlights invalid segments)

---

## Processing Order Visualization

Users must understand the parameter sequence isn't arbitrary—it's the operation order.

**Visual treatment:**

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  FULL   │ →  │ REGION  │ →  │  SIZE   │ →  │ ROTATE  │ →  │ OUTPUT  │
│  IMAGE  │    │ extract │    │  scale  │    │ mirror  │    │ quality │
│         │    │         │    │         │    │         │    │ format  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

- Show intermediate results at each step (optional, for learning mode)
- Emphasize that changing region affects what gets scaled/rotated

---

## Affordances for Batch/Collection Use

When working with multiple images in the organizer:

### Saved Request Templates

- Save parameter combinations (region type, size, quality, format) as templates
- Apply templates across multiple images
- Template understands relative values (`pct:` regions, `max` size) vs absolute

### Quick Derivatives Panel

- One-click generation of common derivatives: thumbnail, square crop, grayscale
- Show all generated URIs for an image in a list
- Batch export URIs for external use

### Tile Efficiency Hints

- When `tiles` info exists, suggest efficient request patterns
- Visual indicator when a request matches a tile boundary
- "Optimize" button that snaps to nearest efficient parameters

---

## Dangerous Metaphors to Avoid

| Metaphor | Why It's Wrong | Better Framing |
|----------|----------------|----------------|
| "Edit this image" | Nothing is being edited—requests are constructed | "Configure request" |
| "Crop" | Region selection, not destructive cropping | "Select region" |
| "Save changes" | No changes to save—each URI is a new request | "Copy URI" or "Use this request" |
| "Original vs edited" | All outputs are derived; source is unchanged | "Source" vs "Requested output" |
| "Image settings" | These are *request* parameters, not image properties | "Request parameters" |
| "File" | The identifier may not correspond to a file | "Image resource" or "Image content" |

---

## Integration with Presentation API

When used within the larger organizer tool:

### From Canvas to Image Request

- When a Canvas has a painting annotation with an Image body, show:
  - The Image service link (if available)
  - Quick access to the Image API controls
  - How the image is positioned on the Canvas coordinate space

### Service Discovery

- Parse `service` property from image bodies in Annotations
- Auto-load info.json to populate capability controls
- Indicate compliance level and available features

### Thumbnail Generation

- Use Image API to generate thumbnails for Canvas/Manifest display
- Suggest efficient thumbnail sizes based on `sizes` in info.json
- Store thumbnail URIs (not images) in `thumbnail` properties

---

## Summary: Key Principles

| Principle | Implementation |
|-----------|----------------|
| **Request, not edit** | Always show the URI being constructed |
| **Derived, not modified** | Clear visual separation of source vs output |
| **Ordered operations** | Show region→size→rotation→quality→format flow |
| **Server capabilities** | info.json determines what controls are available |
| **Canonical preference** | Guide users toward canonical URI forms |
| **Efficiency awareness** | Surface tile/size hints for optimal requests |

The Image API visual language should consistently reinforce: *You're writing a URL that describes what you want—the server does the work.*

# Offline Functionalities: Presentation + Image API Combined

## The Fundamental Tension

IIIF is built around URLs and HTTP requests. Offline work requires:
- **Pre-fetching** what you'll need (anticipatory caching)
- **Local authoring** that syncs later (deferred publishing)
- **Graceful degradation** when resources aren't available

The tool must help users understand: *What do I have locally?* vs *What exists only as a reference?*

---

## Offline Resource States

Every resource in the tool needs a clear visual state:

| State | Visual Treatment | Meaning |
|-------|------------------|---------|
| **Cached** | Solid border, full opacity | Available offline at specific parameters |
| **Stub** | Dashed border, dimmed | JSON reference exists, content not downloaded |
| **Local-only** | Badge/icon, distinct color | Created offline, not yet published |
| **Stale** | Warning indicator | Cached but source may have changed |
| **Conflict** | Red indicator | Local and remote versions differ |

---

## Offline Capabilities by Resource Type

### Collections & Manifests

**What works offline:**
- Full navigation of cached Collection/Manifest hierarchy
- Reading all metadata (labels, summaries, descriptions)
- Viewing structure (Canvas sequence, Ranges)
- Creating new Manifests/Collections locally
- Editing metadata on cached or local resources
- Reordering Canvases within a Manifest
- Creating/editing Range structures

**Visual affordances:**

```
┌─────────────────────────────────────────────────┐
│ 📁 Field Collection [LOCAL]                     │
│ ├─ 📄 Site A Survey [CACHED ✓]                  │
│ │   └─ 12 Canvases (8 cached, 4 stub)          │
│ ├─ 📄 Site B Survey [LOCAL]                     │
│ │   └─ 6 Canvases (all local)                  │
│ └─ 📄 Reference Manuscript [STUB ○]             │
│     └─ 234 Canvases (not available offline)    │
└─────────────────────────────────────────────────┘
```

**Interactions:**
- "Prepare for offline" button that fetches full JSON tree
- Manifest/Collection editor works identically online or offline
- Sync indicator shows pending uploads

---

### Canvases

**What works offline:**
- Viewing cached Canvas content (images at downloaded parameters)
- Creating new Canvases with local media
- Editing Canvas metadata and dimensions
- Associating local images with Canvases
- Viewing/creating Annotations on cached Canvases

**The critical insight:** A Canvas is an abstract coordinate space. It can exist offline without any painted content—it just won't render anything.

**Visual affordances:**

```
┌─────────────────────────────────────────┐
│ Canvas: "Page 23"  [PARTIAL]            │
│ Dimensions: 4000 × 3000                 │
│ ┌─────────────────────────────────┐     │
│ │                                 │     │
│ │    [Thumbnail cached]           │     │
│ │    Full image: NOT AVAILABLE    │     │
│ │    Click to queue download      │     │
│ │                                 │     │
│ └─────────────────────────────────┘     │
│                                         │
│ Annotations: 3 cached, 2 local          │
└─────────────────────────────────────────┘
```

**Offline Canvas creation workflow:**
1. User captures/imports local image
2. Tool creates Canvas with dimensions matching image
3. Tool creates painting
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
## 1. Critical Issues

### 1.1 Image Service Type in info.json

**Spec states (Section 8.1):**
```json
"service": [{
  "id": "{image_service_uri}",
  "type": "ImageService3",
  "profile": "level2"
}]
```

**Issue:** The info.json example is incomplete. The `@context` is required, and `protocol` is a required property.

**Correct structure:**
```json
{
  "@context": "http://iiif.io/api/image/3/context.json",
  "id": "https://example.org/iiif/image/{identifier}",
  "type": "ImageService3",
  "protocol": "http://iiif.io/api/image",
  "profile": "level2",
  "width": 6000,
  "height": 4000
}
```

**Required properties per Image API 3.0:**
- `@context` (Required)
- `id` (Required)
- `type` (Required — must be "ImageService3")
- `protocol` (Required — must be "http://iiif.io/api/image")
- `profile` (Required — "level0", "level1", or "level2")
- `width` (Required)
- `height` (Required)

### 1.2 Canvas Dimension Requirements

**Spec states (Section 3.3):**
> Canvas (image file or subfolder)

**Issue:** The spec doesn't emphasize that a Canvas MAY have width/height (for spatial content) and/or duration (for temporal content), but if it has width it MUST also have height (and vice versa). A Canvas without any dimensions is technically valid but unusual.

**Per Presentation API 3.0:**
- A Canvas MAY have `height` and `width`. If it has one, it MUST have both.
- A Canvas MAY have `duration` for time-based media.
- A Canvas can have both spatial and temporal dimensions.

### 1.3 Manifest items Requirement

**Spec implies:**
Manifests can be empty during construction.

**Per Presentation API 3.0:**
> A Manifest MUST have the `items` property with at least one item. Each item MUST be a Canvas.

**Correction needed:** The spec should note that valid IIIF Manifests require at least one Canvas. During editing, the application may allow empty Manifests but must warn before export.

### 1.4 Collection items Requirement

**Spec states (Section 3.2):**
> Collection (folder with underscore prefix: _name)

**Per Presentation API 3.0:**
> A Collection MUST have the `items` property. Each item MUST be either a Collection or a Manifest.

**Note:** Empty Collections are technically valid (items can be an empty array), but the spec should clarify this.

### 1.5 Content Search API Service Type

**Spec states (Section 8.3):**
> GET /search/{manifest_id}?q={query}

**Issue:** The spec doesn't mention declaring the search service in the Manifest.

**Correct declaration per Content Search API 2.0:**
```json
{
  "service": [
    {
      "id": "https://example.org/services/identifier/search",
      "type": "SearchService2"
    }
  ]
}
```

**Note:** The service type is `SearchService2` (not `ContentSearchService` or similar).

---

## 2. Terminology Issues

### 2.1 "painting" as Annotation Type vs. Motivation

**Spec states (Section 3.4):**
> | Motivation | Convention File | Use Case |
> | `painting` | Image/video/audio in canvas folder | Primary content |

**Clarification needed:** `painting` is a motivation value, not a type. The spec correctly uses it as motivation but should be more explicit that:
- Annotations with `motivation: "painting"` provide the visual/audible content OF the Canvas
- These go in `Canvas.items[].items[]` (nested in AnnotationPage)

### 2.2 "supplementing" vs "supplementing"

**Spec is correct** in using `supplementing` (not `supplement`). Just ensuring consistency throughout.

### 2.3 Behavior Values

**Spec states (Section 5.2):**
> | Value | Use Case | Visual |
> | `paged` | Book-like page turning | 📖 |
> | `continuous` | Long scroll (panoramas) | 📜 |
> | `individuals` | Distinct images (default) | 🖼️ |
> | `unordered` | No inherent sequence | 🔀 |

**Issue:** Missing important behavior values and inheritance rules.

**Complete behavior values per Presentation API 3.0:**

**Temporal Behaviors:**
- `auto-advance` — proceed to next Canvas automatically
- `no-auto-advance` — default, don't auto-advance
- `repeat` — loop back to beginning
- `no-repeat` — default, don't loop

**Layout Behaviors:**
- `unordered` — no inherent order
- `individuals` — distinct views, no page-turning (DEFAULT)
- `continuous` — virtually stitched together
- `paged` — page-turning interface

**Canvas-specific:**
- `facing-pages` — Canvas shows both pages of opening
- `non-paged` — skip in page-turning interface

**Collection-specific:**
- `multi-part` — logical whole across multiple Manifests
- `together` — show all children simultaneously

**Range-specific:**
- `sequence` — alternative ordering
- `thumbnail-nav` — thumbnail-based navigation
- `no-nav` — don't show in navigation

**Miscellaneous:**
- `hidden` — don't render by default

**Critical inheritance rules:**
- Collections inherit from parent Collection
- Manifests DO NOT inherit from Collections
- Canvases inherit from Manifest, NOT from Ranges
- Ranges inherit from parent Range and Manifest

### 2.4 viewingDirection Values

**Spec is correct** with the four values:
- `left-to-right` (default)
- `right-to-left`
- `top-to-bottom`
- `bottom-to-top`

---

## 3. Missing Required Elements

### 3.1 @context Property

**Issue:** The spec's JSON examples often omit `@context`.

**Per Presentation API 3.0:**
> The `@context` property SHOULD appear as the very first key-value pair.

**Required context for Presentation API 3.0:**
```json
"@context": "http://iiif.io/api/presentation/3/context.json"
```

**Required context for Content Search API 2.0:**
```json
"@context": "http://iiif.io/api/search/2/context.json"
```

### 3.2 Label Language Map Structure

**Spec example (Section 3.3):**
```json
"label": { "en": ["{folder_name}"] }
```

**This is correct.** Labels MUST be language maps with arrays of strings:
```json
"label": { "en": [ "Example Object Title" ] }
```

**Important notes:**
- Use `"none"` for language-neutral labels (e.g., page numbers, identifiers)
- Values are always arrays, even for single strings
- Multiple languages are supported

### 3.3 Missing homepage, rendering, seeAlso Properties

The spec mentions these linking properties but doesn't provide examples.

**Per Presentation API 3.0:**

**homepage** — web page about the resource:
```json
"homepage": [
  {
    "id": "https://example.com/info/",
    "type": "Text",
    "label": { "en": [ "Homepage" ] },
    "format": "text/html"
  }
]
```

**rendering** — alternative representations:
```json
"rendering": [
  {
    "id": "https://example.org/1/book.pdf",
    "type": "Text",
    "label": { "en": [ "PDF Version" ] },
    "format": "application/pdf"
  }
]
```

**seeAlso** — machine-readable descriptions:
```json
"seeAlso": [
  {
    "id": "https://example.org/library/catalog/book1.xml",
    "type": "Dataset",
    "format": "text/xml",
    "profile": "https://example.org/profiles/bibliographic"
  }
]
```

### 3.4 Provider Property

**Missing from spec.** The `provider` property describes the organization responsible for the resource.

```json
"provider": [
  {
    "id": "https://example.org/about",
    "type": "Agent",
    "label": { "en": [ "Example Organization" ] },
    "homepage": [
      {
        "id": "https://example.org/",
        "type": "Text",
        "label": { "en": [ "Example Organization Homepage" ] },
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
]
```

### 3.5 navDate Property

**Spec mentions it** but doesn't explain properly.

**Per Presentation API 3.0:**
- `navDate` is for navigation/sorting purposes
- Format: ISO 8601 datetime (YYYY-MM-DDThh:mm:ssZ)
- Valid on: Collection, Manifest, Range, Canvas

```json
"navDate": "1856-01-01T00:00:00Z"
```

---

## 4. Behavioral Inaccuracies

### 4.1 Annotation Target Structure

**Spec example (Section 9.1):**
```json
"target": {
  "type": "SpecificResource",
  "source": "https://example.org/canvas/1",
  "selector": {
    "type": "FragmentSelector",
    "conformsTo": "http://www.w3.org/TR/media-frags/",
    "value": "xywh=100,200,300,150"
  }
}
```

**Issue:** When targeting a whole Canvas, you can use just the Canvas URI:
```json
"target": "https://example.org/canvas/1"
```

The SpecificResource pattern is only needed when using selectors.

### 4.2 Fragment Selector Syntax

**Spec shows:**
```json
{ "type": "FragmentSelector", "value": "xywh=100,100,200,150" }
```

**This is correct** but incomplete. The spec should clarify:

**Spatial (pixels):**
```
xywh=x,y,w,h
```

**Spatial (percentage):**
```
xywh=percent:x,y,w,h
```

**Temporal:**
```
t=start,end
```

**Combined:**
```
xywh=100,100,200,150&t=10,20
```

### 4.3 Canvas items vs annotations

**Spec conflates these.** Important distinction:

**Canvas.items** — AnnotationPages containing "painting" Annotations (content OF the Canvas)
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

**Canvas.annotations** — References to AnnotationPages containing non-painting Annotations (content ABOUT the Canvas)
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

### 4.4 Range Structure

**Spec example needs correction.** Ranges can reference:
1. Whole Canvases
2. Parts of Canvases (using SpecificResource)
3. Other Ranges

**Correct Range structure:**
```json
{
  "id": "https://example.org/iiif/book1/range/r1",
  "type": "Range",
  "label": { "en": [ "Introduction" ] },
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
    }
  ]
}
```

### 4.5 structures Property

**Spec mentions it** but doesn't show correct location.

**Per Presentation API 3.0:**
- `structures` is a property of Manifest (not Canvas or Range)
- Contains an array of Range resources
- Typically starts with a root Range that contains child Ranges

```json
{
  "type": "Manifest",
  "structures": [
    {
      "id": "https://example.org/manifest/range/toc",
      "type": "Range",
      "label": { "en": [ "Table of Contents" ] },
      "items": [
        { "type": "Range", ... },
        { "type": "Range", ... }
      ]
    }
  ]
}
```

---

## 5. Content Search API Specifics

### 5.1 Service Declaration

**Correct per Content Search API 2.0:**
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

### 5.2 Query Parameters

**Per Content Search API 2.0:**
- `q` — search terms (REQUIRED to support)
- `motivation` — filter by motivation
- `date` — filter by date
- `user` — filter by creator

**Example:**
```
GET /search/manifest1?q=bird&motivation=supplementing
```

### 5.3 Response Structure

**Simple response:**
```json
{
  "@context": "http://iiif.io/api/search/2/context.json",
  "id": "https://example.org/search/manifest1?q=bird",
  "type": "AnnotationPage",
  "items": [
    {
      "id": "https://example.org/annotation/1",
      "type": "Annotation",
      "motivation": "supplementing",
      "body": {
        "type": "TextualBody",
        "value": "...matching text...",
        "format": "text/plain"
      },
      "target": "https://example.org/canvas/1#xywh=100,100,250,20"
    }
  ]
}
```

---

## 6. Image API Specifics

### 6.1 URI Template

**Correct per Image API 3.0:**
```
{scheme}://{server}{/prefix}/{identifier}/{region}/{size}/{rotation}/{quality}.{format}
```

### 6.2 Region Parameter

| Value | Description |
|-------|-------------|
| `full` | Full image |
| `square` | Square region from center |
| `x,y,w,h` | Pixels from top-left |
| `pct:x,y,w,h` | Percentages |

### 6.3 Size Parameter

| Value | Description |
|-------|-------------|
| `max` | Maximum size without upscaling |
| `^max` | Maximum size with upscaling |
| `w,` | Width (height calculated) |
| `,h` | Height (width calculated) |
| `pct:n` | Percentage |
| `w,h` | Exact dimensions |
| `!w,h` | Best fit within dimensions |
| `^w,h` | Exact with upscaling |

### 6.4 Rotation Parameter

| Value | Description |
|-------|-------------|
| `0` | No rotation |
| `90`, `180`, `270` | Degrees clockwise |
| `!0`, `!90`, etc. | Mirror then rotate |

### 6.5 Quality Parameter

| Value | Description |
|-------|-------------|
| `default` | Server's default |
| `color` | Full color |
| `gray` | Grayscale |
| `bitonal` | Black and white |

### 6.6 Order of Operations

**Critical:** Region → Size → Rotation → Quality → Format

---

## 7. Corrected Examples

### 7.1 Complete Manifest Example

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/iiif/book1/manifest",
  "type": "Manifest",
  "label": { "en": [ "Book Title" ] },
  "summary": { "en": [ "A description of this book." ] },
  "metadata": [
    {
      "label": { "en": [ "Creator" ] },
      "value": { "en": [ "Author Name" ] }
    },
    {
      "label": { "en": [ "Date" ] },
      "value": { "en": [ "circa 1850" ] }
    }
  ],
  "requiredStatement": {
    "label": { "en": [ "Attribution" ] },
    "value": { "en": [ "Provided by Example Institution" ] }
  },
  "rights": "http://creativecommons.org/licenses/by/4.0/",
  "provider": [
    {
      "id": "https://example.org/about",
      "type": "Agent",
      "label": { "en": [ "Example Institution" ] }
    }
  ],
  "viewingDirection": "left-to-right",
  "behavior": [ "paged" ],
  "navDate": "1850-01-01T00:00:00Z",
  "items": [
    {
      "id": "https://example.org/iiif/book1/canvas/p1",
      "type": "Canvas",
      "label": { "none": [ "p. 1" ] },
      "height": 4000,
      "width": 3000,
      "items": [
        {
          "id": "https://example.org/iiif/book1/page/p1/1",
          "type": "AnnotationPage",
          "items": [
            {
              "id": "https://example.org/iiif/book1/annotation/p1-image",
              "type": "Annotation",
              "motivation": "painting",
              "body": {
                "id": "https://example.org/iiif/book1/page1/full/max/0/default.jpg",
                "type": "Image",
                "format": "image/jpeg",
                "height": 4000,
                "width": 3000,
                "service": [
                  {
                    "id": "https://example.org/iiif/book1/page1",
                    "type": "ImageService3",
                    "profile": "level2"
                  }
                ]
              },
              "target": "https://example.org/iiif/book1/canvas/p1"
            }
          ]
        }
      ],
      "annotations": [
        {
          "id": "https://example.org/iiif/book1/comments/p1",
          "type": "AnnotationPage"
        }
      ]
    }
  ],
  "structures": [
    {
      "id": "https://example.org/iiif/book1/range/toc",
      "type": "Range",
      "label": { "en": [ "Table of Contents" ] },
      "items": [
        {
          "id": "https://example.org/iiif/book1/range/chapter1",
          "type": "Range",
          "label": { "en": [ "Chapter 1" ] },
          "items": [
            {
              "id": "https://example.org/iiif/book1/canvas/p1",
              "type": "Canvas"
            }
          ]
        }
      ]
    }
  ]
}
```

### 7.2 Complete Collection Example

```json
{
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/iiif/collection/top",
  "type": "Collection",
  "label": { "en": [ "2023 Field Season" ] },
  "summary": { "en": [ "Materials from the 2023 excavation." ] },
  "requiredStatement": {
    "label": { "en": [ "Attribution" ] },
    "value": { "en": [ "Example Institution" ] }
  },
  "items": [
    {
      "id": "https://example.org/iiif/manifest/site-a",
      "type": "Manifest",
      "label": { "en": [ "Site A" ] }
    },
    {
      "id": "https://example.org/iiif/collection/finds",
      "type": "Collection",
      "label": { "en": [ "Finds" ] }
    }
  ]
}
```

### 7.3 Correct Web Annotation Example

```json
{
  "@context": "http://www.w3.org/ns/anno.jsonld",
  "id": "https://example.org/annotation/1",
  "type": "Annotation",
  "motivation": "commenting",
  "created": "2024-01-15T12:00:00Z",
  "creator": {
    "id": "https://example.org/users/researcher1",
    "type": "Person",
    "name": "Jane Researcher"
  },
  "body": {
    "type": "TextualBody",
    "value": "This appears to be a later addition.",
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

---

## 8. Recommendations for Field Archive Studio Spec

### 8.1 Add Validation Rules Section

Include explicit validation requirements:
- Manifest must have at least one Canvas
- Canvas with width must have height
- Collection/Manifest must have label
- Valid language codes per BCP 47
- Valid rights URIs (Creative Commons or RightsStatements.org)

### 8.2 Clarify @context Requirements

Add a section explaining:
- When to use Presentation API context
- When to use Web Annotation context  
- When to use Image API context
- How to combine contexts

### 8.3 Add Content State API Support

For sharing/deep-linking, implement Content State API 1.0:
- Export content states for bookmarking
- Accept content states via `iiif-content` parameter
- Support all four content state forms (full annotation, annotation URI, target body, target URI)

### 8.4 Document Service Type Strings

Create reference table:
| Service | Type String |
|---------|-------------|
| Image API 3.0 | `ImageService3` |
| Image API 2.x | `ImageService2` |
| Content Search 2.0 | `SearchService2` |
| Autocomplete 2.0 | `AutoCompleteService2` |
| Auth 1.0 Cookie | `AuthCookieService1` |
| Auth 1.0 Token | `AuthTokenService1` |

### 8.5 Add timeMode Documentation

For AV content, document the `timeMode` property on Annotations:
- `trim` (default) — cut content at Canvas end
- `scale` — stretch/compress to fit
- `loop` — repeat to fill duration

---

## 9. Summary of Required Changes

| Section | Issue | Priority |
|---------|-------|----------|
| 3.3 | Add `@context` to all JSON examples | Critical |
| 8.1 | Add `protocol` to Image info.json | Critical |
| 5.2 | Complete behavior values list | High |
| 5.2 | Add behavior inheritance rules | High |
| 3.3 | Clarify Canvas.items vs Canvas.annotations | High |
| 8.3 | Use `SearchService2` type | High |
| 3.3 | Add `provider` property | Medium |
| 9.1 | Simplify target when no selector | Medium |
| Various | Add `navDate` documentation | Medium |
| New | Add Content State API section | Medium |
| New | Add validation rules section | Medium |