
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SourceManifest, SourceManifests } from '../../types';
import { Icon } from '../Icon';
import { SourceManifestItem } from './SourceManifestItem';
import { findSimilarFiles } from '../../utils/filenameUtils';
import { useTerminology } from '../../hooks/useTerminology';
import { KeyboardDragDropReturn } from '../../hooks/useKeyboardDragDrop';
import {
  formatCheckpointAge,
  getActiveCheckpoint,
  getCheckpointStatusColor,
  IngestCheckpoint,
  listCheckpoints
} from '../../services/ingestState';

interface SourcePaneProps {
  sourceManifests: SourceManifests;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onSelectRange: (fromId: string, toId: string) => void;
  onClearSelection: () => void;
  onSelectAll: () => void;
  onReorderCanvases: (manifestId: string, newOrder: string[]) => void;
  onDragStart: (e: React.DragEvent, manifestIds: string[]) => void;
  onFocus: () => void;
  isFocused: boolean;
  /** Called when user wants to resume an import from checkpoint */
  onResumeImport?: (checkpoint: IngestCheckpoint) => void;
  /** Enable keyboard-based drag and drop */
  enableKeyboardDnd?: boolean;
  /** Keyboard DnD hook instance */
  keyboardDnd?: KeyboardDragDropReturn<SourceManifest>;
}

export const SourcePane: React.FC<SourcePaneProps> = ({
  sourceManifests,
  selectedIds,
  onToggleSelection,
  onSelectRange,
  onClearSelection,
  onSelectAll,
  onReorderCanvases,
  onDragStart,
  onFocus,
  isFocused,
  onResumeImport,
  enableKeyboardDnd = false,
  keyboardDnd
}) => {
  // Use terminology hook for user-friendly labels
  const { t, formatCount } = useTerminology({ level: 'standard' });

  const [filterText, setFilterText] = useState('');
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [selectedCanvasIndices, setSelectedCanvasIndices] = useState<Map<string, number[]>>(new Map());
  const [checkpoints, setCheckpoints] = useState<IngestCheckpoint[]>([]);
  const [showCheckpoints, setShowCheckpoints] = useState(false);

  // Load checkpoints on mount
  useEffect(() => {
    const loadCheckpoints = async () => {
      const allCheckpoints = await listCheckpoints();
      setCheckpoints(allCheckpoints.filter(cp => cp.status === 'in_progress' || cp.status === 'paused'));
    };
    loadCheckpoints();
  }, []);

  // Filter manifests
  const filteredManifests = useMemo(() => {
    if (!filterText.trim()) return sourceManifests.manifests;
    const lower = filterText.toLowerCase();
    return sourceManifests.manifests.filter(m =>
      m.name.toLowerCase().includes(lower) ||
      m.breadcrumbs.some(b => b.toLowerCase().includes(lower))
    );
  }, [sourceManifests.manifests, filterText]);

  // Get all manifest IDs for range selection
  const allIds = useMemo(() => filteredManifests.map(m => m.id), [filteredManifests]);

  // Handle manifest selection
  const handleManifestSelect = useCallback((manifest: SourceManifest, e: React.MouseEvent) => {
    onFocus();

    if (e.shiftKey && lastSelectedId) {
      // Range selection
      onSelectRange(lastSelectedId, manifest.id);
    } else if (e.ctrlKey || e.metaKey) {
      // Toggle selection
      onToggleSelection(manifest.id);
    } else {
      // Single selection - clear others
      onClearSelection();
      onToggleSelection(manifest.id);
    }
    setLastSelectedId(manifest.id);
  }, [lastSelectedId, onFocus, onSelectRange, onToggleSelection, onClearSelection]);

  // Handle canvas selection within a manifest
  const handleCanvasSelect = useCallback((manifestId: string, index: number, e: React.MouseEvent) => {
    const current = selectedCanvasIndices.get(manifestId) || [];

    if (e.ctrlKey || e.metaKey) {
      // Toggle
      const newIndices = current.includes(index)
        ? current.filter(i => i !== index)
        : [...current, index];
      setSelectedCanvasIndices(new Map(selectedCanvasIndices).set(manifestId, newIndices));
    } else {
      // Single selection
      setSelectedCanvasIndices(new Map([[manifestId, [index]]]));
    }
  }, [selectedCanvasIndices]);

  // Handle drag start for manifests
  const handleDragStart = useCallback((e: React.DragEvent, manifestId: string) => {
    const idsToSend = selectedIds.includes(manifestId) ? selectedIds : [manifestId];
    e.dataTransfer.setData('application/iiif-manifest-ids', JSON.stringify(idsToSend));
    e.dataTransfer.effectAllowed = 'copyMove';
    onDragStart(e, idsToSend);
  }, [selectedIds, onDragStart]);

  // Stats
  const stats = useMemo(() => ({
    totalManifests: sourceManifests.manifests.length,
    totalFiles: sourceManifests.manifests.reduce((sum, m) => sum + m.files.length, 0),
    patternsDetected: sourceManifests.manifests.filter(m => m.detectedPattern).length
  }), [sourceManifests.manifests]);

  return (
    <div
      className={`
        flex flex-col h-full border-r transition-colors
        ${isFocused ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white'}
      `}
      onClick={onFocus}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Icon name="source" className="text-blue-500" />
              Your Files
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Files from your selected folder
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-slate-800">{stats.totalManifests}</div>
            <div className="text-[10px] text-slate-400">{stats.totalFiles} files</div>
          </div>
        </div>

        {/* Resume import button if checkpoints exist */}
        {checkpoints.length > 0 && onResumeImport && (
          <div className="mb-3">
            <button
              onClick={() => setShowCheckpoints(!showCheckpoints)}
              className="w-full p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center justify-between hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Icon name="history" className="text-amber-500" />
                <span>{checkpoints.length} unfinished import{checkpoints.length !== 1 ? 's' : ''} available</span>
              </div>
              <Icon name={showCheckpoints ? 'expand_less' : 'expand_more'} className="text-amber-500" />
            </button>

            {showCheckpoints && (
              <div className="mt-2 space-y-2">
                {checkpoints.map(cp => (
                  <div
                    key={cp.id}
                    className="p-3 bg-white border border-slate-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm text-slate-700 truncate">
                        {cp.sourceName}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full bg-${getCheckpointStatusColor(cp.status)}-100 text-${getCheckpointStatusColor(cp.status)}-700`}>
                        {cp.status === 'in_progress' ? 'In Progress' : 'Paused'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-2">
                      {formatCheckpointAge(cp.timestamp)} • {cp.processedFiles} of {cp.totalFiles} files processed
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${cp.progress}%` }}
                      />
                    </div>
                    <button
                      onClick={() => onResumeImport(cp)}
                      className="w-full py-1.5 bg-amber-500 text-white rounded text-xs font-medium hover:bg-amber-600 transition-colors"
                    >
                      Resume Import
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter */}
        <div className="relative">
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder={`Filter ${t('Manifest').toLowerCase()}s...`}
            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg outline-none focus:border-blue-400 focus:bg-white transition-colors"
          />
          <Icon name="search" className="absolute left-2.5 top-2.5 text-slate-400 text-sm" />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-2 top-2 p-0.5 rounded hover:bg-slate-200"
            >
              <Icon name="close" className="text-sm text-slate-400" />
            </button>
          )}
        </div>

        {/* Selection actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-medium text-blue-600">
              {selectedIds.length} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-[11px] text-slate-500 hover:text-slate-700 underline"
            >
              Clear
            </button>
            <button
              onClick={onSelectAll}
              className="text-[11px] text-slate-500 hover:text-slate-700 underline"
            >
              Select All
            </button>
          </div>
        )}

        {/* Pattern detection summary */}
        {stats.patternsDetected > 0 && (
          <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-700 flex items-center gap-2">
            <Icon name="auto_awesome" className="text-emerald-500" />
            {stats.patternsDetected} {t('Manifest').toLowerCase()}{stats.patternsDetected !== 1 ? 's' : ''} with detected sequence patterns
          </div>
        )}
      </div>

      {/* Manifest list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredManifests.length === 0 ? (
          <div className="text-center py-12 px-4">
            {filterText ? (
              // Filter empty state
              <>
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="search_off" className="text-3xl text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  No {t('Manifest').toLowerCase()}s match your filter
                </p>
                <p className="text-xs text-slate-500">
                  Try adjusting your search terms
                </p>
              </>
            ) : (
              // No files empty state
              <>
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="folder_open" className="text-3xl text-blue-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  No files found
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  Start by adding files to organize your archive
                </p>
                <div className="bg-slate-50 rounded-lg p-3 text-left">
                  <p className="text-[11px] font-medium text-slate-600 mb-2">Tips for getting started:</p>
                  <ul className="text-[11px] text-slate-500 space-y-1">
                    <li className="flex items-start gap-1.5">
                      <Icon name="check_circle" className="text-xs text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Drag and drop a folder of images</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Icon name="check_circle" className="text-xs text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Use the "Add Files" button to browse</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Icon name="check_circle" className="text-xs text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Files are automatically grouped into items</span>
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        ) : (
          filteredManifests.map((manifest) => (
            <SourceManifestItem
              key={manifest.id}
              manifest={manifest}
              isSelected={selectedIds.includes(manifest.id)}
              selectedCanvasIndices={selectedCanvasIndices.get(manifest.id) || []}
              onSelect={(e) => handleManifestSelect(manifest, e)}
              onCanvasSelect={(index, e) => handleCanvasSelect(manifest.id, index, e)}
              onReorderCanvases={(newOrder) => onReorderCanvases(manifest.id, newOrder)}
              onDragStart={(e) => handleDragStart(e, manifest.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500">
        <div className="flex items-center justify-between">
          <span>
            Imported: {new Date(sourceManifests.createdAt).toLocaleString()}
          </span>
          <span className="font-medium">
            {sourceManifests.rootPath}
          </span>
        </div>
      </div>
    </div>
  );
};
