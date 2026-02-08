/**
 * BehaviorSelector Atom
 *
 * Multi-select checkbox list for IIIF behaviors with conflict detection.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Zero state
 * - No domain logic (conflict detection is passed via props)
 * - Props-only API
 * - Uses design tokens
 *
 * @module features/metadata-edit/ui/atoms/BehaviorSelector
 */

import React from 'react';
import { Icon } from '@/src/shared/ui/atoms';
import { BEHAVIOR_DEFINITIONS } from '@/src/shared/constants/iiif';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface BehaviorSelectorProps {
  /** Available behavior options */
  options: string[];
  /** Currently selected behaviors */
  selected: string[];
  /** Called when selection changes */
  onChange: (selected: string[]) => void;
  /** Function to get conflicts for a behavior */
  getConflicts?: (behavior: string) => string[];
  /** Contextual styles from parent */
  cx?: ContextualClassNames;
  /** Field mode flag */
  fieldMode?: boolean;
  /** Label for the selector */
  label?: string;
  /** Whether to show active behaviors summary */
  showSummary?: boolean;
}

export const BehaviorSelector: React.FC<BehaviorSelectorProps> = ({
  options,
  selected,
  onChange,
  getConflicts,
  fieldMode = false,
  label = 'Behaviors',
  showSummary = true,
}) => {
  const handleToggle = (behavior: string, checked: boolean) => {
    const current = new Set(selected);
    if (checked) {
      current.add(behavior);
      // Auto-remove conflicting behaviors if getConflicts provided
      if (getConflicts) {
        const conflicts = getConflicts(behavior);
        conflicts.forEach((c) => current.delete(c));
      }
    } else {
      current.delete(behavior);
    }
    onChange(Array.from(current));
  };

  const getConflictStatus = (behavior: string) => {
    if (!getConflicts) return { hasConflict: false, conflictingWith: [] };
    const conflicts = getConflicts(behavior);
    const hasConflict = conflicts.some((c) => selected.includes(c));
    const conflictingWith = conflicts.filter((c) => selected.includes(c));
    return { hasConflict, conflictingWith };
  };

  return (
    <div className="space-y-4">
      <div className={`text-xs font-bold mb-2 flex justify-between ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/80'}`}>
        {label}
        <span className={`text-[9px] font-mono px-1 ${fieldMode ? 'bg-nb-yellow/10 text-nb-yellow/60' : 'bg-nb-cream text-nb-black/60'}`}>
          behavior
        </span>
      </div>

      <div className="space-y-1.5">
        {options.map((behavior) => {
          const definition = BEHAVIOR_DEFINITIONS[behavior];
          const isChecked = selected.includes(behavior);
          const { hasConflict, conflictingWith } = getConflictStatus(behavior);

          return (
            <label
              key={behavior}
              className={`flex items-start gap-2 text-xs cursor-pointer p-2.5 border transition-nb ${
                hasConflict && isChecked
                  ? 'border-nb-red/40 bg-nb-red/10'
                  : isChecked
                    ? fieldMode
                      ? 'border-nb-blue bg-nb-blue/30'
                      : 'border-nb-blue/30 bg-nb-blue/10'
                    : fieldMode
                      ? 'border-nb-black hover:bg-nb-black'
                      : 'border-nb-black/10 hover:bg-nb-white'
              }`}
              title={definition?.description || behavior}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleToggle(behavior, e.target.checked)}
                className="text-nb-blue mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold ${
                      hasConflict && isChecked ? 'text-nb-red' : fieldMode ? 'text-nb-yellow/70' : 'text-nb-black/80'
                    }`}
                  >
                    {definition?.label || behavior}
                  </span>
                  {definition?.category && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 uppercase font-bold ${
                        definition.category === 'time'
                          ? 'bg-nb-purple/10 text-nb-purple'
                          : definition.category === 'layout'
                            ? 'bg-nb-orange/20 text-nb-orange'
                            : definition.category === 'browsing'
                              ? 'bg-nb-green/20 text-nb-green'
                              : definition.category === 'page'
                                ? 'bg-nb-blue/20 text-nb-blue'
                                : fieldMode
                                  ? 'bg-nb-yellow/10 text-nb-yellow/60'
                                  : 'bg-nb-cream text-nb-black/60'
                      }`}
                    >
                      {definition.category}
                    </span>
                  )}
                </div>
                {definition?.description && (
                  <p className={`text-[10px] mt-0.5 leading-snug ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/60'}`}>
                    {definition.description}
                  </p>
                )}
                {hasConflict && isChecked && (
                  <p className="text-[10px] text-nb-red mt-1 flex items-center gap-1">
                    <Icon name="warning" className="text-xs" /> Conflicts with: {conflictingWith.join(', ')}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {showSummary && selected.length > 0 && (
        <div className={`mt-3 p-2 border ${fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/10'}`}>
          <div className={`text-[10px] uppercase font-bold mb-1 ${fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/60'}`}>
            Active Behaviors
          </div>
          <div className="flex flex-wrap gap-1">
            {selected.map((b) => (
              <span
                key={b}
                className="text-[10px] bg-nb-blue text-white px-2 py-0.5 font-semibold"
              >
                {BEHAVIOR_DEFINITIONS[b]?.label || b}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BehaviorSelector;