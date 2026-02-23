import React from 'react';
import { overflowClasses } from '../types';
import type { OverflowAxis } from '../types';
import { cn } from '@/src/shared/lib/cn';

interface ScrollProps {
  flex?: boolean;
  axis?: OverflowAxis;
  className?: string;
  children: React.ReactNode;
}

export function Scroll({ flex, axis = 'y', className, children }: ScrollProps) {
  const classes = cn(
    overflowClasses[axis],
    flex && 'flex-1 min-h-0',
    className,
  );

  return <div className={classes}>{children}</div>;
}
