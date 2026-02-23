import React from 'react';
import { useViewHeaderContext, SUB_BAR_MARKER } from './ViewHeader';
import { cn } from '@/src/shared/lib/cn';
import type { ViewHeaderSubBarProps } from './types';

const ViewHeaderSubBarInner: React.FC<ViewHeaderSubBarProps> = ({
  visible,
  className,
  children,
}) => {
  const { cx, fieldMode } = useViewHeaderContext();

  if (!visible) return null;

  return (
    <div
      className={cn(
        'w-full px-3 py-1.5 border-b z-10 flex items-center gap-3 shrink-0',
        cx.pageBg || (fieldMode ? 'bg-nb-black/80' : 'bg-nb-white'),
        cx.divider || (fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20'),
        cx.text || (fieldMode ? 'text-nb-yellow' : 'text-nb-black'),
        className,
      )}
    >
      {children}
    </div>
  );
};

// Tag for ViewHeader's partitionChildren to detect sub-bar elements
(ViewHeaderSubBarInner as any).__subBar = SUB_BAR_MARKER;

export const ViewHeaderSubBar = ViewHeaderSubBarInner;
