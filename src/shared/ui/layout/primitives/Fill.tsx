import React from 'react';
import { cn } from '@/src/shared/lib/cn';

interface FillProps {
  flex?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Fill({ flex, className, children }: FillProps) {
  const classes = cn(
    flex ? 'flex-1 min-h-0 min-w-0' : 'absolute inset-0',
    className,
  );

  return <div className={classes}>{children}</div>;
}
