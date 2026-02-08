/**
 * StartPropertyEditor Atom
 *
 * Editor for the IIIF `start` property on Manifests and Ranges.
 * Dropdown to select start canvas with thumbnail preview.
 * Optional PointSelector for time-based start.
 *
 * @see https://iiif.io/api/presentation/3.0/#start
 * @module features/metadata-edit/ui/atoms/StartPropertyEditor
 */

import React, { useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { FormInput } from '@/src/shared/ui/molecules/FormInput';
import type { IIIFCanvas } from '@/src/shared/types';
import { getIIIFValue } from '@/src/shared/types';

export interface StartValue {
  id: string;
  type: 'Canvas' | 'SpecificResource';
  source?: string;
  selector?: { type: 'PointSelector'; t?: number };
}

export interface StartPropertyEditorProps {
  /** Current start value */
  value?: StartValue;
  /** Available canvases to select from */
  canvases: IIIFCanvas[];
  /** Called when start changes */
  onChange: (start: StartValue | undefined) => void;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Whether editing is disabled */
  disabled?: boolean;
}

export const StartPropertyEditor: React.FC<StartPropertyEditorProps> = ({
  value,
  canvases,
  onChange,
  fieldMode = false,
  disabled = false,
}) => {
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timeValue, setTimeValue] = useState(
    value?.type === 'SpecificResource' && value.selector?.t !== undefined
      ? value.selector.t.toString()
      : ''
  );

  const selectedCanvas = canvases.find(c =>
    c.id === (value?.type === 'Canvas' ? value.id : value?.source)
  );

  const handleCanvasSelect = (canvasId: string) => {
    if (!canvasId) {
      onChange(undefined);
      return;
    }
    onChange({ id: canvasId, type: 'Canvas' });
  };

  const handleTimeSet = () => {
    if (!selectedCanvas || !timeValue.trim()) return;
    const t = parseFloat(timeValue);
    if (isNaN(t)) return;

    onChange({
      id: `${selectedCanvas.id}#t=${t}`,
      type: 'SpecificResource',
      source: selectedCanvas.id,
      selector: { type: 'PointSelector', t },
    });
  };

  const hasTimeSupport = selectedCanvas?.duration && selectedCanvas.duration > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Icon
          name="start"
          className={`text-sm ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}
        />
        <span className={`text-xs font-semibold uppercase tracking-wider ${
          fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
        }`}>
          Start Canvas
        </span>
      </div>

      {/* Canvas dropdown */}
      <div className="flex gap-2">
        <select
          value={value?.type === 'Canvas' ? value.id : value?.source || ''}
          onChange={(e) => handleCanvasSelect(e.target.value)}
          disabled={disabled}
          className={`flex-1 text-sm border px-2 py-1.5 ${
            fieldMode
              ? 'bg-nb-black border-nb-black/60 text-white'
              : 'bg-nb-white border-nb-black/20 text-nb-black/80'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">No start canvas</option>
          {canvases.map((canvas, i) => (
            <option key={canvas.id} value={canvas.id}>
              {i + 1}. {getIIIFValue(canvas.label) || 'Untitled'}
            </option>
          ))}
        </select>

        {value && !disabled && (
          <Button
            variant="ghost"
            size="bare"
            onClick={() => onChange(undefined)}
            icon={<Icon name="close" className="text-sm text-nb-red" />}
            title="Clear start"
            aria-label="Clear start canvas"
          />
        )}
      </div>

      {/* Time offset for AV canvases */}
      {selectedCanvas && hasTimeSupport && !disabled && (
        <div className="pl-2">
          {showTimePicker ? (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <FormInput
                  value={timeValue}
                  onChange={setTimeValue}
                  type="number"
                  label={`Start time (0–${selectedCanvas.duration}s)`}
                  min={0}
                  max={selectedCanvas.duration}
                  step={0.1}
                  fieldMode={fieldMode}
                />
              </div>
              <Button variant="primary" size="sm" onClick={handleTimeSet}>
                Set
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowTimePicker(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTimePicker(true)}
            >
              <Icon name="schedule" className="text-sm mr-1" />
              Set start time
              {value?.type === 'SpecificResource' && value.selector?.t !== undefined && (
                <span className={`ml-1 ${fieldMode ? 'text-nb-yellow' : 'text-nb-blue'}`}>
                  (t={value.selector.t}s)
                </span>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default StartPropertyEditor;
