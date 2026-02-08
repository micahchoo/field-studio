/**
 * MetadataFieldRenderer Molecule
 *
 * Renders a single metadata field in either edit or read-only mode.
 * Supports text, textarea, date, url, select, and readonly field types.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - No local state
 * - No domain logic
 * - Props-only API
 * - Uses design tokens
 *
 * @module shared/ui/molecules/MetadataFieldRenderer
 */

import React from 'react';
import { Icon } from '../atoms';
import type { MetadataField } from './metadataTypes';

export interface MetadataFieldRendererProps {
  /** Field definition */
  field: MetadataField;
  /** Whether in edit mode */
  isEditing: boolean;
  /** Callback when field changes */
  onFieldChange?: (fieldId: string, value: string) => void;
  /** Field mode flag for dark theme */
  fieldMode?: boolean;
}

/**
 * Format a field value for display
 */
export const formatFieldValue = (value: string | string[] | null, type?: string): string => {
  if (value === null || value === undefined) return'\u2014';

  if (Array.isArray(value)) {
    return value.join(',') ||'\u2014';
  }

  if (type ==='date' && value) {
    try {
      const date = new Date(value);
      return date.toLocaleDateString(undefined, {
        year:'numeric',
        month:'long',
        day:'numeric',
      });
    } catch {
      return value;
    }
  }

  return value ||'\u2014';
};

export const MetadataFieldRenderer: React.FC<MetadataFieldRendererProps> = ({
  field,
  isEditing,
  onFieldChange,
  fieldMode = false,
}) => {
  const displayValue = formatFieldValue(field.value, field.type);
  const hasError = field.error;

  if (isEditing && field.editable) {
    const inputClass =`
      w-full px-3 py-2  text-sm
      border transition-nb
      ${fieldMode
        ?'bg-nb-black border-nb-black/80 text-white focus:border-nb-blue'
        :'bg-nb-white border-nb-black/20 text-nb-black focus:border-nb-blue'
      }
      ${hasError ?'border-nb-red' :''}
`;

    return (
      <div key={field.id} className="space-y-1">
        <label className={`text-xs font-medium ${fieldMode ?'text-nb-black/40' :'text-nb-black/60'}`}>
          {field.label}
          {field.required && <span className="text-nb-red ml-1">*</span>}
        </label>

        {field.type ==='textarea' ? (
          <textarea
            value={(field.value as string) ||''}
            onChange={(e) => onFieldChange?.(field.id, e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        ) : field.type ==='select' && field.options ? (
          <select
            value={(field.value as string) ||''}
            onChange={(e) => onFieldChange?.(field.id, e.target.value)}
            className={inputClass}
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={field.type ==='date' ?'date' : field.type ==='url' ?'url' :'text'}
            value={(field.value as string) ||''}
            onChange={(e) => onFieldChange?.(field.id, e.target.value)}
            className={inputClass}
            placeholder={`Enter ${field.label.toLowerCase()}`}
          />
        )}

        {hasError && (
          <p className="text-xs text-nb-red flex items-center gap-1">
            <Icon name="error" className="text-xs" />
            {field.error}
          </p>
        )}

        {field.helpText && !hasError && (
          <p className={`text-xs ${fieldMode ?'text-nb-black/50' :'text-nb-black/40'}`}>
            {field.helpText}
          </p>
        )}
      </div>
    );
  }

  // Read-only display
  return (
    <div key={field.id} className="flex flex-col">
      <span className={`text-xs font-medium mb-1 ${fieldMode ?'text-nb-black/50' :'text-nb-black/50'}`}>
        {field.label}
      </span>
      <span className={`text-sm ${fieldMode ?'text-white' :'text-nb-black'}`}>
        {displayValue}
      </span>
    </div>
  );
};

export default MetadataFieldRenderer;
