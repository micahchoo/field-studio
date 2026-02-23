import React from 'react';
import { shelfHeightClasses, shelfWidthClasses } from '../types';
import type { ShelfHeight, ShelfWidth } from '../types';
import { cn } from '@/src/shared/lib/cn';

interface ShelfProps {
  h?: ShelfHeight;
  w?: ShelfWidth | number;
  shrink?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Shelf({ h = 'auto', w, shrink = false, className, children }: ShelfProps) {
  const classes = cn(
    !shrink && 'shrink-0',
    shelfHeightClasses[h],
    typeof w === 'string' ? shelfWidthClasses[w] : undefined,
    className,
  );

  const style = typeof w === 'number' ? { width: w } : undefined;

  return <div className={classes} style={style}>{children}</div>;
}
