import React from 'react';
import { gapClasses, alignClasses } from '../types';
import type { GapSize, Alignment } from '../types';
import { cn } from '@/src/shared/lib/cn';

interface StackProps {
  gap?: GapSize;
  stretch?: boolean;
  align?: Alignment;
  className?: string;
  children: React.ReactNode;
}

export function Stack({ gap = 'none', stretch, align, className, children }: StackProps) {
  const classes = cn(
    'flex flex-col',
    stretch && 'h-full',
    gapClasses[gap],
    align && alignClasses[align],
    className,
  );

  return <div className={classes}>{children}</div>;
}
