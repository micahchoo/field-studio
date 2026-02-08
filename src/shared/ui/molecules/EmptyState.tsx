/**
 * EmptyState Molecule
 *
 * Composes: Icon + text + optional action button
 *
 * Standardized placeholder for empty collections, zero results, etc.
 * Receives`cx` styling tokens via props from organism.
 * NOTE: Does NOT call useContextualStyles — receives cx via props.
 *
 * IDEAL OUTCOME: Shows meaningful message and CTA for empty state
 * FAILURE PREVENTED: User confusion about why content is missing
 */

import React from 'react';
import { Button, Icon } from '../atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

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
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

/**
 * EmptyState Molecule
 *
 * @example
 * <EmptyState
 *   icon="inbox"
 *   title="No items found"
 *   message="Try importing some files to get started"
 *   action={{ label:'Import Files', onClick: onImport }}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  action,
  className ='',
  cx = {},
  fieldMode: _fieldMode = false,
}) => {
  // Context is provided via props (no hook calls)

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
          mb-4 p-3 
          ${cx.subtleBg} ${cx.textMuted}
`}
      >
        <Icon name={icon} className="text-4xl" aria-hidden="true" />
      </div>

      {/* Title */}
      <h3
        className={`
          text-lg font-semibold mb-2
          ${cx.subtleText}
`}
      >
        {title}
      </h3>

      {/* Message */}
      {message && (
        <p
          className={`
            text-sm mb-6 text-center max-w-sm
            ${cx.textMuted}
`}
        >
          {message}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <Button
          variant="primary"
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
