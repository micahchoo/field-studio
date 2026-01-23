
import JSZip from 'jszip';
import { IIIFItem, IIIFCollection, IIIFManifest, IIIFCanvas, IIIFAnnotation } from '../types';
import { validator } from './validator';

export interface ExportOptions {
    includeAssets: boolean;
    format: 'static-site' | 'raw-iiif';
    ignoreErrors?: boolean;
}

export interface ExportProgress {
    status: string;
    percent: number;
}

export interface VirtualFile {
    path: string;
    content: string | Blob;
    type: 'json' | 'html' | 'asset' | 'info';
}

class ExportService {
    
    /**
     * Synthesizes the final archive structure without compressing it.
     * Used for Dry Runs.
     */
    async prepareExport(root: IIIFItem, options: ExportOptions): Promise<VirtualFile[]> {
        const virtualFiles: VirtualFile[] = [];
        const processedRoot = JSON.parse(JSON.stringify(root)); 
        
        const processItem = (item: IIIFItem, originalItem: IIIFItem) => {
            const originalId = item.id;
            let idVal = originalId.split('/').pop() || 'unknown';
            let typeDir = item.type.toLowerCase();
            
            if (item.items) {
                item.items.forEach((child, idx) => {
                    if (child.type === 'Collection' || child.type === 'Manifest') {
                        const childIdVal = child.id.split('/').pop();
                        const childType = child.type.toLowerCase();
                        child.id = `../${childType}/${childIdVal}.json`;
                    } else if (child.type === 'Canvas') {
                        const origCanvas = (originalItem as any).items?.[idx] as IIIFCanvas;
                        if (origCanvas && origCanvas._fileRef && options.includeAssets) {
                            const filename = origCanvas._fileRef.name;
                            const assetPath = `assets/${filename}`;
                            virtualFiles.push({
                                path: assetPath,
                                content: origCanvas._fileRef,
                                type: 'asset'
                            });
                            
                            // Update painting annotation body
                            const painting = child.items?.[0]?.items?.[0] as unknown as IIIFAnnotation;
                            if (painting && painting.body && !Array.isArray(painting.body)) {
                                (painting.body as any).id = `../../${assetPath}`;
                            }
                        }
                    }
                });
            }

            virtualFiles.push({
                path: `iiif/${typeDir}/${idVal}.json`,
                content: JSON.stringify(item, null, 2),
                type: 'json'
            });
            
            if (originalItem.items) {
                originalItem.items.forEach((origChild, idx) => {
                    if (origChild.type === 'Collection' || origChild.type === 'Manifest') {
                         processItem(item.items![idx], origChild);
                    }
                });
            }
        };

        processItem(processedRoot, root);

        if (options.format === 'static-site') {
            virtualFiles.push({
                path: 'index.html',
                content: this.generateIndexHtml(root),
                type: 'html'
            });
        }

        return virtualFiles;
    }

    async exportArchive(root: IIIFItem, options: ExportOptions, onProgress: (p: ExportProgress) => void): Promise<Blob> {
        // 1. Validate
        if (!options.ignoreErrors) {
            onProgress({ status: 'Airtight Validation...', percent: 5 });
            const issueMap = validator.validateTree(root);
            const hasErrors = Object.values(issueMap).some(list => list.some(i => i.level === 'error'));
            if (hasErrors) {
                throw new Error("Archive Integrity Failed. Resolve critical errors in Dry Run or use 'Ignore Errors' mode.");
            }
        }

        // 2. Synthesize
        onProgress({ status: 'Synthesizing structure...', percent: 20 });
        const files = await this.prepareExport(root, options);

        // 3. Compress
        const zip = new JSZip();
        files.forEach(f => zip.file(f.path, f.content));

        const blob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
            onProgress({ status: 'Compressing archive...', percent: 30 + (metadata.percent * 0.7) });
        });
        
        onProgress({ status: 'Export Complete', percent: 100 });
        return blob;
    }

    private generateIndexHtml(root: IIIFItem): string {
        const rootIdVal = root.id.split('/').pop();
        const rootType = root.type.toLowerCase();
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${root.label?.none?.[0] || 'IIIF Export'}</title>
    <style>
        body { font-family: sans-serif; background: #f1f5f9; color: #1e293b; line-height: 1.6; padding: 40px; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        h1 { color: #005596; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .badge { background: #005596; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .files { background: #f8fafc; padding: 20px; border-radius: 8px; font-family: monospace; border: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <div class="container">
        <span class="badge">IIIF Presentation v3.0</span>
        <h1>${root.label?.none?.[0] || 'Archive Export'}</h1>
        <p>This is a standalone IIIF Archive package generated by IIIF Field Studio.</p>
        <h3>Entry Point</h3>
        <div class="files">
            <a href="iiif/${rootType}/${rootIdVal}.json">iiif/${rootType}/${rootIdVal}.json</a>
        </div>
        <p>To view this archive, point a IIIF-compliant viewer (like Mirador or Universal Viewer) to the entry point above.</p>
    </div>
</body>
</html>`;
    }
}

export const exportService = new ExportService();
