/**
 * Panel - Neobrutalist bordered container with optional header bar
 */

import React from 'react';

export interface PanelProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
  borderWidth?: 2 | 4;
}

export const Panel: React.FC<PanelProps> = ({ children, header, className ='', borderWidth = 2 }) => (
  <div className={`bg-nb-white border-${borderWidth} border-nb-black ${className}`}>
    {header && (
      <div className={`px-4 py-2 bg-nb-cream border-b-${borderWidth} border-nb-black font-mono text-xs font-bold uppercase tracking-wider`}>
        {header}
      </div>
    )}
    {children}
  </div>
);
