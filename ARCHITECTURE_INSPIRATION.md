# Architecture Inspiration: Digirati Manifest Editor Patterns

**Analysis Date**: 2026-01-23
**Source**: Digirati IIIF Manifest Editor (`@iiif/vault`, `@iiif/parser`)
**Implementation Status**: Phase 1 Complete ✅

---

## 1. Anti-Patterns (RESOLVED)

| Anti-Pattern | Status | Solution |
|--------------|--------|----------|
| Deep Clone Updates | ✅ Fixed | `services/vault.ts` - O(1) immutable updates |
| Nested Tree Traversal | ✅ Fixed | Flat entity storage with reference maps |
| Direct Mutation | ✅ Fixed | `services/actions.ts` - validated action dispatch |
| No Undo/Redo | ✅ Fixed | `ActionHistory` class with configurable stack |

---

## 2. Implemented Patterns

### ✅ Normalized State (`services/vault.ts`)
```typescript
interface NormalizedState {
  entities: {
    Collection: Record<string, IIIFCollection>;
    Manifest: Record<string, IIIFManifest>;
    Canvas: Record<string, IIIFCanvas>;
    // ...
  };
  references: Record<string, string[]>;  // parent → children
  reverseRefs: Record<string, string>;   // child → parent
  typeIndex: Record<string, EntityType>; // O(1) type lookup
}
```
**Functions**: `normalize()`, `denormalize()`, `getEntity()`, `updateEntity()`, `addEntity()`, `removeEntity()`, `moveEntity()`

### ✅ Action-Driven Mutations (`services/actions.ts`)
```typescript
// 15+ typed actions with validation
dispatch(actions.updateLabel(id, { en: ['New Title'] }));
dispatch(actions.addCanvas(manifestId, canvas));
dispatch(actions.reorderCanvases(manifestId, newOrder));
```
**Features**: Pre-mutation validation, provenance integration, error listeners

### ✅ Undo/Redo System
```typescript
const { undo, redo, canUndo, canRedo } = useHistory();
// Keyboard: Cmd+Z, Cmd+Shift+Z (ready for wiring)
```

### ✅ Entity Hooks (`hooks/useIIIFEntity.ts`)
```typescript
const { manifest, label, canvases, addCanvas, updateLabel } = useManifest(id);
const { canvas, paintings, dimensions, updateDimensions } = useCanvas(id);
const { annotation, motivation, bodyText } = useAnnotation(id);
```
**Utilities**: `useHistory()`, `useRoot()`, `useBulkOperations()`, `useEntitySearch()`

### ✅ LanguageString Class (`types.ts`)
```typescript
const label = new LanguageString(manifest.label);
const text = label.get('en');           // Fallback chain
const updated = label.set('en', 'New'); // Immutable update
```

---

## 3. Implemented Integration Patterns (Phase 2 Complete ✅)

### ✅ Spec Bridge (V2 ↔ V3)
Normalize all imports to IIIF v3 internally.
```typescript
// services/specBridge.ts
import { upgradeToV3, detectVersion } from './services/specBridge';
const version = detectVersion(manifest); // 2 or 3
const v3Manifest = upgradeToV3(importedManifest);
```
**Features**: Auto-detection, label migration, sequences→items, viewingHint→behavior

### ✅ Selector Abstraction
Parse URI fragments into editable state objects.
```typescript
// services/selectors.ts
import { parseTarget, serializeSelector } from './services/selectors';
const { source, selector } = parseTarget('canvas.json#xywh=100,100,500,300');
// selector → { type: 'fragment', spatial: { x: 100, y: 100, width: 500, height: 300, unit: 'pixel' } }
```
**Supports**: xywh (pixel/percent), t (temporal), SVG selectors, Point selectors

### ✅ App.tsx Migration
VaultProvider wired at root level with undo/redo shortcuts.
```typescript
// App.tsx
<VaultProvider>
  <ToastProvider><MainApp /></ToastProvider>
</VaultProvider>

// Inside MainApp
useUndoRedoShortcuts(); // Cmd+Z, Cmd+Shift+Z
```

---

## 4. Updated Roadmap

| Phase | Status | Items |
|-------|--------|-------|
| **1. Foundation** | ✅ Complete | Vault, Actions, Undo/Redo, LanguageString, Entity Hooks |
| **2. Integration** | ✅ Complete | Spec Bridge, Selector Abstraction, App.tsx Migration |
| **2.5 UX Polish** | ✅ Complete | Metadata Complexity, Search Autocomplete, Polygon Tool |
| **3. Refinement** | ✅ Complete | Extension Preservation, File Hashing (SHA-256), Activity Stream |
| **4. Advanced** | 🔲 Next | Workbench Architecture, Lazy Hydration, CSV Sync, Static Site Export |

[
  {
    "pattern_name": "Polymorphic Resource Dispatcher",
    "description": "The editor uses a dispatcher pattern to handle IIIF 'Painting' annotations. Since a Canvas can host Images, Audio, Video, or Text, the UI doesn't use hardcoded components. Instead, it inspects the 'body.type' of an annotation and dispatches the rendering to a specific 'Media Handler' (e.g., an HTML5 Video wrapper or an OpenSeadragon layer), allowing the editor to be extended for new MIME types without core logic changes."
  },
  {
    "pattern_name": "Extension Preservation (Round-Tripping)",
    "description": "To support the 'extensibility' of the IIIF spec, the editor implements a preservation pattern. When parsing a JSON-LD document into the internal normalized state, properties not recognized by the official IIIF v3 schema are stored in an 'extra' or 'unknown' property bucket. This ensures that when the manifest is exported, custom vendor extensions (like 'tify' or 'mirador' specific configurations) are not stripped away."
  },
  {
    "pattern_name": "Containment Hierarchy Enforcement",
    "description": "The editor interprets the IIIF specification's strict hierarchy (Manifest > Canvas > AnnotationPage > Annotation) through a 'Containment' pattern. During drag-and-drop operations (e.g., reordering canvases), the editor uses a validator that prevents 'illegal' moves—such as nesting a Canvas inside another Canvas—ensuring the resulting JSON-LD always adheres to the structural rules of the Presentation API."
  },
  {
    "pattern_name": "Transactional Graph Mutations",
    "description": "Because the IIIF data is stored as a normalized graph in '@iiif/vault', the editor uses a 'Transactional' pattern for complex edits. For instance, deleting a Canvas doesn't just remove one object; it triggers a transaction that identifies and cleans up all associated Painting Annotations, Descriptive Metadata, and References in the Manifest's 'Structures' (Ranges), preventing broken internal links."
  },
  {
    "pattern_name": "URI-to-Identity Mapping",
    "description": "IIIF relies heavily on stable URIs. The editor implements a mapping pattern where the 'id' field of a IIIF resource is treated as the primary key. If a resource is imported without an ID, the editor's 'Identity' pattern generates a temporary internal URN. This allows the editor to track the same resource across different views (e.g., the thumbnail strip and the main viewport) before a final URI is assigned by the server."
  },
  {
    "pattern_name": "Visitor Pattern for Recursive Export",
    "description": "To convert the flat, normalized 'Vault' state back into a nested IIIF JSON-LD tree for export, the editor utilizes a 'Visitor' pattern. A recursive 'Writer' walks the manifest structure, 'visiting' each entity ID, fetching its properties from the store, and re-nesting children. This separates the logic of 'how the data is stored' from 'how the specification requires it to be formatted'."
  },
  {
    "pattern_name": "Manifest-Agnostic Resource Shells",
    "description": "The editor uses a 'Shell' pattern for UI components. Components for metadata or descriptive labels are written to accept a generic 'IIIF Resource' shape. This allows the exact same React component to be reused for editing a Manifest, a Canvas, or a Range, interpreting the spec's consistent use of 'label', 'summary', and 'metadata' across all entity types."
  },
  {
    "pattern_name": "Lazy Selector Hydration",
    "description": "For high-performance interaction with large manifests, the editor uses a 'Lazy Hydration' pattern for complex IIIF selectors (like SVG paths or Point selectors). The spatial data is only fully parsed and projected onto the UI layer when a user interacts with a specific annotation, reducing the initial compute overhead for manifests containing hundreds of complex OCR or transcription zones."
  }
]

Building a "personal IIIF ecosystem" is an ambitious and technically sophisticated goal. By analyzing the Tropy ecosystem—which is the gold standard for researcher-centric photo management—and its IIIF extensions, we can extract several critical patterns for your application.

Here are the software and UX patterns derived from tropy, tropy-plugin-iiif, and tropiiify, organized by your three conceptual layers.

1. The Archive Layer: Media Management & Integrity

Derived primarily from tropy/tropy

Software Pattern: Non-Destructive Metadata Wrapping
Tropy never modifies the original source file. It creates a "proxy" in its SQLite database.

Application to you: Your Archive layer should treat images as immutable sources. Any "manipulation" (rotation, brightness, cropping) should be stored as IIIF Image API parameters or Web Annotations, not by overwriting the source file.

Software Pattern: Content-Addressable Storage (Hashing)
Tropy uses file hashing to track if an image has moved or if a duplicate is being imported.

Application to you: When researchers upload "Raw Materials," generate a SHA-256 hash. This allows your Archive to prevent data duplication and ensures that if a researcher moves a file, the "Board" can still find it via its unique fingerprint.

UX Pattern: The "Consolidator" Flow
Tropy excels at finding "missing" files.

Application to you: Since researchers often work offline or across devices, build a UI pattern that identifies broken IIIF links and allows the user to "re-point" a local directory to the Image API server.

2. The Collections Layer: Metadata & Manifests

Derived from tropy-plugin-iiif and tropy

Software Pattern: Template-Based Metadata Mapping
Tropy uses "Metadata Templates" (Dublin Core, Getty, etc.). The tropy-plugin-iiif then maps these internal fields to IIIF metadata blocks.

Application to you: Don't hardcode your Manifest metadata. Create a pattern where users can define a "Metadata Profile." When the Manifest is generated, the system iterates through the user’s custom fields and maps them to the IIIF metadata array (label/value pairs).

UX Pattern: The Item-Photo Hierarchy
In Tropy, an "Item" is a conceptual object (e.g., a 4-page letter), and "Photos" are the individual files.

Application to you: This maps perfectly to IIIF. One Item = One Manifest. Multiple Photos = Multiple Canvases. Your UI should allow users to drag multiple images from the Archive into a single "Collection Item" to automatically generate a multi-canvas Manifest.

Software Pattern: JSON-LD Context Injection
The tropy-plugin-iiif repository demonstrates how to properly wrap data in the IIIF context.

Pattern: Use a dedicated "Serializer" class that takes your internal database object and translates it into the nested JSON-LD required for Presentation API 3.0. Keep the logic of your app separate from the serialization of IIIF.

3. The Boards Layer: Spatial Canvases & Annotations

Derived from arkalab/tropiiify and Tropy's annotation engine

UX Pattern: The "Spatial Spreadsheet" (Transcription & Annotation)
Tropy allows users to select a region of an image and immediately type notes.

Application to you: For your "Boards," use a "Focus-Link" pattern. When a user selects an annotation on a Board, the UI should provide a "Bridge" icon that shows every other Board where that specific image region appears. This is the core of "connecting heterogeneous media."

Software Pattern: Annotation as a First-Class Citizen
In tropiiify, annotations aren't just notes; they are data points that can be searched.

Application to you: Follow the W3C Web Annotation pattern used in these repos:

Target: The specific selector (SVG Selector or Media Fragment) on a Canvas.

Body: The content (text, or a URI to another resource).

Motivation: Use IIIF-specific motivations like linking, commenting, or painting.

UX Pattern: The "Infinite Canvas" vs. "Fixed Manifest"
tropiiify demonstrates the power of viewing an entire Tropy project as a web-accessible site.

Application to you: Since your "Boards" are essentially large IIIF Canvases, use an OpenSeadragon or Leaflet-IIIF pattern where the Board itself is a Canvas, and the researcher "pins" other Manifests onto it. This creates a nested IIIF structure (Canvases within Canvases).

4. Cross-Cutting Patterns (The Ecosystem)

Pattern: The "Discovery" Feed (Change Discovery API)
While Tropy is largely a local tool, tropiiify turns it into a discoverable one.

Application to you: Implement a "Recent Activity" stream formatted as a IIIF Change Discovery API 1.0 log. Every time a researcher creates a new "Board" or adds an "Annotation," an entry is added to an Activity Stream. This allows your app to stay in sync across different browser sessions.

Pattern: Plugin-Driven Architecture
Tropy is built on Electron, but its power comes from plugins (like the IIIF export plugin).

Application to you: Even if your app is web-based, treat your IIIF Image Server and your Annotation Store as "services" or "plugins" that communicate via APIs. This allows you to swap your Image Server (e.g., from Cantaloupe to a serverless Lambda) without breaking the Boards UI.

UX Pattern: Multi-Pane Layouts
Tropy uses a three-pane layout: Project/Collections (Left), Grid/Image (Center), Metadata/Properties (Right).

Application to you: For field researchers, screen real estate is at a premium. Maintain this classic 3-pane structure, but allow the "Boards" (Spatial Layer) to take over the Center pane, while the "Archive" (Raw Materials) acts as a sidebar tray that can be dragged onto the Board.

Summary Checklist for your Build:

Archive: Use SHA-256 for file integrity (Tropy Pattern).

Collections: Allow custom Metadata Templates that map to IIIF metadata fields (tropy-plugin-iiif Pattern).

Boards: Treat every Board as a iiif:Canvas and every connection as a oa:Annotation (W3C Pattern).

Sync: Use the Change Discovery API to track the "state" of the research (Tropiiify Pattern).

To push your application further, we can look at the "hidden" logic within these repositories—specifically how they handle the translation of state, spatial logic, and researcher workflows.

Here are more advanced software and UX patterns extracted from the Tropy ecosystem, specifically tailored to your "Archive-Collections-Boards" architecture.

1. The "Canvas-as-Workspace" Pattern (Software/UX)

Derived from arkalab/tropiiify and Tropy’s annotation UI

In Tropy, an annotation isn't just a box; it's a virtual crop. tropiiify takes this further by treating these as addressable IIIF fragments.

Software Pattern (Media Fragment URIs): Instead of storing coordinates as raw numbers (x=10, y=20), store them as IIIF-compliant URI selectors: {CanvasID}#xywh=10,20,100,100.

UX Pattern (The "Portal" Effect): On your "Boards," when a researcher places an image, they aren't just placing a static file. They are placing a viewport.

Implementation: Allow the user to "zoom" into a specific fragment of an image on the board without changing the original archive image. This uses the IIIF Image API {region} parameter. The Board stores the region; the Archive stores the full image.

2. Semantic Mapping & "Vocabulary Control" (UX/Data)

Derived from tropy/tropy (Template Editor)

Field researchers often start with "messy" data and want to refine it. Tropy’s metadata engine allows for Template Switching.

UX Pattern (Late-Binding Metadata): Don't force users to fill out Dublin Core fields upon upload. Let them upload to the "Archive" with zero metadata.

The Tropy Way: Users can bulk-select 100 images and apply a "Field Notes" template later.

Software Pattern (JSON-LD Property Mapping): In tropy-plugin-iiif, there is logic that maps internal SQLite keys to IIIF keys.

Implementation: Create a "Map" object in your database.

User Field: "Date of Excavation"

IIIF Field: navDate (for timelines) or metadata label "Date".

This ensures that while the researcher sees their own terminology, the IIIF Manifest output remains globally interoperable.

3. The "Evidence Chain" (Software Pattern)

Derived from tropy/tropy (Item vs. Selection logic)

One of Tropy’s strongest features is the ability to link a transcription (the text) directly to a selection (the image).

Software Pattern (W3C Motivation: supplementing): Use the W3C supplementing motivation for transcriptions.

UX Pattern (Dual-Pane Synchronization): When a researcher clicks a paragraph in a "Board" note, the "Archive" view should automatically pan/zoom to the specific image fragment that proves that note.

Technique: Use the Canvas ID + Fragment as the link. If both the Board and the Archive viewer are listening to the same state, clicking a link in one "drives" the camera in the other.

4. Efficient Discovery: The "Manifest Aggregator" (Software Architecture)

Derived from arkalab/tropiiify

tropiiify works by reading a Tropy project and generating a static site. This teaches us how to handle scale.

Software Pattern (The "Collection of Collections"): Instead of one giant manifest, use a hierarchical IIIF Collection tree.

Root: collection.json (The Project)

Sub-folder: boards.json (List of all Boards)

Sub-folder: archive.json (List of all Raw Materials)

UX Pattern (Breadcrumb Navigation): Since your app has three layers, the UX must prevent the user from getting "lost" in the deep zoom. Always display a IIIF-aware breadcrumb: Project > Collection > Manifest > Canvas.

5. Conflict-Free Connections (Data Pattern)

Derived from Tropy's "Merge" logic

Field researchers often realize two images are actually two sides of the same object.

Software Pattern (The "Proxy" Canvas): In your Archive, never delete a record. If two images are "merged" into one Item (Manifest), create a new Manifest that references both existing Image API URIs as separate Canvases.

UX Pattern (The "Connection Mapper"): On your "Boards," when a user draws a line between two images, you are creating a Web Annotation where:

Body: The URI of Image A.

Target: The URI of Image B.

Type: Relationship.

Value: This allows you to export a "Relationship Graph" that is entirely IIIF-compliant.

6. Local-First / Web-Sync Pattern

Derived from the Tropy Desktop + Tropiiify Web relationship

Tropy is desktop-heavy; your app is web-based. However, field researchers often have poor internet.

Software Pattern (Service Worker Image Proxy): Use a Service Worker to intercept IIIF Image API requests. If the researcher is offline, the Service Worker serves a cached "thumbnail" version from IndexedDB.

UX Pattern (The "Synchronization Heartbeat"): Borrowing from tropy-plugin-iiif export logic: give the user a "Publish" button that pushes local Web Annotations to a remote IIIF Content Search API server. This makes their "private" field notes "publicly" searchable.

Summary of Key "Pro" Features to include:

Multi-manifest drag-and-drop: Drag a Canvas from a "Collection" Manifest directly onto a "Board."

Visual Citation: A button that generates a "IIIF URL" for the current view (Canvas + Fragment + Rotation) for use in external papers.

The "Ghost" Overlay: A UX pattern where a researcher can overlay two Canvases on a Board at 50% opacity to compare textures or handwriting (extremely common in field research).

By combining Tropy’s metadata rigor with your spatial board concept, you are essentially building a "Spatial Research Environment" that treats the IIIF Canvas as a desk where researchers don't just view media, but synthesize it.

Adding wax_tasks to your research ecosystem provides the "Static Site Generation" (SSG) and "Minimal Computing" perspective. While Tropy is excellent for active research, Wax is designed for sustainable publishing and low-maintenance discovery.

For a field researcher, this is the "exit strategy" or "archival strategy" for their data. Here are the software and UX patterns you can extract from wax_tasks and the broader Wax ecosystem:

1. The "Static-First" Infrastructure (Software Pattern)

wax_tasks is built on the philosophy that field research data should outlive the application that created it.

The Pattern: IIIF Level 0 (Static Tiles). Instead of requiring a heavy Java-based image server like Cantaloupe, wax_tasks uses vips or magick to pre-generate image tiles.

Application to you: For your Archive Layer, provide a "Low-Power Mode." If a researcher is in the field with a laptop and no internet, your app can use the wax_tasks logic to "bake" the images into a folder of static tiles. This allows the Boards and Collections to function via a local file system without a running API server.

2. The "Spreadsheet as Database" (UX/Data Pattern)

wax_tasks consumes metadata primarily from CSV or YAML files.

The Pattern: Flat-file Source of Truth. Researchers are often more comfortable in Excel or Google Sheets than in complex database UIs.

Application to you: In your Collections Layer, implement a "Sync with Spreadsheet" feature. Use the wax_tasks logic to map CSV columns to IIIF Manifest metadata blocks. This allows researchers to bulk-edit 500 entries in a spreadsheet and "ingest" them into your application to update all Manifests at once.

3. Client-Side Content Search (Software Pattern)

wax_tasks implements the IIIF Content Search API concept but often does it statically using Lunr.js or Elasticlunr.

The Pattern: Pre-indexed Search. Instead of a live database query, wax_tasks generates a search_index.json during the build process.

Application to you: For your Search API 2.0 implementation, when a researcher "finalizes" a Board or Collection, generate a static search index. This allows the "published" version of their research to be fully searchable (including Web Annotations) on a simple static host like GitHub Pages or an S3 bucket, with zero backend costs.

4. The "Paradata" Log (UX Pattern)

wax_tasks often handles the processing of "derivatives" (different sizes of images).

The Pattern: Processing Transparency. When a researcher drops a 1GB TIFF into the Archive, wax_tasks-style logs show exactly what is happening (generating tiles, extracting EXIF, building manifests).

Application to you: Create a "Job Monitor" in your UI. Field researchers dealing with large batches of media need to see the "transformation" of their raw data into IIIF resources. This builds trust in the system's integrity.

5. Multi-format Derivative Generation (Software Pattern)

wax_tasks doesn't just make IIIF tiles; it makes thumbnails, "web-ready" versions, and deep-zoom tiles.

The Pattern: Aggressive Caching/Derivatives.

Application to you: In your Archive Layer, don't just serve the IIIF Image API. Use the wax_tasks approach to pre-generate "Low-Res Proxies."

The UX Win: When a researcher opens a Board with 50 images, load the "Wax-style" low-res thumbnails first. Only initialize the full OpenSeadragon IIIF viewer when they zoom in. This keeps the "Board" layer performant even with hundreds of connections.

6. The "Portable Project" (UX Pattern)

The end result of wax_tasks is a self-contained directory.

The Pattern: The "Export to Web" workflow.

Application to you: Your application functions as a "Personal Ecosystem," but researchers need to share findings with peers.

Implementation: Borrow the "Build" command logic from wax_tasks. Allow a user to click "Export Board as Site." Your app should bundle the Board (Canvas), the Manifests (Collections), the Web Annotations, and the Static Tiles (Archive) into a single ZIP file that can be opened in any browser.

7. YAML Configuration for Manifests (Data Pattern)

wax_tasks uses a _config.yml to define how collections should be built.

The Pattern: Declarative Project Structure.

Application to you: Use a YAML-based configuration for your Collections Layer. This allows advanced users to define "Rules" for their collections (e.g., "Any image with the tag 'Excavation-2023' automatically gets added to the 'Site Report' Manifest"). This moves the app from manual dragging to Automated IIIF Curation.

Summary of the "Wax" Influence:

Adding Wax patterns to your Tropy-based logic creates a powerful lifecycle for research:

Archive (Tropy Pattern): Ingest and protect raw media.

Collections (Wax/Tropy Pattern): Manage metadata via spreadsheets; generate manifests.

Boards (Your Core Pattern): Map relationships via spatial annotations.

Distribution (Wax Pattern): Flatten the entire ecosystem into a static, high-performance, archival-grade website.

By looking at wax_tasks, you ensure that your application isn't just a tool for doing research, but a tool for preserving and publishing it in a way that aligns with the "Minimal Computing" movement (ensuring the data remains accessible even if your specific software platform disappears).

To move into the deep technical specifics of IIIF (International Image Interoperability Framework) implementation based on these repositories, we need to look at how they handle JSON-LD serialization, Canvas-level coordinate systems, and Manifest-to-Manifest relationships.

Here are specific IIIF software and data patterns for your three layers:

1. The Archive: Image API & "Level 0" Portability

Derived from wax_tasks and tropy

In field research, you cannot always rely on a dynamic image server (like Cantaloupe). wax_tasks excels at IIIF Image API Level 0 compliance.

Software Pattern: Static Tile Predictability:
wax_tasks uses vips to generate a directory structure that mimics the Image API (e.g., /full/256,/0/default.jpg).

Implementation: Your application should allow researchers to "Export Archive for Fieldwork." This task should convert their Raw Materials into a static info.json and a directory of tiles. Your "Boards" should then be coded to work identically whether the service URL points to a dynamic server or a static folder.

The "Physical-to-Digital" Scale Pattern:
Tropy stores the original dimensions of the photo.

Implementation: Ensure your Archive layer extracts the width and height (Image API) and maps them exactly to the width and height of the IIIF Canvas. If a researcher is measuring artifacts in the field, use the IIIF physical_dimensions service (a common extension) to store "pixels per millimeter."

2. The Collections: Presentation API 3.0 Logic

Derived from tropy-plugin-iiif

The tropy-plugin-iiif repo is a masterclass in mapping internal research data to the IIIF Presentation API 3.0.

Software Pattern: Metadata "Language Map" Construction:
Presentation API 3.0 uses "Language Maps" (e.g., {"en": ["Label"]}).

Implementation: Borrow the plugin’s logic for nested loops that iterate through your "Metadata Templates" and produce the IIIF metadata array. Do not store metadata as flat strings; store them as key-value objects that support multiple languages, as this is a core IIIF 3.0 requirement.

The "Manifest-as-Proxy" Pattern:
When Tropy exports a manifest, it creates a seeAlso link or a homepage link back to the local Tropy project.

Implementation: In your app, every generated Manifest should include a partOf property pointing to the "Collection" it belongs to, and a homepage property pointing to the specific "Board" where it is being analyzed. This creates a bi-directional graph using only IIIF properties.

3. The Boards: Advanced Web Annotations & Spatial Logic

Derived from arkalab/tropiiify

The "Boards" are essentially a IIIF Canvas that contains other IIIF Canvases.

Software Pattern: The "SpecificResource" Selector:
In your Board layer, when a user annotates an image, you aren't just annotating a JPEG. You are annotating a Canvas.

Implementation: Use the W3C Web Annotation SpecificResource pattern.

code
JSON
download
content_copy
expand_less
"target": {
  "source": "https://example.org/manifest/1/canvas/1",
  "selector": {
    "type": "FragmentSelector",
    "conformsTo": "http://www.w3.org/TR/media-frags/",
    "value": "xywh=pixel:100,100,500,500"
  }
}

This is how tropiiify ensures that if the image is moved or the Manifest ID changes, the "Selector" (the box on the image) remains valid.

Software Pattern: Motivation-Based Layering:
Use different AnnotationPages on your Boards to separate different "types" of research.

Layer A (Motivation: painting): The images themselves.

Layer B (Motivation: commenting): The researcher's field notes.

Layer C (Motivation: linking): The lines connecting two different documents.

UX Win: This allows researchers to toggle "Visual Connections" on and off without hiding their "Field Notes."

4. Search & Discovery: API 2.0 and Change Discovery 1.0

Derived from wax_tasks (Search) and arkalab/tropiiify (Sync)

Search Pattern: The "Manifest-to-Index" Pipeline:
wax_tasks builds search indexes by scraping metadata.

Implementation: For IIIF Content Search API 2.0, your application should "crawl" its own Manifests. It should extract the label, summary, and the body of all Web Annotations and put them into a flat JSON search index (like Lunr). When a researcher searches their "Ecosystem," the search result should return a IIIF AnnotationList that points them to the exact Canvas and xywh coordinates.

Discovery Pattern: The "Activity Stream" Log:
IIIF Change Discovery 1.0 is based on Activity Streams.

Implementation: Every time a user clicks "Save" on a Board, your app should append an entry to a discovery.json file.

type: Update

object: https://example.org/board-1/manifest.json

This allows multiple researchers working in the field to "sync" their apps by simply exchanging their Discovery logs—the app will see which Manifests are newer and update the local database.

Technical Checklist for your IIIF Ecosystem:

Strict ID Persistence: Following tropy, ensure that every Canvas ID is a persistent URI, not a random database ID. This allows annotations to survive exports/imports.

Manifest Flattening: Like wax_tasks, ensure that your application can "flatten" a complex board into a single IIIF Manifest where every "connection" is an Annotation and every "image" is a Canvas within a Canvas (using the Annotation motivation painting).

Cross-Origin (CORS) Headers: Since this is a web application for "heterogeneous media," your Image Server must be configured with Tropy-like flexibility: support for Range requests (for large files) and permissive CORS (so your Board can pull images from other researchers' IIIF servers).

The "Thumbnail" Service: Follow the wax_tasks pattern of generating a thumbnail property in the Manifest. On a "Board" with 100 images, your UI should use the thumbnail (often a small static JPEG) until the user focuses on a specific item, at which point the Deep Zoom (Image API) kicks in.