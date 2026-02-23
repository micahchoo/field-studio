
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
  getMimeType,
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
// Heavy Ingest Functions (Stubbed)
// ============================================================================

// TODO: Migrate processNode - Legacy ingest processor (~388 lines)
// Handles Manifest/Collection type detection, YAML metadata, sidecar detection,
// asset storage, image dimension reading, derivative generation, and file integrity checks.
// See React source lines 1095-1482

// TODO: Migrate processNodeWithProgress - Enhanced ingest with progress tracking (~445 lines)
// Same as processNode but with granular IngestProgress updates, cancellation support,
// and pause/resume capability.
// See React source lines 649-1093

// TODO: Migrate ingestWithWorkers - Worker-based parallel ingest (~60 lines)
// Delegates to ingestWorkerPool for multi-threaded file processing.
// See React source lines 404-463

// TODO: Migrate worker message handlers (~100 lines)
// handleWorkerProgress, handleWorkerFileComplete, handleWorkerComplete, handleWorkerError
// See React source lines 303-399

// TODO: Migrate tile generation queue (~90 lines)
// Background tile pre-generation after ingest completes.
// See React source lines 465-518

// TODO: Migrate SVG parsing and rasterization (~95 lines)
// parseSvgDimensions, rasterizeSvg, generateDerivative
// See React source lines 522-621

// ============================================================================
// Ingest Entry Points (Stubbed with signatures)
// ============================================================================

/**
 * Ingest a file tree with enhanced progress tracking
 * Supports both legacy callback and new enhanced progress options
 *
 * TODO: Full implementation requires migrating processNode, processNodeWithProgress,
 * ingestWithWorkers, tile generation queue, and all helper functions above.
 */
export const ingestTree = async (
  tree: FileTree,
  existingRoot: IIIFItem | null = null,
  progressInput?: LegacyProgressCallback | IngestProgressOptions
): Promise<IngestResult> => {
  // TODO: Implement full ingest pipeline
  // See React source lines 1488-1677 for complete implementation
  throw new Error('ingestTree not yet migrated to Svelte. See iiifBuilder.ts TODO comments.');
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
