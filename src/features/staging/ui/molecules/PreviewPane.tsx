/**
 * PreviewPane Molecule
 *
 * Collapsible right panel that shows a preview of the selected file or folder.
 * Supports image, audio, video, and directory preview with metadata display.
 *
 * @module features/staging/ui/molecules/PreviewPane
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/src/shared/ui/atoms';
import { Icon } from '@/src/shared/ui/atoms/Icon';
import { cn } from '@/src/shared/lib/cn';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { MIME_TYPE_MAP } from '@/src/shared/constants/image';
import type { FlatFileTreeNode, NodeAnnotations } from '../../model';
import type { IngestPreviewNode } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';

export interface PreviewPaneProps {
  target: FlatFileTreeNode | null;
  annotations: NodeAnnotations;
  analysisNode?: IngestPreviewNode;
  onClose: () => void;
  cx?: Partial<ContextualClassNames>;
  fieldMode?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
}

function getFileType(name: string): { type: string; format: string } | null {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const entry = MIME_TYPE_MAP[ext];
  if (!entry) return null;
  return { type: entry.type, format: entry.format };
}

function isSupported(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return !!MIME_TYPE_MAP[ext];
}

const SUPPORTED_FORMATS = [
  { category: 'Images', exts: 'jpg, jpeg, png, webp, gif, avif, bmp, tiff, tif, svg' },
  { category: 'Audio', exts: 'mp3, wav, ogg, m4a, aac, flac' },
  { category: 'Video', exts: 'mp4, webm, mov' },
  { category: 'Documents', exts: 'pdf, txt, csv' },
  { category: '3D', exts: 'glb, gltf' },
];

const FilePreview: React.FC<{ file: File }> = ({ file }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const fileInfo = getFileType(file.name);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!objectUrl) return null;

  if (fileInfo?.type === 'Image') {
    return (
      <div className="flex items-center justify-center bg-nb-black/5 p-2 min-h-[200px]">
        <img
          src={objectUrl}
          alt={file.name}
          className="max-w-full max-h-[300px] object-contain"
        />
      </div>
    );
  }

  if (fileInfo?.type === 'Sound') {
    return (
      <div className="p-4 flex flex-col items-center gap-3">
        <Icon name="audiotrack" className="text-4xl text-nb-purple/60" />
        <audio controls src={objectUrl} className="w-full" />
      </div>
    );
  }

  if (fileInfo?.type === 'Video') {
    return (
      <div className="bg-nb-black/5 p-2">
        <video controls src={objectUrl} className="max-w-full max-h-[300px]" />
      </div>
    );
  }

  return null;
};

const DirectoryPreview: React.FC<{
  node: FlatFileTreeNode;
  analysisNode?: IngestPreviewNode;
}> = ({ node, analysisNode }) => (
  <div className="p-4 space-y-3">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 bg-nb-blue/10 flex items-center justify-center">
        <Icon name="folder" className="text-2xl text-nb-blue" />
      </div>
      <div>
        <p className="font-medium text-nb-black/80">{node.name}</p>
        <p className="text-xs text-nb-black/50">{node.totalFileCount} files</p>
      </div>
    </div>

    {analysisNode && (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-nb-black/50">Detected as</span>
          <span className="font-medium text-nb-black/80">{analysisNode.proposedType}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-nb-black/50">Confidence</span>
          <span className={`font-medium ${
            analysisNode.confidence > 0.8 ? 'text-nb-green' :
            analysisNode.confidence > 0.5 ? 'text-nb-orange' : 'text-nb-red'
          }`}>
            {Math.round(analysisNode.confidence * 100)}%
          </span>
        </div>

        {analysisNode.stats && (
          <div className="border-t border-nb-black/10 pt-2 mt-2 space-y-1">
            {analysisNode.stats.imageCount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-nb-black/50">Images</span>
                <span>{analysisNode.stats.imageCount}</span>
              </div>
            )}
            {analysisNode.stats.videoCount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-nb-black/50">Videos</span>
                <span>{analysisNode.stats.videoCount}</span>
              </div>
            )}
            {analysisNode.stats.audioCount > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-nb-black/50">Audio</span>
                <span>{analysisNode.stats.audioCount}</span>
              </div>
            )}
            {analysisNode.stats.hasSequencePattern && (
              <div className="flex justify-between text-xs">
                <span className="text-nb-black/50">Pattern</span>
                <span className="text-nb-purple">Sequence detected</span>
              </div>
            )}
          </div>
        )}

        {analysisNode.detectionReasons.length > 0 && (
          <div className="border-t border-nb-black/10 pt-2 mt-2">
            <p className="text-[10px] text-nb-black/40 uppercase tracking-wider mb-1">Detection Reasons</p>
            {analysisNode.detectionReasons.map((r, i) => (
              <p key={i} className="text-xs text-nb-black/60">{r.details}</p>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

const UnsupportedPreview: React.FC<{ node: FlatFileTreeNode }> = ({ node }) => {
  const ext = node.name.split('.').pop()?.toLowerCase() || '';
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-nb-orange/10 flex items-center justify-center">
          <Icon name="warning" className="text-2xl text-nb-orange" />
        </div>
        <div>
          <p className="font-medium text-nb-black/80">{node.name}</p>
          <p className="text-xs text-nb-red">Unsupported format (.{ext})</p>
        </div>
      </div>

      <div className="text-xs text-nb-black/50 space-y-1">
        <p>Size: {formatSize(node.size)}</p>
        <p>This file will be skipped during import.</p>
      </div>

      <div className="border-t border-nb-black/10 pt-3">
        <p className="text-[10px] text-nb-black/40 uppercase tracking-wider mb-2">Supported Formats</p>
        {SUPPORTED_FORMATS.map(f => (
          <div key={f.category} className="mb-1">
            <span className="text-xs font-medium text-nb-black/60">{f.category}: </span>
            <span className="text-xs text-nb-black/40">{f.exts}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  target,
  annotations,
  analysisNode,
  onClose,
  cx,
  fieldMode,
}) => {
  if (!target) return null;

  const supported = target.isDirectory || (target.file && isSupported(target.name));

  return (
    <div className={cn('h-full flex flex-col border-l overflow-hidden', cx?.surface ?? 'bg-nb-cream/30', cx?.border ?? 'border-nb-black/20')}>
      {/* Header */}
      <div className={cn('flex-shrink-0 p-3 border-b flex items-center justify-between', cx?.border ?? 'border-nb-black/20', cx?.headerBg ?? 'bg-nb-cream/40')}>
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="preview" className="text-nb-blue text-sm" />
          <span className={cn('text-sm font-medium truncate', cx?.text ?? 'text-nb-black/80')}>{target.name}</span>
        </div>
        <Button
          variant="ghost"
          size="bare"
          onClick={onClose}
          className={cn('p-1 hover:bg-nb-cream', cx?.textMuted ?? 'text-nb-black/40')}
        >
          <Icon name="close" className="text-sm" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {target.isDirectory ? (
          <DirectoryPreview node={target} analysisNode={analysisNode} />
        ) : !supported ? (
          <UnsupportedPreview node={target} />
        ) : target.file ? (
          <div>
            <FilePreview file={target.file} />
            <div className={cn('p-3 border-t space-y-1', cx?.divider ?? 'border-nb-black/10')}>
              <div className="flex justify-between text-xs">
                <span className={cx?.textMuted ?? 'text-nb-black/50'}>Size</span>
                <span className={cx?.text ?? 'text-nb-black/70'}>{formatSize(target.size)}</span>
              </div>
              {(() => {
                const info = getFileType(target.name);
                return info ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className={cx?.textMuted ?? 'text-nb-black/50'}>Type</span>
                      <span className={cx?.text ?? 'text-nb-black/70'}>{info.type}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className={cx?.textMuted ?? 'text-nb-black/50'}>Format</span>
                      <span className={cx?.text ?? 'text-nb-black/70'}>{info.format}</span>
                    </div>
                  </>
                ) : null;
              })()}
              {annotations.rights && (
                <div className="flex justify-between text-xs">
                  <span className={cx?.textMuted ?? 'text-nb-black/50'}>Rights</span>
                  <span className={cn('truncate ml-2', cx?.text ?? 'text-nb-black/70')}>{annotations.rights}</span>
                </div>
              )}
              {annotations.navDate && (
                <div className="flex justify-between text-xs">
                  <span className={cx?.textMuted ?? 'text-nb-black/50'}>Date</span>
                  <span className={cx?.text ?? 'text-nb-black/70'}>{annotations.navDate}</span>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

PreviewPane.displayName = 'PreviewPane';
