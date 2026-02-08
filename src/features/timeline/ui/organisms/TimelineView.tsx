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
import { getIIIFValue, type IIIFItem } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { Icon } from '@/src/shared/ui/atoms';
import { Button } from '@/ui/primitives/Button';
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
  cx: ContextualClassNames;
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
      <div className={`h-header border-l-4 border-l-mode-accent-border bg-mode-accent-bg-subtle transition-mode border-b ${cx.border} flex items-center justify-between px-6 shadow-brutal-sm z-10 shrink-0`}>
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-lg text-mode-accent">Timeline</h2>
          <div className={`h-4 w-px ${fieldMode ? 'bg-nb-yellow' : 'bg-nb-black/40'}`} />
          <span className={`text-[10px] font-black uppercase ${cx.textMuted}`}>
            {totalItems} dated item{totalItems !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className={`flex items-center gap-2 ${cx.surface} p-1 rounded`}>
          {ZOOM_OPTIONS.map(({ level, label }) => (
            <Button
              key={level}
              onClick={() => setZoomLevel(level)}
              variant={zoomLevel === level ? 'primary' : 'ghost'}
              size="sm"
              className="text-xs font-bold"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Date Range Minimap */}
      {minDate && maxDate && (
        <div className={`h-10 ${cx.surface} flex items-center px-6 text-xs ${cx.textMuted}`}>
          <span>{formatShortDate(minDate)}</span>
          <div className={`flex-1 mx-4 h-1 ${cx.border} relative`}>
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
                  className="absolute w-2 h-2 bg-nb-purple -top-0.5 cursor-pointer hover:scale-150 transition-transform"
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
                <div className={`absolute left-3 top-6 bottom-0 w-0.5 ${fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream'}`} />
              )}

              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-1 w-6 h-6 flex items-center justify-center cursor-pointer transition-nb ${
                  selectedDate === group.date
                    ? 'bg-nb-purple'
                    : fieldMode ? 'bg-nb-black/60' : 'bg-nb-black/30'
                }`}
                onClick={() => toggleDate(group.date)}
              >
                <div className="w-2 h-2 bg-nb-white " />
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
                    className={` shadow-brutal-sm border cursor-pointer transition-nb group overflow-hidden ${
                      fieldMode
                        ? 'bg-nb-black border-nb-black/80 hover:border-nb-purple'
                        : 'bg-nb-white border-nb-black/20 hover:shadow-brutal-sm hover:border-nb-purple/40'
                    }`}
                    onClick={() => onSelect(item)}
                  >
                    <div className={`aspect-square relative overflow-hidden ${fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream'}`}>
                      {item._blobUrl ? (
                        <img
                          src={item._blobUrl}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon name="image" className={`text-2xl ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/30'}`} />
                        </div>
                      )}
                      {zoomLevel !== 'day' && item.navDate && (
                        <div className="absolute bottom-0 left-0 right-0 bg-nb-black/60 text-white text-[8px] px-1 py-0.5 truncate">
                          {formatShortDate(new Date(item.navDate))}
                        </div>
                      )}
                    </div>
                    {zoomLevel === 'day' && (
                      <div className="p-1.5">
                        <div className={`text-[10px] truncate ${fieldMode ? 'text-nb-black/30' : 'text-nb-black/60'}`}>
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
