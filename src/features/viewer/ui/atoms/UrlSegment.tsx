/**
 * UrlSegment Atom
 *
 * Colored URL parameter display segment.
 * Shows a single IIIF Image API parameter with color coding.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/UrlSegment
 */

import React from 'react';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export type SegmentColor = 'green' | 'blue' | 'orange' | 'purple' | 'yellow' | 'default';

export interface UrlSegmentProps {
  /** Parameter value to display */
  value: string;
  /** Tooltip/title text */
  label: string;
  /** Color theme for the segment */
  color: SegmentColor;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag (unused but required for API consistency) */
  fieldMode?: boolean;
}

const colorClasses: Record<SegmentColor, string> = {
  green: 'text-green-400 bg-green-400/10',
  blue: 'text-blue-400 bg-blue-400/10',
  orange: 'text-orange-400 bg-orange-400/10',
  purple: 'text-purple-400 bg-purple-400/10',
  yellow: 'text-yellow-400 bg-yellow-400/10',
  default: 'text-slate-400 bg-slate-400/10',
};

export const UrlSegment: React.FC<UrlSegmentProps> = ({
  value,
  label,
  color,
  cx: _cx,
  fieldMode: _fieldMode,
}) => {
  return (
    <span
      className={`font-bold px-1 rounded ${colorClasses[color]}`}
      title={label}
    >
      {value}
    </span>
  );
};

export default UrlSegment;
