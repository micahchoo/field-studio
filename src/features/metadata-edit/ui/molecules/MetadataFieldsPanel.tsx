/**
 * MetadataFieldsPanel Molecule
 *
 * Extracted from Inspector.tsx - contains the full metadata tab content
 * organized into collapsible FormSections:
 * - Identity (always open): preview image, label, summary
 * - Custom Metadata (open): add dropdown, metadata field list, location picker
 * - Rights & Technical (collapsed): rights, behaviors, navDate, viewingDirection, requiredStatement
 * - Location (collapsed, conditional): GeoEditor
 *
 * @module features/metadata-edit/ui/molecules/MetadataFieldsPanel
 */

import React, { useEffect, useRef, useState } from 'react';
import { getIIIFValue, type IIIFItem, type IIIFManifest, isManifest } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { FormSection } from '@/src/shared/ui/molecules/FormSection';
import { SelectField } from '@/src/shared/ui/molecules/SelectField';
import { ValidatedInput } from '../atoms/ValidatedInput';
import { DebouncedField } from '../atoms/DebouncedField';
import { RightsSelector } from '../atoms/RightsSelector';
import { BehaviorSelector } from '../atoms/BehaviorSelector';
import { PropertyInput } from '../atoms/PropertyInput';
import { PropertyLabel } from '../atoms/PropertyLabel';
import { ViewingDirectionSelector } from '../atoms/ViewingDirectionSelector';
import { LocationPickerModal } from './LocationPickerModal';
import { GeoEditor } from './GeoEditor';
import { BEHAVIOR_OPTIONS, getConflictingBehaviors, SUPPORTED_LANGUAGES } from '@/src/shared/constants/iiif';
import { isPropertyAllowed } from '@/utils/iiifSchema';
import { suggestBehaviors } from '@/utils/iiifBehaviors';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import type { ValidationIssue } from '../../model/useInspectorValidation';

/** Map SUPPORTED_LANGUAGES to SelectField options format */
const LANGUAGE_SELECT_OPTIONS = SUPPORTED_LANGUAGES.map(l => ({
  value: l.code,
  label: l.nativeName ? `${l.label} (${l.nativeName})` : l.label,
}));

/** Detect appropriate input type for a metadata key */
function getMetadataInputType(key: string): 'date' | 'location' | 'language' | 'url' | 'rights' | 'text' {
  const k = key.toLowerCase().trim();
  if (['date', 'created', 'modified', 'issued', 'navdate'].includes(k)) return 'date';
  if (['location', 'gps', 'place', 'coverage', 'coordinates'].includes(k)) return 'location';
  if (['language', 'lang'].includes(k)) return 'language';
  if (['url', 'uri', 'link', 'homepage', 'source', 'identifier'].includes(k) || k.startsWith('http')) return 'url';
  if (['rights', 'license'].includes(k)) return 'rights';
  return 'text';
}

export interface FieldValidation {
  status: 'pristine' | 'invalid';
  message?: string;
  fix?: () => void;
}

export interface MetadataFieldsPanelProps {
  resource: IIIFItem;
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  language: string;
  fieldMode: boolean;
  cx: ContextualClassNames;
  /** Pre-computed label string */
  label: string;
  /** Pre-computed summary string */
  summary: string;
  /** Preview image URL */
  imageUrl: string | null;
  /** Validation issues list */
  validationIssues: ValidationIssue[];
  /** Fix a single validation issue by ID */
  fixIssue: (id: string) => Partial<IIIFItem> | null;
  /** Fix all auto-fixable issues */
  fixAll: () => Partial<IIIFItem> | null;
  /** Label validation state */
  labelValidation: FieldValidation;
  /** Summary validation state */
  summaryValidation: FieldValidation;
  /** Field validation getter */
  getFieldValidation: (fieldName: string) => FieldValidation;
  /** Metadata CRUD helpers */
  updateField: (index: number, key: string, value: string) => void;
  addField: (property: string) => void;
  removeField: (index: number) => void;
  availableProperties: string[];
  /** Terminology function */
  t: (key: string) => string;
}

export const MetadataFieldsPanel: React.FC<MetadataFieldsPanelProps> = ({
  resource,
  onUpdateResource,
  language,
  fieldMode,
  cx,
  label,
  summary,
  imageUrl,
  validationIssues,
  fixIssue,
  fixAll,
  labelValidation,
  summaryValidation,
  getFieldValidation,
  updateField,
  addField,
  removeField,
  availableProperties,
  t,
}) => {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [locationPickerIndex, setLocationPickerIndex] = useState<number | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  const isAllowed = (field: string) => isPropertyAllowed(resource.type, field);

  // Click-outside handler for Add Metadata dropdown
  useEffect(() => {
    if (!showAddMenu) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showAddMenu]);

  const handleSuggestBehaviors = () => {
    if (!resource) return;
    const characteristics = {
      hasDuration: !!(resource as unknown as Record<string, unknown>).duration,
      hasPageSequence: isManifest(resource) && (resource as IIIFManifest).items?.length > 1,
      hasWidth: !!(resource as unknown as Record<string, unknown>).width,
      hasHeight: !!(resource as unknown as Record<string, unknown>).height,
    };
    const suggestions = suggestBehaviors(resource.type, characteristics);
    if (suggestions.length > 0) {
      onUpdateResource({ behavior: Array.from(new Set([...(resource.behavior || []), ...suggestions])) });
    }
  };

  const rightsValidation = getFieldValidation('rights');
  const behaviorValidation = getFieldValidation('behavior');
  const navDateValidation = getFieldValidation('navDate');

  return (
    <div role="tabpanel" className="space-y-4">
      {/* Validation Status */}
      {validationIssues.length > 0 && (
        <div className={`p-3 border text-[10px] space-y-2 ${cx.warningBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-nb-orange">
              <Icon name="report_problem" className="text-sm" />
              <span>Issues ({validationIssues.length})</span>
            </div>
            {validationIssues.some(i => i.autoFixable) && (
              <Button variant="ghost" size="bare"
                onClick={() => { const fixed = fixAll(); if (fixed) onUpdateResource(fixed); }}
                className={`text-[8px] font-bold uppercase px-2 py-1 ${fieldMode ? 'bg-nb-green text-nb-green' : 'bg-nb-green/20 text-nb-green'}`}
              >
                Fix All
              </Button>
            )}
          </div>
          {validationIssues.map((issue) => (
            <div key={issue.id} className={`flex items-start gap-2 text-[10px] ${issue.severity === 'error' ? 'text-nb-red' : (fieldMode ? 'text-nb-yellow/40' : 'text-nb-orange')}`}>
              <span className="shrink-0">{issue.title}</span>
              {issue.autoFixable && (
                <Button variant="ghost" size="bare" onClick={() => { const fixed = fixIssue(issue.id); if (fixed) onUpdateResource(fixed); }} className="text-[8px] text-nb-green hover:underline">Fix</Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Identity Section (always open) */}
      <FormSection title="Identity" icon="badge" fieldMode={fieldMode}>
        {imageUrl && (
          <div className={`aspect-video overflow-hidden border ${fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-cream border-nb-black/20'}`}>
            <img src={imageUrl} className="w-full h-full object-contain" alt="Preview" />
          </div>
        )}
        <div className="space-y-3">
          <ValidatedInput
            id="inspector-label"
            label={t('Label')}
            value={label}
            onChange={(val: string) => onUpdateResource({ label: { [language]: [val] } })}
            validation={labelValidation}
            type="text"
            fieldMode={fieldMode}
          />
          <ValidatedInput
            id="inspector-summary"
            label={t('Summary')}
            value={summary}
            onChange={(val: string) => onUpdateResource({ summary: { [language]: [val] } })}
            validation={summaryValidation}
            type="textarea"
            rows={3}
            fieldMode={fieldMode}
          />
        </div>
      </FormSection>

      {/* Custom Metadata Section (open by default) */}
      <FormSection title={t('Metadata')} icon="list_alt" fieldMode={fieldMode}>
        <div className="flex justify-between items-center mb-3">
          <label className={`text-[10px] font-bold uppercase tracking-wider ${cx.label}`}>Fields</label>
          <div className="relative" ref={addMenuRef}>
            <Button variant="ghost" size="bare"
              onClick={() => setShowAddMenu(!showAddMenu)}
              className={`text-[10px] font-bold uppercase flex items-center gap-1 ${cx.accent}`}
            >
              Add <Icon name="add" className="text-[10px]"/>
            </Button>
            {showAddMenu && (
              <div className={`absolute right-0 top-full mt-1 border shadow-brutal py-2 z-50 min-w-[160px] max-h-[250px] overflow-y-auto ${
                fieldMode
                  ? 'bg-nb-black border-2 border-nb-yellow'
                  : 'bg-nb-white border border-nb-black/20'
              }`}>
                {availableProperties.map(p => (
                  <Button variant="ghost" size="bare"
                    key={p}
                    onClick={() => { addField(p); setShowAddMenu(false); }}
                    className={`w-full px-3 py-1.5 text-left text-[10px] font-bold ${
                      fieldMode
                        ? 'text-nb-yellow/80 hover:bg-nb-yellow/20'
                        : 'text-nb-black/60 hover:bg-nb-blue/10'
                    }`}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {(resource.metadata || []).map((md, idx) => {
            const mKey = getIIIFValue(md.label, language);
            const mVal = getIIIFValue(md.value, language);
            const inputType = getMetadataInputType(mKey);
            return (
              <div key={idx} className={`group relative p-3 border ${fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/20'}`}>
                <DebouncedField
                  className={`w-full text-[10px] font-bold uppercase bg-transparent outline-none mb-1 border-b ${
                    fieldMode ? 'text-nb-yellow/60 border-nb-yellow/30' : 'text-nb-black/50 border-transparent'
                  }`}
                  value={mKey}
                  onChange={(val: string) => updateField(idx, val, mVal)}
                />
                {inputType === 'date' ? (
                  <PropertyInput
                    type="datetime-local"
                    value={mVal ? mVal.slice(0, 16) : ''}
                    onChange={(val: string) => updateField(idx, mKey, val ? new Date(val).toISOString() : '')}
                    fieldMode={fieldMode}
                    cx={cx}
                  />
                ) : inputType === 'location' ? (
                  <PropertyInput
                    type="text"
                    value={mVal}
                    onChange={(val: string) => updateField(idx, mKey, val)}
                    isLocationField
                    onLocationPick={() => setLocationPickerIndex(idx)}
                    fieldMode={fieldMode}
                    cx={cx}
                    placeholder="lat, lng or place name"
                  />
                ) : inputType === 'language' ? (
                  <SelectField
                    value={mVal}
                    onChange={(val: string) => updateField(idx, mKey, val)}
                    options={LANGUAGE_SELECT_OPTIONS}
                    placeholder="Select language..."
                    fieldMode={fieldMode}
                  />
                ) : inputType === 'url' ? (
                  <PropertyInput
                    type="url"
                    value={mVal}
                    onChange={(val: string) => updateField(idx, mKey, val)}
                    fieldMode={fieldMode}
                    cx={cx}
                    placeholder="https://..."
                  />
                ) : inputType === 'rights' ? (
                  <RightsSelector
                    value={mVal}
                    onChange={(val: string) => updateField(idx, mKey, val)}
                    fieldMode={fieldMode}
                    showLabel={false}
                  />
                ) : (
                  <DebouncedField
                    className={`w-full text-xs bg-transparent outline-none ${fieldMode ? 'text-white' : 'text-nb-black'}`}
                    value={mVal}
                    onChange={(val: string) => updateField(idx, mKey, val)}
                  />
                )}
                <Button variant="ghost" size="bare"
                  onClick={() => removeField(idx)}
                  className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 ${
                    fieldMode ? 'text-nb-yellow/40 hover:text-nb-red' : 'text-nb-black/30 hover:text-nb-red'
                  }`}
                >
                  <Icon name="close" className="text-xs"/>
                </Button>
              </div>
            );
          })}
        </div>

        {/* Location Picker Modal for metadata fields */}
        {locationPickerIndex !== null && (
          <LocationPickerModal
            isOpen={true}
            initialValue={getIIIFValue((resource.metadata || [])[locationPickerIndex]?.value, language) || ''}
            onSave={(val) => {
              const mKey = getIIIFValue((resource.metadata || [])[locationPickerIndex]?.label, language);
              updateField(locationPickerIndex, mKey, val);
              setLocationPickerIndex(null);
            }}
            onClose={() => setLocationPickerIndex(null)}
          />
        )}
      </FormSection>

      {/* Rights & Technical Section (collapsed by default) */}
      {(isAllowed('rights') || isAllowed('behavior') || isAllowed('navDate') || isAllowed('viewingDirection') || isAllowed('requiredStatement')) && (
        <FormSection
          title="Rights & Technical"
          icon="shield"
          defaultCollapsed
          fieldMode={fieldMode}
          badge={
            (rightsValidation.status === 'invalid' || behaviorValidation.status === 'invalid' || navDateValidation.status === 'invalid')
              ? <span className="w-2 h-2 rounded-full bg-nb-red shrink-0" title="Has validation issues" />
              : undefined
          }
        >
          {/* Rights */}
          {isAllowed('rights') && (
            <div>
              <RightsSelector
                value={resource.rights || ''}
                onChange={(val) => onUpdateResource({ rights: val || undefined })}
                fieldMode={fieldMode}
              />
            </div>
          )}

          {/* Behaviors */}
          {isAllowed('behavior') && (
            <div>
              <div className="flex justify-end mb-2">
                <Button variant="ghost" size="bare"
                  onClick={handleSuggestBehaviors}
                  className={`text-[9px] font-bold uppercase px-2 py-1 border ${fieldMode ? 'border-nb-yellow/30 text-nb-yellow' : 'border-nb-black/20 text-nb-blue'}`}
                >
                  Auto-Suggest
                </Button>
              </div>
              <BehaviorSelector
                options={BEHAVIOR_OPTIONS[resource.type] || []}
                selected={resource.behavior || []}
                onChange={(selected) => onUpdateResource({ behavior: selected.length ? selected : undefined })}
                getConflicts={getConflictingBehaviors}
                fieldMode={fieldMode}
              />
            </div>
          )}

          {/* Navigation Date */}
          {isAllowed('navDate') && resource.navDate !== undefined && (
            <div>
              <PropertyLabel label="Navigation Date" dcHint="navDate" fieldMode={fieldMode} cx={cx} validation={navDateValidation} />
              <PropertyInput
                type="datetime-local"
                value={resource.navDate ? resource.navDate.slice(0, 16) : ''}
                onChange={(val) => onUpdateResource({ navDate: val ? new Date(val).toISOString() : undefined })}
                fieldMode={fieldMode}
                cx={cx}
              />
            </div>
          )}

          {/* Viewing Direction */}
          {isAllowed('viewingDirection') && resource.viewingDirection !== undefined && (
            <div>
              <ViewingDirectionSelector
                value={resource.viewingDirection || 'left-to-right'}
                onChange={(val) => onUpdateResource({ viewingDirection: val as typeof resource.viewingDirection })}
                fieldMode={fieldMode}
              />
            </div>
          )}

          {/* Required Statement */}
          {isAllowed('requiredStatement') && resource.requiredStatement !== undefined && (
            <div>
              <PropertyLabel
                label="Required Statement"
                dcHint="requiredStatement"
                fieldMode={fieldMode}
                cx={cx}
              />
              <div className="space-y-2 mt-1">
                <PropertyInput
                  type="text"
                  placeholder="Label (e.g., Attribution)"
                  value={getIIIFValue(resource.requiredStatement?.label) || ''}
                  onChange={(val) => {
                    const current = resource.requiredStatement || { label: { none: [''] }, value: { none: [''] } };
                    onUpdateResource({ requiredStatement: { ...current, label: { none: [val] } } });
                  }}
                  fieldMode={fieldMode}
                  cx={cx}
                />
                <PropertyInput
                  type="text"
                  placeholder="Value (e.g., Provided by Example Museum)"
                  value={getIIIFValue(resource.requiredStatement?.value) || ''}
                  onChange={(val) => {
                    const current = resource.requiredStatement || { label: { none: ['Attribution'] }, value: { none: [''] } };
                    onUpdateResource({ requiredStatement: { ...current, value: { none: [val] } } });
                  }}
                  fieldMode={fieldMode}
                  cx={cx}
                />
              </div>
            </div>
          )}
        </FormSection>
      )}

      {/* Location Section (collapsed, conditional) */}
      {(resource as unknown as Record<string, unknown>).navPlace && (
        <FormSection title="Location" icon="place" defaultCollapsed fieldMode={fieldMode}>
          <div className="flex justify-between items-center mb-2">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${cx.label}`}>Geo Location</label>
            <Button variant="ghost" size="bare"
              onClick={() => onUpdateResource({ navPlace: undefined } as Partial<IIIFItem>)}
              className="text-[10px] text-nb-red hover:text-nb-red font-bold uppercase"
            >
              Remove
            </Button>
          </div>
          <div className={`border overflow-hidden ${fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/20'}`}>
            <GeoEditor
              item={resource}
              onChange={(navPlace) => onUpdateResource({ navPlace } as Partial<IIIFItem>)}
              height={150}
              editable={true}
            />
          </div>
        </FormSection>
      )}
    </div>
  );
};
