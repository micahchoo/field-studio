/**
 * Divider - Neobrutalist thick horizontal/vertical rule
 */

import React from 'react';

export interface DividerProps {
  direction?:'horizontal' |'vertical';
  thickness?: 2 | 4;
  fieldMode?: boolean;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ direction ='horizontal', thickness = 2, fieldMode, className ='' }) => {
  const bg = fieldMode ? 'bg-nb-yellow' : 'bg-nb-black';
  if (direction ==='vertical') {
    return <div className={`w-[${thickness}px] self-stretch ${bg} ${className}`} />;
  }
  return <div className={`h-[${thickness}px] w-full ${bg} ${className}`} />;
};
