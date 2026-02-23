/**
 * ConnectionEditPanel Molecule
 *
 * Floating panel for editing connection properties on double-click.
 *
 * @module features/board-design/ui/molecules/ConnectionEditPanel
 */

import React, { useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import type { Connection, ConnectionType } from '../../model';
import { ConnectionTypeBadge } from '../atoms/ConnectionTypeBadge';

const CONNECTION_TYPES: ConnectionType[] = ['associated', 'partOf', 'similarTo', 'references', 'requires', 'sequence'];

const STYLE_OPTIONS: Array<{ value: 'straight' | 'elbow' | 'curved'; label: string; icon: string }> = [
  { value: 'straight', label: 'Straight', icon: 'horizontal_rule' },
  { value: 'elbow', label: 'Elbow', icon: 'turn_right' },
  { value: 'curved', label: 'Curved', icon: 'gesture' },
];

const COLOR_PRESETS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export interface ConnectionEditPanelProps {
  connection: Connection;
  position: { x: number; y: number };
  onUpdate: (connId: string, updates: Partial<Connection>) => void;
  onDelete: (connId: string) => void;
  onClose: () => void;
  cx: { surface: string; text: string; accent: string };
  fieldMode: boolean;
}

export const ConnectionEditPanel: React.FC<ConnectionEditPanelProps> = ({
  connection,
  position,
  onUpdate,
  onDelete,
  onClose,
  cx: _cx,
  fieldMode,
}) => {
  const [label, setLabel] = useState(connection.label || '');

  const bgClass = fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black/10';
  const textClass = fieldMode ? 'text-nb-black/20' : 'text-nb-black/80';

  return (
    <div
      className={`absolute z-50 border shadow-brutal p-3 min-w-[240px] space-y-3 ${bgClass}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-wide ${textClass}`}>Edit Connection</span>
        <Button variant="ghost" size="bare" onClick={onClose} className={`p-0.5 ${textClass}`}>
          <Icon name="close" className="text-sm" />
        </Button>
      </div>

      {/* Connection type */}
      <div className="space-y-1">
        <label className={`text-[10px] font-bold uppercase tracking-wide ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>Type</label>
        <div className="flex flex-wrap gap-1">
          {CONNECTION_TYPES.map(t => (
            <ConnectionTypeBadge
              key={t}
              type={t}
              selected={connection.type === t}
              clickable
              onClick={() => onUpdate(connection.id, { type: t })}
              cx={_cx}
              fieldMode={fieldMode}
            />
          ))}
        </div>
      </div>

      {/* Label input */}
      <div className="space-y-1">
        <label className={`text-[10px] font-bold uppercase tracking-wide ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>Label</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={() => onUpdate(connection.id, { label: label || undefined })}
          className={`w-full px-2 py-1 text-xs border ${fieldMode ? 'bg-nb-black/80 border-nb-black/60 text-nb-black/20' : 'bg-nb-white border-nb-black/10 text-nb-black/80'}`}
          placeholder="Connection label..."
        />
      </div>

      {/* Style radio */}
      <div className="space-y-1">
        <label className={`text-[10px] font-bold uppercase tracking-wide ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>Style</label>
        <div className="flex gap-1">
          {STYLE_OPTIONS.map(opt => (
            <Button variant="ghost" size="bare"
              key={opt.value}
              onClick={() => onUpdate(connection.id, { style: opt.value })}
              className={`flex items-center gap-1 px-2 py-1 text-[10px] border ${
                connection.style === opt.value || (!connection.style && opt.value === 'straight')
                  ? fieldMode ? 'border-nb-yellow bg-nb-yellow/10 text-nb-yellow' : 'border-nb-blue bg-nb-blue/10 text-nb-blue'
                  : fieldMode ? 'border-nb-black/60 text-nb-black/40' : 'border-nb-black/10 text-nb-black/50'
              }`}
            >
              <Icon name={opt.icon} className="text-xs" />
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Color palette */}
      <div className="space-y-1">
        <label className={`text-[10px] font-bold uppercase tracking-wide ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>Color</label>
        <div className="flex gap-1.5">
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              onClick={() => onUpdate(connection.id, { color: c })}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                connection.color === c ? 'border-nb-white scale-125 ring-1 ring-nb-black/30' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          {/* Reset color button */}
          <button
            onClick={() => onUpdate(connection.id, { color: undefined })}
            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
              !connection.color ? 'border-nb-black/40' : 'border-nb-black/10'
            }`}
            title="Default"
          >
            <Icon name="format_color_reset" className="text-[10px]" />
          </button>
        </div>
      </div>

      {/* Delete button */}
      <div className="pt-1 border-t border-nb-black/10">
        <Button variant="ghost" size="bare"
          onClick={() => onDelete(connection.id)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-nb-red hover:bg-nb-red/10 w-full"
        >
          <Icon name="delete" className="text-sm" />
          Delete Connection
        </Button>
      </div>
    </div>
  );
};
