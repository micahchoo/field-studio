/**
 * LinkListEditor Molecule
 *
 * Reusable array editor for IIIF linking properties: rendering, seeAlso, homepage.
 * Each link has id (URL), type, label, and format fields.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Props-driven, no domain logic
 * - Uses shared atoms/molecules
 * - Controlled list state
 *
 * @module shared/ui/molecules/LinkListEditor
 */

import React, { useState, useCallback } from 'react';
import { Button, Icon } from '../atoms';
import { FormInput } from './FormInput';

// ============================================================================
// Types
// ============================================================================

export type LinkResourceType ='rendering' |'seeAlso' |'homepage';

export interface LinkItem {
  id: string;
  type: string;
  label?: Record<string, string[]>;
  format?: string;
}

export interface LinkListEditorProps {
  /** Current list of links */
  value: LinkItem[];
  /** Called when the list changes */
  onChange: (value: LinkItem[]) => void;
  /** Which linking property this editor manages */
  resourceType: LinkResourceType;
  /** Field mode styling */
  fieldMode?: boolean;
  /** Whether editing is disabled */
  disabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const RESOURCE_TYPE_CONFIG: Record<LinkResourceType, {
  title: string;
  icon: string;
  defaultType: string;
  placeholder: string;
}> = {
  rendering: {
    title:'Downloads',
    icon:'download',
    defaultType:'Text',
    placeholder:'https://example.org/resource.pdf',
  },
  seeAlso: {
    title:'See Also',
    icon:'open_in_new',
    defaultType:'Dataset',
    placeholder:'https://example.org/metadata.json',
  },
  homepage: {
    title:'Homepage',
    icon:'home',
    defaultType:'Text',
    placeholder:'https://example.org/about',
  },
};

const FORMAT_PRESETS = [
  { label:'PDF', value:'application/pdf' },
  { label:'HTML', value:'text/html' },
  { label:'EPUB', value:'application/epub+zip' },
  { label:'JSON', value:'application/json' },
  { label:'JSON-LD', value:'application/ld+json' },
  { label:'XML', value:'application/xml' },
  { label:'CSV', value:'text/csv' },
  { label:'Plain Text', value:'text/plain' },
];

const FORMAT_ICONS: Record<string, string> = {
'application/pdf':'picture_as_pdf',
'text/html':'language',
'application/epub+zip':'menu_book',
'application/json':'data_object',
'application/ld+json':'data_object',
'application/xml':'code',
'text/csv':'table_chart',
};

// ============================================================================
// Sub-components
// ============================================================================

interface LinkRowProps {
  item: LinkItem;
  index: number;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  fieldMode?: boolean;
  disabled?: boolean;
}

const LinkRow: React.FC<LinkRowProps> = ({ item, index, onEdit, onRemove, fieldMode, disabled }) => {
  const label = item.label?.none?.[0] || item.label?.en?.[0] ||
    Object.values(item.label || {})[0]?.[0] ||'Untitled';
  const icon = FORMAT_ICONS[item.format ||''] ||'link';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border ${
      fieldMode
        ?'border-nb-black/80 bg-nb-black/50'
        :'border-nb-black/20 bg-nb-white'
    }`}>
      <Icon
        name={icon}
        className={`text-base shrink-0 ${fieldMode ?'text-nb-black/40' :'text-nb-black/50'}`}
      />
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${fieldMode ?'text-white' :'text-nb-black/80'}`}>
          {label}
        </div>
        <div className={`text-xs truncate ${fieldMode ?'text-nb-black/50' :'text-nb-black/40'}`}>
          {item.format || item.type} — {item.id}
        </div>
      </div>
      {!disabled && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="bare"
            onClick={() => onEdit(index)}
            icon={<Icon name="edit" className="text-sm" />}
            title="Edit"
            aria-label="Edit link"
          />
          <Button
            variant="ghost"
            size="bare"
            onClick={() => onRemove(index)}
            icon={<Icon name="close" className="text-sm text-nb-red" />}
            title="Remove"
            aria-label="Remove link"
          />
        </div>
      )}
    </div>
  );
};

interface LinkFormProps {
  initial?: LinkItem;
  resourceType: LinkResourceType;
  onSave: (item: LinkItem) => void;
  onCancel: () => void;
  fieldMode?: boolean;
}

const LinkForm: React.FC<LinkFormProps> = ({ initial, resourceType, onSave, onCancel, fieldMode }) => {
  const config = RESOURCE_TYPE_CONFIG[resourceType];
  const [url, setUrl] = useState(initial?.id ||'');
  const [label, setLabel] = useState(
    initial?.label?.none?.[0] || initial?.label?.en?.[0] ||
    Object.values(initial?.label || {})[0]?.[0] ||''
  );
  const [format, setFormat] = useState(initial?.format ||'');
  const [type, setType] = useState(initial?.type || config.defaultType);

  const handleSave = () => {
    if (!url.trim()) return;
    onSave({
      id: url.trim(),
      type,
      label: label.trim() ? { none: [label.trim()] } : undefined,
      format: format || undefined,
    });
  };

  return (
    <div className={`p-3 border space-y-3 ${
      fieldMode
        ?'border-nb-black/60 bg-nb-black'
        :'border-nb-black/20 bg-nb-white'
    }`}>
      <FormInput
        value={url}
        onChange={setUrl}
        type="url"
        label="URL"
        placeholder={config.placeholder}
        required
        fieldMode={fieldMode}
      />
      <FormInput
        value={label}
        onChange={setLabel}
        label="Label"
        placeholder="Display name"
        fieldMode={fieldMode}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className={`block text-xs font-medium mb-1 ${fieldMode ?'text-nb-black/40' :'text-nb-black/60'}`}>
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={`w-full text-sm border px-2 py-1.5 ${
              fieldMode
                ?'bg-nb-black border-nb-black/60 text-white'
                :'bg-nb-white border-nb-black/20 text-nb-black/80'
            }`}
          >
            <option value="">Select format...</option>
            {FORMAT_PRESETS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <FormInput
            value={type}
            onChange={setType}
            label="Type"
            placeholder="Text"
            fieldMode={fieldMode}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!url.trim()}
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

export const LinkListEditor: React.FC<LinkListEditorProps> = ({
  value,
  onChange,
  resourceType,
  fieldMode = false,
  disabled = false,
}) => {
  const config = RESOURCE_TYPE_CONFIG[resourceType];
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = useCallback((item: LinkItem) => {
    onChange([...value, item]);
    setIsAdding(false);
  }, [value, onChange]);

  const handleUpdate = useCallback((item: LinkItem) => {
    if (editingIndex === null) return;
    const next = [...value];
    next[editingIndex] = item;
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
            name={config.icon}
            className={`text-sm ${fieldMode ?'text-nb-black/40' :'text-nb-black/50'}`}
          />
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            fieldMode ?'text-nb-black/40' :'text-nb-black/50'
          }`}>
            {config.title}
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
            title={`Add ${config.title.toLowerCase()}`}
            aria-label={`Add ${config.title.toLowerCase()}`}
          />
        )}
      </div>

      {/* Link list */}
      {value.map((item, i) => (
        editingIndex === i ? (
          <LinkForm
            key={`edit-${i}`}
            initial={item}
            resourceType={resourceType}
            onSave={handleUpdate}
            onCancel={() => setEditingIndex(null)}
            fieldMode={fieldMode}
          />
        ) : (
          <LinkRow
            key={item.id || i}
            item={item}
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
        <LinkForm
          resourceType={resourceType}
          onSave={handleAdd}
          onCancel={() => setIsAdding(false)}
          fieldMode={fieldMode}
        />
      )}

      {/* Empty state */}
      {value.length === 0 && !isAdding && (
        <div className={`text-center py-3 text-xs ${fieldMode ?'text-nb-black/60' :'text-nb-black/40'}`}>
          No {config.title.toLowerCase()} links
        </div>
      )}
    </div>
  );
};

export default LinkListEditor;
