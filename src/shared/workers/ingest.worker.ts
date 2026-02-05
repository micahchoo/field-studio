/**
 * Ingest Web Worker
 *
 * Offloads CPU-intensive ingest operations from the main thread:
 * - createImageBitmap() for image dimensions
 * - generateDerivative() for thumbnail generation
 * - calculateHash() for file integrity
 * - extractMetadata() for metadata harvesting
 * - buildIIIFStructure() for IIIF manifest building
 *
 * Implements bidirectional message protocol for streaming results.
 */

import type {
  FileTree,
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFCollection,
  IIIFItem,
  IIIFManifest,
  IngestFileInfo,
  IngestProgress
} from '@/types';

// ============================================================================
// Message Types for Worker Communication Protocol
// ============================================================================

/** Initialize a new ingest operation */
export interface InitIngestMessage {
  type: 'INIT_INGEST';
  payload: {
    operationId: string;
    totalFiles: number;
    baseUrl: string;
    options?: {
      generateThumbnails?: boolean;
      extractMetadata?: boolean;
      calculateHashes?: boolean;
    };
  };
}

/** Process an individual file */
export interface ProcessFileMessage {
  type: 'PROCESS_FILE';
  payload: {
    operationId: string;
    file: File;
    fileId: string;
    nodePath: string;
    manifestId: string;
    canvasIndex: number;
    baseUrl: string;
    supplementalFiles?: File[];
    ymlMeta?: Record<string, unknown>;
  };
}

/** Cancel an ongoing ingest operation */
export interface CancelIngestMessage {
  type: 'CANCEL_INGEST';
  payload: {
    operationId: string;
  };
}

/** Process a complete node (directory) */
export interface ProcessNodeMessage {
  type: 'PROCESS_NODE';
  payload: {
    operationId: string;
    node: FileTree;
    baseUrl: string;
    parentId?: string;
  };
}

/** Worker -> Main: Progress update */
export interface IngestProgressMessage {
  type: 'INGEST_PROGRESS';
  payload: {
    operationId: string;
    fileId: string;
    progress: IngestFileInfo;
    stage: string;
    overallProgress: number;
  };
}

/** Worker -> Main: File processing complete */
export interface IngestFileCompleteMessage {
  type: 'INGEST_FILE_COMPLETE';
  payload: {
    operationId: string;
    fileId: string;
    canvas: IIIFCanvas;
    assetId: string;
    thumbnailBlob?: Blob;
    metadata: {
      width: number;
      height: number;
      hash?: string;
      extractedMeta: Partial<IIIFItem>;
    };
  };
}

/** Worker -> Main: Node processing complete */
export interface IngestNodeCompleteMessage {
  type: 'INGEST_NODE_COMPLETE';
  payload: {
    operationId: string;
    nodeId: string;
    item: IIIFItem;
  };
}

/** Worker -> Main: Operation complete */
export interface IngestCompleteMessage {
  type: 'INGEST_COMPLETE';
  payload: {
    operationId: string;
    root: IIIFItem;
    stats: {
      manifestsCreated: number;
      collectionsCreated: number;
      canvasesCreated: number;
      filesProcessed: number;
      durationMs: number;
    };
  };
}

/** Worker -> Main: Error handling */
export interface IngestErrorMessage {
  type: 'INGEST_ERROR';
  payload: {
    operationId: string;
    fileId?: string;
    error: string;
    stage: string;
    recoverable: boolean;
  };
}

/** Worker -> Main: Initialization complete */
export interface IngestInitializedMessage {
  type: 'INGEST_INITIALIZED';
  payload: {
    operationId: string;
  };
}

/** All message types from main thread */
export type IngestWorkerRequest =
  | InitIngestMessage
  | ProcessFileMessage
  | ProcessNodeMessage
  | CancelIngestMessage;

/** All message types from worker */
export type IngestWorkerResponse =
  | IngestProgressMessage
  | IngestFileCompleteMessage
  | IngestNodeCompleteMessage
  | IngestCompleteMessage
  | IngestErrorMessage
  | IngestInitializedMessage;

// ============================================================================
// Constants (mirrored from constants.ts)
// ============================================================================

const IMAGE_QUALITY = {
  preview: 0.85,
  thumbnail: 0.8,
  tile: 0.9
};

const MIME_TYPE_MAP: Record<string, { format: string; type: string; motivation: string }> = {
  'jpg': { format: 'image/jpeg', type: 'Image', motivation: 'painting' },
  'jpeg': { format: 'image/jpeg', type: 'Image', motivation: 'painting' },
  'png': { format: 'image/png', type: 'Image', motivation: 'painting' },
  'gif': { format: 'image/gif', type: 'Image', motivation: 'painting' },
  'webp': { format: 'image/webp', type: 'Image', motivation: 'painting' },
  'tiff': { format: 'image/tiff', type: 'Image', motivation: 'painting' },
  'tif': { format: 'image/tiff', type: 'Image', motivation: 'painting' },
  'mp3': { format: 'audio/mpeg', type: 'Sound', motivation: 'painting' },
  'mp4': { format: 'video/mp4', type: 'Video', motivation: 'painting' },
  'webm': { format: 'video/webm', type: 'Video', motivation: 'painting' },
  'pdf': { format: 'application/pdf', type: 'Text', motivation: 'painting' },
};

const DEFAULT_DERIVATIVE_SIZES = [256, 512, 1024];
const THUMBNAIL_WIDTH = 256;

// ============================================================================
// Worker State
// ============================================================================

interface OperationState {
  operationId: string;
  startTime: number;
  cancelled: boolean;
  totalFiles: number;
  processedFiles: number;
  options: {
    generateThumbnails: boolean;
    extractMetadata: boolean;
    calculateHashes: boolean;
  };
}

const operations = new Map<string, OperationState>();

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(type: 'Manifest' | 'Collection' | 'Canvas', baseUrl: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${baseUrl}/${type.toLowerCase()}-${timestamp}-${random}`;
}

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function getMimeType(filename: string): { format: string; type: string; motivation: string } | undefined {
  const ext = getExtension(filename);
  return MIME_TYPE_MAP[ext];
}

// ============================================================================
// Core Processing Functions
// ============================================================================

/**
 * Calculate SHA-256 hash of a file
 */
async function calculateHash(data: Blob | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;

  if (data instanceof Blob) {
    buffer = await data.arrayBuffer();
  } else {
    buffer = data;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get image dimensions using createImageBitmap
 */
async function getImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    return { width, height };
  } catch (e) {
    return { width: 1000, height: 1000 }; // Fallback
  }
}

/**
 * Generate derivative/thumbnail using OffscreenCanvas
 */
async function generateDerivative(
  file: Blob,
  targetWidth: number
): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = bitmap.height / bitmap.width;
    const targetHeight = Math.floor(targetWidth * ratio);

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    return await canvas.convertToBlob({
      type: 'image/jpeg',
      quality: IMAGE_QUALITY.thumbnail
    });
  } catch (e) {
    return null;
  }
}

/**
 * Extract metadata from image files (simplified EXIF extraction)
 */
async function extractMetadata(file: File): Promise<Partial<IIIFItem>> {
  // In a real implementation, we'd use ExifReader
  // For the worker, we do basic extraction
  const metadata: Array<{ label: Record<string, string[]>; value: Record<string, string[]> }> = [];
  let navDate: string | undefined;

  // Basic file metadata
  metadata.push({
    label: { en: ['File Name'] },
    value: { en: [file.name] }
  });

  metadata.push({
    label: { en: ['File Size'] },
    value: { en: [`${Math.round(file.size / 1024)} KB`] }
  });

  metadata.push({
    label: { en: ['File Type'] },
    value: { en: [file.type || 'unknown'] }
  });

  return {
    navDate,
    metadata: metadata.length > 0 ? metadata : undefined
  };
}

/**
 * Process a single file and return canvas structure
 */
async function processFile(
  file: File,
  manifestId: string,
  canvasIndex: number,
  baseUrl: string,
  options: OperationState['options']
): Promise<{
  canvas: IIIFCanvas;
  assetId: string;
  thumbnailBlob: Blob | null;
  metadata: {
    width: number;
    height: number;
    hash?: string;
    extractedMeta: Partial<IIIFItem>;
  };
}> {
  const ext = getExtension(file.name);
  const mimeInfo = getMimeType(file.name);
  const canvasId = `${manifestId}/canvas/${canvasIndex}`;
  const assetId = `${manifestId.split('/').pop()}-${file.name.replace(/[^a-zA-Z0-9-_]/g, '')}`;

  // Get image dimensions
  let width = 1000;
  let height = 1000;
  let thumbnailBlob: Blob | null = null;

  if (file.type.startsWith('image/')) {
    const dims = await getImageDimensions(file);
    width = dims.width;
    height = dims.height;

    // Generate thumbnail
    if (options.generateThumbnails) {
      thumbnailBlob = await generateDerivative(file, THUMBNAIL_WIDTH);
    }
  }

  // Calculate hash if enabled
  let hash: string | undefined;
  if (options.calculateHashes) {
    hash = await calculateHash(file);
  }

  // Extract metadata
  const extractedMeta = options.extractMetadata ? await extractMetadata(file) : {};

  // Create IIIF structures
  const iiifType = mimeInfo?.type || 'Image';
  const isImage = iiifType === 'Image';

  const thumbnails = isImage && thumbnailBlob ? [{
    id: `${baseUrl}/image-service/${assetId}/full/${THUMBNAIL_WIDTH},/0/default.jpg`,
    type: "Image" as const,
    format: "image/jpeg",
    width: THUMBNAIL_WIDTH
  }] : undefined;

  const paintingAnnotation: IIIFAnnotation = {
    id: `${canvasId}/annotation/painting`,
    type: "Annotation",
    label: { none: ["Content Resource"] },
    motivation: "painting",
    target: canvasId,
    body: {
      id: `${baseUrl}/image-service/${assetId}/full/max/0/default.jpg`,
      type: iiifType as any,
      format: mimeInfo?.format || 'image/jpeg',
      service: isImage ? [{
        id: `${baseUrl}/image-service/${assetId}`,
        type: "ImageService3",
        profile: "level2"
      }] : undefined
    }
  };

  const canvas: IIIFCanvas = {
    id: canvasId,
    type: "Canvas",
    label: { none: [file.name] },
    width,
    height,
    items: [{
      id: `${canvasId}/page/painting`,
      type: "AnnotationPage",
      label: { none: ["Painting Page"] },
      items: [paintingAnnotation]
    }],
    thumbnail: thumbnails,
    navDate: extractedMeta.navDate,
    metadata: extractedMeta.metadata
  };

  return {
    canvas,
    assetId,
    thumbnailBlob,
    metadata: {
      width,
      height,
      hash,
      extractedMeta
    }
  };
}

/**
 * Process supplemental files (txt, srt, vtt)
 */
async function processSupplementalFiles(
  canvasId: string,
  assetId: string,
  supplemental: File[]
): Promise<IIIFAnnotationPage[]> {
  if (supplemental.length === 0) return [];

  const items: IIIFAnnotation[] = [];

  for (let i = 0; i < supplemental.length; i++) {
    const sf = supplemental[i];
    const textContent = await sf.text();
    const suppAssetId = `${assetId}-supp-${i}`;

    items.push({
      id: `${canvasId}/annotation/supp-${i}`,
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
    });
  }

  return [{
    id: `${canvasId}/page/supplementing`,
    type: "AnnotationPage",
    label: { none: ["Supplements"] },
    items
  }];
}

/**
 * Check if operation is cancelled
 */
function checkCancellation(operationId: string): void {
  const op = operations.get(operationId);
  if (op?.cancelled) {
    throw new Error('Ingest operation cancelled');
  }
}

// ============================================================================
// Node Processing
// ============================================================================

interface ProcessedNode {
  item: IIIFItem;
  files: Array<{
    file: File;
    assetId: string;
    thumbnailBlob: Blob | null;
  }>;
}

async function processNodeInternal(
  node: FileTree,
  baseUrl: string,
  operationId: string
): Promise<ProcessedNode> {
  checkCancellation(operationId);

  // Determine type
  const hasSubdirs = node.directories.size > 0;
  const mediaFiles = Array.from(node.files.keys()).filter(fn => {
    const ext = getExtension(fn);
    return !!MIME_TYPE_MAP[ext];
  });
  const isLeaf = !hasSubdirs && mediaFiles.length > 0;

  const type = isLeaf ? 'Manifest' : 'Collection';
  const id = generateId(type, baseUrl);

  // Parse metadata from info.yml if exists
  const label = { none: [node.name] };

  const files: Array<{
    file: File;
    assetId: string;
    thumbnailBlob: Blob | null;
  }> = [];

  if (type === 'Manifest') {
    const items: IIIFCanvas[] = [];

    // Smart Sidecar Detection
    const sidecars = new Map<string, { main: File; supplemental: File[] }>();

    // First pass: identify main content files
    for (const fn of mediaFiles) {
      const base = fn.substring(0, fn.lastIndexOf('.'));
      const mime = getMimeType(fn);

      if (mime && mime.motivation === 'painting') {
        if (!sidecars.has(base)) {
          sidecars.set(base, { main: node.files.get(fn)!, supplemental: [] });
        }
      }
    }

    // Second pass: link supplemental files
    for (const fn of node.files.keys()) {
      const ext = getExtension(fn);
      const base = fn.substring(0, fn.lastIndexOf('.'));

      if (ext === 'txt' || ext === 'srt' || ext === 'vtt') {
        const file = node.files.get(fn)!;
        if (sidecars.has(base)) {
          sidecars.get(base)!.supplemental.push(file);
        }
      }
    }

    // Process each main file
    const op = operations.get(operationId);
    const options = op?.options || {
      generateThumbnails: true,
      extractMetadata: true,
      calculateHashes: false
    };

    let canvasIndex = 0;
    for (const [base, { main, supplemental }] of sidecars) {
      checkCancellation(operationId);

      const fileId = `file-${canvasIndex}-${Date.now()}`;

      // Send progress update
      const progressMsg: IngestProgressMessage = {
        type: 'INGEST_PROGRESS',
        payload: {
          operationId,
          fileId,
          progress: {
            id: fileId,
            name: main.name,
            path: node.path ? `${node.path}/${main.name}` : main.name,
            size: main.size,
            mimeType: main.type,
            status: 'processing',
            progress: 50
          },
          stage: 'processing',
          overallProgress: Math.round((canvasIndex / sidecars.size) * 100)
        }
      };
      self.postMessage(progressMsg);

      // Process the file
      const result = await processFile(main, id, canvasIndex, baseUrl, options);

      // Process supplemental files
      const supplementingPages = await processSupplementalFiles(
        result.canvas.id,
        result.assetId,
        supplemental
      );

      if (supplementingPages.length > 0) {
        result.canvas.annotations = supplementingPages;
      }

      items.push(result.canvas);

      // Store file info for main thread
      files.push({
        file: main,
        assetId: result.assetId,
        thumbnailBlob: result.thumbnailBlob
      });

      // Send file complete message
      const completeMsg: IngestFileCompleteMessage = {
        type: 'INGEST_FILE_COMPLETE',
        payload: {
          operationId,
          fileId,
          canvas: result.canvas,
          assetId: result.assetId,
          thumbnailBlob: result.thumbnailBlob || undefined,
          metadata: result.metadata
        }
      };
      self.postMessage(completeMsg);

      // Update operation state
      if (op) {
        op.processedFiles++;
      }

      canvasIndex++;
    }

    const manifest: IIIFManifest = {
      "@context": "http://iiif.io/api/presentation/3/context.json",
      id,
      type: "Manifest",
      label,
      items,
      behavior: ["individuals"],
      viewingDirection: "left-to-right"
    };

    return { item: manifest, files };
  } else {
    // Collection - process subdirectories
    const items: IIIFItem[] = [];

    // Handle loose files at collection level
    if (mediaFiles.length > 0) {
      const looseFilesNode: FileTree = {
        name: `${node.name} - loose files`,
        path: node.path,
        files: new Map(Array.from(node.files.entries()).filter(([fn]) => {
          const ext = getExtension(fn);
          return !!MIME_TYPE_MAP[ext];
        })),
        directories: new Map(),
        iiifIntent: 'Manifest'
      };
      const looseResult = await processNodeInternal(looseFilesNode, baseUrl, operationId);
      items.push(looseResult.item);
      files.push(...looseResult.files);
    }

    // Process subdirectories
    for (const [name, dir] of node.directories) {
      if (name.startsWith('+') || name.startsWith('!')) continue;

      const childResult = await processNodeInternal(dir, baseUrl, operationId);
      items.push(childResult.item);
      files.push(...childResult.files);
    }

    const collection: IIIFCollection = {
      "@context": "http://iiif.io/api/presentation/3/context.json",
      id,
      type: "Collection",
      label,
      items
    };

    return { item: collection, files };
  }
}

// ============================================================================
// Message Handlers
// ============================================================================

self.onmessage = async (event: MessageEvent<IngestWorkerRequest>) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'INIT_INGEST': {
      const { operationId, totalFiles, options = {} } = payload;

      operations.set(operationId, {
        operationId,
        startTime: Date.now(),
        cancelled: false,
        totalFiles,
        processedFiles: 0,
        options: {
          generateThumbnails: options.generateThumbnails !== false,
          extractMetadata: options.extractMetadata !== false,
          calculateHashes: options.calculateHashes === true
        }
      });

      // Send initialization confirmation
      self.postMessage({
        type: 'INGEST_INITIALIZED',
        payload: { operationId }
      });

      break;
    }

    case 'PROCESS_FILE': {
      const { operationId, file, fileId, manifestId, canvasIndex, supplementalFiles = [] } = payload;

      try {
        checkCancellation(operationId);

        const op = operations.get(operationId);
        if (!op) {
          throw new Error(`Operation ${operationId} not found`);
        }

        // Send progress update
        const progressMsg: IngestProgressMessage = {
          type: 'INGEST_PROGRESS',
          payload: {
            operationId,
            fileId,
            progress: {
              id: fileId,
              name: file.name,
              path: payload.nodePath ? `${payload.nodePath}/${file.name}` : file.name,
              size: file.size,
              mimeType: file.type,
              status: 'processing',
              progress: 25
            },
            stage: 'processing',
            overallProgress: Math.round((op.processedFiles / op.totalFiles) * 100)
          }
        };
        self.postMessage(progressMsg);

        // Process file
        const result = await processFile(file, manifestId, canvasIndex, payload.baseUrl || '', op.options);

        // Process supplemental files
        const supplementingPages = await processSupplementalFiles(
          result.canvas.id,
          result.assetId,
          supplementalFiles
        );

        if (supplementingPages.length > 0) {
          result.canvas.annotations = supplementingPages;
        }

        op.processedFiles++;

        // Send complete message
        const completeMsg: IngestFileCompleteMessage = {
          type: 'INGEST_FILE_COMPLETE',
          payload: {
            operationId,
            fileId,
            canvas: result.canvas,
            assetId: result.assetId,
            thumbnailBlob: result.thumbnailBlob || undefined,
            metadata: result.metadata
          }
        };
        self.postMessage(completeMsg);

      } catch (error) {
        const errorMsg: IngestErrorMessage = {
          type: 'INGEST_ERROR',
          payload: {
            operationId,
            fileId,
            error: error instanceof Error ? error.message : String(error),
            stage: 'processing',
            recoverable: true
          }
        };
        self.postMessage(errorMsg);
      }

      break;
    }

    case 'PROCESS_NODE': {
      const { operationId, node, baseUrl } = payload;

      try {
        checkCancellation(operationId);

        const op = operations.get(operationId);
        if (!op) {
          throw new Error(`Operation ${operationId} not found`);
        }

        const result = await processNodeInternal(node, baseUrl, operationId);

        // Send node complete message
        const nodeCompleteMsg: IngestNodeCompleteMessage = {
          type: 'INGEST_NODE_COMPLETE',
          payload: {
            operationId,
            nodeId: node.name,
            item: result.item
          }
        };
        self.postMessage(nodeCompleteMsg);

        // Send final complete message
        const completeMsg: IngestCompleteMessage = {
          type: 'INGEST_COMPLETE',
          payload: {
            operationId,
            root: result.item,
            stats: {
              manifestsCreated: result.item.type === 'Manifest' ? 1 : 0,
              collectionsCreated: result.item.type === 'Collection' ? 1 : 0,
              canvasesCreated: result.files.length,
              filesProcessed: result.files.length,
              durationMs: Date.now() - op.startTime
            }
          }
        };
        self.postMessage(completeMsg);

        // Clean up operation
        operations.delete(operationId);

      } catch (error) {
        const errorMsg: IngestErrorMessage = {
          type: 'INGEST_ERROR',
          payload: {
            operationId,
            error: error instanceof Error ? error.message : String(error),
            stage: 'node_processing',
            recoverable: false
          }
        };
        self.postMessage(errorMsg);
      }

      break;
    }

    case 'CANCEL_INGEST': {
      const { operationId } = payload;
      const op = operations.get(operationId);
      if (op) {
        op.cancelled = true;
      }
      break;
    }
  }
};

// Export for TypeScript
export {};
