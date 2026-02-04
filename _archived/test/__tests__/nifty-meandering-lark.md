# Pipeline Test Suite - Action-Driven Testing Plan

## Executive Summary

Transform the test suite to **simulate actual app actions, interactions, and reactions** using real data from `.Images iiif test/`. Each test corresponds to a user action/interaction and defines what success/failure means for the app's aspirations as a field research IIIF workbench.

## Core Philosophy

**Tests should:**
1. Simulate **actions available through the app** (not just service functions)
2. Define an **ideal outcome** - what success looks like for the app's aspirations 
3. Define what **failure means** - what the app is trying to avoid/prevent
4. Map to **user interactions** - clicks, drags, keyboard shortcuts, commands
5. Gradually integrate **all available actions and interactions**

## Available Actions & Interactions Inventory

### Category 1: Content Management Actions (from actions.ts)

| Action | User Interaction | Ideal Outcome | Failure Means |
|--------|------------------|---------------|---------------|
| `updateLabel` | Edit label field in Inspector | Label updated, reflects in breadcrumb/tree | Empty label breaks navigation |
| `updateSummary` | Edit summary field | Summary visible in metadata view | Lost context for research |
| `updateMetadata` | Add metadata rows in MetadataEditor | Searchable, exportable metadata | Data lost or corrupted |
| `updateRights` | Select from rights dropdown | Proper attribution, legal compliance | Copyright violation risk |
| `updateNavDate` | Date picker in Inspector | Temporal navigation works | Timeline view broken |
| `updateBehavior` | Toggle behavior checkboxes | Viewer compatibility maintained | Viewer rendering fails |
| `updateViewingDirection` | Dropdown selection | Proper page turn direction | Confusing navigation |
| `addCanvas` | Import images / Add from staging | New page in manifest | Import fails silently |
| `removeCanvas` | Delete button / keyboard Del | Canvas removed, relationships updated | Orphaned annotations |
| `reorderCanvases` | Drag-drop in tree/filmstrip | Order persists in export | Sequence lost |
| `addAnnotation` | Draw/type annotation tool | Annotation visible in viewer | Content disappears |
| `removeAnnotation` | Delete annotation button | Annotation removed cleanly | Broken annotation pages |
| `updateCanvasDimensions` | Auto-detect from image / manual edit | Correct zoom/pan in viewer | Distorted images |
| `moveItem` | Drag-drop between collections | Hierarchy maintained | Lost in tree |
| `batchUpdate` | Batch metadata edit / CSV import | Mass updates efficient | Partial failures |
| `moveToTrash` | Delete button (soft delete) | Recoverable deletion | Accidental data loss |
| `restoreFromTrash` | Restore button in trash view | Item returns to original location | Broken relationships |
| `emptyTrash` | Empty trash button | Permanent deletion, storage freed | Unrecoverable loss |
| `reloadTree` | Import IIIF JSON | Tree replaced, validated | Invalid IIIF crashes app |

### Category 2: Import/Ingest Interactions

| Interaction | Trigger | Ideal Outcome | Failure Means |
|-------------|---------|---------------|---------------|
| Import Files | Drag-drop / file picker | All formats recognized, structured | Unsupported format crashes |
| Detect Sequences | Auto on import | Numbered files grouped into ranges | Manual reordering needed |
| Extract EXIF | Auto on image import | Metadata auto-populated | Lost capture context |
| Extract GPS | Auto on geotagged images | Map view shows locations | Lost spatial context |
| Folder Structure | Import nested folders | Hierarchy preserved as ranges | Flat dump of files |
| Duplicate Detection | SHA-256 check on import | Storage saved, user notified | Wasted storage quota |
| Resume Import | Page reload during import | Checkpoint restored, continues | Lost progress |
| Corrupted File | Import invalid image | Error logged, import continues | Entire batch fails |

### Category 3: Search Interactions

| Interaction | Trigger | Ideal Outcome | Failure Means |
|-------------|---------|---------------|---------------|
| Search All Fields | Type in search box | Results ranked by relevance | No results found |
| Fuzzy Search | Misspelled query | Still finds close matches | Exact match required |
| Autocomplete | Type partial query | Suggestions appear | Must type full query |
| Filter by Type | Select type filter | Only manifests/canvases shown | Mixed results |
| Search History | Up/down arrows | Recent searches recalled | Lost search context |

### Category 4: Export Interactions

| Interaction | Trigger | Ideal Outcome | Failure Means |
|-------------|---------|---------------|---------------|
| Export IIIF Bundle | Export > Raw IIIF | Valid ZIP with manifest.json | Unreadable archive |
| Export Static Site | Export > Static Site | Viewable HTML with search | Non-functional site |
| Export Canopy | Export > Canopy | Valid canopy.yml config | Invalid config |
| Export with Assets | Toggle "Include Assets" | Images bundled in ZIP | Missing images in export |
| Validate Before Export | Auto validation | Only valid IIIF exported | Broken manifests exported |
| Rewrite IDs | Set base URL | All IDs point to new base | Broken links |

### Category 5: Validation Interactions

| Interaction | Trigger | Ideal Outcome | Failure Means |
|-------------|---------|---------------|---------------|
| Auto Validation | After any edit | Issues highlighted in UI | Silent corruption |
| Validation Panel | Open QC Dashboard | All issues listed with fixes | No actionable feedback |
| Auto-Heal | Click "Fix All" | Common issues resolved | Manual fixing required |
| Behavior Conflicts | Set conflicting behaviors | Prevented or warned | Viewer incompatibility |
| Missing Required | Save without label | Prevented with clear message | Invalid IIIF saved |

### Category 6: Collaboration/Sync Interactions (Experimental)

| Interaction | Trigger | Ideal Outcome | Failure Means |
|-------------|---------|---------------|---------------|
| Concurrent Edits | Two users edit same manifest | Merge conflicts detected | Silent overwrite |
| Sync Status | Connection indicator | Shows online/offline/syncing | Unknown sync state |
| Conflict Resolution | Merge conflict dialog | User chooses version | Data lost |

### Category 7: Viewer Interactions

| Interaction | Trigger | Ideal Outcome | Failure Means |
|-------------|---------|---------------|---------------|
| Open in Viewer | Click view button | OpenSeadragon shows image | Blank viewer |
| Zoom/Pan | Mouse wheel / drag | Smooth navigation | Choppy/broken |
| Tile Loading | Zoom into large image | Progressive tile loading | Timeout/404 |
| Annotations | Click annotation | Highlighted in viewer | Not visible |
| Page Navigation | Arrow keys / filmstrip | Sequence preserved | Random order |

### Category 8: Keyboard Shortcuts & Commands

| Shortcut | Command | Ideal Outcome | Failure Means |
|----------|---------|---------------|---------------|
| Cmd+K | Open command palette | Fuzzy searchable commands | Must navigate menus |
| Cmd+Z | Undo | Last action reverted | Lost work |
| Cmd+Shift+Z | Redo | Action re-applied | Can't recover |
| Del | Delete selected | Item moved to trash | Permanent delete |
| Cmd+F | Search | Focus search box | No quick search |
| Cmd+E | Export | Export dialog opens | Must navigate menu |

## Test Structure: Action-Based Test Suites

### Organization

```
src/test/__tests__/actions/
  ├── content-management.actions.test.ts    # updateLabel, updateMetadata, etc.
  ├── structure-management.actions.test.ts  # addCanvas, reorderCanvases, moveItem
  ├── trash-management.actions.test.ts      # moveToTrash, restoreFromTrash, emptyTrash
  ├── import.actions.test.ts                # File import, sequence detection
  ├── metadata-extraction.actions.test.ts   # EXIF, GPS, CSV import
  ├── search.actions.test.ts                # Search, filter, autocomplete
  ├── export.actions.test.ts                # All export formats
  ├── validation.actions.test.ts            # Validate, heal, prevent errors
  ├── viewer.actions.test.ts                # Zoom, pan, tile loading
  └── integration.actions.test.ts           # Full workflows
```

## Test Template: Action-Driven Test Pattern

```typescript
describe('Action: updateLabel', () => {
  // SETUP: Real data from .Images iiif test
  const testFile = 'Karwaan/108.png';

  describe('User Interaction: Edit label in Inspector', () => {
    it('IDEAL OUTCOME: Label updates and reflects in tree navigation', async () => {
      // Arrange: Import file, get canvas
      const manifest = await importFiles([testFile]);
      const canvas = getFirstCanvas(manifest);

      // Act: Simulate user editing label in Inspector
      const newLabel = { en: ['Karwaan Scene 108'] };
      actions.updateLabel(canvas.id, newLabel);

      // Assert: Ideal outcome achieved
      expect(getEntity(canvas.id).label).toEqual(newLabel);
      expect(breadcrumbText).toContain('Karwaan Scene 108');
      expect(treeNodeText(canvas.id)).toBe('Karwaan Scene 108');
    });

    it('FAILURE SCENARIO: Empty label breaks navigation', async () => {
      // Arrange
      const canvas = await importFiles([testFile]).then(getFirstCanvas);

      // Act: User clears label (what app tries to prevent)
      const emptyLabel = { en: [] };
      const result = actions.updateLabel(canvas.id, emptyLabel);

      // Assert: Failure prevented
      expect(result.success).toBe(false);
      expect(result.error).toContain('Label cannot be empty');
      // Original label preserved
      expect(getEntity(canvas.id).label).toBeDefined();
    });
  });
});
```

## Test Data Strategy

### From `.Images iiif test/` (426 files, 214 MB)

**Small Fixtures** (copy to `src/test/fixtures/data/`):
- `karwaan-sequence/` - 7 PNG files for sequence tests
- `multi-angle/` - front/back/LCD samples for pattern detection
- `geotagged/` - Sample with EXIF/GPS for metadata tests
- `metadata/` - CSV file for import tests

**Reference In-Place** (use paths directly):
- Large images (>1 MB) for tile generation tests
- Full archive for performance/stress tests
- Documents (PDF) for mixed-media tests
- Videos (MP4) for A/V support tests

## Phase 1: Core Action Tests (Week 1)

### Priority 1: Import Actions
File: `import.actions.test.ts`

```typescript
describe('Import Actions', () => {
  it('ACTION: Import single image → IDEAL: Canvas created with correct dimensions', () => {
    // Use: Karwaan/108.png
    // Verify: Canvas has width/height from image
  });

  it('ACTION: Import sequence → IDEAL: Range auto-created with numeric order', () => {
    // Use: Karwaan/108-114.png
    // Verify: Range exists, canvases ordered
  });

  it('ACTION: Import corrupted file → FAILURE PREVENTED: Import continues, error logged', () => {
    // Use: Valid + corrupted file
    // Verify: Valid file imported, error reported
  });

  it('ACTION: Import during quota exhaustion → FAILURE PREVENTED: Clear error, cleanup', () => {
    // Mock: navigator.storage.estimate() → 95% full
    // Verify: Import stopped, user warned
  });
});
```

### Priority 2: Content Management Actions
File: `content-management.actions.test.ts`

```typescript
describe('Content Management Actions', () => {
  it('ACTION: updateLabel → IDEAL: Label updated, reflected everywhere', () => {
    // Verify: Inspector, tree, breadcrumb, search index
  });

  it('ACTION: updateMetadata → IDEAL: Metadata searchable and exportable', () => {
    // Add metadata → search for it → export → verify in ZIP
  });

  it('ACTION: updateRights → IDEAL: Rights URI validated, compatible', () => {
    // Use: Valid rights URI from IIIF spec
    // Verify: Accepted, shown in export
  });

  it('ACTION: updateBehavior → FAILURE PREVENTED: Conflicting behaviors rejected', () => {
    // Try: 'auto-advance' + 'no-auto-advance'
    // Verify: Rejected with clear error
  });
});
```

### Priority 3: Structure Management Actions
File: `structure-management.actions.test.ts`

```typescript
describe('Structure Management Actions', () => {
  it('ACTION: addCanvas → IDEAL: New page added, annotations preserved', () => {
    // Import manifest, add canvas, verify items array
  });

  it('ACTION: reorderCanvases → IDEAL: Drag-drop order persists in export', () => {
    // Reorder → export → verify items order in JSON
  });

  it('ACTION: moveItem → IDEAL: Item moved, relationships updated', () => {
    // Move canvas between manifests
    // Verify: Old parent updated, new parent updated
  });

  it('ACTION: removeCanvas → FAILURE PREVENTED: Orphaned annotations handled', () => {
    // Canvas with annotations → remove
    // Verify: Annotations also removed or warning shown
  });
});
```

## Phase 2: Search & Metadata Actions (Week 2)

### Priority 4: Metadata Extraction
File: `metadata-extraction.actions.test.ts`

```typescript
describe('Metadata Extraction Actions', () => {
  it('ACTION: Import photo with EXIF → IDEAL: Timestamp extracted as navDate', () => {
    // Use: archive/PHOTO-2019-03-03-12-51-01.jpg
    // Verify: navDate = 2019-03-03T12:51:01
  });

  it('ACTION: Import geotagged image → IDEAL: GPS shown on map view', () => {
    // Use: Image with GPS coordinates
    // Verify: navPlace created with lat/lon
  });

  it('ACTION: Apply CSV metadata → IDEAL: Fuzzy matched to filenames', () => {
    // Use: 2018_1.csv + matching images
    // Verify: Metadata merged correctly
  });

  it('ACTION: Import without metadata → FAILURE PREVENTED: Basic metadata generated', () => {
    // Use: Image with no EXIF
    // Verify: Label from filename, no crash
  });
});
```

### Priority 5: Search Actions
File: `search.actions.test.ts`

```typescript
describe('Search Actions', () => {
  it('ACTION: Search for keyword → IDEAL: Results ranked by relevance', () => {
    // Import 30+ files, search "Karwaan"
    // Verify: Karwaan files ranked highest
  });

  it('ACTION: Fuzzy search → IDEAL: Misspelling finds close matches', () => {
    // Search "Karawaan" (misspelled)
    // Verify: Returns "Karwaan" results
  });

  it('ACTION: Autocomplete → IDEAL: Suggestions from search history', () => {
    // Search "kar" → verify suggestions
  });

  it('ACTION: Search empty archive → FAILURE HANDLED: Helpful empty state', () => {
    // Search with no results
    // Verify: "No results" message, not crash
  });
});
```

## Phase 3: Export & Validation Actions (Week 3)

### Priority 6: Export Actions
File: `export.actions.test.ts`

```typescript
describe('Export Actions', () => {
  it('ACTION: Export raw IIIF → IDEAL: Valid ZIP with correct structure', () => {
    // Import files → export
    // Verify: ZIP contains manifest.json, validates
  });

  it('ACTION: Export static site → IDEAL: HTML renders with search', () => {
    // Export → verify index.html, search.json exist
  });

  it('ACTION: Export with base URL → IDEAL: All IDs rewritten', () => {
    // Set baseUrl → export → verify IDs
  });

  it('ACTION: Export invalid manifest → FAILURE PREVENTED: Validation error shown', () => {
    // Corrupt manifest → try export
    // Verify: Prevented with clear error
  });
});
```

### Priority 7: Validation Actions
File: `validation.actions.test.ts`

```typescript
describe('Validation Actions', () => {
  it('ACTION: Auto-validate on edit → IDEAL: Issues highlighted immediately', () => {
    // Make invalid change → verify UI shows error
  });

  it('ACTION: Click "Fix All" → IDEAL: Common issues auto-healed', () => {
    // Introduce fixable issues → auto-heal
    // Verify: Issues resolved
  });

  it('ACTION: Save without required field → FAILURE PREVENTED: Clear validation message', () => {
    // Remove label → try to continue
    // Verify: Blocked with helpful message
  });
});
```

## Phase 4: Advanced Actions (Week 4)

### Priority 8: Trash Management
File: `trash-management.actions.test.ts`

```typescript
describe('Trash Management Actions', () => {
  it('ACTION: moveToTrash → IDEAL: Soft delete, recoverable', () => {
    // Delete canvas → verify in trash view
  });

  it('ACTION: restoreFromTrash → IDEAL: Returns to original location', () => {
    // Delete → restore → verify hierarchy
  });

  it('ACTION: emptyTrash → IDEAL: Storage freed, permanent deletion', () => {
    // Empty trash → verify IndexedDB size reduced
  });

  it('ACTION: Delete with relationships → FAILURE PREVENTED: Warning shown', () => {
    // Delete manifest with child canvases
    // Verify: Confirmation dialog, not silent delete
  });
});
```

### Priority 9: Viewer Actions
File: `viewer.actions.test.ts`

```typescript
describe('Viewer Actions', () => {
  it('ACTION: Open in viewer → IDEAL: OpenSeadragon shows image', () => {
    // Import large image → open viewer
    // Verify: Viewer initialized, tiles load
  });

  it('ACTION: Zoom into large image → IDEAL: Progressive tile loading', () => {
    // Use: 2.5 MB image
    // Verify: Tiles requested, rendered
  });

  it('ACTION: Click annotation → IDEAL: Highlighted in viewer', () => {
    // Add annotation → open viewer → click
    // Verify: Annotation visible
  });

  it('ACTION: Tile generation fails → FAILURE HANDLED: Fallback to full image', () => {
    // Mock: Tile generation error
    // Verify: Full image shown, not blank
  });
});
```

## Phase 5: Integration Workflows (Week 5)

### Priority 10: Full Workflows
File: `integration.actions.test.ts`

```typescript
describe('Integration Workflows', () => {
  it('WORKFLOW: Field researcher imports, annotates, exports', () => {
    // 1. Import mixed media (images, PDFs, videos)
    // 2. Extract EXIF metadata
    // 3. Apply CSV metadata
    // 4. Add annotations
    // 5. Search content
    // 6. Export as Canopy site
    // IDEAL: Complete publishable archive
  });

  it('WORKFLOW: Recover from partial failure', () => {
    // Import batch with some corrupted files
    // Continue processing valid files
    // Generate error report
    // IDEAL: Recoverable errors don't stop work
  });

  it('WORKFLOW: Large dataset performance', () => {
    // Import 100+ files
    // IDEAL: Completes within 30s, responsive UI
  });
});
```

## Migration Strategy: Deleting Redundant Tests

### DELETE Immediately

1. **Tautological tests** (~50 tests):
   - Constant definition tests
   - "should be exported" tests
   - Type existence tests

2. **Trivial prop tests** (~30 tests):
   - Icon className forwarding
   - Simple prop passing
   - Mock component tests

3. **Implementation detail tests** (~40 tests):
   - Internal state tracking
   - Private method tests
   - Mock-heavy validation tests

**Total Deleted: ~120 tests (24% of current suite)**

### REPLACE with Action Tests

1. **storage.test.ts** → Keep with docs, supplement with real storage in action tests
2. **exportService.test.ts** → Move to `export.actions.test.ts` (no mocks)
3. **integration.test.tsx** → Enhance and move to `integration.actions.test.ts`

### KEEP as Supporting Tests

1. **sanitization.test.ts** - Security critical
2. **fuzzyMatch.test.ts** - Algorithm correctness
3. **iiifValidation.test.ts** - Spec compliance
4. **csvImporter.test.ts** - Edge case coverage

## Success Metrics

### Before Migration
- Total tests: ~500
- Action-based tests: 0
- Mock-heavy tests: ~150 (30%)
- Real data tests: ~20 (4%)

### After Migration (Target)
- Total tests: ~400 (fewer, better)
- Action-based tests: ~150 (37.5%)
- Mock-free tests: ~320 (80%)
- Real data tests: ~150 (37.5%)

### Quality Metrics
- Each test maps to user action: 100%
- Ideal outcome defined: 100%
- Failure scenario defined: 100%
- Uses real test data: 80%+

## Implementation Sequence

1. **Week 1**: Create fixtures, implement import + content management actions
2. **Week 2**: Search + metadata extraction actions
3. **Week 3**: Export + validation actions
4. **Week 4**: Trash + viewer actions
5. **Week 5**: Integration workflows, delete redundant tests

## Critical Files

1. `/src/test/fixtures/pipelineFixtures.ts` - Real data loading
2. `/src/test/__tests__/actions/import.actions.test.ts` - Foundation
3. `/src/test/__tests__/actions/content-management.actions.test.ts` - Core actions
4. `/src/test/__tests__/actions/export.actions.test.ts` - No mocks
5. `/src/test/__tests__/actions/integration.actions.test.ts` - Full workflows
