import React from 'react';
import type { ViewHeaderBodyProps } from './types';

export const ViewHeaderBody: React.FC<ViewHeaderBodyProps> = ({
  maxWidth,
  children,
}) => (
  <div className={maxWidth || 'w-full'}>{children}</div>
);
