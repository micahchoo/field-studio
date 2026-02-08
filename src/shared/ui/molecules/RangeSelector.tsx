/**
 * RangeSelector Molecule
 *
 * A date/time range selector for filtering timeline or temporal views.
 * Composes input atoms with range validation.
 *
 * ATOMIC DESIGN:
 * - Composes: Input atom, Button atom
 * - Has local state: start, end inputs
 * - No domain logic (filtering managed by parent)
 *
 * IDEAL OUTCOME: Easy selection of temporal ranges with validation
 * FAILURE PREVENTED: Invalid date ranges, ambiguous date formats
 *
 * @example
 * <RangeSelector
 *   start="2023-01-01"
 *   end="2023-12-31"
 *   onChange={({ start, end }) => setRange({ start, end })}
 *   presets={[
 *     { label:'Last 30 days', start:'2023-11-01', end:'2023-12-01' },
 *     { label:'This year', start:'2023-01-01', end:'2023-12-31' },
 *   ]}
 * />
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../atoms';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface RangePreset {
  label: string;
  start: string;
  end: string;
}

export interface RangeSelectorProps {
  /** Start date (ISO format: YYYY-MM-DD) */
  start: string;
  /** End date (ISO format: YYYY-MM-DD) */
  end: string;
  /** Called when range changes */
  onChange: (range: { start: string; end: string }) => void;
  /** Optional presets for quick selection */
  presets?: RangePreset[];
  /** Minimum allowed date */
  minDate?: string;
  /** Maximum allowed date */
  maxDate?: string;
  /** Show presets dropdown */
  showPresets?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Contextual styles from template (required for theming) */
  cx: ContextualClassNames;
  fieldMode?: boolean;
}

/**
 * RangeSelector Component
 *
 * Date range input with validation and presets.
 */
export const RangeSelector: React.FC<RangeSelectorProps> = ({
  start,
  end,
  onChange,
  presets = [],
  minDate,
  maxDate,
  showPresets = true,
  disabled = false,
  cx,
}) => {

  // Local state for inputs
  const [startInput, setStartInput] = useState(start);
  const [endInput, setEndInput] = useState(end);
  const [showPresetMenu, setShowPresetMenu] = useState(false);

  // Sync with props
  useEffect(() => {
    setStartInput(start);
  }, [start]);

  useEffect(() => {
    setEndInput(end);
  }, [end]);

  // Validation
  const validateRange = useCallback(
    (startVal: string, endVal: string): boolean => {
      if (!startVal || !endVal) return false;

      const startDate = new Date(startVal);
      const endDate = new Date(endVal);

      // Start must be before end
      if (startDate > endDate) return false;

      // Check min/max constraints
      if (minDate && startDate < new Date(minDate)) return false;
      if (maxDate && endDate > new Date(maxDate)) return false;

      return true;
    },
    [minDate, maxDate]
  );

  const isValid = validateRange(startInput, endInput);

  // Apply range
  const handleApply = useCallback(() => {
    if (isValid) {
      onChange({ start: startInput, end: endInput });
    }
  }, [startInput, endInput, isValid, onChange]);

  // Apply preset
  const handlePreset = useCallback(
    (preset: RangePreset) => {
      setStartInput(preset.start);
      setEndInput(preset.end);
      onChange({ start: preset.start, end: preset.end });
      setShowPresetMenu(false);
    },
    [onChange]
  );

  // Clear range
  const handleClear = useCallback(() => {
    setStartInput('');
    setEndInput('');
    onChange({ start:'', end:'' });
  }, [onChange]);

  return (
    <div className="space-y-3">
      {/* Date inputs */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className={`block text-xs ${cx.textMuted} mb-1`}>Start</label>
          <input
            type="date"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            min={minDate}
            max={maxDate}
            disabled={disabled}
            className={`
              w-full px-3 py-2 border text-sm
              ${cx.input} ${cx.border}
              focus:ring-2 focus:ring-inset focus:${cx.accent}
              ${disabled ?'opacity-50 cursor-not-allowed' :''}
`}
          />
        </div>

        <span className={`${cx.textMuted} pt-5`}>to</span>

        <div className="flex-1">
          <label className={`block text-xs ${cx.textMuted} mb-1`}>End</label>
          <input
            type="date"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            min={minDate || startInput}
            max={maxDate}
            disabled={disabled}
            className={`
              w-full px-3 py-2 border text-sm
              ${cx.input} ${cx.border}
              focus:ring-2 focus:ring-inset focus:${cx.accent}
              ${disabled ?'opacity-50 cursor-not-allowed' :''}
`}
          />
        </div>
      </div>

      {/* Validation message */}
      {!isValid && startInput && endInput && (
        <p className="text-xs text-nb-red">
          Invalid range: Start date must be before end date
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
          disabled={disabled || !isValid}
        >
          Apply
        </Button>

        {(start || end) && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
          >
            Clear
          </Button>
        )}

        {/* Presets dropdown */}
        {showPresets && presets.length > 0 && (
          <div className="relative ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPresetMenu(!showPresetMenu)}
              disabled={disabled}
            >
              Presets
              <span className="material-icons text-sm ml-1">
                {showPresetMenu ?'expand_less' :'expand_more'}
              </span>
            </Button>

            {showPresetMenu && (
              <div
                className={`
                  absolute right-0 top-full mt-1 w-48
                   shadow-brutal border ${cx.border} ${cx.surface}
                  z-50 overflow-hidden
`}
              >
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    onClick={() => handlePreset(preset)}
                    variant="ghost"
                    size="sm"
                    className={`
                      w-full px-3 py-2 text-left text-sm
                      hover:${cx.headerBg} ${cx.text}
                      justify-start
`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RangeSelector;
