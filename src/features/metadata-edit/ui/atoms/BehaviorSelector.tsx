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
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

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
      <div className={`text-xs font-bold mb-2 flex justify-between ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`}>
        {label}
        <span className={`text-[9px] font-mono px-1 rounded ${fieldMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
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
              className={`flex items-start gap-2 text-xs cursor-pointer p-2.5 rounded-lg border transition-all ${
                hasConflict && isChecked
                  ? 'border-red-300 bg-red-50'
                  : isChecked
                    ? fieldMode
                      ? 'border-blue-800 bg-blue-900/30'
                      : 'border-blue-200 bg-blue-50'
                    : fieldMode
                      ? 'border-slate-800 hover:bg-slate-900'
                      : 'border-slate-100 hover:bg-slate-50'
              }`}
              title={definition?.description || behavior}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => handleToggle(behavior, e.target.checked)}
                className="rounded text-blue-600 mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold ${
                      hasConflict && isChecked ? 'text-red-700' : fieldMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {definition?.label || behavior}
                  </span>
                  {definition?.category && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                        definition.category === 'time'
                          ? 'bg-purple-100 text-purple-600'
                          : definition.category === 'layout'
                            ? 'bg-amber-100 text-amber-600'
                            : definition.category === 'browsing'
                              ? 'bg-emerald-100 text-emerald-600'
                              : definition.category === 'page'
                                ? 'bg-blue-100 text-blue-600'
                                : fieldMode
                                  ? 'bg-slate-800 text-slate-500'
                                  : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {definition.category}
                    </span>
                  )}
                </div>
                {definition?.description && (
                  <p className={`text-[10px] mt-0.5 leading-snug ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {definition.description}
                  </p>
                )}
                {hasConflict && isChecked && (
                  <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                    <Icon name="warning" className="text-xs" /> Conflicts with: {conflictingWith.join(', ')}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {showSummary && selected.length > 0 && (
        <div className={`mt-3 p-2 rounded border ${fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          <div className={`text-[10px] uppercase font-bold mb-1 ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Active Behaviors
          </div>
          <div className="flex flex-wrap gap-1">
            {selected.map((b) => (
              <span
                key={b}
                className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold"
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