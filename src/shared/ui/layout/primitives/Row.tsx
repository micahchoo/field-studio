import React from 'react';
import { gapClasses, alignClasses, justifyClasses } from '../types';
import type { GapSize, Alignment, Justify } from '../types';
import { cn } from '@/src/shared/lib/cn';

interface RowProps {
  gap?: GapSize;
  align?: Alignment;
  justify?: Justify;
  wrap?: boolean;
  className?: string;
  children: React.ReactNode;
}

interface RowItemProps {
  flex?: boolean;
  shrink?: boolean;
  className?: string;
  children: React.ReactNode;
}

function RowItem({ flex, shrink = !flex, className, children }: RowItemProps) {
  const classes = cn(
    flex && 'flex-1 min-w-0',
    shrink && 'shrink-0',
    className,
  );

  return <div className={classes || undefined}>{children}</div>;
}

export function Row({ gap = 'none', align, justify, wrap, className, children }: RowProps) {
  const classes = cn(
    'flex',
    gapClasses[gap],
    align && alignClasses[align],
    justify && justifyClasses[justify],
    wrap && 'flex-wrap',
    className,
  );

  return <div className={classes}>{children}</div>;
}

Row.Item = RowItem;
