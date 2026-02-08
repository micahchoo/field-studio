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
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

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
  /** Contextual styles from template */
  cx?: ContextualClassNames;
  /** Current field mode */
  fieldMode?: boolean;
}

/**
 * ViewToggle Molecule
 *
 * @example
 * const [mode, setMode] = useState<'grid' |'list'>('grid');
 * <ViewToggle
 *   value={mode}
 *   onChange={setMode}
 *   options={[
 *     { value:'grid', icon:'grid_view', label:'Grid' },
 *     { value:'list', icon:'list', label:'List' },
 *     { value:'map', icon:'map', label:'Map' },
 *   ]}
 * />
 */
export const ViewToggle: React.FC<ViewToggleProps> = ({
  value,
  onChange,
  options,
  className ='',
  ariaLabel ='View toggle',
  cx = {},
  fieldMode = false,
}) => {
  // Context is provided via props (no hook calls)

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
      className={`flex p-1 gap-1 ${cx.subtleBg} ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <Button
            key={option.value}
            onClick={() => handleClick(option.value)}
            title={option.label || option.value}
            aria-pressed={isSelected}
            aria-label={option.label || option.value}
            variant="ghost"
            size="sm"
            className={`
              p-2 transition-nb flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${isSelected
                // TODO(tokens): add cx.selectedChip = bg-nb-yellow text-black / bg-nb-white text-iiif-blue
                ? (fieldMode ?'bg-nb-yellow text-black font-bold shadow-brutal-sm' :'bg-nb-white text-iiif-blue shadow-brutal-sm')
                : cx.iconButton
              }
`}
          >
            <Icon name={option.icon} className="text-base" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
};

export default ViewToggle;
