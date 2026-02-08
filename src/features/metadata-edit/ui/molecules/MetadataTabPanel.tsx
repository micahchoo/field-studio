/**
 * MetadataTabPanel Molecule - Card-Based Redesign
 *
 * Complete redesign following the critique:
 * - Card-based layout instead of cramped spreadsheet
 * - Clear visual hierarchy with grouped sections
 * - Human-readable dates with date pickers
 * - Separate read-only technical fields
 * - Edit affordances with hover states and icons
 *
 * BOLD AESTHETIC:
 * - Warm stone palette with amber accents
 * - Generous whitespace and clear grouping
 * - Refined typography with visual hierarchy
 * - Subtle shadows and corners
 */

import React, { useState } from 'react';
import { getIIIFValue, type IIIFItem } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { LocationPicker } from '../atoms/LocationPicker';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

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

// Format ISO date to human-readable
function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

// Parse human-readable date back to ISO
function parseDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toISOString();
  } catch {
    return dateString;
  }
}

interface FormSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  collapsed?: boolean;
  onToggle?: () => void;
  fieldMode?: boolean;
}

const FormSection: React.FC<FormSectionProps> = ({ title, icon, children, collapsed = false, onToggle, fieldMode }) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const collapsedState = onToggle ? collapsed : isCollapsed;
  const toggle = onToggle || (() => setIsCollapsed(!isCollapsed));

  return (
    <div className={` border ${fieldMode ? 'bg-nb-black/50 border-nb-black' : 'bg-nb-white border-nb-black/10'} overflow-hidden`}>
      <Button variant="ghost" size="bare"
        onClick={toggle}
        className={`w-full px-4 py-3 flex items-center justify-between ${fieldMode ? 'hover:bg-nb-black' : 'hover:bg-nb-cream'} transition-nb`}
      >
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 flex items-center justify-center ${fieldMode ? 'bg-nb-black text-nb-black/40' : 'bg-nb-cream text-nb-black/60'}`}>
            <Icon name={icon} className="text-sm" />
          </span>
          <span className={`font-medium ${fieldMode ? 'text-nb-black/10' : 'text-nb-black'}`}>{title}</span>
        </div>
        <svg
          className={`w-5 h-5 ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'} transition-transform ${collapsedState ? '-rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>
      {!collapsedState && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
};

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'date';
  fieldMode?: boolean;
  readOnly?: boolean;
  hint?: string;
}

const TextField: React.FC<TextFieldProps> = ({ label, value, onChange, placeholder, type = 'text', fieldMode, readOnly, hint }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const baseClass = `
    w-full px-3 py-2.5  border text-sm transition-nb
    ${readOnly
      ? `${fieldMode ? 'bg-nb-black/50 text-nb-black/50 border-transparent' : 'bg-nb-cream text-nb-black/50 border-transparent'}`
      : `${fieldMode
          ? 'bg-nb-black text-nb-black/10 border-nb-black/70 focus:border-nb-orange focus:ring-2 focus:ring-nb-orange/20'
          : 'bg-nb-white text-nb-black border-nb-black/20 focus:border-nb-orange focus:ring-2 focus:ring-nb-orange/20'
        }`
    }
  `;

  return (
    <div
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between mb-1.5">
        <label className={`text-sm font-medium ${fieldMode ? 'text-nb-black/20' : 'text-nb-black/70'}`}>
          {label}
        </label>
        {readOnly && (
          <span className={`text-xs px-2 py-0.5 ${fieldMode ? 'bg-nb-black text-nb-black/50' : 'bg-nb-cream text-nb-black/50'}`}>
            Read-only
          </span>
        )}
        {!readOnly && (isHovered || isFocused) && (
          <span className="text-xs text-nb-orange opacity-0 group-hover:opacity-100 transition-nb">
            <Icon name="edit" className="text-xs inline mr-1" />
            Click to edit
          </span>
        )}
      </div>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`${baseClass} resize-none min-h-[100px]`}
          rows={4}
        />
      ) : type === 'date' ? (
        <div className="relative">
          <input
            type="text"
            value={formatDate(value)}
            onChange={(e) => onChange(parseDate(e.target.value))}
            placeholder="Select date..."
            readOnly={readOnly}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={`${baseClass} pr-10`}
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon name="calendar_today" className={`text-sm ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`} />
          </div>
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={baseClass}
        />
      )}
      {hint && <p className={`mt-1 text-xs ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/50'}`}>{hint}</p>}
    </div>
  );
};

export const MetadataTabPanel: React.FC<MetadataTabPanelProps> = ({
  resource,
  label,
  summary,
  language,
  fieldMode,
  onUpdateResource,
  getDCHint,
  isLocationField,
  onShowLocationPicker,
}) => {
  // Group metadata fields by category
  const basicFields = ['title', 'label', 'description', 'summary', 'subject', 'creator', 'contributor'];
  const dateFields = ['date', 'navDate', 'created', 'issued', 'modified'];
  const rightsFields = ['rights', 'license', 'attribution', 'requiredStatement', 'provider'];
  const locationFields = ['location', 'coverage', 'spatial', 'navPlace'];

  const metadata = resource.metadata || [];
  
  const basicMetadata = metadata.filter((_, idx) => {
    const lbl = getIIIFValue(metadata[idx].label, language)?.toLowerCase() || '';
    return basicFields.some(f => lbl.includes(f));
  });
  
  const dateMetadata = metadata.filter((_, idx) => {
    const lbl = getIIIFValue(metadata[idx].label, language)?.toLowerCase() || '';
    return dateFields.some(f => lbl.includes(f));
  });
  
  const rightsMetadata = metadata.filter((_, idx) => {
    const lbl = getIIIFValue(metadata[idx].label, language)?.toLowerCase() || '';
    return rightsFields.some(f => lbl.includes(f));
  });
  
  const otherMetadata = metadata.filter((_, idx) => {
    const lbl = getIIIFValue(metadata[idx].label, language)?.toLowerCase() || '';
    return ![...basicFields, ...dateFields, ...rightsFields].some(f => lbl.includes(f));
  });

  return (
    <div className="space-y-4">
      {/* Basic Information */}
      <FormSection title="Basic Information" icon="info" fieldMode={fieldMode}>
        <TextField
          label="Title"
          value={label}
          onChange={(val) => onUpdateResource({ label: { [language]: [val] } })}
          placeholder="Enter a descriptive title"
          fieldMode={fieldMode}
          hint="The main name or title of this item"
        />
        <TextField
          label="Description"
          value={summary}
          onChange={(val) => onUpdateResource({ summary: { [language]: [val] } })}
          placeholder="Add a brief description..."
          type="textarea"
          fieldMode={fieldMode}
          hint="A short summary of what this item contains"
        />
        
        {/* Additional basic metadata */}
        {basicMetadata.map((md, idx) => {
          const lbl = getIIIFValue(md.label, language);
          const val = getIIIFValue(md.value, language);
          const actualIdx = metadata.indexOf(md);
          
          return (
            <TextField
              key={actualIdx}
              label={lbl.charAt(0).toUpperCase() + lbl.slice(1)}
              value={val}
              onChange={(newVal) => {
                const newMeta = [...metadata];
                newMeta[actualIdx].value = { [language]: [newVal] };
                onUpdateResource({ metadata: newMeta });
              }}
              placeholder={`Enter ${lbl}...`}
              fieldMode={fieldMode}
              hint={getDCHint(lbl) || undefined}
            />
          );
        })}
      </FormSection>

      {/* Date Information */}
      {(dateMetadata.length > 0 || resource.navDate) && (
        <FormSection title="Date & Time" icon="schedule" fieldMode={fieldMode}>
          {resource.navDate && (
            <TextField
              label="Navigation Date"
              value={resource.navDate}
              onChange={(val) => onUpdateResource({ navDate: val })}
              type="date"
              fieldMode={fieldMode}
              hint="Used for timeline and chronological ordering"
            />
          )}
          {dateMetadata.map((md, idx) => {
            const lbl = getIIIFValue(md.label, language);
            const val = getIIIFValue(md.value, language);
            const actualIdx = metadata.indexOf(md);
            
            return (
              <TextField
                key={actualIdx}
                label={lbl.charAt(0).toUpperCase() + lbl.slice(1)}
                value={val}
                onChange={(newVal) => {
                  const newMeta = [...metadata];
                  newMeta[actualIdx].value = { [language]: [newVal] };
                  onUpdateResource({ metadata: newMeta });
                }}
                type="date"
                fieldMode={fieldMode}
              />
            );
          })}
        </FormSection>
      )}

      {/* Location */}
      {metadata.some((_, idx) => isLocationField(getIIIFValue(metadata[idx].label, language) || '')) && (
        <FormSection title="Location" icon="place" fieldMode={fieldMode}>
          {metadata.map((md, idx) => {
            const lbl = getIIIFValue(md.label, language);
            if (!isLocationField(lbl)) return null;
            const val = getIIIFValue(md.value, language);
            
            return (
              <div key={idx} className="flex gap-2">
                <div className="flex-1">
                  <TextField
                    label={lbl.charAt(0).toUpperCase() + lbl.slice(1)}
                    value={val}
                    onChange={(newVal) => {
                      const newMeta = [...metadata];
                      newMeta[idx].value = { [language]: [newVal] };
                      onUpdateResource({ metadata: newMeta });
                    }}
                    placeholder="Enter coordinates or location..."
                    fieldMode={fieldMode}
                  />
                </div>
                <div className="pt-7">
                  <LocationPicker
                    onClick={() => onShowLocationPicker({ index: idx, value: val })}
                    fieldMode={fieldMode}
                  />
                </div>
              </div>
            );
          })}
        </FormSection>
      )}

      {/* Rights & Licensing */}
      {(rightsMetadata.length > 0 || resource.requiredStatement || resource.rights) && (
        <FormSection title="Rights & Licensing" icon="shield" fieldMode={fieldMode}>
          {resource.requiredStatement && (
            <TextField
              label="Attribution"
              value={getIIIFValue(resource.requiredStatement.value, language)}
              onChange={(val) => onUpdateResource({ requiredStatement: { label: resource.requiredStatement!.label, value: { [language]: [val] } } })}
              placeholder="e.g., © 2024 Example Institution"
              fieldMode={fieldMode}
              hint="How this item should be credited"
            />
          )}
          {resource.rights && (
            <TextField
              label="Rights Statement"
              value={resource.rights}
              onChange={(val) => onUpdateResource({ rights: val })}
              placeholder="e.g., https://creativecommons.org/licenses/by/4.0/"
              fieldMode={fieldMode}
              hint="URL to license or rights statement"
            />
          )}
          {rightsMetadata.map((md, idx) => {
            const lbl = getIIIFValue(md.label, language);
            const val = getIIIFValue(md.value, language);
            const actualIdx = metadata.indexOf(md);
            
            return (
              <TextField
                key={actualIdx}
                label={lbl.charAt(0).toUpperCase() + lbl.slice(1)}
                value={val}
                onChange={(newVal) => {
                  const newMeta = [...metadata];
                  newMeta[actualIdx].value = { [language]: [newVal] };
                  onUpdateResource({ metadata: newMeta });
                }}
                fieldMode={fieldMode}
              />
            );
          })}
        </FormSection>
      )}

      {/* Additional Metadata */}
      {otherMetadata.length > 0 && (
        <FormSection title="Additional Metadata" icon="more_horiz" collapsed fieldMode={fieldMode}>
          <div className="space-y-3">
            {otherMetadata.map((md, idx) => {
              const lbl = getIIIFValue(md.label, language);
              const val = getIIIFValue(md.value, language);
              const actualIdx = metadata.indexOf(md);
              const dc = getDCHint(lbl);
              
              return (
                <div
                  key={actualIdx}
                  className={`p-3 border group transition-nb ${
                    fieldMode
                      ? 'bg-nb-black/50 border-nb-black/70 hover:border-nb-black/60'
                      : 'bg-nb-cream border-nb-black/10 hover:border-nb-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={lbl}
                      onChange={(e) => {
                        const newMeta = [...metadata];
                        newMeta[actualIdx].label = { [language]: [e.target.value] };
                        onUpdateResource({ metadata: newMeta });
                      }}
                      className={`text-sm font-medium bg-transparent border-b border-transparent hover:border-nb-black/40 focus:border-nb-orange focus:outline-none flex-1 ${
                        fieldMode ? 'text-nb-black/20' : 'text-nb-black/70'
                      }`}
                      placeholder="Field name"
                    />
                    {dc && (
                      <span className={`text-[10px] px-1.5 py-0.5 ${fieldMode ? 'bg-nb-black/70 text-nb-black/40' : 'bg-nb-black/10 text-nb-black/60'}`}>
                        {dc}
                      </span>
                    )}
                    <Button variant="ghost" size="bare"
                      onClick={() => {
                        const newMeta = metadata.filter((_, i) => i !== actualIdx);
                        onUpdateResource({ metadata: newMeta });
                      }}
                      className={`opacity-0 group-hover:opacity-100 transition-nb p-1 hover:bg-nb-red/20 hover:text-nb-red ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}
                      title="Remove field"
                    >
                      <Icon name="close" className="text-xs" />
                    </Button>
                  </div>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => {
                      const newMeta = [...metadata];
                      newMeta[actualIdx].value = { [language]: [e.target.value] };
                      onUpdateResource({ metadata: newMeta });
                    }}
                    className={`w-full text-sm bg-transparent border-b border-transparent hover:border-nb-black/20 focus:border-nb-orange focus:outline-none ${
                      fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'
                    }`}
                    placeholder="Enter value..."
                  />
                </div>
              );
            })}
          </div>
        </FormSection>
      )}

      {/* Add Custom Field Button */}
      <Button variant="ghost" size="bare"
        onClick={() => {
          onUpdateResource({
            metadata: [
              ...metadata,
              { label: { [language]: ['Custom Field'] }, value: { [language]: [''] } },
            ],
          });
        }}
        className={`w-full py-3 border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium transition-nb ${
          fieldMode
            ? 'border-nb-black/70 text-nb-black/50 hover:border-nb-black/60 hover:text-nb-black/40 hover:bg-nb-black/50'
            : 'border-nb-black/20 text-nb-black/50 hover:border-nb-black/40 hover:text-nb-black/60 hover:bg-nb-cream'
        }`}
      >
        <Icon name="add" className="text-sm" />
        Add Custom Field
      </Button>
    </div>
  );
};

export default MetadataTabPanel;