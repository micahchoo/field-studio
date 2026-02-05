/**
 * FilmstripNavigator Molecule
 *
 * Composes: IconButton + PageCounter atoms
 *
 * Footer navigation with page counter and canvas thumbnails.
 * Displays current position and loading status.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes molecules: PageCounter
 * - Local UI state only
 * - No domain logic
 *
 * IDEAL OUTCOME: Easy navigation between canvases in a manifest
 * FAILURE PREVENTED: Lost context in multi-canvas manifests
 *
 * @module features/viewer/ui/molecules/FilmstripNavigator
 */

import React from 'react';
import { PageCounter } from '@/src/features/viewer/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface FilmstripNavigatorProps {
  /** Current canvas index (0-based) */
  currentIndex: number;
  /** Total number of canvases */
  totalItems: number;
  /** Loading status message */
  loadingStatus?: string;
  /** Canvas label for display */
  label?: string;
  /** Called when page changes */
  onPageChange?: (page: number) => void;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
}

/**
 * FilmstripNavigator Molecule
 *
 * @example
 * <FilmstripNavigator
 *   currentIndex={0}
 *   totalItems={10}
 *   loadingStatus="Image loaded"
 *   cx={cx}
 *   fieldMode={fieldMode}
 * />
 */
export const FilmstripNavigator: React.FC<FilmstripNavigatorProps> = ({
  currentIndex,
  totalItems,
  loadingStatus = 'Loading...',
  label = 'Canvas',
  onPageChange,
  cx,
  fieldMode,
}) => {
  if (totalItems <= 1) return null;

  return (
    <div
      className={`h-12 border-t flex items-center justify-between px-4 ${
        fieldMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-800 border-slate-700'
      }`}
    >
      <PageCounter
        current={currentIndex + 1}
        total={totalItems}
        onPageChange={onPageChange || (() => {})}
        label={label}
        cx={cx}
      />
      <div className="text-xs text-slate-500">{loadingStatus}</div>
    </div>
  );
};

export default FilmstripNavigator;
