/**
 * ResourceTypeBadge Molecule
 *
 * Composes: Icon + label (receives `t` terminology function via props)
 *
 * Displays IIIF resource type (Manifest, Canvas, Collection, etc.) with appropriate icon.
 * Receives `t` function via props from organism (respects abstraction level).
 * NOTE: Does NOT call useTerminology — receives t() via props.
 *
 * IDEAL OUTCOME: Shows correct icon and label for any IIIF resource type
 * FAILURE PREVENTED: Hardcoded IIIF terms scattered across components
 */

import React, { useMemo } from 'react';
import { Icon } from '../atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

// Mapping of resource types to icon names
const RESOURCE_ICONS: Record<string, string> = {
  Collection: 'folder',
  Manifest: 'description',
  Canvas: 'image',
  AnnotationPage: 'note',
  Annotation: 'sticky_note_2',
  Range: 'folder_special',
  ContentResource: 'image',
};

export interface ResourceTypeBadgeProps {
  /** IIIF resource type (Collection, Manifest, Canvas, etc.) */
  type: string;
  /** Show icon only (no label) */
  iconOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Tooltip title */
  title?: string;
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
  /** Terminology function for localized labels */
  t: (key: string) => string;
}

/**
 * ResourceTypeBadge Molecule
 *
 * @example
 * <ResourceTypeBadge type="Manifest" />
 * [Shows icon + "Manifest" (or "Item Group" in simple mode)]
 *
 * @example
 * <ResourceTypeBadge type="Canvas" iconOnly />
 * [Shows only the icon]
 */
export const ResourceTypeBadge: React.FC<ResourceTypeBadgeProps> = ({
  type,
  iconOnly = false,
  className = '',
  title,
  cx,
  t,
}) => {

  // Memoize icon lookup
  const iconName = useMemo(() => RESOURCE_ICONS[type] || 'info', [type]);

  // Memoize label
  const label = useMemo(() => t(type), [type, t]);

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-2 py-1 rounded-md
        ${cx.subtleBg} ${cx.subtleText}
        ${className}
      `}
      title={title || `Resource type: ${label}`}
    >
      <Icon name={iconName} className="text-sm" aria-hidden="true" />

      {!iconOnly && <span className="text-xs font-medium">{label}</span>}
    </div>
  );
};

export default ResourceTypeBadge;
