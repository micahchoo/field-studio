/**
 * Compatibility Report Component
 * Displays IIIF viewer compatibility analysis
 *
 * Shows scores for Mirador, Universal Viewer, Annona, and Clover
 */

import React, { useEffect, useState } from 'react';
import { IIIFItem } from '@/src/shared/types';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import {
  CompatibilityIssue,
  CompatibilityReport as Report,
  viewerCompatibility,
  ViewerName
} from '../services/viewerCompatibility';

interface CompatibilityReportProps {
  root: IIIFItem | null;
  fieldMode?: boolean;
  onClose?: () => void;
}

const VIEWER_INFO: Record<ViewerName, { name: string; url: string; icon: string }> = {
  mirador: {
    name: 'Mirador 3',
    url: 'https://projectmirador.org',
    icon: 'grid_view'
  },
  universalviewer: {
    name: 'Universal Viewer',
    url: 'https://universalviewer.io',
    icon: 'web'
  },
  annona: {
    name: 'Annona',
    url: 'https://ncsu-libraries.github.io/annona/',
    icon: 'format_quote'
  },
  clover: {
    name: 'Clover',
    url: 'https://samvera-labs.github.io/clover-iiif/',
    icon: 'local_florist'
  }
};

export const CompatibilityReportPanel: React.FC<CompatibilityReportProps> = ({
  root,
  fieldMode = false,
  onClose
}) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedViewer, setSelectedViewer] = useState<ViewerName | 'all'>('all');

  useEffect(() => {
    if (root) {
      setLoading(true);
      // Run compatibility check (simulated async for large trees)
      setTimeout(() => {
        const result = viewerCompatibility.checkCompatibility(root);
        setReport(result);
        setLoading(false);
      }, 100);
    }
  }, [root]);

  if (!root) {
    return (
      <div className={`p-8 text-center ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
        <Icon name="warning" className="text-4xl mb-2" />
        <p>No manifest to analyze</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`p-8 text-center ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <div className="animate-spin inline-block w-8 h-8 border-2 border-current border-t-transparent rounded-full mb-4" />
        <p>Analyzing compatibility...</p>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const getScoreColor = (score: number): string => {
    if (score >= 80) return fieldMode ? 'text-green-400' : 'text-green-600';
    if (score >= 50) return fieldMode ? 'text-yellow-400' : 'text-yellow-600';
    return fieldMode ? 'text-red-400' : 'text-red-600';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 80) return fieldMode ? 'bg-green-900/30' : 'bg-green-50';
    if (score >= 50) return fieldMode ? 'bg-yellow-900/30' : 'bg-yellow-50';
    return fieldMode ? 'bg-red-900/30' : 'bg-red-50';
  };

  const filteredIssues = selectedViewer === 'all'
    ? report.issues
    : report.issues.filter(i => i.viewer === selectedViewer);

  const groupedIssues = {
    error: filteredIssues.filter(i => i.severity === 'error'),
    warning: filteredIssues.filter(i => i.severity === 'warning'),
    info: filteredIssues.filter(i => i.severity === 'info')
  };

  return (
    <div className={`flex flex-col h-full ${fieldMode ? 'bg-black text-white' : 'bg-white'}`}>
      {/* Header */}
      <div className={`
        p-4 border-b flex items-center justify-between shrink-0
        ${fieldMode ? 'border-slate-800' : 'border-slate-200'}
      `}>
        <div className="flex items-center gap-3">
          <Icon name="verified" className={fieldMode ? 'text-yellow-400 text-xl' : 'text-blue-600 text-xl'} />
          <div>
            <h2 className={`font-bold ${fieldMode ? 'text-yellow-400' : 'text-slate-800'}`}>
              Viewer Compatibility
            </h2>
            <p className={`text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {report.timestamp}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`p-2 rounded ${fieldMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
            aria-label="Close compatibility report"
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      {/* Overall Score */}
      <div className={`p-4 border-b ${fieldMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center justify-center gap-4">
          <div className={`
            w-24 h-24 rounded-full flex items-center justify-center
            ${getScoreBg(report.overallScore)}
          `}>
            <span className={`text-3xl font-black ${getScoreColor(report.overallScore)}`}>
              {report.overallScore}
            </span>
          </div>
          <div>
            <div className={`text-lg font-bold ${fieldMode ? 'text-white' : 'text-slate-800'}`}>
              Overall Score
            </div>
            <div className={`text-sm ${fieldMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {report.overallScore >= 80 && 'Excellent compatibility'}
              {report.overallScore >= 50 && report.overallScore < 80 && 'Some issues to address'}
              {report.overallScore < 50 && 'Critical issues found'}
            </div>
          </div>
        </div>
      </div>

      {/* Viewer Scores Grid */}
      <div className={`p-4 border-b ${fieldMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(report.viewerScores) as [ViewerName, number][]).map(([viewer, score]) => (
            <button
              key={viewer}
              onClick={() => setSelectedViewer(selectedViewer === viewer ? 'all' : viewer)}
              className={`
                p-3 rounded-lg text-left transition-all
                ${selectedViewer === viewer
                  ? fieldMode
                    ? 'ring-2 ring-yellow-400 bg-slate-800'
                    : 'ring-2 ring-blue-500 bg-blue-50'
                  : fieldMode
                    ? 'bg-slate-900 hover:bg-slate-800'
                    : 'bg-slate-50 hover:bg-slate-100'
                }
              `}
              aria-pressed={selectedViewer === viewer}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon name={VIEWER_INFO[viewer].icon} className="text-sm" />
                <span className={`text-sm font-medium ${fieldMode ? 'text-white' : 'text-slate-700'}`}>
                  {VIEWER_INFO[viewer].name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-black ${getScoreColor(score)}`}>
                  {score}
                </span>
                <span className={`text-xs ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  /100
                </span>
              </div>
            </button>
          ))}
        </div>
        {selectedViewer !== 'all' && (
          <button
            onClick={() => setSelectedViewer('all')}
            className={`
              mt-3 w-full py-2 text-xs font-medium rounded
              ${fieldMode
                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }
            `}
          >
            Show all viewers
          </button>
        )}
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredIssues.length === 0 ? (
          <div className={`text-center py-8 ${fieldMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <Icon name="check_circle" className="text-4xl text-green-500 mb-2" />
            <p className="font-medium">No issues found!</p>
            <p className="text-sm">
              {selectedViewer === 'all'
                ? 'Manifest is compatible with all tested viewers'
                : `Manifest is fully compatible with ${VIEWER_INFO[selectedViewer].name}`
              }
            </p>
          </div>
        ) : (
          <>
            {groupedIssues.error.length > 0 && (
              <div>
                <h3 className={`
                  text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2
                  ${fieldMode ? 'text-red-400' : 'text-red-600'}
                `}>
                  <Icon name="error" />
                  Errors ({groupedIssues.error.length})
                </h3>
                <div className="space-y-2">
                  {groupedIssues.error.map((issue, idx) => (
                    <IssueCard key={idx} issue={issue} fieldMode={fieldMode} />
                  ))}
                </div>
              </div>
            )}

            {groupedIssues.warning.length > 0 && (
              <div>
                <h3 className={`
                  text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2
                  ${fieldMode ? 'text-yellow-400' : 'text-yellow-600'}
                `}>
                  <Icon name="warning" />
                  Warnings ({groupedIssues.warning.length})
                </h3>
                <div className="space-y-2">
                  {groupedIssues.warning.map((issue, idx) => (
                    <IssueCard key={idx} issue={issue} fieldMode={fieldMode} />
                  ))}
                </div>
              </div>
            )}

            {groupedIssues.info.length > 0 && (
              <div>
                <h3 className={`
                  text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2
                  ${fieldMode ? 'text-blue-400' : 'text-blue-600'}
                `}>
                  <Icon name="info" />
                  Info ({groupedIssues.info.length})
                </h3>
                <div className="space-y-2">
                  {groupedIssues.info.map((issue, idx) => (
                    <IssueCard key={idx} issue={issue} fieldMode={fieldMode} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export Report */}
      <div className={`p-4 border-t shrink-0 ${fieldMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <button
          onClick={() => {
            const markdown = viewerCompatibility.formatReportMarkdown(report);
            const blob = new Blob([markdown], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'compatibility-report.md';
            a.click();
            URL.revokeObjectURL(url);
          }}
          className={`
            w-full py-2.5 px-4 rounded-lg font-bold text-sm flex items-center justify-center gap-2
            ${fieldMode
              ? 'bg-yellow-400 text-black hover:bg-yellow-300'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          <Icon name="download" />
          Export Report (Markdown)
        </button>
      </div>
    </div>
  );
};

// Issue Card Sub-component
const IssueCard: React.FC<{ issue: CompatibilityIssue; fieldMode: boolean }> = ({
  issue,
  fieldMode
}) => {
  const [expanded, setExpanded] = useState(false);

  const severityColors = {
    error: fieldMode ? 'border-red-700 bg-red-900/20' : 'border-red-200 bg-red-50',
    warning: fieldMode ? 'border-yellow-700 bg-yellow-900/20' : 'border-yellow-200 bg-yellow-50',
    info: fieldMode ? 'border-blue-700 bg-blue-900/20' : 'border-blue-200 bg-blue-50'
  };

  return (
    <div className={`border rounded-lg p-3 ${severityColors[issue.severity]}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-2"
        aria-expanded={expanded}
      >
        <span className={`
          text-[10px] font-bold uppercase px-1.5 py-0.5 rounded
          ${fieldMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'}
        `}>
          {issue.viewer}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${fieldMode ? 'text-white' : 'text-slate-700'}`}>
            {issue.message}
          </p>
        </div>
        <Icon name={expanded ? 'expand_less' : 'expand_more'} className="shrink-0" />
      </button>

      {expanded && (
        <div className={`mt-2 pt-2 border-t text-xs space-y-1 ${
          fieldMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
        }`}>
          <div>
            <span className="opacity-60">Resource:</span>{' '}
            <span className="font-mono break-all">{issue.resourceId}</span>
          </div>
          <div>
            <span className="opacity-60">Type:</span> {issue.resourceType}
          </div>
          {issue.recommendation && (
            <div className={`
              mt-2 p-2 rounded
              ${fieldMode ? 'bg-slate-800' : 'bg-white'}
            `}>
              <span className="font-bold">Fix: </span>
              {issue.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
