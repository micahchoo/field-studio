import React, { createContext, useContext, useMemo } from 'react';
import { useResponsive } from '@/src/shared/lib/hooks/useResponsive';
import { cn } from '@/src/shared/lib/cn';
import type { ViewHeaderContextValue, ViewHeaderProps } from './types';

export const ViewHeaderContext = createContext<ViewHeaderContextValue | null>(null);

export function useViewHeaderContext(): ViewHeaderContextValue {
  const ctx = useContext(ViewHeaderContext);
  if (!ctx) throw new Error('ViewHeader sub-component used outside <ViewHeader>');
  return ctx;
}

/** Marker for ViewHeaderSubBar — avoids circular import */
export const SUB_BAR_MARKER = Symbol.for('ViewHeaderSubBar');

const ROW_CLASSES: Record<string, string> = {
  default: 'h-header-compact flex items-center justify-between px-3',
  compact: 'h-12 flex items-center justify-between px-3',
  fluid: '',
};

/**
 * Separates children into sub-bar elements and header-row elements.
 * SubBar children render below the main header row.
 */
function partitionChildren(children: React.ReactNode): { row: React.ReactNode[]; subBars: React.ReactNode[] } {
  const row: React.ReactNode[] = [];
  const subBars: React.ReactNode[] = [];
  React.Children.forEach(children, (child) => {
    if (
      React.isValidElement(child) &&
      typeof child.type === 'function' &&
      (child.type as any).__subBar === SUB_BAR_MARKER
    ) {
      subBars.push(child);
    } else {
      row.push(child);
    }
  });
  return { row, subBars };
}

export const ViewHeader: React.FC<ViewHeaderProps> = ({
  cx,
  fieldMode,
  height = 'default',
  zIndex = 'z-10',
  className,
  children,
}) => {
  const { isMobile } = useResponsive();

  const ctxValue: ViewHeaderContextValue = { height, cx, fieldMode, isMobile };
  const { row, subBars } = useMemo(() => partitionChildren(children), [children]);
  const hasSubBars = subBars.length > 0;

  return (
    <ViewHeaderContext.Provider value={ctxValue}>
      <div
        className={cn(
          'transition-mode shrink-0',
          cx.headerBg || (fieldMode ? 'bg-nb-black border-b-4 border-nb-yellow' : 'bg-nb-cream border-b-4 border-nb-black'),
          zIndex,
          !hasSubBars && ROW_CLASSES[height],
          className,
        )}
      >
        {hasSubBars ? (
          <>
            <div className={ROW_CLASSES[height]}>{row}</div>
            {subBars}
          </>
        ) : (
          row
        )}
      </div>
    </ViewHeaderContext.Provider>
  );
};
