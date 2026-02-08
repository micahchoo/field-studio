/**
 * PreviewHeader Atom
 *
 * Header for the IIIF Image API preview panel.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/viewer/ui/atoms/PreviewHeader
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface PreviewHeaderProps {
  /** Title text */
  title?: string;
  /** Validation status */
  isValid?: boolean;
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
}

export const PreviewHeader: React.FC<PreviewHeaderProps> = ({
  title = 'IIIF Image API Preview',
  isValid = true,
  cx: _cx,
  fieldMode = false,
}) => {
  const mutedTextClass = fieldMode ? 'text-nb-black/40' : 'text-nb-black/50';

  return (
    <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-nb-black/20 shrink-0">
      <span className={`text-[10px] font-bold ${mutedTextClass} uppercase tracking-wider`}>{title}</span>
      <div className={`flex items-center gap-1 ${isValid ? 'bg-nb-green/20' : 'bg-nb-red/20'} px-2 py-1 rounded`}>
        <div className={`w-1.5 h-1.5 ${isValid ? 'bg-nb-green' : 'bg-nb-red'}`} />
        <span className={`text-[9px] ${isValid ? 'text-nb-green' : 'text-nb-red'} font-bold uppercase`}>
          {isValid ? 'Valid' : 'Invalid'}
        </span>
      </div>
    </div>
  );
};

export default PreviewHeader;
