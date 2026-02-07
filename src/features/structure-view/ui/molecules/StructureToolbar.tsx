/**
 * Structure Toolbar Molecule
 *
 * Refined toolbar with archival aesthetic - reduced visual noise,
 * moved to overflow menu, cleaner selection indicators.
 *
 * BOLD AESTHETIC:
 * - Warm earth tones (amber/terracotta accents)
 * - Generous whitespace
 * - Editorial typography with clean hierarchy
 * - Subtle depth with layered cards
 */

import React, { useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';

interface StructureToolbarProps {
  totalNodes: number;
  selectedCount: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClearSelection: () => void;
  /** Abstraction level - controls complexity of UI */
  abstractionLevel?: 'simple' | 'standard' | 'advanced';
  className?: string;
}

export const StructureToolbar: React.FC<StructureToolbarProps> = ({
  totalNodes,
  selectedCount,
  onExpandAll,
  onCollapseAll,
  onClearSelection,
  abstractionLevel = 'standard',
  className = '',
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const isSimple = abstractionLevel === 'simple';

  // Simple mode: minimal toolbar
  if (isSimple) {
    return (
      <div
        className={`
          flex items-center justify-between px-4 py-3
          border-b border-stone-200 dark:border-stone-700
          bg-stone-50/50 dark:bg-stone-900/50
          ${className}
        `}
      >
        <span className="text-sm text-stone-500 dark:text-stone-400 font-serif">
          {totalNodes} {totalNodes === 1 ? 'item' : 'items'}
        </span>
        {selectedCount > 0 && (
          <Button variant="ghost" size="bare"
            type="button"
            onClick={onClearSelection}
            className="text-sm text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-medium transition-colors"
          >
            Clear selection
          </Button>
        )}
      </div>
    );
  }

  // Standard/Advanced mode: refined toolbar
  return (
    <div
      className={`
        flex items-center justify-between px-4 py-3
        border-b border-stone-200 dark:border-stone-700
        bg-stone-50/50 dark:bg-stone-900/50
        ${className}
      `}
    >
      {/* Left: View options in overflow menu */}
      <div className="relative">
        <Button variant="ghost" size="bare"
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          aria-expanded={showMenu}
          aria-haspopup="true"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>View</span>
        </Button>

        {/* Dropdown menu */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 py-1 z-20">
              <Button variant="ghost" size="bare"
                type="button"
                onClick={() => {
                  onExpandAll();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                Expand all
              </Button>
              <Button variant="ghost" size="bare"
                type="button"
                onClick={() => {
                  onCollapseAll();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                Collapse all
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Right: Selection info with warm accent */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-stone-500 dark:text-stone-400 font-serif">
          {totalNodes} {totalNodes === 1 ? 'item' : 'items'}
        </span>
        {selectedCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-sm font-medium text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/40 rounded-full">
              {selectedCount} selected
            </span>
            <Button variant="ghost" size="bare"
              type="button"
              onClick={onClearSelection}
              className="text-sm text-stone-500 dark:text-stone-400 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
              Clear
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

StructureToolbar.displayName = 'StructureToolbar';
