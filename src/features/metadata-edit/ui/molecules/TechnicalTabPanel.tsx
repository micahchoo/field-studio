/**
 * TechnicalTabPanel Molecule
 *
 * Panel for editing technical IIIF properties (navDate, rights, viewing direction, behaviors).
 * Composes PropertyInput, RightsSelector, ViewingDirectionSelector, BehaviorSelector atoms.
 *
 * FEATURES:
 * - Progressive disclosure: Basic vs Advanced properties
 * - Persisted advanced mode preference
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Manages technical property state (passed via props)
 * - No domain logic (delegates to parent callbacks)
 * - Props-only API
 * - Uses feature-specific atoms and primitives
 * - No native HTML elements
 *
 * @module features/metadata-edit/ui/molecules/TechnicalTabPanel
 */

import React, { useEffect, useState } from 'react';
import { type IIIFItem, type IIIFCanvas, getIIIFValue } from '@/src/shared/types';
import { Button, Icon } from '@/src/shared/ui/atoms';
import { LinkListEditor, type LinkItem } from '@/src/shared/ui/molecules/LinkListEditor';
import { AgentEditor, type AgentItem } from '@/src/shared/ui/molecules/AgentEditor';
import { PropertyInput } from '../atoms/PropertyInput';
import { PropertyLabel } from '../atoms/PropertyLabel';
import { RightsSelector } from '../atoms/RightsSelector';
import { ViewingDirectionSelector } from '../atoms/ViewingDirectionSelector';
import { BehaviorSelector } from '../atoms/BehaviorSelector';
import { BehaviorTag } from '../atoms/BehaviorTag';
import { StartPropertyEditor } from '../atoms/StartPropertyEditor';
import { BEHAVIOR_OPTIONS, getConflictingBehaviors } from '@/src/shared/constants/iiif';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';

export interface TechnicalTabPanelProps {
  /** Resource being edited */
  resource: IIIFItem;
  /** Available canvases for start property (Manifests) */
  canvases?: IIIFCanvas[];
  /** Contextual styles from parent */
  cx: ContextualClassNames;
  /** Field mode flag */
  fieldMode: boolean;
  /** Called when resource is updated */
  onUpdateResource: (r: Partial<IIIFItem>) => void;
}

// Storage key for advanced mode preference
const ADVANCED_MODE_KEY = 'fieldstudio-inspector-advanced-mode';

// Field definitions for progressive disclosure
const BASIC_FIELDS = ['navDate', 'rights'] as const;
const ADVANCED_FIELDS = ['viewingDirection', 'behavior', 'logo', 'homepage', 'seeAlso', 'rendering', 'service'] as const;

/**
 * TechnicalTabPanel Molecule
 */
export const TechnicalTabPanel: React.FC<TechnicalTabPanelProps> = ({
  resource,
  canvases = [],
  cx,
  fieldMode,
  onUpdateResource,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(() => {
    // Load persisted preference
    try {
      const stored = localStorage.getItem(ADVANCED_MODE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Persist advanced mode preference
  useEffect(() => {
    try {
      localStorage.setItem(ADVANCED_MODE_KEY, String(showAdvanced));
    } catch {
      // Ignore storage errors
    }
  }, [showAdvanced]);

  const inputClass = `w-full text-sm p-2.5 border bg-nb-white text-nb-black focus:ring-2 focus:ring-${
    cx.accent
  } focus:border-${cx.accent} outline-none transition-nb`;

  const isCollection = resource.type === 'Collection';
  const isManifest = resource.type === 'Manifest';

  // Behavior options for this resource type
  const behaviorOptions = BEHAVIOR_OPTIONS[resource.type as keyof typeof BEHAVIOR_OPTIONS] || [];

  return (
    <div className="space-y-6">
      {/* === BASIC PROPERTIES === */}
      
      {/* Navigation Date */}
      <div>
        <PropertyLabel
          label="Navigation Date"
          dcHint="navDate"
          fieldMode={fieldMode}
          cx={cx}
        />
        <PropertyInput
          type="datetime-local"
          value={resource.navDate ? resource.navDate.slice(0, 16) : ''}
          onChange={(val) =>
            onUpdateResource({ navDate: val ? new Date(val).toISOString() : undefined })
          }
          cx={cx}
          fieldMode={fieldMode}
          className={inputClass}
        />
        <p className={`text-[10px] mt-1 ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>
          Used for Timeline views.
        </p>
      </div>

      {/* Rights Statement */}
      <div>
        <PropertyLabel
          label="Rights Statement"
          dcHint="dc:rights"
          fieldMode={fieldMode}
          cx={cx}
        />
        <RightsSelector
          value={resource.rights || ''}
          onChange={(val) => onUpdateResource({ rights: val })}
          cx={cx}
          fieldMode={fieldMode}
          className={inputClass}
        />
      </div>

      {/* Viewing Direction (only for Manifest/Collection) */}
      {(isManifest || isCollection) && (
        <div>
          <PropertyLabel
            label="Viewing Direction"
            dcHint="viewingDirection"
            fieldMode={fieldMode}
            cx={cx}
          />
          <ViewingDirectionSelector
            value={resource.viewingDirection ?? 'left-to-right'}
            onChange={(val) => onUpdateResource({ viewingDirection: val as typeof resource.viewingDirection })}
            cx={cx}
            fieldMode={fieldMode}
            className={inputClass}
          />
        </div>
      )}

      {/* Behaviors */}
      <div>
        <PropertyLabel
          label="Behaviors"
          dcHint="behavior"
          fieldMode={fieldMode}
          cx={cx}
        />
        <BehaviorSelector
          options={behaviorOptions}
          selected={resource.behavior || []}
          onChange={(selected) => onUpdateResource({ behavior: selected })}
          getConflicts={getConflictingBehaviors}
          fieldMode={fieldMode}
          label=""
          showSummary={false}
        />

        {/* Active Behaviors Summary */}
        {(resource.behavior || []).length > 0 && (
          <div className={`mt-3 p-2 border ${fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/10'}`}>
            <div className={`text-[10px] uppercase font-bold mb-1 ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>
              Active Behaviors
            </div>
            <div className="flex flex-wrap gap-1">
              {(resource.behavior || []).map((b) => (
                <BehaviorTag
                  key={b}
                  behavior={b}
                  cx={cx}
                  fieldMode={fieldMode}
                  size="xs"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* === ADVANCED PROPERTIES TOGGLE === */}
      <div className={`pt-4 border-t ${fieldMode ? 'border-nb-black' : 'border-nb-black/20'}`}>
        <Button variant="ghost" size="bare"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 text-sm font-medium w-full ${
            fieldMode
              ? 'text-nb-black/30 hover:text-nb-black/10'
              : 'text-nb-black/60 hover:text-nb-black'
          }`}
          aria-expanded={showAdvanced}
          aria-controls="advanced-properties"
        >
          <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} className="text-lg" />
          {showAdvanced ? 'Hide Advanced Properties' : 'Show Advanced Properties'}
        </Button>
      </div>

      {/* === LINKING PROPERTIES (Standard+ level) === */}
      <div className={`space-y-6 pt-4 border-t ${fieldMode ? 'border-nb-black' : 'border-nb-black/20'}`}>
        {/* Provider */}
        <AgentEditor
          value={(resource.provider || []) as AgentItem[]}
          onChange={(providers) => onUpdateResource({ provider: providers as IIIFItem['provider'] })}
          fieldMode={fieldMode}
        />

        {/* Homepage */}
        <LinkListEditor
          value={(resource.homepage || []) as LinkItem[]}
          onChange={(links) => onUpdateResource({ homepage: links as IIIFItem['homepage'] })}
          resourceType="homepage"
          fieldMode={fieldMode}
        />

        {/* Rendering (Downloads) */}
        <LinkListEditor
          value={(resource.rendering || []) as LinkItem[]}
          onChange={(links) => onUpdateResource({ rendering: links as IIIFItem['rendering'] })}
          resourceType="rendering"
          fieldMode={fieldMode}
        />

        {/* See Also */}
        <LinkListEditor
          value={(resource.seeAlso || []) as LinkItem[]}
          onChange={(links) => onUpdateResource({ seeAlso: links as IIIFItem['seeAlso'] })}
          resourceType="seeAlso"
          fieldMode={fieldMode}
        />

        {/* Required Statement */}
        <div>
          <PropertyLabel
            label="Required Statement"
            dcHint="requiredStatement"
            fieldMode={fieldMode}
            cx={cx}
            helpText="Text that must be displayed when presenting the resource"
          />
          <div className="space-y-2">
            <PropertyInput
              type="text"
              value={getIIIFValue(resource.requiredStatement?.label)}
              onChange={(val) => {
                const current = resource.requiredStatement || { label: { none: [''] }, value: { none: [''] } };
                onUpdateResource({
                  requiredStatement: { ...current, label: { none: [val] } }
                });
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="Label (e.g., Attribution)"
            />
            <PropertyInput
              type="text"
              value={getIIIFValue(resource.requiredStatement?.value)}
              onChange={(val) => {
                const current = resource.requiredStatement || { label: { none: ['Attribution'] }, value: { none: [''] } };
                onUpdateResource({
                  requiredStatement: { ...current, value: { none: [val] } }
                });
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="Value (e.g., Provided by Example Museum)"
            />
          </div>
        </div>

        {/* Start Canvas (Manifests only) */}
        {isManifest && canvases.length > 0 && (
          <StartPropertyEditor
            value={resource.start as any}
            canvases={canvases}
            onChange={(start) => onUpdateResource({ start } as Partial<IIIFItem>)}
            fieldMode={fieldMode}
          />
        )}
      </div>

      {/* === ADVANCED PROPERTIES TOGGLE === */}
      <div className={`pt-4 border-t ${fieldMode ? 'border-nb-black' : 'border-nb-black/20'}`}>
        <Button variant="ghost" size="bare"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 text-sm font-medium w-full ${
            fieldMode
              ? 'text-nb-black/30 hover:text-nb-black/10'
              : 'text-nb-black/60 hover:text-nb-black'
          }`}
          aria-expanded={showAdvanced}
          aria-controls="advanced-properties"
        >
          <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} className="text-lg" />
          {showAdvanced ? 'Hide Advanced Properties' : 'Show Advanced Properties'}
        </Button>
      </div>

      {/* === ADVANCED PROPERTIES === */}
      {showAdvanced && (
        <div
          id="advanced-properties"
          className={`space-y-6 pt-2 pb-4 ${fieldMode ? 'border-b border-nb-black' : 'border-b border-nb-black/20'}`}
        >
          {/* Part Of */}
          <div>
            <PropertyLabel
              label="Part Of"
              dcHint="partOf"
              fieldMode={fieldMode}
              cx={cx}
              helpText="Larger resource this is part of"
            />
            <PropertyInput
              type="text"
              value={resource.partOf?.[0]?.id || ''}
              onChange={(val) => {
                if (val.trim()) {
                  onUpdateResource({ partOf: [{ id: val.trim(), type: 'Collection' }] } as Partial<IIIFItem>);
                } else {
                  onUpdateResource({ partOf: undefined } as Partial<IIIFItem>);
                }
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="Parent collection URI"
            />
          </div>

          {/* Thumbnail URL */}
          <div>
            <PropertyLabel
              label="Thumbnail"
              dcHint="thumbnail"
              fieldMode={fieldMode}
              cx={cx}
              helpText="URL to a thumbnail image representing this resource"
            />
            <PropertyInput
              type="url"
              value={resource.thumbnail?.[0]?.id || ''}
              onChange={(val) => {
                if (val.trim()) {
                  onUpdateResource({
                    thumbnail: [{ id: val.trim(), type: 'Image', format: 'image/jpeg' }]
                  } as Partial<IIIFItem>);
                } else {
                  onUpdateResource({ thumbnail: undefined } as Partial<IIIFItem>);
                }
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="https://example.com/thumb.jpg"
            />
            {resource.thumbnail?.[0]?.id && (
              <div className="mt-2">
                <img
                  src={resource.thumbnail[0].id}
                  alt="Thumbnail preview"
                  className="h-16 border border-nb-black/20 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalTabPanel;
