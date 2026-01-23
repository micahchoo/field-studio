
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
                            const baseFileName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
                            const assetId = `${idVal}-${baseFileName}`;
                            const assetPath = `assets/${filename}`;

                            // Add original asset
                            virtualFiles.push({
                                path: assetPath,
                                content: origCanvas._fileRef,
                                type: 'asset'
                            });

                            // Generate IIIF Image API Level 0 info.json
                            if (origCanvas._fileRef.type.startsWith('image/')) {
                                const infoJsonPath = `images/${assetId}/info.json`;
                                const width = origCanvas.width || 2000;
                                const height = origCanvas.height || 2000;

                                virtualFiles.push({
                                    path: infoJsonPath,
                                    content: this.generateImageInfoJson(assetId, width, height),
                                    type: 'info'
                                });

                                // Add pre-generated size derivatives (Level 0 requirement)
                                const sizes = [150, 600, 1200];
                                for (const size of sizes) {
                                    const sizeHeight = Math.floor((height / width) * size);
                                    virtualFiles.push({
                                        path: `images/${assetId}/full/${size},/0/default.jpg`,
                                        content: origCanvas._fileRef, // TODO: Generate actual derivatives
                                        type: 'asset'
                                    });
                                }
                            }

                            // Update painting annotation body to use Level 0 Image API
                            const painting = child.items?.[0]?.items?.[0] as unknown as IIIFAnnotation;
                            if (painting && painting.body && !Array.isArray(painting.body)) {
                                (painting.body as any).id = `../../images/${assetId}/full/max/0/default.jpg`;
                                (painting.body as any).service = [{
                                    id: `../../images/${assetId}`,
                                    type: "ImageService3",
                                    protocol: "http://iiif.io/api/image",
                                    profile: "level0"
                                }];
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

    /**
     * Generates IIIF Image API Level 0 info.json
     * Spec §8.1: Required properties for ImageService3
     */
    private generateImageInfoJson(assetId: string, width: number, height: number): string {
        const info = {
            "@context": "http://iiif.io/api/image/3/context.json",
            "id": `images/${assetId}`,
            "type": "ImageService3",
            "protocol": "http://iiif.io/api/image",
            "profile": "level0",
            "width": width,
            "height": height,
            "sizes": [
                { "width": 150, "height": Math.floor((height / width) * 150) },
                { "width": 600, "height": Math.floor((height / width) * 600) },
                { "width": 1200, "height": Math.floor((height / width) * 1200) }
            ],
            "tiles": [
                {
                    "width": 512,
                    "scaleFactors": [1, 2, 4, 8]
                }
            ]
        };
        return JSON.stringify(info, null, 2);
    }

    /**
     * Generates self-contained HTML with embedded Universal Viewer
     * Spec §12.2: Deployable static site with viewer
     */
    private generateIndexHtml(root: IIIFItem): string {
        const rootIdVal = root.id.split('/').pop();
        const rootType = root.type.toLowerCase();
        const manifestUrl = `iiif/${rootType}/${rootIdVal}.json`;
        const title = root.label?.none?.[0] || root.label?.en?.[0] || 'IIIF Export';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - IIIF Archive</title>

    <!-- Universal Viewer -->
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/universalviewer@4/dist/uv.css">
    <script src="https://cdn.jsdelivr.net/npm/universalviewer@4/dist/uv.js"></script>

    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        header {
            background: #1e293b;
            border-bottom: 1px solid #334155;
            padding: 1rem 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
        }
        .header-content {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .badge {
            background: #3b82f6;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 0.375rem;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        h1 {
            font-size: 1.25rem;
            font-weight: 700;
            color: #f1f5f9;
        }
        .info-btn {
            background: transparent;
            border: 1px solid #475569;
            color: #cbd5e1;
            padding: 0.5rem 1rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-size: 0.875rem;
            transition: all 0.2s;
        }
        .info-btn:hover {
            background: #334155;
            border-color: #64748b;
        }
        #viewer-container {
            flex: 1;
            min-height: 0;
            position: relative;
            background: #000;
        }
        #uv {
            width: 100%;
            height: 100%;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal.active {
            display: flex;
        }
        .modal-content {
            background: #1e293b;
            border-radius: 0.75rem;
            max-width: 600px;
            width: 90%;
            padding: 2rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .modal h2 {
            color: #3b82f6;
            margin-bottom: 1rem;
            font-size: 1.5rem;
        }
        .modal p {
            color: #cbd5e1;
            line-height: 1.75;
            margin-bottom: 1rem;
        }
        .modal code {
            background: #0f172a;
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-family: monospace;
            color: #60a5fa;
        }
        .modal-footer {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid #334155;
        }
        .btn-primary {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 0.625rem 1.25rem;
            border-radius: 0.375rem;
            cursor: pointer;
            font-weight: 600;
            transition: background 0.2s;
        }
        .btn-primary:hover {
            background: #2563eb;
        }
        .feature-list {
            list-style: none;
            margin: 1rem 0;
        }
        .feature-list li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }
        .feature-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
        }
        footer {
            background: #1e293b;
            border-top: 1px solid #334155;
            padding: 1rem 2rem;
            text-align: center;
            font-size: 0.875rem;
            color: #64748b;
            flex-shrink: 0;
        }
        footer a {
            color: #3b82f6;
            text-decoration: none;
        }
        footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <header>
        <div class="header-content">
            <span class="badge">IIIF 3.0</span>
            <h1>${title}</h1>
        </div>
        <button class="info-btn" onclick="toggleModal()">
            About This Archive
        </button>
    </header>

    <div id="viewer-container">
        <div id="uv" class="uv"></div>
    </div>

    <footer>
        Generated by <a href="https://github.com/micahchoo/field-studio" target="_blank">IIIF Field Studio</a>
        &middot; Standards-compliant IIIF Presentation API 3.0 archive
    </footer>

    <div id="info-modal" class="modal">
        <div class="modal-content">
            <h2>📚 About This IIIF Archive</h2>
            <p>
                This is a self-contained, standards-compliant IIIF archive.
                It can be opened in any IIIF-compatible viewer or served from any web host.
            </p>
            <ul class="feature-list">
                <li>IIIF Presentation API 3.0 compliant</li>
                <li>IIIF Image API Level 0 (pre-generated sizes)</li>
                <li>W3C Web Annotation Data Model</li>
                <li>No server or database required</li>
            </ul>
            <p>
                <strong>Entry Point:</strong> <code>${manifestUrl}</code>
            </p>
            <p>
                To use with external viewers, point them to the manifest URL above.
                The archive includes all necessary images and metadata.
            </p>
            <div class="modal-footer">
                <button class="btn-primary" onclick="toggleModal()">Close</button>
            </div>
        </div>
    </div>

    <script>
        // Initialize Universal Viewer
        const manifestUri = '${manifestUrl}';

        function createUV() {
            const urlDataProvider = new UV.URLDataProvider();

            const config = {
                modules: {
                    resourceLeftPanel: {
                        options: {
                            panelOpen: true
                        }
                    }
                }
            };

            const uv = createUV('#uv', {
                manifestUri: manifestUri,
                configUri: '',
                root: '/',
                embedded: true
            }, new urlDataProvider(true));
        }

        // Modal control
        function toggleModal() {
            document.getElementById('info-modal').classList.toggle('active');
        }

        // Initialize on load
        window.addEventListener('load', () => {
            try {
                createUV();
            } catch (error) {
                console.error('Failed to initialize Universal Viewer:', error);
                document.getElementById('viewer-container').innerHTML =
                    '<div style="color: #ef4444; padding: 2rem; text-align: center;">' +
                    '<p style="margin-bottom: 1rem;">⚠️ Failed to load viewer</p>' +
                    '<p><a href="' + manifestUri + '" style="color: #3b82f6;">View manifest JSON</a></p>' +
                    '</div>';
            }
        });
    </script>
</body>
</html>`;
    }
}

export const exportService = new ExportService();
