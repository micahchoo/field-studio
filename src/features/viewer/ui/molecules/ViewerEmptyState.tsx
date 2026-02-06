/**
 * ViewerEmptyState Molecule
 *
 * Composes: GuidedEmptyState + terminology adaptation
 *
 * Displays when no canvas is selected in the viewer.
 * Uses user-friendly terminology and provides clear guidance
 * on how to select content.
 *
 * COMMUNICATIVE DESIGN:
 * - Uses terminology appropriate to user's abstraction level
 * - Shows visual example of what to do
 * - Provides direct navigation to content
 * - Explains what will happen after selection
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes molecules: GuidedEmptyState
 * - Local UI state only
 * - No domain logic
 *
 * IDEAL OUTCOME: Clear guidance when no canvas is selected
 * FAILURE PREVENTED: User confusion about empty viewer state
 */

import React from 'react';
import { GuidedEmptyState } from '@/src/shared/ui/molecules';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface ViewerEmptyStateProps {
  /** Terminology function for localized strings */
  t: (key: string) => string;
  /** Optional custom message */
  message?: string;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
  /** Callback to navigate to archive */
  onGoToArchive?: () => void;
  /** Callback to import content */
  onImport?: () => void;
  /** Whether archive has any content */
  hasContent?: boolean;
}

/**
 * ViewerEmptyState Molecule
 *
 * @example
 * <ViewerEmptyState
 *   t={(key) => translations[key]}
 *   cx={cx}
 *   fieldMode={fieldMode}
 *   onGoToArchive={() => navigate('/archive')}
 *   hasContent={true}
 * />
 */
export const ViewerEmptyState: React.FC<ViewerEmptyStateProps> = ({
  t,
  message,
  cx,
  fieldMode,
  onGoToArchive,
  onImport,
  hasContent = false,
}) => {
  // Get user-friendly term for Canvas based on abstraction level
  const canvasTerm = t('Canvas');
  const archiveTerm = t('Archive');

  // Define workflow steps based on whether archive has content
  const steps = hasContent
    ? [
        {
          id: 'navigate',
          number: 1,
          title: `Go to ${archiveTerm}`,
          description: `Switch to the ${archiveTerm} view to see your content`,
          icon: 'folder_open' as const,
          active: true,
          action: onGoToArchive ? {
            label: `Open ${archiveTerm}`,
            onClick: onGoToArchive,
          } : undefined,
        },
        {
          id: 'select',
          number: 2,
          title: `Select a ${canvasTerm}`,
          description: `Click any ${canvasTerm.toLowerCase()} to view it`,
          icon: 'touch_app' as const,
        },
        {
          id: 'view',
          number: 3,
          title: 'View Details',
          description: `See the full image and metadata here`,
          icon: 'visibility' as const,
        },
      ]
    : [
        {
          id: 'import',
          number: 1,
          title: 'Import Content',
          description: 'Add photos, videos, or documents',
          icon: 'upload' as const,
          active: true,
          action: onImport ? {
            label: 'Import Files',
            onClick: onImport,
          } : undefined,
        },
        {
          id: 'organize',
          number: 2,
          title: 'Organize',
          description: 'Arrange into albums and groups',
          icon: 'folder' as const,
        },
        {
          id: 'view',
          number: 3,
          title: 'View',
          description: 'Open items in the viewer',
          icon: 'visibility' as const,
        },
      ];

  const primaryAction = hasContent && onGoToArchive
    ? {
        label: `Browse ${archiveTerm}`,
        icon: 'folder_open' as const,
        onClick: onGoToArchive,
      }
    : onImport
    ? {
        label: 'Import Your First Files',
        icon: 'upload' as const,
        onClick: onImport,
      }
    : {
        label: 'Get Started',
        icon: 'arrow_forward' as const,
        onClick: () => {},
      };

  const secondaryAction = hasContent && onImport
    ? {
        label: 'Import More',
        icon: 'add' as const,
        onClick: onImport,
      }
    : undefined;

  return (
    <GuidedEmptyState
      icon="image"
      title={message || `Select a ${canvasTerm}`}
      subtitle={
        hasContent
          ? `Choose a ${canvasTerm.toLowerCase()} from the ${archiveTerm.toLowerCase()} to view it here`
          : `Your ${archiveTerm.toLowerCase()} is empty. Import files to get started.`
      }
      steps={steps}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      cx={cx}
      fieldMode={fieldMode}
      tip={hasContent
        ? `Tip: You can also double-click any ${canvasTerm.toLowerCase()} to open it directly`
        : `Tip: Drag and drop a folder to quickly import multiple files`
      }
    />
  );
};

export default ViewerEmptyState;
