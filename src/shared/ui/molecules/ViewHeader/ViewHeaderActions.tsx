import React from 'react';
import type { ViewHeaderActionsProps } from './types';

export const ViewHeaderActions: React.FC<ViewHeaderActionsProps> = ({ children }) => (
  <div className="flex items-center gap-3">{children}</div>
);
