
import React, { useState, useCallback, useMemo } from 'react';
import { IIIFRange, IIIFManifest, IIIFCanvas, IIIFRangeReference, getIIIFValue } from '../types';
import { Icon } from './Icon';
import { RESOURCE_TYPE_CONFIG } from '../constants';
import { resolveThumbUrl } from '../utils/imageSourceResolver';
import { createRange, flattenRangeCanvasIds } from '../utils/iiifHierarchy';

export interface RangeEditorProps {
  manifest: IIIFManifest;
  onUpdateStructures: (structures: IIIFRange[]) => void;
  onClose?: () => void;
  /** Legacy prop for backwards compatibility */
  onUpdate?: (updatedManifest: IIIFManifest) => void;
}

interface EditState {
  editingId: string | null;
  editingLabel: string;
}

export const RangeEditor: React.FC<RangeEditorProps> = ({
  manifest,
  onUpdateStructures,
  onClose,
  onUpdate,
}) => {
  const [structures, setStructures] = useState<IIIFRange[]>(manifest.structures || []);
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
  const [selectedCanvasIds, setSelectedCanvasIds] = useState<Set<string>>(new Set());
  const [editState, setEditState] = useState<EditState>({
    editingId: null,
    editingLabel: '',
  });

  const canvases = manifest.items || [];

  // Get all canvas IDs that are already assigned to ranges
  const assignedCanvasIds = useMemo(() => {
    const ids = new Set<string>();
    structures.forEach(range => {
      flattenRangeCanvasIds(range).forEach(id => ids.add(id));
    });
    return ids;
  }, [structures]);

  const handleCreateRange = useCallback(() => {
    const label = `Chapter ${structures.length + 1}`;
    const canvasIds = Array.from(selectedCanvasIds);
    const newRange = createRange(label, canvasIds);

    const newStructures = [...structures, newRange];
    setStructures(newStructures);
    setSelectedCanvasIds(new Set());
    setSelectedRangeId(newRange.id);
  }, [structures, selectedCanvasIds]);

  const handleDeleteRange = useCallback((rangeId: string) => {
    const removeRange = (ranges: IIIFRange[]): IIIFRange[] => {
      return ranges.filter(r => {
        if (r.id === rangeId) return false;
        if (r.items) {
          r.items = r.items.filter(item => {
            if ('type' in item && item.type === 'Range' && (item as IIIFRange).id === rangeId) return false;
            return true;
          });
        }
        return true;
      });
    };

    const newStructures = removeRange(structures);
    setStructures(newStructures);
    if (selectedRangeId === rangeId) {
      setSelectedRangeId(null);
    }
  }, [structures, selectedRangeId]);

  const handleUpdateRangeLabel = useCallback((rangeId: string, newLabel: string) => {
    const updateLabel = (ranges: IIIFRange[]): IIIFRange[] => {
      return ranges.map(r => {
        if (r.id === rangeId) {
          return { ...r, label: { none: [newLabel] } };
        }
        if (r.items) {
          const updatedItems = r.items.map(item => {
            if ('type' in item && item.type === 'Range') {
              return updateLabel([item as IIIFRange])[0];
            }
            return item;
          });
          return { ...r, items: updatedItems };
        }
        return r;
      });
    };

    setStructures(updateLabel(structures));
    setEditState({ editingId: null, editingLabel: '' });
  }, [structures]);

  const handleAddCanvasesToRange = useCallback((rangeId: string, canvasIds: string[]) => {
    const addCanvases = (ranges: IIIFRange[]): IIIFRange[] => {
      return ranges.map(r => {
        if (r.id === rangeId) {
          const existingIds = new Set(r.items?.filter(i => 'id' in i).map(i => (i as IIIFRangeReference).id) || []);
          const newItems = canvasIds
            .filter(id => !existingIds.has(id))
            .map(id => ({ id, type: 'Canvas' as const }));
          return { ...r, items: [...(r.items || []), ...newItems] };
        }
        if (r.items) {
          const updatedItems = r.items.map(item => {
            if ('type' in item && item.type === 'Range') {
              return addCanvases([item as IIIFRange])[0];
            }
            return item;
          });
          return { ...r, items: updatedItems };
        }
        return r;
      });
    };

    setStructures(addCanvases(structures));
    setSelectedCanvasIds(new Set());
  }, [structures]);

  const handleRemoveCanvasFromRange = useCallback((rangeId: string, canvasId: string) => {
    const removeCanvas = (ranges: IIIFRange[]): IIIFRange[] => {
      return ranges.map(r => {
        if (r.id === rangeId) {
          return {
            ...r,
            items: r.items?.filter(item => {
              if ('id' in item && item.id === canvasId) return false;
              return true;
            })
          };
        }
        if (r.items) {
          const updatedItems = r.items.map(item => {
            if ('type' in item && item.type === 'Range') {
              return removeCanvas([item as IIIFRange])[0];
            }
            return item;
          });
          return { ...r, items: updatedItems };
        }
        return r;
      });
    };

    setStructures(removeCanvas(structures));
  }, [structures]);

  const handleSetRegion = useCallback((rangeId: string, canvasId: string) => {
    const xywh = prompt("Enter region (x,y,w,h):", "0,0,500,500");
    if (!xywh) return;

    const updateRegion = (ranges: IIIFRange[]): IIIFRange[] => {
      return ranges.map(r => {
        if (r.id === rangeId) {
          return {
            ...r,
            items: r.items?.map(item => {
              if ('id' in item && item.id === canvasId && item.type === 'Canvas') {
                return {
                  type: "SpecificResource" as const,
                  source: item.id,
                  selector: { type: "FragmentSelector" as const, value: `xywh=${xywh}` }
                };
              }
              return item;
            })
          };
        }
        if (r.items) {
          const updatedItems = r.items.map(item => {
            if ('type' in item && item.type === 'Range') {
              return updateRegion([item as IIIFRange])[0];
            }
            return item;
          });
          return { ...r, items: updatedItems };
        }
        return r;
      });
    };

    setStructures(updateRegion(structures));
  }, [structures]);

  const handleSave = useCallback(() => {
    if (onUpdateStructures) {
      onUpdateStructures(structures);
    }
    // Legacy support
    if (onUpdate) {
      onUpdate({ ...manifest, structures });
    }
    onClose?.();
  }, [structures, onUpdateStructures, onUpdate, manifest, onClose]);

  const handleCanvasToggle = useCallback((canvasId: string) => {
    setSelectedCanvasIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(canvasId)) {
        newSet.delete(canvasId);
      } else {
        newSet.add(canvasId);
      }
      return newSet;
    });
  }, []);

  const startEditLabel = useCallback((rangeId: string, currentLabel: string) => {
    setEditState({ editingId: rangeId, editingLabel: currentLabel });
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Icon name="segment" className="text-indigo-600" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Table of Contents Editor</h2>
            <p className="text-xs text-slate-500">
              {structures.length} Range{structures.length !== 1 ? 's' : ''} · {canvases.length} Canvases
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-iiif-blue text-white rounded-lg font-bold shadow hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Icon name="save" className="text-sm" /> Save Structures
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Canvas List */}
        <div className="w-72 border-r bg-white flex flex-col">
          <div className="h-10 border-b bg-slate-50 flex items-center justify-between px-3 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Canvases</span>
            {selectedCanvasIds.size > 0 && (
              <span className="text-[10px] font-bold text-iiif-blue">
                {selectedCanvasIds.size} selected
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {canvases.map((canvas, index) => {
              const thumbUrl = resolveThumbUrl(canvas, 60);
              const label = getIIIFValue(canvas.label) || `Canvas ${index + 1}`;
              const isSelected = selectedCanvasIds.has(canvas.id);
              const isAssigned = assignedCanvasIds.has(canvas.id);

              return (
                <div
                  key={canvas.id}
                  onClick={() => handleCanvasToggle(canvas.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all mb-1 ${
                    isSelected
                      ? 'bg-iiif-blue/10 border border-iiif-blue'
                      : isAssigned
                        ? 'bg-slate-50 border border-slate-200 opacity-50'
                        : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden shrink-0">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Icon name="image" className="text-xs" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{label}</p>
                    <p className="text-[10px] text-slate-400">{index + 1}</p>
                  </div>
                  {isAssigned && (
                    <Icon name="check" className="text-green-500 text-sm" />
                  )}
                  {isSelected && !isAssigned && (
                    <div className="w-4 h-4 bg-iiif-blue rounded-full flex items-center justify-center">
                      <Icon name="check" className="text-white text-[10px]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add to Range button */}
          {selectedCanvasIds.size > 0 && (
            <div className="p-3 border-t bg-slate-50 shrink-0">
              {selectedRangeId ? (
                <button
                  onClick={() => handleAddCanvasesToRange(selectedRangeId, Array.from(selectedCanvasIds))}
                  className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="add" className="text-sm" /> Add to Selected Range
                </button>
              ) : (
                <button
                  onClick={handleCreateRange}
                  className="w-full px-3 py-2 bg-iiif-blue text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="add" className="text-sm" /> Create New Range
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Panel - Range Tree */}
        <div className="flex-1 flex flex-col bg-slate-100">
          <div className="h-10 border-b bg-white flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Table of Contents</span>
            <button
              onClick={() => {
                const newRange = createRange(`Chapter ${structures.length + 1}`, []);
                setStructures([...structures, newRange]);
              }}
              className="text-xs font-bold text-iiif-blue hover:text-blue-700 flex items-center gap-1"
            >
              <Icon name="add" className="text-sm" /> Add Range
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {structures.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Icon name="segment" className="text-4xl mb-2" />
                <p className="text-sm font-medium">No Table of Contents yet</p>
                <p className="text-xs mt-1">Select canvases and create ranges to build your ToC</p>
              </div>
            ) : (
              <div className="space-y-2">
                {structures.map((range, index) => (
                  <RangeNode
                    key={range.id}
                    range={range}
                    index={index}
                    level={0}
                    isSelected={selectedRangeId === range.id}
                    editState={editState}
                    canvases={canvases}
                    onSelect={() => setSelectedRangeId(selectedRangeId === range.id ? null : range.id)}
                    onDelete={() => handleDeleteRange(range.id)}
                    onStartEdit={startEditLabel}
                    onUpdateLabel={handleUpdateRangeLabel}
                    onRemoveCanvas={handleRemoveCanvasFromRange}
                    onSetRegion={handleSetRegion}
                    setEditState={setEditState}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Help */}
          <div className="p-3 border-t bg-white text-xs text-slate-500 shrink-0">
            <div className="flex items-center gap-2">
              <Icon name="info" className="text-slate-400" />
              <span>
                <strong>Ranges</strong> define sections in your Table of Contents. Click to select, double-click to rename. Use "Define Region" for partial canvas references.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Range Node Component
interface RangeNodeProps {
  range: IIIFRange;
  index: number;
  level: number;
  isSelected: boolean;
  editState: EditState;
  canvases: IIIFCanvas[];
  onSelect: () => void;
  onDelete: () => void;
  onStartEdit: (id: string, label: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onRemoveCanvas: (rangeId: string, canvasId: string) => void;
  onSetRegion: (rangeId: string, canvasId: string) => void;
  setEditState: (state: EditState) => void;
}

const RangeNode: React.FC<RangeNodeProps> = ({
  range,
  index,
  level,
  isSelected,
  editState,
  canvases,
  onSelect,
  onDelete,
  onStartEdit,
  onUpdateLabel,
  onRemoveCanvas,
  onSetRegion,
  setEditState,
}) => {
  const [expanded, setExpanded] = useState(true);
  const label = getIIIFValue(range.label) || `Range ${index + 1}`;
  const isEditing = editState.editingId === range.id;

  // Get canvas items and nested ranges
  const items = range.items || [];
  const canvasRefs = items.filter(item => {
    if ('type' in item && item.type === 'Canvas') return true;
    if ('type' in item && item.type === 'SpecificResource') return true;
    return false;
  });
  const nestedRanges = items.filter(item => 'type' in item && item.type === 'Range') as IIIFRange[];

  const getCanvasId = (item: any): string => {
    if (item.type === 'SpecificResource') return item.source;
    return item.id;
  };

  const getRegion = (item: any): string | null => {
    if (item.type === 'SpecificResource' && item.selector?.value) {
      return item.selector.value;
    }
    return null;
  };

  const getCanvasLabel = (canvasId: string) => {
    const canvas = canvases.find(c => c.id === canvasId);
    return canvas ? getIIIFValue(canvas.label) || `Canvas` : 'Unknown';
  };

  const getCanvasIndex = (canvasId: string) => {
    const idx = canvases.findIndex(c => c.id === canvasId);
    return idx >= 0 ? idx + 1 : '?';
  };

  return (
    <div style={{ marginLeft: level * 16 }} className="mb-1">
      {/* Range Header */}
      <div
        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
          isSelected ? 'bg-indigo-100 border border-indigo-300' : 'bg-white border border-slate-200 hover:border-slate-300'
        }`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-0.5 hover:bg-slate-200 rounded"
        >
          <Icon name={expanded ? 'expand_more' : 'chevron_right'} className="text-sm text-slate-400" />
        </button>

        <Icon name="segment" className={`text-lg ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />

        {isEditing ? (
          <input
            type="text"
            value={editState.editingLabel}
            onChange={(e) => setEditState({ ...editState, editingLabel: e.target.value })}
            onBlur={() => onUpdateLabel(range.id, editState.editingLabel)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateLabel(range.id, editState.editingLabel);
              } else if (e.key === 'Escape') {
                setEditState({ editingId: null, editingLabel: '' });
              }
            }}
            className="flex-1 text-sm font-medium bg-white border border-indigo-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-200"
            autoFocus
          />
        ) : (
          <span
            className="flex-1 text-sm font-medium text-slate-700 cursor-pointer hover:text-indigo-600"
            onClick={onSelect}
            onDoubleClick={() => onStartEdit(range.id, label)}
          >
            {label}
          </span>
        )}

        <span className="text-[10px] text-slate-400">
          {canvasRefs.length} canvas{canvasRefs.length !== 1 ? 'es' : ''}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors"
          title="Delete range"
        >
          <Icon name="delete" className="text-sm" />
        </button>
      </div>

      {/* Children */}
      {expanded && (canvasRefs.length > 0 || nestedRanges.length > 0) && (
        <div className="ml-6 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
          {/* Canvas References */}
          {canvasRefs.map((item: any, idx) => {
            const canvasId = getCanvasId(item);
            const region = getRegion(item);
            const canvas = canvases.find(c => c.id === canvasId);
            const thumbUrl = canvas ? resolveThumbUrl(canvas, 40) : null;

            return (
              <div
                key={`${canvasId}-${idx}`}
                className="flex items-center gap-2 p-1.5 rounded bg-slate-50 group"
              >
                <div className="w-6 h-6 rounded bg-slate-200 overflow-hidden shrink-0">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Icon name="image" className="text-[10px]" />
                    </div>
                  )}
                </div>
                <span className="text-xs text-slate-600 flex-1 truncate">
                  {getCanvasLabel(canvasId)}
                </span>
                {region && (
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-mono">
                    {region}
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">
                  #{getCanvasIndex(canvasId)}
                </span>
                <button
                  onClick={() => onSetRegion(range.id, canvasId)}
                  className="p-0.5 text-slate-300 hover:text-iiif-blue opacity-0 group-hover:opacity-100 transition-all"
                  title="Define region (xywh)"
                >
                  <Icon name="crop" className="text-xs" />
                </button>
                <button
                  onClick={() => onRemoveCanvas(range.id, canvasId)}
                  className="p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove from range"
                >
                  <Icon name="close" className="text-xs" />
                </button>
              </div>
            );
          })}

          {/* Nested Ranges */}
          {nestedRanges.map((nestedRange, nestedIndex) => (
            <RangeNode
              key={nestedRange.id}
              range={nestedRange}
              index={nestedIndex}
              level={0}
              isSelected={false}
              editState={editState}
              canvases={canvases}
              onSelect={() => {}}
              onDelete={() => {}}
              onStartEdit={onStartEdit}
              onUpdateLabel={onUpdateLabel}
              onRemoveCanvas={onRemoveCanvas}
              onSetRegion={onSetRegion}
              setEditState={setEditState}
            />
          ))}
        </div>
      )}
    </div>
  );
};
