# Viewer Feature Atoms

**Location:** `src/features/viewer/ui/atoms/`

Feature-specific atoms for the viewer feature. These atoms are NOT shared - they are specific to viewer functionality.

## Philosophy

Viewer atoms decompose complex molecules like [`ViewerWorkbench`](../molecules/ViewerWorkbench.tsx) and [`MediaPlayer`](../molecules/MediaPlayer.tsx) into composable, testable units.

## Atoms

### IIIF Workbench Atoms

| Atom | Purpose | Replaces (in Workbench) |
|------|---------|------------------------|
| `ParameterSection` | Collapsible parameter group | Lines 284-322, 325-396 |
| `PresetSelector` | Dropdown with presets | Native `<select>` elements |
| `CoordinateInput` | X/Y/W/H input group | Lines 304-319 coordinate inputs |
| `UrlSegment` | Colored URL parameter display | Lines 227-250 URL bar |
| `ImagePreview` | IIIF image with loading/error states | Lines 211-224 preview area |
| `TabButton` | Workbench tab (Params/Code) | Lines 256-277 tabs |
| `RotationDial` | Visual rotation control | Lines 399-450 rotation section |
| `UpscaleToggle` | Upscale ^ toggle button | Lines 331-344 upscale toggle |
| `QualitySelector` | Quality dropdown | Lines for quality selection |
| `FormatSelector` | Format dropdown | Lines for format selection |

### Media Player Atoms

| Atom | Purpose | Replaces (in MediaPlayer) |
|------|---------|--------------------------|
| `PlayPauseButton` | Play/pause toggle with icon | Inline play/pause buttons |
| `VolumeControl` | Volume + mute toggle | Inline volume controls |
| `ProgressBar` | Seekable progress bar | Inline progress bar |
| `TimeDisplay` | MM:SS formatted time | Inline time formatting |
| `PlaybackRateSelect` | Speed selector | Inline playback rate |
| `MediaControlGroup` | Button group container | Inline control layout |
| `FullscreenButton` | Fullscreen toggle | Inline fullscreen button |

### Annotation Atoms

| Atom | Purpose | Replaces (in AnnotationCanvas) |
|------|---------|-------------------------------|
| `ToolButton` | Drawing mode button | Mode selection buttons |
| `SvgAnnotation` | SVG annotation path | Inline SVG rendering |
| `PointMarker` | Numbered point marker | Lines 144-150 point markers |
| `StrokePreview` | Line style preview | Freehand stroke preview |

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
 * @module features/viewer/ui/atoms/{AtomName}
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
- [ ] It's not reusable outside viewer feature
- [ ] Props interface includes `cx?` and `fieldMode?`

## Migration Status

| Atom | Status | Migrated From |
|------|--------|---------------|
| (to be created) | ⏳ Pending | ViewerWorkbench |

See [docs/atomic-design-feature-audit.md](../../../../docs/atomic-design-feature-audit.md) for full migration plan.
