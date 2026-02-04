# Test Suite Reorganization - Feature-Based Structure

## 🎯 Transformation Complete

Reorganized test suite from **technical implementation focus** to **user achievement focus**.

---

## Before: Technical Organization

```
src/test/__tests__/actions/
├── import.actions.test.ts
├── content-management.actions.test.ts
└── structure-management.actions.test.ts
```

**Problem:** Organized by action types (technical), not user value

---

## After: Feature-Based Organization

```
src/test/__tests__/
├── README.md ← Overview of all feature sets
├── organize-media/
│   ├── README.md ← What users achieve organizing media
│   ├── import-and-structure.test.ts (12 tests) ✓
│   └── reorder-and-reorganize.test.ts (14 tests) ✓
├── describe-content/
│   ├── README.md ← What users achieve describing content
│   ├── labels-and-metadata.test.ts (16 tests) ✓
│   ├── exif-extraction.test.ts (planned)
│   └── annotations.test.ts (planned)
├── validate-quality/
│   ├── README.md (planned)
│   ├── validate-and-heal.test.ts (planned)
│   └── viewer-compatibility.test.ts (planned)
├── search-and-find/
│   ├── README.md (planned)
│   ├── search-and-filter.test.ts (planned)
│   └── temporal-spatial-search.test.ts (planned)
├── export-and-share/
│   ├── README.md (planned)
│   ├── export-formats.test.ts (planned)
│   ├── static-sites.test.ts (planned)
│   └── archival-packages.test.ts (planned)
├── manage-lifecycle/
│   ├── README.md (planned)
│   ├── trash-and-restore.test.ts (planned)
│   └── storage-cleanup.test.ts (planned)
├── view-and-navigate/
│   ├── README.md (planned)
│   ├── viewer-interactions.test.ts (planned)
│   ├── tile-loading.test.ts (planned)
│   └── navigation.test.ts (planned)
└── collaborate/ (experimental)
    ├── README.md (planned)
    ├── sync-and-collaborate.test.ts (planned)
    └── conflict-resolution.test.ts (planned)
```

**Benefit:** Organized by user value (what users achieve)

---

## 8 Feature Sets Mapped to User Goals

### 1. 📁 organize-media/
**User Goal:** Import field research media and organize it into structured collections

**User Achievements:**
- Import photos from camera/phone
- Detect numbered sequences automatically
- Preserve folder hierarchies
- Group multi-angle captures
- Handle mixed media formats

**Tests:** 26 tests (2 files complete)

---

### 2. 📝 describe-content/
**User Goal:** Add context and metadata to make research discoverable

**User Achievements:**
- Add descriptive labels
- Record metadata (date, location, researcher)
- Set rights and attributions
- Add annotations and notes
- Extract EXIF/GPS automatically

**Tests:** 16 tests (1 file complete, 2 planned)

---

### 3. ✅ validate-quality/
**User Goal:** Ensure IIIF compliance and catch errors before sharing

**User Achievements:**
- Validate manifests against IIIF spec
- Auto-fix common issues
- Detect conflicts (behaviors, IDs)
- Preview viewer compatibility
- Get clear error messages with fixes

**Tests:** Planned

---

### 4. 🔍 search-and-find/
**User Goal:** Quickly find content across large archives

**User Achievements:**
- Full-text search across labels/metadata
- Fuzzy matching for misspellings
- Filter by type (manifest/canvas)
- Autocomplete from history
- Temporal search (by date)
- Spatial search (by location)

**Tests:** Planned

---

### 5. 📤 export-and-share/
**User Goal:** Generate outputs for different publishing platforms

**User Achievements:**
- Export valid IIIF bundles
- Generate static websites (Wax/Canopy)
- Create archival packages (OCFL/BagIt)
- Rewrite IDs for deployment
- Include assets in exports
- Validate before export

**Tests:** Planned

---

### 6. 🗑️ manage-lifecycle/
**User Goal:** Safely delete content with recovery options

**User Achievements:**
- Soft delete to trash (recoverable)
- Restore deleted items
- Permanent deletion (free storage)
- Bulk delete operations
- Prevent accidental data loss

**Tests:** Planned

---

### 7. 👁️ view-and-navigate/
**User Goal:** View high-resolution images and navigate collections

**User Achievements:**
- Deep zoom into large images
- Pan and navigate smoothly
- View annotations in context
- Navigate sequences (prev/next)
- Timeline navigation (by date)
- Map navigation (by location)

**Tests:** Planned

---

### 8. 🤝 collaborate/ (Experimental)
**User Goal:** Work with others on the same archive

**User Achievements:**
- Real-time collaboration
- Conflict detection
- Merge conflict resolution
- Sync status awareness
- Offline-first editing

**Tests:** Planned

---

## Benefits of Feature-Based Organization

### 1. Self-Documenting
**Before:** "What does content-management test?"
**After:** "Tests how users describe their content (labels, metadata, rights)"

### 2. User-Centric
**Before:** Technical actions (updateLabel, updateMetadata)
**After:** User goals (make content discoverable and meaningful)

### 3. Feature-Complete Testing
**Before:** Actions scattered across files
**After:** All related user goals in one place

### 4. Onboarding-Friendly
**Before:** New developers guess from action names
**After:** README explains exactly what users achieve

### 5. Mirrors User Mental Model
**Before:** "I need to call updateLabel action"
**After:** "I want to describe my content so it's discoverable"

---

## Running Tests by Feature

```bash
# Test media organization features
npm test -- organize-media/

# Test content description features
npm test -- describe-content/

# Test quality validation features
npm test -- validate-quality/

# Test search features
npm test -- search-and-find/

# Test export features
npm test -- export-and-share/

# Test lifecycle management features
npm test -- manage-lifecycle/

# Test viewer features
npm test -- view-and-navigate/

# Test collaboration features
npm test -- collaborate/
```

---

## Documentation Structure

Each feature directory includes:

### README.md
- **User Goal:** What users achieve with this feature
- **User Achievements:** Specific capabilities unlocked
- **Tests in Directory:** What's covered
- **IDEAL Outcomes:** What success looks like
- **FAILURE Prevention:** What app prevents
- **Real-World Scenarios:** Concrete examples
- **Success Criteria:** How to measure feature effectiveness

### Test Files
- Named by what users do: `import-and-structure.test.ts`
- Not by technical action: `import.actions.test.ts`

---

## Mapping Old to New

| Old (Technical) | New (User-Focused) | Feature Set |
|----------------|-------------------|-------------|
| `import.actions.test.ts` | `import-and-structure.test.ts` | organize-media/ |
| `structure-management.actions.test.ts` | `reorder-and-reorganize.test.ts` | organize-media/ |
| `content-management.actions.test.ts` | `labels-and-metadata.test.ts` | describe-content/ |

---

## Example: Finding Tests

**User Question:** "How do I know if import works correctly?"

**Before:**
```
Look in actions/ folder...
find import.actions.test.ts...
read code to understand what it tests...
```

**After:**
```
Go to organize-media/
Read README.md → "Import field research media and organize"
See import-and-structure.test.ts
README explains all import scenarios tested
```

---

## Example: Adding New Tests

**Task:** Add test for GPS extraction

**Question 1:** What does user achieve?
→ "Make content discoverable by extracting location data"

**Question 2:** Which feature set?
→ `describe-content/` (adding context/metadata)

**Question 3:** Which file?
→ `exif-extraction.test.ts` (auto-extraction of metadata)

**Result:** Clear path from user need to test location

---

## Migration Complete

**Files Moved:**
- ✅ `actions/import.actions.test.ts` → `organize-media/import-and-structure.test.ts`
- ✅ `actions/structure-management.actions.test.ts` → `organize-media/reorder-and-reorganize.test.ts`
- ✅ `actions/content-management.actions.test.ts` → `describe-content/labels-and-metadata.test.ts`

**Directories Created:**
- ✅ 8 feature-based directories
- ✅ README.md for each (2 complete, 6 planned)
- ✅ Main README.md explaining organization

**Tests Still Passing:**
- ✅ All 42 tests still functional
- ✅ Import paths updated
- ✅ No regressions

---

## Next Steps

For each remaining feature set:
1. Create README.md explaining user goals
2. Add test files following naming pattern
3. Map all user achievements to tests
4. Document real-world scenarios
5. Define success criteria

---

## Impact

**Before:** Tests organized by technical implementation
- Developers think in terms of actions
- Unclear what user value is tested
- Hard to find relevant tests

**After:** Tests organized by user value
- Developers think in terms of user goals
- Clear what each feature enables
- Easy to find and add tests

**Result:** Test suite serves as **feature documentation** that explains what users can achieve with Field Studio.

---

*Reorganization Complete: 2026-01-31*
*Structure: Feature-Based (User Goals)*
*Status: 2 of 8 feature sets complete*
