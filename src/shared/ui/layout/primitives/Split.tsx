import React, { createContext, useContext } from 'react';
import { useResizablePanel } from '@/src/shared/lib/hooks/useResizablePanel';
import type { UseResizablePanelReturn } from '@/src/shared/lib/hooks/useResizablePanel';
import { cn } from '@/src/shared/lib/cn';

/* ── Context ── */

interface SplitContext {
  direction: 'horizontal' | 'vertical';
}

const Ctx = createContext<SplitContext>({ direction: 'horizontal' });

/* ── Static handle classes ── */

const HANDLE_H = 'w-1 hover:w-1.5 hover:bg-nb-black/10 active:bg-nb-black/20 transition-all shrink-0';
const HANDLE_V = 'h-1 hover:h-1.5 hover:bg-nb-black/10 active:bg-nb-black/20 transition-all shrink-0';

/* ── Split root ── */

interface SplitProps {
  direction?: 'horizontal' | 'vertical';
  className?: string;
  children: React.ReactNode;
}

export function Split({ direction = 'horizontal', className, children }: SplitProps) {
  const classes = cn(
    'flex',
    direction === 'horizontal' ? 'flex-row' : 'flex-col',
    'h-full min-h-0',
    className,
  );

  return (
    <Ctx.Provider value={{ direction }}>
      <div className={classes}>{children}</div>
    </Ctx.Provider>
  );
}

/* ── Split.Panel ── */

interface SplitPanelProps {
  id: string;
  size: number;
  min?: number;
  max?: number;
  resizable?: boolean;
  collapsible?: boolean | number;
  visible?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  className?: string;
  children: React.ReactNode | ((panel: UseResizablePanelReturn) => React.ReactNode);
  /** Which side the handle appears on. Defaults based on panel position. */
  handleSide?: 'left' | 'right' | 'top' | 'bottom';
}

function SplitPanel({
  id,
  size,
  min = 0,
  max = 9999,
  resizable = false,
  collapsible,
  visible = true,
  onVisibilityChange,
  className,
  children,
  handleSide,
}: SplitPanelProps) {
  const { direction } = useContext(Ctx);
  const collapseThreshold = typeof collapsible === 'number' ? collapsible : collapsible ? min || size * 0.4 : 0;

  const side = handleSide ?? (direction === 'horizontal' ? 'right' : 'bottom');

  const panel = useResizablePanel({
    id,
    defaultSize: size,
    minSize: min || 0,
    maxSize: max,
    direction,
    side,
    collapseThreshold,
    persist: true,
    onCollapse: () => onVisibilityChange?.(false),
    onExpand: () => onVisibilityChange?.(true),
  });

  if (!visible) return null;

  const panelClasses = cn(
    'relative overflow-hidden shrink-0',
    className,
  );

  return (
    <>
      <div className={panelClasses} style={panel.panelStyle}>
        {typeof children === 'function' ? children(panel) : children}
      </div>
      {resizable && (
        <div
          {...panel.handleProps}
          className={cn(
            panel.handleProps.className,
            direction === 'horizontal' ? HANDLE_H : HANDLE_V,
          )}
        />
      )}
    </>
  );
}

/* ── Split.Content ── */

interface SplitContentProps {
  className?: string;
  children: React.ReactNode;
}

function SplitContent({ className, children }: SplitContentProps) {
  const classes = cn(
    'flex-1 min-w-0 min-h-0 overflow-hidden',
    className,
  );

  return <div className={classes}>{children}</div>;
}

/* ── Attach sub-components ── */

Split.Panel = SplitPanel;
Split.Content = SplitContent;
