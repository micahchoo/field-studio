import React, { useState } from 'react';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { ConnectionType } from '@/src/shared/types';

interface BoardItem {
  id: string;
  resourceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  resourceType: string;
  label: string;
  isNote?: boolean;
  isMetadataNode?: boolean;
  locked?: boolean;
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: ConnectionType;
  label?: string;
  style?: 'straight' | 'elbow' | 'curved';
  color?: string;
  direction?: 'auto' | 'horizontal-first' | 'vertical-first';
  purpose?: string;
  displayMode?: 'none' | 'purpose-only' | 'full';
}

interface BoardDesignPanelProps {
  activeItem: BoardItem | null;
  activeConnection: Connection | null;
  items?: BoardItem[]; // For auto-summary
  onAlignItem: (id: string, alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v') => void;
  onReorderItem: (id: string, direction: 'forward' | 'backward') => void;
  onDuplicateItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem?: (id: string, updates: Partial<BoardItem>) => void;
  onUpdateConnection: (id: string, updates: Partial<Connection>) => void;
  onDeleteConnection: (id: string) => void;
  onStraightenConnection?: (id: string) => void;
  fieldMode?: boolean;
}

const CONNECTION_STYLES: Array<{ value: Connection['style']; label: string; icon: string }> = [
  { value: 'straight', label: 'Straight', icon: 'horizontal_rule' },
  { value: 'elbow', label: 'Elbow', icon: 'turn_right' },
  { value: 'curved', label: 'Curved', icon: 'gesture' },
];

// Colors mapped to IIIF motivations
const CONNECTION_COLORS = [
  { value: '#3b82f6', label: 'Blue', purpose: 'linking' },
  { value: '#10b981', label: 'Green', purpose: 'commenting' },
  { value: '#f59e0b', label: 'Amber', purpose: 'describing' },
  { value: '#8b5cf6', label: 'Purple', purpose: 'tagging' },
  { value: '#ec4899', label: 'Pink', purpose: 'identifying' },
  { value: '#6b7280', label: 'Gray', purpose: null },
];

// IIIF Web Annotation motivations
const CONNECTION_PURPOSES = [
  { value: 'linking', label: 'Links to', color: '#3b82f6' },
  { value: 'commenting', label: 'Comments on', color: '#10b981' },
  { value: 'describing', label: 'Describes', color: '#f59e0b' },
  { value: 'tagging', label: 'Tags', color: '#8b5cf6' },
  { value: 'identifying', label: 'Identifies', color: '#ec4899' },
];

const DISPLAY_MODES = [
  { value: 'none', label: 'Hidden' },
  { value: 'purpose-only', label: 'Purpose Only' },
  { value: 'full', label: 'Full Label' },
];

export const BoardDesignPanel: React.FC<BoardDesignPanelProps> = ({
  activeItem,
  activeConnection,
  items = [],
  onAlignItem,
  onReorderItem,
  onDuplicateItem,
  onDeleteItem,
  onUpdateItem,
  onUpdateConnection,
  onDeleteConnection,
  onStraightenConnection,
  fieldMode = false,
}) => {
  const [localWidth, setLocalWidth] = useState(activeItem?.w.toString() || '');
  const [localHeight, setLocalHeight] = useState(activeItem?.h.toString() || '');

  // Update local state when activeItem changes
  React.useEffect(() => {
    if (activeItem) {
      setLocalWidth(activeItem.w.toString());
      setLocalHeight(activeItem.h.toString());
    }
  }, [activeItem?.id, activeItem?.w, activeItem?.h]);

  const bgClass = fieldMode ? 'bg-black' : 'bg-white';
  const textClass = fieldMode ? 'text-white' : 'text-slate-800';
  const labelClass = fieldMode ? 'text-slate-500' : 'text-slate-400';
  const btnClass = fieldMode
    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800'
    : 'bg-slate-50 hover:bg-slate-100 border-slate-200';
  const inputClass = fieldMode
    ? 'bg-slate-900 border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-800';
  const dangerClass = fieldMode
    ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
    : 'bg-red-50 hover:bg-red-100 text-red-600';

  // Get connection summary for auto-summary
  const getConnectionSummary = () => {
    if (!activeConnection) return null;
    const fromItem = items.find(i => i.id === activeConnection.fromId);
    const toItem = items.find(i => i.id === activeConnection.toId);
    if (!fromItem || !toItem) return null;
    const purposeLabel = CONNECTION_PURPOSES.find(p => p.value === activeConnection.purpose)?.label || 'links to';
    return { from: fromItem.label, to: toItem.label, purpose: purposeLabel };
  };

  const handleDimensionChange = (dim: 'w' | 'h', value: string) => {
    if (dim === 'w') setLocalWidth(value);
    else setLocalHeight(value);

    const numVal = parseInt(value, 10);
    if (!isNaN(numVal) && numVal > 0 && onUpdateItem && activeItem) {
      onUpdateItem(activeItem.id, { [dim]: numVal });
    }
  };

  // Auto-assign color based on purpose
  const handlePurposeChange = (purpose: string) => {
    const purposeConfig = CONNECTION_PURPOSES.find(p => p.value === purpose);
    onUpdateConnection(activeConnection!.id, {
      purpose,
      color: purposeConfig?.color || activeConnection?.color
    });
  };

  return (
    <div className={`p-4 space-y-6 ${bgClass} ${textClass}`}>
      {activeItem && (
        <>
          {/* Dimensions Section */}
          <div>
            <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
              Dimensions
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`text-[9px] ${labelClass} mb-1 block`}>Width</label>
                <input
                  type="number"
                  value={localWidth}
                  onChange={(e) => handleDimensionChange('w', e.target.value)}
                  className={`w-full p-2 rounded-lg text-xs border ${inputClass}`}
                  min="50"
                  step="10"
                />
              </div>
              <div>
                <label className={`text-[9px] ${labelClass} mb-1 block`}>Height</label>
                <input
                  type="number"
                  value={localHeight}
                  onChange={(e) => handleDimensionChange('h', e.target.value)}
                  className={`w-full p-2 rounded-lg text-xs border ${inputClass}`}
                  min="50"
                  step="10"
                />
              </div>
            </div>
          </div>

          {/* Alignment Section */}
          <div>
            <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
              Alignment
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onAlignItem(activeItem.id, 'center-h')}
                className={`p-2 rounded-lg text-xs flex items-center justify-center gap-2 border transition-colors ${btnClass}`}
              >
                <Icon name="align_horizontal_center" className="text-sm"/> Center H
              </button>
              <button
                onClick={() => onAlignItem(activeItem.id, 'center-v')}
                className={`p-2 rounded-lg text-xs flex items-center justify-center gap-2 border transition-colors ${btnClass}`}
              >
                <Icon name="align_vertical_center" className="text-sm"/> Center V
              </button>
            </div>
          </div>

          {/* Z-Order Section */}
          <div>
            <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
              Layer Order
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onReorderItem(activeItem.id, 'forward')}
                className={`p-2 rounded-lg text-xs flex items-center justify-center gap-2 border transition-colors ${btnClass}`}
              >
                <Icon name="flip_to_front" className="text-sm"/> Bring Forward
              </button>
              <button
                onClick={() => onReorderItem(activeItem.id, 'backward')}
                className={`p-2 rounded-lg text-xs flex items-center justify-center gap-2 border transition-colors ${btnClass}`}
              >
                <Icon name="flip_to_back" className="text-sm"/> Send Back
              </button>
            </div>
          </div>

          {/* Lock Position (optional) */}
          {onUpdateItem && (
            <div>
              <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${btnClass}`}>
                <input
                  type="checkbox"
                  checked={activeItem.locked || false}
                  onChange={(e) => onUpdateItem(activeItem.id, { locked: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <div className="flex-1">
                  <div className={`text-xs font-medium ${textClass}`}>Lock Position</div>
                  <div className={`text-[9px] ${labelClass}`}>Prevent accidental moves</div>
                </div>
                <Icon name={activeItem.locked ? 'lock' : 'lock_open'} className={`text-sm ${labelClass}`} />
              </label>
            </div>
          )}

          {/* Actions Section */}
          <div>
            <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
              Actions
            </label>
            <div className="space-y-2">
              <button
                onClick={() => onDuplicateItem(activeItem.id)}
                className={`w-full p-2 rounded-lg text-xs flex items-center justify-center gap-2 border transition-colors ${btnClass}`}
              >
                <Icon name="content_copy" className="text-sm"/> Duplicate
              </button>
              <button
                onClick={() => onDeleteItem(activeItem.id)}
                className={`w-full p-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors ${dangerClass}`}
              >
                <Icon name="delete" className="text-sm"/> Delete
              </button>
            </div>
          </div>
        </>
      )}

      {activeConnection && (
        <>
          {/* Auto-Summary */}
          {(() => {
            const summary = getConnectionSummary();
            if (!summary) return null;
            return (
              <div className={`p-3 rounded-xl border ${fieldMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className={`text-[9px] font-black uppercase tracking-widest mb-2 ${labelClass}`}>
                  Connection Summary
                </div>
                <div className={`text-sm ${textClass}`}>
                  <span className="font-bold">{summary.from}</span>
                  <span className="mx-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase" style={{ backgroundColor: activeConnection.color || '#3b82f6', color: '#fff' }}>
                    {summary.purpose}
                  </span>
                  <span className="font-bold">{summary.to}</span>
                </div>
              </div>
            );
          })()}

          {/* Connection Style */}
          <div>
            <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
              Line Style
            </label>
            <div className="flex gap-1">
              {CONNECTION_STYLES.map(style => (
                <button
                  key={style.value}
                  onClick={() => onUpdateConnection(activeConnection.id, { style: style.value })}
                  className={`flex-1 p-2 rounded-lg text-xs flex flex-col items-center justify-center gap-1 border transition-colors ${
                    (activeConnection.style || 'elbow') === style.value
                      ? (fieldMode ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'bg-blue-50 border-blue-500 text-blue-600')
                      : btnClass
                  }`}
                  title={style.label}
                >
                  <Icon name={style.icon} className="text-lg"/>
                  <span className="text-[9px]">{style.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Direction (for elbow style) */}
          {(activeConnection.style === 'elbow' || !activeConnection.style) && (
            <div>
              <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
                Direction
              </label>
              <div className="flex gap-1">
                {(['auto', 'horizontal-first', 'vertical-first'] as const).map(dir => (
                  <button
                    key={dir}
                    onClick={() => onUpdateConnection(activeConnection.id, { direction: dir })}
                    className={`flex-1 p-2 rounded-lg text-[9px] text-center border transition-colors ${
                      (activeConnection.direction || 'auto') === dir
                        ? (fieldMode ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'bg-blue-50 border-blue-500 text-blue-600')
                        : btnClass
                    }`}
                  >
                    {dir === 'auto' ? 'Auto' : dir === 'horizontal-first' ? 'H First' : 'V First'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Connection Purpose (IIIF motivation) */}
          <div>
            <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
              Purpose (IIIF Motivation)
            </label>
            <div className="space-y-2">
              {CONNECTION_PURPOSES.map(purpose => (
                <button
                  key={purpose.value}
                  onClick={() => handlePurposeChange(purpose.value)}
                  className={`w-full p-2 rounded-lg text-xs flex items-center gap-3 border transition-colors ${
                    activeConnection.purpose === purpose.value
                      ? (fieldMode ? 'bg-yellow-400/20 border-yellow-400' : 'bg-blue-50 border-blue-500')
                      : btnClass
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: purpose.color }}
                  />
                  <span className={activeConnection.purpose === purpose.value ? (fieldMode ? 'text-yellow-400' : 'text-blue-600') : textClass}>
                    {purpose.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Display Mode */}
          <div>
            <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
              Label Display
            </label>
            <div className="flex gap-1">
              {DISPLAY_MODES.map(mode => (
                <button
                  key={mode.value}
                  onClick={() => onUpdateConnection(activeConnection.id, { displayMode: mode.value as Connection['displayMode'] })}
                  className={`flex-1 p-2 rounded-lg text-[9px] text-center border transition-colors ${
                    (activeConnection.displayMode || 'full') === mode.value
                      ? (fieldMode ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'bg-blue-50 border-blue-500 text-blue-600')
                      : btnClass
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Connection Color (manual override) */}
          <div>
            <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
              Color Override
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {CONNECTION_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => onUpdateConnection(activeConnection.id, { color: color.value })}
                  className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                    activeConnection.color === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                  style={{ backgroundColor: color.value, borderColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Connection Actions */}
          <div>
            <label className={`text-[10px] font-black uppercase mb-2 block tracking-widest ${labelClass}`}>
              Actions
            </label>
            <div className="space-y-2">
              {onStraightenConnection && (
                <button
                  onClick={() => onStraightenConnection(activeConnection.id)}
                  className={`w-full p-2 rounded-lg text-xs flex items-center justify-center gap-2 border transition-colors ${btnClass}`}
                >
                  <Icon name="straighten" className="text-sm"/> Straighten (Remove Waypoints)
                </button>
              )}
              <button
                onClick={() => onDeleteConnection(activeConnection.id)}
                className={`w-full p-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors ${dangerClass}`}
              >
                <Icon name="link_off" className="text-sm"/> Remove Connection
              </button>
            </div>
          </div>
        </>
      )}

      {!activeItem && !activeConnection && (
        <div className={`text-center py-8 ${labelClass}`}>
          <Icon name="touch_app" className="text-4xl mb-2 opacity-50"/>
          <p className="text-xs">Select an item or connection to edit its design properties</p>
        </div>
      )}
    </div>
  );
};

export default BoardDesignPanel;
