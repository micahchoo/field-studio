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
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

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
  const mutedTextClass = fieldMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="h-12 border-b border-white/10 flex items-center px-4 justify-between bg-black/20 shrink-0">
      <span className={`text-[10px] font-bold ${mutedTextClass} uppercase tracking-wider`}>{title}</span>
      <div className={`flex items-center gap-1 ${isValid ? 'bg-green-500/20' : 'bg-red-500/20'} px-2 py-1 rounded`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className={`text-[9px] ${isValid ? 'text-green-400' : 'text-red-400'} font-bold uppercase`}>
          {isValid ? 'Valid' : 'Invalid'}
        </span>
      </div>
    </div>
  );
};

export default PreviewHeader;
