
import JSZip from 'jszip';
import { IIIFItem, IIIFCollection, IIIFManifest, IIIFCanvas, IIIFAnnotation } from '../types';
import { validator } from './validator';
import {
  generateInfoJson,
  generateStandardSizes,
  generateStandardTiles,
  createImageServiceReference,
  ImageApiProfile
} from '../utils';
import { getDerivativePreset, DEFAULT_DERIVATIVE_SIZES } from '../constants';
import {
  CANOPY_PACKAGE_JSON,
  CANOPY_GITIGNORE,
  CANOPY_LICENSE,
  CANOPY_BUILD_SCRIPT,
  CANOPY_STYLES_INDEX,
  CANOPY_STYLES_CUSTOM,
  CANOPY_MDX_COMPONENTS,
  CANOPY_EXAMPLE_COMPONENT,
  CANOPY_EXAMPLE_CLIENT,
  CANOPY_CONTENT_LAYOUT,
  CANOPY_CONTENT_ABOUT_LAYOUT,
  CANOPY_CONTENT_WORKS_LAYOUT,
  CANOPY_CONTENT_SEARCH_LAYOUT,
  CANOPY_SEARCH_RESULT_ARTICLE,
  CANOPY_SEARCH_RESULT_FIGURE,
  CANOPY_ROBOTS_TXT,
  CANOPY_DEPLOY_WORKFLOW,
  CANOPY_UPDATE_WORKFLOW,
  CANOPY_LOGO_SVG,
  generateCanopyAppMdx
} from '../constants/canopyTemplates';

export interface CanopyConfig {
    title: string;
    baseUrl?: string;
    theme: {
        accentColor: string;
        grayColor: string;
        appearance: 'light' | 'dark';
    };
    search: {
        enabled: boolean;
        indexSummary: boolean;
    };
    metadata: string[];
    featured: string[];  // Array of manifest IDs for homepage featured section
}

export interface ExportOptions {
    includeAssets: boolean;
    format: 'static-site' | 'raw-iiif' | 'canopy';
    ignoreErrors?: boolean;
    canopyConfig?: CanopyConfig;
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
        
        // Canopy requires specific directory naming (plural) and assets/iiif/ path
        const getDirName = (type: string) => {
            if (options.format === 'canopy') {
                return type.toLowerCase() + 's';
            }
            return type.toLowerCase();
        };

        // Base path for IIIF files: assets/iiif/ for Canopy, iiif/ for others
        const iiifBasePath = options.format === 'canopy' ? 'assets/iiif' : 'iiif';

        const processItem = (item: IIIFItem, originalItem: IIIFItem) => {
            const originalId = item.id;
            let idVal = originalId.split('/').pop() || 'unknown';
            let typeDir = getDirName(item.type);

            // Rewrite self ID for Canopy to match the served path
            if (options.format === 'canopy') {
                const baseUrl = options.canopyConfig?.baseUrl || '';
                // Ensure ID starts with / if no baseUrl, or matches baseUrl
                item.id = `${baseUrl}/iiif/${typeDir}/${idVal}.json`;
            }
            
            if (item.items) {
                item.items.forEach((child, idx) => {
                    if (child.type === 'Collection' || child.type === 'Manifest') {
                        const childIdVal = child.id.split('/').pop();
                        const childType = getDirName(child.type);
                        
                        if (options.format === 'canopy') {
                            const baseUrl = options.canopyConfig?.baseUrl || '';
                            child.id = `${baseUrl}/iiif/${childType}/${childIdVal}.json`;
                        } else {
                            child.id = `../${childType}/${childIdVal}.json`;
                        }
                    } else if (child.type === 'Canvas') {
                        const origCanvas = (originalItem as any).items?.[idx] as IIIFCanvas;
                        if (origCanvas && origCanvas._fileRef && origCanvas._fileRef.name && options.includeAssets) {
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
                                const imagesBasePath = options.format === 'canopy' ? 'assets/iiif/images' : 'images';
                                const infoJsonPath = `${imagesBasePath}/${assetId}/info.json`;
                                const width = origCanvas.width || 2000;
                                const height = origCanvas.height || 2000;

                                virtualFiles.push({
                                    path: infoJsonPath,
                                    content: this.generateImageInfoJsonForExport(assetId, width, height, options.format === 'canopy'),
                                    type: 'info'
                                });

                                // Add pre-generated size derivatives (Level 0 requirement)
                                // Uses DEFAULT_DERIVATIVE_SIZES from presets
                                const sizes = DEFAULT_DERIVATIVE_SIZES;
                                for (const size of sizes) {
                                    const sizeHeight = Math.floor((height / width) * size);
                                    virtualFiles.push({
                                        path: `${imagesBasePath}/${assetId}/full/${size},/0/default.jpg`,
                                        content: origCanvas._fileRef, // TODO: Generate actual derivatives
                                        type: 'asset'
                                    });
                                }
                            }

                            // Update painting annotation body to use Level 0 Image API
                            const painting = child.items?.[0]?.items?.[0] as unknown as IIIFAnnotation;
                            if (painting && painting.body && !Array.isArray(painting.body)) {
                                if (options.format === 'canopy') {
                                    const baseUrl = options.canopyConfig?.baseUrl || '';
                                    (painting.body as any).id = `${baseUrl}/iiif/images/${assetId}/full/max/0/default.jpg`;
                                    (painting.body as any).service = [
                                        createImageServiceReference(`${baseUrl}/iiif/images/${assetId}`, 'level0')
                                    ];
                                } else {
                                    (painting.body as any).id = `../../images/${assetId}/full/max/0/default.jpg`;
                                    (painting.body as any).service = [
                                        createImageServiceReference(`../../images/${assetId}`, 'level0')
                                    ];
                                }
                            }
                        }
                    }
                });
            }

            virtualFiles.push({
                path: `${iiifBasePath}/${typeDir}/${idVal}.json`,
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
            // Bundle Universal Viewer assets for offline use
            try {
                const uvAssets = await this.fetchViewerAssets();
                virtualFiles.push(...uvAssets);
            } catch (e) {
                console.error("Failed to bundle viewer assets, falling back to CDN", e);
            }

            virtualFiles.push({
                path: 'index.html',
                content: this.generateIndexHtml(root, options),
                type: 'html'
            });
        } else if (options.format === 'canopy' && options.canopyConfig) {
            virtualFiles.push({
                path: 'canopy.yml',
                content: this.generateCanopyConfig(root, options.canopyConfig),
                type: 'info' // Using 'info' type for YAML config
            });
            virtualFiles.push({
                path: 'README.md',
                content: this.generateCanopyReadme(options.canopyConfig),
                type: 'info'
            });
        }

        return virtualFiles;
    }

    /**
     * Generates IIIF Collections for each metadata facet value
     * Creates files at assets/iiif/api/facet/{label}/{value}.json
     */
    private generateFacetCollections(root: IIIFItem, config: CanopyConfig): VirtualFile[] {
        const files: VirtualFile[] = [];
        const baseUrl = config.baseUrl || '';

        // Build facet index: { label: { value: [manifestIds] } }
        const facetIndex: Record<string, Record<string, string[]>> = {};

        const collectFacets = (item: IIIFItem) => {
            if (item.type === 'Manifest') {
                const manifestId = item.id;
                item.metadata?.forEach(meta => {
                    const label = this.getIIIFValue(meta.label);
                    const value = this.getIIIFValue(meta.value);
                    if (label && value && config.metadata.includes(label)) {
                        if (!facetIndex[label]) facetIndex[label] = {};
                        if (!facetIndex[label][value]) facetIndex[label][value] = [];
                        if (!facetIndex[label][value].includes(manifestId)) {
                            facetIndex[label][value].push(manifestId);
                        }
                    }
                });
            }
            item.items?.forEach(child => {
                if (child.type === 'Collection' || child.type === 'Manifest') {
                    collectFacets(child as IIIFItem);
                }
            });
        };

        collectFacets(root);

        // Generate IIIF Collection for each facet value
        for (const [label, values] of Object.entries(facetIndex)) {
            const sanitizedLabel = this.sanitizePathSegment(label);
            for (const [value, manifestIds] of Object.entries(values)) {
                const sanitizedValue = this.sanitizePathSegment(value);
                const collectionId = `${baseUrl}/iiif/api/facet/${sanitizedLabel}/${sanitizedValue}.json`;

                const collection: IIIFCollection = {
                    '@context': 'http://iiif.io/api/presentation/3/context.json',
                    id: collectionId,
                    type: 'Collection',
                    label: { none: [`${label}: ${value}`] },
                    summary: { none: [`${manifestIds.length} items with ${label} "${value}"`] },
                    items: manifestIds.map(id => {
                        const idVal = id.split('/').pop();
                        return {
                            id: `${baseUrl}/iiif/manifests/${idVal}.json`,
                            type: 'Manifest' as const
                        };
                    })
                };

                files.push({
                    path: `assets/iiif/api/facet/${sanitizedLabel}/${sanitizedValue}.json`,
                    content: JSON.stringify(collection, null, 2),
                    type: 'json'
                });
            }
        }

        return files;
    }

    /**
     * Generates MDX content files for the Canopy site
     * Creates homepage (content/index.mdx) and about page (content/about/index.mdx)
     */
    private generateContentFiles(root: IIIFItem, config: CanopyConfig): VirtualFile[] {
        const files: VirtualFile[] = [];
        const title = config.title;
        const description = this.getIIIFValue((root as any).summary) || `A IIIF collection featuring ${this.countManifests(root)} items.`;

        // Generate homepage content/index.mdx
        const homepageMdx = `---
title: ${title}
description: ${description}
---

<Interstitials.Hero
  headline="${title}"
  description="${description.replace(/"/g, '\\"')}"
  background="theme"
  random={true}
  links={[
    {
      href: "/search",
      title: "Browse Collection",
      type: "primary",
    },
    {
      href: "/about",
      title: "About",
      type: "secondary",
    },
  ]}
/>

<Container>

## Explore the Collection

Browse and discover items from this collection using the search and metadata facets.

<RelatedItems top={6} />

</Container>
`;

        files.push({
            path: 'content/index.mdx',
            content: homepageMdx,
            type: 'info'
        });

        // Generate about page content/about/index.mdx
        const manifestCount = this.countManifests(root);
        const metadataLabels = config.metadata.length > 0
            ? config.metadata.join(', ')
            : 'various categories';

        const aboutMdx = `---
title: About
description: About ${title}
---

# About ${title}

${description}

## Collection Overview

This collection contains **${manifestCount} items** organized by metadata including ${metadataLabels}.

<ButtonWrapper variant="interstitial" text="Ready to explore?">
  <Button href="/search" label="Browse Collection" />
</ButtonWrapper>

## Using This Site

- **Search**: Use the search page to find items by keyword or browse by metadata facets
- **Works**: Each item has its own page with a viewer, metadata, and related items
- **Metadata**: Filter items by ${metadataLabels}

---

*This site was generated with [IIIF Field Studio](https://github.com/micahchoo/field-studio) and [Canopy IIIF](https://canopy-iiif.github.io/app/).*
`;

        files.push({
            path: 'content/about/index.mdx',
            content: aboutMdx,
            type: 'info'
        });

        return files;
    }

    /**
     * Counts the total number of manifests in the tree
     */
    private countManifests(item: IIIFItem): number {
        let count = 0;
        const traverse = (node: IIIFItem) => {
            if (node.type === 'Manifest') count++;
            node.items?.forEach(child => {
                if (child.type === 'Collection' || child.type === 'Manifest') {
                    traverse(child as IIIFItem);
                }
            });
        };
        traverse(item);
        return count;
    }

    /**
     * Sanitizes a string to be safe for use in file paths
     */
    private sanitizePathSegment(str: string): string {
        return str
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100);
    }

    /**
     * Helper to extract value from IIIF InternationalString
     */
    private getIIIFValue(val: any): string {
        if (!val) return '';
        if (typeof val === 'string') return val;
        if (val.none?.[0]) return val.none[0];
        if (val.en?.[0]) return val.en[0];
        // Try first available language
        const keys = Object.keys(val);
        if (keys.length > 0 && Array.isArray(val[keys[0]])) {
            return val[keys[0]][0] || '';
        }
        return '';
    }

    private generateCanopyReadme(config: CanopyConfig): string {
        return `# Canopy IIIF Site Export

This package contains your IIIF collection data and configuration, ready to be deployed with Canopy IIIF.

## 🚀 Quick Start

1.  **Get the Template**
    If you haven't already, fork or clone the [Canopy IIIF Template](https://github.com/canopy-iiif/template).

2.  **Install Your Data**
    Copy the files from this export into your Canopy project directory:
    
    *   Replace \`canopy.yml\` with the one from this export.
    *   Copy the \`iiif/\` folder into your project root (merge if it exists).

3.  **Run It**
    From your Canopy project directory:
    \`\`\`bash
    npm install
    npm run dev
    \`\`\`

## ⚙️ Configuration

Your site settings have been saved to \`canopy.yml\`:

*   **Title**: ${config.title}
*   **Theme**: ${config.theme.accentColor} / ${config.theme.grayColor} (${config.theme.appearance})
*   **Search**: ${config.search.enabled ? 'Enabled' : 'Disabled'}

## 📦 Contents

*   \`canopy.yml\`: Main configuration file.
*   \`iiif/collections/\`: Your IIIF Collection data.
*   \`iiif/manifests/\`: Your IIIF Manifest data.
*   \`assets/\`: (If selected) Associated media files.

For more documentation, visit [Canopy IIIF](https://canopy-iiif.github.io/docs).
`;
    }

    private generateCanopyConfig(root: IIIFItem, config: CanopyConfig): string {
        const rootIdVal = root.id.split('/').pop();
        const rootType = root.type.toLowerCase() + 's'; // Plural for Canopy
        const rootPath = config.baseUrl
            ? `${config.baseUrl}/iiif/${rootType}/${rootIdVal}.json`
            : `/iiif/${rootType}/${rootIdVal}.json`;

        // Determine correct key based on root item type
        const entryKey = root.type === 'Manifest' ? 'manifest:' : 'collection:';

        // Convert featured manifest IDs to Canopy format
        const featuredPaths = config.featured.map(id => {
            const idVal = id.split('/').pop();
            return config.baseUrl
                ? `${config.baseUrl}/iiif/manifests/${idVal}.json`
                : `/iiif/manifests/${idVal}.json`;
        });

        // YAML construction manually to avoid extra dependencies
        const lines = [
            `title: "${config.title.replace(/"/g, '\\"')}"`,
            ...(config.baseUrl ? [`baseUrl: "${config.baseUrl}"`] : []),
            '',
            entryKey,
            `  - ${rootPath}`,
            '',
            'metadata:',
            ...config.metadata.map(m => `  - ${m}`),
            '',
            // Add featured section if items are selected
            ...(featuredPaths.length > 0 ? [
                'featured:',
                ...featuredPaths.map(p => `  - ${p}`),
                ''
            ] : []),
            'theme:',
            `  accentColor: ${config.theme.accentColor}`,
            `  grayColor: ${config.theme.grayColor}`,
            `  appearance: ${config.theme.appearance}`,
            '',
            'search:',
            '  index:',
            `    metadata:`,
            `      enabled: ${config.search.enabled}`,
            `    summary:`,
            `      enabled: ${config.search.indexSummary}`
        ];

        return lines.join('\n');
    }

    private async fetchViewerAssets(): Promise<VirtualFile[]> {
        const assets: { path: string, url: string }[] = [
            { path: 'viewer/uv.css', url: 'https://cdn.jsdelivr.net/npm/universalviewer@4/dist/uv.css' },
            { path: 'viewer/uv.js', url: 'https://cdn.jsdelivr.net/npm/universalviewer@4/dist/uv.js' }
        ];

        return Promise.all(assets.map(async (a) => {
            const resp = await fetch(a.url);
            if (!resp.ok) throw new Error(`Failed to fetch ${a.url}`);
            const blob = await resp.blob();
            return {
                path: a.path,
                content: blob,
                type: 'asset' as const
            };
        }));
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
     * Uses centralized Image API utilities for spec compliance
     */
    private generateImageInfoJsonForExport(assetId: string, width: number, height: number, isCanopy: boolean = false): string {
        // Use centralized info.json generation for Level 0 compliance
        // For Canopy, use iiif/images path; for others, use images path
        const basePath = isCanopy ? `iiif/images/${assetId}` : `images/${assetId}`;
        const info = generateInfoJson(
            basePath,
            width,
            height,
            'level0',
            {
                sizes: generateStandardSizes(width, height, DEFAULT_DERIVATIVE_SIZES),
                tiles: generateStandardTiles(512, [1, 2, 4, 8])
            }
        );
        return JSON.stringify(info, null, 2);
    }

    /**
     * Generates self-contained HTML with embedded Universal Viewer
     * Spec §12.2: Deployable static site with viewer
     */
    private generateIndexHtml(root: IIIFItem, options: ExportOptions): string {
        const rootIdVal = root.id.split('/').pop();
        const rootType = root.type.toLowerCase();
        const manifestUrl = `iiif/${rootType}/${rootIdVal}.json`;
        const title = root.label?.none?.[0] || root.label?.en?.[0] || 'IIIF Export';

        const uvCss = options.format === 'static-site' ? 'viewer/uv.css' : 'https://cdn.jsdelivr.net/npm/universalviewer@4/dist/uv.css';
        const uvJs = options.format === 'static-site' ? 'viewer/uv.js' : 'https://cdn.jsdelivr.net/npm/universalviewer@4/dist/uv.js';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - IIIF Archive</title>

    <!-- Universal Viewer -->
    <link rel="stylesheet" type="text/css" href="${uvCss}">
    <script src="${uvJs}"></script>

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
