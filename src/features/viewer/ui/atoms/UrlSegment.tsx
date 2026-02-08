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
export type SegmentColor = 'green' | 'blue' | 'orange' | 'purple' | 'yellow' | 'default';

export interface UrlSegmentProps {
  /** Parameter value to display */
  value: string;
  /** Tooltip/title text */
  label: string;
  /** Color theme for the segment */
  color: SegmentColor;
}

const colorClasses: Record<SegmentColor, string> = {
  green: 'text-nb-green bg-nb-green/10',
  blue: 'text-nb-blue bg-nb-blue/10',
  orange: 'text-orange-400 bg-orange-400/10',
  purple: 'text-nb-purple/60 bg-nb-purple/60',
  yellow: 'text-nb-yellow bg-nb-yellow/10',
  default: 'text-nb-black/40 bg-nb-black/30',
};

export const UrlSegment: React.FC<UrlSegmentProps> = ({
  value,
  label,
  color,
}) => {
  return (
    <span
      className={`font-bold px-1 ${colorClasses[color]}`}
      title={label}
    >
      {value}
    </span>
  );
};

export default UrlSegment;
