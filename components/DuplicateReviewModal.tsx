
import React, { useState, useMemo } from 'react';
import { IIIFCanvas, IIIFItem, getIIIFValue } from '../types';
import { Icon } from './Icon';
import { resolveThumbUrl } from '../utils/imageSourceResolver';
import { findSimilarFiles, SimilarityMatch } from '../utils/filenameUtils';

export interface DuplicateGroup {
  /** The items that are potentially duplicates of each other */
  items: IIIFItem[];
  /** Reason for the match (e.g., "Part of same sequence") */
  matchReason: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** The base name/pattern they share */
  baseName?: string;
}

export interface DuplicateReviewModalProps {
  /** Groups of potential duplicates */
  groups: DuplicateGroup[];
  /** Callback when user resolves a group */
  onResolve: (action: 'keep-all' | 'keep-one' | 'merge', groupIndex: number, keepId?: string) => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Whether the modal is open */
  isOpen: boolean;
}

type ResolveAction = 'keep-all' | 'keep-one' | 'merge';

interface GroupState {
  selectedKeepId: string | null;
  action: ResolveAction | null;
}

export const DuplicateReviewModal: React.FC<DuplicateReviewModalProps> = ({
  groups,
  onResolve,
  onClose,
  isOpen,
}) => {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [groupStates, setGroupStates] = useState<Map<number, GroupState>>(new Map());

  const currentGroup = groups[currentGroupIndex];
  const currentState = groupStates.get(currentGroupIndex) || { selectedKeepId: null, action: null };

  const resolvedCount = useMemo(() => {
    return Array.from(groupStates.values()).filter(s => s.action !== null).length;
  }, [groupStates]);

  if (!isOpen || groups.length === 0) return null;

  const handleSelectKeep = (itemId: string) => {
    setGroupStates(prev => {
      const newMap = new Map(prev);
      newMap.set(currentGroupIndex, { ...currentState, selectedKeepId: itemId });
      return newMap;
    });
  };

  const handleSetAction = (action: ResolveAction) => {
    setGroupStates(prev => {
      const newMap = new Map(prev);
      newMap.set(currentGroupIndex, { ...currentState, action });
      return newMap;
    });
  };

  const handleApplyAndNext = () => {
    const state = groupStates.get(currentGroupIndex);
    if (state?.action) {
      onResolve(state.action, currentGroupIndex, state.selectedKeepId || undefined);
    }

    if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex(currentGroupIndex + 1);
    }
  };

  const handleApplyAll = () => {
    groupStates.forEach((state, index) => {
      if (state.action) {
        onResolve(state.action, index, state.selectedKeepId || undefined);
      }
    });
    onClose();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-red-600 bg-red-100';
    if (confidence >= 0.7) return 'text-amber-600 bg-amber-100';
    return 'text-blue-600 bg-blue-100';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'High';
    if (confidence >= 0.7) return 'Medium';
    return 'Low';
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Icon name="find_replace" className="text-2xl text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Duplicate Review</h2>
              <p className="text-sm text-slate-500">
                {groups.length} potential duplicate group{groups.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Icon name="close" className="text-slate-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-200">
          <div
            className="h-full bg-iiif-blue transition-all"
            style={{ width: `${((currentGroupIndex + 1) / groups.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Group Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentGroupIndex(Math.max(0, currentGroupIndex - 1))}
                disabled={currentGroupIndex === 0}
                className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icon name="chevron_left" />
              </button>
              <span className="text-sm font-medium text-slate-600">
                Group {currentGroupIndex + 1} of {groups.length}
              </span>
              <button
                onClick={() => setCurrentGroupIndex(Math.min(groups.length - 1, currentGroupIndex + 1))}
                disabled={currentGroupIndex === groups.length - 1}
                className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Icon name="chevron_right" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-1 rounded ${getConfidenceColor(currentGroup.confidence)}`}>
                {getConfidenceLabel(currentGroup.confidence)} confidence
              </span>
              <span className="text-xs text-slate-400">
                {currentGroup.matchReason}
              </span>
            </div>
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {currentGroup.items.map((item) => {
              const thumbUrl = resolveThumbUrl(item, 200);
              const label = getIIIFValue(item.label) || item.id.split('/').pop();
              const isSelected = currentState.selectedKeepId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectKeep(item.id)}
                  className={`relative rounded-xl border-2 overflow-hidden cursor-pointer transition-all ${
                    isSelected
                      ? 'border-iiif-blue ring-2 ring-iiif-blue/30 shadow-lg'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-slate-100">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Icon name="image" className="text-3xl" />
                      </div>
                    )}
                  </div>

                  {/* Label */}
                  <div className="p-2 bg-white">
                    <p className="text-xs font-medium text-slate-700 truncate" title={label}>
                      {label}
                    </p>
                    {item.type === 'Canvas' && (item as IIIFCanvas).width && (
                      <p className="text-[10px] text-slate-400">
                        {(item as IIIFCanvas).width} x {(item as IIIFCanvas).height}px
                      </p>
                    )}
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-iiif-blue rounded-full flex items-center justify-center shadow-lg">
                      <Icon name="check" className="text-white text-sm" />
                    </div>
                  )}

                  {/* Keep badge */}
                  {isSelected && currentState.action === 'keep-one' && (
                    <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      KEEP
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Selection */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-700">How would you like to handle this group?</h4>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleSetAction('keep-all')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  currentState.action === 'keep-all'
                    ? 'border-green-500 bg-green-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon name="done_all" className={`text-2xl mb-2 ${currentState.action === 'keep-all' ? 'text-green-600' : 'text-slate-400'}`} />
                <h5 className="font-bold text-sm text-slate-700">Keep All</h5>
                <p className="text-xs text-slate-500 mt-1">
                  These are not duplicates, keep all items
                </p>
              </button>

              <button
                onClick={() => handleSetAction('keep-one')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  currentState.action === 'keep-one'
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon name="filter_1" className={`text-2xl mb-2 ${currentState.action === 'keep-one' ? 'text-amber-600' : 'text-slate-400'}`} />
                <h5 className="font-bold text-sm text-slate-700">Keep One</h5>
                <p className="text-xs text-slate-500 mt-1">
                  {currentState.selectedKeepId
                    ? 'Remove duplicates, keep selected item'
                    : 'Click an item above to select which to keep'}
                </p>
              </button>

              <button
                onClick={() => handleSetAction('merge')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  currentState.action === 'merge'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon name="merge" className={`text-2xl mb-2 ${currentState.action === 'merge' ? 'text-blue-600' : 'text-slate-400'}`} />
                <h5 className="font-bold text-sm text-slate-700">Merge</h5>
                <p className="text-xs text-slate-500 mt-1">
                  {currentState.selectedKeepId
                    ? 'Combine annotations into selected item'
                    : 'Click an item to select merge target'}
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-sm text-slate-500">
            {resolvedCount} of {groups.length} groups resolved
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>

            {currentGroupIndex < groups.length - 1 ? (
              <button
                onClick={handleApplyAndNext}
                disabled={!currentState.action || (currentState.action !== 'keep-all' && !currentState.selectedKeepId)}
                className="px-6 py-2 bg-iiif-blue text-white rounded-lg font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Next Group <Icon name="arrow_forward" className="text-sm" />
              </button>
            ) : (
              <button
                onClick={handleApplyAll}
                disabled={resolvedCount === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Icon name="check_circle" className="text-sm" /> Apply All Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Utility: Find Duplicates in Canvas List
// ============================================================================

/**
 * Find potential duplicate canvases based on filename patterns
 */
export function findDuplicateCanvases(
  canvases: IIIFCanvas[],
  options: { threshold?: number } = {}
): DuplicateGroup[] {
  const { threshold = 0.7 } = options;
  const groups: DuplicateGroup[] = [];
  const processed = new Set<string>();

  // Extract filenames from canvas labels or IDs
  const getFilename = (canvas: IIIFCanvas): string => {
    const label = getIIIFValue(canvas.label);
    if (label) return label;

    // Extract from ID
    const idParts = canvas.id.split('/');
    return idParts[idParts.length - 1] || canvas.id;
  };

  const canvasFilenames = canvases.map(c => ({
    canvas: c,
    filename: getFilename(c)
  }));

  for (let i = 0; i < canvasFilenames.length; i++) {
    const current = canvasFilenames[i];

    if (processed.has(current.canvas.id)) continue;

    // Find similar canvases
    const otherFilenames = canvasFilenames
      .filter((_, idx) => idx !== i && !processed.has(canvasFilenames[idx].canvas.id))
      .map(c => c.filename);

    const matches = findSimilarFiles(current.filename, otherFilenames, { threshold });

    if (matches.length > 0) {
      const groupItems = [current.canvas];
      let bestReason = '';
      let bestScore = 0;

      matches.forEach(match => {
        const matchedCanvas = canvasFilenames.find(c => c.filename === match.filename);
        if (matchedCanvas) {
          groupItems.push(matchedCanvas.canvas);
          processed.add(matchedCanvas.canvas.id);

          if (match.score > bestScore) {
            bestScore = match.score;
            bestReason = match.reason;
          }
        }
      });

      processed.add(current.canvas.id);

      if (groupItems.length > 1) {
        groups.push({
          items: groupItems,
          matchReason: bestReason || 'Similar naming pattern',
          confidence: bestScore,
          baseName: current.filename.replace(/\d+/g, '#')
        });
      }
    }
  }

  return groups.sort((a, b) => b.confidence - a.confidence);
}
