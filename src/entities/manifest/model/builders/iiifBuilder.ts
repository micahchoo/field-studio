
import { storageLog } from '@/src/shared/services/logger';
import {
  FileStatus,
  FileTree,
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFCollection,
  IIIFItem,
  IIIFManifest,
  IIIFMotivation,
  IIIFRange,
  IngestActivityLogEntry,
  IngestFileInfo,
  IngestProgress,
  IngestProgressOptions,
  IngestProgressSummary,
  IngestReport,
  IngestResult,
  IngestStage,
  isCollection,
  LegacyProgressCallback
} from '@/src/shared/types';
import { storage } from '@/src/shared/services/storage';
import { DEFAULT_INGEST_PREFS, FEATURE_FLAGS, getDerivativePreset, IIIF_CONFIG, IIIF_SPEC, IMAGE_QUALITY, isAudioFile, isImageFile, isRasterImage, isSvgFile, isVideoFile, MIME_TYPE_MAP, resolveFileFormat, USE_ENHANCED_PROGRESS, USE_WORKER_INGEST } from '@/src/shared/constants';
import { load } from 'js-yaml';
import { extractMetadata } from '@/src/shared/services/metadataHarvester';
import { generateDerivativeAsync, getTileWorkerPool } from '../ingest/tileWorker';
import { fileIntegrity, HashLookupResult } from '@/src/entities/canvas/model/fileIntegrity';
import {
  generateId,
  getRelationshipType,
  isStandaloneType,
  isValidChildType
} from '@/utils/iiifHierarchy';
import {
  createImageServiceReference,
  DEFAULT_VIEWING_DIRECTION,
  getContentTypeFromFilename,
  getMimeTypeString,
  IMAGE_API_PROTOCOL,
  isImageMimeType,
  isTimeBasedMimeType,
  suggestBehaviors,
  validateResource
} from '@/utils';
import { getFileLifecycleManager } from './fileLifecycle';

// ============================================================================
// Phase 4: Worker Migration Imports
// ============================================================================
import {
  getIngestWorkerPool,
  ingestTreeWithWorkers,
  IngestWorkerPool,
  PoolStats
} from '../ingest/ingestWorkerPool';
import type {
  IngestCompleteMessage,
  IngestErrorMessage,
  IngestFileCompleteMessage,
  IngestProgressMessage,
  IngestWorkerResponse
} from '@/src/shared/workers';

// ============================================================================
// Phase 3: Enhanced Progress Indicators (P1 - UX)
// ============================================================================

/**
 * Create initial progress state for an ingest operation
 */
function createInitialProgress(operationId: string, totalFiles: number): IngestProgress {
  return {
    operationId,
    stage: 'scanning',
    stageProgress: 0,
    filesTotal: totalFiles,
    filesCompleted: 0,
    filesProcessing: 0,
    filesError: 0,
    files: [],
    speed: 0,
    etaSeconds: 0,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    isPaused: false,
    isCancelled: false,
    activityLog: [{
      timestamp: Date.now(),
      level: 'info',
      message: 'Ingest operation started'
    }],
    overallProgress: 0
  };
}

/**
 * Update progress with new file information
 */
function updateFileProgress(
  progress: IngestProgress,
  fileId: string,
  updates: Partial<IngestFileInfo>
): IngestProgress {
  const fileIndex = progress.files.findIndex(f => f.id === fileId);
  const updatedFiles = [...progress.files];

  if (fileIndex >= 0) {
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], ...updates };
  }

  // Recalculate aggregates
  const completed = updatedFiles.filter(f => f.status === 'completed').length;
  const processing = updatedFiles.filter(f => f.status === 'processing').length;
  const errors = updatedFiles.filter(f => f.status === 'error').length;

  // Calculate speed and ETA
  const elapsedSeconds = (Date.now() - progress.startedAt) / 1000;
  const speed = elapsedSeconds > 0 ? completed / elapsedSeconds : 0;
  const remainingFiles = progress.filesTotal - completed;
  const etaSeconds = speed > 0 ? remainingFiles / speed : 0;

  // Calculate overall progress
  const fileProgressSum = updatedFiles.reduce((sum, f) => sum + f.progress, 0);
  const overallProgress = progress.filesTotal > 0
    ? Math.round(fileProgressSum / progress.filesTotal)
    : 0;

  return {
    ...progress,
    files: updatedFiles,
    filesCompleted: completed,
    filesProcessing: processing,
    filesError: errors,
    speed,
    etaSeconds: Math.round(etaSeconds),
    overallProgress,
    updatedAt: Date.now()
  };
}

/**
 * Add file to progress tracking
 */
function addFileToProgress(
  progress: IngestProgress,
  fileInfo: Omit<IngestFileInfo, 'id' | 'status' | 'progress'>
): { progress: IngestProgress; fileId: string } {
  const fileId = `file-${progress.files.length}-${Date.now()}`;
  const newFile: IngestFileInfo = {
    ...fileInfo,
    id: fileId,
    status: 'pending',
    progress: 0
  };

  return {
    progress: {
      ...progress,
      files: [...progress.files, newFile],
      updatedAt: Date.now()
    },
    fileId
  };
}

/**
 * Add activity log entry
 */
function addLogEntry(
  progress: IngestProgress,
  message: string,
  level: IngestActivityLogEntry['level'] = 'info',
  fileId?: string
): IngestProgress {
  const entry: IngestActivityLogEntry = {
    timestamp: Date.now(),
    level,
    message,
    fileId
  };

  // Keep only last 20 entries
  const activityLog = [...progress.activityLog, entry].slice(-20);

  return {
    ...progress,
    activityLog,
    updatedAt: Date.now()
  };
}

/**
 * Update processing stage
 */
function updateStage(
  progress: IngestProgress,
  stage: IngestStage,
  stageProgress: number = 0
): IngestProgress {
  return {
    ...progress,
    stage,
    stageProgress,
    updatedAt: Date.now()
  };
}

/**
 * Check if operation should be cancelled
 */
function checkCancellation(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('Ingest operation cancelled');
  }
}

/**
 * Check if operation is paused and wait
 */
async function checkPaused(progress: IngestProgress, checkInterval: number = 100): Promise<void> {
  while (progress.isPaused && !progress.isCancelled) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
}

/**
 * Convert enhanced progress to legacy callback format
 */
function progressToLegacyCallback(
  progress: IngestProgress,
  legacyCallback: LegacyProgressCallback
): void {
  const msg = progress.currentFile
    ? `${progress.stage}: ${progress.currentFile.name} (${progress.filesCompleted}/${progress.filesTotal})`
    : `${progress.stage}: ${progress.overallProgress}%`;
  legacyCallback(msg, progress.overallProgress);
}

/**
 * Create progress summary from final state
 */
function createProgressSummary(progress: IngestProgress): IngestProgressSummary {
  const durationSeconds = (Date.now() - progress.startedAt) / 1000;
  return {
    filesTotal: progress.filesTotal,
    filesCompleted: progress.filesCompleted,
    filesError: progress.filesError,
    filesSkipped: progress.files.filter(f => f.status === 'skipped').length,
    durationSeconds: Math.round(durationSeconds * 10) / 10,
    averageSpeed: durationSeconds > 0 ? progress.filesCompleted / durationSeconds : 0,
    wasCancelled: progress.isCancelled
  };
}

// ============================================================================
// Feature Flag Check
// ============================================================================

/**
 * Check if file lifecycle management is enabled
 */
const isFileLifecycleEnabled = (): boolean => {
  return (FEATURE_FLAGS as Record<string, boolean>).USE_FILE_LIFECYCLE !== false;
};

/**
 * Check if worker-based ingest is enabled
 */
const isWorkerIngestEnabled = (): boolean => {
  return USE_WORKER_INGEST as boolean;
};

/**
 * Check if workers are supported in this environment
 */
const areWorkersSupported = (): boolean => {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
};

// ============================================================================
// Count Media Files Helper
// ============================================================================

/**
 * Count total media files in a file tree for progress tracking
 */
function countMediaFiles(node: FileTree): number {
  let count = 0;

  // Count media files at this level
  for (const fileName of node.files.keys()) {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mime = MIME_TYPE_MAP[ext];
    if (mime && mime.motivation === 'painting') {
      count++;
    }
  }

  // Recursively count in subdirectories
  for (const childNode of node.directories.values()) {
    count += countMediaFiles(childNode);
  }

  return count;
}

// ============================================================================
// Core Ingest: processNodeIngest
// ============================================================================

/** Make a URL-safe slug from a file/directory name */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^.]+$/, '')        // strip extension
    .replace(/[^a-z0-9]+/g, '-')   // non-alphanumeric → dash
    .replace(/^-|-$/g, '')          // trim leading/trailing dashes
    || 'item';
}

/** Detect whether a file is a media (painting) file */
function isPaintingFile(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const entry = MIME_TYPE_MAP[ext];
  return entry?.motivation === 'painting';
}

/** Detect whether a file is a YAML sidecar */
function isYamlSidecar(fileName: string): boolean {
  return fileName === 'info.yml' || fileName === 'info.yaml';
}

/**
 * Build canvas ID for a file inside a manifest.
 * Format: {manifestId}/canvas/{index}
 */
function canvasId(manifestId: string, index: number): string {
  return `${manifestId}/canvas/${index}`;
}

/**
 * Build the asset serving URL for a stored file.
 * The Service Worker intercepts /iiif/image/{id} and /iiif/media/{id}.{ext}
 * to serve blobs from IndexedDB.
 */
function assetServingUrl(baseUrl: string, assetId: string, isImage: boolean, ext: string): string {
  if (isImage) return `${baseUrl}/image/${assetId}`;
  return `${baseUrl}/media/${assetId}.${ext}`;
}

/**
 * Build a stable asset ID from a manifest ID and file name.
 * Used as the key in storage.saveAsset().
 */
function buildAssetId(manifestId: string, fileName: string): string {
  const slug = manifestId.split('/').pop() ?? 'item';
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '');
  return `${slug}-${safe}`;
}

/**
 * Determine if a FileTree node should become a Collection or Manifest.
 * Hierarchy (highest to lowest priority):
 *  1. Explicit iiifIntent annotation from user
 *  2. Name starts with '_' → Collection
 *  3. No media files → Collection (empty/metadata-only directories)
 *  4. Has subdirectories → Collection
 *  5. Has media files, no subdirs → Manifest
 *  6. Default → Collection
 */
function resolveNodeType(node: FileTree): 'Collection' | 'Manifest' {
  if (node.iiifIntent === 'Collection') return 'Collection';
  if (node.iiifIntent === 'Manifest') return 'Manifest';
  if (node.name.startsWith('_')) return 'Collection';
  const hasSubdirs = node.directories.size > 0;
  const mediaFileCount = Array.from(node.files.keys()).filter(isPaintingFile).length;
  if (mediaFileCount === 0) return 'Collection';
  if (hasSubdirs) return 'Collection';
  return 'Manifest';
}

/**
 * Recursively process a FileTree node into an IIIFItem.
 * Sequential (no workers). Suitable for use on the main thread.
 */
async function processNodeIngest(
  node: FileTree,
  baseUrl: string,
  report: IngestReport,
  progress: IngestProgress,
  options: IngestProgressOptions
): Promise<{ item: IIIFItem; progress: IngestProgress }> {
  checkCancellation(options.signal);

  const nodeType = resolveNodeType(node);

  // ── Read YAML sidecar for label/metadata ──────────────────────────────────
  let label: Record<string, string[]> = { none: [node.name] };
  const ymlFile = Array.from(node.files.entries()).find(([n]) => isYamlSidecar(n))?.[1];
  if (ymlFile) {
    try {
      const text = await ymlFile.text();
      const meta = load(text) as Record<string, unknown>;
      if (meta && typeof meta.label === 'string') {
        label = { none: [meta.label] };
      } else if (meta && typeof meta.label === 'object' && meta.label !== null) {
        label = meta.label as Record<string, string[]>;
      }
    } catch {
      /* malformed YAML — use filename as label */
    }
  }

  // ── MANIFEST path ─────────────────────────────────────────────────────────
  if (nodeType === 'Manifest') {
    const manifestId = generateId('Manifest', baseUrl);
    const manifest = createManifest({ id: manifestId, label });

    const mediaFiles = Array.from(node.files.entries()).filter(([n]) => isPaintingFile(n));
    let canvasIndex = 0;

    for (const [fileName, file] of mediaFiles) {
      checkCancellation(options.signal);

      const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
      const mimeType = getMimeTypeString(fileName);
      const isImg = isImageFile(fileName) || isSvgFile(fileName);
      const assetId = buildAssetId(manifestId, fileName);

      // Store the file blob in IndexedDB for service worker serving
      try {
        await storage.saveAsset(assetId, file);
      } catch {
        report.errors.push({ file: fileName, error: 'Asset storage failed' });
        progress = addLogEntry(progress, `Failed to store asset: ${fileName}`, 'error');
        continue;
      }

      // Default dimensions — image dimensions require DOM/worker; use safe defaults
      const width = isImg ? 1000 : 0;
      const height = isImg ? 1000 : 0;
      const duration = (!isImg && (isVideoFile(fileName) || isAudioFile(fileName))) ? undefined : undefined;

      const servingUrl = assetServingUrl(baseUrl, assetId, isImg, ext);
      const cId = canvasId(manifestId, canvasIndex);

      const canvas = createCanvas({ id: cId, label: { none: [fileName] }, width, height, duration });

      // Painting annotation
      const annoPageId = `${cId}/page/1`;
      const annoId = `${cId}/annotation/1`;
      const annotation = createAnnotation({
        id: annoId,
        motivation: 'painting' as IIIFMotivation,
        target: cId,
        body: { id: servingUrl, type: isImg ? 'Image' : (isVideoFile(fileName) ? 'Video' : 'Sound'), format: mimeType },
      });
      const annoPage = createAnnotationPage({ id: annoPageId, items: [annotation] });
      canvas.items = [annoPage as unknown as IIIFAnnotationPage];

      // Supplementing text sidecar (.txt with same base name)
      const baseName = fileName.replace(/\.[^.]+$/, '');
      const sidecarFile = node.files.get(`${baseName}.txt`) ?? node.files.get(`${baseName}.srt`);
      if (sidecarFile) {
        const sidecarText = await sidecarFile.text();
        const sidecarAnno = createAnnotation({
          id: `${cId}/annotation/sidecar`,
          motivation: 'supplementing' as IIIFMotivation,
          target: cId,
          body: { type: 'TextualBody', value: sidecarText, format: 'text/plain' },
        });
        const sidecarPage = createAnnotationPage({ id: `${cId}/page/sidecar`, items: [sidecarAnno] });
        (canvas as unknown as Record<string, unknown>).annotations = [sidecarPage];
      }

      manifest.items!.push(canvas as unknown as IIIFCanvas);
      canvasIndex++;

      // Update progress
      const fileInfo: IngestFileInfo = {
        id: assetId,
        name: fileName,
        size: file.size,
        type: mimeType,
        status: 'completed',
        progress: 100,
        entityId: cId,
      };
      const overall = Math.round((canvasIndex / mediaFiles.length) * 100);
      progress = {
        ...progress,
        filesCompleted: progress.filesCompleted + 1,
        files: [...progress.files, fileInfo],
        overallProgress: overall,
        updatedAt: Date.now(),
      };
      options.onProgress?.(progress);
    }

    report.canvasesCreated = (report.canvasesCreated ?? 0) + canvasIndex;
    report.manifestsCreated = (report.manifestsCreated ?? 0) + 1;
    return { item: manifest as unknown as IIIFItem, progress };
  }

  // ── COLLECTION path ───────────────────────────────────────────────────────
  const collectionId = generateId('Collection', baseUrl);
  const collection = createCollection({ id: collectionId, label });

  // Recurse into subdirectories
  for (const childNode of node.directories.values()) {
    checkCancellation(options.signal);
    const { item: childItem, progress: p2 } = await processNodeIngest(
      childNode, baseUrl, report, progress, options
    );
    progress = p2;
    (collection.items as IIIFItem[]).push(childItem);
  }

  // Loose media files at collection level → wrap in a "Files" manifest
  const looseMedia = Array.from(node.files.entries()).filter(([n]) => isPaintingFile(n));
  if (looseMedia.length > 0) {
    const looseNode: FileTree = {
      name: `${node.name} (files)`,
      path: node.path,
      files: new Map(looseMedia),
      directories: new Map(),
    };
    const { item: looseManifest, progress: p3 } = await processNodeIngest(
      looseNode, baseUrl, report, progress, options
    );
    progress = p3;
    (collection.items as IIIFItem[]).push(looseManifest);
  }

  report.collectionsCreated = (report.collectionsCreated ?? 0) + 1;
  return { item: collection as unknown as IIIFItem, progress };
}

// ============================================================================
// Ingest Entry Points
// ============================================================================

/**
 * Ingest a file tree with enhanced progress tracking.
 * Sequential (main-thread) implementation — fast enough for < 500 files.
 * For large batches, enable USE_WORKER_INGEST for parallel worker-based processing.
 */
export const ingestTree = async (
  tree: FileTree,
  existingRoot: IIIFItem | null = null,
  progressInput?: LegacyProgressCallback | IngestProgressOptions
): Promise<IngestResult> => {
  // Resolve progress options
  const isLegacy = typeof progressInput === 'function';
  const options: IngestProgressOptions = isLegacy
    ? { onProgress: undefined }
    : (progressInput ?? {});
  const legacyCb = isLegacy ? progressInput : undefined;

  const totalFiles = countMediaFiles(tree);
  const operationId = `ingest-${Date.now()}`;
  const report: IngestReport = {
    summary: {
      filesTotal: totalFiles,
      filesCompleted: 0,
      filesError: 0,
      filesSkipped: 0,
      durationSeconds: 0,
      averageSpeed: 0,
      wasCancelled: false,
    },
    errors: [],
    warnings: [],
    manifestsCreated: 0,
    collectionsCreated: 0,
    canvasesCreated: 0,
    filesProcessed: 0,
  };

  let progress = createInitialProgress(operationId, totalFiles);
  progress = updateStage(progress, 'scanning');
  options.onProgress?.(progress);

  const baseUrl = IIIF_CONFIG.BASE_URL.DEFAULT;

  try {
    progress = updateStage(progress, 'processing');
    options.onProgress?.(progress);

    const { item: newRoot, progress: finalProgress } = await processNodeIngest(
      tree, baseUrl, report, progress, options
    );
    progress = finalProgress;

    // If merging with an existing root Collection, append items
    if (existingRoot && existingRoot.type === 'Collection') {
      const merged = { ...existingRoot };
      if (newRoot.type === 'Collection') {
        // Flatten: spread new collection's items into existing
        merged.items = [...(merged.items ?? []), ...(newRoot.items ?? [])];
      } else {
        // Append new manifest/item directly
        merged.items = [...(merged.items ?? []), newRoot];
      }
      progress = updateStage(progress, 'complete', 100);
      report.summary = createProgressSummary(progress);
      legacyCb?.('complete', 100);
      return { success: true, root: merged, report };
    }

    progress = updateStage(progress, 'complete', 100);
    report.summary = createProgressSummary(progress);
    legacyCb?.('complete', 100);
    return { success: true, root: newRoot, report };

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown ingest error';
    progress = updateStage(progress, 'error');
    legacyCb?.(message, 0);
    return { success: false, error: message, report };
  }
};

/**
 * Ingest with enhanced progress tracking (convenience method)
 * @deprecated Use ingestTree with IngestProgressOptions instead
 */
export const ingestTreeWithProgress = async (
  tree: FileTree,
  options: IngestProgressOptions,
  existingRoot?: IIIFItem | null
): Promise<IngestResult> => {
  return ingestTree(tree, existingRoot ?? null, options);
};

// ============================================================================
// Build Tree (Fully Implemented)
// ============================================================================

export const buildTree = (files: File[]): FileTree => {
  const root: FileTree = { name: 'root', path: '', files: new Map(), directories: new Map() };
  for (const file of files) {
    if (file.name.startsWith('.')) continue;
    const path = file.webkitRelativePath || file.name;
    const parts = path.split('/');
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current.directories.has(part)) {
            current.directories.set(part, { name: part, path: current.path ? `${current.path}/${part}` : part, files: new Map(), directories: new Map() });
        }
        current = current.directories.get(part)!;
    }
    current.files.set(parts[parts.length - 1], file);
  }
  return root;
};

// ============================================================================
// Factory Functions for Testing
// ============================================================================

interface CreateManifestOptions {
  id: string;
  label: Record<string, string[]>;
  summary?: Record<string, string[]>;
  metadata?: Array<{ label: Record<string, string[]>; value: Record<string, string[]> }>;
  rights?: string;
  behavior?: string[];
}

/** Create a valid IIIF 3.0 Manifest */
export function createManifest(options: CreateManifestOptions): IIIFManifest {
  return {
    '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
    type: 'Manifest',
    id: options.id,
    label: options.label,
    summary: options.summary,
    metadata: options.metadata,
    rights: options.rights,
    behavior: options.behavior,
    items: [],
  } as IIIFManifest;
}

interface CreateCanvasOptions {
  id: string;
  label: Record<string, string[]>;
  width: number;
  height: number;
  duration?: number;
}

/** Create a valid IIIF 3.0 Canvas */
export function createCanvas(options: CreateCanvasOptions): IIIFCanvas {
  return {
    type: 'Canvas',
    id: options.id,
    label: options.label,
    width: options.width,
    height: options.height,
    duration: options.duration,
    items: [],
  } as IIIFCanvas;
}

interface CreateAnnotationOptions {
  id: string;
  motivation: IIIFMotivation;
  target: string | { type: 'SpecificResource'; source: string; selector?: { type: string; value: string } };
  body:
    | { id: string; type: string; format?: string; width?: number; height?: number }
    | { type: 'TextualBody'; value: string; format: string; language?: string };
}

/** Create a valid IIIF 3.0 Annotation */
export function createAnnotation(options: CreateAnnotationOptions): IIIFAnnotation {
  return {
    type: 'Annotation',
    id: options.id,
    motivation: options.motivation,
    target: options.target,
    body: options.body,
  } as IIIFAnnotation;
}

interface CreateAnnotationPageOptions {
  id: string;
  items?: IIIFAnnotation[];
}

/** Create a valid IIIF 3.0 AnnotationPage */
export function createAnnotationPage(options: CreateAnnotationPageOptions): IIIFAnnotationPage {
  return {
    type: 'AnnotationPage',
    id: options.id,
    items: options.items || [],
  };
}

interface CreateCollectionOptions {
  id: string;
  label: Record<string, string[]>;
  items?: IIIFManifest[];
}

/** Create a valid IIIF 3.0 Collection */
export function createCollection(options: CreateCollectionOptions): IIIFCollection {
  return {
    '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
    type: 'Collection',
    id: options.id,
    label: options.label,
    items: options.items || [],
  } as IIIFCollection;
}

interface CreateRangeOptions {
  id: string;
  label: Record<string, string[]>;
  items?: Array<{ id: string; type: 'Canvas' | 'Range' }>;
}

/** Create a valid IIIF 3.0 Range */
export function createRange(options: CreateRangeOptions): IIIFRange {
  return {
    type: 'Range',
    id: options.id,
    label: options.label,
    items: options.items || [],
  } as IIIFRange;
}

// ============================================================================
// Build Manifest From Files
// ============================================================================

interface FileWithBlob {
  name: string;
  type: string;
  size: number;
  blob: Blob;
}

interface BuildManifestOptions {
  label: Record<string, string[]>;
}

/** Build a manifest from an array of files */
export async function buildManifestFromFiles(
  files: FileWithBlob[],
  options: BuildManifestOptions
): Promise<IIIFManifest> {
  const manifest = createManifest({
    id: `https://example.com/manifest/${Date.now()}`,
    label: options.label,
  });

  manifest.items = files.map((file, index) => {
    const canvas = createCanvas({
      id: `${manifest.id}/canvas/${index}`,
      label: { en: [file.name] },
      width: 1000,
      height: 1000,
    });

    // Create a painting annotation for the file
    const annotation = createAnnotation({
      id: `${canvas.id}/annotation/1`,
      motivation: 'painting',
      target: canvas.id,
      body: {
        id: `blob:${file.name}`,
        type: isImageFile(file.name) ? 'Image' : (isVideoFile(file.name) ? 'Video' : (isAudioFile(file.name) ? 'Sound' : 'Image')),
        format: resolveFileFormat(file.name),
      },
    });

    // Add annotation to page
    const annotationPage = createAnnotationPage({
      id: `${canvas.id}/page/1`,
      items: [annotation],
    });

    canvas.items = [annotationPage];
    return canvas;
  });

  return manifest;
}

// ============================================================================
// Validate IIIF Resource
// ============================================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate a IIIF resource structure */
export function validateIIIFResource(resource: unknown): ValidationResult {
  const errors: string[] = [];
  const r = resource as any;

  // Check required fields
  if (!r.id) {
    errors.push('Missing required field: id');
  }

  if (!r.type) {
    errors.push('Missing required field: type');
  }

  // Validate language maps
  if (r.label && typeof r.label !== 'object') {
    errors.push('Label must be a language map');
  }

  if (r.summary && typeof r.summary !== 'object') {
    errors.push('Summary must be a language map');
  }

  // Validate canvas dimensions
  if (r.type === 'Canvas') {
    if (typeof r.width !== 'number' || r.width <= 0) {
      errors.push('Canvas width must be a positive number');
    }
    if (typeof r.height !== 'number' || r.height <= 0) {
      errors.push('Canvas height must be a positive number');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
