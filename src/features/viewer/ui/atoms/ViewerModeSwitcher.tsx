/**
 * ViewerModeSwitcher Atom
 *
 * Segmented control for switching between viewing modes:
 * Individual, Continuous, and Book (paged).
 *
 * @module features/viewer/ui/atoms/ViewerModeSwitcher
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import type { ViewingLayout } from '../../model';

export interface ViewerModeSwitcherProps {
  /** Current viewing mode */
  mode: ViewingLayout;
  /** Called when mode changes */
  onModeChange: (mode: ViewingLayout) => void;
  /** Which mode the manifest behavior suggests */
  defaultMode?: ViewingLayout;
  /** Field mode styling */
  fieldMode?: boolean;
}

const MODE_OPTIONS: Array<{
  value: ViewingLayout;
  icon: string;
  label: string;
  title: string;
}> = [
  { value: 'individuals', icon: 'view_carousel', label: 'Single', title: 'Individual pages' },
  { value: 'continuous', icon: 'view_day', label: 'Scroll', title: 'Continuous strip' },
  { value: 'paged', icon: 'menu_book', label: 'Book', title: 'Paged spread' },
];

export const ViewerModeSwitcher: React.FC<ViewerModeSwitcherProps> = ({
  mode,
  onModeChange,
  defaultMode,
  fieldMode = false,
}) => {
  return (
    <div
      className={`inline-flex border ${
        fieldMode
          ? 'border-nb-black/80 bg-nb-black'
          : 'border-nb-black/20 bg-nb-white'
      }`}
      role="radiogroup"
      aria-label="Viewer mode"
    >
      {MODE_OPTIONS.map(opt => {
        const isActive = mode === opt.value;
        const isDefault = defaultMode === opt.value;

        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={isActive}
            title={`${opt.title}${isDefault ? ' (manifest default)' : ''}`}
            onClick={() => onModeChange(opt.value)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-nb first:rounded-l-lg last:rounded-r-lg ${
              isActive
                ? fieldMode
                  ? 'bg-nb-yellow/20 text-nb-yellow border-nb-yellow'
                  : 'bg-nb-blue/10 text-nb-blue'
                : fieldMode
                  ? 'text-nb-black/40 hover:bg-nb-black/80'
                  : 'text-nb-black/50 hover:bg-nb-cream'
            }`}
          >
            <Icon name={opt.icon} className="text-sm" />
            <span>{opt.label}</span>
            {isDefault && !isActive && (
              <span className={`w-1.5 h-1.5 ${
                fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue/40'
              }`} title="Manifest default" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ViewerModeSwitcher;
