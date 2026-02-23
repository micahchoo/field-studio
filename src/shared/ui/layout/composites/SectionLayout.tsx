import React from 'react';
import { gapClasses } from '../types';
import type { GapSize } from '../types';
import { cn } from '@/src/shared/lib/cn';

/* ── SectionLayout (Level 4 — Content grouping) ── */

interface SectionLayoutProps {
  className?: string;
  children: React.ReactNode;
}

export function SectionLayout({ className, children }: SectionLayoutProps) {
  const classes = cn('flex flex-col', className);
  return <div className={classes}>{children}</div>;
}

/* ── Sub-components ── */

interface TitleProps {
  className?: string;
  children: React.ReactNode;
}

function Title({ className, children }: TitleProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>;
}

interface BodyProps {
  gap?: GapSize;
  className?: string;
  children: React.ReactNode;
}

function Body({ gap = 'none', className, children }: BodyProps) {
  const classes = cn('flex flex-col', gapClasses[gap], className);
  return <div className={classes}>{children}</div>;
}

SectionLayout.Title = Title;
SectionLayout.Body = Body;
