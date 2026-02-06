/**
 * MetadataCard Molecule
 *
 * Composes: Image preview + metadata fields + actions
 *
 * Card-based metadata display that replaces the spreadsheet view.
 * Shows ONE item at a time with clear visual hierarchy.
 *
 * COMMUNICATIVE DESIGN:
 * - Progressive disclosure: Basic info always visible, technical details collapsed
 * - Visual grouping of related fields
 * - Clear distinction between editable and read-only data
 * - Human-readable dates and values
 *
 * IDEAL OUTCOME: Users understand and can edit metadata without IIIF knowledge
 * FAILURE PREVENTED: Spreadsheet overwhelm, technical jargon confusion
 */

import React, { useState } from 'react';
import { Button, Icon } from '../atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import type { IIIFItem } from '@/types';

export interface MetadataField {
  /** Field identifier */
  id: string;
  /** Human-readable label */
  label: string;
  /** Current value */
  value: string | string[] | null;
  /** Whether field is editable */
  editable?: boolean;
  /** Field type for appropriate input */
  type?: 'text' | 'textarea' | 'date' | 'url' | 'select' | 'readonly';
  /** Options for select type */
  options?: { value: string; label: string }[];
  /** Help text/tooltip */
  helpText?: string;
  /** Group/category */
  group?: 'basic' | 'technical' | 'rights' | 'relations';
  /** Whether field is required */
  required?: boolean;
  /** Validation error message */
  error?: string | null;
}

export interface MetadataCardProps {
  /** Item being displayed */
  item: IIIFItem;
  /** Fields to display */
  fields: MetadataField[];
  /** Thumbnail URL */
  thumbnailUrl?: string | null;
  /** Whether in edit mode */
  isEditing?: boolean;
  /** Callback when field changes */
  onFieldChange?: (fieldId: string, value: string) => void;
  /** Callback to save changes */
  onSave?: () => void;
  /** Callback to cancel editing */
  onCancel?: () => void;
  /** Callback to enter edit mode */
  onEdit?: () => void;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Terminology function */
  t: (key: string) => string;
  /** Current field mode */
  fieldMode?: boolean;
  /** Whether item has validation errors */
  hasErrors?: boolean;
  /** Error count */
  errorCount?: number;
}

/**
 * MetadataCard Molecule
 *
 * @example
 * <MetadataCard
 *   item={canvas}
 *   fields={[
 *     { id: 'label', label: 'Title', value: 'Photo 1', editable: true, group: 'basic' },
 *     { id: 'navDate', label: 'Date', value: '2024-01-15', type: 'date', group: 'basic' },
 *   ]}
 *   thumbnailUrl="/thumb.jpg"
 *   cx={cx}
 *   t={t}
 *   onFieldChange={handleChange}
 * />
 */
export const MetadataCard: React.FC<MetadataCardProps> = ({
  item,
  fields,
  thumbnailUrl,
  isEditing = false,
  onFieldChange,
  onSave,
  onCancel,
  onEdit,
  cx,
  t,
  fieldMode = false,
  hasErrors = false,
  errorCount = 0,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    basic: true,
    technical: false,
    rights: false,
    relations: false,
  });

  const groupLabels: Record<string, { label: string; icon: string }> = {
    basic: { label: 'Basic Information', icon: 'info' },
    technical: { label: 'Technical Details', icon: 'settings' },
    rights: { label: 'Rights & Licensing', icon: 'shield' },
    relations: { label: 'Related Resources', icon: 'link' },
  };

  const groupFields = (group: string) => fields.filter(f => f.group === group);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const formatValue = (value: string | string[] | null, type?: string): string => {
    if (value === null || value === undefined) return '—';
    
    if (Array.isArray(value)) {
      return value.join(', ') || '—';
    }

    // Format dates
    if (type === 'date' && value) {
      try {
        const date = new Date(value);
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return value;
      }
    }

    return value || '—';
  };

  const renderField = (field: MetadataField) => {
    const displayValue = formatValue(field.value, field.type);
    const hasError = field.error;

    if (isEditing && field.editable) {
      return (
        <div key={field.id} className="space-y-1">
          <label className={`text-xs font-medium ${fieldMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.type === 'textarea' ? (
            <textarea
              value={(field.value as string) || ''}
              onChange={(e) => onFieldChange?.(field.id, e.target.value)}
              rows={3}
              className={`
                w-full px-3 py-2 rounded-lg text-sm
                border transition-colors resize-none
                ${fieldMode
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }
                ${hasError ? 'border-red-500' : ''}
              `}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          ) : field.type === 'select' && field.options ? (
            <select
              value={(field.value as string) || ''}
              onChange={(e) => onFieldChange?.(field.id, e.target.value)}
              className={`
                w-full px-3 py-2 rounded-lg text-sm
                border transition-colors
                ${fieldMode
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }
                ${hasError ? 'border-red-500' : ''}
              `}
            >
              <option value="">Select {field.label.toLowerCase()}</option>
              {field.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'}
              value={(field.value as string) || ''}
              onChange={(e) => onFieldChange?.(field.id, e.target.value)}
              className={`
                w-full px-3 py-2 rounded-lg text-sm
                border transition-colors
                ${fieldMode
                  ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                }
                ${hasError ? 'border-red-500' : ''}
              `}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          )}
          
          {hasError && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <Icon name="error" className="text-xs" />
              {field.error}
            </p>
          )}
          
          {field.helpText && !hasError && (
            <p className={`text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {field.helpText}
            </p>
          )}
        </div>
      );
    }

    // Read-only display
    return (
      <div key={field.id} className="flex flex-col">
        <span className={`text-xs font-medium mb-1 ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>
          {field.label}
        </span>
        <span className={`text-sm ${fieldMode ? 'text-white' : 'text-slate-900'}`}>
          {displayValue}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`
        rounded-2xl overflow-hidden
        ${fieldMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200 shadow-lg'}
      `}
    >
      {/* Header with thumbnail and actions */}
      <div className={`p-6 border-b ${fieldMode ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div
            className={`
              w-24 h-24 rounded-xl overflow-hidden shrink-0
              ${fieldMode ? 'bg-slate-800' : 'bg-slate-100'}
              ${hasErrors ? 'ring-2 ring-red-500' : ''}
            `}
          >
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name="image" className={`text-2xl ${fieldMode ? 'text-slate-600' : 'text-slate-400'}`} />
              </div>
            )}
          </div>

          {/* Title and type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className={`text-lg font-semibold truncate ${fieldMode ? 'text-white' : 'text-slate-900'}`}>
                  {formatValue(fields.find(f => f.id === 'label')?.value) || 'Untitled'}
                </h2>
                <p className={`text-sm mt-1 ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t(item.type)}
                </p>
              </div>

              {/* Edit/Save actions */}
              <div className="flex gap-2">
                {hasErrors && (
                  <span className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${fieldMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700'}
                  `}>
                    {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                  </span>
                )}
                
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onCancel}
                      icon={<Icon name="close" className="text-sm" />}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onSave}
                      icon={<Icon name="check" className="text-sm" />}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onEdit}
                    icon={<Icon name="edit" className="text-sm" />}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </div>

            {/* Summary/description */}
            {fields.find(f => f.id === 'summary')?.value && (
              <p className={`text-sm mt-2 line-clamp-2 ${fieldMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {formatValue(fields.find(f => f.id === 'summary')?.value)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Grouped fields */}
      <div className="p-6 space-y-4">
        {Object.keys(groupLabels).map(group => {
          const groupFs = groupFields(group);
          if (groupFs.length === 0) return null;

          const isExpanded = expandedGroups[group];
          const groupInfo = groupLabels[group];

          return (
            <div
              key={group}
              className={`
                rounded-xl border overflow-hidden
                ${fieldMode ? 'border-slate-800' : 'border-slate-200'}
              `}
            >
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group)}
                className={`
                  w-full flex items-center justify-between px-4 py-3
                  transition-colors
                  ${fieldMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}
                  ${group === 'basic' ? (fieldMode ? 'bg-slate-800/50' : 'bg-slate-50') : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={groupInfo.icon}
                    className={`text-sm ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}
                  />
                  <span className={`font-medium ${fieldMode ? 'text-white' : 'text-slate-900'}`}>
                    {groupInfo.label}
                  </span>
                  <span className={`text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    ({groupFs.length} fields)
                  </span>
                </div>
                <Icon
                  name={isExpanded ? 'expand_less' : 'expand_more'}
                  className={`text-sm ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}
                />
              </button>

              {/* Group content */}
              {isExpanded && (
                <div className={`
                  p-4 space-y-4
                  ${fieldMode ? 'bg-slate-900/30' : 'bg-slate-50/50'}
                `}>
                  {groupFs.map(renderField)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer with item ID (technical detail) */}
      <div className={`
        px-6 py-3 border-t text-xs font-mono
        ${fieldMode ? 'border-slate-800 text-slate-600' : 'border-slate-100 text-slate-400'}
      `}>
        ID: {item.id}
      </div>
    </div>
  );
};

export default MetadataCard;
