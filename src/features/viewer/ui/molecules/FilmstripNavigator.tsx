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
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export type ViewingDirection = 'left-to-right' | 'right-to-left' | 'top-to-bottom' | 'bottom-to-top';

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
  /** IIIF viewingDirection from manifest */
  viewingDirection?: ViewingDirection;
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
  viewingDirection = 'left-to-right',
}) => {
  if (totalItems <= 1) return null;

  const isRTL = viewingDirection === 'right-to-left';
  const directionStyle: React.CSSProperties = isRTL ? { direction: 'rtl' } : {};

  return (
    <div
      className={`h-12 border-t flex items-center justify-between px-4 ${
        fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-black border-nb-black/80'
      }`}
      style={directionStyle}
    >
      <PageCounter
        current={currentIndex + 1}
        total={totalItems}
        onPageChange={onPageChange || (() => {})}
        label={label}
        cx={cx}
      />
      <div className="text-xs text-nb-black/50" style={{ direction: 'ltr' }}>
        {loadingStatus}
        {viewingDirection !== 'left-to-right' && (
          <span className={`ml-2 text-[9px] font-bold uppercase ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/60'}`}>
            {isRTL ? '\u2190 RTL' : viewingDirection === 'top-to-bottom' ? '\u2193 TTB' : '\u2191 BTT'}
          </span>
        )}
      </div>
    </div>
  );
};

export default FilmstripNavigator;
