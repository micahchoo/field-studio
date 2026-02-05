# Atomic Design Feature Audit

**Date:** 2026-02-05  
**Scope:** All features in `src/features/`  
**Goal:** Identify violations and create decomposition plans with ESLint enforcement

---

## Executive Summary

### Critical Finding: Missing Feature-Specific Atoms

All features suffer from **"fat molecules"** - molecules that are 200-700+ lines because they build complex UI directly from shared atoms (Button, Input, Icon) without intermediate feature-specific atoms.

### The Problem Pattern
```tsx
// ❌ WRONG: Building complex UI from primitives in molecules
export const ViewerWorkbench = () => {
  // 532 lines of JSX building tab panels, form controls,
  // color-coded URL segments, inline select elements, etc.
  return (
    <div>
      <select>...</select>  {/* Native HTML - violates button rule */}
      <input type="range">   {/* Native HTML - no atom wrapper */}
      {/* 500+ more lines of inline component structure */}
    </div>
  );
};
```

### The Solution Pattern
```tsx
// ✅ CORRECT: Compose feature-specific atoms
export const ViewerWorkbench = () => {
  return (
    <WorkbenchLayout>
      <ImagePreviewPanel url={url} />
      <ParameterPanel>
        <RegionSelector value={region} onChange={setRegion} />
        <SizeSelector value={size} onChange={setSize} />
        <RotationControl value={rotation} onChange={setRotation} />
      </ParameterPanel>
    </WorkbenchLayout>
  );
};
```

---

## Feature 1: Viewer (`src/features/viewer/`)

### Current Structure
```
viewer/
├── ui/
│   ├── molecules/
│   │   ├── AnnotationCanvas.tsx      (157 lines) ✅ GOOD
│   │   ├── AnnotationForm.tsx        (needs audit)
│   │   ├── AnnotationToolbar.tsx     (84 lines)  ✅ GOOD
│   │   ├── ComposerCanvas.tsx        (230 lines) ⚠️ BORDERLINE
│   │   ├── ComposerSidebar.tsx       (needs audit)
│   │   ├── ComposerToolbar.tsx       (needs audit)
│   │   ├── MediaPlayer.tsx           (488 lines) ❌ VIOLATION
│   │   ├── ViewerSearchPanel.tsx     (needs audit)
│   │   └── ViewerWorkbench.tsx       (532 lines) ❌ VIOLATION
│   └── organisms/
│       ├── AnnotationToolPanel.tsx   (130 lines) ✅ GOOD
│       ├── CanvasComposerPanel.tsx   (needs audit)
│       └── ViewerView.tsx            (472 lines) ❌ VIOLATION
└── model/
    ├── annotation.ts
    ├── composer.ts
    └── index.ts
```

### Violations Found

#### 1.1 ViewerWorkbench.tsx (532 lines)
**File:** [`src/features/viewer/ui/molecules/ViewerWorkbench.tsx`](src/features/viewer/ui/molecules/ViewerWorkbench.tsx:1)

**Violations:**
- ❌ **No feature atoms** - Builds entire workbench UI from Button/Input/Icon primitives
- ❌ **Native HTML elements** - Uses `<select>`, `<input type="range">` directly (violates atomic button enforcement)
- ❌ **Inline tab component** - Lines 256-277 define tab UI inline instead of using TabBar atom
- ❌ **Inline parameter sections** - Lines 283-450 define form sections inline
- ❌ **URL segment rendering** - Lines 227-250 build complex colored URL display inline
- ⚠️ **Too much local state** - 10+ useState calls (acceptable but indicates decomposition needed)

**Inline Components That Should Be Atoms:**
```tsx
// Lines 256-277: Tab bar (should be WorkbenchTabBar atom)
// Lines 283-322: Region section (should be RegionSelector atom)
// Lines 325-396: Size section (should be SizeSelector atom)
// Lines 399-450: Rotation section (should be RotationControl atom)
// Lines 227-250: URL display (should be IIIFUrlDisplay atom)
// Lines 211-224: Image preview (should be ImagePreview atom)
```

#### 1.2 MediaPlayer.tsx (488 lines)
**File:** [`src/features/viewer/ui/molecules/MediaPlayer.tsx`](src/features/viewer/ui/molecules/MediaPlayer.tsx:1)

**Violations:**
- ❌ **No media atoms** - Builds player controls inline
- ❌ **Progress bar** - Custom implementation inline (should be ProgressBar atom)
- ❌ **Volume control** - Inline slider implementation
- ❌ **Time display** - Inline formatting logic
- ❌ **Control buttons** - Play/pause/mute buttons defined inline

**Should Extract:**
```tsx
// MediaControlButton - Play, pause, mute, fullscreen buttons
// ProgressBar - Seekable progress with buffer indicator  
// VolumeSlider - Volume control with mute toggle
// TimeDisplay - MM:SS formatted time
// PlaybackRateSelect - Speed selector
// MediaControls - Container with layout
```

#### 1.3 ViewerView.tsx (472 lines)
**File:** [`src/features/viewer/ui/organisms/ViewerView.tsx`](src/features/viewer/ui/organisms/ViewerView.tsx:1)

**Violations:**
- ❌ **Organism too large** - 472 lines exceeds comfortable organism size (200-300)
- ❌ **Inline toolbar** - Viewer toolbar built inline (lines 150-250 approximate)
- ❌ **Filmstrip inline** - Canvas thumbnail strip inline
- ⚠️ **Legacy imports** - Imports from `@/components/` (lines 52-53)

**Should Extract Molecules:**
```tsx
// ViewerToolbar - Zoom/rotate/annotation controls
// FilmstripNavigator - Canvas thumbnail strip
// AnnotationOverlay - SVG annotation rendering
// ViewerPanels - Side panel container
```

### Decomposition Plan for Viewer

#### Step 1: Create Feature Atoms (`src/features/viewer/ui/atoms/`)
```
atoms/
├── workbench/
│   ├── ParameterSection.tsx      # Collapsible parameter group
│   ├── PresetSelector.tsx        # Dropdown with presets
│   ├── CoordinateInput.tsx       # X/Y/W/H input group
│   ├── UrlSegment.tsx            # Colored URL parameter display
│   └── TabButton.tsx             # Workbench tab
├── media/
│   ├── PlayPauseButton.tsx       # Play/pause toggle
│   ├── VolumeControl.tsx         # Volume + mute
│   ├── ProgressBar.tsx           # Seekable progress
│   ├── TimeDisplay.tsx           # MM:SS formatter
│   └── MediaControlGroup.tsx     # Button group container
└── annotation/
    ├── ToolButton.tsx            # Drawing mode button
    ├── StrokePreview.tsx         # Line style preview
    └── ColorSwatch.tsx           # Color selector
```

#### Step 2: Refactor Molecules
| Current | Target Size | Action |
|---------|-------------|--------|
| ViewerWorkbench (532) | ~120 lines | Compose new workbench atoms |
| MediaPlayer (488) | ~100 lines | Compose media atoms |
| ComposerCanvas (230) | ~120 lines | Extract CanvasLayer atom |

#### Step 3: Refactor Organisms
| Current | Target Size | Action |
|---------|-------------|--------|
| ViewerView (472) | ~150 lines | Extract ViewerToolbar, FilmstripNavigator molecules |

---

## Feature 2: Board Design (`src/features/board-design/`)

### Current Structure
```
board-design/
├── ui/
│   └── organisms/
│       ├── BoardCanvas.tsx       (414 lines) ❌ VIOLATION
│       ├── BoardHeader.tsx       (needs audit)
│       ├── BoardToolbar.tsx      (110 lines) ✅ GOOD
│       └── BoardView.tsx         (needs audit)
└── model/
    └── index.ts
```

### Violations Found

#### 2.1 BoardCanvas.tsx (414 lines)
**File:** [`src/features/board-design/ui/organisms/BoardCanvas.tsx`](src/features/board-design/ui/organisms/BoardCanvas.tsx:1)

**Violations:**
- ❌ **No board atoms** - Canvas items rendered inline
- ❌ **Connection lines** - SVG connections inline (should be ConnectionLine atom)
- ❌ **Item rendering** - Board items rendered with inline styles
- ❌ **Drag handling** - Complex drag logic mixed with rendering
- ❌ **Viewport logic** - Pan/zoom calculations mixed with rendering

**Inline Components That Should Be Atoms:**
```tsx
// BoardNode - Single item on canvas with selection state
// ConnectionLine - SVG line between nodes
// CanvasGrid - Background grid pattern
// CanvasItem - Draggable item wrapper
// ViewportControls - Pan/zoom buttons
```

### Decomposition Plan for Board Design

#### Step 1: Create Feature Atoms (`src/features/board-design/ui/atoms/`)
```
atoms/
├── BoardNode.tsx              # Single node with selection
├── ConnectionLine.tsx         # SVG connection between nodes
├── CanvasGrid.tsx             # Background grid
├── CanvasViewport.tsx         # Transform wrapper
├── NodeHandle.tsx             # Connection handle
└── MiniMap.tsx                # Canvas overview
```

#### Step 2: Refactor Organisms
| Current | Target Size | Action |
|---------|-------------|--------|
| BoardCanvas (414) | ~120 lines | Compose board atoms |

---

## Feature 3: Metadata Edit (`src/features/metadata-edit/`)

### Current Structure
```
metadata-edit/
├── ui/
│   ├── molecules/
│   │   └── CSVImportModal.tsx    (693 lines) ❌ CRITICAL
│   └── organisms/
│       ├── MetadataEditorPanel.tsx (708 lines) ❌ CRITICAL
│       └── MetadataView.tsx      (387 lines) ❌ VIOLATION
└── model/
    └── index.ts
```

### Violations Found

#### 3.1 CSVImportModal.tsx (693 lines) - CRITICAL
**File:** [`src/features/metadata-edit/ui/molecules/CSVImportModal.tsx`](src/features/metadata-edit/ui/molecules/CSVImportModal.tsx:1)

**Violations:**
- ❌ **WIZARD IN A MOLECULE** - This is a 3-step wizard crammed into one file
- ❌ **No step atoms** - Each wizard step defined inline
- ❌ **No mapping atoms** - Column mapping UI inline (lines 300-500 approximate)
- ❌ **Step management** - Step state + validation inline
- ❌ **Result display** - Import results rendered inline
- ❌ **File handling** - Drag-drop + file parsing inline

**Should Be Decomposed Into:**
```tsx
// Atoms:
// - WizardStepIndicator - Step 1/2/3 progress
// - MappingRow - CSV column ↔ IIIF property mapping
// - ValidationBadge - Success/warning/error badge
// - FileDropZone - Drag-drop file area
// - LanguageTag - Language selector badge

// Molecules:
// - UploadStep - Step 1: File upload
// - MappingStep - Step 2: Column mapping
// - ResultStep - Step 3: Import summary
// - CSVImportWizard - Composes steps
```

#### 3.2 MetadataEditorPanel.tsx (708 lines) - CRITICAL
**File:** [`src/features/metadata-edit/ui/organisms/MetadataEditorPanel.tsx`](src/features/metadata-edit/ui/organisms/MetadataEditorPanel.tsx:1)

**Violations:**
- ❌ **TAB PANEL IN ORGANISM** - Metadata/Technical/Annotations tabs inline
- ❌ **Property editors** - Metadata field editors inline
- ❌ **Behavior selector** - IIIF behavior UI inline
- ❌ **Rights selector** - Rights statement UI inline
- ❌ **Location picker** - GPS coordinate picker inline

**Should Be Decomposed Into:**
```tsx
// Atoms:
// - PropertyInput - Metadata field input
// - PropertyLabel - Field label with DC hint
// - BehaviorTag - Behavior pill
// - RightsBadge - Rights statement display

// Molecules:
// - MetadataTab - Metadata fields list
// - TechnicalTab - Technical properties
// - AnnotationsTab - Annotation list
// - LocationPicker - GPS coordinate modal
```

#### 3.3 MetadataView.tsx (387 lines)
**File:** [`src/features/metadata-edit/ui/organisms/MetadataView.tsx`](src/features/metadata-edit/ui/organisms/MetadataView.tsx:1)

**Violations:**
- ❌ **Spreadsheet inline** - Table rendering inline
- ❌ **Cell editing** - Inline cell edit UI
- ❌ **CSV export** - Export logic mixed with UI
- ❌ **Tab bar** - Resource type tabs inline

### Decomposition Plan for Metadata Edit

#### Step 1: Create Feature Atoms (`src/features/metadata-edit/ui/atoms/`)
```
atoms/
├── wizard/
│   ├── WizardStep.tsx           # Step indicator
│   ├── FileDropZone.tsx         # Drag-drop area
│   ├── MappingRow.tsx           # CSV→IIIF mapping
│   ├── ValidationBadge.tsx      # Success/warning/error
│   └── LanguageTag.tsx          # Language selector
├── editor/
│   ├── PropertyInput.tsx        # Metadata field input
│   ├── PropertyLabel.tsx        # Label with hint
│   ├── BehaviorTag.tsx          # Behavior pill
│   ├── RightsSelector.tsx       # Rights dropdown
│   └── LocationPicker.tsx       # GPS coordinates
└── spreadsheet/
    ├── DataCell.tsx             # Spreadsheet cell
    ├── HeaderCell.tsx           # Column header
    └── RowActions.tsx           # Row action buttons
```

#### Step 2: Refactor Molecules
| Current | Target Size | Action |
|---------|-------------|--------|
| CSVImportModal (693) | ~80 lines | Compose UploadStep, MappingStep, ResultStep |

#### Step 3: Refactor Organisms
| Current | Target Size | Action |
|---------|-------------|--------|
| MetadataEditorPanel (708) | ~100 lines | Compose tab molecules |
| MetadataView (387) | ~120 lines | Compose spreadsheet atoms |

---

## Feature 4: Staging (`src/features/staging/`)

### Current Structure
```
staging/
├── ui/
│   ├── molecules/
│   │   └── SourcePane.tsx        (278 lines) ⚠️ BORDERLINE
│   └── organisms/
│       └── StagingView.tsx       (needs audit)
└── model/
    └── index.ts
```

### Violations Found

#### 4.1 SourcePane.tsx (278 lines)
**File:** [`src/features/staging/ui/molecules/SourcePane.tsx`](src/features/staging/ui/molecules/SourcePane.tsx:1)

**Violations:**
- ⚠️ **Slightly oversized** - Nearing 300 line limit
- ❌ **No staging atoms** - Uses generic CanvasItem from shared
- ❌ **Filter UI inline** - Filter input + pills inline
- ❌ **Selection UI inline** - Selection count/clear inline
- ❌ **Manifest list** - List rendering inline

**Should Extract:**
```tsx
// SourceItem - Manifest item with breadcrumbs
// SourceFilter - Filter input with clear
// SelectionHeader - "N selected" with clear button
// SourceList - Virtualized manifest list
```

---

## Feature 5: Archive (`src/features/archive/`)

### Current Structure
```
archive/
├── ui/
│   ├── molecules/
│   │   └── MultiSelectFilmstrip.tsx (150 lines) ✅ GOOD
│   └── organisms/
│       ├── ArchiveGrid.tsx       (needs audit)
│       ├── ArchiveHeader.tsx     (needs audit)
│       └── ArchiveView.tsx       (needs audit)
└── model/
    └── index.ts
```

### Status
- ✅ MultiSelectFilmstrip is well-decomposed (150 lines)
- Need to audit ArchiveGrid, ArchiveHeader, ArchiveView for size violations

---

## Shared Molecules Audit

### Shared Molecules That Should Move to Features

These molecules are feature-specific but live in shared:

| Molecule | Current Location | Target Location | Reason |
|----------|------------------|-----------------|--------|
| `ZoomControl` | `shared/ui/molecules` | `viewer/ui/atoms` | Viewer-specific |
| `PageCounter` | `shared/ui/molecules` | `viewer/ui/atoms` | Viewer-specific |
| `TimelineTick` | `shared/ui/molecules` | `timeline/ui/atoms` | Timeline-specific |
| `RangeSelector` | `shared/ui/molecules` | `timeline/ui/atoms` | Timeline-specific |
| `MapMarker` | `shared/ui/molecules` | `map/ui/atoms` | Map-specific |
| `ClusterBadge` | `shared/ui/molecules` | `map/ui/atoms` | Map-specific |
| `ResultCard` | `shared/ui/molecules` | `search/ui/atoms` | Search-specific |
| `FacetPill` | `shared/ui/molecules` | `search/ui/atoms` | Search-specific |

### Shared Molecules That Are Correctly Shared

| Molecule | Location | Reason |
|----------|----------|--------|
| `FilterInput` | `shared/ui/molecules` | Used across all features |
| `SearchField` | `shared/ui/molecules` | Generic search input |
| `EmptyState` | `shared/ui/molecules` | Generic empty state |
| `LoadingState` | `shared/ui/molecules` | Generic loading state |
| `ViewContainer` | `shared/ui/molecules` | Generic layout container |
| `ViewToggle` | `shared/ui/molecules` | Generic view switcher |
| `Toolbar` | `shared/ui/molecules` | Generic toolbar container |
| `IconButton` | `shared/ui/molecules` | Generic icon button |
| `ActionButton` | `shared/ui/molecules` | Generic action button |
| `ContextMenu` | `shared/ui/molecules` | Generic context menu |
| `CollectionCard` | `shared/ui/molecules` | Used by staging + archive |
| `CanvasItem` | `shared/ui/molecules` | Used by staging |
| `StackedThumbnail` | `shared/ui/molecules` | Generic thumbnail |
| `MuseumLabel` | `shared/ui/molecules` | Generic label |

---

## ESLint Rules to Add

### 1. Feature Atom Existence Rule
```javascript
// eslint-rules/rules/feature-atom-existence.js
// Enforces that feature molecules >200 lines must use feature atoms

// Configuration per feature:
const featureAtomRequirements = {
  'viewer': {
    molecules: ['ViewerWorkbench', 'MediaPlayer', 'ComposerCanvas'],
    requiredAtoms: [
      'ParameterSection', 'PresetSelector', 'CoordinateInput',
      'UrlSegment', 'PlayPauseButton', 'VolumeControl', 
      'ProgressBar', 'TimeDisplay'
    ]
  },
  'metadata-edit': {
    molecules: ['CSVImportModal'],
    requiredAtoms: [
      'WizardStep', 'FileDropZone', 'MappingRow',
      'ValidationBadge', 'PropertyInput', 'PropertyLabel'
    ]
  },
  'board-design': {
    molecules: ['BoardCanvas'],
    requiredAtoms: ['BoardNode', 'ConnectionLine', 'CanvasGrid']
  }
};
```

### 2. Maximum Molecule Size Rule
```javascript
// Add to eslint.config.js
{
  files: ['src/features/*/ui/molecules/**/*.{ts,tsx}'],
  rules: {
    'max-lines': ['error', { 
      max: 200, 
      skipBlankLines: true, 
      skipComments: true 
    }],
    'max-lines-per-function': ['error', { 
      max: 50,
      skipBlankLines: true,
      skipComments: true 
    }]
  }
}
```

### 3. Maximum Organism Size Rule
```javascript
// Add to eslint.config.js
{
  files: ['src/features/*/ui/organisms/**/*.{ts,tsx}'],
  rules: {
    'max-lines': ['error', { 
      max: 300, 
      skipBlankLines: true, 
      skipComments: true 
    }]
  }
}
```

### 4. No Native HTML in Molecules Rule
```javascript
// Extend existing button rule to cover more elements
{
  files: ['src/features/*/ui/molecules/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'JSXOpeningElement[name.name="select"]',
        message: 'Use atomic Select component or feature-specific atom. Native <select> not allowed in molecules.'
      },
      {
        selector: 'JSXOpeningElement[name.name="input"][attributes.properties.type.value="range"]',
        message: 'Use atomic Slider component or feature-specific atom. Native range inputs not allowed in molecules.'
      },
      {
        selector: 'JSXOpeningElement[name.name="textarea"]',
        message: 'Use atomic TextArea component or feature-specific atom. Native <textarea> not allowed in molecules.'
      }
    ]
  }
}
```

### 5. Feature Atom Import Rule
```javascript
// Enforces that feature molecules import from feature atoms
{
  files: ['src/features/viewer/ui/molecules/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': ['warn', {
      patterns: [
        { 
          group: ['@/ui/primitives/*'], 
          message: 'Viewer molecules should import from viewer/ui/atoms/, not directly from primitives. Create a feature atom.' 
        }
      ]
    }]
  }
}
```

---

## Migration Priority

### Phase 1: Critical (Blocks Development)
| Feature | Component | Lines | Action |
|---------|-----------|-------|--------|
| metadata-edit | CSVImportModal | 693 | Decompose into wizard molecules |
| metadata-edit | MetadataEditorPanel | 708 | Decompose into tab molecules |
| viewer | ViewerWorkbench | 532 | Create workbench atoms |
| viewer | MediaPlayer | 488 | Create media atoms |

### Phase 2: High (Improves Maintainability)
| Feature | Component | Lines | Action |
|---------|-----------|-------|--------|
| board-design | BoardCanvas | 414 | Create board atoms |
| viewer | ViewerView | 472 | Extract viewer molecules |
| metadata-edit | MetadataView | 387 | Extract spreadsheet atoms |

### Phase 3: Medium (Code Quality)
| Feature | Component | Lines | Action |
|---------|-----------|-------|--------|
| staging | SourcePane | 278 | Create staging atoms |
| viewer | ComposerCanvas | 230 | Create canvas atoms |
| shared | Move feature-specific molecules | - | Migrate to features |

---

## Success Metrics

After migration:
- ✅ No molecule >200 lines
- ✅ No organism >300 lines
- ✅ No native HTML in molecules (except in atoms)
- ✅ All features have their own `ui/atoms/` directory
- ✅ Shared molecules only contain generic, reusable components
- ✅ ESLint passes with new rules enabled

---

## Appendix: Feature Atom Templates

### Template for New Feature Atom
```tsx
// src/features/{feature}/ui/atoms/{AtomName}.tsx

/**
 * {AtomName} Atom
 *
 * {One-line description of what this atom renders}
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/{feature}/ui/atoms/{AtomName}
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface {AtomName}Props {
  /** Description of prop */
  propName: string;
  /** Callback description */
  onAction?: () => void;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const {AtomName}: React.FC<{AtomName}Props> = ({
  propName,
  onAction,
  cx,
  fieldMode,
}) => {
  return (
    <div className={cx?.surface || ''}>
      {/* Atom content */}
    </div>
  );
};
```

### Template for Feature Atom Index
```tsx
// src/features/{feature}/ui/atoms/index.ts

/**
 * {Feature} Feature Atoms
 *
 * Feature-specific atoms for {feature} decomposition.
 * These atoms are NOT shared - they are specific to {feature}.
 */

// Export all feature atoms
export { AtomName } from './AtomName';
export type { AtomNameProps } from './AtomName';
```
