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
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-10 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in">
      <div className="w-72 bg-nb-white shadow-brutal-lg border border-nb-black/20 overflow-hidden">
        <div className="px-4 py-2.5 bg-nb-white border-b border-nb-black/10 flex items-center justify-between">
          <h3 className="text-xs font-bold text-nb-black/80 uppercase tracking-wide">{title}</h3>
          <Button variant="ghost" size="bare"
            onClick={onToggle}
            className="p-1 hover:bg-nb-cream transition-nb"
            aria-label="Close quick help"
          >
            <Icon name="close" className="text-nb-black/50 text-sm" />
          </Button>
        </div>
        <div className="p-2 max-h-80 overflow-y-auto">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-2 hover:bg-nb-white transition-nb"
            >
              <Icon name={item.icon} className="text-nb-black/40 text-sm mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-nb-black/80">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="px-1 py-0.5 bg-nb-cream text-[9px] font-mono text-nb-black/50">
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
                {item.description && (
                  <p className="text-[10px] text-nb-black/40 mt-0.5">{item.description}</p>
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
