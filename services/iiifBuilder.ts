
import { FileTree, IIIFCollection, IIIFManifest, IIIFCanvas, IIIFItem, IngestReport, IngestResult, IIIFAnnotationPage, IIIFAnnotation, IIIFMotivation, IIIFRange } from '../types';
import { storage } from './storage';
import { DEFAULT_INGEST_PREFS, MIME_TYPE_MAP } from '../constants';
import { load } from 'js-yaml';
import { extractMetadata } from './metadataHarvester';

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
            current.directories.set(part, { 
              name: part, 
              path: current.path ? `${current.path}/${part}` : part, 
              files: new Map(), 
              directories: new Map() 
            });
        }
        current = current.directories.get(part)!;
    }
    current.files.set(parts[parts.length - 1], file);
  }
  return root;
};

const isConventionCollection = (name: string) => name.startsWith('_');

const getMimeType = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (MIME_TYPE_MAP[ext]) return MIME_TYPE_MAP[ext].format;
    return file.type || 'application/octet-stream';
};

const getIIIFType = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (MIME_TYPE_MAP[ext]) return MIME_TYPE_MAP[ext].type;
    return file.type.startsWith('image/') ? 'Image' : 
           file.type.startsWith('video/') ? 'Video' : 
           file.type.startsWith('audio/') ? 'Sound' : 'Dataset';
};

const validateDirectoryStructure = (node: FileTree, report: IngestReport) => {
    const dirNames = Array.from(node.directories.keys());
    const underscoreDirs = dirNames.filter(n => n.startsWith('_'));
    const normalDirs = dirNames.filter(n => !n.startsWith('_') && !n.startsWith('+') && !n.startsWith('!'));
    
    if (underscoreDirs.length > 0 && normalDirs.length > 0) {
        report.warnings.push(`Structure Warning: ${node.path || 'root'} contains mixed sibling types (underscore prefixed and standard). This is discouraged by convention.`);
    }
};

const extractExistingLabels = (item: IIIFItem): Set<string> => {
    const labels = new Set<string>();
    const traverse = (node: IIIFItem) => {
        const label = node.label?.['none']?.[0] || node.label?.['en']?.[0];
        if (label) labels.add(label);
        if (node.items) {
            node.items.forEach(traverse);
        }
    };
    traverse(item);
    return labels;
};

const getUniqueLabel = (baseLabel: string, reservedLabels: Set<string>): string => {
    if (!reservedLabels.has(baseLabel)) return baseLabel;
    
    let counter = 1;
    let newLabel = baseLabel;
    if (baseLabel.indexOf('.') === -1) {
         newLabel = `${baseLabel} (${counter})`;
    } else {
         newLabel = `${baseLabel.replace(/\.[^/.]+$/, "")} (${counter})${baseLabel.substring(baseLabel.lastIndexOf('.'))}`;
    }
    while (reservedLabels.has(newLabel)) {
        counter++;
         if (baseLabel.indexOf('.') === -1) {
            newLabel = `${baseLabel} (${counter})`;
        } else {
             newLabel = `${baseLabel.replace(/\.[^/.]+$/, "")} (${counter})${baseLabel.substring(baseLabel.lastIndexOf('.'))}`;
        }
    }
    return newLabel;
};

// Helper to group files by basename for sidecar detection
const groupFilesByBasename = (files: Map<string, File>): Map<string, File[]> => {
    const groups = new Map<string, File[]>();
    for (const [name, file] of files) {
        if (name === 'info.yml' || name === 'manifests.yml') continue;
        const extIndex = name.lastIndexOf('.');
        const basename = extIndex > -1 ? name.substring(0, extIndex) : name;
        
        if (!groups.has(basename)) groups.set(basename, []);
        groups.get(basename)!.push(file);
    }
    return groups;
};

const processNode = async (node: FileTree, baseUrl: string, report: IngestReport, reservedLabels: Set<string>): Promise<IIIFItem> => {
    validateDirectoryStructure(node, report);

    let type: 'Collection' | 'Manifest' = 'Manifest';
    if (node.iiifIntent) {
      type = node.iiifIntent as any;
    } else {
      if (node.name === 'root' || isConventionCollection(node.name) || (node.directories.size > 0 && node.files.size === 0)) {
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
        } catch (e) {
            report.warnings.push(`Invalid info.yml in ${node.path}`);
        }
    }

    let cleanName = node.name.startsWith('_') ? node.name.substring(1) : node.name;
    if (cleanName === 'root') cleanName = 'My Archive';

    const id = `${baseUrl}/${type.toLowerCase()}/${crypto.randomUUID()}`;
    const lang = ymlMeta.language || 'none';
    const label = ymlMeta.label ? { [lang]: [ymlMeta.label] } : { none: [cleanName] };
    const summary = ymlMeta.summary ? { [lang]: [ymlMeta.summary] } : undefined;

    // Optional Properties
    const provider = ymlMeta.provider; 
    const homepage = ymlMeta.homepage;
    const requiredStatement = ymlMeta.requiredStatement;
    const behavior = ymlMeta.behavior ? (Array.isArray(ymlMeta.behavior) ? ymlMeta.behavior : [ymlMeta.behavior]) : undefined;
    const viewingDirection = ymlMeta.viewingDirection;

    if (type === 'Manifest') {
        const items: IIIFCanvas[] = [];
        const fileGroups = groupFilesByBasename(node.files);
        
        // Sort groups by basename for consistent ordering
        const sortedBasenames = Array.from(fileGroups.keys()).sort((a, b) => a.localeCompare(b));

        for (const basename of sortedBasenames) {
            const group = fileGroups.get(basename)!;
            
            // 1. Identify Primary Asset (Priority: Image > Video > Sound > Dataset)
            // 2. Identify Sidecars (Text, VTT, SRT, etc.)
            
            let primaryFile: File | null = null;
            const sidecars: File[] = [];

            // Simple heuristic: find first painting-compatible type
            const paintingCandidates = group.filter(f => {
                const type = getIIIFType(f);
                return ['Image', 'Video', 'Sound'].includes(type);
            });

            if (paintingCandidates.length === 0) {
                continue;
            }

            // Prefer JPG/PNG/MP4/MP3 as primary
            primaryFile = paintingCandidates.find(f => /\.(jpg|jpeg|png|webp|mp4|mp3)$/i.test(f.name)) || paintingCandidates[0];
            
            for (const f of group) {
                if (f === primaryFile) continue;
                sidecars.push(f);
            }

            if (!primaryFile) continue;

            // Check size limit
            if (primaryFile.size > DEFAULT_INGEST_PREFS.maxFileSize) {
                report.warnings.push(`Skipped ${primaryFile.name}: Exceeds max file size.`);
                continue;
            }

            // Naming
            let name = basename;
            if (reservedLabels.has(name)) {
                name = getUniqueLabel(basename, reservedLabels);
            }
            reservedLabels.add(name);

            const canvasId = `${id}/canvas/${items.length + 1}`;
            const assetId = `${id.split('/').pop()}-${name.replace(/[^a-zA-Z0-9-_]/g, '')}`;
            
            // Save Primary Asset
            await storage.saveAsset(primaryFile, assetId);
            
            // EXTRACT METADATA (EXIF)
            const extractedMeta = await extractMetadata(primaryFile);

            const mimeType = getMimeType(primaryFile);
            const iiifType = getIIIFType(primaryFile);
            const isImage = iiifType === 'Image';

            const body: any = {
                id: `https://archive.local/iiif/image/${assetId}/full/max/0/default.${isImage ? 'jpg' : 'mp4'}`,
                type: iiifType,
                format: mimeType,
                width: isImage ? DEFAULT_INGEST_PREFS.defaultCanvasWidth : undefined,
                height: isImage ? DEFAULT_INGEST_PREFS.defaultCanvasHeight : undefined,
                duration: iiifType === 'Sound' || iiifType === 'Video' ? DEFAULT_INGEST_PREFS.defaultDuration : undefined
            };

            if (isImage) {
                body.service = [{
                    id: `https://archive.local/iiif/image/${assetId}`,
                    type: "ImageService3",
                    profile: "level2"
                }];
            }

            const paintingAnnotation: IIIFAnnotation = {
                id: `${canvasId}/annotation/1`,
                type: "Annotation",
                motivation: "painting",
                target: canvasId,
                body: body
            };

            const paintingPage: IIIFAnnotationPage = {
                id: `${canvasId}/page/1`,
                type: "AnnotationPage",
                items: [paintingAnnotation]
            };

            // Process Sidecars (Supplementing Annotations)
            const canvasAnnotations: IIIFAnnotation[] = [];
            for (let i = 0; i < sidecars.length; i++) {
                const sidecar = sidecars[i];
                const scType = getIIIFType(sidecar);

                if (scType === 'Dataset' || /\.(txt|vtt|srt|xml|json|md)$/i.test(sidecar.name)) {
                    const scAssetId = `${assetId}-sc-${i}`;
                    await storage.saveAsset(sidecar, scAssetId);
                    
                    let format = getMimeType(sidecar);
                    let motivation: IIIFMotivation = 'supplementing';
                    
                    const scBody: any = {
                        id: `https://archive.local/iiif/file/${scAssetId}/${sidecar.name}`,
                        type: 'Text', // Or Dataset
                        format: format,
                        label: { none: [sidecar.name] }
                    };

                    if (sidecar.size < 10000 && format.startsWith('text/')) {
                         try {
                             const text = await sidecar.text();
                             scBody.type = 'TextualBody';
                             scBody.value = text;
                             delete scBody.id;
                         } catch(e) {}
                    }

                    canvasAnnotations.push({
                        id: `${canvasId}/annotation/sup/${i}`,
                        type: "Annotation",
                        motivation: motivation,
                        target: canvasId,
                        body: scBody
                    });
                }
            }
            
            items.push({
                id: canvasId,
                type: "Canvas",
                label: { none: [name] },
                width: DEFAULT_INGEST_PREFS.defaultCanvasWidth,
                height: DEFAULT_INGEST_PREFS.defaultCanvasHeight,
                items: [paintingPage],
                annotations: canvasAnnotations.length ? [{id: `${canvasId}/page/2`, type: "AnnotationPage", items: canvasAnnotations}] : undefined,
                navDate: extractedMeta.navDate,
                metadata: extractedMeta.metadata,
                _fileRef: primaryFile 
            });
            report.canvasesCreated++;
            report.filesProcessed += (1 + sidecars.length);
        }

        const manifest: any = {
            "@context": "http://iiif.io/api/presentation/3/context.json",
            id,
            type: "Manifest",
            label,
            summary,
            items,
            behavior,
            viewingDirection,
            provider, homepage, requiredStatement,
            service: [
                {
                    id: `https://archive.local/iiif/search/${id.split('/').pop()}`,
                    type: "SearchService2",
                    profile: "http://iiif.io/api/search/2/search",
                    label: "Content Search Service"
                }
            ]
        };
        report.manifestsCreated++;
        return manifest as IIIFManifest;
    } else {
        const items: IIIFItem[] = [];
        for (const [name, dir] of node.directories.entries()) {
            if (name.startsWith('+') || name.startsWith('!')) continue; 
            items.push(await processNode(dir, baseUrl, report, reservedLabels));
        }
        
        const collection: IIIFCollection = {
            "@context": "http://iiif.io/api/presentation/3/context.json",
            id,
            type: "Collection",
            label,
            items
        };
        report.collectionsCreated++;
        return collection;
    }
};

export const ingestTree = async (tree: FileTree, existingRoot: IIIFItem | null = null): Promise<IngestResult> => {
    const report: IngestReport = { manifestsCreated: 0, collectionsCreated: 0, canvasesCreated: 0, filesProcessed: 0, warnings: [] };
    const reservedLabels = existingRoot ? extractExistingLabels(existingRoot) : new Set<string>();
    const newRoot = await processNode(tree, 'https://archive.local/iiif', report, reservedLabels);

    if (existingRoot && existingRoot.type === 'Collection') {
        if (!existingRoot.items) existingRoot.items = [];
        if (newRoot.type === 'Collection' && (tree.name === 'root' || tree.name === '')) {
            existingRoot.items.push(...(newRoot as IIIFCollection).items);
        } else {
            existingRoot.items.push(newRoot);
        }
        await storage.saveProject(existingRoot);
        return { root: existingRoot, report };
    } else {
        await storage.clear();
        await storage.saveProject(newRoot);
        return { root: newRoot, report };
    }
};
