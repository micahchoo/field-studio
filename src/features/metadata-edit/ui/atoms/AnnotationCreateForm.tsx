/**
 * AnnotationCreateForm Atom
 *
 * Form for creating spatial or time-based annotations.
 * Extracted from Inspector to keep the organism focused on layout.
 *
 * @module features/metadata-edit/ui/atoms/AnnotationCreateForm
 */

import React from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';

interface TimeRange {
  start: number;
  end?: number;
}

export interface AnnotationCreateFormProps {
  fieldMode: boolean;
  mediaType?: 'image' | 'video' | 'audio' | 'other';
  annotationDrawingState?: {
    pointCount: number;
    isDrawing: boolean;
    canSave: boolean;
  };
  timeRange?: TimeRange | null;
  currentPlaybackTime?: number;
  annotationMotivation: 'commenting' | 'tagging' | 'describing';
  onAnnotationMotivationChange?: (motivation: 'commenting' | 'tagging' | 'describing') => void;
  annotationText: string;
  onAnnotationTextChange?: (text: string) => void;
  onSaveAnnotation?: () => void;
  onClearAnnotation?: () => void;
}

/** Format time for display (MM:SS.ms or HH:MM:SS.ms) */
const formatTimeForDisplay = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export const AnnotationCreateForm: React.FC<AnnotationCreateFormProps> = ({
  fieldMode,
  mediaType,
  annotationDrawingState,
  timeRange,
  currentPlaybackTime,
  annotationMotivation,
  onAnnotationMotivationChange,
  annotationText,
  onAnnotationTextChange,
  onSaveAnnotation,
  onClearAnnotation,
}) => {
  const isAV = mediaType === 'audio' || mediaType === 'video';
  const showForm = isAV
    ? timeRange !== null
    : annotationDrawingState && annotationDrawingState.pointCount >= 3 && !annotationDrawingState.isDrawing;

  return (
    <div className={`p-4 border-2 ${
      fieldMode
        ? 'bg-nb-yellow/20 border-nb-yellow'
        : 'bg-nb-green/10 border-nb-green'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <Icon name={mediaType === 'image' ? 'gesture' : 'timer'} className={fieldMode ? 'text-nb-yellow' : 'text-nb-green'} />
        <span className={`text-xs font-bold uppercase ${fieldMode ? 'text-nb-yellow' : 'text-nb-green'}`}>
          {mediaType === 'image' ? 'Creating Annotation' : 'Time-Based Annotation'}
        </span>
      </div>

      {/* Status */}
      <div className={`mb-3 p-2 text-xs ${
        fieldMode ? 'bg-nb-black/40 text-nb-yellow/60' : 'bg-nb-white text-nb-black/60'
      }`}>
        {mediaType === 'image' ? (
          annotationDrawingState?.pointCount === 0
            ? 'Draw a shape on the image to select a region'
            : annotationDrawingState?.isDrawing
              ? `Drawing... ${annotationDrawingState.pointCount} points`
              : `Shape ready with ${annotationDrawingState?.pointCount || 0} points`
        ) : (
          !timeRange
            ? 'Click on the timeline to set start time, then drag or click again to set end time'
            : timeRange.end !== undefined
              ? (
                <div className="flex items-center gap-2">
                  <Icon name="schedule" className="text-sm" />
                  <span>
                    Range: <strong>{formatTimeForDisplay(timeRange.start)}</strong>
                    {' → '}
                    <strong>{formatTimeForDisplay(timeRange.end)}</strong>
                    <span className="opacity-60 ml-1">
                      ({formatTimeForDisplay(timeRange.end - timeRange.start)} duration)
                    </span>
                  </span>
                </div>
              )
              : (
                <div className="flex items-center gap-2">
                  <Icon name="schedule" className="text-sm" />
                  <span>
                    Point: <strong>{formatTimeForDisplay(timeRange.start)}</strong>
                    <span className="opacity-60 ml-1">(click/drag for range)</span>
                  </span>
                </div>
              )
        )}
      </div>

      {/* Current playback time indicator for AV */}
      {isAV && currentPlaybackTime !== undefined && (
        <div className={`mb-3 px-2 py-1 text-[10px] flex items-center gap-1 ${
          fieldMode ? 'bg-nb-black/20 text-nb-yellow/40' : 'bg-nb-cream text-nb-black/50'
        }`}>
          <Icon name="play_arrow" className="text-xs" />
          Current: {formatTimeForDisplay(currentPlaybackTime)}
        </div>
      )}

      {/* Form - show when region/time is ready */}
      {showForm && (
        <div className="space-y-3">
          <div>
            <label className={`block text-[10px] font-bold uppercase mb-1.5 ${
              fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'
            }`}>
              Purpose
            </label>
            <select
              value={annotationMotivation}
              onChange={e => onAnnotationMotivationChange?.(e.target.value as 'commenting' | 'tagging' | 'describing')}
              className={`w-full px-3 py-2 text-sm outline-none border ${
                fieldMode
                  ? 'bg-nb-black text-white border-nb-yellow/30 focus:border-nb-yellow'
                  : 'bg-nb-white text-nb-black border-nb-black/20 focus:border-nb-green'
              }`}
            >
              <option value="commenting">Comment</option>
              <option value="tagging">Tag</option>
              <option value="describing">Description</option>
            </select>
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase mb-1.5 ${
              fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'
            }`}>
              Annotation Text
            </label>
            <textarea
              value={annotationText}
              onChange={e => onAnnotationTextChange?.(e.target.value)}
              placeholder="Enter your annotation..."
              rows={3}
              autoFocus
              className={`w-full px-3 py-2 text-sm outline-none border resize-none ${
                fieldMode
                  ? 'bg-nb-black text-white placeholder-nb-yellow/30 border-nb-yellow/30 focus:border-nb-yellow'
                  : 'bg-nb-white text-nb-black placeholder-nb-black/40 border-nb-black/20 focus:border-nb-green'
              }`}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="bare"
              onClick={onClearAnnotation}
              className={`flex-1 px-3 py-2 text-xs font-semibold transition-nb ${
                fieldMode
                  ? 'bg-nb-black text-nb-yellow/60 hover:bg-nb-black/70'
                  : 'bg-nb-cream text-nb-black/80 hover:bg-nb-cream'
              }`}
            >
              Clear
            </Button>
            <Button variant="ghost" size="bare"
              onClick={onSaveAnnotation}
              disabled={!annotationText.trim()}
              className={`flex-1 px-3 py-2 text-xs font-semibold transition-nb disabled:opacity-50 ${
                fieldMode
                  ? 'bg-nb-yellow text-nb-black hover:bg-nb-yellow'
                  : 'bg-nb-green text-white hover:bg-nb-green'
              }`}
            >
              <Icon name="save" className="inline mr-1" />
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationCreateForm;
