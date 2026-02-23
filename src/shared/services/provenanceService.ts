/**
 * Provenance Service — Stub
 * Records audit trail of entity changes.
 * Full implementation deferred to shared services migration phase.
 */

export interface PropertyChange {
  property: string;
  oldValue: unknown;
  newValue: unknown;
  entityId?: string;
  timestamp?: number;
}

export interface ProvenanceEntry {
  id: string;
  action: string;
  entityId: string;
  entityType: string;
  timestamp: number;
  changes: PropertyChange[];
  userId?: string;
}

class ProvenanceService {
  record(entry: Omit<ProvenanceEntry, 'id' | 'timestamp'>): ProvenanceEntry {
    return {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
  }

  recordBatch(entries: Array<Omit<ProvenanceEntry, 'id' | 'timestamp'>>): ProvenanceEntry[] {
    return entries.map(e => this.record(e));
  }

  recordUpdate(entityId: string, changes: PropertyChange[], context?: string): ProvenanceEntry {
    return this.record({ action: 'update', entityId, entityType: context || 'unknown', changes });
  }

  recordBatchUpdate(entityIds: string[], changes: PropertyChange[], context?: string): ProvenanceEntry[] {
    return entityIds.map(entityId => this.recordUpdate(entityId, changes, context));
  }

  getHistory(_entityId: string): ProvenanceEntry[] {
    return [];
  }

  clear(): void {
    // No-op in stub
  }
}

export const provenanceService = new ProvenanceService();
