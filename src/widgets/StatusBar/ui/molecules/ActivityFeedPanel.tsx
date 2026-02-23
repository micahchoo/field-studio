/**
 * ActivityFeedPanel Molecule
 *
 * Slide-up panel above StatusBar showing recent activity stream entries.
 * Uses activityStream service to load entries on mount.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { activityStream, type Activity, type ActivityType } from '@/src/shared/services/activityStream';
import { useContextualStyles } from '@/src/shared/lib/hooks/useContextualStyles';
import { cn } from '@/src/shared/lib/cn';

interface ActivityFeedPanelProps {
  onClose: () => void;
}

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  Create: 'add_circle',
  Update: 'edit',
  Delete: 'delete',
  Move: 'drag_indicator',
  Add: 'library_add',
  Remove: 'remove_circle',
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  Create: 'text-nb-green',
  Update: 'text-nb-blue',
  Delete: 'text-nb-red',
  Move: 'text-nb-orange',
  Add: 'text-nb-green',
  Remove: 'text-nb-red',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const ActivityFeedPanel: React.FC<ActivityFeedPanelProps> = ({ onClose }) => {
  const cx = useContextualStyles();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    activityStream.getRecentActivities(20).then(items => {
      setActivities(items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className={cn('absolute bottom-full left-0 right-0 mb-0 shadow-brutal z-[60] max-h-[400px] flex flex-col', cx.surface, cx.subtleBg)}>
      {/* Header */}
      <div className={cn('flex items-center justify-between px-4 py-2 border-b-2 shrink-0', cx.border)}>
        <span className={cn('font-mono text-xs font-bold uppercase tracking-wider', cx.text)}>Activity Feed</span>
        <Button variant="ghost" size="bare" onClick={onClose} className={cn('p-0.5 transition-nb', cx.iconButton)} title="Close">
          <Icon name="close" className="text-[14px]" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading && (
          <div className={cn('p-4 text-center font-mono text-xs', cx.textMuted)}>Loading...</div>
        )}
        {!loading && activities.length === 0 && (
          <div className={cn('p-4 text-center font-mono text-xs', cx.textMuted)}>No recent activity</div>
        )}
        {!loading && activities.map(activity => (
          <div key={activity.id} className={cn('flex items-start gap-3 px-4 py-2 border-b transition-nb', cx.divider)}>
            <Icon
              name={ACTIVITY_ICONS[activity.type] || 'circle'}
              className={`text-[16px] mt-0.5 shrink-0 ${ACTIVITY_COLORS[activity.type] || 'text-nb-black'}`}
            />
            <div className="flex-1 min-w-0">
              <div className={cn('text-xs font-medium truncate', cx.text)}>{activity.summary || `${activity.type} ${activity.object.type}`}</div>
              <div className={cn('text-[10px] truncate', cx.textMuted)}>{activity.object.id}</div>
            </div>
            <span className={cn('text-[10px] font-mono shrink-0 mt-0.5', cx.textMuted)}>{relativeTime(activity.endTime)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
