/**
 * StructureTabPanel - Range/Structure Editor for IIIF Manifests
 *
 * Provides full CRUD operations for IIIF Ranges (Table of Contents):
 * - Create, edit, delete ranges
 * - Nested range hierarchy with tree UI
 * - Assign canvases to ranges
 * - Drag-drop reordering of range items
 *
 * Conforms to IIIF Presentation 3.0 structures specification.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import {
  AppSettings,
  getIIIFValue,
  IIIFCanvas,
  IIIFManifest,
  IIIFRange,
  IIIFRangeReference,
  LanguageMap
} from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { useContextualStyles } from '@/src/shared/lib/hooks/useContextualStyles';

interface StructureTabPanelProps {
  /** The manifest containing structures */
  manifest: IIIFManifest;
  /** Callback when structure is updated */
  onUpdateManifest: (updates: Partial<IIIFManifest>) => void;
  /** App settings for theming */
  settings: AppSettings;
  /** Available canvases in the manifest */
  canvases: IIIFCanvas[];
}

type RangeItem = IIIFRangeReference | IIIFRange;

interface RangeTreeItemProps {
  range: IIIFRange;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  isSelected: boolean;
  onEdit: () => void;
  onDelete: () => void;
  fieldMode: boolean;
  language: string;
  canvases: IIIFCanvas[];
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
}

/**
 * Single range item in the tree structure
 */
const RangeTreeItem: React.FC<RangeTreeItemProps> = ({
  range,
  depth,
  isExpanded,
  onToggle,
  onSelect,
  isSelected,
  onEdit,
  onDelete,
  fieldMode,
  language,
  canvases,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}) => {
  const label = getIIIFValue(range.label, language) || 'Untitled Range';
  const hasChildren = range.items && range.items.length > 0;
  const nestedRanges = range.items?.filter((item): item is IIIFRange =>
    typeof item !== 'string' && 'type' in item && item.type === 'Range'
  ) || [];
  const canvasRefs = range.items?.filter((item): item is IIIFRangeReference =>
    typeof item !== 'string' && 'type' in item && item.type === 'Canvas'
  ) || [];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`
        transition-colors
        ${isDragOver ? (fieldMode ? 'bg-yellow-500/20' : 'bg-blue-100') : ''}
      `}
    >
      <div
        onClick={onSelect}
        className={`
          flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors
          ${isSelected
            ? (fieldMode ? 'bg-yellow-900/40' : 'bg-blue-100')
            : (fieldMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100')
          }
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse toggle */}
        {hasChildren ? (
          <Button variant="ghost" size="bare"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`p-0.5 rounded ${fieldMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
          >
            <Icon
              name={isExpanded ? 'expand_more' : 'chevron_right'}
              className={`text-sm ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}
            />
          </Button>
        ) : (
          <div className="w-5" />
        )}

        {/* Range Icon */}
        <Icon
          name="segment"
          className={`text-sm ${fieldMode ? 'text-purple-400' : 'text-purple-600'}`}
        />

        {/* Label */}
        <span className={`flex-1 text-xs font-medium truncate ${fieldMode ? 'text-white' : 'text-slate-800'}`}>
          {label}
        </span>

        {/* Item counts */}
        <div className="flex items-center gap-1.5">
          {canvasRefs.length > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
              fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
            }`}>
              {canvasRefs.length} pages
            </span>
          )}
          {nestedRanges.length > 0 && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${
              fieldMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-600'
            }`}>
              {nestedRanges.length} sub
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="bare"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className={`p-1 rounded ${fieldMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}
          >
            <Icon name="edit" className="text-[10px]" />
          </Button>
          <Button variant="ghost" size="bare"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={`p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600`}
          >
            <Icon name="delete" className="text-[10px]" />
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal for creating/editing a range
 */
interface RangeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (label: string, selectedCanvasIds: string[]) => void;
  initialLabel?: string;
  initialCanvasIds?: string[];
  availableCanvases: IIIFCanvas[];
  isEditing: boolean;
  fieldMode: boolean;
  language: string;
}

const RangeEditModal: React.FC<RangeEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLabel = '',
  initialCanvasIds = [],
  availableCanvases,
  isEditing,
  fieldMode,
  language,
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [selectedCanvasIds, setSelectedCanvasIds] = useState<Set<string>>(new Set(initialCanvasIds));

  const toggleCanvas = (id: string) => {
    setSelectedCanvasIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!label.trim()) return;
    onSave(label.trim(), Array.from(selectedCanvasIds));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        relative w-full max-w-lg max-h-[80vh] overflow-hidden rounded-xl shadow-2xl
        ${fieldMode ? 'bg-slate-900 border border-slate-700' : 'bg-white'}
      `}>
        {/* Header */}
        <div className={`
          flex items-center justify-between px-4 py-3 border-b
          ${fieldMode ? 'border-slate-700' : 'border-slate-200'}
        `}>
          <h3 className={`font-bold ${fieldMode ? 'text-white' : 'text-slate-800'}`}>
            {isEditing ? 'Edit Range' : 'Create New Range'}
          </h3>
          <Button variant="ghost" size="bare"
            onClick={onClose}
            className={`p-1 rounded ${fieldMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          >
            <Icon name="close" className={fieldMode ? 'text-slate-400' : 'text-slate-500'} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Label input */}
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
              fieldMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Range Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Chapter 1, Introduction, etc."
              autoFocus
              className={`
                w-full px-3 py-2 rounded-lg text-sm outline-none border
                ${fieldMode
                  ? 'bg-slate-800 text-white border-slate-700 focus:border-yellow-500'
                  : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                }
              `}
            />
          </div>

          {/* Canvas selection */}
          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
              fieldMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Select Pages/Canvases ({selectedCanvasIds.size} selected)
            </label>
            <div className={`
              border rounded-lg max-h-48 overflow-y-auto
              ${fieldMode ? 'border-slate-700' : 'border-slate-200'}
            `}>
              {availableCanvases.map((canvas) => {
                const canvasLabel = getIIIFValue(canvas.label, language) || 'Untitled';
                const isSelected = selectedCanvasIds.has(canvas.id);
                return (
                  <div
                    key={canvas.id}
                    onClick={() => toggleCanvas(canvas.id)}
                    className={`
                      flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b last:border-b-0
                      ${fieldMode
                        ? `border-slate-800 ${isSelected ? 'bg-yellow-900/30' : 'hover:bg-slate-800'}`
                        : `border-slate-100 ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`
                      }
                    `}
                  >
                    <Icon
                      name={isSelected ? 'check_box' : 'check_box_outline_blank'}
                      className={`text-sm ${
                        isSelected
                          ? (fieldMode ? 'text-yellow-400' : 'text-blue-600')
                          : (fieldMode ? 'text-slate-600' : 'text-slate-400')
                      }`}
                    />
                    <Icon name="image" className={`text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className={`text-xs truncate ${fieldMode ? 'text-white' : 'text-slate-700'}`}>
                      {canvasLabel}
                    </span>
                  </div>
                );
              })}
              {availableCanvases.length === 0 && (
                <div className={`p-4 text-center text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  No canvases available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`
          flex items-center justify-end gap-2 px-4 py-3 border-t
          ${fieldMode ? 'border-slate-700' : 'border-slate-200'}
        `}>
          <Button variant="ghost" size="bare"
            onClick={onClose}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${fieldMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }
            `}
          >
            Cancel
          </Button>
          <Button variant="ghost" size="bare"
            onClick={handleSave}
            disabled={!label.trim()}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50
              ${fieldMode
                ? 'bg-yellow-600 text-white hover:bg-yellow-500'
                : 'bg-blue-600 text-white hover:bg-blue-500'
              }
            `}
          >
            {isEditing ? 'Save Changes' : 'Create Range'}
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Structure Tab Panel Component
 */
export const StructureTabPanel: React.FC<StructureTabPanelProps> = ({
  manifest,
  onUpdateManifest,
  settings,
  canvases,
}) => {
  const cx = useContextualStyles(settings.fieldMode);
  const [expandedRanges, setExpandedRanges] = useState<Set<string>>(new Set());
  const [selectedRangeId, setSelectedRangeId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<IIIFRange | null>(null);
  const [dragOverRangeId, setDragOverRangeId] = useState<string | null>(null);
  const [draggedRangeId, setDraggedRangeId] = useState<string | null>(null);

  const structures = manifest.structures || [];

  // Generate unique ID for new ranges
  const generateRangeId = useCallback(() => {
    return `${manifest.id}/range/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, [manifest.id]);

  // Toggle range expansion
  const toggleExpand = useCallback((rangeId: string) => {
    setExpandedRanges(prev => {
      const next = new Set(prev);
      if (next.has(rangeId)) {
        next.delete(rangeId);
      } else {
        next.add(rangeId);
      }
      return next;
    });
  }, []);

  // Create new range
  const handleCreateRange = useCallback((label: string, canvasIds: string[]) => {
    const newRange: IIIFRange = {
      id: generateRangeId(),
      type: 'Range',
      label: { [settings.language]: [label] },
      items: canvasIds.map(id => ({ id, type: 'Canvas' as const })),
    };

    const newStructures = [...structures, newRange];
    onUpdateManifest({ structures: newStructures });
  }, [structures, generateRangeId, settings.language, onUpdateManifest]);

  // Update existing range
  const handleUpdateRange = useCallback((rangeId: string, label: string, canvasIds: string[]) => {
    const updateRangeInList = (ranges: IIIFRange[]): IIIFRange[] => {
      return ranges.map(range => {
        if (range.id === rangeId) {
          // Keep nested ranges, update canvas refs
          const nestedRanges = range.items?.filter((item): item is IIIFRange =>
            typeof item !== 'string' && 'type' in item && item.type === 'Range'
          ) || [];
          const canvasRefs = canvasIds.map(id => ({ id, type: 'Canvas' as const }));

          return {
            ...range,
            label: { [settings.language]: [label] },
            items: [...canvasRefs, ...nestedRanges],
          };
        }
        // Recursively check nested ranges
        if (range.items) {
          const nestedRanges = range.items.filter((item): item is IIIFRange =>
            typeof item !== 'string' && 'type' in item && item.type === 'Range'
          );
          if (nestedRanges.length > 0) {
            const updatedNested = updateRangeInList(nestedRanges);
            const canvasRefs = range.items.filter((item): item is IIIFRangeReference =>
              typeof item !== 'string' && 'type' in item && item.type === 'Canvas'
            );
            return { ...range, items: [...canvasRefs, ...updatedNested] };
          }
        }
        return range;
      });
    };

    const newStructures = updateRangeInList(structures);
    onUpdateManifest({ structures: newStructures });
    setEditingRange(null);
  }, [structures, settings.language, onUpdateManifest]);

  // Delete range
  const handleDeleteRange = useCallback((rangeId: string) => {
    const deleteRangeFromList = (ranges: IIIFRange[]): IIIFRange[] => {
      return ranges
        .filter(range => range.id !== rangeId)
        .map(range => {
          if (range.items) {
            const nestedRanges = range.items.filter((item): item is IIIFRange =>
              typeof item !== 'string' && 'type' in item && item.type === 'Range'
            );
            if (nestedRanges.length > 0) {
              const updatedNested = deleteRangeFromList(nestedRanges);
              const canvasRefs = range.items.filter((item): item is IIIFRangeReference =>
                typeof item !== 'string' && 'type' in item && item.type === 'Canvas'
              );
              return { ...range, items: [...canvasRefs, ...updatedNested] };
            }
          }
          return range;
        });
    };

    const newStructures = deleteRangeFromList(structures);
    onUpdateManifest({ structures: newStructures });
    if (selectedRangeId === rangeId) {
      setSelectedRangeId(null);
    }
  }, [structures, selectedRangeId, onUpdateManifest]);

  // Handle save from modal
  const handleModalSave = useCallback((label: string, canvasIds: string[]) => {
    if (editingRange) {
      handleUpdateRange(editingRange.id, label, canvasIds);
    } else {
      handleCreateRange(label, canvasIds);
    }
    setModalOpen(false);
    setEditingRange(null);
  }, [editingRange, handleCreateRange, handleUpdateRange]);

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, rangeId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', rangeId);
    setDraggedRangeId(rangeId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, rangeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedRangeId !== rangeId) {
      setDragOverRangeId(rangeId);
    }
  }, [draggedRangeId]);

  const handleDrop = useCallback((e: React.DragEvent, targetRangeId: string) => {
    e.preventDefault();
    const sourceRangeId = e.dataTransfer.getData('text/plain');

    if (sourceRangeId === targetRangeId) {
      setDraggedRangeId(null);
      setDragOverRangeId(null);
      return;
    }

    // Reorder top-level structures
    const sourceIndex = structures.findIndex(r => r.id === sourceRangeId);
    const targetIndex = structures.findIndex(r => r.id === targetRangeId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newStructures = [...structures];
      const [removed] = newStructures.splice(sourceIndex, 1);
      newStructures.splice(targetIndex, 0, removed);
      onUpdateManifest({ structures: newStructures });
    }

    setDraggedRangeId(null);
    setDragOverRangeId(null);
  }, [structures, onUpdateManifest]);

  const handleDragEnd = useCallback(() => {
    setDraggedRangeId(null);
    setDragOverRangeId(null);
  }, []);

  // Get canvas IDs from a range
  const getCanvasIdsFromRange = (range: IIIFRange): string[] => {
    return (range.items || [])
      .filter((item): item is IIIFRangeReference =>
        typeof item !== 'string' && 'type' in item && item.type === 'Canvas'
      )
      .map(ref => ref.id);
  };

  // Render range tree recursively
  const renderRanges = (ranges: IIIFRange[], depth: number = 0): React.ReactNode => {
    return ranges.map(range => {
      const nestedRanges = (range.items || []).filter((item): item is IIIFRange =>
        typeof item !== 'string' && 'type' in item && item.type === 'Range'
      );
      const isExpanded = expandedRanges.has(range.id);

      return (
        <div key={range.id} className="group">
          <RangeTreeItem
            range={range}
            depth={depth}
            isExpanded={isExpanded}
            onToggle={() => toggleExpand(range.id)}
            onSelect={() => setSelectedRangeId(range.id === selectedRangeId ? null : range.id)}
            isSelected={selectedRangeId === range.id}
            onEdit={() => { setEditingRange(range); setModalOpen(true); }}
            onDelete={() => handleDeleteRange(range.id)}
            fieldMode={settings.fieldMode}
            language={settings.language}
            canvases={canvases}
            onDragStart={(e) => handleDragStart(e, range.id)}
            onDragOver={(e) => handleDragOver(e, range.id)}
            onDrop={(e) => handleDrop(e, range.id)}
            isDragOver={dragOverRangeId === range.id}
          />
          {isExpanded && nestedRanges.length > 0 && (
            <div onDragEnd={handleDragEnd}>
              {renderRanges(nestedRanges, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className={`p-3 rounded-lg border ${cx.surface} ${cx.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="account_tree" className={`text-sm ${settings.fieldMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <span className={`text-xs font-bold uppercase ${settings.fieldMode ? 'text-purple-400' : 'text-purple-600'}`}>
              Table of Contents
            </span>
          </div>
          <span className={`text-[10px] ${cx.textMuted}`}>
            {structures.length} {structures.length === 1 ? 'range' : 'ranges'}
          </span>
        </div>
        <p className={`text-[10px] mt-1 ${cx.textMuted}`}>
          Define structural divisions like chapters, sections, or groups
        </p>
      </div>

      {/* Add Range button */}
      <Button variant="ghost" size="bare"
        onClick={() => { setEditingRange(null); setModalOpen(true); }}
        className={`
          w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed
          text-xs font-bold uppercase transition-colors
          ${settings.fieldMode
            ? 'border-slate-700 text-slate-400 hover:border-yellow-600 hover:text-yellow-400 hover:bg-yellow-900/10'
            : 'border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
          }
        `}
      >
        <Icon name="add" className="text-sm" />
        Add Range
      </Button>

      {/* Range tree */}
      {structures.length > 0 ? (
        <div className={`
          border rounded-lg overflow-hidden
          ${settings.fieldMode ? 'border-slate-700 bg-black' : 'border-slate-200 bg-white'}
        `}>
          <div onDragEnd={handleDragEnd}>
            {renderRanges(structures)}
          </div>
        </div>
      ) : (
        <div className={`text-center py-8 ${cx.textMuted}`}>
          <Icon name="segment" className="text-4xl mb-2 opacity-30" />
          <p className="text-sm">No structural ranges defined</p>
          <p className="text-[10px] mt-1">
            Add ranges to create a table of contents for navigation
          </p>
        </div>
      )}

      {/* Edit/Create Modal */}
      <RangeEditModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRange(null); }}
        onSave={handleModalSave}
        initialLabel={editingRange ? getIIIFValue(editingRange.label, settings.language) || '' : ''}
        initialCanvasIds={editingRange ? getCanvasIdsFromRange(editingRange) : []}
        availableCanvases={canvases}
        isEditing={!!editingRange}
        fieldMode={settings.fieldMode}
        language={settings.language}
      />
    </div>
  );
};

export default StructureTabPanel;
