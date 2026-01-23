/**
 * Provenance Service
 * Tracks chain of custody and modification history for all resources
 *
 * Implements:
 * - Ingest tracking with checksums
 * - Modification history per resource
 * - Export audit trail
 * - PREMIS metadata export
 */

import { IIIFItem } from '../types';

// ============================================================================
// Types
// ============================================================================

export type ProvenanceAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'merge'
  | 'export'
  | 'ingest'
  | 'batch-update'
  | 'import-external';

export interface ProvenanceAgent {
  type: 'Person' | 'Software';
  name: string;
  version?: string;
}

export interface PropertyChange {
  property: string;
  oldValue: any;
  newValue: any;
}

export interface IngestSource {
  filename: string;
  originalPath?: string;
  fileSize: number;
  mimeType: string;
  checksum: string; // SHA-256
  createdDate?: string; // Original file creation date
  modifiedDate?: string; // Original file modification date
  ingestTimestamp: string;
}

export interface ProvenanceEntry {
  id: string;
  timestamp: string; // ISO 8601
  action: ProvenanceAction;
  agent: ProvenanceAgent;
  description?: string;
  changes?: PropertyChange[];
  source?: IngestSource;
  affectedCount?: number; // For batch operations
}

export interface ResourceProvenance {
  resourceId: string;
  resourceType: string;
  created: ProvenanceEntry;
  modified: ProvenanceEntry[];
  exports: ProvenanceEntry[];
}

// ============================================================================
// Checksum Utility
// ============================================================================

async function computeChecksum(data: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Provenance Service
// ============================================================================

class ProvenanceService {
  private provenanceMap: Map<string, ResourceProvenance> = new Map();
  private sessionAgent: ProvenanceAgent;

  constructor() {
    this.sessionAgent = {
      type: 'Software',
      name: 'IIIF Field Studio',
      version: '1.0.0'
    };
  }

  /**
   * Set the current user agent for provenance tracking
   */
  setAgent(agent: ProvenanceAgent): void {
    this.sessionAgent = agent;
  }

  /**
   * Generate a unique entry ID
   */
  private generateEntryId(): string {
    return `prov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record resource creation
   */
  recordCreate(
    resourceId: string,
    resourceType: string,
    source?: IngestSource
  ): ProvenanceEntry {
    const entry: ProvenanceEntry = {
      id: this.generateEntryId(),
      timestamp: new Date().toISOString(),
      action: 'create',
      agent: this.sessionAgent,
      source
    };

    const provenance: ResourceProvenance = {
      resourceId,
      resourceType,
      created: entry,
      modified: [],
      exports: []
    };

    this.provenanceMap.set(resourceId, provenance);
    return entry;
  }

  /**
   * Record file ingest with checksum
   */
  async recordIngest(
    resourceId: string,
    resourceType: string,
    file: File
  ): Promise<ProvenanceEntry> {
    const arrayBuffer = await file.arrayBuffer();
    const checksum = await computeChecksum(arrayBuffer);

    const source: IngestSource = {
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      checksum,
      modifiedDate: new Date(file.lastModified).toISOString(),
      ingestTimestamp: new Date().toISOString()
    };

    return this.recordCreate(resourceId, resourceType, source);
  }

  /**
   * Record resource update
   */
  recordUpdate(
    resourceId: string,
    changes: PropertyChange[],
    description?: string
  ): ProvenanceEntry | null {
    const provenance = this.provenanceMap.get(resourceId);
    if (!provenance) {
      console.warn(`No provenance record for ${resourceId}`);
      return null;
    }

    const entry: ProvenanceEntry = {
      id: this.generateEntryId(),
      timestamp: new Date().toISOString(),
      action: 'update',
      agent: this.sessionAgent,
      changes,
      description
    };

    provenance.modified.push(entry);
    return entry;
  }

  /**
   * Record batch update affecting multiple resources
   */
  recordBatchUpdate(
    resourceIds: string[],
    changes: PropertyChange[],
    description?: string
  ): ProvenanceEntry[] {
    const entries: ProvenanceEntry[] = [];

    for (const resourceId of resourceIds) {
      const entry = this.recordUpdate(resourceId, changes, description);
      if (entry) {
        entry.action = 'batch-update';
        entry.affectedCount = resourceIds.length;
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Record export event
   */
  recordExport(
    resourceId: string,
    format: string,
    destination?: string
  ): ProvenanceEntry | null {
    const provenance = this.provenanceMap.get(resourceId);
    if (!provenance) return null;

    const entry: ProvenanceEntry = {
      id: this.generateEntryId(),
      timestamp: new Date().toISOString(),
      action: 'export',
      agent: this.sessionAgent,
      description: `Exported as ${format}${destination ? ` to ${destination}` : ''}`
    };

    provenance.exports.push(entry);
    return entry;
  }

  /**
   * Record external manifest import
   */
  recordExternalImport(
    resourceId: string,
    resourceType: string,
    sourceUrl: string
  ): ProvenanceEntry {
    const entry: ProvenanceEntry = {
      id: this.generateEntryId(),
      timestamp: new Date().toISOString(),
      action: 'import-external',
      agent: this.sessionAgent,
      description: `Imported from ${sourceUrl}`
    };

    const provenance: ResourceProvenance = {
      resourceId,
      resourceType,
      created: entry,
      modified: [],
      exports: []
    };

    this.provenanceMap.set(resourceId, provenance);
    return entry;
  }

  /**
   * Get provenance for a resource
   */
  getProvenance(resourceId: string): ResourceProvenance | null {
    return this.provenanceMap.get(resourceId) || null;
  }

  /**
   * Get full modification history for a resource
   */
  getHistory(resourceId: string): ProvenanceEntry[] {
    const provenance = this.provenanceMap.get(resourceId);
    if (!provenance) return [];

    return [
      provenance.created,
      ...provenance.modified,
      ...provenance.exports
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Export provenance as PREMIS XML
   */
  exportPREMIS(resourceId: string): string {
    const provenance = this.provenanceMap.get(resourceId);
    if (!provenance) return '';

    const events = this.getHistory(resourceId);

    const eventXml = events.map(event => `
    <premis:event>
      <premis:eventIdentifier>
        <premis:eventIdentifierType>local</premis:eventIdentifierType>
        <premis:eventIdentifierValue>${event.id}</premis:eventIdentifierValue>
      </premis:eventIdentifier>
      <premis:eventType>${event.action}</premis:eventType>
      <premis:eventDateTime>${event.timestamp}</premis:eventDateTime>
      <premis:eventOutcome>success</premis:eventOutcome>
      ${event.description ? `<premis:eventOutcomeDetail>
        <premis:eventOutcomeDetailNote>${this.escapeXml(event.description)}</premis:eventOutcomeDetailNote>
      </premis:eventOutcomeDetail>` : ''}
      <premis:linkingAgentIdentifier>
        <premis:linkingAgentIdentifierType>${event.agent.type.toLowerCase()}</premis:linkingAgentIdentifierType>
        <premis:linkingAgentIdentifierValue>${this.escapeXml(event.agent.name)}${event.agent.version ? ` v${event.agent.version}` : ''}</premis:linkingAgentIdentifierValue>
      </premis:linkingAgentIdentifier>
      <premis:linkingObjectIdentifier>
        <premis:linkingObjectIdentifierType>URI</premis:linkingObjectIdentifierType>
        <premis:linkingObjectIdentifierValue>${this.escapeXml(resourceId)}</premis:linkingObjectIdentifierValue>
      </premis:linkingObjectIdentifier>
    </premis:event>`).join('\n');

    // Add fixity information if we have a source with checksum
    let fixityXml = '';
    if (provenance.created.source?.checksum) {
      fixityXml = `
    <premis:objectCharacteristics>
      <premis:fixity>
        <premis:messageDigestAlgorithm>SHA-256</premis:messageDigestAlgorithm>
        <premis:messageDigest>${provenance.created.source.checksum}</premis:messageDigest>
        <premis:messageDigestOriginator>${this.escapeXml(this.sessionAgent.name)}</premis:messageDigestOriginator>
      </premis:fixity>
      <premis:size>${provenance.created.source.fileSize}</premis:size>
      <premis:format>
        <premis:formatDesignation>
          <premis:formatName>${this.escapeXml(provenance.created.source.mimeType)}</premis:formatName>
        </premis:formatDesignation>
      </premis:format>
    </premis:objectCharacteristics>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<premis:premis xmlns:premis="http://www.loc.gov/premis/v3"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xsi:schemaLocation="http://www.loc.gov/premis/v3 http://www.loc.gov/standards/premis/premis.xsd"
               version="3.0">
  <premis:object xsi:type="premis:file">
    <premis:objectIdentifier>
      <premis:objectIdentifierType>URI</premis:objectIdentifierType>
      <premis:objectIdentifierValue>${this.escapeXml(resourceId)}</premis:objectIdentifierValue>
    </premis:objectIdentifier>
    <premis:objectCategory>${provenance.resourceType}</premis:objectCategory>
    ${provenance.created.source?.filename ? `<premis:originalName>${this.escapeXml(provenance.created.source.filename)}</premis:originalName>` : ''}
    ${fixityXml}
  </premis:object>
${eventXml}
</premis:premis>`;
  }

  /**
   * Export all provenance as JSON
   */
  exportAllJSON(): string {
    const all: Record<string, ResourceProvenance> = {};
    for (const [id, prov] of this.provenanceMap) {
      all[id] = prov;
    }
    return JSON.stringify(all, null, 2);
  }

  /**
   * Import provenance from JSON
   */
  importJSON(json: string): void {
    try {
      const data = JSON.parse(json) as Record<string, ResourceProvenance>;
      for (const [id, prov] of Object.entries(data)) {
        this.provenanceMap.set(id, prov);
      }
    } catch (e) {
      console.error('Failed to import provenance:', e);
    }
  }

  /**
   * Get statistics about tracked resources
   */
  getStats(): {
    resourceCount: number;
    totalModifications: number;
    totalExports: number;
    resourcesByType: Record<string, number>;
  } {
    let totalModifications = 0;
    let totalExports = 0;
    const resourcesByType: Record<string, number> = {};

    for (const prov of this.provenanceMap.values()) {
      totalModifications += prov.modified.length;
      totalExports += prov.exports.length;
      resourcesByType[prov.resourceType] = (resourcesByType[prov.resourceType] || 0) + 1;
    }

    return {
      resourceCount: this.provenanceMap.size,
      totalModifications,
      totalExports,
      resourcesByType
    };
  }

  /**
   * Clear all provenance data
   */
  clear(): void {
    this.provenanceMap.clear();
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const provenanceService = new ProvenanceService();

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect } from 'react';

export function useProvenance(resourceId: string | null) {
  const [provenance, setProvenance] = useState<ResourceProvenance | null>(null);
  const [history, setHistory] = useState<ProvenanceEntry[]>([]);

  useEffect(() => {
    if (resourceId) {
      setProvenance(provenanceService.getProvenance(resourceId));
      setHistory(provenanceService.getHistory(resourceId));
    } else {
      setProvenance(null);
      setHistory([]);
    }
  }, [resourceId]);

  return { provenance, history };
}
