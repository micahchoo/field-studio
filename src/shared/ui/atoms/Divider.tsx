/**
 * Divider - Neobrutalist thick horizontal/vertical rule
 */

import React from 'react';

export interface DividerProps {
  direction?:'horizontal' |'vertical';
  thickness?: 2 | 4;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ direction ='horizontal', thickness = 2, className ='' }) => {
  if (direction ==='vertical') {
    return <div className={`w-[${thickness}px] self-stretch bg-nb-black ${className}`} />;
  }
  return <div className={`h-[${thickness}px] w-full bg-nb-black ${className}`} />;
};
