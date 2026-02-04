/**
 * ContextDebugPanel
 *
 * Dev-only overlay that exposes the current UserIntent + ResourceContext
 * state at a glance.  Useful during development to verify that context
 * providers are wired correctly and intent transitions fire as expected.
 *
 * Activation:  append `?debug=true` to the URL.
 * In production the panel renders nothing (zero cost).
 */

import React from 'react';
import { useUserIntentOptional } from '../hooks/useUserIntent';
import { useResourceContextOptional } from '../hooks/useResourceContext';

export const ContextDebugPanel: React.FC = () => {
  const intent   = useUserIntentOptional();
  const resource = useResourceContextOptional();

  // Guard: only render when the debug flag is explicitly set
  const isDebug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debug');

  if (!isDebug) return null;

  const row: React.CSSProperties = { display: 'flex', gap: 6, marginBottom: 2 };
  const key: React.CSSProperties  = { color: '#64748b', minWidth: 72 };
  const val: React.CSSProperties  = { color: '#f8fafc' };
  const dim: React.CSSProperties  = { color: '#64748b', fontSize: 9 };

  return (
    <div style={{
      position: 'fixed',
      bottom: 8,
      left: 8,
      zIndex: 9999,
      background: 'rgba(15,23,42,0.92)',
      color: '#94a3b8',
      fontSize: 10,
      fontFamily: 'ui-monospace, monospace',
      padding: '8px 12px',
      borderRadius: 6,
      border: '1px solid rgba(148,163,184,0.25)',
      maxWidth: 300,
      pointerEvents: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    }}>
      {/* Title */}
      <div style={{ color: '#60a5fa', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: 9 }}>
        Context Debug
      </div>

      {/* Intent row */}
      <div style={row}>
        <span style={key}>intent</span>
        <span style={val}>{intent?.intent ?? '—'}</span>
        {intent?.area       && <span style={dim}>[{intent.area}]</span>}
        {intent?.resourceId && <span style={dim}>#{intent.resourceId.slice(-8)}</span>}
      </div>

      {/* Resource row */}
      <div style={row}>
        <span style={key}>resource</span>
        <span style={val}>{resource?.type ?? '—'}</span>
        {resource?.resource && <span style={dim}>#{resource.resource.id.slice(-8)}</span>}
      </div>

      {/* Validation row */}
      <div style={row}>
        <span style={key}>valid.</span>
        <span style={{
          ...val,
          color: resource?.validationStatus
            ? (resource.validationStatus.totalIssues > 0 ? '#f59e0b' : '#10b981')
            : '#64748b',
        }}>
          {resource?.validationStatus
            ? `${resource.validationStatus.totalIssues} issue${resource.validationStatus.totalIssues !== 1 ? 's' : ''}`
            : '—'}
        </span>
      </div>

      {/* Meta (only if non-empty) */}
      {intent?.meta && Object.keys(intent.meta).length > 0 && (
        <div style={row}>
          <span style={key}>meta</span>
          <span style={{ ...dim, wordBreak: 'break-all' }}>{JSON.stringify(intent.meta)}</span>
        </div>
      )}
    </div>
  );
};
