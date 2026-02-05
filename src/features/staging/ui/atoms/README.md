# Staging Feature Atoms

**Location:** `src/features/staging/ui/atoms/`

Feature-specific atoms for the staging feature. These atoms decompose the [`SourcePane`](../molecules/SourcePane.tsx) (278 lines) molecule.

## Decomposition Target

### Source Pane Atoms (from SourcePane.tsx)

The 278-line SourcePane needs to be decomposed into these atoms:

| Atom | Purpose | Replaces Lines |
|------|---------|----------------|
| `SourceItem` | Manifest item with breadcrumbs | Inline manifest list items |
| `SourceFilter` | Filter input with clear button | Inline filter UI |
| `SelectionHeader` | "N selected" header with clear | Lines ~70-88 header |
| `SourceList` | Virtualized manifest list | List rendering |
| `BreadcrumbPath` | Breadcrumb display for manifest | Breadcrumb rendering |
| `EmptySourceState` | Empty state for no manifests | Empty state |
| `SourceDragPreview` | Drag preview for manifest | Drag ghost |

## Atom Categories

```
atoms/
├── SourceItem.tsx        # Manifest item display
├── SourceFilter.tsx      # Filter with clear
├── SelectionHeader.tsx   # Selection count header
├── SourceList.tsx        # Virtualized list
├── BreadcrumbPath.tsx    # Breadcrumb trail
├── EmptySourceState.tsx  # Empty state
└── SourceDragPreview.tsx # Drag ghost
```

## SourceItem Props

```tsx
export interface SourceItemProps {
  /** Manifest ID */
  id: string;
  /** Manifest name */
  name: string;
  /** Breadcrumb path */
  breadcrumbs: string[];
  /** Whether item is selected */
  selected: boolean;
  /** Whether item is focused */
  focused: boolean;
  /** Whether item is being dragged */
  isDragging: boolean;
  /** Callback when clicked */
  onClick: (e: React.MouseEvent) => void;
  /** Callback when drag starts */
  onDragStart: () => void;
  /** Contextual styles */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
}
```

## SelectionHeader Props

```tsx
export interface SelectionHeaderProps {
  /** Number of selected items */
  count: number;
  /** Callback to clear selection */
  onClear: () => void;
  /** Orientation */
  orientation: 'horizontal' | 'vertical';
  /** Contextual styles */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
}
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
 * @module features/staging/ui/atoms/{AtomName}
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
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
}

export const {AtomName}: React.FC<{AtomName}Props> = ({
  propName,
  onAction,
  cx,
  fieldMode,
}) => {
  return (
    <div className={cx.surface}>
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
- [ ] It's not reusable outside staging feature
- [ ] Props interface includes `cx` and `fieldMode`

## Migration Status

| Atom | Status | Migrated From |
|------|--------|---------------|
| (to be created) | ⏳ Pending | SourcePane |

See [docs/atomic-design-feature-audit.md](../../../../docs/atomic-design-feature-audit.md) for full migration plan.
