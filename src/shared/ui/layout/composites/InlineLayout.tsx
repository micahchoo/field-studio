import React from 'react';
import { gapClasses, alignClasses } from '../types';
import type { GapSize, Alignment } from '../types';
import { cn } from '@/src/shared/lib/cn';

/* ── InlineLayout (Level 6 — Atom internals) ── */

interface InlineLayoutProps {
  gap?: GapSize;
  align?: Alignment;
  className?: string;
  children: React.ReactNode;
}

export function InlineLayout({ gap = 'xs', align = 'center', className, children }: InlineLayoutProps) {
  const classes = cn(
    'inline-flex',
    gapClasses[gap],
    alignClasses[align],
    className,
  );

  return <div className={classes}>{children}</div>;
}
