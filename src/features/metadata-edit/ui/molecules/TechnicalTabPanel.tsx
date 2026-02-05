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

import React, { useState, useEffect } from 'react';
import { type IIIFItem } from '@/types';
import { Icon } from '@/src/shared/ui/atoms';
import { PropertyInput } from '../atoms/PropertyInput';
import { PropertyLabel } from '../atoms/PropertyLabel';
import { RightsSelector } from '../atoms/RightsSelector';
import { ViewingDirectionSelector } from '../atoms/ViewingDirectionSelector';
import { BehaviorSelector } from '../atoms/BehaviorSelector';
import { BehaviorTag } from '../atoms/BehaviorTag';
import { BEHAVIOR_OPTIONS, getConflictingBehaviors } from '@/src/shared/constants/iiif';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';

export interface TechnicalTabPanelProps {
  /** Resource being edited */
  resource: IIIFItem;
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

  const inputClass = `w-full text-sm p-2.5 border rounded bg-white text-slate-900 focus:ring-2 focus:ring-${
    cx.accent
  } focus:border-${cx.accent} outline-none transition-all`;

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
        <p className={`text-[10px] mt-1 ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
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
            value={resource.viewingDirection || 'left-to-right'}
            onChange={(val) => onUpdateResource({ viewingDirection: val })}
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
          <div className={`mt-3 p-2 rounded border ${fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`text-[10px] uppercase font-bold mb-1 ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
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
      <div className={`pt-4 border-t ${fieldMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-2 text-sm font-medium w-full ${
            fieldMode
              ? 'text-slate-300 hover:text-slate-100'
              : 'text-slate-600 hover:text-slate-800'
          }`}
          aria-expanded={showAdvanced}
          aria-controls="advanced-properties"
        >
          <Icon name={showAdvanced ? 'expand_less' : 'expand_more'} className="text-lg" />
          {showAdvanced ? 'Hide Advanced Properties' : 'Show Advanced Properties'}
        </button>
      </div>

      {/* === ADVANCED PROPERTIES === */}
      {showAdvanced && (
        <div
          id="advanced-properties"
          className={`space-y-6 pt-2 pb-4 ${fieldMode ? 'border-b border-slate-800' : 'border-b border-slate-200'}`}
        >
          {/* Required Statement */}
          <div>
            <PropertyLabel
              label="Required Statement"
              dcHint="requiredStatement"
              fieldMode={fieldMode}
              cx={cx}
              helpText="Text that must be displayed when presenting the resource"
            />
            <PropertyInput
              type="text"
              value={''} // TODO: Add required statement support
              onChange={(val) => {
                // TODO: Implement required statement update
                console.log('Required statement:', val);
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="Attribution or rights statement"
            />
          </div>

          {/* Provider */}
          <div>
            <PropertyLabel
              label="Provider"
              dcHint="provider"
              fieldMode={fieldMode}
              cx={cx}
              helpText="Organization that provided the resource"
            />
            <PropertyInput
              type="text"
              value={''} // TODO: Add provider support
              onChange={(val) => {
                // TODO: Implement provider update
                console.log('Provider:', val);
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="Institution or organization"
            />
          </div>

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
              value={''} // TODO: Add partOf support
              onChange={(val) => {
                // TODO: Implement partOf update
                console.log('Part of:', val);
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="Parent collection or manifest"
            />
          </div>

          {/* Thumbnail */}
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
              value={''} // TODO: Add thumbnail support
              onChange={(val) => {
                // TODO: Implement thumbnail update
                console.log('Thumbnail:', val);
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="https://example.com/thumb.jpg"
            />
          </div>

          {/* Homepage */}
          <div>
            <PropertyLabel
              label="Homepage"
              dcHint="homepage"
              fieldMode={fieldMode}
              cx={cx}
              helpText="External web page about this resource"
            />
            <PropertyInput
              type="url"
              value={''} // TODO: Add homepage support
              onChange={(val) => {
                // TODO: Implement homepage update
                console.log('Homepage:', val);
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="https://example.com/resource"
            />
          </div>

          {/* See Also */}
          <div>
            <PropertyLabel
              label="See Also"
              dcHint="seeAlso"
              fieldMode={fieldMode}
              cx={cx}
              helpText="Related machine-readable resources"
            />
            <PropertyInput
              type="url"
              value={''} // TODO: Add seeAlso support
              onChange={(val) => {
                // TODO: Implement seeAlso update
                console.log('See also:', val);
              }}
              cx={cx}
              fieldMode={fieldMode}
              className={inputClass}
              placeholder="https://example.com/data.json"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TechnicalTabPanel;
