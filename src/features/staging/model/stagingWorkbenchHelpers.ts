/**
 * Staging Workbench Helpers
 *
 * Pure functions and types extracted from StagingWorkbench organism.
 * Includes: types (UnsupportedFile, IngestUndoRecord), file tree helpers,
 * CSV metadata import, ingest progress mapping, and analysis summary building.
 *
 * @module features/staging/model/stagingWorkbenchHelpers
 */

import type { FileTree, IngestProgress, IngestStage } from '@/src/shared/types';
import type { IngestPreviewNode, IngestAnalysisResult } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';
import type { NodeAnnotations } from './index';
import type { IngestProgressStore } from '@/src/shared/lib/hooks/ingestProgress.svelte';
import { MIME_TYPE_MAP } from '@/src/shared/constants/image';
import { csvImporter } from '@/src/features/ingest/model/csvImporter';

// ============================================================================
// Types
// ============================================================================

export interface UnsupportedFile {
  path: string;
  name: string;
  ext: string;
}

export interface IngestUndoRecord {
  operationId: string;
  timestamp: number;
  createdEntityIds: string[];
  manifestsCreated: number;
  collectionsCreated: number;
  canvasesCreated: number;
  filesProcessed: number;
}

// ============================================================================
// File Tree Helpers
// ============================================================================

/** Collect all files with unsupported extensions from a FileTree */
export function collectUnsupportedFiles(tree: FileTree, parentPath: string): UnsupportedFile[] {
  const result: UnsupportedFile[] = [];
  for (const [fileName] of tree.files) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (!MIME_TYPE_MAP[ext]) {
      const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
      result.push({ path: filePath, name: fileName, ext });
    }
  }
  for (const dir of tree.directories.values()) {
    result.push(...collectUnsupportedFiles(dir, dir.path));
  }
  return result;
}

/** Unique unsupported extensions, sorted */
export function getUniqueUnsupportedExts(files: UnsupportedFile[]): string[] {
  return [...new Set(files.map(f => f.ext))].sort();
}

/** Find an IngestPreviewNode by path in the analysis tree (depth-first) */
export function findAnalysisNode(root: IngestPreviewNode | undefined, path: string): IngestPreviewNode | undefined {
  if (!root) return undefined;
  if (root.path === path) return root;
  for (const child of root.children) {
    const found = findAnalysisNode(child, path);
    if (found) return found;
  }
  return undefined;
}

/** Build initial annotations map from analysis results */
export function buildAnnotationsFromAnalysis(node: IngestPreviewNode): Map<string, NodeAnnotations> {
  const map = new Map<string, NodeAnnotations>();
  const walk = (n: IngestPreviewNode) => {
    if (n.proposedType === 'Excluded') {
      map.set(n.path, { excluded: true });
    } else {
      const intent = n.proposedType as 'Collection' | 'Manifest';
      if (n.confidence >= 0.7) {
        map.set(n.path, { iiifIntent: intent });
      }
    }
    for (const child of n.children) walk(child);
  };
  walk(node);
  return map;
}

// ============================================================================
// CSV Import
// ============================================================================

export interface CsvImportResult {
  summary: string;
  annotations: Array<{ path: string; ann: NodeAnnotations }>;
}

/** Search a FileTree for a file matching a given filename (with or without extension) */
function searchTreeForFilename(tree: FileTree, parentPath: string, filename: string): string | null {
  for (const [name] of tree.files) {
    if (name === filename || name.replace(/\.[^/.]+$/, '') === filename.replace(/\.[^/.]+$/, '')) {
      return parentPath ? `${parentPath}/${name}` : name;
    }
  }
  for (const dir of tree.directories.values()) {
    const found = searchTreeForFilename(dir, dir.path, filename);
    if (found) return found;
  }
  return null;
}

/** Parse a CSV file and match rows to file tree paths, returning annotation updates */
export function processCsvImport(
  csvText: string,
  fileTree: FileTree,
  existingAnnotations: Map<string, NodeAnnotations>,
): CsvImportResult {
  const { headers, rows } = csvImporter.parseCSV(csvText);

  if (rows.length === 0) {
    return { summary: 'No data rows found in CSV', annotations: [] };
  }

  const filenameCol = csvImporter.detectFilenameColumn(headers);
  if (!filenameCol) {
    return { summary: 'Could not detect filename column', annotations: [] };
  }

  let matched = 0;
  let unmatched = 0;
  const annotations: CsvImportResult['annotations'] = [];

  for (const row of rows) {
    const filename = row[filenameCol];
    if (!filename) { unmatched++; continue; }

    const matchedPath = searchTreeForFilename(fileTree, fileTree.path, filename);
    if (!matchedPath) { unmatched++; continue; }

    const existing = existingAnnotations.get(matchedPath) || {};
    const updated = { ...existing };

    for (const header of headers) {
      if (header === filenameCol || header.toLowerCase() === 'manifest') continue;
      const value = row[header];
      if (!value) continue;

      const lowerHeader = header.toLowerCase();
      if (lowerHeader === 'label') updated.label = value;
      else if (lowerHeader === 'rights') updated.rights = value;
      else if (lowerHeader === 'navdate' || lowerHeader === 'nav_date') updated.navDate = value;
      else if (lowerHeader === 'behavior' || lowerHeader === 'behaviour') {
        updated.iiifBehavior = value.split(',').map((b: string) => b.trim()).filter(Boolean);
      }
    }

    annotations.push({ path: matchedPath, ann: updated });
    matched++;
  }

  return {
    summary: `Applied metadata to ${matched} of ${matched + unmatched} files (${unmatched} unmatched)`,
    annotations,
  };
}

// ============================================================================
// Ingest Progress Mapping
// ============================================================================

const INGEST_STAGE_MAP: Record<string, IngestStage> = {
  running: 'processing',
  paused: 'processing',
  completed: 'complete',
  failed: 'error',
  cancelled: 'cancelled',
  pending: 'scanning',
};

/** Map IngestProgressStore aggregate to the IngestProgress shape expected by IngestProgressPanel */
export function mapIngestProgress(store: IngestProgressStore): IngestProgress | null {
  const agg = store.aggregate;
  if (!agg.isActive && agg.totalOperations === 0) return null;

  const ops = store.operations;
  const activeOp = ops.find(o => o.status === 'running')
    ?? ops.find(o => o.status === 'paused')
    ?? ops[ops.length - 1];

  const stage: IngestStage = INGEST_STAGE_MAP[activeOp?.status ?? ''] ?? 'processing';
  const overallPct = Math.round((agg.overallProgress ?? 0) * 100);

  return {
    operationId: activeOp?.id ?? 'ingest',
    stage,
    stageProgress: overallPct,
    filesTotal: agg.totalFiles,
    filesCompleted: agg.completedFiles,
    filesProcessing: ops.filter(o => o.status === 'running').length,
    filesError: agg.failedFiles,
    files: [],
    speed: 0,
    etaSeconds: Math.round((agg.estimatedTimeRemaining ?? 0) / 1000),
    startedAt: activeOp?.startedAt ?? Date.now(),
    updatedAt: Date.now(),
    isPaused: ops.some(o => o.status === 'paused'),
    isCancelled: ops.length > 0 && ops.every(o => o.status === 'cancelled'),
    activityLog: store.log.map(e => ({ timestamp: e.timestamp, level: e.level, message: e.message })),
    overallProgress: overallPct,
  };
}

// ============================================================================
// Analysis Summary
// ============================================================================

export interface AnalysisSummaryResult {
  detection: string;
  confidence: number;
}

/** Build a human-readable analysis summary from the analysis result */
export function buildAnalysisSummary(analysisResult: IngestAnalysisResult): AnalysisSummaryResult | null {
  const { summary } = analysisResult;
  const parts: string[] = [];
  if (summary.proposedManifests > 0) parts.push(`${summary.proposedManifests} manifests`);
  if (summary.proposedCollections > 0) parts.push(`${summary.proposedCollections} collections`);

  const media: string[] = [];
  if (summary.totalImages > 0) media.push(`${summary.totalImages} images`);
  if (summary.totalVideos > 0) media.push(`${summary.totalVideos} videos`);
  if (summary.totalAudios > 0) media.push(`${summary.totalAudios} audio`);

  const avgConfidence = analysisResult.root.children.length > 0
    ? Math.round(
        analysisResult.root.children.reduce((sum: number, c: IngestPreviewNode) => sum + c.confidence, 0) /
        analysisResult.root.children.length * 100
      )
    : Math.round(analysisResult.root.confidence * 100);

  return {
    detection: `Detected: ${parts.join(', ')} (${media.join(', ')})`,
    confidence: avgConfidence,
  };
}
