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
          border-b border-nb-black/20
          bg-nb-black/50
          ${className}
        `}
      >
        <span className="text-sm text-nb-black/50 font-serif">
          {totalNodes} {totalNodes === 1 ? 'item' : 'items'}
        </span>
        {selectedCount > 0 && (
          <Button variant="ghost" size="bare"
            type="button"
            onClick={onClearSelection}
            className="text-sm text-nb-orange hover:text-nb-orange font-medium transition-nb"
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
        border-b border-nb-black/20
        bg-nb-black/50
        ${className}
      `}
    >
      {/* Left: View options in overflow menu */}
      <div className="relative">
        <Button variant="ghost" size="bare"
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-nb-black/40 hover:bg-nb-cream transition-nb"
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
            <div className="absolute top-full left-0 mt-1 w-48 bg-nb-black shadow-brutal border border-nb-black/20 py-1 z-20">
              <Button variant="ghost" size="bare"
                type="button"
                onClick={() => {
                  onExpandAll();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-nb-black/20 hover:bg-nb-cream transition-nb"
              >
                Expand all
              </Button>
              <Button variant="ghost" size="bare"
                type="button"
                onClick={() => {
                  onCollapseAll();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-nb-black/20 hover:bg-nb-cream transition-nb"
              >
                Collapse all
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Right: Selection info with warm accent */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-nb-black/50 font-serif">
          {totalNodes} {totalNodes === 1 ? 'item' : 'items'}
        </span>
        {selectedCount > 0 && (
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 text-sm font-medium text-nb-orange/40 bg-nb-orange/20 ">
              {selectedCount} selected
            </span>
            <Button variant="ghost" size="bare"
              type="button"
              onClick={onClearSelection}
              className="text-sm text-nb-black/50 hover:text-nb-orange transition-nb"
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
