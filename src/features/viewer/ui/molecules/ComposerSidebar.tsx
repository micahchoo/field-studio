/**
 * ComposerSidebar Molecule
 *
 * Sidebar for the canvas composer with layers and library tabs.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Composes atoms (Button, Input, Slider)
 * - No domain logic, only UI state
 * - Props-driven, no hooks
 */

import React from 'react';
import { Icon } from '@/components/Icon';
import { getIIIFValue, type IIIFItem } from '@/types';
import type { PlacedResource } from '@/hooks/useLayerHistory';

export type SidebarTab = 'layers' | 'library';

export interface ComposerSidebarProps {
  /** Current tab */
  activeTab: SidebarTab;
  /** List of layers */
  layers: PlacedResource[];
  /** Currently active layer ID */
  activeLayerId: string | null;
  /** Root item for library */
  root?: IIIFItem | null;
  /** Callback when tab changes */
  onTabChange: (tab: SidebarTab) => void;
  /** Callback when layer is selected */
  onLayerSelect: (id: string) => void;
  /** Callback when layer is removed */
  onLayerRemove: (id: string) => void;
  /** Callback when layer lock is toggled */
  onLayerLockToggle: (id: string) => void;
  /** Callback when layer is moved */
  onLayerMove: (idx: number, dir: 'up' | 'down') => void;
  /** Callback when layer opacity changes */
  onLayerOpacityChange: (id: string, opacity: number) => void;
  /** Callback when layer property changes */
  onLayerPropertyChange: (id: string, prop: string, value: number) => void;
  /** Callback when layer is aligned */
  onLayerAlign: (type: 'center' | 'fill') => void;
  /** Callback when library item is selected */
  onLibraryItemSelect: (item: IIIFItem) => void;
  /** Contextual styles - currently unused but reserved for future fieldMode support */
  cx?: {
    text: string;
    textMuted: string;
    active: string;
    surface: string;
  };
}

/**
 * ComposerSidebar Molecule
 */
export const ComposerSidebar: React.FC<ComposerSidebarProps> = ({
  activeTab,
  layers,
  activeLayerId,
  root,
  onTabChange,
  onLayerSelect,
  onLayerRemove,
  onLayerLockToggle,
  onLayerMove,
  onLayerOpacityChange,
  onLayerPropertyChange,
  onLayerAlign,
  onLibraryItemSelect,
  cx,
}) => {
  return (
    <div className="w-80 bg-slate-900 border-r border-white/10 flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => onTabChange('layers')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${
            activeTab === 'layers'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-white/40'
          }`}
        >
          Layers
        </button>
        <button
          onClick={() => onTabChange('library')}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest ${
            activeTab === 'library'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-white/40'
          }`}
        >
          Library
        </button>
      </div>

      {/* Content */}
      {activeTab === 'layers' ? (
        <div
          className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
          role="list"
          aria-label="Resource Layers"
        >
          {layers.length === 0 ? (
            <div className="text-center py-20 text-slate-600 italic text-sm">
              No items on canvas.
            </div>
          ) : (
            layers.map((layer, idx) => (
              <div
                key={layer.id}
                role="listitem"
                tabIndex={0}
                aria-selected={activeLayerId === layer.id}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLayerSelect(layer.id);
                  }
                }}
                onClick={() => onLayerSelect(layer.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer group outline-none focus:ring-2 focus:ring-indigo-500 ${
                  activeLayerId === layer.id
                    ? 'bg-indigo-600/20 border-indigo-500'
                    : 'bg-white/5 border-white/5 hover:border-white/20'
                }`}
              >
                {/* Layer Header */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-bold text-white truncate max-w-[140px]">
                    {getIIIFValue(layer.resource.label, 'none') || 'Untitled'}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerLockToggle(layer.id);
                      }}
                      className={`p-1 rounded ${
                        layer.locked ? 'text-indigo-400' : 'text-white/20'
                      }`}
                      title="Lock Layer"
                      aria-label={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      <Icon
                        name={layer.locked ? 'lock' : 'lock_open'}
                        className="text-[14px]"
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerMove(idx, 'down');
                      }}
                      className="p-1 hover:bg-white/10 rounded"
                      title="Move Back"
                      aria-label="Move Layer Back"
                    >
                      <Icon name="arrow_downward" className="text-[14px]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerMove(idx, 'up');
                      }}
                      className="p-1 hover:bg-white/10 rounded"
                      title="Move Forward"
                      aria-label="Move Layer Forward"
                    >
                      <Icon name="arrow_upward" className="text-[14px]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerRemove(layer.id);
                      }}
                      className="p-1 hover:bg-red-500 text-white rounded"
                      title="Remove Layer"
                      aria-label="Remove Layer"
                    >
                      <Icon name="delete" className="text-[14px]" />
                    </button>
                  </div>
                </div>

                {/* Layer Properties */}
                <div
                  className={`space-y-3 ${
                    layer.locked ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  {/* Position & Size */}
                  <div className="grid grid-cols-4 gap-1">
                    {['x', 'y', 'w', 'h'].map((f) => (
                      <div key={f} className="space-y-1">
                        <span className="text-[8px] font-black text-white/30 uppercase block">
                          {f}
                        </span>
                        <input
                          type="number"
                          aria-label={`Layer ${f} coordinate`}
                          value={(layer as any)[f]}
                          onChange={(e) =>
                            onLayerPropertyChange(layer.id, f, Number(e.target.value))
                          }
                          className="w-full bg-black/40 text-white text-[10px] border-none rounded p-1 outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Opacity */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-black text-white/30 uppercase">
                      <span>Opacity</span>
                      <span>{Math.round(layer.opacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      aria-label="Layer Opacity"
                      min="0"
                      max="1"
                      step="0.05"
                      value={layer.opacity}
                      onChange={(e) =>
                        onLayerOpacityChange(layer.id, Number(e.target.value))
                      }
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>

                {/* Alignment Actions (only for active layer) */}
                {activeLayerId === layer.id && !layer.locked && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerAlign('center');
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase py-1 rounded"
                    >
                      Center
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerAlign('fill');
                      }}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase py-1 rounded"
                    >
                      Fill
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {root?.items?.map((item: any) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData('application/iiif-item-id', item.id)
              }
              onClick={() => onLibraryItemSelect(item)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer group flex items-center gap-3 border border-transparent hover:border-indigo-500/50"
            >
              <div className="w-10 h-10 bg-black rounded overflow-hidden shrink-0">
                {item.thumbnail?.[0]?.id || item._blobUrl ? (
                  <img
                    src={item.thumbnail?.[0]?.id || item._blobUrl}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                ) : (
                  <Icon name="image" className="text-white/20 m-2" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {getIIIFValue(item.label, 'none') || 'Untitled'}
                </div>
                <div className="text-[10px] text-white/40 truncate">
                  {item.type}
                </div>
              </div>
              <Icon
                name="add_circle"
                className="text-white/20 group-hover:text-indigo-400 ml-auto"
              />
            </div>
          ))}
          {!root && (
            <div className="p-4 text-center text-white/30 text-xs">
              No library source available.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
