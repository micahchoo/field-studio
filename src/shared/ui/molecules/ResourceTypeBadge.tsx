/**
 * ResourceTypeBadge Molecule
 *
 * Composes: Icon + label via useTerminology
 *
 * Displays IIIF resource type (Manifest, Canvas, Collection, etc.) with appropriate icon.
 * Uses useTerminology for localized labels (respects abstraction level).
 *
 * IDEAL OUTCOME: Shows correct icon and label for any IIIF resource type
 * FAILURE PREVENTED: Hardcoded IIIF terms scattered across components
 */

import React, { useMemo } from 'react';
import { Icon } from '../atoms';
import { useContextualStyles } from '../../../hooks/useContextualStyles';
import { useAppSettings } from '../../../hooks/useAppSettings';
import { useTerminology } from '../../../hooks/useTerminology';
import { useAbstractionLevel } from '../../../hooks/useAbstractionLevel';

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
}

/**
 * ResourceTypeBadge Molecule
 *
 * @example
 * <ResourceTypeBadge type="Manifest" />
 * {/* Shows icon + "Manifest" (or "Item Group" in simple mode) */}
 *
 * @example
 * <ResourceTypeBadge type="Canvas" iconOnly />
 * {/* Shows only the icon */}
 */
export const ResourceTypeBadge: React.FC<ResourceTypeBadgeProps> = ({
  type,
  iconOnly = false,
  className = '',
  title,
}) => {
  // Theme via context
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);

  // Terminology for current abstraction level
  const { level } = useAbstractionLevel();
  const { t } = useTerminology({ level });

  // Memoize icon lookup
  const iconName = useMemo(() => RESOURCE_ICONS[type] || 'info', [type]);

  // Memoize label
  const label = useMemo(() => t(type), [type, t]);

  return (
    <div
      className={`
        inline-flex items-center gap-2 px-2 py-1 rounded-md
        ${settings.fieldMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}
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
