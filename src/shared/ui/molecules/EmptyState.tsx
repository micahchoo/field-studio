/**
 * EmptyState Molecule
 *
 * Composes: Icon + text + optional action button
 *
 * Standardized placeholder for empty collections, zero results, etc.
 * Themes via useContextualStyles (no fieldMode prop).
 *
 * IDEAL OUTCOME: Shows meaningful message and CTA for empty state
 * FAILURE PREVENTED: User confusion about why content is missing
 */

import React from 'react';
import { Icon, Button } from '../atoms';
import { useContextualStyles } from '../../../hooks/useContextualStyles';
import { useAppSettings } from '../../../hooks/useAppSettings';

export interface EmptyStateAction {
  label: string;
  icon?: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  /** Icon name to display */
  icon: string;
  /** Main title/message */
  title: string;
  /** Optional secondary message */
  message?: string;
  /** Optional action button */
  action?: EmptyStateAction;
  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyState Molecule
 *
 * @example
 * <EmptyState
 *   icon="inbox"
 *   title="No items found"
 *   message="Try importing some files to get started"
 *   action={{ label: 'Import Files', onClick: onImport }}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  className = '',
}) => {
  // Theme via context
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-12 px-6 min-h-[300px]
        ${className}
      `}
    >
      {/* Icon */}
      <div
        className={`
          mb-4 p-3 rounded-lg
          ${
            settings.fieldMode
              ? 'bg-slate-800 text-slate-400'
              : 'bg-slate-100 text-slate-400'
          }
        `}
      >
        <Icon name={icon} className="text-4xl" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3
        className={`
          text-lg font-semibold mb-2
          ${settings.fieldMode ? 'text-slate-200' : 'text-slate-700'}
        `}
      >
        {title}
      </h3>

      {/* Message */}
      {message && (
        <p
          className={`
            text-sm mb-6 text-center max-w-sm
            ${settings.fieldMode ? 'text-slate-400' : 'text-slate-500'}
          `}
        >
          {message}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <Button
          variant={settings.fieldMode ? 'primary' : 'primary'}
          onClick={action.onClick}
          icon={action.icon ? <Icon name={action.icon} /> : undefined}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
