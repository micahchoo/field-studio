/**
 * GuidanceEmptyState Molecule
 *
 * Empty state with optional action button and tips list.
 * Used for zero-state UI with contextual guidance.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - No local state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/molecules/GuidanceEmptyState
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface GuidanceEmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  tips?: string[];
  /** Contextual styles */
  cx?: Partial<ContextualClassNames>;
  /** Field mode styling */
  fieldMode?: boolean;
}

export const GuidanceEmptyState: React.FC<GuidanceEmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  tips,
  cx,
  fieldMode = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className={`w-16 h-16 flex items-center justify-center mb-4 ${cx?.subtleBg ?? 'bg-nb-cream'}`}>
        <Icon name={icon} className={`text-3xl ${cx?.textMuted ?? 'text-nb-black/40'}`} />
      </div>
      <h3 className={`text-lg font-bold mb-2 ${cx?.text ?? 'text-nb-black/80'}`}>{title}</h3>
      <p className={`text-sm max-w-md mb-6 ${cx?.textMuted ?? 'text-nb-black/50'}`}>{description}</p>

      {action && (
        <Button variant="ghost" size="bare"
          onClick={action.onClick}
          className={`px-6 py-2.5 font-medium text-sm transition-nb flex items-center gap-2 ${fieldMode ? 'bg-nb-yellow text-nb-black hover:bg-nb-yellow/80' : 'bg-iiif-blue text-white hover:bg-nb-blue'}`}
        >
          {action.label}
          <Icon name="arrow_forward" className="text-sm" />
        </Button>
      )}

      {tips && tips.length > 0 && (
        <div className="mt-8 text-left w-full max-w-sm">
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${cx?.label ?? 'text-nb-black/40'}`}>Quick tips</p>
          <ul className="space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className={`flex items-start gap-2 text-xs ${cx?.textMuted ?? 'text-nb-black/50'}`}>
                <Icon name="check_circle" className="text-nb-green text-xs mt-0.5 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default GuidanceEmptyState;
