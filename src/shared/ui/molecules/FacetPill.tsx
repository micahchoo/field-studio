/**
 * FacetPill Molecule
 *
 * A toggleable filter pill for faceted search interfaces.
 * Composes Button atom with active/inactive states.
 *
 * ATOMIC DESIGN:
 * - Composes: Button atom
 * - Has local state: active/inactive
 * - No domain logic (search state managed by parent)
 *
 * IDEAL OUTCOME: Clear visual indication of active filters
 * FAILURE PREVENTED: Confusing filter state (active vs inactive)
 *
 * @example
 * <FacetPill
 *   label="Images"
 *   count={42}
 *   active={true}
 *   onToggle={() => setFilter('images')}
 * />
 */

import React from 'react';
import { Button } from '@/ui/primitives/Button';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface FacetPillProps {
  /** Display label for the facet */
  label: string;
  /** Optional count badge */
  count?: number;
  /** Whether this facet is currently active */
  active?: boolean;
  /** Called when pill is clicked */
  onToggle: () => void;
  /** Optional icon name */
  icon?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?:'sm' |'md';
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
  fieldMode?: boolean;
}

/**
 * FacetPill Component
 *
 * Toggleable filter pill with count badge.
 * Uses contextual styles for fieldMode-aware theming.
 */
export const FacetPill: React.FC<FacetPillProps> = ({
  label,
  count,
  active = false,
  onToggle,
  icon,
  disabled = false,
  size ='md',
  cx,
}) => {
  // Size padding styles
  const sizePadding = {
    sm: { padding:'4px 8px', fontSize:'12px' },
    md: { padding:'6px 12px', fontSize:'14px' },
  };

  const padding = sizePadding[size];

  // Build content with optional count badge
  const content = (
    <>
      {icon && (
        <span className="material-icons" style={{ fontSize:'1em' }}>{icon}</span>
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span
          style={{
            padding:'2px 6px',
            borderRadius:'9999px',
            fontSize:'12px',
            fontWeight: 600,
            backgroundColor: active ?'rgba(255,255,255,0.2)' : cx.headerBg,
            color: active ?'#ffffff' : cx.textMuted,
          }}
        >
          {count}
        </span>
      )}
    </>
  );

  return (
    <Button
      onClick={onToggle}
      disabled={disabled}
      variant={active ?'primary' :'secondary'}
      size="sm"
      style={{
        padding: padding.padding,
        fontSize: padding.fontSize,
        borderRadius:'9999px',
        gap:'8px',
        minWidth:'auto',
        backgroundColor: active ? undefined : cx.surface,
        borderColor: active ? undefined : cx.border,
        color: active ?'#ffffff' : cx.text,
      }}
      aria-pressed={active}
      // @ts-ignore
      role="switch"
    >
      {content}
    </Button>
  );
};

export default FacetPill;
