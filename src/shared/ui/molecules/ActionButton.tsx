/**
 * ActionButton Molecule
 *
 * Composes: Button atom + Icon atom + text label
 *
 * A button with icon and text for prominent actions.
 * Supports loading state and variants for different action types.
 *
 * IDEAL OUTCOME: Clear, recognizable action buttons with visual feedback
 * FAILURE PREVENTED: Ambiguous actions without iconography
 */

import React from 'react';
import { Button } from '@/ui/primitives/Button';
import { Icon } from '../atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface ActionButtonProps {
  /** Button text */
  label: string;
  /** Optional icon name */
  icon?: string;
  /** Click handler */
  onClick: () => void;
  /** Visual variant */
  variant?:'primary' |'secondary' |'danger' |'success' |'ghost';
  /** Size variant */
  size?:'sm' |'md' |'lg';
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Type attribute */
  type?:'button' |'submit' |'reset';
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

// Map size to Button atom size
const sizeMap: Record<string,'sm' |'base' |'lg' |'xl'> = {
  sm:'sm',
  md:'base',
  lg:'lg',
};

/**
 * ActionButton Molecule
 *
 * @example
 * <ActionButton
 *   label="Save Changes"
 *   icon="save"
 *   onClick={handleSave}
 *   variant="primary"
 * />
 *
 * @example
 * <ActionButton
 *   label="Delete"
 *   icon="delete"
 *   onClick={handleDelete}
 *   variant="danger"
 *   loading={isDeleting}
 * />
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  icon,
  onClick,
  variant ='primary',
  size ='md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className ='',
  type ='button',
  cx: _cx = {},
  fieldMode = false,
}) => {
  // Map variant to Button atom variant
  const variantMap: Record<string,'primary' |'secondary' |'ghost' |'danger' |'success'> = {
    primary:'primary',
    secondary:'secondary',
    danger:'danger',
    success:'success',
    ghost:'ghost',
  };

  // Field mode variant classes (dark-UI overrides for Button atom)
  const fieldModeClasses = fieldMode
    ? variant ==='primary'
      ?'bg-nb-yellow text-black border-nb-yellow'
      : variant ==='secondary'
        ?'bg-nb-black/80 text-nb-black/10 border-nb-black/60'
        : variant ==='danger'
          ?'bg-nb-red/20 text-nb-red border-nb-red/50'
          : variant ==='success'
            ?'bg-nb-green/20 text-nb-green border-nb-green/50'
            :'bg-transparent text-nb-black/20 border-transparent'
    :'';

  // Create icon element for Button atom
  const iconElement = loading ? (
    <Icon name="sync" className="text-sm animate-spin" aria-hidden="true" />
  ) : icon ? (
    <Icon name={icon} className="text-sm" aria-hidden="true" />
  ) : undefined;

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      variant={variantMap[variant]}
      size={sizeMap[size]}
      fullWidth={fullWidth}
      minimal={variant ==='ghost'}
      className={`${fieldModeClasses} ${className}`}
      icon={iconElement}
      // @ts-ignore - Button atom supports type prop via spread
      type={type}
    >
      {label}
    </Button>
  );
};

export default ActionButton;
