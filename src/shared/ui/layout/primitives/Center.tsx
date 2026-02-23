import React from 'react';
import { cn } from '@/src/shared/lib/cn';

interface CenterProps {
  flex?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Center({ flex, className, children }: CenterProps) {
  const classes = cn(
    'flex items-center justify-center',
    flex && 'flex-1',
    className,
  );

  return <div className={classes}>{children}</div>;
}
