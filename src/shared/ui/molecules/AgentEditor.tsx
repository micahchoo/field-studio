/**
 * AgentEditor Molecule
 *
 * Editor for IIIF`provider` Agent objects.
 * Supports name, URI, homepage, and logo with preview.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Props-driven, no domain logic
 * - Uses shared atoms/molecules
 * - Controlled list state
 *
 * @module shared/ui/molecules/AgentEditor
 */

import React, { useState, useCallback } from 'react';
import { Button, Icon } from '../atoms';
import { FormInput } from './FormInput';

// ============================================================================
// Types
// ============================================================================

export interface AgentItem {
  id: string;
  type:'Agent';
  label: Record<string, string[]>;
  homepage?: Array<{ id: string; type:'Text'; label: Record<string, string[]>; format?: string }>;
  logo?: Array<{ id: string; type:'Image'; format?: string; width?: number; height?: number }>;
}

export interface AgentEditorProps {
  /** Current list of providers */
  value: AgentItem[];
  /** Called when the list changes */
  onChange: (value: AgentItem[]) => void;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Whether editing is disabled */
  disabled?: boolean;
}

// ============================================================================
// Sub-components
// ============================================================================

interface AgentRowProps {
  agent: AgentItem;
  index: number;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  fieldMode?: boolean;
  disabled?: boolean;
}

const AgentRow: React.FC<AgentRowProps> = ({ agent, index, onEdit, onRemove, fieldMode, disabled }) => {
  const name = agent.label?.none?.[0] || agent.label?.en?.[0] ||
    Object.values(agent.label || {})[0]?.[0] ||'Unknown Provider';
  const logoUrl = agent.logo?.[0]?.id;
  const homepageUrl = agent.homepage?.[0]?.id;

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 border ${
      fieldMode
        ?'border-nb-black/80 bg-nb-black/50'
        :'border-nb-black/20 bg-nb-white'
    }`}>
      {/* Logo or placeholder */}
      <div className={`shrink-0 w-10 h-10 flex items-center justify-center overflow-hidden ${
        fieldMode ?'bg-nb-black/80' :'bg-nb-cream'
      }`}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display ='none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          <Icon
            name="business"
            className={`text-lg ${fieldMode ?'text-nb-black/50' :'text-nb-black/40'}`}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${fieldMode ?'text-white' :'text-nb-black/80'}`}>
          {name}
        </div>
        <div className={`text-xs truncate ${fieldMode ?'text-nb-black/50' :'text-nb-black/40'}`}>
          {homepageUrl || agent.id}
        </div>
      </div>

      {/* Actions */}
      {!disabled && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="bare"
            onClick={() => onEdit(index)}
            icon={<Icon name="edit" className="text-sm" />}
            title="Edit provider"
            aria-label="Edit provider"
          />
          <Button
            variant="ghost"
            size="bare"
            onClick={() => onRemove(index)}
            icon={<Icon name="close" className="text-sm text-nb-red" />}
            title="Remove provider"
            aria-label="Remove provider"
          />
        </div>
      )}
    </div>
  );
};

interface AgentFormProps {
  initial?: AgentItem;
  onSave: (agent: AgentItem) => void;
  onCancel: () => void;
  fieldMode?: boolean;
}

const AgentForm: React.FC<AgentFormProps> = ({ initial, onSave, onCancel, fieldMode }) => {
  const [name, setName] = useState(
    initial?.label?.none?.[0] || initial?.label?.en?.[0] ||
    Object.values(initial?.label || {})[0]?.[0] ||''
  );
  const [uri, setUri] = useState(initial?.id ||'');
  const [homepageUrl, setHomepageUrl] = useState(initial?.homepage?.[0]?.id ||'');
  const [logoUrl, setLogoUrl] = useState(initial?.logo?.[0]?.id ||'');
  const [logoError, setLogoError] = useState(false);

  const handleSave = () => {
    if (!name.trim()) return;

    const agent: AgentItem = {
      id: uri.trim() ||`urn:uuid:${crypto.randomUUID()}`,
      type:'Agent',
      label: { none: [name.trim()] },
    };

    if (homepageUrl.trim()) {
      agent.homepage = [{
        id: homepageUrl.trim(),
        type:'Text',
        label: { none: [name.trim()] },
        format:'text/html',
      }];
    }

    if (logoUrl.trim()) {
      agent.logo = [{
        id: logoUrl.trim(),
        type:'Image',
        format:'image/png',
      }];
    }

    onSave(agent);
  };

  return (
    <div className={`p-3 border space-y-3 ${
      fieldMode
        ?'border-nb-black/60 bg-nb-black'
        :'border-nb-black/20 bg-nb-white'
    }`}>
      <FormInput
        value={name}
        onChange={setName}
        label="Organization Name"
        placeholder="Example Museum"
        required
        fieldMode={fieldMode}
      />
      <FormInput
        value={uri}
        onChange={setUri}
        type="url"
        label="URI"
        placeholder="https://example.org"
        fieldMode={fieldMode}
      />
      <FormInput
        value={homepageUrl}
        onChange={setHomepageUrl}
        type="url"
        label="Homepage URL"
        placeholder="https://example.org/about"
        fieldMode={fieldMode}
      />
      <div>
        <FormInput
          value={logoUrl}
          onChange={(v) => { setLogoUrl(v); setLogoError(false); }}
          type="url"
          label="Logo URL"
          placeholder="https://example.org/logo.png"
          fieldMode={fieldMode}
        />
        {/* Logo preview */}
        {logoUrl.trim() && !logoError && (
          <div className={`mt-2 inline-block p-2 border ${
            fieldMode ?'border-nb-black/80 bg-nb-black' :'border-nb-black/20 bg-nb-white'
          }`}>
            <img
              src={logoUrl}
              alt="Logo preview"
              className="h-8 max-w-[120px] object-contain"
              onError={() => setLogoError(true)}
            />
          </div>
        )}
        {logoError && (
          <div className="mt-1 text-xs text-nb-red">
            Could not load logo preview
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          {initial ?'Update' :'Add'}
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const AgentEditor: React.FC<AgentEditorProps> = ({
  value,
  onChange,
  fieldMode = false,
  disabled = false,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = useCallback((agent: AgentItem) => {
    onChange([...value, agent]);
    setIsAdding(false);
  }, [value, onChange]);

  const handleUpdate = useCallback((agent: AgentItem) => {
    if (editingIndex === null) return;
    const next = [...value];
    next[editingIndex] = agent;
    onChange(next);
    setEditingIndex(null);
  }, [value, onChange, editingIndex]);

  const handleRemove = useCallback((index: number) => {
    onChange(value.filter((_, i) => i !== index));
  }, [value, onChange]);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon
            name="business"
            className={`text-sm ${fieldMode ?'text-nb-black/40' :'text-nb-black/50'}`}
          />
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            fieldMode ?'text-nb-black/40' :'text-nb-black/50'
          }`}>
            Provider
          </span>
          {value.length > 0 && (
            <span className={`text-xs ${fieldMode ?'text-nb-black/60' :'text-nb-black/40'}`}>
              ({value.length})
            </span>
          )}
        </div>
        {!disabled && !isAdding && (
          <Button
            variant="ghost"
            size="bare"
            onClick={() => setIsAdding(true)}
            icon={<Icon name="add" className="text-sm" />}
            title="Add provider"
            aria-label="Add provider"
          />
        )}
      </div>

      {/* Agent list */}
      {value.map((agent, i) => (
        editingIndex === i ? (
          <AgentForm
            key={`edit-${i}`}
            initial={agent}
            onSave={handleUpdate}
            onCancel={() => setEditingIndex(null)}
            fieldMode={fieldMode}
          />
        ) : (
          <AgentRow
            key={agent.id || i}
            agent={agent}
            index={i}
            onEdit={setEditingIndex}
            onRemove={handleRemove}
            fieldMode={fieldMode}
            disabled={disabled}
          />
        )
      ))}

      {/* Add form */}
      {isAdding && (
        <AgentForm
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
          fieldMode={fieldMode}
        />
      )}

      {/* Empty state */}
      {value.length === 0 && !isAdding && (
        <div className={`text-center py-3 text-xs ${fieldMode ?'text-nb-black/60' :'text-nb-black/40'}`}>
          No provider set
        </div>
      )}
    </div>
  );
};

export default AgentEditor;
