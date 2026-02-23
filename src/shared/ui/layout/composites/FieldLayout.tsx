import React from 'react';
import { cn } from '@/src/shared/lib/cn';

/* ── FieldLayout (Level 5 — Form fields) ── */

interface FieldLayoutProps {
  className?: string;
  children: React.ReactNode;
}

export function FieldLayout({ className, children }: FieldLayoutProps) {
  const classes = cn('flex flex-col gap-1', className);
  return <div className={classes}>{children}</div>;
}

/* ── Sub-components ── */

interface SlotProps {
  className?: string;
  children: React.ReactNode;
}

function Label({ className, children }: SlotProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>;
}

function Control({ className, children }: SlotProps) {
  return <div className={className}>{children}</div>;
}

function Hint({ className, children }: SlotProps) {
  return <div className={cn('text-xs', className)}>{children}</div>;
}

FieldLayout.Label = Label;
FieldLayout.Control = Control;
FieldLayout.Hint = Hint;
