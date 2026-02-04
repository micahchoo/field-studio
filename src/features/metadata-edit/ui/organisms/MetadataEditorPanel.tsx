/**
 * MetadataEditorPanel Organism
 *
 * Side panel for single-item metadata editing extracted from legacy MetadataEditor.tsx.
 * Provides tabbed editing of metadata, technical properties, and annotations.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props from FieldModeTemplate (no hook calls)
 * - Composes molecules from shared/ui/molecules
 * - No direct hook calls to useAppSettings or useContextualStyles
 *
 * IDEAL OUTCOME: Users can edit IIIF resource metadata in a side panel
 * FAILURE PREVENTED: Unsaved changes lost, metadata corruption, poor UX
 *
 * @module features/metadata-edit/ui/organisms/MetadataEditorPanel
 */

import React, { useEffect, useRef, useState } from 'react';
import type { IIIFItem, IIIFAnnotation, IIIFCanvas } from '@/types';
import { getIIIFValue, isCollection, isManifest } from '@/types';
import { Icon } from '@/components/Icon';
import {
  BEHAVIOR_CONFLICTS,
  BEHAVIOR_DEFINITIONS,
  BEHAVIOR_OPTIONS,
  DEFAULT_MAP_CONFIG,
  DUBLIN_CORE_MAP,
  getConflictingBehaviors,
  RIGHTS_OPTIONS,
  VIEWING_DIRECTIONS,
} from '@/constants';

// Type for contextual styles from FieldModeTemplate
interface ContextualStyles {
  surface: string;
  text: string;
  accent: string;
  border: string;
  divider: string;
  headerBg: string;
  textMuted: string;
  input: string;
  label: string;
  active: string;
}

export interface MetadataEditorPanelProps {
  /** Resource being edited */
  resource: IIIFItem | null;
  /** Called when resource is updated */
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  /** Current language for metadata values */
  language: string;
  /** Contextual styles from template */
  cx: ContextualStyles;
  /** Current field mode */
  fieldMode: boolean;
  /** Optional close handler */
  onClose?: () => void;
}

/**
 * MetadataEditorPanel Organism
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode }) => (
 *     <MetadataEditorPanel
 *       resource={selectedItem}
 *       onUpdateResource={handleUpdate}
 *       language={settings.language}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       onClose={handleClose}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const MetadataEditorPanel: React.FC<MetadataEditorPanelProps> = ({
  resource,
  onUpdateResource,
  language,
  cx,
  fieldMode,
  onClose,
}) => {
  const [tab, setTab] = useState<'metadata' | 'technical' | 'annotations'>('metadata');
  const [showLocationPicker, setShowLocationPicker] = useState<{ index: number; value: string } | null>(null);

  // Empty state when no resource selected
  if (!resource) {
    return (
      <div
        className={`w-80 border-l flex flex-col items-center justify-center ${
          fieldMode ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
        }`}
      >
        <Icon name="info" className="text-4xl mb-2" />
        <p className="text-sm text-center">Select an item to view properties</p>
      </div>
    );
  }

  const label = getIIIFValue(resource.label, language) || getIIIFValue(resource.label, 'none') || '';
  const summary = getIIIFValue(resource.summary, language) || '';

  const inputClass = `w-full text-sm p-2.5 border rounded bg-white text-slate-900 focus:ring-2 focus:ring-${
    cx.accent
  } focus:border-${cx.accent} outline-none transition-all`;

  const getDCHint = (lbl: string) => {
    const lower = lbl.toLowerCase();
    const match = Object.keys(DUBLIN_CORE_MAP).find((k) => k.toLowerCase() === lower);
    return match ? DUBLIN_CORE_MAP[match] : null;
  };

  const isLocationField = (lbl: string) => {
    const lower = lbl.toLowerCase();
    return lower === 'location' || lower === 'gps' || lower === 'coverage' || lower === 'coordinates';
  };

  return (
    <div
      className={`w-80 border-l flex flex-col h-full shadow-xl z-30 ${
        fieldMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {/* Tabs */}
      <div className={`flex border-b ${fieldMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <TabButton
          active={tab === 'metadata'}
          onClick={() => setTab('metadata')}
          label="Metadata"
          cx={cx}
          fieldMode={fieldMode}
        />
        <TabButton
          active={tab === 'technical'}
          onClick={() => setTab('technical')}
          label="Technical"
          cx={cx}
          fieldMode={fieldMode}
        />
        <TabButton
          active={tab === 'annotations'}
          onClick={() => setTab('annotations')}
          label="Annotations"
          cx={cx}
          fieldMode={fieldMode}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {tab === 'metadata' && (
          <MetadataTab
            resource={resource}
            label={label}
            summary={summary}
            language={language}
            cx={cx}
            fieldMode={fieldMode}
            inputClass={inputClass}
            onUpdateResource={onUpdateResource}
            getDCHint={getDCHint}
            isLocationField={isLocationField}
            onShowLocationPicker={setShowLocationPicker}
          />
        )}

        {tab === 'technical' && (
          <TechnicalTab
            resource={resource}
            language={language}
            cx={cx}
            fieldMode={fieldMode}
            inputClass={inputClass}
            onUpdateResource={onUpdateResource}
          />
        )}

        {tab === 'annotations' && (
          <AnnotationsTab cx={cx} fieldMode={fieldMode} />
        )}
      </div>

      {showLocationPicker && (
        <LocationModal
          initialValue={showLocationPicker.value}
          onSave={(val) => {
            const newMeta = [...(resource.metadata || [])];
            newMeta[showLocationPicker.index].value = { [language]: [val] };
            onUpdateResource({ metadata: newMeta });
            setShowLocationPicker(null);
          }}
          onClose={() => setShowLocationPicker(null)}
        />
      )}
    </div>
  );
};

// =============================================================================
// Sub-components
// =============================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  cx: ContextualStyles;
  fieldMode: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, label, cx, fieldMode }) => (
  <button
    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${
      active
        ? `text-${cx.accent} border-b-2 border-${cx.accent}`
        : fieldMode
          ? 'text-slate-500 hover:text-slate-300'
          : 'text-slate-500 hover:text-slate-800'
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

interface MetadataTabProps {
  resource: IIIFItem;
  label: string;
  summary: string;
  language: string;
  cx: ContextualStyles;
  fieldMode: boolean;
  inputClass: string;
  onUpdateResource: (r: Partial<IIIFItem>) => void;
  getDCHint: (lbl: string) => string | null;
  isLocationField: (lbl: string) => boolean;
  onShowLocationPicker: (picker: { index: number; value: string } | null) => void;
}

const MetadataTab: React.FC<MetadataTabProps> = ({
  resource,
  label,
  summary,
  language,
  cx,
  fieldMode,
  inputClass,
  onUpdateResource,
  getDCHint,
  isLocationField,
  onShowLocationPicker,
}) => (
  <>
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

    <div>
      <label className={`block text-xs font-bold mb-1.5 flex justify-between ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`}>
        Label <span className={`text-[9px] font-mono px-1 rounded ${fieldMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>dc:title</span>
      </label>
      <input
        type="text"
        value={label}
        onChange={(e) => onUpdateResource({ label: { [language]: [e.target.value] } })}
        className={inputClass}
      />
    </div>

    <div>
      <div className="flex justify-between items-center mb-1.5">
        <label className={`block text-xs font-bold ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`}>Summary</label>
      </div>
      <textarea
        rows={5}
        value={summary}
        onChange={(e) => onUpdateResource({ summary: { [language]: [e.target.value] } })}
        className={`${inputClass} resize-none`}
      />
    </div>

    <div>
      <label className={`block text-xs font-bold mb-2 ${fieldMode ? 'text-slate-300' : 'text-slate-700'}`}>
        Descriptive Metadata
      </label>
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
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <input
                    className={`text-xs font-bold bg-transparent border-b border-transparent focus:border-blue-300 outline-none w-24 ${
                      fieldMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                    value={lbl}
                    onChange={(e) => {
                      const newMeta = [...(resource.metadata || [])];
                      newMeta[idx].label = { [language]: [e.target.value] };
                      onUpdateResource({ metadata: newMeta });
                    }}
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
                <button
                  onClick={() => {
                    const newMeta = resource.metadata?.filter((_, i) => i !== idx);
                    onUpdateResource({ metadata: newMeta });
                  }}
                  className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Icon name="close" className="text-xs" />
                </button>
              </div>
              <div className="flex gap-1">
                <input
                  className={`w-full text-xs rounded px-2 py-1 border focus:border-blue-400 outline-none ${
                    fieldMode
                      ? 'bg-slate-800 text-slate-200 border-slate-700'
                      : 'bg-white text-slate-800 border-slate-200'
                  }`}
                  value={val}
                  onChange={(e) => {
                    const newMeta = [...(resource.metadata || [])];
                    newMeta[idx].value = { [language]: [e.target.value] };
                    onUpdateResource({ metadata: newMeta });
                  }}
                />
                {isLoc && (
                  <button
                    onClick={() => onShowLocationPicker({ index: idx, value: val })}
                    className="bg-green-100 hover:bg-green-200 text-green-700 p-1.5 rounded border border-green-200"
                    title="Pick Location on Map"
                  >
                    <Icon name="location_on" className="text-sm" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <button
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
        </button>
      </div>
    </div>
  </>
);

interface TechnicalTabProps {
  resource: IIIFItem;
  language: string;
  cx: ContextualStyles;
  fieldMode: boolean;
  inputClass: string;
  onUpdateResource: (r: Partial<IIIFItem>) => void;
}

const TechnicalTab: React.FC<TechnicalTabProps> = ({
  resource,
  language,
  cx,
  fieldMode,
  inputClass,
  onUpdateResource,
}) => (
  <div className="space-y-6">
    <div>
      <label
        className={`block text-xs font-bold mb-1.5 flex justify-between ${
          fieldMode ? 'text-slate-300' : 'text-slate-700'
        }`}
      >
        Navigation Date <span className={`text-[9px] font-mono px-1 rounded ${fieldMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>navDate</span>
      </label>
      <input
        type="datetime-local"
        value={resource.navDate ? resource.navDate.slice(0, 16) : ''}
        onChange={(e) =>
          onUpdateResource({ navDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })
        }
        className={inputClass}
      />
      <p className={`text-[10px] mt-1 ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>Used for Timeline views.</p>
    </div>

    <div>
      <label
        className={`block text-xs font-bold mb-1.5 flex justify-between ${
          fieldMode ? 'text-slate-300' : 'text-slate-700'
        }`}
      >
        Rights Statement <span className={`text-[9px] font-mono px-1 rounded ${fieldMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>dc:rights</span>
      </label>
      <select
        value={resource.rights || ''}
        onChange={(e) => onUpdateResource({ rights: e.target.value })}
        className={inputClass}
      >
        <option value="">(None Selected)</option>
        {RIGHTS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>

    {(isManifest(resource) || isCollection(resource)) && (
      <div>
        <label
          className={`block text-xs font-bold mb-1.5 flex justify-between ${
            fieldMode ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          Viewing Direction{' '}
          <span className={`text-[9px] font-mono px-1 rounded ${fieldMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>
            viewingDirection
          </span>
        </label>
        <select
          value={resource.viewingDirection || 'left-to-right'}
          onChange={(e) => onUpdateResource({ viewingDirection: e.target.value as any })}
          className={inputClass}
        >
          {VIEWING_DIRECTIONS.map((dir) => (
            <option key={dir} value={dir}>
              {dir}
            </option>
          ))}
        </select>
      </div>
    )}

    <div>
      <label
        className={`block text-xs font-bold mb-2 flex justify-between ${
          fieldMode ? 'text-slate-300' : 'text-slate-700'
        }`}
      >
        Behaviors <span className={`text-[9px] font-mono px-1 rounded ${fieldMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-50 text-slate-400'}`}>behavior</span>
      </label>
      <div className="space-y-1.5">
        {(BEHAVIOR_OPTIONS[resource.type as keyof typeof BEHAVIOR_OPTIONS] || []).map((b) => {
          const def = BEHAVIOR_DEFINITIONS[b];
          const currentBehaviors = resource.behavior || [];
          const isChecked = currentBehaviors.includes(b);
          const conflicts = getConflictingBehaviors(b);
          const hasConflict = conflicts.some((c) => currentBehaviors.includes(c));
          const conflictingWith = conflicts.filter((c) => currentBehaviors.includes(c));

          return (
            <label
              key={b}
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
              title={def?.description || b}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  const current = new Set(currentBehaviors);
                  if (e.target.checked) {
                    current.add(b);
                    // Auto-remove conflicting behaviors
                    conflicts.forEach((c) => current.delete(c));
                  } else {
                    current.delete(b);
                  }
                  onUpdateResource({ behavior: Array.from(current) });
                }}
                className="rounded text-blue-600 mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-semibold ${
                      hasConflict && isChecked ? 'text-red-700' : fieldMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {def?.label || b}
                  </span>
                  {def?.category && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                        def.category === 'time'
                          ? 'bg-purple-100 text-purple-600'
                          : def.category === 'layout'
                            ? 'bg-amber-100 text-amber-600'
                            : def.category === 'browsing'
                              ? 'bg-emerald-100 text-emerald-600'
                              : def.category === 'page'
                                ? 'bg-blue-100 text-blue-600'
                                : fieldMode
                                  ? 'bg-slate-800 text-slate-500'
                                  : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {def.category}
                    </span>
                  )}
                </div>
                {def?.description && (
                  <p className={`text-[10px] mt-0.5 leading-snug ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    {def.description}
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
      {(resource.behavior || []).length > 0 && (
        <div className={`mt-3 p-2 rounded border ${fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          <div className={`text-[10px] uppercase font-bold mb-1 ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Active Behaviors
          </div>
          <div className="flex flex-wrap gap-1">
            {(resource.behavior || []).map((b) => (
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
  </div>
);

interface AnnotationsTabProps {
  cx: ContextualStyles;
  fieldMode: boolean;
}

const AnnotationsTab: React.FC<AnnotationsTabProps> = ({ cx, fieldMode }) => (
  <div className="text-center py-10">
    <Icon name="comments_disabled" className={`text-4xl mb-2 ${fieldMode ? 'text-slate-600' : 'text-slate-300'}`} />
    <p className={`text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>No annotations yet.</p>
    <button
      className={`mt-4 px-4 py-2 rounded text-xs font-bold ${
        fieldMode
          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      Add Annotation
    </button>
  </div>
);

interface LocationModalProps {
  initialValue: string;
  onSave: (val: string) => void;
  onClose: () => void;
}

declare const L: any;

const LocationModal: React.FC<LocationModalProps> = ({ initialValue, onSave, onClose }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Parse initial
    const match = initialValue.match(/(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)/);
    let initLat = 20,
      initLng = 0,
      zoom = 2;

    if (match) {
      initLat = parseFloat(match[1]);
      initLng = parseFloat(match[2]);
      zoom = 10;
      setCoords({ lat: initLat, lng: initLng });
    }

    if (mapRef.current && typeof L !== 'undefined') {
      const map = L.map(mapRef.current).setView([initLat, initLng], zoom);
      L.tileLayer(DEFAULT_MAP_CONFIG.tileLayer, { attribution: DEFAULT_MAP_CONFIG.attribution }).addTo(map);

      const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map);

      if (!match) map.locate({ setView: true, maxZoom: 10 });

      map.on('click', (e: any) => {
        marker.setLatLng(e.latlng);
        setCoords(e.latlng);
      });

      marker.on('dragend', (e: any) => {
        setCoords(marker.getLatLng());
      });

      return () => map.remove();
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Icon name="location_on" className="text-green-600" /> Pick Location
          </h3>
          <button onClick={onClose}>
            <Icon name="close" className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 relative bg-slate-100">
          <div ref={mapRef} className="absolute inset-0" />
        </div>
        <div className="p-4 border-t flex justify-between items-center bg-white">
          <div className="text-xs font-mono bg-slate-100 px-3 py-1.5 rounded border">
            {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Click map to select'}
          </div>
          <button
            disabled={!coords}
            onClick={() => coords && onSave(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold text-xs disabled:opacity-50 hover:bg-green-700"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetadataEditorPanel;
