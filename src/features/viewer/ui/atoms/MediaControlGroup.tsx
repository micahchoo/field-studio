/**
 * MediaControlGroup Atom
 *
 * Container for organizing media control buttons with consistent layout.
 * Provides grouping, spacing, and alignment for media player controls.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state (layout only)
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/MediaControlGroup
 */

import React from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface MediaControlGroupProps {
  /** Child controls to render */
  children: React.ReactNode;
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Alignment within the group */
  align?: 'start' | 'center' | 'end' | 'between';
  /** Gap between controls */
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  /** Whether to wrap items */
  wrap?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Contextual styles from parent */
  cx?: ContextualClassNames | Record<string, string>;
  /** Field mode flag */
  fieldMode?: boolean;
}

const gapClasses = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const alignClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
};

export const MediaControlGroup: React.FC<MediaControlGroupProps> = ({
  children,
  direction = 'horizontal',
  align = 'start',
  gap = 'md',
  wrap = false,
  className = '',
  cx: _cx,
  fieldMode = false,
}) => {
  const flexDirection = direction === 'horizontal' ? 'flex-row' : 'flex-col';
  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';
  const itemsAlign = direction === 'horizontal' ? 'items-center' : 'items-start';

  // Field mode styling
  const fieldModeClass = fieldMode ? 'field-mode' : '';

  return (
    <div
      className={`
        flex
        ${flexDirection}
        ${itemsAlign}
        ${alignClasses[align]}
        ${gapClasses[gap]}
        ${wrapClass}
        ${fieldModeClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default MediaControlGroup;
