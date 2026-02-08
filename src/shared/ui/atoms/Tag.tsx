/**
 * Tag - Neobrutalist label pill for types/status
 *
 * Chunky bordered label with UPPERCASE monospace text.
 */

import React from 'react';

export interface TagProps {
  children: React.ReactNode;
  color?:'blue' |'red' |'yellow' |'green' |'pink' |'orange' |'purple' |'black';
  className?: string;
}

const colorMap: Record<string, string> = {
  blue:'bg-nb-blue text-nb-white border-nb-black',
  red:'bg-nb-red text-nb-white border-nb-black',
  yellow:'bg-nb-yellow text-nb-black border-nb-black',
  green:'bg-nb-green text-nb-black border-nb-black',
  pink:'bg-nb-pink text-nb-black border-nb-black',
  orange:'bg-nb-orange text-nb-black border-nb-black',
  purple:'bg-nb-purple text-nb-white border-nb-black',
  black:'bg-nb-black text-nb-white border-nb-black',
};

export const Tag: React.FC<TagProps> = ({ children, color ='black', className ='' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 border-2 font-mono text-[10px] font-bold uppercase tracking-wider ${colorMap[color]} ${className}`}>
    {children}
  </span>
);
