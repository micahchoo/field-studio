
import React, { useMemo, useState } from 'react';
import { getIIIFValue, IIIFCanvas, IIIFItem, isCanvas } from '../../types';
import { Icon } from '../Icon';
import { useAppSettings } from '../../hooks/useAppSettings';
import { useContextualStyles } from '../../hooks/useContextualStyles';
import { useTerminology } from '../../hooks/useTerminology';

interface TimelineViewProps {
  root: IIIFItem | null;
  onSelect: (item: IIIFItem) => void;
}

interface TimelineGroup {
  date: string;
  displayDate: string;
  items: IIIFCanvas[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ root, onSelect }) => {
  const [zoomLevel, setZoomLevel] = useState<'day' | 'month' | 'year'>('day');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { settings } = useAppSettings();
  const {fieldMode} = settings;
  const cx = useContextualStyles(fieldMode);
  const { t, isAdvanced } = useTerminology({ level: settings.abstractionLevel });

  const { groups, minDate, maxDate } = useMemo(() => {
    if (!root) return { groups: [], minDate: null, maxDate: null };

    const items: IIIFCanvas[] = [];
    const traverse = (item: IIIFItem) => {
      if (isCanvas(item) && (item as IIIFCanvas).navDate) {
        items.push(item as IIIFCanvas);
      }
      if (item.items) {
        item.items.forEach(traverse);
      }
    };
    traverse(root);

    if (items.length === 0) return { groups: [], minDate: null, maxDate: null };

    // Sort by date
    items.sort((a, b) => {
      const dateA = new Date(a.navDate!).getTime();
      const dateB = new Date(b.navDate!).getTime();
      return dateA - dateB;
    });

    // Group by zoom level
    const groupMap = new Map<string, IIIFCanvas[]>();

    items.forEach(item => {
      const date = new Date(item.navDate!);
      let key: string;
      let displayDate: string;

      switch (zoomLevel) {
        case 'year':
          key = date.getFullYear().toString();
          displayDate = key;
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          displayDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
          break;
        case 'day':
        default:
          key = date.toISOString().split('T')[0];
          displayDate = date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
          break;
      }

      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(item);
    });

    const groups: TimelineGroup[] = Array.from(groupMap.entries()).map(([date, items]) => ({
      date,
      displayDate: items[0] ? formatDisplayDate(new Date(items[0].navDate!), zoomLevel) : date,
      items
    }));

    const minDate = items[0]?.navDate ? new Date(items[0].navDate) : null;
    const maxDate = items[items.length - 1]?.navDate ? new Date(items[items.length - 1].navDate) : null;

    return { groups, minDate, maxDate };
  }, [root, zoomLevel]);

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  if (!root || groups.length === 0) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center ${cx.surface} ${cx.textMuted} p-8`}>
        <Icon name="event" className="text-6xl mb-4 opacity-50" />
        <p className="text-lg font-medium">No Dated Items</p>
        <p className="text-sm mt-2">Items need a navDate property to appear in the timeline.</p>
      </div>
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
          <span className={`text-sm ${cx.textMuted}`}>{totalItems} dated items</span>
        </div>

        <div className={`flex items-center gap-2 ${cx.surface} p-1 rounded`}>
          <button
            onClick={() => setZoomLevel('day')}
            className={`px-3 py-1 text-xs font-bold rounded ${zoomLevel === 'day' ? `${cx.active} shadow` : cx.textMuted}`}
          >
            Day
          </button>
          <button
            onClick={() => setZoomLevel('month')}
            className={`px-3 py-1 text-xs font-bold rounded ${zoomLevel === 'month' ? `${cx.active} shadow` : cx.textMuted}`}
          >
            Month
          </button>
          <button
            onClick={() => setZoomLevel('year')}
            className={`px-3 py-1 text-xs font-bold rounded ${zoomLevel === 'year' ? `${cx.active} shadow` : cx.textMuted}`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Date Range Bar */}
      {minDate && maxDate && (
        <div className={`h-10 ${cx.surface} flex items-center px-6 text-xs ${cx.textMuted}`}>
          <span>{minDate.toLocaleDateString()}</span>
          <div className={`flex-1 mx-4 h-1 ${cx.border} rounded relative`}>
            {groups.map((g, i) => {
              const startTime = minDate.getTime();
              const endTime = maxDate.getTime();
              const groupDate = new Date(g.items[0].navDate!).getTime();
              const percent = endTime > startTime ? ((groupDate - startTime) / (endTime - startTime)) * 100 : 0;
              return (
                <div
                  key={g.date}
                  className="absolute w-2 h-2 bg-purple-500 rounded-full -top-0.5 cursor-pointer hover:scale-150 transition-transform"
                  style={{ left: `${percent}%` }}
                  title={`${g.displayDate}: ${g.items.length} items`}
                  onClick={() => setSelectedDate(selectedDate === g.date ? null : g.date)}
                />
              );
            })}
          </div>
          <span>{maxDate.toLocaleDateString()}</span>
        </div>
      )}

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {groups.map((group, groupIdx) => (
            <div key={group.date} className="relative pl-8 pb-8">
              {/* Timeline line */}
              {groupIdx < groups.length - 1 && (
                <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-slate-300" />
              )}

              {/* Timeline dot */}
              <div
                className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${
                  selectedDate === group.date ? 'bg-purple-500' : 'bg-slate-400'
                }`}
              >
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>

              {/* Date header */}
              <div
                className="flex items-center gap-3 mb-3 cursor-pointer group"
                onClick={() => setSelectedDate(selectedDate === group.date ? null : group.date)}
              >
                <h3 className="font-bold text-slate-800 group-hover:text-purple-600">
                  {group.displayDate}
                </h3>
                <span className="text-xs text-slate-400 bg-slate-200 px-2 py-0.5 rounded">
                  {group.items.length} item{group.items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Items grid */}
              <div className={`grid gap-3 ${
                zoomLevel === 'day' ? 'grid-cols-4 md:grid-cols-6' :
                zoomLevel === 'month' ? 'grid-cols-6 md:grid-cols-8' :
                'grid-cols-8 md:grid-cols-12'
              }`}>
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm border hover:shadow-md hover:border-purple-300 cursor-pointer transition-all group overflow-hidden"
                    onClick={() => onSelect(item)}
                  >
                    <div className="aspect-square bg-slate-100 relative overflow-hidden">
                      {item._blobUrl ? (
                        <img src={item._blobUrl} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Icon name="image" className="text-slate-300 text-2xl" />
                        </div>
                      )}
                      {zoomLevel !== 'day' && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate">
                          {new Date(item.navDate!).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {zoomLevel === 'day' && (
                      <div className="p-1.5">
                        <div className="text-[10px] text-slate-600 truncate">
                          {getIIIFValue(item.label, 'none') || 'Untitled'}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {new Date(item.navDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
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

function formatDisplayDate(date: Date, zoomLevel: 'day' | 'month' | 'year'): string {
  switch (zoomLevel) {
    case 'year':
      return date.getFullYear().toString();
    case 'month':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    case 'day':
    default:
      return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  }
}
