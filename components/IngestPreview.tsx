/**
 * IngestPreview - Two-Pass Ingest Preview Component
 *
 * Shows the analyzed folder structure with proposed IIIF types,
 * allowing users to review and adjust before actual ingest.
 */

import React, { useState, useMemo } from 'react';
import {
  IngestAnalysisResult,
  IngestPreviewNode,
  ProposedIIIFType,
  overrideNodeType
} from '../services/ingestAnalyzer';
import { Icon } from './Icon';

interface IngestPreviewProps {
  analysis: IngestAnalysisResult;
  onConfirm: (updatedPreview: IngestPreviewNode) => void;
  onCancel: () => void;
}

const TYPE_CONFIG: Record<ProposedIIIFType, { icon: string; color: string; bgColor: string; label: string }> = {
  Collection: {
    icon: 'library_books',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    label: 'Collection'
  },
  Manifest: {
    icon: 'menu_book',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 border-emerald-200',
    label: 'Manifest'
  },
  Excluded: {
    icon: 'block',
    color: 'text-slate-400',
    bgColor: 'bg-slate-50 border-slate-200',
    label: 'Excluded'
  }
};

const PreviewNode: React.FC<{
  node: IngestPreviewNode;
  onTypeChange: (path: string, newType: ProposedIIIFType) => void;
  expanded: Set<string>;
  onToggleExpand: (path: string) => void;
}> = ({ node, onTypeChange, expanded, onToggleExpand }) => {
  const config = TYPE_CONFIG[node.proposedType];
  const isExpanded = expanded.has(node.path);
  const hasChildren = node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${config.bgColor} ${
          node.userOverride ? 'ring-2 ring-blue-400' : ''
        }`}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={() => onToggleExpand(node.path)}
            className="p-1 hover:bg-black/10 rounded"
          >
            <Icon
              name={isExpanded ? 'expand_more' : 'chevron_right'}
              className="text-sm text-slate-500"
            />
          </button>
        ) : (
          <span className="w-6" />
        )}

        {/* Type icon */}
        <Icon name={config.icon} className={`text-lg ${config.color}`} />

        {/* Label and path */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-800 truncate">{node.label}</div>
          <div className="text-xs text-slate-400 truncate">{node.path || '/'}</div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {node.stats.imageCount > 0 && (
            <span className="flex items-center gap-1">
              <Icon name="image" className="text-sm" />
              {node.stats.imageCount}
            </span>
          )}
          {node.stats.videoCount > 0 && (
            <span className="flex items-center gap-1">
              <Icon name="videocam" className="text-sm" />
              {node.stats.videoCount}
            </span>
          )}
          {node.stats.subdirCount > 0 && (
            <span className="flex items-center gap-1">
              <Icon name="folder" className="text-sm" />
              {node.stats.subdirCount}
            </span>
          )}
        </div>

        {/* Confidence indicator */}
        <div
          className={`w-2 h-2 rounded-full ${
            node.confidence >= 0.8
              ? 'bg-emerald-500'
              : node.confidence >= 0.5
              ? 'bg-amber-500'
              : 'bg-slate-300'
          }`}
          title={`Confidence: ${Math.round(node.confidence * 100)}%`}
        />

        {/* Type selector */}
        <select
          value={node.proposedType}
          onChange={(e) => onTypeChange(node.path, e.target.value as ProposedIIIFType)}
          className="text-xs px-2 py-1 rounded border border-slate-300 bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
        >
          <option value="Collection">Collection</option>
          <option value="Manifest">Manifest</option>
          <option value="Excluded">Excluded</option>
        </select>
      </div>

      {/* Detection reasons (collapsed by default) */}
      {node.userOverride && (
        <div className="ml-8 mt-1 text-xs text-blue-600 flex items-center gap-1">
          <Icon name="edit" className="text-sm" />
          User override
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-2">
          {node.children.map((child) => (
            <PreviewNode
              key={child.path}
              node={child}
              onTypeChange={onTypeChange}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const IngestPreview: React.FC<IngestPreviewProps> = ({
  analysis,
  onConfirm,
  onCancel
}) => {
  const [previewRoot, setPreviewRoot] = useState(analysis.root);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Auto-expand first two levels
    const initial = new Set<string>();
    initial.add(analysis.root.path);
    analysis.root.children.forEach((c) => initial.add(c.path));
    return initial;
  });

  // Recompute summary when preview changes
  const summary = useMemo(() => {
    let manifests = 0;
    let collections = 0;
    let excluded = 0;
    let images = 0;

    const traverse = (node: IngestPreviewNode) => {
      if (node.proposedType === 'Manifest') manifests++;
      else if (node.proposedType === 'Collection') collections++;
      else excluded++;
      images += node.stats.imageCount;
      node.children.forEach(traverse);
    };

    traverse(previewRoot);
    return { manifests, collections, excluded, images };
  }, [previewRoot]);

  const handleTypeChange = (path: string, newType: ProposedIIIFType) => {
    setPreviewRoot((prev) => overrideNodeType(prev, path, newType));
  };

  const handleToggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const all = new Set<string>();
    const traverse = (node: IngestPreviewNode) => {
      all.add(node.path);
      node.children.forEach(traverse);
    };
    traverse(previewRoot);
    setExpanded(all);
  };

  const handleCollapseAll = () => {
    setExpanded(new Set([previewRoot.path]));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/10 rounded-xl">
            <Icon name="folder_open" className="text-2xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Ingest Preview</h2>
            <p className="text-sm text-slate-300">
              Review and adjust the proposed IIIF structure before importing
            </p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{summary.collections}</div>
            <div className="text-xs text-slate-300">Collections</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{summary.manifests}</div>
            <div className="text-xs text-slate-300">Manifests</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{summary.images}</div>
            <div className="text-xs text-slate-300">Images</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-slate-400">{summary.excluded}</div>
            <div className="text-xs text-slate-300">Excluded</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 bg-slate-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <Icon name="library_books" className="text-amber-600" />
            <span className="text-slate-600">Collection = curated list of references</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="menu_book" className="text-emerald-600" />
            <span className="text-slate-600">Manifest = atomic object (book, artwork)</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <Icon name="unfold_more" className="text-sm" /> Expand all
          </button>
          <button
            onClick={handleCollapseAll}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
          >
            <Icon name="unfold_less" className="text-sm" /> Collapse
          </button>
        </div>
      </div>

      {/* Tree view */}
      <div className="flex-1 overflow-auto p-6 space-y-1">
        <PreviewNode
          node={previewRoot}
          onTypeChange={handleTypeChange}
          expanded={expanded}
          onToggleExpand={handleToggleExpand}
        />
      </div>

      {/* IIIF Model explanation */}
      <div className="px-6 py-3 bg-blue-50 border-t border-blue-200">
        <div className="flex items-start gap-2 text-xs text-blue-700">
          <Icon name="info" className="text-sm mt-0.5 flex-shrink-0" />
          <div>
            <strong>IIIF Hierarchy:</strong> Collections reference Manifests (like folders pointing to books).
            The same Manifest can appear in multiple Collections. Manifests own their Canvases exclusively.
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 bg-slate-100 border-t flex items-center justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
        >
          Cancel
        </button>
        <div className="flex items-center gap-3">
          {analysis.summary.hasMarkerFiles && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Icon name="check_circle" className="text-sm" />
              Marker files detected
            </span>
          )}
          <button
            onClick={() => onConfirm(previewRoot)}
            className="px-6 py-2.5 bg-iiif-blue text-white rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Icon name="cloud_upload" />
            Import {summary.manifests} Manifest{summary.manifests !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngestPreview;
