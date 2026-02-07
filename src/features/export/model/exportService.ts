
import JSZip from 'jszip';
import { getIIIFValue, IIIFAnnotation, IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest, isCanvas, isCollection, isManifest } from '@/src/shared/types';
import { validator } from '@/src/entities/manifest/model/validation/validator';
import {
  createImageServiceReference,
  generateInfoJson,
  generateStandardSizes,
  generateStandardTiles,
  getAllManifests,
  ImageApiProfile
} from '@/utils';
import { DEFAULT_DERIVATIVE_SIZES, DEFAULT_INGEST_PREFS, getDerivativePreset, IIIF_SPEC } from '@/src/shared/constants';
import {
  CANOPY_BUILD_SCRIPT,
  CANOPY_CONTENT_ABOUT_LAYOUT,
  CANOPY_CONTENT_LAYOUT,
  CANOPY_CONTENT_SEARCH_LAYOUT,
  CANOPY_CONTENT_WORKS_LAYOUT,
  CANOPY_DEPLOY_WORKFLOW,
  CANOPY_EXAMPLE_CLIENT,
  CANOPY_EXAMPLE_COMPONENT,
  CANOPY_GITIGNORE,
  CANOPY_LICENSE,
  CANOPY_LOGO_SVG,
  CANOPY_MDX_COMPONENTS,
  CANOPY_ROBOTS_TXT,
  CANOPY_SEARCH_RESULT_ARTICLE,
  CANOPY_SEARCH_RESULT_FIGURE,
  CANOPY_STYLES_CUSTOM,
  CANOPY_STYLES_INDEX,
  CANOPY_UPDATE_WORKFLOW,
  generateCanopyAppMdx,
  generateCanopyPackageJson
} from '@/src/shared/constants/canopyTemplates';

/** Default port for local IIIF server */
export const DEFAULT_IIIF_PORT = 8765;

export interface CanopyConfig {
    title: string;
    baseUrl?: string;
    /** Port for local IIIF server (default: 8765) */
    port?: number;
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

export interface ImageApiOptions {
    /** Generate grayscale versions of images */
    includeGrayscale?: boolean;
    /** Generate WebP format in addition to JPEG */
    includeWebP?: boolean;
    /** Generate square crop for thumbnails */
    includeSquare?: boolean;
    /** Tile size in pixels (default: 512) */
    tileSize?: number;
}

export interface ExportOptions {
    includeAssets: boolean;
    format: 'static-site' | 'raw-iiif' | 'canopy';
    ignoreErrors?: boolean;
    canopyConfig?: CanopyConfig;
    /** Additional IIIF Image API options */
    imageApiOptions?: ImageApiOptions;
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
     * Resizes an image using Canvas API
     * Returns a Blob of the resized image in the specified format
     */
    private async resizeImage(
        file: File | Blob,
        targetWidth: number,
        targetHeight: number,
        format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
        quality: number = 0.85
    ): Promise<Blob> {
        const bitmap = await createImageBitmap(file);
        const canvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }
        ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        bitmap.close();
        return await canvas.convertToBlob({ type: format, quality });
    }

    /**
     * Converts an image to grayscale
     * IIIF Image API 3.0 §4.4: gray quality
     */
    private async convertToGrayscale(file: File | Blob, width: number, height: number): Promise<Blob> {
        const bitmap = await createImageBitmap(file);
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        // Apply grayscale filter using ImageData
        const imageData = ctx.getImageData(0, 0, width, height);
        const {data} = imageData;
        for (let i = 0; i < data.length; i += 4) {
            // Standard luminance formula: 0.299*R + 0.587*G + 0.114*B
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = gray;     // R
            data[i + 1] = gray; // G
            data[i + 2] = gray; // B
            // Alpha (data[i + 3]) remains unchanged
        }
        ctx.putImageData(imageData, 0, 0);

        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    }

    /**
     * Extracts a square crop from the center of an image
     * IIIF Image API 3.0 §4.1: square region
     */
    private async extractSquareRegion(file: File | Blob, width: number, height: number): Promise<Blob> {
        const bitmap = await createImageBitmap(file);
        const squareSize = Math.min(width, height);

        // Center the square crop
        const offsetX = Math.floor((width - squareSize) / 2);
        const offsetY = Math.floor((height - squareSize) / 2);

        const canvas = new OffscreenCanvas(squareSize, squareSize);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }
        ctx.drawImage(bitmap, offsetX, offsetY, squareSize, squareSize, 0, 0, squareSize, squareSize);
        bitmap.close();

        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    }

    /**
     * Generates a single tile from an image
     * region: {x, y, w, h} in original image coordinates
     * size: {w, h} output tile dimensions
     */
    private async generateTile(
        file: File | Blob,
        region: { x: number; y: number; w: number; h: number },
        size: { w: number; h: number }
    ): Promise<Blob> {
        const bitmap = await createImageBitmap(file, region.x, region.y, region.w, region.h);
        const canvas = new OffscreenCanvas(size.w, size.h);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }
        ctx.drawImage(bitmap, 0, 0, size.w, size.h);
        bitmap.close();
        return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    }

    /**
     * Generates a complete tile pyramid for deep zoom viewing
     * Returns an array of {path, blob} for each tile
     */
    private async generateTilePyramid(
        file: File | Blob,
        width: number,
        height: number,
        assetId: string,
        basePath: string,
        tileSize: number = 512
    ): Promise<{ path: string; blob: Blob }[]> {
        const tiles: { path: string; blob: Blob }[] = [];

        // Calculate scale factors needed
        // Start from full resolution and halve until we reach a size <= tileSize
        const scaleFactors: number[] = [];
        const maxDim = Math.max(width, height);
        let scaleFactor = 1;
        while (maxDim / scaleFactor > tileSize) {
            scaleFactors.push(scaleFactor);
            scaleFactor *= 2;
        }
        scaleFactors.push(scaleFactor); // Add final scale factor

        for (const sf of scaleFactors) {
            const scaledWidth = Math.ceil(width / sf);
            const scaledHeight = Math.ceil(height / sf);

            // Calculate number of tiles at this scale
            const tilesX = Math.ceil(scaledWidth / tileSize);
            const tilesY = Math.ceil(scaledHeight / tileSize);

            for (let y = 0; y < tilesY; y++) {
                for (let x = 0; x < tilesX; x++) {
                    // Calculate region in original image coordinates
                    const regionX = x * tileSize * sf;
                    const regionY = y * tileSize * sf;
                    const regionW = Math.min(tileSize * sf, width - regionX);
                    const regionH = Math.min(tileSize * sf, height - regionY);

                    // Calculate output tile size
                    const outW = Math.ceil(regionW / sf);
                    const outH = Math.ceil(regionH / sf);

                    // Generate tile
                    const tileBlob = await this.generateTile(
                        file,
                        { x: regionX, y: regionY, w: regionW, h: regionH },
                        { w: outW, h: outH }
                    );

                    // IIIF Image API path format: {region}/{size}/{rotation}/{quality}.{format}
                    // Region: x,y,w,h
                    // Size: w,h or w, or ,h or max or ^w,h etc.
                    const regionStr = `${regionX},${regionY},${regionW},${regionH}`;
                    const sizeStr = `${outW},${outH}`;
                    const tilePath = `${basePath}/${assetId}/${regionStr}/${sizeStr}/0/default.jpg`;

                    tiles.push({ path: tilePath, blob: tileBlob });
                }
            }
        }

        return tiles;
    }

    /**
     * Synthesizes the final archive structure without compressing it.
     * Used for Dry Runs.
     */
    async prepareExport(root: IIIFItem, options: ExportOptions): Promise<VirtualFile[]> {
        const virtualFiles: VirtualFile[] = [];

        // Canopy requires specific directory naming (plural) and assets/iiif/ path
        const getDirName = (type: string) => {
            if (options.format === 'canopy') {
                return `${type.toLowerCase()}s`;
            }
            return type.toLowerCase();
        };

        // Base path for IIIF files: assets/iiif/ for Canopy, iiif/ for others
        const iiifBasePath = options.format === 'canopy' ? 'assets/iiif' : 'iiif';
        // For Canopy, use localhost with configured port as base URL for local dev server
        // This matches the serve:iiif script in package.json
        const iiifPort = options.canopyConfig?.port || DEFAULT_IIIF_PORT;
        const baseUrl = options.format === 'canopy'
            ? (options.canopyConfig?.baseUrl || `http://localhost:${iiifPort}`)
            : '';

        // For Canopy: Build a map of all items with their new IDs
        const idMap = new Map<string, string>(); // oldId -> newId

        if (options.format === 'canopy') {
            // First pass: build ID mapping for all collections and manifests
            const buildIdMap = (item: IIIFItem) => {
                const idVal = item.id.split('/').pop() || 'unknown';
                const typeDir = getDirName(item.type);
                const newId = `${baseUrl}/iiif/${typeDir}/${idVal}.json`;
                idMap.set(item.id, newId);

                if (item.items) {
                    item.items.forEach(child => {
                        if (isCollection(child) || isManifest(child)) {
                            buildIdMap(child as IIIFItem);
                        }
                    });
                }
            };
            buildIdMap(root);
        }

        // Helper to rewrite all IDs in a JSON structure
        const rewriteIds = (obj: any, manifestIdVal: string): any => {
            if (obj === null || obj === undefined) return obj;
            if (typeof obj !== 'object') return obj;

            if (Array.isArray(obj)) {
                return obj.map(item => rewriteIds(item, manifestIdVal));
            }

            const result: any = {};
            for (const [key, value] of Object.entries(obj)) {
                if (key === 'id' && typeof value === 'string') {
                    // Check if this ID is in our map
                    if (idMap.has(value)) {
                        result[key] = idMap.get(value);
                    } else if (value.includes('/canvas/') || value.includes('/annotation') || value.includes('/page/')) {
                        // Rewrite canvas and annotation IDs to use new manifest base
                        const path = value.split('/').slice(-3).join('/'); // Get last parts like canvas/1/annotation/painting
                        result[key] = `${baseUrl}/iiif/manifests/${manifestIdVal}.json/${path}`;
                    } else {
                        result[key] = value;
                    }
                } else if (key === 'target' && typeof value === 'string') {
                    // Rewrite annotation targets
                    if (value.includes('/canvas/')) {
                        const path = value.split('/').slice(-2).join('/');
                        result[key] = `${baseUrl}/iiif/manifests/${manifestIdVal}.json/${path}`;
                    } else {
                        result[key] = value;
                    }
                } else {
                    result[key] = rewriteIds(value, manifestIdVal);
                }
            }
            return result;
        };

        // Collect image processing tasks for async generation
        const imageProcessingTasks: Array<{
            file: File;
            assetId: string;
            imagesBasePath: string;
            imgWidth: number;
            imgHeight: number;
        }> = [];

        const processItem = (item: IIIFItem, originalItem: IIIFItem) => {
            const originalId = item.id;
            const idVal = originalId.split('/').pop() || 'unknown';
            const typeDir = getDirName(item.type);

            // Deep clone the item for processing
            const processedItem = JSON.parse(JSON.stringify(item));

            // Rewrite self ID
            if (options.format === 'canopy') {
                processedItem.id = idMap.get(originalId) || `${baseUrl}/iiif/${typeDir}/${idVal}.json`;
            }

            if (processedItem.items) {
                processedItem.items = processedItem.items.map((child: any, idx: number) => {
                    if (isCollection(child) || isManifest(child)) {
                        // For Collections: replace embedded content with reference only
                        if (options.format === 'canopy') {
                            const childNewId = idMap.get(child.id);
                            return {
                                id: childNewId || child.id,
                                type: child.type,
                                label: child.label
                            };
                        } else {
                            const childIdVal = child.id.split('/').pop();
                            const childType = getDirName(child.type);
                            return {
                                id: `../${childType}/${childIdVal}.json`,
                                type: child.type,
                                label: child.label
                            };
                        }
                    } else if (child.type === 'Canvas') {
                        // Process canvas content and assets
                        const origCanvas = (originalItem as any).items?.[idx] as IIIFCanvas;
                        const processedCanvas = options.format === 'canopy'
                            ? rewriteIds(child, idVal)
                            : JSON.parse(JSON.stringify(child));

                        if (origCanvas && origCanvas._fileRef && origCanvas._fileRef.name && options.includeAssets) {
                            const filename = origCanvas._fileRef.name;
                            const baseFileName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');
                            const assetId = `${idVal}-${baseFileName}`;
                            const assetPath = `assets/${filename}`;

                            // Add original asset
                            virtualFiles.push({
                                path: assetPath,
                                content: origCanvas._fileRef,
                                type: 'asset'
                            });

                            // Generate IIIF Image API info.json and derivatives
                            if (origCanvas._fileRef.type.startsWith('image/')) {
                                const imagesBasePath = options.format === 'canopy' ? 'assets/iiif/images' : 'images';
                                const imgWidth = origCanvas.width || 2000;
                                const imgHeight = origCanvas.height || 2000;

                                // Queue for async derivative generation
                                imageProcessingTasks.push({
                                    file: origCanvas._fileRef,
                                    assetId,
                                    imagesBasePath,
                                    imgWidth,
                                    imgHeight
                                });

                                // Generate info.json with tile support for deep zoom
                                // Passes IIIF Image API options for extra qualities/formats
                                virtualFiles.push({
                                    path: `${imagesBasePath}/${assetId}/info.json`,
                                    content: this.generateImageInfoJsonForExport(
                                        assetId,
                                        imgWidth,
                                        imgHeight,
                                        options.format === 'canopy',
                                        true, // includeTiles
                                        options.imageApiOptions,
                                        undefined, // rights
                                        iiifPort
                                    ),
                                    type: 'info'
                                });
                            }

                            // Update painting annotation body with ImageService for deep zoom
                            const painting = processedCanvas.items?.[0]?.items?.[0];
                            if (painting && painting.body && !Array.isArray(painting.body)) {
                                const imagesBasePath = options.format === 'canopy' ? 'assets/iiif/images' : 'images';
                                const imgWidth = origCanvas.width || 2000;
                                const imgHeight = origCanvas.height || 2000;

                                if (options.format === 'canopy') {
                                    // Use ImageService for deep zoom support
                                    painting.body.id = `${baseUrl}/iiif/images/${assetId}/full/max/0/default.jpg`;
                                    painting.body.width = imgWidth;
                                    painting.body.height = imgHeight;
                                    painting.body.service = [
                                        createImageServiceReference(`${baseUrl}/iiif/images/${assetId}`, 'level0')
                                    ];
                                } else {
                                    painting.body.id = `../../images/${assetId}/full/max/0/default.jpg`;
                                    painting.body.width = imgWidth;
                                    painting.body.height = imgHeight;
                                    painting.body.service = [
                                        createImageServiceReference(`../../images/${assetId}`, 'level0')
                                    ];
                                }
                            }

                            // Update canvas dimensions if not set properly
                            if (!processedCanvas.width || processedCanvas.width === DEFAULT_INGEST_PREFS.defaultCanvasWidth) {
                                processedCanvas.width = origCanvas.width || DEFAULT_INGEST_PREFS.defaultCanvasWidth;
                                processedCanvas.height = origCanvas.height || DEFAULT_INGEST_PREFS.defaultCanvasHeight;
                            }

                            // Update thumbnail references
                            if (processedCanvas.thumbnail && Array.isArray(processedCanvas.thumbnail)) {
                                const thumbWidth = 150;
                                const aspectRatio = (origCanvas?.height || 2000) / (origCanvas?.width || 2000);
                                const thumbHeight = Math.floor(thumbWidth * aspectRatio);
                                processedCanvas.thumbnail = processedCanvas.thumbnail.map((thumb: any) => ({
                                    ...thumb,
                                    id: options.format === 'canopy'
                                        ? `${baseUrl}/iiif/images/${assetId}/full/${thumbWidth},${thumbHeight}/0/default.jpg`
                                        : `../../images/${assetId}/full/${thumbWidth},${thumbHeight}/0/default.jpg`,
                                    width: thumbWidth,
                                    height: thumbHeight
                                }));
                            }
                        }

                        // Remove internal _fileRef from output
                        delete processedCanvas._fileRef;
                        return processedCanvas;
                    }
                    return child;
                });
            }

            // Remove internal properties
            delete processedItem._fileRef;

            virtualFiles.push({
                path: `${iiifBasePath}/${typeDir}/${idVal}.json`,
                content: JSON.stringify(processedItem, null, 2),
                type: 'json'
            });

            // Recursively process child Collections and Manifests
            if (originalItem.items) {
                originalItem.items.forEach((origChild) => {
                    if (isCollection(origChild) || isManifest(origChild)) {
                        processItem(origChild as IIIFItem, origChild as IIIFItem);
                    }
                });
            }
        };

        processItem(root, root);

        // Process all image derivatives asynchronously
        // Implements IIIF Image API 3.0 §4 Image Requests
        const imageApiOpts = options.imageApiOptions || {};
        const tileSize = imageApiOpts.tileSize || 512;

        for (const task of imageProcessingTasks) {
            const { file, assetId, imagesBasePath, imgWidth, imgHeight } = task;
            const aspectRatio = imgHeight / imgWidth;

            // === FULL REGION DERIVATIVES ===

            // Add full/max/0/default.jpg (original size) - §4.2 Size: max
            virtualFiles.push({
                path: `${imagesBasePath}/${assetId}/full/max/0/default.jpg`,
                content: file,
                type: 'asset'
            });

            // Generate actual resized derivatives - §4.2 Size: w,h
            for (const targetWidth of DEFAULT_DERIVATIVE_SIZES) {
                if (targetWidth < imgWidth) {
                    const targetHeight = Math.floor(targetWidth * aspectRatio);
                    try {
                        const resizedBlob = await this.resizeImage(file, targetWidth, targetHeight);
                        virtualFiles.push({
                            path: `${imagesBasePath}/${assetId}/full/${targetWidth},${targetHeight}/0/default.jpg`,
                            content: resizedBlob,
                            type: 'asset'
                        });

                        // Generate WebP version if enabled - §4.5 Format: webp
                        if (imageApiOpts.includeWebP) {
                            const webpBlob = await this.resizeImage(file, targetWidth, targetHeight, 'image/webp', 0.85);
                            virtualFiles.push({
                                path: `${imagesBasePath}/${assetId}/full/${targetWidth},${targetHeight}/0/default.webp`,
                                content: webpBlob,
                                type: 'asset'
                            });
                        }
                    } catch (e) {
                        console.warn(`Failed to resize ${assetId} to ${targetWidth}x${targetHeight}`, e);
                        virtualFiles.push({
                            path: `${imagesBasePath}/${assetId}/full/${targetWidth},${targetHeight}/0/default.jpg`,
                            content: file,
                            type: 'asset'
                        });
                    }
                }
            }

            // === GRAYSCALE QUALITY - §4.4 Quality: gray ===
            if (imageApiOpts.includeGrayscale) {
                try {
                    // Generate grayscale at full size
                    const grayBlob = await this.convertToGrayscale(file, imgWidth, imgHeight);
                    virtualFiles.push({
                        path: `${imagesBasePath}/${assetId}/full/max/0/gray.jpg`,
                        content: grayBlob,
                        type: 'asset'
                    });

                    // Generate grayscale at smaller sizes
                    for (const targetWidth of DEFAULT_DERIVATIVE_SIZES) {
                        if (targetWidth < imgWidth) {
                            const targetHeight = Math.floor(targetWidth * aspectRatio);
                            const resizedGray = await this.convertToGrayscale(file, targetWidth, targetHeight);
                            virtualFiles.push({
                                path: `${imagesBasePath}/${assetId}/full/${targetWidth},${targetHeight}/0/gray.jpg`,
                                content: resizedGray,
                                type: 'asset'
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to generate grayscale for ${assetId}`, e);
                }
            }

            // === SQUARE REGION - §4.1 Region: square ===
            if (imageApiOpts.includeSquare) {
                try {
                    const squareSize = Math.min(imgWidth, imgHeight);
                    const squareBlob = await this.extractSquareRegion(file, imgWidth, imgHeight);
                    virtualFiles.push({
                        path: `${imagesBasePath}/${assetId}/square/max/0/default.jpg`,
                        content: squareBlob,
                        type: 'asset'
                    });

                    // Generate smaller square thumbnails (common use case)
                    // Use derivative preset sizes for consistency
                    const thumbnailSizes = getDerivativePreset().sizes.filter(s => s <= 600);
                    for (const targetSize of thumbnailSizes) {
                        if (targetSize < squareSize) {
                            const smallSquare = await this.resizeImage(squareBlob, targetSize, targetSize);
                            virtualFiles.push({
                                path: `${imagesBasePath}/${assetId}/square/${targetSize},${targetSize}/0/default.jpg`,
                                content: smallSquare,
                                type: 'asset'
                            });
                        }
                    }
                } catch (e) {
                    console.warn(`Failed to generate square region for ${assetId}`, e);
                }
            }

            // === TILES FOR DEEP ZOOM - §5.4 Tiles ===
            try {
                const tiles = await this.generateTilePyramid(file, imgWidth, imgHeight, assetId, imagesBasePath, tileSize);
                for (const tile of tiles) {
                    virtualFiles.push({
                        path: tile.path,
                        content: tile.blob,
                        type: 'asset'
                    });
                }
            } catch (e) {
                console.warn(`Failed to generate tiles for ${assetId}`, e);
            }
        }

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
            // Generate canopy.yml configuration
            virtualFiles.push({
                path: 'canopy.yml',
                content: this.generateCanopyConfig(root, options.canopyConfig),
                type: 'info'
            });

            // Generate README with instructions
            virtualFiles.push({
                path: 'README.md',
                content: this.generateCanopyReadme(options.canopyConfig),
                type: 'info'
            });

            // Bundle all template files (package.json, components, layouts, workflows)
            const templateFiles = this.generateCanopyTemplateFiles(options.canopyConfig);
            virtualFiles.push(...templateFiles);

            // Generate content files (index.mdx, about/index.mdx)
            const contentFiles = this.generateContentFiles(root, options.canopyConfig);
            virtualFiles.push(...contentFiles);

            // Generate facet collections for metadata filtering
            if (options.canopyConfig.metadata.length > 0) {
                const facetFiles = this.generateFacetCollections(root, options.canopyConfig);
                virtualFiles.push(...facetFiles);
            }
        }

        return virtualFiles;
    }

    /**
     * Bundles all Canopy template files for a complete, ready-to-run site
     */
    private generateCanopyTemplateFiles(config: CanopyConfig): VirtualFile[] {
        const files: VirtualFile[] = [];
        const port = config.port || DEFAULT_IIIF_PORT;

        // Root config files - package.json uses configured port for serve:iiif script
        files.push({ path: 'package.json', content: generateCanopyPackageJson(port), type: 'info' });
        files.push({ path: '.gitignore', content: CANOPY_GITIGNORE, type: 'info' });
        files.push({ path: 'LICENSE', content: CANOPY_LICENSE, type: 'info' });

        // App scripts and styles
        files.push({ path: 'app/scripts/canopy-build.mts', content: CANOPY_BUILD_SCRIPT, type: 'info' });
        files.push({ path: 'app/styles/index.css', content: CANOPY_STYLES_INDEX, type: 'info' });
        files.push({ path: 'app/styles/custom.css', content: CANOPY_STYLES_CUSTOM, type: 'info' });

        // App components
        files.push({ path: 'app/components/mdx.tsx', content: CANOPY_MDX_COMPONENTS, type: 'info' });
        files.push({ path: 'app/components/Example.tsx', content: CANOPY_EXAMPLE_COMPONENT, type: 'info' });
        files.push({ path: 'app/components/Example.client.tsx', content: CANOPY_EXAMPLE_CLIENT, type: 'info' });

        // Content layouts (customized _app.mdx with title)
        files.push({ path: 'content/_app.mdx', content: generateCanopyAppMdx(config.title), type: 'info' });
        files.push({ path: 'content/_layout.mdx', content: CANOPY_CONTENT_LAYOUT, type: 'info' });
        files.push({ path: 'content/about/_layout.mdx', content: CANOPY_CONTENT_ABOUT_LAYOUT, type: 'info' });
        files.push({ path: 'content/works/_layout.mdx', content: CANOPY_CONTENT_WORKS_LAYOUT, type: 'info' });
        files.push({ path: 'content/search/_layout.mdx', content: CANOPY_CONTENT_SEARCH_LAYOUT, type: 'info' });
        files.push({ path: 'content/search/_result-article.mdx', content: CANOPY_SEARCH_RESULT_ARTICLE, type: 'info' });
        files.push({ path: 'content/search/_result-figure.mdx', content: CANOPY_SEARCH_RESULT_FIGURE, type: 'info' });

        // Static assets
        files.push({ path: 'assets/robots.txt', content: CANOPY_ROBOTS_TXT, type: 'info' });
        files.push({ path: 'assets/canopy.svg', content: CANOPY_LOGO_SVG, type: 'info' });

        // GitHub Actions workflows
        files.push({ path: '.github/workflows/deploy-pages.yml', content: CANOPY_DEPLOY_WORKFLOW, type: 'info' });
        files.push({ path: '.github/workflows/update-canopy-app.yml', content: CANOPY_UPDATE_WORKFLOW, type: 'info' });

        return files;
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
            if (isManifest(item)) {
                const manifestId = item.id;
                item.metadata?.forEach(meta => {
                    const label = this.extractIIIFValue(meta.label);
                    const value = this.extractIIIFValue(meta.value);
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
                if (isCollection(child) || isManifest(child)) {
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
                    '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
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
        const {title} = config;
        const description = this.extractIIIFValue((root as any).summary) || `A IIIF collection featuring ${this.countManifests(root)} items.`;

        // Generate homepage content/index.mdx
        // Include Featured component if user has selected featured items
        const hasFeatured = config.featured && config.featured.length > 0;
        const featuredSection = hasFeatured ? `
<Container>

## Featured Items

<Featured />

</Container>
` : '';

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
/>${featuredSection}

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
        return getAllManifests(item).length;
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
     * Uses centralized getIIIFValue utility from types for consistency
     */
    private extractIIIFValue(val: any): string {
        // Use the centralized utility function from types module
        return getIIIFValue(val, 'none') || getIIIFValue(val, 'en') || '';
    }

    private generateCanopyReadme(config: CanopyConfig): string {
        const featuredInfo = config.featured.length > 0
            ? `*   **Featured Items**: ${config.featured.length} items selected for homepage`
            : '';
        const port = config.port || DEFAULT_IIIF_PORT;

        return `# ${config.title} - Canopy IIIF Site

This is a complete, ready-to-run Canopy IIIF site exported from IIIF Field Studio.

## 🚀 Quick Start

This export includes everything you need - no need to clone the template separately!

1.  **Extract** this archive to a folder

2.  **Install dependencies**
    \`\`\`bash
    npm install
    \`\`\`

3.  **Start the development environment**

    You need to run TWO commands in separate terminals:

    **Terminal 1 - Start the IIIF file server:**
    \`\`\`bash
    npm run serve:iiif
    \`\`\`
    This serves your IIIF files at http://localhost:${port}

    **Terminal 2 - Start the Canopy build:**
    \`\`\`bash
    npm run dev
    \`\`\`

    Or use the combined command (requires both terminals):
    \`\`\`bash
    npm start
    \`\`\`

4.  **Open** http://localhost:5001 in your browser

## 🌐 Deploy to GitHub Pages

Before deploying, update the URLs in \`canopy.yml\`:

1.  Change the collection URL from \`http://localhost:${port}/iiif/...\` to your GitHub Pages URL
    (e.g., \`https://username.github.io/repo-name/iiif/...\`)

2.  Create a new GitHub repository and push this folder

3.  GitHub Actions will automatically build and deploy your site

## ⚙️ Configuration

Your site settings are in \`canopy.yml\`:

*   **Title**: ${config.title}
*   **Theme**: ${config.theme.accentColor} / ${config.theme.grayColor} (${config.theme.appearance})
*   **Search**: ${config.search.enabled ? 'Enabled' : 'Disabled'}
*   **Metadata Facets**: ${config.metadata.length > 0 ? config.metadata.join(', ') : 'None configured'}
${featuredInfo}

## 📦 Contents

\`\`\`
├── canopy.yml              # Site configuration
├── package.json            # Dependencies
├── content/
│   ├── index.mdx           # Homepage
│   ├── about/index.mdx     # About page
│   ├── _app.mdx            # Site header/footer
│   ├── works/_layout.mdx   # Manifest page layout
│   └── search/_layout.mdx  # Search results layout
├── assets/
│   └── iiif/
│       ├── collections/    # IIIF Collection JSON
│       ├── manifests/      # IIIF Manifest JSON
│       ├── images/         # Image derivatives
│       └── api/facet/      # Metadata facet collections
├── app/
│   ├── scripts/            # Build scripts
│   ├── styles/             # Custom CSS
│   └── components/         # Custom components
└── .github/workflows/      # Auto-deploy workflows
\`\`\`

## 📖 Documentation

*   [Canopy IIIF Docs](https://canopy-iiif.github.io/app/docs/)
*   [IIIF Field Studio](https://github.com/micahchoo/field-studio)

---
*Generated with IIIF Field Studio*
`;
    }

    private generateCanopyConfig(root: IIIFItem, config: CanopyConfig): string {
        const rootIdVal = root.id.split('/').pop();
        const rootType = `${root.type.toLowerCase()}s`; // Plural for Canopy
        const port = config.port || DEFAULT_IIIF_PORT;

        // For local development, IIIF files are served from http://localhost:{port}/iiif/
        // When deployed, use the baseUrl (or site URL) instead
        const iiifBaseUrl = config.baseUrl || `http://localhost:${port}`;
        const rootPath = `${iiifBaseUrl}/iiif/${rootType}/${rootIdVal}.json`;

        // Determine correct key based on root item type
        const entryKey = isManifest(root) ? 'manifest:' : 'collection:';

        // Convert featured manifest IDs to Canopy format
        const featuredPaths = config.featured.map(id => {
            const idVal = id.split('/').pop();
            return `${iiifBaseUrl}/iiif/manifests/${idVal}.json`;
        });

        // YAML construction manually to avoid extra dependencies
        const lines = [
            `title: "${config.title.replace(/"/g, '\\"')}"`,
            ...(config.baseUrl ? [`baseUrl: "${config.baseUrl}"`] : []),
            '',
            '# IIIF Collection source (uses local server during development)',
            '# Update to your deployed URL for production',
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
     * Generates IIIF Image API info.json with optional tile support for deep zoom
     * Implements IIIF Image API 3.0 §5 Image Information
     *
     * @param assetId - Unique identifier for this image
     * @param width - Actual image width in pixels
     * @param height - Actual image height in pixels
     * @param isCanopy - Whether this is for Canopy export (uses absolute localhost URLs)
     * @param includeTiles - Whether to include tile definitions for deep zoom support
     * @param imageApiOptions - Additional IIIF Image API options
     * @param rights - Optional rights/license URI for the image
     */
    private generateImageInfoJsonForExport(
        assetId: string,
        width: number,
        height: number,
        isCanopy: boolean = false,
        includeTiles: boolean = false,
        imageApiOptions?: ImageApiOptions,
        rights?: string,
        port: number = DEFAULT_IIIF_PORT
    ): string {
        // For Canopy, use absolute localhost URL with configured port; for others, use relative path
        const basePath = isCanopy
            ? `http://localhost:${port}/iiif/images/${assetId}`
            : `images/${assetId}`;

        // Calculate scale factors for tile pyramid
        const tileSize = imageApiOptions?.tileSize || 512;
        const scaleFactors: number[] = [];
        if (includeTiles) {
            const maxDim = Math.max(width, height);
            let sf = 1;
            while (maxDim / sf > tileSize) {
                scaleFactors.push(sf);
                sf *= 2;
            }
            scaleFactors.push(sf);
        }

        // Build extra formats array based on options
        const extraFormats: string[] = [];
        if (imageApiOptions?.includeWebP) {
            extraFormats.push('webp');
        }

        // Build extra qualities array
        const extraQualities: string[] = [];
        if (imageApiOptions?.includeGrayscale) {
            extraQualities.push('gray');
            extraQualities.push('color'); // Explicitly declare color support
        }

        // Build extra features based on what we support
        const extraFeatures: string[] = [];
        if (imageApiOptions?.includeSquare) {
            extraFeatures.push('regionSquare');
        }
        // We support these features for Level 0 pre-generated content
        extraFeatures.push('sizeByWh'); // We pre-generate specific w,h sizes

        // Generate info.json with full IIIF Image API 3.0 compliance
        const info: any = {
            '@context': IIIF_SPEC.IMAGE_3.CONTEXT,
            id: basePath,
            type: 'ImageService3',
            protocol: IIIF_SPEC.IMAGE_3.PROTOCOL,
            profile: 'level0',
            width,
            height,
            // Pre-generated sizes for quick loading (§5.3)
            sizes: generateStandardSizes(width, height, Math.max(...DEFAULT_DERIVATIVE_SIZES))
        };

        // Add tiles for deep zoom if requested (§5.4)
        if (includeTiles && scaleFactors.length > 0) {
            info.tiles = [{
                width: tileSize,
                height: tileSize,
                scaleFactors
            }];
        }

        // Add preferred formats hint (§5.5)
        if (extraFormats.length > 0) {
            info.preferredFormats = ['webp', 'jpg']; // WebP is more efficient
            info.extraFormats = extraFormats;
        }

        // Add extra qualities (§5.7)
        if (extraQualities.length > 0) {
            info.extraQualities = extraQualities;
        }

        // Add extra features (§5.7)
        if (extraFeatures.length > 0) {
            info.extraFeatures = extraFeatures;
        }

        // Add rights information if available (§5.6)
        if (rights) {
            info.rights = rights;
        }

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

        // Sanitize values for safe HTML embedding
        const sanitizeHtmlAttr = (str: string): string => {
            return str
                .replace(/&/g, '&')
                .replace(/</g, '<')
                .replace(/>/g, '>')
                .replace(/"/g, '"')
                .replace(/'/g, '&#x27;');
        };

        const safeTitle = sanitizeHtmlAttr(title);
        const safeManifestUrl = sanitizeHtmlAttr(manifestUrl);

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
            <h1>${safeTitle}</h1>
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
                <strong>Entry Point:</strong> <code>${safeManifestUrl}</code>
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
        const manifestUri = '${safeManifestUrl}';

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
