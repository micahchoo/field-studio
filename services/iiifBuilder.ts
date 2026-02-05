
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
} from '../types';
import { storage } from './storage';
import { DEFAULT_INGEST_PREFS, getDerivativePreset, IIIF_CONFIG, IIIF_SPEC, IMAGE_QUALITY, MIME_TYPE_MAP } from '../constants';
import { load } from 'js-yaml';
import { extractMetadata } from './metadataHarvester';
import { generateDerivativeAsync, getTileWorkerPool } from './tileWorker';
import { fileIntegrity, HashLookupResult } from './fileIntegrity';
import {
  generateId,
  getRelationshipType,
  isStandaloneType,
  isValidChildType
} from '../utils/iiifHierarchy';
import {
  createImageServiceReference,
  DEFAULT_VIEWING_DIRECTION,
  getContentTypeFromFilename,
  getMimeType,
  IMAGE_API_PROTOCOL,
  isImageMime,
  isTimeBasedMime,
  suggestBehaviors,
  validateResource
} from '../utils';
import { FEATURE_FLAGS, USE_ENHANCED_PROGRESS, USE_WORKER_INGEST } from '../constants/features';
import { getFileLifecycleManager } from './fileLifecycle';

// ============================================================================
// Phase 4: Worker Migration Imports
// ============================================================================
import {
  getIngestWorkerPool,
  ingestTreeWithWorkers,
  IngestWorkerPool,
  PoolStats
} from './ingestWorkerPool';
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
  return USE_WORKER_INGEST === true;
};

/**
 * Check if workers are supported in this environment
 */
const areWorkersSupported = (): boolean => {
  return typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined';
};

// ============================================================================
// Phase 4: Worker-Based Ingest Integration
// ============================================================================

interface WorkerIngestState {
  operationId: string;
  progress: IngestProgress;
  report: IngestReport;
  canvases: IIIFCanvas[];
  items: IIIFItem[];
  resolve: (result: IngestResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: IngestProgress) => void;
}

const activeWorkerOperations = new Map<string, WorkerIngestState>();

/**
 * Handle worker progress message
 */
function handleWorkerProgress(message: IngestProgressMessage['payload']): void {
  const state = activeWorkerOperations.get(message.operationId);
  if (!state) return;

  // Update progress state
  const fileIndex = state.progress.files.findIndex(f => f.id === message.fileId);
  if (fileIndex >= 0) {
    state.progress.files[fileIndex] = message.progress;
  } else {
    state.progress.files.push(message.progress);
  }

  // Recalculate aggregates
  state.progress.filesCompleted = state.progress.files.filter(f => f.status === 'completed').length;
  state.progress.filesProcessing = state.progress.files.filter(f => f.status === 'processing').length;
  state.progress.filesError = state.progress.files.filter(f => f.status === 'error').length;
  state.progress.overallProgress = message.overallProgress;
  state.progress.stage = message.stage as IngestStage;
  state.progress.updatedAt = Date.now();

  // Call progress callback
  state.onProgress?.(state.progress);
}

/**
 * Handle worker file complete message
 */
function handleWorkerFileComplete(message: IngestFileCompleteMessage['payload']): void {
  const state = activeWorkerOperations.get(message.operationId);
  if (!state) return;

  // Add canvas to collection
  state.canvases.push(message.canvas);
  state.report.canvasesCreated++;
  state.report.filesProcessed++;

  // Save asset and thumbnail on main thread (storage requires IndexedDB access)
  (async () => {
    try {
      // Get the file from the canvas reference
      if (message.canvas._fileRef instanceof File) {
        await storage.saveAsset(message.canvas._fileRef, message.assetId);
      }

      // Save thumbnail if generated
      if (message.thumbnailBlob) {
        await storage.saveDerivative(message.assetId, 'thumb', message.thumbnailBlob);
      }
    } catch (error) {
      console.warn('[ingestWorker] Failed to save asset:', message.assetId, error);
    }
  })();
}

/**
 * Handle worker completion
 */
function handleWorkerComplete(message: IngestCompleteMessage['payload']): void {
  const state = activeWorkerOperations.get(message.operationId);
  if (!state) return;

  // Update final stats
  state.report.manifestsCreated = message.stats.manifestsCreated;
  state.report.collectionsCreated = message.stats.collectionsCreated;

  // Finalize progress
  state.progress.stage = 'complete';
  state.progress.stageProgress = 100;
  state.progress.overallProgress = 100;
  state.onProgress?.(state.progress);

  // Clean up
  activeWorkerOperations.delete(message.operationId);

  // Resolve with result
  state.resolve({
    root: message.root,
    report: state.report
  });
}

/**
 * Handle worker error
 */
function handleWorkerError(message: IngestErrorMessage['payload']): void {
  const state = activeWorkerOperations.get(message.operationId);
  if (!state) return;

  console.error('[ingestWorker] Error:', message.error);

  if (!message.recoverable) {
    state.progress.stage = 'error';
    state.onProgress?.(state.progress);
    activeWorkerOperations.delete(message.operationId);
    state.reject(new Error(message.error));
  }
}

/**
 * Initialize worker-based ingest
 */
async function ingestWithWorkers(
  tree: FileTree,
  baseUrl: string,
  report: IngestReport,
  progressOptions: IngestProgressOptions,
  reportProgress: (p: IngestProgress) => void
): Promise<IngestResult> {
  const operationId = `ingest-${Date.now()}`;
  const totalFiles = countMediaFiles(tree);

  // Create initial progress state
  const progress = createInitialProgress(operationId, totalFiles);

  // Set up worker state
  const workerState: WorkerIngestState = {
    operationId,
    progress,
    report: { ...report },
    canvases: [],
    items: [],
    resolve: () => {},
    reject: () => {},
    onProgress: reportProgress
  };

  activeWorkerOperations.set(operationId, workerState);

  return new Promise((resolve, reject) => {
    workerState.resolve = resolve;
    workerState.reject = reject;

    // Set up abort handling
    if (progressOptions.signal) {
      progressOptions.signal.addEventListener('abort', () => {
        const pool = getIngestWorkerPool();
        pool.cancelOperation(operationId);
        activeWorkerOperations.delete(operationId);
        reject(new Error('Ingest operation cancelled'));
      });
    }

    // Use the worker pool
    const pool = getIngestWorkerPool();

    // Start the ingest operation
    pool.ingestTree(tree, {
      generateThumbnails: true,
      extractMetadata: true,
      calculateHashes: false,
      signal: progressOptions.signal,
      onProgress: reportProgress
    }).then(result => {
      activeWorkerOperations.delete(operationId);
      resolve(result);
    }).catch(error => {
      activeWorkerOperations.delete(operationId);
      reject(error);
    });
  });
}

/**
 * Queue for background tile pre-generation
 * Derivatives are generated asynchronously after ingest completes
 */
interface TileGenerationTask {
  assetId: string;
  file: File;
  sizes: number[];
}

const tileGenerationQueue: TileGenerationTask[] = [];
let isProcessingTiles = false;

/**
 * Process tile generation queue in background
 * Runs non-blocking after ingest completes
 */
async function processTileQueue(onProgress?: (msg: string, percent: number) => void): Promise<void> {
  if (isProcessingTiles || tileGenerationQueue.length === 0) return;

  isProcessingTiles = true;
  const pool = getTileWorkerPool();
  const totalTasks = tileGenerationQueue.length;
  let completed = 0;

  while (tileGenerationQueue.length > 0) {
    const task = tileGenerationQueue.shift();
    if (!task) continue;

    try {
      const result = await pool.generateDerivatives(task.assetId, task.file, task.sizes);
      const preset = getDerivativePreset();

      // Save each derivative to storage
      for (const [size, blob] of result.derivatives) {
        let sizeKey: 'medium' | 'thumb' | 'small' = 'medium';
        if (size === preset.thumbnailWidth) sizeKey = 'thumb';
        else if (size < preset.fullWidth / 2) sizeKey = 'small';
        
        await storage.saveDerivative(task.assetId, sizeKey, blob);
      }

      completed++;
      if (onProgress) {
        const percent = Math.round((completed / totalTasks) * 100);
        onProgress(`Pre-generating tiles (${completed}/${totalTasks})...`, percent);
      }
    } catch (e) {
      console.warn(`Background tile generation failed for ${task.assetId}:`, e);
    }
  }

  isProcessingTiles = false;
}

/**
 * Generate derivative synchronously (fallback for immediate thumbnail needs)
 */
const generateDerivative = async (file: Blob, width: number): Promise<Blob | null> => {
    try {
        const bitmap = await createImageBitmap(file);
        const ratio = bitmap.height / bitmap.width;
        const targetHeight = Math.floor(width * ratio);
        const canvas = new OffscreenCanvas(width, targetHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0, width, targetHeight);
        return await canvas.convertToBlob({ type: 'image/jpeg', quality: IMAGE_QUALITY.preview });
    } catch (e) {
        return null;
    }
};

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

/**
 * Enhanced processNode with granular progress tracking
 */
const processNodeWithProgress = async (
  node: FileTree,
  baseUrl: string,
  report: IngestReport,
  progress: IngestProgress,
  progressOptions: IngestProgressOptions,
  reportProgress: (p: IngestProgress) => void
): Promise<IIIFItem> => {
  // Check for cancellation
  checkCancellation(progressOptions.signal);
  await checkPaused(progress);

  // Determine IIIF type using this priority:
  let type: 'Collection' | 'Manifest' = 'Manifest';

  if (node.iiifIntent && (node.iiifIntent === 'Collection' || node.iiifIntent === 'Manifest')) {
    type = node.iiifIntent;
  } else {
    const hasSubdirs = node.directories.size > 0;
    const isExplicitCollection = node.name === IIIF_CONFIG.INGEST.ROOT_NAME || node.name.startsWith(IIIF_CONFIG.INGEST.COLLECTION_PREFIX);

    const mediaFiles = Array.from(node.files.keys()).filter(fn => {
      const ext = fn.split('.').pop()?.toLowerCase() || '';
      return !!MIME_TYPE_MAP[ext];
    });
    const isLeaf = !hasSubdirs && mediaFiles.length > 0;

    if (isLeaf) {
      type = 'Manifest';
    } else if (isExplicitCollection || hasSubdirs) {
      type = 'Collection';
    } else if (mediaFiles.length > 0) {
      type = 'Manifest';
    } else {
      type = 'Collection';
    }
  }

  let ymlMeta: any = {};
  if (node.files.has(IIIF_CONFIG.INGEST.META_FILE)) {
    try {
      const text = await node.files.get(IIIF_CONFIG.INGEST.META_FILE)!.text();
      ymlMeta = load(text) || {};
    } catch (e) {
      report.warnings.push(`Invalid ${IIIF_CONFIG.INGEST.META_FILE} in ${node.path}`);
      progress = addLogEntry(progress, `Invalid metadata file in ${node.path}`, 'warning');
    }
  }

  let cleanName = node.name.startsWith(IIIF_CONFIG.INGEST.COLLECTION_PREFIX)
    ? node.name.substring(IIIF_CONFIG.INGEST.COLLECTION_PREFIX.length)
    : node.name;
  if (cleanName === IIIF_CONFIG.INGEST.ROOT_NAME) cleanName = IIIF_CONFIG.INGEST.ROOT_DISPLAY_NAME;

  const id = generateId(type, baseUrl);
  const lang = ymlMeta.language || 'none';
  const label = ymlMeta.label ? { [lang]: [ymlMeta.label] } : { none: [cleanName] };

  if (type === 'Manifest') {
    const items: IIIFCanvas[] = [];
    const fileNames = Array.from(node.files.keys()).sort();
    
    // Smart Sidecar Detection
    const sidecars = new Map<string, { main: File, supplemental: File[] }>();
    const orphanedSupplemental: File[] = [];

    // First pass: identify main content files
    fileNames.forEach(fn => {
      const parts = fn.split('.');
      const ext = parts.pop()?.toLowerCase() || '';
      const base = parts.join('.');
      const mime = MIME_TYPE_MAP[ext];

      if (mime && mime.motivation === 'painting') {
        if (!sidecars.has(base)) {
          sidecars.set(base, { main: node.files.get(fn)!, supplemental: [] });
        }
      }
    });

    // Second pass: link supplemental files
    fileNames.forEach(fn => {
      const parts = fn.split('.');
      const ext = parts.pop()?.toLowerCase() || '';
      const base = parts.join('.');

      if (ext === 'txt' || ext === 'srt' || ext === 'vtt') {
        const file = node.files.get(fn)!;
        if (sidecars.has(base)) {
          sidecars.get(base)!.supplemental.push(file);
        } else {
          orphanedSupplemental.push(file);
        }
      }
    });

    // Log sidecar detection
    if (sidecars.size > 0) {
      const withSupp = Array.from(sidecars.values()).filter(s => s.supplemental.length > 0).length;
      report.warnings.push(`Smart Sidecar: Detected ${withSupp} paired files with transcriptions/captions`);
      progress = addLogEntry(progress, `Detected ${withSupp} files with sidecars`, 'info');
    }
    if (orphanedSupplemental.length > 0) {
      report.warnings.push(`Smart Sidecar: Found ${orphanedSupplemental.length} orphaned .txt/.srt files`);
      progress = addLogEntry(progress, `Found ${orphanedSupplemental.length} orphaned supplemental files`, 'warning');
    }

    // Update stage to processing
    progress = updateStage(progress, 'processing');
    reportProgress(progress);

    const bases = Array.from(sidecars.keys()).sort();
    for (let i = 0; i < bases.length; i++) {
      // Check cancellation
      checkCancellation(progressOptions.signal);
      await checkPaused(progress);

      const base = bases[i];
      const { main: file, supplemental } = sidecars.get(base)!;
      const ext = file.name.split('.').pop()?.toLowerCase() || '';

      // Add file to progress tracking
      const { progress: progressWithFile, fileId } = addFileToProgress(progress, {
        name: file.name,
        path: node.path ? `${node.path}/${file.name}` : file.name,
        size: file.size,
        mimeType: file.type || MIME_TYPE_MAP[ext]?.format || 'application/octet-stream'
      });
      progress = progressWithFile;

      // Mark as processing
      progress = updateFileProgress(progress, fileId, {
        status: 'processing',
        startedAt: Date.now(),
        progress: 10
      });
      progress = { ...progress, currentFile: progress.files.find(f => f.id === fileId) };
      reportProgress(progress);

      const canvasId = IIIF_CONFIG.ID_PATTERNS.CANVAS(id, items.length + 1);
      const assetId = `${id.split('/').pop()}-${file.name.replace(/[^a-zA-Z0-9-_]/g, '')}`;

      try {
        // Check for duplicate files
        progress = updateFileProgress(progress, fileId, { progress: 30 });
        reportProgress(progress);

        const duplicateCheck = await fileIntegrity.registerFile(file, canvasId, file.name);
        if (duplicateCheck.isDuplicate && duplicateCheck.existingEntityId) {
          report.warnings.push(
            `Duplicate detected: "${file.name}" matches existing file (hash: ${duplicateCheck.fingerprint?.hash.substring(0, 8)}...). ` +
            `Original entity: ${duplicateCheck.existingEntityId}.`
          );
          report.duplicatesSkipped = (report.duplicatesSkipped || 0) + 1;
          progress = addLogEntry(progress, `Duplicate skipped: ${file.name}`, 'warning', fileId);
          progress = updateFileProgress(progress, fileId, {
            status: 'skipped',
            progress: 100,
            completedAt: Date.now()
          });
          reportProgress(progress);
          continue;
        }

        progress = updateFileProgress(progress, fileId, { progress: 50 });
        reportProgress(progress);

        // Save asset
        await storage.saveAsset(file, assetId);

        // Get image dimensions
        let imageWidth = DEFAULT_INGEST_PREFS.defaultCanvasWidth;
        let imageHeight = DEFAULT_INGEST_PREFS.defaultCanvasHeight;

        if (file.type.startsWith('image/')) {
          try {
            const bitmap = await createImageBitmap(file);
            imageWidth = bitmap.width;
            imageHeight = bitmap.height;
            bitmap.close();
          } catch (e) {
            console.warn(`Could not read image dimensions for ${file.name}, using defaults`);
          }

          const preset = getDerivativePreset();

          // Generate thumbnail
          progress = updateFileProgress(progress, fileId, { progress: 70 });
          reportProgress(progress);

          const thumb = await generateDerivative(file, preset.thumbnailWidth);
          if (thumb) await storage.saveDerivative(assetId, 'thumb', thumb);

          // Queue larger derivatives
          tileGenerationQueue.push({
            assetId,
            file,
            sizes: preset.sizes.filter(s => s > preset.thumbnailWidth)
          });
        }

        progress = updateFileProgress(progress, fileId, { progress: 80 });
        reportProgress(progress);

        const extractedMeta = await extractMetadata(file);
        const iiifType = MIME_TYPE_MAP[ext]?.type || 'Image';
        const isImage = iiifType === 'Image';
        const preset = getDerivativePreset();

        const thumbnails = isImage ? [{
          id: `${IIIF_CONFIG.ID_PATTERNS.IMAGE_SERVICE(baseUrl, assetId)}/full/${preset.thumbnailWidth},/0/default.jpg`,
          type: "Image" as const,
          format: "image/jpeg",
          width: preset.thumbnailWidth
        }] : undefined;

        const paintingAnnotation: IIIFAnnotation = {
          id: `${canvasId}/annotation/painting`,
          type: "Annotation",
          label: { none: ["Content Resource"] },
          motivation: "painting",
          target: canvasId,
          body: {
            id: `${IIIF_CONFIG.ID_PATTERNS.IMAGE_SERVICE(baseUrl, assetId)}/full/max/0/default.jpg`,
            type: iiifType as any,
            format: MIME_TYPE_MAP[ext]?.format || 'image/jpeg',
            service: isImage ? [
              createImageServiceReference(IIIF_CONFIG.ID_PATTERNS.IMAGE_SERVICE(baseUrl, assetId), 'level2')
            ] : undefined
          }
        };

        const annos: IIIFAnnotationPage[] = [{
          id: `${canvasId}/page/painting`,
          type: "AnnotationPage",
          label: { none: ["Painting Page"] },
          items: [paintingAnnotation]
        }];

        // Process supplemental files
        const supplementingPages: IIIFAnnotationPage[] = [];
        if (supplemental.length > 0) {
          const suppPage: IIIFAnnotationPage = {
            id: `${canvasId}/page/supplementing`,
            type: "AnnotationPage",
            label: { none: ["Supplements"] },
            items: await Promise.all(supplemental.map(async (sf, sIdx) => {
              const suppAssetId = `${assetId}-supp-${sIdx}`;
              const textContent = await sf.text();
              const textBlob = new Blob([textContent], { type: 'text/plain' });
              await storage.saveAsset(textBlob, suppAssetId);

              return {
                id: `${canvasId}/annotation/supp-${sIdx}`,
                type: "Annotation",
                motivation: "supplementing",
                label: { none: [sf.name] },
                body: {
                  type: "TextualBody",
                  value: textContent,
                  format: sf.name.endsWith('.srt') ? 'text/vtt' : 'text/plain',
                  language: sf.name.endsWith('.srt') ? undefined : 'en'
                },
                target: canvasId
              } as IIIFAnnotation;
            }))
          };
          supplementingPages.push(suppPage);
        }

        const canvas: IIIFCanvas = {
          id: canvasId,
          type: "Canvas",
          label: { none: [file.name] },
          width: imageWidth,
          height: imageHeight,
          items: annos,
          annotations: supplementingPages,
          thumbnail: thumbnails,
          navDate: extractedMeta.navDate,
          metadata: extractedMeta.metadata,
          _fileRef: file
        };

        // Register for lifecycle management
        if (isFileLifecycleEnabled()) {
          const fileLifecycleManager = getFileLifecycleManager();
          fileLifecycleManager.register(canvasId, file, () => {
            if (isFileLifecycleEnabled()) {
              console.log(`[iiifBuilder] Cleaning up file reference for canvas ${canvasId}`);
            }
          });
        }

        items.push(canvas);
        report.canvasesCreated++;
        report.filesProcessed++;

        // Mark as completed
        progress = updateFileProgress(progress, fileId, {
          status: 'completed',
          progress: 100,
          completedAt: Date.now()
        });
        progress = addLogEntry(progress, `Processed: ${file.name}`, 'success', fileId);
        reportProgress(progress);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        progress = updateFileProgress(progress, fileId, {
          status: 'error',
          error: errorMessage,
          completedAt: Date.now()
        });
        progress = addLogEntry(progress, `Error processing ${file.name}: ${errorMessage}`, 'error', fileId);
        reportProgress(progress);
        
        if (errorMessage.includes('cancelled')) {
          throw error;
        }
      }
    }

    report.manifestsCreated++;
    const manifest: IIIFManifest = {
      "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id, type: "Manifest", label, items,
      behavior: node.iiifBehavior || ["individuals"],
      viewingDirection: (node as any).viewingDirection || "left-to-right",
      service: [{
        id: IIIF_CONFIG.ID_PATTERNS.SEARCH_SERVICE(baseUrl, id.split('/').pop() || ''),
        type: "SearchService2",
        profile: IIIF_SPEC.SEARCH_2.PROFILE,
        label: { en: ["Content Search"] }
      }]
    };
    return manifest;
  } else {
    // This is a Collection
    const items: IIIFItem[] = [];

    // Handle loose files at collection level
    const mediaFiles = Array.from(node.files.keys()).filter(fn => {
      const ext = fn.split('.').pop()?.toLowerCase() || '';
      const mime = MIME_TYPE_MAP[ext];
      return mime && mime.motivation === 'painting';
    });

    if (mediaFiles.length > 0) {
      const looseFilesNode: FileTree = {
        name: `${cleanName} - ${IIIF_CONFIG.INGEST.LOOSE_FILES_Dir_NAME}`,
        path: node.path,
        files: new Map(Array.from(node.files.entries()).filter(([fn]) => {
          const ext = fn.split('.').pop()?.toLowerCase() || '';
          const mime = MIME_TYPE_MAP[ext];
          return mime && mime.motivation === 'painting';
        })),
        directories: new Map(),
        iiifIntent: 'Manifest'
      };
      items.push(await processNodeWithProgress(looseFilesNode, baseUrl, report, progress, progressOptions, reportProgress));
    }

    // Process subdirectories
    for (const [name, dir] of node.directories.entries()) {
      if (name.startsWith('+') || name.startsWith('!')) continue;
      items.push(await processNodeWithProgress(dir, baseUrl, report, progress, progressOptions, reportProgress));
    }

    report.collectionsCreated++;
    const collection: IIIFCollection = {
      "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id, type: "Collection", label, items
    };
    return collection;
  }
};

const processNode = async (
    node: FileTree,
    baseUrl: string,
    report: IngestReport,
    onProgress?: (msg: string, percent: number) => void
): Promise<IIIFItem> => {
    // Determine IIIF type using this priority:
    // 1. Explicit iiifIntent from analyzer preview (user-confirmed)
    // 2. Marker file detection (info.yml with type field)
    // 3. Leaf detection: folders with only media files → Manifest
    // 4. Has subdirectories → Collection
    // 5. Root or underscore prefix → Collection
    // 6. Default: Manifest if has media, Collection otherwise

    let type: 'Collection' | 'Manifest' = 'Manifest';

    if (node.iiifIntent && (node.iiifIntent === 'Collection' || node.iiifIntent === 'Manifest')) {
      // User-confirmed type from ingest preview
      type = node.iiifIntent;
    } else {
      // Auto-detection fallback
      const hasSubdirs = node.directories.size > 0;
      const isExplicitCollection = node.name === IIIF_CONFIG.INGEST.ROOT_NAME || node.name.startsWith(IIIF_CONFIG.INGEST.COLLECTION_PREFIX);

      // Count media files
      const mediaFiles = Array.from(node.files.keys()).filter(fn => {
        const ext = fn.split('.').pop()?.toLowerCase() || '';
        return !!MIME_TYPE_MAP[ext];
      });
      const isLeaf = !hasSubdirs && mediaFiles.length > 0;

      if (isLeaf) {
        // Leaf detection: folder with only media files → Manifest
        type = 'Manifest';
      } else if (isExplicitCollection || hasSubdirs) {
        // Has subdirs or explicit marker → Collection
        type = 'Collection';
      } else if (mediaFiles.length > 0) {
        // Has media but no subdirs → Manifest
        type = 'Manifest';
      } else {
        // Empty or no clear indicator → Collection (can be populated later)
        type = 'Collection';
      }
    }

    let ymlMeta: any = {};
    if (node.files.has(IIIF_CONFIG.INGEST.META_FILE)) {
        try {
            const text = await node.files.get(IIIF_CONFIG.INGEST.META_FILE)!.text();
            ymlMeta = load(text) || {};
        } catch (e) { report.warnings.push(`Invalid ${IIIF_CONFIG.INGEST.META_FILE} in ${node.path}`); }
    }

    let cleanName = node.name.startsWith(IIIF_CONFIG.INGEST.COLLECTION_PREFIX) ? node.name.substring(IIIF_CONFIG.INGEST.COLLECTION_PREFIX.length) : node.name;
    if (cleanName === IIIF_CONFIG.INGEST.ROOT_NAME) cleanName = IIIF_CONFIG.INGEST.ROOT_DISPLAY_NAME;

    const id = generateId(type, baseUrl);
    const lang = ymlMeta.language || 'none';
    const label = ymlMeta.label ? { [lang]: [ymlMeta.label] } : { none: [cleanName] };

    if (type === 'Manifest') {
        const items: IIIFCanvas[] = [];
        const fileNames = Array.from(node.files.keys()).sort();
        
        // Smart Sidecar Detection: Map of base filename to related files
        const sidecars = new Map<string, { main: File, supplemental: File[] }>();
        const orphanedSupplemental: File[] = [];

        // First pass: identify main content files
        fileNames.forEach(fn => {
            const parts = fn.split('.');
            const ext = parts.pop()?.toLowerCase() || '';
            const base = parts.join('.');
            const mime = MIME_TYPE_MAP[ext];

            if (mime && mime.motivation === 'painting') {
                if (!sidecars.has(base)) {
                    sidecars.set(base, { main: node.files.get(fn)!, supplemental: [] });
                }
            }
        });

        // Second pass: link supplemental files to their main content
        fileNames.forEach(fn => {
            const parts = fn.split('.');
            const ext = parts.pop()?.toLowerCase() || '';
            const base = parts.join('.');

            if (ext === 'txt' || ext === 'srt' || ext === 'vtt') {
                const file = node.files.get(fn)!;
                if (sidecars.has(base)) {
                    // Linked sidecar: photo_001.jpg + photo_001.txt
                    sidecars.get(base)!.supplemental.push(file);
                } else {
                    // Orphaned supplemental file (no matching main file)
                    orphanedSupplemental.push(file);
                }
            }
        });

        // Log sidecar detection results
        if (sidecars.size > 0) {
            const withSupp = Array.from(sidecars.values()).filter(s => s.supplemental.length > 0).length;
            report.warnings.push(`Smart Sidecar: Detected ${withSupp} paired files with transcriptions/captions`);
        }
        if (orphanedSupplemental.length > 0) {
            report.warnings.push(`Smart Sidecar: Found ${orphanedSupplemental.length} orphaned .txt/.srt files (no matching media)`);
        }

        const bases = Array.from(sidecars.keys()).sort();
        for (let i = 0; i < bases.length; i++) {
            const base = bases[i];
            const { main: file, supplemental } = sidecars.get(base)!;
            const ext = file.name.split('.').pop()?.toLowerCase() || '';

            if (onProgress) {
                const percent = Math.round((i / bases.length) * 100);
                onProgress(`Ingesting ${file.name}...`, percent);
            }

            const canvasId = IIIF_CONFIG.ID_PATTERNS.CANVAS(id, items.length + 1);
            const assetId = `${id.split('/').pop()}-${file.name.replace(/[^a-zA-Z0-9-_]/g, '')}`;

            // Check for duplicate files before saving
            const duplicateCheck = await fileIntegrity.registerFile(file, canvasId, file.name);
            if (duplicateCheck.isDuplicate && duplicateCheck.existingEntityId) {
                report.warnings.push(
                    `Duplicate detected: "${file.name}" matches existing file (hash: ${duplicateCheck.fingerprint?.hash.substring(0, 8)}...). ` +
                    `Original entity: ${duplicateCheck.existingEntityId}. File will still be imported with shared reference.`
                );
                report.duplicatesSkipped = (report.duplicatesSkipped || 0) + 1;
            }

            await storage.saveAsset(file, assetId);

            // Get actual image dimensions for proper canvas sizing
            let imageWidth = DEFAULT_INGEST_PREFS.defaultCanvasWidth;
            let imageHeight = DEFAULT_INGEST_PREFS.defaultCanvasHeight;

            if (file.type.startsWith('image/')) {
                // Read actual dimensions from image file
                try {
                    const bitmap = await createImageBitmap(file);
                    imageWidth = bitmap.width;
                    imageHeight = bitmap.height;
                    bitmap.close(); // Free memory
                } catch (e) {
                    console.warn(`Could not read image dimensions for ${file.name}, using defaults`);
                }

                const preset = getDerivativePreset();

                // Generate thumbnail immediately for UI display
                const thumb = await generateDerivative(file, preset.thumbnailWidth);
                if (thumb) await storage.saveDerivative(assetId, 'thumb', thumb);

                // Queue larger derivatives for background generation
                tileGenerationQueue.push({
                    assetId,
                    file,
                    sizes: preset.sizes.filter(s => s > preset.thumbnailWidth)
                });
            }

            const extractedMeta = await extractMetadata(file);
            const iiifType = MIME_TYPE_MAP[ext]?.type || 'Image';
            const isImage = iiifType === 'Image';
            const preset = getDerivativePreset();

            const thumbnails = isImage ? [
                {
                    id: `${IIIF_CONFIG.ID_PATTERNS.IMAGE_SERVICE(baseUrl, assetId)}/full/${preset.thumbnailWidth},/0/default.jpg`,
                    type: "Image" as const,
                    format: "image/jpeg",
                    width: preset.thumbnailWidth
                }
            ] : undefined;

            const paintingAnnotation: IIIFAnnotation = {
                id: `${canvasId}/annotation/painting`,
                type: "Annotation",
                label: { none: ["Content Resource"] }, 
                motivation: "painting",
                target: canvasId,
                body: {
                    id: `${IIIF_CONFIG.ID_PATTERNS.IMAGE_SERVICE(baseUrl, assetId)}/full/max/0/default.jpg`,
                    type: iiifType as any,
                    format: MIME_TYPE_MAP[ext]?.format || 'image/jpeg',
                    // Use centralized Image API service reference
                    service: isImage ? [
                        createImageServiceReference(IIIF_CONFIG.ID_PATTERNS.IMAGE_SERVICE(baseUrl, assetId), 'level2')
                    ] : undefined
                }
            };

            // Handle Smart Sidecars as supplementing annotations
            const annos: IIIFAnnotationPage[] = [{
                id: `${canvasId}/page/painting`,
                type: "AnnotationPage",
                label: { none: ["Painting Page"] },
                items: [paintingAnnotation]
            }];

            // Process supplemental files (txt, srt) and create supplementing annotations
            const supplementingPages: IIIFAnnotationPage[] = [];
            if (supplemental.length > 0) {
                const suppPage: IIIFAnnotationPage = {
                    id: `${canvasId}/page/supplementing`,
                    type: "AnnotationPage",
                    label: { none: ["Supplements"] },
                    items: await Promise.all(supplemental.map(async (sf, sIdx) => {
                        // Store supplemental file in IndexedDB for retrieval
                        const suppAssetId = `${assetId}-supp-${sIdx}`;
                        const textContent = await sf.text();
                        const textBlob = new Blob([textContent], { type: 'text/plain' });
                        await storage.saveAsset(textBlob, suppAssetId);

                        return {
                            id: `${canvasId}/annotation/supp-${sIdx}`,
                            type: "Annotation",
                            motivation: "supplementing",
                            label: { none: [sf.name] },
                            body: {
                                type: "TextualBody",
                                value: textContent,
                                format: sf.name.endsWith('.srt') ? 'text/vtt' : 'text/plain',
                                language: sf.name.endsWith('.srt') ? undefined : 'en'
                            },
                            target: canvasId
                        } as IIIFAnnotation;
                    }))
                };
                supplementingPages.push(suppPage);
            }

            const canvas: IIIFCanvas = {
                id: canvasId,
                type: "Canvas",
                label: { none: [file.name] },
                width: imageWidth,
                height: imageHeight,
                items: annos,
                annotations: supplementingPages, // Canvas.annotations for non-painting content
                thumbnail: thumbnails,
                navDate: extractedMeta.navDate,
                metadata: extractedMeta.metadata,
                _fileRef: file
            };

            // Phase 1 Memory Leak Fix: Register file reference for lifecycle management
            if (isFileLifecycleEnabled()) {
                const fileLifecycleManager = getFileLifecycleManager();
                fileLifecycleManager.register(canvasId, file, () => {
                    // Pre-cleanup callback: clear the reference from canvas when cleaned up
                    if (isFileLifecycleEnabled()) {
                        console.log(`[iiifBuilder] Cleaning up file reference for canvas ${canvasId}`);
                    }
                });
            }

            items.push(canvas);
            report.canvasesCreated++;
            report.filesProcessed++;
        }

        report.manifestsCreated++;
        const manifest: IIIFManifest = {
            "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
            id, type: "Manifest", label, items,
            behavior: node.iiifBehavior || ["individuals"],
            viewingDirection: (node as any).viewingDirection || "left-to-right",
            service: [{
                id: IIIF_CONFIG.ID_PATTERNS.SEARCH_SERVICE(baseUrl, id.split('/').pop() || ''),
                type: "SearchService2",
                profile: IIIF_SPEC.SEARCH_2.PROFILE,
                label: { en: ["Content Search"] }
            }]
        };
        return manifest;
    } else {
        // This is a Collection - process subdirectories
        const items: IIIFItem[] = [];

        // If this Collection has files at its level, create a "loose files" Manifest for them
        const mediaFiles = Array.from(node.files.keys()).filter(fn => {
            const ext = fn.split('.').pop()?.toLowerCase() || '';
            const mime = MIME_TYPE_MAP[ext];
            return mime && mime.motivation === 'painting';
        });

        if (mediaFiles.length > 0) {
            // Create a virtual node for loose files
            const looseFilesNode: FileTree = {
                name: `${cleanName} - ${IIIF_CONFIG.INGEST.LOOSE_FILES_Dir_NAME}`,
                path: node.path,
                files: new Map(Array.from(node.files.entries()).filter(([fn]) => {
                    const ext = fn.split('.').pop()?.toLowerCase() || '';
                    const mime = MIME_TYPE_MAP[ext];
                    return mime && mime.motivation === 'painting';
                })),
                directories: new Map(),
                iiifIntent: 'Manifest' // Force this to be a manifest
            };
            items.push(await processNode(looseFilesNode, baseUrl, report, onProgress));
        }

        // Process subdirectories
        for (const [name, dir] of node.directories.entries()) {
            if (name.startsWith('+') || name.startsWith('!')) continue;
            items.push(await processNode(dir, baseUrl, report, onProgress));
        }

        report.collectionsCreated++;
        const collection: IIIFCollection = {
            "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
            id, type: "Collection", label, items
        };
        return collection;
    }
};

/**
 * Ingest a file tree with enhanced progress tracking
 * Supports both legacy callback and new enhanced progress options
 */
export const ingestTree = async (
  tree: FileTree,
  existingRoot: IIIFItem | null = null,
  progressInput?: LegacyProgressCallback | IngestProgressOptions
): Promise<IngestResult> => {
  const report: IngestReport = {
    manifestsCreated: 0,
    collectionsCreated: 0,
    canvasesCreated: 0,
    filesProcessed: 0,
    warnings: []
  };

  // Determine which progress system to use
  const isLegacyCallback = typeof progressInput === 'function';
  const enhancedOptions: IngestProgressOptions = isLegacyCallback ? {} : (progressInput || {});
  const legacyCallback: LegacyProgressCallback | undefined = isLegacyCallback
    ? progressInput as LegacyProgressCallback
    : undefined;

  // Use enhanced progress if feature flag is enabled and not using legacy callback
  const useEnhancedProgress = USE_ENHANCED_PROGRESS && !isLegacyCallback;

  // Setup baseUrl
  let baseUrl = tree.iiifBaseUrl;
  if (!baseUrl) {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    baseUrl = `${window.location.origin}${basePath}/${IIIF_CONFIG.BASE_URL.PATH_SEGMENT}`;
  } else {
    baseUrl = baseUrl.replace(/\/$/, '');
  }

  let progress: IngestProgress | undefined;
  let newRoot: IIIFItem;

  // Phase 4: Check if worker-based ingest should be used
  const shouldUseWorkers = isWorkerIngestEnabled() && areWorkersSupported() && !isLegacyCallback;

  if (shouldUseWorkers) {
    // Phase 4: Worker-based ingest path
    try {
      const reportProgress = (p: IngestProgress) => {
        enhancedOptions.onProgress?.(p);
        if (legacyCallback) {
          progressToLegacyCallback(p, legacyCallback);
        }
      };

      const workerResult = await ingestWithWorkers(
        tree,
        baseUrl,
        report,
        enhancedOptions,
        reportProgress
      );

      newRoot = workerResult.root;

      // Merge stats from worker result
      report.manifestsCreated = workerResult.report.manifestsCreated;
      report.collectionsCreated = workerResult.report.collectionsCreated;
      report.canvasesCreated = workerResult.report.canvasesCreated;
      report.filesProcessed = workerResult.report.filesProcessed;

      // Add progress summary if available
      if (activeWorkerOperations.size === 0) {
        const lastProgress = Array.from(activeWorkerOperations.values()).pop()?.progress;
        if (lastProgress) {
          report.progressSummary = createProgressSummary(lastProgress);
        }
      }
    } catch (workerError) {
      console.warn('[ingestTree] Worker ingest failed, falling back to main thread:', workerError);
      // Fall through to enhanced progress path
      newRoot = await processNodeWithProgress(
        tree,
        baseUrl,
        report,
        createInitialProgress(`fallback-${Date.now()}`, countMediaFiles(tree)),
        enhancedOptions,
        (p) => {
          enhancedOptions.onProgress?.(p);
          if (legacyCallback) {
            progressToLegacyCallback(p, legacyCallback);
          }
        }
      );
    }
  } else if (useEnhancedProgress) {
    // Enhanced progress path (main thread)
    const operationId = `ingest-${Date.now()}`;
    const totalFiles = countMediaFiles(tree);
    progress = createInitialProgress(operationId, totalFiles);

    const reportProgress = (p: IngestProgress) => {
      enhancedOptions.onProgress?.(p);
      // Also call legacy callback if provided for compatibility
      if (legacyCallback) {
        progressToLegacyCallback(p, legacyCallback);
      }
    };

    try {
      newRoot = await processNodeWithProgress(
        tree,
        baseUrl,
        report,
        progress,
        enhancedOptions,
        reportProgress
      );

      // Final progress update
      progress = updateStage(progress, 'complete', 100);
      progress = addLogEntry(progress, `Ingest complete: ${report.filesProcessed} files processed`, 'success');
      reportProgress(progress);

      // Add progress summary to report
      report.progressSummary = createProgressSummary(progress);
    } catch (error) {
      if (progress) {
        progress = {
          ...progress,
          isCancelled: error instanceof Error && error.message.includes('cancelled')
        };
        progress = updateStage(progress, 'error');
        progress = addLogEntry(
          progress,
          error instanceof Error ? error.message : 'Unknown error during ingest',
          'error'
        );
        reportProgress(progress);
        report.progressSummary = createProgressSummary(progress);
      }
      throw error;
    }
  } else {
    // Legacy path - use original processNode
    newRoot = await processNode(tree, baseUrl, report, legacyCallback);
  }

  // Merge with existing root if provided
  if (existingRoot && isCollection(existingRoot)) {
    const rootClone = JSON.parse(JSON.stringify(existingRoot)) as IIIFCollection;
    if (!rootClone.items) rootClone.items = [];

    if (isCollection(newRoot) && tree.name === 'root') {
      const newItems = (newRoot as IIIFCollection).items || [];
      for (const item of newItems) {
        if (isValidChildType('Collection', item.type)) {
          const relationship = getRelationshipType('Collection', item.type);
          console.log(`Adding ${item.type} to Collection with ${relationship} relationship`);
          rootClone.items.push(item);
        } else {
          report.warnings.push(`Skipped ${item.type} - not valid child of Collection`);
        }
      }
    } else {
      if (isValidChildType('Collection', newRoot.type)) {
        const relationship = getRelationshipType('Collection', newRoot.type);
        console.log(`Adding ${newRoot.type} to existing Collection with ${relationship} relationship`);
        rootClone.items.push(newRoot);
      } else {
        report.warnings.push(`Cannot add ${newRoot.type} to existing Collection - invalid child type`);
      }
    }
    await storage.saveProject(rootClone);

    // Start background tile pre-generation
    if (tileGenerationQueue.length > 0) {
      report.warnings.push(`Background tile generation queued for ${tileGenerationQueue.length} images`);
      processTileQueue(legacyCallback).catch(e =>
        console.warn('Background tile generation error:', e)
      );
    }

    return { root: rootClone, report };
  } else {
    await storage.saveProject(newRoot);

    // Start background tile pre-generation
    if (tileGenerationQueue.length > 0) {
      report.warnings.push(`Background tile generation queued for ${tileGenerationQueue.length} images`);
      processTileQueue(legacyCallback).catch(e =>
        console.warn('Background tile generation error:', e)
      );
    }

    return { root: newRoot, report };
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
        type: file.type.startsWith('image/') ? 'Image' : 'Video',
        format: file.type,
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
