/**
 * PageCounter Molecule
 *
 * Page navigation counter for paginated or multi-canvas views.
 * Composes Button atoms with current/total display.
 *
 * ATOMIC DESIGN:
 * - Composes: Button atom, Input atom (for direct entry)
 * - Has local state: edit mode for direct page entry
 * - No domain logic (page state managed by parent)
 *
 * IDEAL OUTCOME: Easy navigation between pages with clear position
 * FAILURE PREVENTED: Getting lost in large collections
 *
 * @example
 * <PageCounter
 *   current={5}
 *   total={42}
 *   onPageChange={(p) => goToPage(p)}
 * />
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface PageCounterProps {
  /** Current page number (1-indexed) */
  current: number;
  /** Total number of pages */
  total: number;
  /** Called when page changes */
  onPageChange: (page: number) => void;
  /** Show first/last buttons */
  showFirstLast?: boolean;
  /** Allow direct page number entry */
  allowDirectEntry?: boolean;
  /** Page label (e.g., "Page", "Canvas", "Item") */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
}

/**
 * PageCounter Component
 *
 * Page navigation with prev/next and optional direct entry.
 */
export const PageCounter: React.FC<PageCounterProps> = ({
  current,
  total,
  onPageChange,
  showFirstLast = false,
  allowDirectEntry = true,
  label = 'Page',
  disabled = false,
  cx,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(current.toString());

  // Update edit value when current changes
  useEffect(() => {
    setEditValue(current.toString());
  }, [current]);

  const handlePrev = useCallback(() => {
    if (current > 1) {
      onPageChange(current - 1);
    }
  }, [current, onPageChange]);

  const handleNext = useCallback(() => {
    if (current < total) {
      onPageChange(current + 1);
    }
  }, [current, total, onPageChange]);

  const handleFirst = useCallback(() => {
    onPageChange(1);
  }, [onPageChange]);

  const handleLast = useCallback(() => {
    onPageChange(total);
  }, [total, onPageChange]);

  const handleEditSubmit = useCallback(() => {
    const page = parseInt(editValue, 10);
    if (!isNaN(page) && page >= 1 && page <= total) {
      onPageChange(page);
    } else {
      setEditValue(current.toString());
    }
    setIsEditing(false);
  }, [editValue, current, total, onPageChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleEditSubmit();
      } else if (e.key === 'Escape') {
        setEditValue(current.toString());
        setIsEditing(false);
      }
    },
    [handleEditSubmit, current]
  );

  const canGoPrev = current > 1;
  const canGoNext = current < total;

  return (
    <div
      className={`
        inline-flex items-center gap-2
        rounded-lg border ${cx.border} ${cx.surface} px-2 py-1
      `}
      role="navigation"
      aria-label="Page navigation"
    >
      {/* First button */}
      {showFirstLast && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFirst}
          disabled={disabled || !canGoPrev}
          aria-label="Go to first page"
          className="!px-1"
        >
          <span className="material-icons text-sm">first_page</span>
        </Button>
      )}

      {/* Previous button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrev}
        disabled={disabled || !canGoPrev}
        aria-label="Previous page"
        className="!px-1"
      >
        <span className="material-icons">chevron_left</span>
      </Button>

      {/* Page display / edit */}
      <div className="flex items-center gap-1 px-2">
        <span className={`text-xs ${cx.textMuted}`}>{label}</span>

        {isEditing && allowDirectEntry ? (
          <input
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditSubmit}
            onKeyDown={handleKeyDown}
            className={`
              w-12 text-center text-sm font-medium
              border ${cx.border} ${cx.input} rounded
              focus:ring-2 focus:ring-inset focus:${cx.accent}
            `}
            min={1}
            max={total}
            autoFocus
          />
        ) : (
          <button
            onClick={() => allowDirectEntry && setIsEditing(true)}
            className={`
              text-sm font-medium ${cx.text}
              ${allowDirectEntry ? `hover:${cx.accent} cursor-pointer` : ''}
            `}
            disabled={disabled || !allowDirectEntry}
            aria-label={allowDirectEntry ? 'Click to edit page number' : undefined}
          >
            {current}
          </button>
        )}

        <span className={`text-sm ${cx.textMuted}`}>/</span>
        <span className={`text-sm ${cx.textMuted}`}>{total}</span>
      </div>

      {/* Next button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNext}
        disabled={disabled || !canGoNext}
        aria-label="Next page"
        className="!px-1"
      >
        <span className="material-icons">chevron_right</span>
      </Button>

      {/* Last button */}
      {showFirstLast && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLast}
          disabled={disabled || !canGoNext}
          aria-label="Go to last page"
          className="!px-1"
        >
          <span className="material-icons text-sm">last_page</span>
        </Button>
      )}
    </div>
  );
};
