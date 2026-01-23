
import { FileTree, IIIFCollection, IIIFManifest, IIIFCanvas, IIIFItem, IngestReport, IngestResult, IIIFAnnotationPage, IIIFAnnotation, IIIFMotivation, IIIFRange } from '../types';
import { storage } from './storage';
import { DEFAULT_INGEST_PREFS, MIME_TYPE_MAP } from '../constants';
import { load } from 'js-yaml';
import { extractMetadata } from './metadataHarvester';

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
    let type: 'Collection' | 'Manifest' = 'Manifest';
    if (node.iiifIntent) {
      type = node.iiifIntent as any;
    } else {
      if (node.name === 'root' || node.name.startsWith('_') || (node.directories.size > 0 && node.files.size === 0)) {
        type = 'Collection';
      } else {
        type = 'Manifest';
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

    const id = `${baseUrl}/${type.toLowerCase()}/${crypto.randomUUID()}`;
    const lang = ymlMeta.language || 'none';
    const label = ymlMeta.label ? { [lang]: [ymlMeta.label] } : { none: [cleanName] };

    if (type === 'Manifest') {
        const items: IIIFCanvas[] = [];
        const fileNames = Array.from(node.files.keys()).sort();
        
        // Smart Sidecar Detection: Map of base filename to related files
        const sidecars = new Map<string, { main: File, supplemental: File[] }>();
        fileNames.forEach(fn => {
            const parts = fn.split('.');
            const ext = parts.pop()?.toLowerCase() || '';
            const base = parts.join('.');
            const mime = MIME_TYPE_MAP[ext];
            
            if (mime && mime.motivation === 'painting') {
                if (!sidecars.has(base)) sidecars.set(base, { main: node.files.get(fn)!, supplemental: [] });
            } else if (ext === 'txt' || ext === 'srt') {
                if (!sidecars.has(base)) {
                  // Might be a standalone text file, handle later or skip
                } else {
                  sidecars.get(base)!.supplemental.push(node.files.get(fn)!);
                }
            }
        });

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
            
            await storage.saveAsset(file, assetId);
            
            if (file.type.startsWith('image/')) {
                const thumb = await generateDerivative(file, 150);
                if (thumb) await storage.saveDerivative(assetId, 'thumb', thumb);
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
                    service: isImage ? [{
                        id: `${baseUrl}/image/${assetId}`,
                        type: "ImageService3",
                        profile: "level2"
                    }] : undefined
                }
            };

            // Handle Smart Sidecars as supplementing annotations
            const annos: IIIFAnnotationPage[] = [{ 
                id: `${canvasId}/page/painting`, 
                type: "AnnotationPage", 
                label: { none: ["Painting Page"] },
                items: [paintingAnnotation] 
            }];

            if (supplemental.length > 0) {
                const suppPage: IIIFAnnotationPage = {
                    id: `${canvasId}/page/supplementing`,
                    type: "AnnotationPage",
                    label: { none: ["Supplements"] },
                    items: await Promise.all(supplemental.map(async (sf, sIdx) => ({
                        id: `${canvasId}/annotation/supp-${sIdx}`,
                        type: "Annotation",
                        motivation: "supplementing",
                        label: { none: [sf.name] },
                        body: {
                            type: "TextualBody",
                            value: await sf.text(),
                            format: sf.name.endsWith('.srt') ? 'text/vtt' : 'text/plain'
                        },
                        target: canvasId
                    })))
                };
                // In IIIF, painting goes in .items, others go in .annotations usually, 
                // but we'll stick them in an extra page for now or reference them.
                // Spec says Canvas.annotations is for non-painting.
            }

            items.push({
                id: canvasId,
                type: "Canvas",
                label: { none: [file.name] },
                width: 2000, height: 2000,
                items: annos,
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
        const items: IIIFItem[] = [];
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
            rootClone.items.push(...(newRoot as IIIFCollection).items);
        } else {
            rootClone.items.push(newRoot);
        }
        await storage.saveProject(rootClone);
        return { root: rootClone, report };
    } else {
        await storage.saveProject(newRoot);
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
