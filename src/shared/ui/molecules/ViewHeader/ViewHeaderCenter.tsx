import React from 'react';
import { useViewHeaderContext } from './ViewHeader';
import type { ViewHeaderCenterProps } from './types';

export const ViewHeaderCenter: React.FC<ViewHeaderCenterProps> = ({ children }) => {
  const { isMobile } = useViewHeaderContext();
  if (isMobile) return null;
  return <div className="flex items-center gap-3">{children}</div>;
};
