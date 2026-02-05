# Component Audit Report: Decomposition Opportunities

**Date:** 2026-02-05  
**Scope:** All molecules and organisms across features  
**Goal:** Identify reusable chunks for sharing between features

**Status:** ✅ Phase 1-2 Complete

---

## Executive Summary

The codebase follows Atomic Design principles well, with clear separation between atoms, molecules, and organisms. Most shared molecules are already in `src/shared/ui/molecules/`. This audit identified **8 actionable opportunities** for further decomposition, and **Phases 1-2 have been completed**.

**Quick Stats:**
- Features with UI components: 9
- Shared molecules: 40+
- Feature-specific molecules audited: 25+
- Duplications removed: 2
- New shared components added: 2
- Components consolidated: 1

**Completed Actions:**
- ✅ Removed deprecated ZoomControl and PageCounter from shared
- ✅ BoardControls now uses viewer's ZoomControl
- ✅ StepIndicator and StepConnector extracted to shared/atoms
- ✅ IconButton enhanced with shortcut and isActive props
- ✅ ToolButton removed (consolidated into IconButton)

---

## 1. Duplications (Move/Consolidate)

### 1.1 ZoomControl - DUPLICATE

| Location | Status | Lines |
|----------|--------|-------|
| `src/shared/ui/molecules/ZoomControl.tsx` | @deprecated | 176 |
| `src/features/viewer/ui/atoms/ZoomControl.tsx` | Active | 173 |
| `src/features/board-design/ui/molecules/BoardControls.tsx` | Reimplementation | 77 |

**Issue:** Shared version is deprecated but still exists. Board-design reimplements zoom controls instead of reusing.

**Action:** 
- ✅ Remove deprecated shared version
- ✅ Update board-design to import from viewer feature

**Priority:** High

---

### 1.2 PageCounter - DUPLICATE

| Location | Status | Lines |
|----------|--------|-------|
| `src/shared/ui/molecules/PageCounter.tsx` | @deprecated | 223 |
| `src/features/viewer/ui/atoms/PageCounter.tsx` | Active | 220 |

**Issue:** Shared version is deprecated but still exported.

**Action:**
- ✅ Remove deprecated shared version
- ✅ Update any imports to use viewer feature

**Priority:** High

---

## 2. Global Candidates (Move to Shared)

### 2.1 WizardStepIndicator → Shared Atom

**Current:** `src/features/metadata-edit/ui/atoms/WizardStepIndicator.tsx`  
**Size:** 65 lines  
**Dependencies:** Icon (shared atom)

**Why Global:**
- Zero domain logic
- Generic step indicator pattern
- Reusable for any multi-step workflow
- Could be used by: onboarding, setup wizards, guided tours

**Proposed Location:** `src/shared/ui/atoms/StepIndicator.tsx`

**Changes Needed:**
```typescript
// Rename to StepIndicator for broader use
export interface StepIndicatorProps {
  step: number;
  label: string;
  active: boolean;
  completed: boolean;
  variant?: 'numbered' | 'simple';
}
```

**Priority:** Medium

---

### 2.2 WizardStepConnector → Shared Atom

**Current:** `src/features/metadata-edit/ui/atoms/WizardStepConnector.tsx`  
**Size:** ~40 lines (estimated)  
**Dependencies:** None

**Why Global:**
- Pure visual connector between steps
- Used with StepIndicator
- Generic pattern

**Proposed Location:** `src/shared/ui/atoms/StepConnector.tsx`

**Priority:** Medium (do with StepIndicator)

---

### 2.3 ToolButton → Shared Molecule

**Current:** `src/features/board-design/ui/atoms/ToolButton.tsx`  
**Size:** 79 lines  
**Dependencies:** Button, Icon (shared atoms)

**Why Global:**
- Toolbar button pattern used across features
- Currently duplicates IconButton functionality
- Useful for: viewer toolbar, annotation tools, board tools

**Proposed Location:** `src/shared/ui/molecules/ToolbarButton.tsx`

**Changes Needed:**
- Merge with IconButton
- Add `shortcut` prop to IconButton
- OR create ToolbarButton as IconButton wrapper

**Priority:** Medium

---

### 2.4 PropertyLabel → Shared Molecule

**Current:** `src/features/metadata-edit/ui/atoms/PropertyLabel.tsx`  
**Size:** 60 lines  
**Dependencies:** None

**Why Global:**
- Generic label + hint badge pattern
- Not IIIF-specific
- Reusable for: form labels, field labels with metadata

**Proposed Location:** `src/shared/ui/molecules/LabelWithHint.tsx`

**Changes Needed:**
- Rename to `LabelWithHint`
- Make `hint` generic (not just Dublin Core)
- Keep styling flexible

**Priority:** Low-Medium

---

## 3. Feature-to-Feature Sharing (Copy Atoms)

### 3.1 Media Player Atoms → Copy to Board-Design

**Current:** `src/features/viewer/ui/atoms/` (MediaPlayer-related)  
**Components:**
- `PlayPauseButton.tsx`
- `VolumeControl.tsx`
- `ProgressBar.tsx`
- `TimeDisplay.tsx`
- `FullscreenButton.tsx`

**Use Case:** Board-design could use media preview for audio/video canvases.

**Action:** Copy atoms to `src/features/board-design/ui/atoms/media/`

**Priority:** Low (future enhancement)

---

### 3.2 ValidationBadge → Copy to Archive/Staging

**Current:** `src/features/metadata-edit/ui/atoms/ValidationBadge.tsx`  
**Size:** ~50 lines  

**Use Case:** Archive and staging features could show validation status on items.

**Action:** Copy to:
- `src/features/archive/ui/atoms/ValidationBadge.tsx`
- `src/features/staging/ui/atoms/ValidationBadge.tsx`

**Priority:** Low

---

### 3.3 FileDropZone → Copy to Staging

**Current:** `src/features/metadata-edit/ui/atoms/FileDropZone.tsx`  
**Size:** ~100 lines

**Use Case:** Staging feature could use for drag-drop file import.

**Action:** Copy to `src/features/staging/ui/atoms/FileDropZone.tsx`

**Priority:** Medium (if staging needs file import)

---

### 3.4 LanguageTag → Copy to Viewer/Structure

**Current:** `src/features/metadata-edit/ui/atoms/LanguageTag.tsx`  
**Size:** ~60 lines

**Use Case:** Viewer could show language tags on multilingual content. Structure view could show in metadata.

**Action:** Copy to:
- `src/features/viewer/ui/atoms/LanguageTag.tsx`
- `src/features/structure-view/ui/atoms/LanguageTag.tsx`

**Priority:** Low

---

## 4. Refactoring Opportunities

### 4.1 BoardControls Refactor

**Current:** `src/features/board-design/ui/molecules/BoardControls.tsx`

**Issue:** Reimplements zoom controls that exist in viewer.

**Action:**
```typescript
// Before: BoardControls implements its own zoom
// After: BoardControls composes ZoomControl from viewer
import { ZoomControl } from '@/src/features/viewer/ui/atoms';
```

**Priority:** High

---

### 4.2 TabButton Consolidation

**Current:** 
- `src/shared/ui/atoms/TabButtonBase.tsx` - Generic
- `src/features/viewer/ui/atoms/TabButton.tsx` - Specific

**Issue:** Viewer TabButton is redundant with TabButtonBase.

**Action:**
- Deprecate viewer TabButton
- Update viewer to use TabButtonBase
- Add any missing props to TabButtonBase

**Priority:** Medium

---

### 4.3 PropertyInput Simplification

**Current:** `src/features/metadata-edit/ui/atoms/PropertyInput.tsx`

**Issue:** Thin wrapper around shared FormInput. May not need to exist.

**Action:**
- Evaluate if PropertyInput adds enough value
- Consider inlining into MetadataTabPanel
- OR keep as semantic alias

**Priority:** Low

---

## 5. Organism Decomposition Analysis

### 5.1 ArchiveView Organism (394 lines)

**Structure:**
- ArchiveHeader (organism)
- ArchiveGrid (organism)
- MultiSelectFilmstrip (molecule)
- ContextMenu (shared molecule)

**Assessment:** ✅ Well decomposed
- No immediate changes needed
- ArchiveGrid could be virtualized further if needed

---

### 5.2 MetadataEditorPanel Organism (166 lines)

**Structure:**
- TabBar (shared molecule)
- MetadataTabPanel (molecule)
- TechnicalTabPanel (molecule)
- AnnotationsTabPanel (molecule)
- LocationPickerModal (molecule)

**Assessment:** ✅ Well decomposed
- Each panel is focused
- Tab pattern is consistent

---

### 5.3 BoardCanvas Organism (192 lines)

**Structure:**
- CanvasGrid (atom)
- MiniMap (atom)
- BoardNodeLayer (molecule)
- ConnectionLayer (molecule)
- BoardControls (molecule)

**Assessment:** ✅ Well decomposed
- Could extract viewport logic to hook if reused

---

### 5.4 StructureTreeView Organism (174 lines)

**Structure:**
- TreeNodeItem (molecule)
- StructureToolbar (molecule)
- EmptyStructure (molecule)
- useStructureTree (hook)

**Assessment:** ✅ Well decomposed
- Tree logic properly in hook
- Molecules are focused

---

### 5.5 ViewerView Organism (not audited in detail)

**Known Components:**
- ViewerToolbar (molecule)
- FilmstripNavigator (molecule)
- MediaPlayer (molecule)
- Multiple atoms from viewer/ui/atoms

**Assessment:** 
- Many atoms suggest good decomposition
- ViewerToolbar may be decomposable further if needed

---

## 6. Shared Molecules Quality Review

### 6.1 Already Extracted (Good)

These are already properly shared:
- ✅ `IconButton` - Used across all features
- ✅ `SearchField` - Used in Archive, Search
- ✅ `ViewToggle` - Used in Archive, could be used elsewhere
- ✅ `EmptyState` - Universal pattern
- ✅ `LoadingState` - Universal pattern
- ✅ `TabBar` - Used in MetadataEditorPanel
- ✅ `FormInput` - Used in metadata-edit
- ✅ `ContextMenu` - Used in Archive
- ✅ `StackedThumbnail` - Used in Archive, Staging
- ✅ `CanvasItem` - Used in Staging

### 6.2 Ready for Extraction

These shared molecules are good candidates for broader use:
- `FacetPill` - Could be used in Search, Archive filtering
- `ResultCard` - Could be used in Search results
- `RangeSelector` - Could be used in timeline filtering
- `TimelineTick` - Specific to timeline feature (keep as-is)

---

## 7. Action Plan

### Phase 1: Cleanup Duplications (High Priority) ✅ COMPLETE

- [x] Remove `src/shared/ui/molecules/ZoomControl.tsx`
- [x] Remove `src/shared/ui/molecules/PageCounter.tsx`
- [x] Update board-design/BoardControls to use viewer's ZoomControl

**Result:** BoardControls now composes ZoomControl atom with percentage display and fit-to-view functionality.

---

### Phase 2: Extract Global Components (Medium Priority) ✅ COMPLETE

- [x] Move `WizardStepIndicator` → `src/shared/ui/atoms/StepIndicator.tsx`
  - Added `variant` prop for 'numbered' | 'simple' modes
  - Added dark mode support
- [x] Move `WizardStepConnector` → `src/shared/ui/atoms/StepConnector.tsx`
  - Made width configurable
  - Added dark mode support
- [x] Consolidate `ToolButton` with `IconButton`
  - Added `isActive` prop for selected state
  - Added `shortcut` prop for keyboard hints
  - Added `id` prop
  - Removed redundant ToolButton component

**Result:** IconButton is now more powerful and can replace ToolButton entirely.

---

### Phase 3: Feature Cross-Pollination (Low Priority) ⏸️ ON HOLD

- [ ] Copy `ValidationBadge` to archive/staging (if needed)
- [ ] Copy `FileDropZone` to staging (if needed)
- [ ] Copy `LanguageTag` to viewer (if needed)

**Note:** Only copy when a feature actually needs these components.

---

### Phase 4: Refactoring (As Needed) 📋 BACKLOG

- [ ] Consolidate viewer TabButton with shared TabButtonBase
- [ ] Simplify PropertyInput if appropriate
- [ ] Create LabelWithHint from PropertyLabel (if needed by 2+ features)

---

## 8. Summary Table

### Completed ✅

| Component | Action | Status |
|-----------|--------|--------|
| ZoomControl (shared) | 🗑️ Removed | ✅ Deleted |
| PageCounter (shared) | 🗑️ Removed | ✅ Deleted |
| BoardControls | 🔧 Refactored | ✅ Uses viewer/ZoomControl |
| WizardStepIndicator | 📦 Moved | ✅ Now shared/atoms/StepIndicator |
| WizardStepConnector | 📦 Moved | ✅ Now shared/atoms/StepConnector |
| ToolButton | 🔧 Consolidated | ✅ Merged into IconButton |

### Remaining (Phase 3 - Low Priority)

| Component | Current Location | Action | Priority | Target Location |
|-----------|-----------------|--------|----------|-----------------|
| PropertyLabel | metadata-edit/atoms | 📦 Move | Low | shared/molecules/LabelWithHint |
| ValidationBadge | metadata-edit/atoms | 📋 Copy | Low | archive/, staging/ atoms (if needed) |
| FileDropZone | metadata-edit/atoms | 📋 Copy | Low | staging/ atoms (if needed) |
| LanguageTag | metadata-edit/atoms | 📋 Copy | Low | viewer/, structure/ atoms (if needed) |
| Media atoms | viewer/atoms | 📋 Copy | Low | board-design/ atoms (if needed) |
| TabButton (viewer) | viewer/atoms | 🗑️ Deprecate | Medium | Use shared/TabButtonBase |

**Legend:**
- 🗑️ Remove - Delete deprecated/duplicate
- 🔧 Refactor - Update to use shared component
- 📦 Move - Extract to shared
- 📋 Copy - Duplicate to another feature (only when needed)

---

## 9. Compliance Check

### Atomic Design Principles

| Principle | Status | Notes |
|-----------|--------|-------|
| Atoms have no state | ✅ | All atoms follow this |
| Atoms have no domain logic | ✅ | All atoms follow this |
| Molecules compose only atoms | ✅ | Most follow this |
| Molecules have local UI state only | ✅ | All follow this |
| Organisms have domain logic | ✅ | All follow this |
| No prop drilling | ✅ | Uses template injection |

### Cross-Feature Dependencies

Current cross-feature imports:
- board-design → shared (good)
- metadata-edit → shared (good)
- viewer → shared (good)
- archive → shared (good)
- structure-view → shared (good)
- staging → shared (good)

**No circular dependencies detected.**

---

## 10. Recommendations

### Immediate (This Week)
1. Remove deprecated ZoomControl and PageCounter from shared
2. Update board-design to use viewer's ZoomControl

### Short Term (This Sprint)
3. Extract StepIndicator and StepConnector to shared
4. Consolidate ToolButton with IconButton

### Medium Term (Next Sprint)
5. Evaluate which feature-to-feature copies are actually needed
6. Copy components only when a feature actually needs them

### Ongoing
7. Continue pattern of extracting to shared when 2+ features need something
8. Keep atoms feature-specific until reuse is proven
9. Document shared components in README

---

**Audit Completed By:** Kimi Code  
**Next Review:** After Phase 1 completion
