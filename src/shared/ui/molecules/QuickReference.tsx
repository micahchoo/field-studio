/**
 * QuickReference Molecule
 *
 * Per-view help panel with keyboard shortcuts and actions.
 * Anchored to bottom-right, above StatusBar.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - No local state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/molecules/QuickReference
 */

import React from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { useContextualStyles } from '@/src/shared/lib/hooks/useContextualStyles';
import { cn } from '@/src/shared/lib/cn';

interface QuickRefItem {
  icon: string;
  label: string;
  shortcut?: string;
  description?: string;
}

export interface QuickReferenceProps {
  title: string;
  items: QuickRefItem[];
  isOpen: boolean;
  onToggle: () => void;
}

export const QuickReference: React.FC<QuickReferenceProps> = ({ title, items, isOpen, onToggle }) => {
  const cx = useContextualStyles();

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-10 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in">
      <div className={cn('w-72 shadow-brutal-lg overflow-hidden', cx.surface)}>
        <div className={cn('px-4 py-2.5 border-b flex items-center justify-between', cx.surface, cx.divider)}>
          <h3 className={cn('text-xs font-bold uppercase tracking-wide', cx.text)}>{title}</h3>
          <Button variant="ghost" size="bare"
            onClick={onToggle}
            className="p-1 hover:bg-nb-cream transition-nb"
            aria-label="Close quick help"
          >
            <Icon name="close" className={cn('text-sm', cx.textMuted)} />
          </Button>
        </div>
        <div className="p-2 max-h-80 overflow-y-auto">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-2 transition-nb"
            >
              <Icon name={item.icon} className={cn('text-sm mt-0.5', cx.textMuted)} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn('text-xs font-medium', cx.text)}>{item.label}</span>
                  {item.shortcut && (
                    <kbd className={cn('px-1 py-0.5 text-[9px] font-mono', cx.kbd)}>
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
                {item.description && (
                  <p className={cn('text-[10px] mt-0.5', cx.textMuted)}>{item.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickReference;
