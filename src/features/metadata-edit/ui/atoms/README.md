# Metadata Edit Feature Atoms

**Location:** `src/features/metadata-edit/ui/atoms/`

Feature-specific atoms for the metadata-edit feature. These atoms decompose the massive [`CSVImportModal`](../molecules/CSVImportModal.tsx) (693 lines) and [`MetadataEditorPanel`](../organisms/MetadataEditorPanel.tsx) (708 lines).

## Critical Decomposition Targets

### CSV Import Wizard Atoms (from CSVImportModal)

The 693-line CSV import modal needs to be decomposed into these atoms:

| Atom | Purpose | Replaces Lines |
|------|---------|----------------|
| `WizardStepIndicator` | Step 1/2/3 progress indicator | Step navigation UI |
| `FileDropZone` | Drag-drop file upload area | File upload section |
| `MappingRow` | CSV column ↔ IIIF property mapping | Lines ~300-500 mapping UI |
| `ValidationBadge` | Success/warning/error badge | Validation indicators |
| `LanguageTag` | Language code badge | Language selector |
| `ImportSummary` | Import results display | Result step content |
| `ColumnSelector` | CSV column dropdown | Column selection |
| `PropertySelector` | IIIF property dropdown | Property mapping |

### Metadata Editor Atoms (from MetadataEditorPanel)

The 708-line metadata editor panel needs these atoms:

| Atom | Purpose | Replaces Lines |
|------|---------|----------------|
| `PropertyInput` | Metadata field input with label | Property input groups |
| `PropertyLabel` | Field label with DC hint | Label with tooltip |
| `BehaviorTag` | IIIF behavior pill | Behavior selectors |
| `RightsBadge` | Rights statement display | Rights selector |
| `ViewingDirectionSelector` | Viewing direction control | Direction buttons |
| `LocationPicker` | GPS coordinate picker | Location modal |
| `MetadataTab` | Tab button for Metadata/Technical/Annotations | Tab bar |
| `AnnotationItem` | Single annotation display | Annotation list items |

### Spreadsheet Atoms (from MetadataView)

| Atom | Purpose |
|------|---------|
| `DataCell` | Editable spreadsheet cell |
| `HeaderCell` | Column header with sort |
| `RowActions` | Row action buttons |
| `TypeBadge` | Resource type indicator |

## Atom Categories

```
atoms/
├── wizard/          # CSV import wizard atoms
├── editor/          # Metadata editor atoms  
└── spreadsheet/     # Spreadsheet view atoms
```

## Creating New Atoms

Use this template:

```tsx
/**
 * {AtomName} Atom
 *
 * {One-line description}
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (or minimal local UI state)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/{AtomName}
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

## Compliance Checklist

Before adding an atom, ensure:
- [ ] It has zero business logic
- [ ] It uses only props (no context hooks)
- [ ] It uses design tokens for styling
- [ ] It has a single responsibility
- [ ] It's not reusable outside metadata-edit feature
- [ ] Props interface includes `cx?` and `fieldMode?`

## Migration Priority

### Phase 1 (Critical - Blocks Development)
1. `WizardStepIndicator` - Unblocks CSV import decomposition
2. `FileDropZone` - Required for UploadStep molecule
3. `MappingRow` - Required for MappingStep molecule
4. `PropertyInput` - Required for MetadataEditorPanel decomposition

### Phase 2 (High Priority)
1. `ValidationBadge` - Improves import feedback
2. `PropertyLabel` - Improves editor UX
3. `BehaviorTag` - Cleaner behavior UI
4. `DataCell` - Spreadsheet editing

### Phase 3 (Medium Priority)
1. Remaining atoms for completeness

## Migration Status

| Atom | Status | Migrated From |
|------|--------|---------------|
| (to be created) | ⏳ Pending | CSVImportModal, MetadataEditorPanel |

See [docs/atomic-design-feature-audit.md](../../../../docs/atomic-design-feature-audit.md) for full migration plan.
