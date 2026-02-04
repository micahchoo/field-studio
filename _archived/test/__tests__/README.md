# Test Suite Organization - Feature-Based Structure

## Philosophy

Tests are organized by **what users achieve** (feature sets / user goals), not by technical implementation details. Each directory represents a capability that field researchers need.

This structure ensures tests simulate actual app actions, interactions, and reactions using real data from `.Images iiif test/`. Each test corresponds to a user action/interaction and defines what success/failure means for the app's aspirations as a field research IIIF workbench.

---

## Feature Sets & User Goals

### 1. 📁 organize-media/
**User Goal:** Import field research media and organize it into structured collections

**What Users Achieve:**
- Import media from user files
- Detect numbered sequences automatically
- Preserve folder hierarchies
- Group multi‑angle captures
- Handle mixed media formats (images, PDFs, videos)

**Tests:**
- `import‑and‑structure.test.ts` – Import workflows with real images
- `reorder‑and‑reorganize.test.ts` – Structure management (add, remove, reorder)
- `csvImporter.test.ts` – Import metadata from CSV
- `filenameUtils.test.ts` – Sequence detection and pattern matching
- `mediaTypes.test.ts` – Media format recognition

**Key Actions:** Import, detect sequences, create ranges, reorder, import CSV

---

### 2. 📝 describe‑content/
**User Goal:** Add context and metadata to make research discoverable and meaningful

**What Users Achieve:**
- Add descriptive labels
- Record metadata (date, location, researcher)
- Set rights and attributions
- Add annotations and notes
- Extract EXIF/GPS automatically

**Tests:**
- `labels‑and‑metadata.test.ts` – Content management (labels, metadata, rights, behaviors)
- `exif‑extraction.test.ts` – Automatic metadata extraction from photos
- `MetadataEditor.test.tsx` – React component for editing metadata
- `provenanceService.test.ts` – Provenance tracking
- `useVaultSelectors.test.tsx` – React hooks for selecting vault data

**Key Actions:** updateLabel, updateMetadata, updateRights, extract EXIF, add provenance

---

### 3. ✅ validate‑quality/
**User Goal:** Ensure IIIF compliance and catch errors before sharing

**What Users Achieve:**
- Validate manifests against IIIF spec
- Auto‑fix common issues
- Detect conflicts (behaviors, IDs)
- Preview viewer compatibility
- Get clear error messages with fixes

**Tests:**
- `iiifValidation.test.ts` – ID validation, URI checking, duplicate detection
- `validationHealer.test.ts` – Auto‑fixing validation issues
- `validator.test.ts` – Full‑tree validation
- `sanitization.test.ts` – Security sanitization (XSS prevention)
- `iiifBehaviors.test.ts` – IIIF behavior validation and conflict detection
- `iiifHierarchy.test.ts` – Hierarchy integrity validation
- `iiifTypes.test.ts` – Type‑related validation
- `vault.test.ts` – Vault integrity under load
- `errorRecovery.test.ts` – Recovery from corruption

**Key Actions:** Validate tree, auto‑heal, check behaviors, sanitize input, recover from errors

---

### 4. 🔍 search‑and‑find/
**User Goal:** Quickly find content across large archives without manual browsing

**What Users Achieve:**
- Full‑text search across labels/metadata
- Fuzzy matching for misspellings
- Filter by type (manifest/canvas)
- Autocomplete from history
- Temporal search (by date)
- Spatial search (by location)

**Tests:**
- `search‑and‑filter.test.ts` – Keyword search, fuzzy matching, filtering
- `fuzzyMatch.test.ts` – Fuzzy matching algorithm

**Key Actions:** Search, filter, autocomplete, navigate timeline/map

---

### 5. 📤 export‑and‑share/
**User Goal:** Turn field research archives into shareable formats for collaboration, publication, and preservation

**What Users Achieve:**
- Export raw IIIF bundles
- Generate static websites (Canopy)
- Share via IIIF Presentation API
- Prepare for long‑term preservation
- Collaborate with external teams
- Export subsets and selections

**Tests:**
- `export‑actions.test.ts` – User‑facing export workflows (button clicks, format selection)
- `exportService.test.ts` – Unit tests for export service logic
- `iiifBuilder.test.ts` – IIIF manifest building from file trees

**Key Actions:** Export raw IIIF, export static site, export Canopy, export archival

---

### 6. 🗑️ manage‑lifecycle/
**User Goal:** Control storage, deletion, and application settings to maintain archives over time

**What Users Achieve:**
- Monitor and manage storage
- Soft delete with recovery
- Configure application settings
- Handle large archives
- Maintain data integrity

**Tests:**
- `trashService.test.ts` – Trash/restore functionality
- `storage.test.ts` – Storage quota monitoring and optimization
- `useAppSettings.test.ts` – Application settings persistence

**Key Actions:** moveToTrash, restoreFromTrash, emptyTrash, cleanup storage, update settings

---

### 7. 👁️ view‑and‑navigate/
**User Goal:** Browse, inspect, and interact with research archives in a responsive, accessible viewer

**What Users Achieve:**
- View high‑resolution images with IIIF Image API
- Navigate hierarchical archives
- Responsive design across devices
- Performance optimization
- Multi‑viewer compatibility

**Tests:**
- `imageSourceResolver.test.ts` – Image URI resolution and format handling
- `iiifImageApi.test.ts` – IIIF Image API request building and tile calculation
- `performance.test.ts` – Rendering performance with large archives
- `useResponsive.test.ts` – Responsive breakpoints and layout adaptation

**Key Actions:** Zoom, pan, tile loading, navigate sequence, view annotations

---

### 8. 🤝 collaborate/
**User Goal:** Work together with other researchers on the same archive without conflicts or data loss

**What Users Achieve:**
- Concurrent editing without conflicts
- Change tracking and audit trail
- Multi‑user synchronization
- Permission and access control
- Collaborative annotations and discussion

**Tests:**
- `concurrency.test.ts` – Concurrent vault and storage operations, race‑condition detection

**Key Actions:** Sync, detect conflicts, resolve conflicts, offline editing

---

## Cross‑Cutting Tests (Root Level)

**`actions.test.ts`** – Action dispatcher, mutations, and history management  
**`components.test.tsx`** – Production UI components (Icon, EmptyState, LoadingState, etc.)  
**`hooks.test.ts`** – React hooks (useAppSettings, useResponsive, etc.)  
**`integration.test.tsx`** – End‑to‑end user workflows with real image files and React components  

These tests verify foundational behavior that spans multiple feature sets.

---

## Test Structure Within Each Feature

Each test file follows this pattern:

```typescript
describe('User Goal: What users achieve', () => {
  describe('User Interaction: How users trigger', () => {
    it('IDEAL OUTCOME: Success looks like...', () => {
      // Test with real data
    });

    it('FAILURE PREVENTED: App prevents...', () => {
      // Test error handling
    });
  });
});
```

**IDEAL OUTCOME** – What success looks like for the app's aspirations  
**FAILURE PREVENTED** – What the app is trying to avoid/prevent

---

## Running Tests by Feature

```bash
# Test all organization features
npm test -- organize-media/

# Test all content description features
npm test -- describe-content/

# Test all validation features
npm test -- validate-quality/

# Test all search features
npm test -- search-and-find/

# Test all export features
npm test -- export-and-share/

# Test all lifecycle features
npm test -- manage-lifecycle/

# Test all viewer features
npm test -- view-and-navigate/

# Test all collaboration features
npm test -- collaborate/
```

---

## Documentation in Each Directory

Each feature directory contains:
- `README.md` – Explains user goals, what users achieve, tests covered, ideal outcomes, failure prevention, real‑world scenarios, and success criteria
- Test files following naming pattern: `what‑users‑do.test.ts`
- Shared fixtures if needed

---

## Mapping from Old to New Structure

| Old (Technical) | New (User‑Focused) | Feature Set |
|----------------|-------------------|-------------|
| `actions/content‑management.actions.test.ts` | `describe‑content/labels‑and‑metadata.test.ts` | describe‑content/ |
| `actions/import.actions.test.ts` | `organize‑media/import‑and‑structure.test.ts` | organize‑media/ |
| `actions/structure‑management.actions.test.ts` | `organize‑media/reorder‑and‑reorganize.test.ts` | organize‑media/ |
| `services/exportService.test.ts` | `export‑and‑share/export‑actions.test.ts` (plus kept unit tests) | export‑and‑share/ |
| `services/searchService.test.ts` | `search‑and‑find/search‑and‑filter.test.ts` | search‑and‑find/ |
| `services/trashService.test.ts` | `manage‑lifecycle/trashService.test.ts` | manage‑lifecycle/ |
| `services/validator.test.ts` | `validate‑quality/validator.test.ts` | validate‑quality/ |

**Why Better:**
- ✅ Self‑documenting: directory name explains user value
- ✅ Feature‑complete: all related user goals grouped
- ✅ User‑centric: mirrors how users think about the app
- ✅ Discoverable: new developers understand capabilities

---

## Adding New Tests

When adding a new test, ask:

1. **What does the user achieve?** → Pick feature directory
2. **How do they trigger it?** → User interaction
3. **What's the ideal outcome?** → Success scenario
4. **What does app prevent?** → Failure scenario

**Example:**
- User achieves: “Make content discoverable by extracting location data”
- Directory: `describe‑content/`
- File: `exif‑extraction.test.ts`
- Test: “Import geotagged photo → IDEAL: GPS coordinates extracted and searchable”

---

## Test Data Strategy

- **Small fixtures** from `.Images iiif test/` are copied to `src/test/fixtures/data/` for specific test cases (sequence detection, pattern matching, metadata tests).
- **Large files** are referenced in‑place to avoid duplication and to test performance and mixed‑media handling.
- **Real‑world scenarios** are tested using the actual archive (426 files, 214 MB) where appropriate.

---

## Success Metrics

The test suite transformation is successful when:

- ✅ Every user‑facing action has at least one test that simulates the interaction
- ✅ Tests define both ideal outcomes and failure prevention
- ✅ Feature directories are self‑documenting (READMEs complete)
- ✅ Developers can find tests by answering “What does the user achieve?”
- ✅ All tests pass with real data from `.Images iiif test/`

---

*Organized by user value, not technical implementation*  
*Last Updated: 2026‑02‑01*
