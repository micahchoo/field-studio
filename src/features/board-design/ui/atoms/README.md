# Board Design Feature Atoms

**Location:** `src/features/board-design/ui/atoms/`

Feature-specific atoms for the board-design feature. These atoms decompose the oversized [`BoardCanvas`](../organisms/BoardCanvas.tsx) (414 lines) organism.

## Decomposition Target

### Board Canvas Atoms (from BoardCanvas.tsx)

The 414-line BoardCanvas needs to be decomposed into these atoms:

| Atom | Purpose | Replaces Lines |
|------|---------|----------------|
| `BoardNode` | Single item on canvas with selection state | Inline item rendering |
| `ConnectionLine` | SVG line between nodes | Inline SVG connections |
| `CanvasGrid` | Background grid pattern | Inline grid styles |
| `NodeHandle` | Connection handle on node edge | Handle rendering |
| `MiniMap` | Canvas overview widget | (New feature) |
| `SelectionBox` | Multi-select drag box | Selection overlay |
| `CanvasItem` | Draggable item wrapper | Drag handling wrapper |

### Toolbar Atoms (from BoardToolbar.tsx)

| Atom | Purpose |
|------|---------|
| `ToolButton` | Tool selection button with shortcut |
| `ToolDivider` | Visual separator in toolbar |

## Atom Categories

```
atoms/
├── BoardNode.tsx         # Canvas item representation
├── ConnectionLine.tsx    # SVG connection between nodes
├── CanvasGrid.tsx        # Background grid pattern
├── NodeHandle.tsx        # Connection point handle
├── MiniMap.tsx           # Canvas overview
├── SelectionBox.tsx      # Multi-selection box
├── ToolButton.tsx        # Toolbar tool button
└── ToolDivider.tsx       # Toolbar separator
```

## BoardNode Props

```tsx
export interface BoardNodeProps {
  /** Unique node ID */
  id: string;
  /** Node position */
  position: { x: number; y: number };
  /** Node dimensions */
  size: { width: number; height: number };
  /** Node content/resource */
  resource: IIIFItem;
  /** Whether node is selected */
  selected: boolean;
  /** Whether node is being connected from */
  connectingFrom: boolean;
  /** Callback when node is clicked */
  onSelect: (id: string) => void;
  /** Callback when drag starts */
  onDragStart: (id: string, offset: { x: number; y: number }) => void;
  /** Callback when connection starts */
  onConnectStart: (id: string) => void;
  /** Contextual styles */
  cx: {
    surface: string;
    text: string;
    accent: string;
  };
  /** Field mode flag */
  fieldMode: boolean;
}
```

## ConnectionLine Props

```tsx
export interface ConnectionLineProps {
  /** Start point */
  from: { x: number; y: number };
  /** End point */
  to: { x: number; y: number };
  /** Connection type */
  type: ConnectionType;
  /** Whether connection is selected */
  selected: boolean;
  /** Callback when clicked */
  onSelect: () => void;
  /** Contextual styles */
  cx: {
    surface: string;
    accent: string;
  };
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
 * @module features/board-design/ui/atoms/{AtomName}
 */

import React from 'react';
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
- [ ] It's not reusable outside board-design feature
- [ ] Props interface includes `cx` and `fieldMode`

## Migration Plan

### Step 1: Extract BoardNode
Extract the node rendering logic from BoardCanvas into `BoardNode.tsx`

### Step 2: Extract ConnectionLine
Extract SVG connection rendering into `ConnectionLine.tsx`

### Step 3: Extract CanvasGrid
Extract grid background into `CanvasGrid.tsx`

### Step 4: Refactor BoardCanvas
Compose the atoms to reduce BoardCanvas from 414 lines to ~120 lines

## Migration Status

| Atom | Status | Migrated From |
|------|--------|---------------|
| (to be created) | ⏳ Pending | BoardCanvas |

See [docs/atomic-design-feature-audit.md](../../../../docs/atomic-design-feature-audit.md) for full migration plan.
