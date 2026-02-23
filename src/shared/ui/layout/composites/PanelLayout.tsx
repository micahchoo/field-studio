import React from 'react';
import { cn } from '@/src/shared/lib/cn';

/* ── PanelLayout (Level 3 — Panel internals) ── */

interface PanelLayoutProps {
  className?: string;
  children: React.ReactNode;
}

export function PanelLayout({ className, children }: PanelLayoutProps) {
  const classes = cn('flex flex-col h-full', className);
  return <div className={classes}>{children}</div>;
}

/* ── Sub-components ── */

interface SlotProps {
  className?: string;
  children: React.ReactNode;
}

function Header({ className, children }: SlotProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>;
}

interface BodyProps extends SlotProps {
  scroll?: boolean;
}

function Body({ scroll = true, className, children }: BodyProps) {
  const classes = cn(
    'flex-1 min-h-0',
    scroll ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden',
    className,
  );

  return <div className={classes}>{children}</div>;
}

function Footer({ className, children }: SlotProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>;
}

PanelLayout.Header = Header;
PanelLayout.Body = Body;
PanelLayout.Footer = Footer;
