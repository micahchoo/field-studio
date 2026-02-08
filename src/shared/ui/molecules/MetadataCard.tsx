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
import { MetadataFieldRenderer, formatFieldValue } from './MetadataFieldRenderer';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { IIIFItem } from '@/src/shared/types';
import type { MetadataField } from './metadataTypes';

export type { MetadataField };

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
 *     { id:'label', label:'Title', value:'Photo 1', editable: true, group:'basic' },
 *     { id:'navDate', label:'Date', value:'2024-01-15', type:'date', group:'basic' },
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
    basic: { label:'Basic Information', icon:'info' },
    technical: { label:'Technical Details', icon:'settings' },
    rights: { label:'Rights & Licensing', icon:'shield' },
    relations: { label:'Related Resources', icon:'link' },
  };

  const groupFields = (group: string) => fields.filter(f => f.group === group);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  return (
    <div
      className={`
         overflow-hidden
        ${fieldMode ?'bg-nb-black border border-nb-black' :'bg-nb-white border border-nb-black/20 shadow-brutal'}
`}
    >
      {/* Header with thumbnail and actions */}
      <div className={`p-6 border-b ${fieldMode ?'border-nb-black' :'border-nb-black/10'}`}>
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div
            className={`
              w-24 h-24  overflow-hidden shrink-0
              ${fieldMode ?'bg-nb-black' :'bg-nb-cream'}
              ${hasErrors ?'ring-2 ring-red-500' :''}
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
                <Icon name="image" className={`text-2xl ${fieldMode ?'text-nb-black/60' :'text-nb-black/40'}`} />
              </div>
            )}
          </div>

          {/* Title and type */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className={`text-lg font-semibold truncate ${fieldMode ?'text-white' :'text-nb-black'}`}>
                  {formatFieldValue(fields.find(f => f.id ==='label')?.value) ||'Untitled'}
                </h2>
                <p className={`text-sm mt-1 ${fieldMode ?'text-nb-black/40' :'text-nb-black/50'}`}>
                  {t(item.type)}
                </p>
              </div>

              {/* Edit/Save actions */}
              <div className="flex gap-2">
                {hasErrors && (
                  <span className={`
                    px-2 py-1  text-xs font-medium
                    ${fieldMode ?'bg-nb-red/50 text-nb-red' :'bg-nb-red/20 text-nb-red'}
`}>
                    {errorCount} {errorCount === 1 ?'error' :'errors'}
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
            {fields.find(f => f.id ==='summary')?.value && (
              <p className={`text-sm mt-2 line-clamp-2 ${fieldMode ?'text-nb-black/30' :'text-nb-black/60'}`}>
                {formatFieldValue(fields.find(f => f.id ==='summary')?.value)}
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
                 border overflow-hidden
                ${fieldMode ?'border-nb-black' :'border-nb-black/20'}
`}
            >
              {/* Group header */}
              <Button variant="ghost" size="bare"
                onClick={() => toggleGroup(group)}
                className={`
                  w-full flex items-center justify-between px-4 py-3
                  transition-nb
                  ${fieldMode ?'hover:bg-nb-black' :'hover:bg-nb-white'}
                  ${group ==='basic' ? (fieldMode ?'bg-nb-black/50' :'bg-nb-white') :''}
`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    name={groupInfo.icon}
                    className={`text-sm ${fieldMode ?'text-nb-black/40' :'text-nb-black/50'}`}
                  />
                  <span className={`font-medium ${fieldMode ?'text-white' :'text-nb-black'}`}>
                    {groupInfo.label}
                  </span>
                  <span className={`text-xs ${fieldMode ?'text-nb-black/50' :'text-nb-black/40'}`}>
                    ({groupFs.length} fields)
                  </span>
                </div>
                <Icon
                  name={isExpanded ?'expand_less' :'expand_more'}
                  className={`text-sm ${fieldMode ?'text-nb-black/50' :'text-nb-black/40'}`}
                />
              </Button>

              {/* Group content */}
              {isExpanded && (
                <div className={`
                  p-4 space-y-4
                  ${fieldMode ?'bg-nb-black/30' :'bg-nb-cream'}
`}>
                  {groupFs.map(field => (
                    <MetadataFieldRenderer
                      key={field.id}
                      field={field}
                      isEditing={isEditing}
                      onFieldChange={onFieldChange}
                      fieldMode={fieldMode}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer with item ID (technical detail) */}
      <div className={`
        px-6 py-3 border-t text-xs font-mono
        ${fieldMode ?'border-nb-black text-nb-black/60' :'border-nb-black/10 text-nb-black/40'}
`}>
        ID: {item.id}
      </div>
    </div>
  );
};

export default MetadataCard;
