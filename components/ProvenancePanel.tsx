/**
 * Provenance Panel Component
 * Displays chain of custody and modification history for resources
 *
 * Consistent with Inspector panel styling and design system
 */

import React, { useState } from 'react';
import { IIIFItem } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { PropertyChange, ProvenanceEntry, provenanceService, useProvenance } from '@/src/shared/services/provenanceService';
import { COLORS, FEEDBACK, SPACING } from '../designSystem';

interface ProvenancePanelProps {
  resourceId: string | null;
  fieldMode?: boolean;
}

export const ProvenancePanel: React.FC<ProvenancePanelProps> = ({
  resourceId,
  fieldMode = false
}) => {
  const { provenance, history } = useProvenance(resourceId);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  if (!resourceId || !provenance) {
    return (
      <div className={`p-6 text-center ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
        <Icon name="history" className="text-3xl mb-2 opacity-50" />
        <p className="text-sm">No provenance data available</p>
        <p className="text-xs mt-1 opacity-75">
          Provenance tracking begins when resources are ingested
        </p>
      </div>
    );
  }

  const toggleEntry = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action: string): string => {
    switch (action) {
      case 'create': return 'add_circle';
      case 'ingest': return 'upload_file';
      case 'update': return 'edit';
      case 'batch-update': return 'edit_note';
      case 'delete': return 'delete';
      case 'export': return 'download';
      case 'import-external': return 'cloud_download';
      case 'merge': return 'merge';
      default: return 'info';
    }
  };

  const getActionColor = (action: string): string => {
    switch (action) {
      case 'create':
      case 'ingest':
        return fieldMode ? 'text-green-400' : 'text-green-600';
      case 'update':
      case 'batch-update':
        return fieldMode ? 'text-blue-400' : 'text-blue-600';
      case 'delete':
        return fieldMode ? 'text-red-400' : 'text-red-600';
      case 'export':
        return fieldMode ? 'text-purple-400' : 'text-purple-600';
      default:
        return fieldMode ? 'text-slate-400' : 'text-slate-500';
    }
  };

  const renderPropertyChange = (change: PropertyChange) => (
    <div
      key={change.property}
      className={`text-xs py-1 border-l-2 pl-2 ${
        fieldMode ? 'border-slate-700' : 'border-slate-200'
      }`}
    >
      <span className={`font-mono ${fieldMode ? 'text-yellow-400' : 'text-slate-600'}`}>
        {change.property}
      </span>
      <div className="flex items-center gap-2 mt-0.5">
        <span className={fieldMode ? 'text-red-400' : 'text-red-500'}>
          {typeof change.oldValue === 'object'
            ? JSON.stringify(change.oldValue).substring(0, 30)
            : String(change.oldValue || '(empty)').substring(0, 30)}
        </span>
        <span className={fieldMode ? 'text-slate-600' : 'text-slate-400'}>→</span>
        <span className={fieldMode ? 'text-green-400' : 'text-green-600'}>
          {typeof change.newValue === 'object'
            ? JSON.stringify(change.newValue).substring(0, 30)
            : String(change.newValue || '(empty)').substring(0, 30)}
        </span>
      </div>
    </div>
  );

  const renderEntry = (entry: ProvenanceEntry, index: number) => {
    const isExpanded = expandedEntries.has(entry.id);
    const hasDetails = entry.changes?.length || entry.source || entry.description;

    return (
      <div
        key={entry.id}
        className={`
          border-l-2 pl-4 py-3 relative
          ${index === 0 ? 'border-l-blue-500' : fieldMode ? 'border-l-slate-700' : 'border-l-slate-200'}
        `}
      >
        {/* Timeline dot */}
        <div
          className={`
            absolute left-0 top-4 w-2 h-2 rounded-full -translate-x-[5px]
            ${index === 0
              ? 'bg-blue-500'
              : fieldMode ? 'bg-slate-600' : 'bg-slate-300'
            }
          `}
        />

        {/* Entry header */}
        <button
          onClick={() => hasDetails && toggleEntry(entry.id)}
          className={`
            w-full text-left flex items-start gap-2
            ${hasDetails ? 'cursor-pointer' : 'cursor-default'}
          `}
          aria-expanded={hasDetails ? isExpanded : undefined}
        >
          <Icon
            name={getActionIcon(entry.action)}
            className={`text-lg ${getActionColor(entry.action)}`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`
                text-xs font-bold uppercase tracking-wide
                ${fieldMode ? 'text-slate-300' : 'text-slate-700'}
              `}>
                {entry.action.replace('-', ' ')}
              </span>
              {entry.affectedCount && entry.affectedCount > 1 && (
                <span className={`
                  text-[10px] px-1.5 py-0.5 rounded
                  ${fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}
                `}>
                  {entry.affectedCount} items
                </span>
              )}
            </div>
            <div className={`text-xs mt-0.5 ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {formatTimestamp(entry.timestamp)}
            </div>
            <div className={`text-xs mt-0.5 ${fieldMode ? 'text-slate-600' : 'text-slate-500'}`}>
              by {entry.agent.name}
              {entry.agent.version && ` v${entry.agent.version}`}
            </div>
          </div>
          {hasDetails && (
            <Icon
              name={isExpanded ? 'expand_less' : 'expand_more'}
              className={fieldMode ? 'text-slate-500' : 'text-slate-400'}
            />
          )}
        </button>

        {/* Expanded details */}
        {isExpanded && hasDetails && (
          <div className={`mt-3 space-y-2 ${fieldMode ? 'text-slate-400' : 'text-slate-600'}`}>
            {entry.description && (
              <p className="text-xs">{entry.description}</p>
            )}

            {entry.source && (
              <div className={`
                p-2 rounded text-xs space-y-1
                ${fieldMode ? 'bg-slate-900' : 'bg-slate-50'}
              `}>
                <div className="font-bold">Source File</div>
                <div>
                  <span className="opacity-60">Name:</span> {entry.source.filename}
                </div>
                <div>
                  <span className="opacity-60">Size:</span>{' '}
                  {(entry.source.fileSize / 1024).toFixed(1)} KB
                </div>
                <div>
                  <span className="opacity-60">Type:</span> {entry.source.mimeType}
                </div>
                <div className="font-mono text-[10px] break-all">
                  <span className="opacity-60">SHA-256:</span> {entry.source.checksum}
                </div>
              </div>
            )}

            {entry.changes && entry.changes.length > 0 && (
              <div className="space-y-1">
                <div className={`text-xs font-bold ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>
                  Changes ({entry.changes.length})
                </div>
                {entry.changes.map(renderPropertyChange)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${fieldMode ? 'bg-black text-white' : 'bg-white'}`}>
      {/* Header */}
      <div className={`
        p-4 border-b flex items-center justify-between
        ${fieldMode ? 'border-slate-800' : 'border-slate-200'}
      `}>
        <div className="flex items-center gap-2">
          <Icon name="history" className={fieldMode ? 'text-yellow-400' : 'text-slate-600'} />
          <span className={`
            text-xs font-bold uppercase tracking-wider
            ${fieldMode ? 'text-yellow-400' : 'text-slate-600'}
          `}>
            Provenance
          </span>
        </div>
        <span className={`
          text-xs px-2 py-0.5 rounded
          ${fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}
        `}>
          {history.length} events
        </span>
      </div>

      {/* Fixity Badge */}
      {provenance.created.source?.checksum && (
        <div className={`
          mx-4 mt-4 p-3 rounded-lg flex items-center gap-3
          ${fieldMode ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'}
        `}>
          <Icon
            name="verified"
            className={fieldMode ? 'text-green-400 text-xl' : 'text-green-600 text-xl'}
          />
          <div>
            <div className={`text-xs font-bold ${fieldMode ? 'text-green-400' : 'text-green-700'}`}>
              Fixity Verified
            </div>
            <div className={`text-[10px] ${fieldMode ? 'text-green-500' : 'text-green-600'}`}>
              Original checksum preserved
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="p-4 space-y-0">
        {history.map((entry, index) => renderEntry(entry, index))}
      </div>

      {/* Export Actions */}
      <div className={`
        p-4 border-t flex gap-2
        ${fieldMode ? 'border-slate-800' : 'border-slate-200'}
      `}>
        <button
          onClick={() => {
            const premis = provenanceService.exportPREMIS(resourceId!);
            const blob = new Blob([premis], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `provenance-${resourceId!.split('/').pop()}.xml`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className={`
            flex-1 py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2
            ${fieldMode
              ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }
          `}
          aria-label="Export provenance as PREMIS XML"
        >
          <Icon name="code" />
          Export PREMIS
        </button>
        <button
          onClick={() => {
            const json = provenanceService.exportAllJSON();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'provenance-all.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className={`
            flex-1 py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2
            ${fieldMode
              ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }
          `}
          aria-label="Export all provenance as JSON"
        >
          <Icon name="download" />
          Export JSON
        </button>
      </div>
    </div>
  );
};
