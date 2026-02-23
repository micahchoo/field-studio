import React from 'react';
import { cn } from '@/src/shared/lib/cn';

/* ── PaneLayout (Level 2 — View container) ── */

interface PaneLayoutProps {
  variant?: 'default' | 'canvas';
  className?: string;
  children: React.ReactNode;
}

export function PaneLayout({ variant = 'default', className, children }: PaneLayoutProps) {
  const classes = cn('flex flex-col h-full', className);
  return (
    <PaneCtx.Provider value={{ variant }}>
      <div className={classes}>{children}</div>
    </PaneCtx.Provider>
  );
}

/* ── Context ── */

interface PaneContext {
  variant: 'default' | 'canvas';
}

const PaneCtx = React.createContext<PaneContext>({ variant: 'default' });

/* ── Sub-components ── */

interface SlotProps {
  className?: string;
  children: React.ReactNode;
}

function Header({ className, children }: SlotProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>;
}

interface SubBarProps extends SlotProps {
  visible?: boolean;
}

function SubBar({ visible = true, className, children }: SubBarProps) {
  if (!visible) return null;
  return <div className={cn('shrink-0', className)}>{children}</div>;
}

interface BodyProps extends SlotProps {
  scroll?: boolean;
}

function Body({ scroll, className, children }: BodyProps) {
  const { variant } = React.useContext(PaneCtx);
  const shouldScroll = scroll ?? (variant === 'default');

  const classes = cn(
    'flex-1 min-h-0',
    shouldScroll ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden',
    className,
  );

  return <div className={classes}>{children}</div>;
}

function Footer({ className, children }: SlotProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>;
}

PaneLayout.Header = Header;
PaneLayout.SubBar = SubBar;
PaneLayout.Body = Body;
PaneLayout.Footer = Footer;
