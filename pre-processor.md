# Media Organization Workflow — Pre-Processing for Biiif Pipeline

## Overview

A GUI-based workflow tool for transforming unsorted media collections into Biiif-compliant folder structures that feed directly into the recursive IIIF ingest pipeline. This pre-processor bridges the gap between chaotic field research materials and the structured IIIF ecosystem.

---

## Purpose

Researchers often return from fieldwork with:
- Thousands of unsorted photos in flat directories
- Mixed media types (images, audio, video, documents)
- Inconsistent naming conventions
- Missing or embedded metadata
- No organizational hierarchy

This workflow tool transforms this chaos into a Biiif-compliant structure ready for IIIF manifest generation.

---

## Core Workflow Stages

```
Unsorted Media → Import & Analysis → Organization → Metadata Enrichment → Biiif Export
```

---

## 1. Import & Analysis Stage

### Initial Import

**Interface:**
```
┌─────────────────────────────────────────────────────────┐
│  Import Media                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Drag folder here or browse...]                       │
│                                                         │
│  ☑ Scan subdirectories recursively                     │
│  ☑ Extract EXIF/metadata from files                    │
│  ☑ Group files by date/time proximity                  │
│  ☑ Detect duplicate/similar images                     │
│                                                         │
│              [Cancel]  [Start Import]                   │
└─────────────────────────────────────────────────────────┘
```

**Actions:**
1. Recursive filesystem scan
2. EXIF/metadata extraction:
   - Images: date taken, location, camera settings, orientation
   - Audio: duration, format, embedded metadata
   - Video: duration, resolution, codec
   - Documents: creation date, author, title
3. File fingerprinting (SHA-256 hash)
4. Duplicate detection
5. Similar image clustering (perceptual hash)
6. Temporal clustering (files within N minutes)
7. Spatial clustering (GPS coordinates within N meters)

**Output:**
- Flat list of all discovered media items
- Extracted metadata database
- Suggested groupings based on:
  - Date/time proximity
  - Location proximity
  - File type
  - Naming patterns

---

## 2. Organization Stage

### Visual Organization Interface

**Layout:**
```
┌─────────────┬───────────────────────────────────────────┬─────────────┐
│             │                                           │             │
│  Source     │         Workspace Canvas                  │  Structure  │
│  Media      │                                           │  Preview    │
│             │  [Items arranged spatially]               │             │
│  Filters:   │                                           │  Collection │
│  □ Images   │  [Drag to organize]                       │   └─ _man1  │
│  □ Audio    │  [Draw groups]                            │   └─ _man2  │
│  □ Video    │  [Cluster tools]                          │   subdir    │
│  □ Docs     │                                           │      └─ _m3 │
│             │                                           │             │
│  Sort by:   │                                           │             │
│  • Date     │                                           │             │
│  ○ Name     │                                           │             │
│  ○ Type     │                                           │             │
│             │                                           │             │
└─────────────┴───────────────────────────────────────────┴─────────────┘
```

### Organization Tools

**Spatial Canvas:**
- Infinite canvas where items can be placed freely
- Similar to board functionality but for pre-organization
- Visual clustering through proximity
- Lasso/marquee selection for bulk grouping
- Right-click context menu for group operations

**Automatic Clustering:**

| Cluster Method | Description | Use Case |
|----------------|-------------|----------|
| Date/Time | Group files within configurable time window | Photo sessions, daily surveys |
| Location | Group by GPS coordinates (if available) | Site-based fieldwork |
| File Type | Separate images/audio/video/documents | Media-specific collections |
| Naming Pattern | Regex-based grouping | Pre-existing partial organization |
| Visual Similarity | Perceptual hash clustering | Related images, panorama sequences |
| Manual Lasso | Drag selection box around items | Researcher intuition |

**Grouping Actions:**

```
Selected Items → Right Click:
  ├─ Create Manifest Group      (_folder)
  ├─ Create Collection Group    (folder)
  ├─ Link to Existing Group
  ├─ Create Sub-Group
  ├─ Mark as Canvas Set         (shared basename)
  └─ Ungroup
```

### Canvas Set Detection

**Automatic Detection:**
When multiple files share similar basenames, suggest canvas grouping:

```
Detected potential canvas sets:

site_01.jpg
site_01.txt        →  Suggest: Single canvas with image + text annotation
site_01_notes.md

[Create Canvas Set] [Keep Separate]
```

**Manual Canvas Set Creation:**
1. Select multiple files
2. "Create Canvas Set" from menu
3. Choose primary file (determines Canvas dimensions)
4. Assign roles to additional files:
   - Annotation (text overlays)
   - Alternative view (Choice body)
   - Supplementing content (transcription)

### Folder Structure Preview

Real-time preview of resulting Biiif structure:

```
📁 Collection Root
  📁 _manuscript_photos    ← Manifest (starts with _)
    🖼️ page_01.jpg
    📄 page_01_transcription.txt
    🖼️ page_02.jpg
    📄 page_02_transcription.txt
  📁 _audio_interviews     ← Manifest
    🔊 interview_01.mp3
    📄 interview_01_transcript.txt
  📁 site_photos           ← Collection (no _)
    📁 _north_wall         ← Nested manifest
      🖼️ detail_01.jpg
      🖼️ detail_02.jpg
    📁 _south_wall
      🖼️ detail_03.jpg
```

**Validation Indicators:**

| Icon | Meaning |
|------|---------|
| ✓ | Valid Biiif structure |
| ⚠️ | Warning: empty folder |
| ❌ | Error: invalid nesting |
| 🔍 | Preview manifest structure |

---

## 3. Metadata Enrichment Stage

### Metadata Editor

**Bulk Metadata Entry:**

```
┌─────────────────────────────────────────────────────────┐
│  Metadata for: _manuscript_photos (14 items)            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Manifest-level metadata:                               │
│                                                         │
│  Title:      [________________________]                 │
│  Summary:    [________________________]                 │
│              [________________________]                 │
│  Creator:    [________________________]                 │
│  Date:       [YYYY-MM-DD] or [fuzzy: Spring 1923]       │
│  Location:   [________________________]                 │
│  Rights:     [Select CC license ▼]                      │
│                                                         │
│  ☑ Apply to all items in this manifest                 │
│  ☐ Apply to parent collection                          │
│                                                         │
│  Custom metadata pairs:                                 │
│  [+ Add field]                                          │
│                                                         │
│              [Cancel]  [Apply]  [Apply & Next]          │
└─────────────────────────────────────────────────────────┘
```

**Metadata Sources:**

1. **Extracted EXIF/Embedded:**
   - Auto-populate from file metadata
   - Show confidence indicator
   - Allow override

2. **Template Application:**
   - Save metadata templates for similar collections
   - "Apply template" dropdown
   - Templates include:
     - Field note template
     - Interview template
     - Artifact photo template
     - Document scan template

3. **Batch Find/Replace:**
   - Find/replace across all metadata fields
   - Regex support
   - Preview changes before applying

4. **Metadata Import:**
   - Import from CSV/spreadsheet
   - Match files by filename/path
   - Map columns to IIIF metadata fields

### Fuzzy Date Handling

**Interface:**
```
Date field:
  ○ Precise: [2023-06-15]
  ● Fuzzy:   [Spring 1923_____________]
  
  Machine-readable fallback: [1923-04-01]
  
  ⓘ Fuzzy dates appear in metadata, fallback in navDate
```

### Language Support

```
Multi-language metadata:

Label:
  English:  [Archaeological Survey North Site]
  Spanish:  [________________________________]
  [+ Add language]

☑ Use English as default for unlabeled languages
```

---

## 4. Naming & File Operations

### Batch Rename

**Pattern-Based Renaming:**

```
┌─────────────────────────────────────────────────────────┐
│  Batch Rename                                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Pattern: [site]_[counter:03d].[ext]                    │
│                                                         │
│  Variables:                                             │
│    [counter]    - Sequential number                     │
│    [date]       - From EXIF or file date                │
│    [original]   - Original filename                     │
│    [ext]        - File extension                        │
│    [custom]     - Custom text field                     │
│                                                         │
│  Preview:                                               │
│    IMG_0001.jpg  →  site_001.jpg                        │
│    IMG_0002.jpg  →  site_002.jpg                        │
│    notes.txt     →  site_003.txt                        │
│                                                         │
│  ☑ Preserve original filenames in metadata             │
│                                                         │
│              [Cancel]  [Apply]                          │
└─────────────────────────────────────────────────────────┘
```

### Canvas Set Basename Normalization

Automatically rename files to share basenames for canvas grouping:

```
Before:
  photo.jpg
  transcription.txt
  notes.md

Action: "Create canvas set with basename 'item_01'"

After:
  item_01.jpg
  item_01_transcription.txt
  item_01_notes.md
```

---

## 5. Biiif Export Stage

### Export Configuration

```
┌─────────────────────────────────────────────────────────┐
│  Export to Biiif Structure                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Output directory:                                      │
│  [/path/to/biiif/output] [Browse...]                    │
│                                                         │
│  Export options:                                        │
│  ☑ Copy files (vs. move)                               │
│  ☑ Create _info.json sidecar files                     │
│  ☑ Generate preview thumbnails                         │
│  ☑ Validate Biiif structure before export              │
│  ☐ Generate initial IIIF manifests (preview)           │
│                                                         │
│  File operations:                                       │
│  ☑ Preserve original filenames in metadata             │
│  ☑ Convert HEIC/proprietary formats to JPEG            │
│  ☑ Normalize audio to MP3                              │
│  ☐ Transcode video to web-friendly formats             │
│                                                         │
│  Image optimization:                                    │
│  ☑ Rotate images based on EXIF orientation             │
│  ☑ Strip EXIF data (preserve in sidecar)               │
│  ☐ Resize oversized images (max: [4000] px)            │
│  Quality: [85] %                                        │
│                                                         │
│              [Cancel]  [Validate]  [Export]             │
└─────────────────────────────────────────────────────────┘
```

### _info.json Sidecar Files

For each manifest folder, generate `_info.json`:

```json
{
  "@context": "https://biiif.org/context.json",
  "type": "ManifestMetadata",
  "label": { "en": ["Manuscript Photos"] },
  "summary": { "en": ["High-resolution photos of medieval manuscript"] },
  "metadata": [
    {
      "label": { "en": ["Date"] },
      "value": { "en": ["circa 1450"] }
    },
    {
      "label": { "en": ["Location"] },
      "value": { "en": ["Monastery Archive, Room 3"] }
    }
  ],
  "rights": "http://creativecommons.org/licenses/by/4.0/",
  "requiredStatement": {
    "label": { "en": ["Attribution"] },
    "value": { "en": ["Field Survey 2023, University Library"] }
  },
  "originalFilenames": {
    "page_01.jpg": "IMG_2847.jpg",
    "page_02.jpg": "IMG_2848.jpg"
  }
}
```

### Canvas Set Metadata

For canvas sets (files sharing basename), generate `{basename}_canvas.json`:

```json
{
  "@context": "https://biiif.org/context.json",
  "type": "CanvasMetadata",
  "id": "site_01",
  "label": { "en": ["North Wall Detail"] },
  "files": [
    {
      "filename": "site_01.jpg",
      "role": "primary",
      "motivation": "painting"
    },
    {
      "filename": "site_01_transcription.txt",
      "role": "annotation",
      "motivation": "supplementing"
    },
    {
      "filename": "site_01_notes.md",
      "role": "annotation",
      "motivation": "commenting"
    }
  ]
}
```

### Validation Report

Before export, validate against Biiif conventions:

```
✓ Validation Complete

Manifests detected: 3
Collections detected: 1
Canvas sets detected: 12

Warnings:
  ⚠️ _audio_interviews/interview_03.mp3 — no sidecar metadata
  ⚠️ site_photos — collection has no items (empty directory)

Errors:
  ❌ _manuscript_photos/_nested_folder — invalid: manifest cannot contain manifest
  
Recommendations:
  💡 Consider adding Rights statement to all manifests
  💡 2 files have no metadata: assign before export

[View Details] [Fix Issues] [Export Anyway]
```

---

## 6. Workspace Persistence

### Save/Load Projects

Organization work-in-progress is saved as a project file:

```json
{
  "version": "1.0",
  "sourcePath": "/path/to/original/media",
  "items": [
    {
      "id": "uuid-1",
      "sourcePath": "IMG_0001.jpg",
      "metadata": {},
      "position": { "x": 100, "y": 200 },
      "groupId": "group-uuid-1"
    }
  ],
  "groups": [
    {
      "id": "group-uuid-1",
      "type": "manifest",
      "name": "_manuscript_photos",
      "metadata": {},
      "items": ["uuid-1", "uuid-2"]
    }
  ],
  "canvasSets": [
    {
      "basename": "page_01",
      "items": ["uuid-1", "uuid-3"]
    }
  ]
}
```

**Workspace Features:**
- Auto-save every N seconds
- Version history (undo/redo across sessions)
- Export workspace as JSON for collaboration
- Import workspace from colleague

---

## 7. Advanced Features

### Smart Clustering Algorithms

**Temporal Clustering:**
```
Algorithm: DBSCAN on timestamp data
- Epsilon: configurable time window (e.g., 30 minutes)
- MinPoints: minimum files to form cluster (e.g., 3)
- Output: suggested manifest groups for photo sessions
```

**Spatial Clustering:**
```
Algorithm: DBSCAN on GPS coordinates
- Epsilon: configurable distance (e.g., 50 meters)
- MinPoints: minimum files to form cluster (e.g., 5)
- Output: suggested manifest groups for site locations
```

**Visual Similarity:**
```
Algorithm: Perceptual hashing + hierarchical clustering
- Extract pHash from images
- Calculate Hamming distance
- Cluster similar images
- Output: panorama sequences, duplicate detection
```

### Duplicate Handling

```
┌─────────────────────────────────────────────────────────┐
│  Duplicate Files Detected                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  IMG_0001.jpg  (2.4 MB)                                 │
│  DSC_0234.jpg  (2.4 MB)  ← Exact duplicate              │
│                                                         │
│  [Preview] [Compare Side-by-Side]                       │
│                                                         │
│  Action:                                                │
│  ○ Keep first, delete second                           │
│  ○ Keep second, delete first                           │
│  ○ Keep both (different contexts)                      │
│  ● Mark as related (link in metadata)                   │
│                                                         │
│              [Skip]  [Apply to All]  [Apply]            │
└─────────────────────────────────────────────────────────┘
```

### Panorama Detection & Stitching

For sequences of images detected as panorama:

```
Panorama detected: 4 images

[img1] [img2] [img3] [img4]

Actions:
  ○ Keep as sequence (separate canvases)
  ○ Stitch into single image (requires processing)
  ● Group as canvas set with xywh fragments

[Configure]
```

If "Group as canvas set with xywh fragments":
- Create single high-res canvas
- Each original image becomes annotation with FragmentSelector
- Preserves originals + enables spatial navigation

---

## 8. Integration with IIIF Field Archive Studio

### Direct Pipeline Feed

Once exported to Biiif structure:

```
┌─────────────────────────────────────────────────────────┐
│  Export Complete                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ 156 files organized                                  │
│  ✓ 3 manifests created                                  │
│  ✓ 1 collection created                                 │
│  ✓ 12 canvas sets configured                            │
│                                                         │
│  Exported to: /path/to/biiif/output                     │
│                                                         │
│  Next steps:                                            │
│  • Open in IIIF Field Archive Studio                    │
│  • Run recursive IIIF ingest pipeline                   │
│  • Generate final manifests                             │
│                                                         │
│  [Open in Archive Studio]  [View Output]  [Done]        │
└─────────────────────────────────────────────────────────┘
```

### Workflow Diagram

```
┌──────────────────────┐
│  Unsorted Media      │
│  (field research)    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Media Organizer     │◄─── This Tool
│  (GUI workflow)      │
└──────────┬───────────┘
           │
           │ Biiif-compliant structure
           │
           ▼
┌──────────────────────┐
│  Archive Studio      │
│  iiifBuilder.ts      │
│  (recursive ingest)  │
└──────────┬───────────┘
           │
           │ IIIF Manifests
           │
           ▼
┌──────────────────────┐
│  Collections, Board, │
│  Annotations, etc.   │
└──────────────────────┘
```

---

## 9. Technical Implementation Notes

### File System Operations

**Safe Operations:**
- All file operations use atomic moves
- Verify checksums before/after copy
- Maintain operation log for rollback
- Preview mode (show what would happen without executing)

**Performance:**
- Lazy loading of thumbnails
- Progressive scanning for large directories
- Background workers for EXIF extraction
- Incremental metadata saves

### Data Storage

**Project File Format:**
- JSON with optional compression
- References files by hash (not path) for robustness
- Embeds small metadata, links to large files
- Version field for forward compatibility

**Metadata Extraction:**
- Use exiftool or equivalent library
- Fallback to file system metadata if embedded data unavailable
- Cache extracted metadata to avoid re-parsing

### Cross-Platform Considerations

- Path separators normalized internally
- Character encoding validation for filenames
- Reserved filename checking (Windows compatibility)
- Maximum path length warnings
- Case-insensitive filesystem handling

---

## 10. User Interface Specifications

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + I` | Import media |
| `Ctrl/Cmd + E` | Export to Biiif |
| `Ctrl/Cmd + S` | Save project |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + A` | Select all items |
| `Ctrl/Cmd + G` | Group selected items |
| `Ctrl/Cmd + Shift + G` | Ungroup |
| `M` | Create manifest group |
| `C` | Create collection group |
| `K` | Create canvas set |
| `Delete` | Remove from workspace (not delete file) |
| `Shift + Delete` | Delete file permanently |
| `Space` | Pan canvas |
| `+` / `-` | Zoom canvas |

### Drag & Drop Behaviors

| Source | Target | Result |
|--------|--------|--------|
| Files from filesystem | Workspace canvas | Import and place |
| Item on canvas | Another item | Create canvas set |
| Multiple items | Empty space | Move items |
| Multiple items | Group label | Add to group |
| Group | Another group | Nest groups |
| Item | Trash icon | Remove from workspace |

### Context Menus

**Right-click on item:**
- Open original file
- View metadata
- Edit metadata
- Add to group
- Create canvas set with...
- Mark as duplicate of...
- Show in file system

**Right-click on group:**
- Rename group
- Edit group metadata
- Add items
- Remove items
- Convert to manifest/collection
- Delete group (not files)

**Right-click on canvas:**
- Paste items
- Create group at cursor
- Clear selection
- Select all in view
- Auto-arrange visible items

---

## 11. Output Specification

### Biiif Folder Structure

The exported structure strictly follows Biiif conventions:

```
output_directory/
├── collection.json                   # Optional top-level collection
├── _manifest_one/                    # Manifest (leading _)
│   ├── _info.json                   # Manifest metadata
│   ├── item_01.jpg                  # Primary canvas content
│   ├── item_01_transcription.txt    # Canvas annotation
│   ├── item_01_canvas.json          # Canvas metadata
│   ├── item_02.jpg
│   └── item_02.mp3                  # Audio canvas
├── _manifest_two/
│   └── page_001.jpg
├── subcollection/                    # Collection (no leading _)
│   ├── _nested_manifest/            # Nested manifest
│   │   ├── _info.json
│   │   └── image.jpg
│   └── collection.json              # Optional subcollection metadata
└── .organizer_metadata/             # Hidden metadata folder
    ├── project.json                 # Original project file
    ├── original_filenames.json      # Filename mapping
    └── validation_report.json       # Last validation results
```

### Integration with iiifBuilder.ts

The iiifBuilder.ts pipeline consumes this structure:

**Folder Rules:**
1. Folders starting with `_` → IIIF Manifest
2. Folders without `_` containing subfolders → IIIF Collection
3. Folders without `_` containing only files → Error (invalid Biiif)

**File Rules:**
1. Files sharing basename (e.g., `item.jpg` + `item.txt`) → Single Canvas
   - Primary file (largest image or first alphabetically) → painting Annotation
   - Secondary files → supplementing/commenting Annotations
2. Canvas metadata from `{basename}_canvas.json` if present
3. Manifest metadata from `_info.json` if present

**Annotation Mapping:**
```
File extension → Annotation motivation

.txt, .md       → supplementing (transcription)
.json           → metadata (embedded in manifest)
.srt, .vtt      → supplementing (subtitles)
.jpg, .png      → painting (alternative view via Choice)
.mp3, .wav      → painting (audio) or supplementing (narration)
```

---

## 12. Example Workflows

### Workflow A: Archaeological Site Photos

**Starting Point:**
- 2,000 photos in `/field_photos/`
- Inconsistent filenames: `IMG_0001.jpg` to `IMG_2000.jpg`
- GPS coordinates embedded in EXIF
- Mixed contexts: artifacts, trenches, landscapes

**Process:**
1. Import → Spatial clustering by GPS
2. Review suggested groups (trenches clustered by location)
3. Manual refinement: separate artifacts from context
4. Create manifest groups:
   - `_trench_1_north` (42 photos)
   - `_trench_1_south` (38 photos)
   - `_artifacts_ceramic` (156 photos)
5. Batch rename within groups: `trench1n_001.jpg`, etc.
6. Add metadata: date, location, excavator names
7. Export to Biiif structure
8. Import into Archive Studio → auto-generates manifests

### Workflow B: Oral History Interviews

**Starting Point:**
- 15 audio files: `interview_001.mp3` to `interview_015.mp3`
- Corresponding transcript Word documents
- Some photos of interviewees

**Process:**
1. Import all files
2. Manual grouping (one manifest per interview):
   - `_interview_001/`
     - `interview.mp3` (basename: interview)
     - `interview_transcript.docx`
     - `interview_photo.jpg`
3. Rename for canvas sets:
   - `interview_001.mp3` → Primary audio canvas
   - `interview_001_transcript.txt` → Supplementing annotation
   - `interview_001_photo.jpg` → Choice body (portrait)
4. Add metadata per manifest: interviewee name, date, location
5. Export → each manifest has single canvas with audio + annotations

### Workflow C: Manuscript Digitization

**Starting Point:**
- 230 TIFF scans: `scan0001.tif` to `scan0230.tif`
- Separate folder of transcriptions: `page001.txt` to `page230.txt`

**Process:**
1. Import both folders
2. Auto-match by number extraction:
   - `scan0001.tif` matches `page001.txt` → canvas set
3. Create manifest: `_manuscript_complete`
4. Batch rename to shared basenames:
   - `page_001.tif` + `page_001_transcription.txt`
5. Convert TIFFs to JPEG during export (optimize for web)
6. Add manuscript-level metadata
7. Export → generates manifest with 230 canvases, each with image + transcription

---

## 13. Error Handling & Validation

### Pre-Export Validation Checks

**Structure Validation:**
- ✓ No manifest folders nested inside manifest folders
- ✓ All manifest folders contain at least one file
- ✓ All canvas sets have primary content file
- ✓ No files outside manifest/collection folders
- ✓ Folder names are filesystem-safe

**Metadata Validation:**
- ⚠️ Manifests missing title
- ⚠️ Items missing rights statement
- ⚠️ Canvas sets missing primary file designation
- ⚠️ Fuzzy dates without machine-readable fallback

**File Validation:**
- ✓ All referenced files exist
- ✓ File extensions recognized
- ✓ Images are valid (can be opened)
- ✓ Audio/video files have valid headers
- ⚠️ Files exceed recommended size (> 50 MB)
- ⚠️ Non-standard image formats (HEIC, CR2, etc.)

### Validation Report UI

```
┌─────────────────────────────────────────────────────────┐
│  Validation Report                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✓ Structure: Valid                                     │
│  ⚠️ Metadata: 3 warnings                                │
│  ✓ Files: All valid                                     │
│                                                         │
│  Warnings (click to navigate):                          │
│                                                         │
│  ⚠️ _manuscript_photos: No rights statement             │
│  ⚠️ _interview_01: Missing required metadata            │
│  ⚠️ site_photos/IMG_0045.jpg: No manifest assignment    │
│                                                         │
│  Recommendations:                                       │
│                                                         │
│  💡 Add rights statements to all manifests              │
│  💡 Consider adding summaries for discoverability       │
│                                                         │
│  [Fix Issues]  [Export Anyway]  [Cancel]                │
└─────────────────────────────────────────────────────────┘
```

---

## 14. Settings & Preferences

### Application Settings

```
┌─────────────────────────────────────────────────────────┐
│  Media Organizer Settings                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  General                                                │
│  ├─ Default output directory: [Browse...]              │
│  ├─ Auto-save interval: [5] minutes                    │
│  └─ Maximum thumbnails to cache: [1000]                │
│                                                         │
│  Import                                                 │
│  ├─ ☑ Extract EXIF metadata                            │
│  ├─ ☑ Detect duplicates (SHA-256)                      │
│  ├─ ☑ Find similar images (pHash)                      │
│  ├─ Time clustering window: [30] minutes               │
│  └─ Distance clustering radius: [50] meters            │
│                                                         │
│  Organization                                           │
│  ├─ Canvas naming pattern: [item_[counter:03d]]        │
│  ├─ ☑ Preserve original filenames in metadata          │
│  └─ ☑ Show grid on workspace canvas                    │
│                                                         │
│  Export                                                 │
│  ├─ Default file operation: ○ Copy  ● Move             │
│  ├─ ☑ Generate _info.json sidecar files                │
│  ├─ ☑ Create thumbnails (max 400px)                    │
│  ├─ Image format: [JPEG]  Quality: [85]%               │
│  └─ ☑ Validate before export                           │
│                                                         │
│  Metadata Templates                                     │
│  ├─ [Manage Templates...]                              │
│  └─ Default rights: [CC BY 4.0 ▼]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Integration Summary

This Media Organizer tool serves as the **pre-processing layer** that transforms chaotic field data into the structured Biiif format expected by the recursive IIIF ingest pipeline in the main IIIF Field Archive Studio application.

**Clear Separation of Concerns:**

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| Media Organizer | Pre-processing, organization | Unsorted media | Biiif folder structure |
| Archive Studio (`iiifBuilder.ts`) | IIIF generation | Biiif structure | IIIF Manifests/Collections |

**Data Flow:**
```
Chaos → Organization → Structure → IIIF
  ↓         ↓              ↓         ↓
Media → Organizer GUI → Biiif → iiifBuilder.ts
```

By providing a GUI-based organization workflow, researchers can focus on intellectual organization decisions while the tool handles:
- Technical compliance with Biiif/IIIF conventions
- File renaming and structure creation
- Metadata extraction and enrichment
- Validation and error prevention

The output is guaranteed to be compatible with the existing `iiifBuilder.ts` recursive pipeline, creating a seamless workflow from field research to fully IIIF-compliant digital archive.