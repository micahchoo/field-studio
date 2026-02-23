/**
 * Activity Stream Service — Stub
 * Records user actions for undo/redo UI display.
 */

export interface ActivityEntry {
  id: string;
  type: string;
  summary: string;
  timestamp: number;
  entityId?: string;
  entityType?: string;
  undoable: boolean;
}

class ActivityStreamService {
  record(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): ActivityEntry {
    return {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
  }

  recordCreate(entityId: string, entityType: string, label?: string): ActivityEntry {
    return this.record({
      type: 'create',
      summary: `Created ${entityType}${label ? `: ${label}` : ''}`,
      entityId,
      entityType,
      undoable: true,
    });
  }

  recordUpdate(entityId: string, entityType: string, changes?: unknown): ActivityEntry {
    return this.record({
      type: 'update',
      summary: `Updated ${entityType}`,
      entityId,
      entityType,
      undoable: true,
    });
  }

  recordDelete(entityId: string, entityType: string, label?: string): ActivityEntry {
    return this.record({
      type: 'delete',
      summary: `Deleted ${entityType}${label ? `: ${label}` : ''}`,
      entityId,
      entityType,
      undoable: true,
    });
  }

  getRecent(_limit?: number): ActivityEntry[] {
    return [];
  }

  clear(): void {
    // No-op in stub
  }
}

export const activityStreamService = new ActivityStreamService();
export const activityStream = activityStreamService;
