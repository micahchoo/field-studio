/**
 * TimelineView Organism
 *
 * Main organism for the timeline feature. Displays IIIF items with navDate
 * in a chronological visualization with zoom levels and grouping.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props from FieldModeTemplate (no hook calls)
 * - Composes molecules: EmptyState, TimelineTick, RangeSelector
 * - Domain logic delegated to useTimeline hook
 * - No prop-drilling of fieldMode
 *
 * IDEAL OUTCOME: Users can browse and navigate dated IIIF items temporally
 * FAILURE PREVENTED: Invalid date sorting, inconsistent grouping, poor performance
 *
 * LEGACY NOTE: This is the refactored version of components/views/TimelineView.tsx
 * The original component (255 lines) mixed date calculations with UI.
 * This organism delegates to useTimeline hook.
 *
 * DECOMPOSITION NOTE: Future molecules to extract:
 * - TimelineHeader: Zoom controls + stats
 * - TimelineMinimap: Date range bar with markers
 * - TimelineGroup: Date group with items
 * - TimelineItemCard: Individual item thumbnail
 */

import React from 'react';
import type { IIIFCanvas, IIIFItem } from '@/types';
import { getIIIFValue } from '@/types';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/src/shared/ui/molecules/EmptyState';
import { TimelineTick } from '@/src/shared/ui/molecules/TimelineTick';
import {
  formatShortDate,
  formatTime,
  getGridColumns,
  getTimelinePosition,
  useTimeline,
  type ZoomLevel,
} from '../../model';

export interface TimelineViewProps {
  /** Root IIIF item containing dated canvases */
  root: IIIFItem | null;
  /** Called when a canvas is selected */
  onSelect: (item: IIIFItem) => void;
  /** Contextual styles from template */
  cx: {
    surface: string;
    text: string;
    accent: string;
    border: string;
    divider: string;
    headerBg: string;
    textMuted: string;
    input: string;
    label: string;
    active: string;
    inactive: string;
  };
  /** Current field mode */
  fieldMode: boolean;
}

const ZOOM_OPTIONS: { level: ZoomLevel; label: string }[] = [
  { level: 'day', label: 'Day' },
  { level: 'month', label: 'Month' },
  { level: 'year', label: 'Year' },
];

/**
 * TimelineView Organism
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode }) => (
 *     <TimelineView
 *       root={root}
 *       onSelect={handleSelect}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const TimelineView: React.FC<TimelineViewProps> = ({
  root,
  onSelect,
  cx,
  fieldMode,
}) => {
  const {
    groups,
    minDate,
    maxDate,
    totalItems,
    zoomLevel,
    selectedDate,
    setZoomLevel,
    toggleDate,
    hasItems,
  } = useTimeline(root);

  // Empty state
  if (!hasItems) {
    return (
      <EmptyState
        icon="event"
        title="No Dated Items"
        message="Items need a navDate property to appear in the timeline."
        cx={cx}
        fieldMode={fieldMode}
      />
    );
  }

  return (
    <div className={`flex flex-col h-full ${cx.surface}`}>
      {/* Header */}
      <div className={`h-14 ${cx.headerBg} border-b flex items-center justify-between px-6 shadow-sm`}>
        <div className="flex items-center gap-4">
          <h2 className={`font-bold ${cx.text} flex items-center gap-2`}>
            <Icon name="timeline" className="text-purple-500" />
            Timeline
          </h2>
          <span className={`text-sm ${cx.textMuted}`}>
            {totalItems} dated item{totalItems !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className={`flex items-center gap-2 ${cx.surface} p-1 rounded`}>
          {ZOOM_OPTIONS.map(({ level, label }) => (
            <button
              key={level}
              onClick={() => setZoomLevel(level)}
              className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                zoomLevel === level
                  ? `${cx.active} shadow`
                  : cx.textMuted
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Minimap */}
      {minDate && maxDate && (
        <div className={`h-10 ${cx.surface} flex items-center px-6 text-xs ${cx.textMuted}`}>
          <span>{formatShortDate(minDate)}</span>
          <div className={`flex-1 mx-4 h-1 ${cx.border} rounded relative`}>
            {groups.map((g) => {
              if (!g.items[0]?.navDate) return null;
              const percent = getTimelinePosition(
                new Date(g.items[0].navDate),
                minDate,
                maxDate
              );
              return (
                <div
                  key={g.date}
                  className="absolute w-2 h-2 bg-purple-500 rounded-full -top-0.5 cursor-pointer hover:scale-150 transition-transform"
                  style={{ left: `${percent}%` }}
                  title={`${g.displayDate}: ${g.items.length} items`}
                  onClick={() => toggleDate(g.date)}
                />
              );
            })}
          </div>
          <span>{formatShortDate(maxDate)}</span>
        </div>
      )}

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {groups.map((group, groupIdx) => (
            <div key={group.date} className="relative pl-8 pb-8">
              {/* Timeline connector line */}
              {groupIdx < groups.length - 1 && (
                <div className={`absolute left-3 top-6 bottom-0 w-0.5 ${fieldMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
              )}

              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  selectedDate === group.date
                    ? 'bg-purple-500'
                    : fieldMode ? 'bg-slate-600' : 'bg-slate-400'
                }`}
                onClick={() => toggleDate(group.date)}
              >
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>

              {/* Date header */}
              <div
                className="flex items-center gap-3 mb-3 cursor-pointer group"
                onClick={() => toggleDate(group.date)}
              >
                <TimelineTick
                  timestamp={group.date}
                  label={group.displayDate}
                  items={group.items.map(item => ({
                    id: item.id,
                    title: item.label ? String(item.label) : 'Untitled',
                    type: item.type || 'Canvas',
                    timestamp: item.navDate || group.date
                  }))}
                  position={groupIdx / groups.length}
                  onSelectItem={(id) => onSelect(group.items.find(i => i.id === id) || group.items[0])}
                  selected={selectedDate === group.date}
                  cx={cx}
                />
              </div>

              {/* Items grid */}
              <div className={`grid gap-3 ${getGridColumns(zoomLevel)}`}>
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-lg shadow-sm border cursor-pointer transition-all group overflow-hidden ${
                      fieldMode
                        ? 'bg-slate-800 border-slate-700 hover:border-purple-500'
                        : 'bg-white border-slate-200 hover:shadow-md hover:border-purple-300'
                    }`}
                    onClick={() => onSelect(item)}
                  >
                    <div className={`aspect-square relative overflow-hidden ${fieldMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      {item._blobUrl ? (
                        <img
                          src={item._blobUrl}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon name="image" className={`text-2xl ${fieldMode ? 'text-slate-500' : 'text-slate-300'}`} />
                        </div>
                      )}
                      {zoomLevel !== 'day' && item.navDate && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate">
                          {formatShortDate(new Date(item.navDate))}
                        </div>
                      )}
                    </div>
                    {zoomLevel === 'day' && (
                      <div className="p-1.5">
                        <div className={`text-[10px] truncate ${fieldMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          {getIIIFValue(item.label, 'none') || 'Untitled'}
                        </div>
                        {item.navDate && (
                          <div className={`text-[9px] ${cx.textMuted}`}>
                            {formatTime(new Date(item.navDate))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
