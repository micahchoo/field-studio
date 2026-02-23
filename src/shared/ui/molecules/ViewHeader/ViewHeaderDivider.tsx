import React from 'react';
import { useViewHeaderContext } from './ViewHeader';
import type { ViewHeaderDividerProps } from './types';

export const ViewHeaderDivider: React.FC<ViewHeaderDividerProps> = ({ className }) => {
  const { fieldMode } = useViewHeaderContext();
  return (
    <div
      className={
        className ||
        `w-px h-6 ${fieldMode ? 'bg-nb-yellow/30' : 'bg-nb-black/20'}`
      }
    />
  );
};
