/**
 * Panel - Neobrutalist bordered container with optional header bar
 */

import React from 'react';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface PanelProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  borderWidth?: 2 | 4;
  cx?: Partial<ContextualClassNames>;
}

export const Panel: React.FC<PanelProps> = ({ children, header, className ='', borderWidth = 2, cx: cxProp }) => {
  const surface = cxProp?.surface ?? `bg-nb-white border-${borderWidth} border-nb-black`;
  const headerBg = cxProp?.headerBg ?? 'bg-nb-cream';
  const border = cxProp?.border ?? 'border-nb-black';

  return (
    <div className={`${surface} ${className}`}>
      {header && (
        <div className={`px-4 py-2 ${headerBg} border-b-${borderWidth} ${border} font-mono text-xs font-bold uppercase tracking-wider`}>
          {header}
        </div>
      )}
      {children}
    </div>
  );
};
