/**
 * ViewToggle Molecule
 *
 * Composes: Button atoms in a button group
 *
 * Generic toggle/radio group for selecting between multiple view modes or options.
 * Extracted from ViewContainer — now reusable in any context.
 *
 * IDEAL OUTCOME: Click option toggles selection, onChange called with new value
 * FAILURE PREVENTED: Multiple selections or lost state on mode change
 */

import React, { useCallback } from 'react';
import { Button, Icon } from '../atoms';
import { useContextualStyles } from '../../../hooks/useContextualStyles';
import { useAppSettings } from '../../../hooks/useAppSettings';

export interface ViewToggleOption {
  /** Unique value for this option */
  value: string;
  /** Icon name to display */
  icon: string;
  /** Optional label/title */
  label?: string;
}

export interface ViewToggleProps {
  /** Currently selected value */
  value: string;
  /** Called when selection changes */
  onChange: (value: string) => void;
  /** Available options */
  options: ViewToggleOption[];
  /** Additional CSS classes */
  className?: string;
  /** Optional aria-label for the group */
  ariaLabel?: string;
}

/**
 * ViewToggle Molecule
 *
 * @example
 * const [mode, setMode] = useState<'grid' | 'list'>('grid');
 * <ViewToggle
 *   value={mode}
 *   onChange={setMode}
 *   options={[
 *     { value: 'grid', icon: 'grid_view', label: 'Grid' },
 *     { value: 'list', icon: 'list', label: 'List' },
 *     { value: 'map', icon: 'map', label: 'Map' },
 *   ]}
 * />
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({
  value,
  onChange,
  options,
  className = '',
  ariaLabel = 'View toggle',
}) => {
  // Theme via context
  const { settings } = useAppSettings();
  const cx = useContextualStyles(settings.fieldMode);

  const handleClick = useCallback(
    (selectedValue: string) => {
      if (selectedValue !== value) {
        onChange(selectedValue);
      }
    },
    [value, onChange]
  );

  return (
    <div
      className={`flex p-1 rounded-md gap-1 ${cx === undefined ? 'bg-slate-100' : 'bg-slate-800'} ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => handleClick(option.value)}
            title={option.label || option.value}
            aria-pressed={isSelected}
            aria-label={option.label || option.value}
            className={`
              p-2 rounded transition-all flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${
                isSelected
                  ? settings.fieldMode
                    ? 'bg-yellow-400 text-black font-bold shadow-sm'
                    : 'bg-white text-iiif-blue shadow-sm'
                  : settings.fieldMode
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700 focus:ring-yellow-400 focus:ring-offset-slate-900'
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200 focus:ring-blue-600 focus:ring-offset-white'
              }
            `}
            type="button"
          >
            <Icon name={option.icon} className="text-base" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};

export default ViewToggle;
