# Architecture Inspiration & Patterns

**Last Updated**: 2026-01-23
**Core Philosophy**: Local-First, Standards-Based, Ecosystem-Aligned

---

## 1. 🏛️ Core Architecture (The Vault Pattern)

**Source**: Digirati IIIF Manifest Editor (`@iiif/vault`)
**Context**: State management for complex nested structures like IIIF Manifests.

### ✅ Normalized State
**Problem**: Deeply nested JSON-LD (Manifest > Canvas > Annotation) causes render performance issues and update complexity.
**Pattern**: Flatten the tree into normalized stores by entity type.
```typescript
interface NormalizedState {
  entities: {
    Collection: Record<string, IIIFCollection>;
    Manifest: Record<string, IIIFManifest>;
    Canvas: Record<string, IIIFCanvas>;
  };
  references: Record<string, string[]>;  // parent → children
  reverseRefs: Record<string, string>;   // child → parent
}
```

### ✅ Action-Driven Mutations
**Problem**: Direct mutation of state is error-prone and hard to track.
**Pattern**: Use typed actions with pre-mutation validation.
```typescript
dispatch(actions.updateLabel(id, { en: ['New Title'] }));
dispatch(actions.addCanvas(manifestId, canvas));
```

### ✅ Undo/Redo System
**Problem**: Users need safety when editing complex documents.
**Pattern**: `ActionHistory` class recording inverse actions for every mutation.

---

## 2. 🔌 Integration & Interoperability

**Context**: Bridging the gap between the application's internal model and the external IIIF ecosystem.

### ✅ Spec Bridge (V2 ↔ V3)
**Problem**: The ecosystem is split between IIIF Presentation 2.0 and 3.0.
**Pattern**: "Normalize on Ingest". Convert all incoming V2 manifests to V3 internally. Export as V3.
- **Mechanics**: Detect version via `@context`. Map `sequences` to `items`, `viewingHint` to `behavior`.

### ✅ Selector Abstraction
**Problem**: URI Fragments (`#xywh=`) are hard to manipulate programmatically.
**Pattern**: Parse fragments into editable objects.
```typescript
// From: canvas.json#xywh=100,100,500,300
// To: { type: 'fragment', spatial: { x: 100, y: 100, w: 500, h: 300 } }
```

---

## 3. 🚀 Emerging IIIF Patterns

**Context**: Capabilities enabled by the latest IIIF specifications (Auth 2.0, Search 2.0, Content State 1.0).

### 🧩 Probe-First Authorization
**Source**: IIIF Authorization Flow API 2.0
- **Problem**: Avoiding 401 errors and broken images for restricted content.
- **Pattern**: Send a "Probe" request to `AuthProbeService2` before requesting the actual resource.
- **Flow**: `Probe` -> `401` -> `Access Service (Login)` -> `Token Service` -> `Probe (OK)` -> `Resource`.

### 🔍 Annotation-Based Search
**Source**: IIIF Content Search API 2.0
- **Problem**: Decoupling search results from viewer rendering logic.
- **Pattern**: Return search hits as an `AnnotationPage`.
- **Mechanics**: Use `TextQuoteSelector` to describe the match and `motivation: highlighting` to instruct the viewer to render it.

### 🔗 Deep Linking via Content State
**Source**: IIIF Content State API 1.0
- **Problem**: Sharing a specific view (zoom, time, rotation) portably.
- **Pattern**: Encode a minimalist Annotation as a base64url parameter.
- **Protocol**: `?iiif-content={base64url(JSON-LD Annotation)}`.

### 🎼 Canvas-Bound Accompaniment
**Source**: Presentation API 3.0 (Audio Recipe)
- **Problem**: Synchronizing a score or slide deck with an audio track.
- **Pattern**: Use the `accompanyingCanvas` property on the main (audio) Canvas.
- **Mechanics**: Viewer renders Main Canvas (Audio) and Accompanying Canvas (Image) simultaneously.

---

## 4. 🧪 Ecosystem Lessons (Tropy & Wax)

**Context**: Patterns extracted from leading tools in the "Personal Archiving" space.

### 📦 The Archive Layer (Media Management)

#### Non-Destructive Metadata (Tropy)
- **Problem**: Preserving original files while allowing user edits.
- **Pattern**: Treat source images as immutable. Store "manipulations" (crop, rotate) as IIIF Annotation parameters or Image API URLs, never by modifying the file.

#### Content-Addressable Storage (Tropy)
- **Problem**: Detecting duplicates and tracking moved files.
- **Pattern**: Generate SHA-256 hashes on ingest. Use the hash as the internal fingerprint to link Metadata to Files.

### 📚 The Collections Layer (Metadata)

#### Template-Based Mapping (Tropy Plugin)
- **Problem**: Users have diverse metadata needs (Dublin Core, Darwin Core, custom).
- **Pattern**: Allow users to define "Metadata Profiles". Map these internal fields to standard IIIF `metadata` label/value pairs on export.

#### Manifest as Proxy (Wax)
- **Problem**: Bi-directional navigation.
- **Pattern**: Every generated Manifest includes:
  - `partOf`: pointing to its parent Collection.
  - `homepage`: pointing to the Board/Project where it was created.

### 📋 The Boards Layer (Spatial Organization)

#### Spatial Spreadsheet (Tropiiify)
- **Problem**: Transcription and annotation of visual details.
- **Pattern**: "Focus-Link". Selecting a transcription row zooms the view to the corresponding image region (`#xywh`). Selecting the region highlights the row.

#### Infinite Canvas (Tropiiify)
- **Problem**: Arranging heterogeneous media.
- **Pattern**: Treat the "Board" itself as a giant IIIF Canvas. "Pinning" an image creates a Painting Annotation targeting a region of that giant Canvas.

### 📡 Publication & Distribution

#### Static-First Infrastructure (Wax)
- **Problem**: Long-term preservation and low-cost hosting.
- **Pattern**: "Bake" the archive.
  - Pre-generate IIIF Image API tiles (Level 0).
  - Generate search indices as static JSON.
  - Output a self-contained HTML/JS bundle that runs without a backend.

---

## 5. 🗺️ Implementation Status

| Phase | Status | Items |
|-------|--------|-------|
| **1. Foundation** | ✅ Complete | Vault, Actions, Undo/Redo, LanguageString, Entity Hooks |
| **2. Integration** | ✅ Complete | Spec Bridge, Selector Abstraction, App.tsx Migration |
| **2.5 UX Polish** | ✅ Complete | Metadata Complexity, Search Autocomplete, Polygon Tool |
| **3. Refinement** | ✅ Complete | Extension Preservation, File Hashing (SHA-256), Activity Stream |
| **4. Advanced** | 🔲 Next | **Discovery & Access** (Auth, Search, Content State), **AV Support** |


This is an excellent architectural foundation. To flesh this out further—incorporating real-world constraints, specific examples, and future-proofing against "similar app" pitfalls (like those seen in Mirador, Annona, or Allmaps)—we can expand on **Validation**, **Performance Logic**, and the **"Semantic Bridge."**

Here are the additions to flesh out your documentation:

---

## 6. 🧠 Advanced Logic & "The Semantic Bridge"

### ✅ Annotation-as-Relationship (The "Linker" Pattern)
**Problem**: Standard annotations usually describe *one* target. Field research requires describing the *relationship* between two targets (e.g., "This shard in Photo A matches the break-pattern in Photo B").
**Pattern**: Use a `Motivation: linking` annotation with multiple `targets` or a `body` that points to a second `SpecificResource`.
- **Implementation**: 
    ```json
    {
      "motivation": "linking",
      "body": { "id": "canvas-B-id", "type": "Canvas", "label": "Matches Fragment" },
      "target": "canvas-A-id#xywh=100,100,50,50"
    }
    ```
- **UX Pattern**: "The String Tool." Click Image A, drag a line to Image B. The app generates a bi-directional Web Annotation.

### ✅ The "Mesa" Layout Pattern (Nested Zoom)
**Source**: Inspired by *Allmaps* and *Mirador*.
**Problem**: On an "Infinite Board," users lose the ability to use the standard OpenSeadragon zoom because there are multiple independent coordinate systems.
**Pattern**: **Coordinate Transformation Layer.**
- The "Board" has a global coordinate system (0 to 1,000,000).
- Each "Placed Image" has a local IIIF Canvas coordinate system.
- **Logic**: A middle-ware function translates Board-Clicks to Canvas-Coordinates using a CSS `matrix3d` or `transform` mapping.

---

## 7. ⚠️ Issues, Concerns & Mitigations

### 🔴 The "Link Rot" Crisis (Stability)
- **Concern**: Field researchers often rely on external IIIF manifests (from museums/archives). If the museum changes its URL scheme, the researcher’s "Board" breaks.
- **Pattern: "Shadow Manifesting"**: Upon ingest, the app creates a local "Shadow" copy of the external Manifest's JSON and cached thumbnails. 
- **Future-Proofing**: Use the `source` property in Web Annotations to point to the original URI, but keep a `canonical` local ID for internal Board rendering.

### 🔴 Performance: The "500-Canvas Board" (Scalability)
- **Concern**: Rendering 500 IIIF Canvases on a single Board will crash the browser's memory.
- **Pattern: Viewport-Aware Hydration**:
    - **Level 1 (Far Zoom)**: Render only the `thumbnail` (static JPEG) of the image.
    - **Level 2 (Medium Zoom)**: Render a low-resolution IIIF Image tile.
    - **Level 3 (Focus)**: Initialize the full Deep-Zoom (OpenSeadragon/Leaflet) only for the image(s) currently in the viewport.

### 🔴 Metadata Fragility (Schema Drift)
- **Concern**: Users might change their Metadata Template (e.g., from Dublin Core to a custom archaeology schema) mid-project.
- **Pattern: Manifest Versioning**: Store a `version` or `hash` in the Manifest's `service` block. If the template changes, flag the Manifest as "Out of Sync" until the user re-maps the fields.

---


## 8. 🛠️ Implementation Examples 

### Example: Converting a Tropy Item to a IIIF Board Element
**Goal**: Drag an item from the "Archive" sidebar onto a "Board."

1.  **Extract**: Get SHA-256 hash from Tropy-style metadata.
2.  **Generate**: Create a `painting` annotation.
    ```typescript
    const annotation = {
      id: `unique-anno-id`,
      type: "Annotation",
      motivation: "painting",
      body: {
        id: "https://image-server.local/iiif/3/image-hash/full/max/0/default.jpg",
        type: "Image",
        service: [{ id: "https://image-server.local/iiif/3/image-hash", type: "ImageService3" }]
      },
      target: `https://my-app.local/boards/1#xywh=${dropX},${dropY},${imageW},${imageH}`
    };
    ```
3.  **Dispatch**: `dispatch(actions.addAnnotation(boardCanvasId, annotation))` to update the Vault state.

---

### Revised Implementation Status Additions:
- [ ] **Next**: **Offline-First PWA Support** (Caching Image API tiles for field use via Service Workers).
- [ ] **Next**: **CORS Proxying** (Handling non-CORS compliant IIIF manifests from legacy library servers).
- [ ] **Next**: **Multi-Temporal Canvases** (Layering "Past Excavation Photo" over "Current Photo" via transparency sliders).