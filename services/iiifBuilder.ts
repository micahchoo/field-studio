
import { FileTree, IIIFCollection, IIIFManifest, IIIFCanvas, IIIFItem, IngestReport, IngestResult, IIIFAnnotationPage, IIIFAnnotation, IIIFMotivation, IIIFRange } from '../types';
import { storage } from './storage';
import { DEFAULT_INGEST_PREFS, MIME_TYPE_MAP } from '../constants';
import { load } from 'js-yaml';
import { extractMetadata } from './metadataHarvester';
import { getTileWorkerPool, generateDerivativeAsync } from './tileWorker';
import { fileIntegrity, HashLookupResult } from './fileIntegrity';
import {
  isValidChildType,
  getRelationshipType,
  isStandaloneType
} from '../utils/iiifHierarchy';
import {
  getMimeType,
  getContentTypeFromFilename,
  isImageMime,
  isTimeBasedMime,
  suggestBehaviors,
  validateResource,
  DEFAULT_VIEWING_DIRECTION,
  createImageServiceReference,
  IMAGE_API_PROTOCOL
} from '../utils';

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

      // Save each derivative to storage
      for (const [size, blob] of result.derivatives) {
        const sizeKey = size === 150 ? 'thumb' : size === 600 ? 'small' : 'medium';
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
        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
    } catch (e) {
        return null;
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
      const isExplicitCollection = node.name === 'root' || node.name.startsWith('_');

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
    if (node.files.has('info.yml')) {
        try {
            const text = await node.files.get('info.yml')!.text();
            ymlMeta = load(text) || {};
        } catch (e) { report.warnings.push(`Invalid info.yml in ${node.path}`); }
    }

    let cleanName = node.name.startsWith('_') ? node.name.substring(1) : node.name;
    if (cleanName === 'root') cleanName = 'My Archive';

    const uuid = typeof crypto.randomUUID === 'function' 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const id = `${baseUrl}/${type.toLowerCase()}/${uuid}`;
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

            const canvasId = `${id}/canvas/${items.length + 1}`;
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

            if (file.type.startsWith('image/')) {
                // Generate thumbnail immediately for UI display
                const thumb = await generateDerivative(file, 150);
                if (thumb) await storage.saveDerivative(assetId, 'thumb', thumb);

                // Queue larger derivatives for background generation
                tileGenerationQueue.push({
                    assetId,
                    file,
                    sizes: [600, 1200] // Pre-generate medium sizes in background
                });
            }

            const extractedMeta = await extractMetadata(file);
            const iiifType = MIME_TYPE_MAP[ext]?.type || 'Image';
            const isImage = iiifType === 'Image';

            const thumbnails = isImage ? [
                {
                    id: `${baseUrl}/image/${assetId}/full/150,/0/default.jpg`,
                    type: "Image" as const,
                    format: "image/jpeg",
                    width: 150
                }
            ] : undefined;

            const paintingAnnotation: IIIFAnnotation = {
                id: `${canvasId}/annotation/painting`,
                type: "Annotation",
                label: { none: ["Content Resource"] }, 
                motivation: "painting",
                target: canvasId,
                body: {
                    id: `${baseUrl}/image/${assetId}/full/max/0/default.jpg`,
                    type: iiifType as any,
                    format: MIME_TYPE_MAP[ext]?.format || 'image/jpeg',
                    // Use centralized Image API service reference
                    service: isImage ? [
                        createImageServiceReference(`${baseUrl}/image/${assetId}`, 'level2')
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

            items.push({
                id: canvasId,
                type: "Canvas",
                label: { none: [file.name] },
                width: 2000, height: 2000,
                items: annos,
                annotations: supplementingPages, // Canvas.annotations for non-painting content
                thumbnail: thumbnails,
                navDate: extractedMeta.navDate,
                metadata: extractedMeta.metadata,
                _fileRef: file
            });
            report.canvasesCreated++;
            report.filesProcessed++;
        }

        report.manifestsCreated++;
        const manifest: IIIFManifest = {
            "@context": "http://iiif.io/api/presentation/3/context.json",
            id, type: "Manifest", label, items,
            behavior: node.iiifBehavior || ["individuals"],
            viewingDirection: (node as any).viewingDirection || "left-to-right",
            service: [{
                id: `${baseUrl}/search/${id.split('/').pop()}`,
                type: "SearchService2",
                profile: "http://iiif.io/api/search/2/search",
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
                name: `${cleanName} - Files`,
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
            "@context": "http://iiif.io/api/presentation/3/context.json",
            id, type: "Collection", label, items
        };
        return collection;
    }
};

export const ingestTree = async (
    tree: FileTree, 
    existingRoot: IIIFItem | null = null,
    onProgress?: (msg: string, percent: number) => void
): Promise<IngestResult> => {
    const report: IngestReport = { manifestsCreated: 0, collectionsCreated: 0, canvasesCreated: 0, filesProcessed: 0, warnings: [] };
    
    // Use the captures baseUrl from the tree if provided, else fallback to current origin.
    let baseUrl = tree.iiifBaseUrl;
    if (!baseUrl) {
      baseUrl = `${window.location.origin}/iiif`;
    } else {
      // Clean up potential trailing slash to keep path construction predictable
      baseUrl = baseUrl.replace(/\/$/, '');
    }
    
    const newRoot = await processNode(tree, baseUrl, report, onProgress);

    if (existingRoot && existingRoot.type === 'Collection') {
        const rootClone = JSON.parse(JSON.stringify(existingRoot)) as IIIFCollection;
        if (!rootClone.items) rootClone.items = [];

        if (newRoot.type === 'Collection' && tree.name === 'root') {
            // When importing a root collection, merge its items using IIIF hierarchy rules
            const newItems = (newRoot as IIIFCollection).items || [];
            for (const item of newItems) {
                // Validate each item can be added to a Collection
                if (isValidChildType('Collection', item.type)) {
                    const relationship = getRelationshipType('Collection', item.type);
                    console.log(`Adding ${item.type} to Collection with ${relationship} relationship`);
                    rootClone.items.push(item);
                } else {
                    report.warnings.push(`Skipped ${item.type} - not valid child of Collection`);
                }
            }
        } else {
            // Validate the new root can be added to existing Collection
            if (isValidChildType('Collection', newRoot.type)) {
                const relationship = getRelationshipType('Collection', newRoot.type);
                console.log(`Adding ${newRoot.type} to existing Collection with ${relationship} relationship`);
                rootClone.items.push(newRoot);
            } else {
                report.warnings.push(`Cannot add ${newRoot.type} to existing Collection - invalid child type`);
            }
        }
        await storage.saveProject(rootClone);

        // Start background tile pre-generation (non-blocking)
        if (tileGenerationQueue.length > 0) {
            report.warnings.push(`Background tile generation queued for ${tileGenerationQueue.length} images`);
            processTileQueue(onProgress).catch(e =>
                console.warn('Background tile generation error:', e)
            );
        }

        return { root: rootClone, report };
    } else {
        await storage.saveProject(newRoot);

        // Start background tile pre-generation (non-blocking)
        if (tileGenerationQueue.length > 0) {
            report.warnings.push(`Background tile generation queued for ${tileGenerationQueue.length} images`);
            processTileQueue(onProgress).catch(e =>
                console.warn('Background tile generation error:', e)
            );
        }

        return { root: newRoot, report };
    }
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
