import React from 'react';
import { cn } from '@/src/shared/lib/cn';

/* ── ScreenLayout (Level 1 — App shell) ── */

type ScreenLayoutProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function ScreenLayout({ className, children, ...rest }: ScreenLayoutProps) {
  const classes = cn('flex flex-col h-dvh', className);
  return <div className={classes} {...rest}>{children}</div>;
}

/* ── Sub-components ── */

interface SlotProps {
  className?: string;
  children: React.ReactNode;
}

function Rail({ className, children }: SlotProps) {
  return <div className={cn('shrink-0', className)}>{children}</div>;
}

function Sidebar({ className, children }: SlotProps) {
  return <div className={cn('shrink-0 overflow-hidden', className)}>{children}</div>;
}

function Main({ className, children }: SlotProps) {
  return <div className={cn('flex-1 min-w-0 min-h-0 overflow-hidden', className)}>{children}</div>;
}

function Panel({ className, children }: SlotProps) {
  return <div className={cn('shrink-0 overflow-hidden', className)}>{children}</div>;
}

function StatusBar({ className, children }: SlotProps) {
  return <div className={cn('shrink-0 h-8', className)}>{children}</div>;
}

function Body({ className, children }: SlotProps) {
  return <div className={cn('flex flex-1 min-h-0', className)}>{children}</div>;
}

ScreenLayout.Rail = Rail;
ScreenLayout.Sidebar = Sidebar;
ScreenLayout.Main = Main;
ScreenLayout.Panel = Panel;
ScreenLayout.StatusBar = StatusBar;
ScreenLayout.Body = Body;
