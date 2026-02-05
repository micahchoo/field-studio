/**
 * MetadataTabPanel Molecule
 *
 * Panel for editing metadata fields (label, summary, descriptive metadata).
 * Composes PropertyInput, PropertyLabel, LocationPicker atoms.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Manages metadata array state (passed via props)
 * - No domain logic (delegates to parent callbacks)
 * - Props-only API
 * - Uses feature-specific atoms and primitives
 * - No native HTML elements
 *
 * @module features/metadata-edit/ui/molecules/MetadataTabPanel
 */

import React from 'react';
import { getIIIFValue, type IIIFItem } from '@/types';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
import { PropertyInput } from '../atoms/PropertyInput';
import { PropertyLabel } from '../atoms/PropertyLabel';
import { LocationPicker } from '../atoms/LocationPicker';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface MetadataTabPanelProps {
  /** Resource being edited */
  resource: IIIFItem;
  /** Current label value (single language) */
  label: string;
  /** Current summary value (single language) */
  summary: string;
  /** Current language for metadata values */
  language: string;
  /** Contextual styles from parent */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
  /** Called when resource is updated */
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  /** Get Dublin Core hint for a label */
  getDCHint: (lbl: string) => string | null;
  /** Determine if a field is a location field */
  isLocationField: (lbl: string) => boolean;
  /** Show location picker modal */
  onShowLocationPicker: (picker: { index: number; value: string } | null) => void;
}

export const MetadataTabPanel: React.FC<MetadataTabPanelProps> = ({
  resource,
  label,
  summary,
  language,
  cx,
  fieldMode,
  onUpdateResource,
  getDCHint,
  isLocationField,
  onShowLocationPicker,
}) => {
  const inputClass = `w-full text-sm p-2.5 border rounded bg-white text-slate-900 focus:ring-2 focus:ring-${
    cx.accent
  } focus:border-${cx.accent} outline-none transition-all`;

  return (
    <>
      {/* Resource Type */}
      <div className="flex justify-between items-center">
        <span className={`text-[10px] font-bold uppercase ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
          Type
        </span>
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded ${
            fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {resource.type}
        </span>
      </div>

      {/* Label */}
      <div>
        <PropertyLabel
          label="Label"
          dcHint="dc:title"
          fieldMode={fieldMode}
          cx={cx}
        />
        <PropertyInput
          type="text"
          value={label}
          onChange={(val) => onUpdateResource({ label: { [language]: [val] } })}
          cx={cx}
          fieldMode={fieldMode}
          className={inputClass}
        />
      </div>

      {/* Summary */}
      <div>
        <PropertyLabel
          label="Summary"
          fieldMode={fieldMode}
          cx={cx}
        />
        <PropertyInput
          type="textarea"
          value={summary}
          onChange={(val) => onUpdateResource({ summary: { [language]: [val] } })}
          cx={cx}
          fieldMode={fieldMode}
          className={`${inputClass} resize-none`}
          rows={5}
        />
      </div>

      {/* Descriptive Metadata */}
      <div>
        <PropertyLabel
          label="Descriptive Metadata"
          fieldMode={fieldMode}
          cx={cx}
        />
        <div className="space-y-3">
          {(resource.metadata || []).map((md, idx) => {
            const lbl = getIIIFValue(md.label, language);
            const val = getIIIFValue(md.value, language);
            const dc = getDCHint(lbl);
            const isLoc = isLocationField(lbl);

            return (
              <div
                key={idx}
                className={`p-2 rounded border group transition-colors ${
                  fieldMode
                    ? 'bg-slate-900 border-slate-700 hover:border-slate-600'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Label row with DC hint and delete button */}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <PropertyInput
                      type="text"
                      value={lbl}
                      onChange={(newLabel) => {
                        const newMeta = [...(resource.metadata || [])];
                        newMeta[idx].label = { [language]: [newLabel] };
                        onUpdateResource({ metadata: newMeta });
                      }}
                      cx={cx}
                      fieldMode={fieldMode}
                      className="text-xs font-bold bg-transparent border-b border-transparent focus:border-blue-300 outline-none w-24"
                    />
                    {dc && (
                      <span
                        className="text-[8px] font-mono text-white bg-slate-400 px-1 rounded opacity-70"
                        title="Dublin Core Mapping"
                      >
                        {dc}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      const newMeta = resource.metadata?.filter((_, i) => i !== idx);
                      onUpdateResource({ metadata: newMeta });
                    }}
                    variant="ghost"
                    size="sm"
                    icon={<Icon name="close" className="text-xs" />}
                    aria-label="Remove metadata field"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>

                {/* Value row with location picker */}
                <div className="flex gap-1">
                  <PropertyInput
                    type="text"
                    value={val}
                    onChange={(newVal) => {
                      const newMeta = [...(resource.metadata || [])];
                      newMeta[idx].value = { [language]: [newVal] };
                      onUpdateResource({ metadata: newMeta });
                    }}
                    cx={cx}
                    fieldMode={fieldMode}
                    className="w-full text-xs rounded px-2 py-1 border focus:border-blue-400 outline-none"
                  />
                  {isLoc && (
                    <LocationPicker
                      onClick={() => onShowLocationPicker({ index: idx, value: val })}
                      cx={cx}
                      fieldMode={fieldMode}
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Add Field button */}
          <div
            onClick={() => {
              onUpdateResource({
                metadata: [
                  ...(resource.metadata || []),
                  { label: { [language]: ['New Field'] }, value: { [language]: [''] } },
                ],
              });
            }}
            className={`w-full py-2 border border-dashed rounded text-xs flex items-center justify-center gap-1 transition-colors ${
              fieldMode
                ? 'border-slate-700 text-slate-500 hover:bg-slate-900'
                : 'border-slate-300 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Icon name="add" className="text-sm" /> Add Field
          </div>
        </div>
      </div>
    </>
  );
};

export default MetadataTabPanel;