import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
import { cn } from '@/src/shared/lib/cn';
import type { ViewHeaderSelectionBarProps } from './types';

export const ViewHeaderSelectionBar: React.FC<ViewHeaderSelectionBarProps> = ({
  count,
  onClear,
  fieldMode,
  isMobile = false,
  children,
}) => {
  if (count === 0) return null;

  const textColor = fieldMode ? 'text-nb-yellow/40' : 'text-white';
  const dividerColor = fieldMode ? 'bg-nb-yellow' : 'bg-nb-black/80';

  const content = (
    <>
      {!isMobile && (
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('text-xs font-bold', textColor)}>{count} selected</span>
        </div>
      )}
      <div className="flex items-center gap-1 shrink-0">{children}</div>
      {isMobile && <div className={cn('w-px h-8 mx-1', dividerColor)} />}
      {!isMobile && <div className="flex-1" />}
      <Button
        onClick={onClear}
        variant="ghost"
        size="sm"
        icon={<Icon name="close" className={cn(!isMobile && 'text-sm', textColor)} />}
        aria-label="Clear selection"
        title={isMobile ? undefined : 'Clear selection'}
      />
    </>
  );

  if (isMobile) {
    return (
      <div className="absolute z-[100] animate-in slide-in-from-bottom-4 bottom-8 left-4 right-4">
        <div
          className={cn(
            fieldMode ? 'border-nb-yellow' : 'border-nb-black/80',
            'bg-nb-black/95 backdrop-blur-md border shadow-brutal-lg p-1 flex items-center gap-1 ring-4 ring-black/10 overflow-x-auto no-scrollbar max-w-full',
          )}
        >
          <div className="flex p-1 gap-1 shrink-0">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full px-6 py-2 border-b z-10 animate-in slide-in-from-top-2 flex items-center gap-4',
        fieldMode
          ? 'bg-nb-yellow/20 border-nb-yellow text-nb-yellow/40'
          : 'bg-nb-black border-nb-black/80 text-white',
      )}
    >
      {content}
    </div>
  );
};
