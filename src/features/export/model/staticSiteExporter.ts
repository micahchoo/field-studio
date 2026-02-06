/**
 * Static Site Exporter - Wax-Compatible Static Exhibition Generator
 *
 * Transforms Field Studio projects into self-contained static websites
 * that can be deployed to GitHub Pages, S3, Netlify, or any static host.
 *
 *
 * @see ARCHITECTURE_INSPIRATION.md - "Static-First Infrastructure (Wax)"
 */

import { getIIIFValue, IIIFCanvas, IIIFCollection, IIIFItem, IIIFManifest, isCanvas, isCollection, isManifest } from '@/src/shared/types';
import { storage } from '@/src/shared/services/storage';
import { LunrDocument, searchService } from '@/src/shared/services/searchService';
import { DEFAULT_SEARCH_CONFIG, fieldRegistry } from '@/src/shared/services/fieldRegistry';
import {
  createImageServiceReference,
  generateInfoJson,
  generateStandardSizes,
  getAllCanvases,
  getAllManifests,
  ImageApiProfile,
  isPaintingMotivation
} from '@/utils';
import { DEFAULT_DERIVATIVE_SIZES, getDerivativePreset, IIIF_SPEC } from '@/src/shared/constants';

// ============================================================================
// Types
// ============================================================================

export interface StaticSiteConfig {
  /** Base URL for the deployed site */
  baseUrl: string;
  /** Site title */
  title: string;
  /** Site description */
  description?: string;
  /** Collection name (used in paths) */
  collectionName: string;
  /** Derivative preset name (wax-compatible, level0-static, etc.) */
  derivativePreset?: string;
  /** Tile sizes to generate */
  tileSizes: number[];
  /** Thumbnail width */
  thumbnailWidth: number;
  /** Full image width */
  fullWidth: number;
  /** Include search index (always true for static exports) */
  includeSearch: boolean;
  /** Search fields to index (uses FieldRegistry defaults if not specified) */
  searchFields: string[];
  /** Include Universal Viewer */
  includeViewer: boolean;
  /** Page template style */
  template: 'minimal' | 'gallery' | 'scholarly';
}

export interface StaticSiteExportResult {
  success: boolean;
  files: StaticFile[];
  itemCount: number;
  imageCount: number;
  errors: string[];
}

export interface StaticFile {
  path: string;
  content: string | Blob;
  type: 'html' | 'json' | 'yaml' | 'js' | 'css' | 'image';
}

// LunrDocument is now imported from searchService

// ============================================================================
// Default Configuration
// ============================================================================

// Default config uses level0-static preset and FieldRegistry search fields
const DEFAULT_CONFIG: StaticSiteConfig = {
  baseUrl: '',
  title: 'IIIF Collection',
  collectionName: 'objects',
  derivativePreset: 'level0-static',
  tileSizes: [256],
  thumbnailWidth: 250,
  fullWidth: 1140,
  includeSearch: true,  // Always true for WAX-compatible exports
  searchFields: DEFAULT_SEARCH_CONFIG.fields,  // Uses FieldRegistry defaults
  includeViewer: true,
  template: 'gallery'
};

// ============================================================================
// Static Site Exporter
// ============================================================================

class StaticSiteExporter {
  /**
   * Export a complete static site from the IIIF root
   */
  async exportSite(
    root: IIIFItem,
    config: Partial<StaticSiteConfig> = {}
  ): Promise<StaticSiteExportResult> {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const files: StaticFile[] = [];
    const errors: string[] = [];
    let imageCount = 0;

    try {
      // 1. Collect all items
      const items = this.collectItems(root);

      // 2. Generate metadata JSON (_data/items.json)
      const metadata = this.generateMetadataJson(items, cfg);
      files.push({
        path: '_data/items.json',
        content: JSON.stringify(metadata, null, 2),
        type: 'json'
      });

      // 3. Generate YAML metadata for Jekyll compatibility
      const yamlMetadata = this.generateMetadataYaml(items, cfg);
      files.push({
        path: '_data/items.yml',
        content: yamlMetadata,
        type: 'yaml'
      });

      // 4. Generate item pages
      for (const item of items) {
        try {
          const page = this.generateItemPage(item, cfg);
          const slug = this.slugify(item.id);
          files.push({
            path: `${cfg.collectionName}/${slug}.html`,
            content: page,
            type: 'html'
          });
        } catch (e) {
          errors.push(`Failed to generate page for ${item.id}: ${e}`);
        }
      }

      // 5. Generate IIIF tiles and derivatives
      for (const item of items) {
        if (isCanvas(item)) {
          try {
            const tileFiles = await this.generateTiles(item, cfg);
            files.push(...tileFiles);
            imageCount += tileFiles.filter(f => f.type === 'image').length;
          } catch (e) {
            errors.push(`Failed to generate tiles for ${item.id}: ${e}`);
          }
        }
      }

      // 6. Generate IIIF manifests (static JSON)
      const manifests = this.collectManifests(root);
      for (const manifest of manifests) {
        const manifestJson = this.generateStaticManifest(manifest, cfg);
        const slug = this.slugify(manifest.id);
        files.push({
          path: `iiif/${slug}/manifest.json`,
          content: JSON.stringify(manifestJson, null, 2),
          type: 'json'
        });
      }

      // 7. Generate collection manifest
      if (isCollection(root)) {
        const collectionJson = this.generateCollectionManifest(root as IIIFCollection, manifests, cfg);
        files.push({
          path: 'iiif/collection.json',
          content: JSON.stringify(collectionJson, null, 2),
          type: 'json'
        });
      }

      // 8. Generate search index (always included for WAX-compatible exports)
      // Uses searchService.exportLunrIndex() with FieldRegistry configuration
      const searchIndex = this.generateSearchIndex(root, cfg);
      files.push({
        path: 'search/index.json',
        content: JSON.stringify(searchIndex, null, 2),
        type: 'json'
      });

      // Lunr.js configuration
      const lunrConfig = this.generateLunrConfig(root, cfg);
      files.push({
        path: 'js/lunr-config.js',
        content: lunrConfig,
        type: 'js'
      });

      // 9. Generate index page (gallery)
      const indexPage = this.generateIndexPage(items, cfg);
      files.push({
        path: 'index.html',
        content: indexPage,
        type: 'html'
      });

      // 10. Generate browse page
      const browsePage = this.generateBrowsePage(items, cfg);
      files.push({
        path: 'browse.html',
        content: browsePage,
        type: 'html'
      });

      // 11. Add viewer assets if requested
      if (cfg.includeViewer) {
        const viewerFiles = this.generateViewerAssets(cfg);
        files.push(...viewerFiles);
      }

      // 12. Generate CSS
      const css = this.generateStylesheet(cfg);
      files.push({
        path: 'css/style.css',
        content: css,
        type: 'css'
      });

      return {
        success: errors.length === 0,
        files,
        itemCount: items.length,
        imageCount,
        errors
      };
    } catch (e) {
      return {
        success: false,
        files,
        itemCount: 0,
        imageCount: 0,
        errors: [`Export failed: ${e}`]
      };
    }
  }

  /**
   * Collect all items (canvases) from the tree
   */
  private collectItems(root: IIIFItem): IIIFCanvas[] {
    return getAllCanvases(root);
  }

  /**
   * Collect all manifests from the tree
   */
  private collectManifests(root: IIIFItem): IIIFManifest[] {
    return getAllManifests(root);
  }

  /**
   * Generate _data/items.json metadata
   */
  private generateMetadataJson(items: IIIFItem[], cfg: StaticSiteConfig): object[] {
    return items.map((item, index) => {
      const pid = this.slugify(item.id);
      const label = getIIIFValue(item.label) || `Item ${index + 1}`;

      // Extract metadata pairs
      const metadata: Record<string, string> = {};
      if (item.metadata) {
        for (const entry of item.metadata) {
          const key = getIIIFValue(entry.label) || 'unknown';
          const value = getIIIFValue(entry.value) || '';
          metadata[this.slugify(key)] = value;
        }
      }

      return {
        pid,
        order: index,
        label,
        summary: getIIIFValue((item as any).summary) || '',
        thumbnail: `img/derivatives/iiif/${pid}/full/${cfg.thumbnailWidth},/0/default.jpg`,
        full: `img/derivatives/iiif/${pid}/full/${cfg.fullWidth},/0/default.jpg`,
        manifest: `iiif/${this.getParentManifestSlug(item)}/manifest.json`,
        ...metadata
      };
    });
  }

  /**
   * Generate YAML metadata (Jekyll-compatible)
   */
  private generateMetadataYaml(items: IIIFItem[], cfg: StaticSiteConfig): string {
    const lines: string[] = [];

    for (const item of items) {
      const pid = this.slugify(item.id);
      const label = getIIIFValue(item.label) || 'Untitled';

      lines.push(`- pid: "${pid}"`);
      lines.push(`  label: "${this.escapeYaml(label)}"`);

      if ((item as any).summary) {
        const summary = getIIIFValue((item as any).summary);
        if (summary) {
          lines.push(`  summary: "${this.escapeYaml(summary)}"`);
        }
      }

      if (item.metadata) {
        for (const entry of item.metadata) {
          const key = this.slugify(getIIIFValue(entry.label) || 'field');
          const value = getIIIFValue(entry.value) || '';
          lines.push(`  ${key}: "${this.escapeYaml(value)}"`);
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate an individual item page
   */
  private generateItemPage(item: IIIFItem, cfg: StaticSiteConfig): string {
    const pid = this.slugify(item.id);
    const label = getIIIFValue(item.label) || 'Untitled';
    const summary = getIIIFValue((item as any).summary) || '';

    // Build metadata table
    let metadataHtml = '';
    if (item.metadata && item.metadata.length > 0) {
      metadataHtml = '<table class="metadata-table">\n';
      for (const entry of item.metadata) {
        const key = getIIIFValue(entry.label) || '';
        const value = getIIIFValue(entry.value) || '';
        metadataHtml += `  <tr><th>${this.escapeHtml(key)}</th><td>${this.escapeHtml(value)}</td></tr>\n`;
      }
      metadataHtml += '</table>';
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(label)} | ${this.escapeHtml(cfg.title)}</title>
  <link rel="stylesheet" href="${cfg.baseUrl}/css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/openseadragon@3.1/openseadragon.min.js"></script>
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="${cfg.baseUrl}/" class="site-title">${this.escapeHtml(cfg.title)}</a>
      <a href="${cfg.baseUrl}/browse.html">Browse</a>
      ${cfg.includeSearch ? `<a href="${cfg.baseUrl}/search.html">Search</a>` : ''}
    </nav>
  </header>

  <main class="item-page">
    <article class="item">
      <h1>${this.escapeHtml(label)}</h1>
      ${summary ? `<p class="summary">${this.escapeHtml(summary)}</p>` : ''}

      <div id="viewer" class="iiif-viewer"></div>

      <section class="metadata">
        <h2>Details</h2>
        ${metadataHtml}
      </section>

      <section class="iiif-links">
        <h3>IIIF Resources</h3>
        <a href="${cfg.baseUrl}/iiif/${this.getParentManifestSlug(item)}/manifest.json" class="manifest-link">
          <img src="https://iiif.io/assets/images/logos/logo-sm.png" alt="IIIF" width="20">
          View Manifest
        </a>
      </section>
    </article>
  </main>

  <footer class="site-footer">
    <p>Generated with <a href="https://github.com/biiif/field-studio">IIIF Field Studio</a></p>
  </footer>

  <script>
    OpenSeadragon({
      id: 'viewer',
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@3.1/images/',
      tileSources: '${cfg.baseUrl}/img/derivatives/iiif/${pid}/info.json',
      showNavigator: true
    });
  </script>
</body>
</html>`;
  }

  /**
   * Generate IIIF tiles for a canvas (Level 0 - pre-computed)
   * Uses derivative preset configuration for size generation
   */
  private async generateTiles(canvas: IIIFCanvas, cfg: StaticSiteConfig): Promise<StaticFile[]> {
    const files: StaticFile[] = [];
    const pid = this.slugify(canvas.id);

    // Get derivative preset for size configuration
    const preset = getDerivativePreset(cfg.derivativePreset);

    // Get the painting annotation's body (the image)
    const paintingAnno = this.getPaintingAnnotation(canvas);
    if (!paintingAnno) return files;

    const imageId = typeof paintingAnno.body === 'string'
      ? paintingAnno.body
      : (paintingAnno.body as any)?.id;

    if (!imageId) return files;

    // Try to get the image from storage
    const imageData = await storage.getAsset(imageId);

    if (imageData) {
      // Generate info.json (Level 0 - static tiles)
      const infoJson = this.generateImageServiceInfo(canvas, pid, cfg);
      files.push({
        path: `img/derivatives/iiif/${pid}/info.json`,
        content: JSON.stringify(infoJson, null, 2),
        type: 'json'
      });

      // Generate size variants using preset configuration
      // Combines preset sizes with any additional tile sizes from config
      const allSizes = new Set([
        cfg.thumbnailWidth,
        cfg.fullWidth,
        ...preset.sizes,
        ...cfg.tileSizes
      ]);

      for (const width of allSizes) {
        if (width <= 0) continue;  // Skip invalid sizes (e.g., Level 2 dynamic fullWidth=0)
        // Note: In a real implementation, we'd use canvas/sharp to resize
        // For now, we store the original and let the browser scale
        files.push({
          path: `img/derivatives/iiif/${pid}/full/${width},/0/default.jpg`,
          content: imageData,
          type: 'image'
        });
      }

      // Full size
      files.push({
        path: `img/derivatives/iiif/${pid}/full/max/0/default.jpg`,
        content: imageData,
        type: 'image'
      });
    }

    return files;
  }

  /**
   * Generate IIIF Image API info.json (Level 0)
   * Uses centralized Image API utilities and derivative presets for spec compliance
   */
  private generateImageServiceInfo(canvas: IIIFCanvas, pid: string, cfg: StaticSiteConfig): object {
    const width = canvas.width || 1000;
    const height = canvas.height || 1000;

    // Get derivative preset for size configuration
    const preset = getDerivativePreset(cfg.derivativePreset);

    // Combine preset sizes with config overrides
    const targetWidths = [
      cfg.thumbnailWidth,
      cfg.fullWidth > 0 ? cfg.fullWidth : preset.fullWidth,
      ...preset.sizes.filter(s => s > 0)
    ].filter((v, i, a) => v > 0 && a.indexOf(v) === i);  // Dedupe and filter zeros

    // Use centralized info.json generation
    return generateInfoJson(
      `${cfg.baseUrl}/img/derivatives/iiif/${pid}`,
      width,
      height,
      'level0',
      {
        sizes: generateStandardSizes(width, height, targetWidths),
        tiles: cfg.tileSizes.map(size => ({
          width: size,
          scaleFactors: preset.scaleFactors
        }))
      }
    );
  }

  /**
   * Generate static manifest JSON
   */
  private generateStaticManifest(manifest: IIIFManifest, cfg: StaticSiteConfig): object {
    const slug = this.slugify(manifest.id);

    // Rewrite image service URLs to point to static files
    const rewriteCanvas = (canvas: IIIFCanvas): object => {
      const pid = this.slugify(canvas.id);
      return {
        ...canvas,
        items: canvas.items?.map(page => ({
          ...page,
          items: (page as any).items?.map((anno: any) => ({
            ...anno,
            body: anno.body ? {
              ...(typeof anno.body === 'object' ? anno.body : { id: anno.body }),
              // Use centralized service reference creation
              service: [createImageServiceReference(`${cfg.baseUrl}/img/derivatives/iiif/${pid}`, 'level0')]
            } : anno.body
          }))
        }))
      };
    };

    return {
      '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: `${cfg.baseUrl}/iiif/${slug}/manifest.json`,
      type: 'Manifest',
      label: manifest.label,
      summary: (manifest as any).summary,
      metadata: manifest.metadata,
      items: manifest.items?.map(item =>
        isCanvas(item) ? rewriteCanvas(item as IIIFCanvas) : item
      )
    };
  }

  /**
   * Generate collection manifest
   */
  private generateCollectionManifest(
    collection: IIIFCollection,
    manifests: IIIFManifest[],
    cfg: StaticSiteConfig
  ): object {
    return {
      '@context': IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: `${cfg.baseUrl}/iiif/collection.json`,
      type: 'Collection',
      label: collection.label || { en: [cfg.title] },
      summary: (collection as any).summary,
      items: manifests.map(m => ({
        id: `${cfg.baseUrl}/iiif/${this.slugify(m.id)}/manifest.json`,
        type: 'Manifest',
        label: m.label,
        thumbnail: m.items?.[0] ? [{
          id: `${cfg.baseUrl}/img/derivatives/iiif/${this.slugify(m.items[0].id)}/full/${cfg.thumbnailWidth},/0/default.jpg`,
          type: 'Image',
          format: 'image/jpeg'
        }] : undefined
      }))
    };
  }

  /**
   * Generate Lunr.js search index using the centralized searchService
   * Follows WAX pattern with configurable fields and diacritic normalization
   */
  private generateSearchIndex(root: IIIFItem, cfg: StaticSiteConfig): object {
    // Build search config from configured fields
    const searchConfig = fieldRegistry.buildSearchConfig(cfg.searchFields);

    // Use searchService.exportLunrIndex for consistent indexing
    const lunrExport = searchService.exportLunrIndex(
      root,
      searchConfig,
      cfg.baseUrl,
      cfg.collectionName
    );

    return {
      documents: lunrExport.documents,
      fields: lunrExport.fields.map(f => f.name),
      ref: lunrExport.ref
    };
  }

  /**
   * Generate Lunr.js configuration script
   * Uses searchService for consistent configuration
   */
  private generateLunrConfig(root: IIIFItem, cfg: StaticSiteConfig): string {
    // Build search config from configured fields
    const searchConfig = fieldRegistry.buildSearchConfig(cfg.searchFields);

    // Use searchService to generate consistent Lunr.js config
    const lunrExport = searchService.exportLunrIndex(
      root,
      searchConfig,
      cfg.baseUrl,
      cfg.collectionName
    );

    return lunrExport.lunrConfigJs;
  }

  /**
   * Generate index page
   */
  private generateIndexPage(items: IIIFItem[], cfg: StaticSiteConfig): string {
    const featuredItems = items.slice(0, 6);

    const galleryHtml = featuredItems.map(item => {
      const pid = this.slugify(item.id);
      const label = getIIIFValue(item.label) || 'Untitled';
      return `
        <a href="${cfg.collectionName}/${pid}.html" class="gallery-item">
          <img src="img/derivatives/iiif/${pid}/full/${cfg.thumbnailWidth},/0/default.jpg" alt="${this.escapeHtml(label)}" loading="lazy">
          <span class="label">${this.escapeHtml(label)}</span>
        </a>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(cfg.title)}</title>
  <meta name="description" content="${this.escapeHtml(cfg.description || '')}">
  <link rel="stylesheet" href="${cfg.baseUrl}/css/style.css">
</head>
<body>
  <header class="site-header hero">
    <h1>${this.escapeHtml(cfg.title)}</h1>
    ${cfg.description ? `<p class="description">${this.escapeHtml(cfg.description)}</p>` : ''}
    <nav>
      <a href="${cfg.baseUrl}/browse.html" class="btn">Browse Collection</a>
      ${cfg.includeSearch ? `<a href="${cfg.baseUrl}/search.html" class="btn">Search</a>` : ''}
    </nav>
  </header>

  <main>
    <section class="featured">
      <h2>Featured Items</h2>
      <div class="gallery">
        ${galleryHtml}
      </div>
      <a href="${cfg.baseUrl}/browse.html" class="view-all">View all ${items.length} items</a>
    </section>

    <section class="about">
      <h2>About This Collection</h2>
      <p>This digital collection contains ${items.length} items presented using the
      <a href="https://iiif.io">International Image Interoperability Framework (IIIF)</a>.</p>
      <p class="iiif-badge">
        <a href="${cfg.baseUrl}/iiif/collection.json">
          <img src="https://iiif.io/assets/images/logos/logo-sm.png" alt="IIIF Collection">
          IIIF Collection Manifest
        </a>
      </p>
    </section>
  </main>

  <footer class="site-footer">
    <p>Generated with <a href="https://github.com/biiif/field-studio">IIIF Field Studio</a></p>
  </footer>
</body>
</html>`;
  }

  /**
   * Generate browse page with all items
   */
  private generateBrowsePage(items: IIIFItem[], cfg: StaticSiteConfig): string {
    const galleryHtml = items.map(item => {
      const pid = this.slugify(item.id);
      const label = getIIIFValue(item.label) || 'Untitled';
      return `
        <a href="${cfg.collectionName}/${pid}.html" class="gallery-item">
          <img src="img/derivatives/iiif/${pid}/full/${cfg.thumbnailWidth},/0/default.jpg" alt="${this.escapeHtml(label)}" loading="lazy">
          <span class="label">${this.escapeHtml(label)}</span>
        </a>`;
    }).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Browse | ${this.escapeHtml(cfg.title)}</title>
  <link rel="stylesheet" href="${cfg.baseUrl}/css/style.css">
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="${cfg.baseUrl}/" class="site-title">${this.escapeHtml(cfg.title)}</a>
      <a href="${cfg.baseUrl}/browse.html" class="active">Browse</a>
      ${cfg.includeSearch ? `<a href="${cfg.baseUrl}/search.html">Search</a>` : ''}
    </nav>
  </header>

  <main>
    <h1>Browse Collection</h1>
    <p class="count">${items.length} items</p>
    <div class="gallery browse-gallery">
      ${galleryHtml}
    </div>
  </main>

  <footer class="site-footer">
    <p>Generated with <a href="https://github.com/biiif/field-studio">IIIF Field Studio</a></p>
  </footer>
</body>
</html>`;
  }

  /**
   * Generate viewer assets (OpenSeadragon wrapper)
   */
  private generateViewerAssets(cfg: StaticSiteConfig): StaticFile[] {
    const files: StaticFile[] = [];

    // Viewer page that accepts manifest URL
    const viewerPage = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Viewer | ${this.escapeHtml(cfg.title)}</title>
  <link rel="stylesheet" href="${cfg.baseUrl}/css/style.css">
  <script src="https://cdn.jsdelivr.net/npm/openseadragon@3.1/openseadragon.min.js"></script>
  <style>
    #viewer { width: 100%; height: calc(100vh - 80px); background: #1a1a1a; }
  </style>
</head>
<body>
  <header class="site-header">
    <nav>
      <a href="${cfg.baseUrl}/" class="site-title">${this.escapeHtml(cfg.title)}</a>
      <a href="${cfg.baseUrl}/browse.html">Browse</a>
    </nav>
  </header>
  <div id="viewer"></div>
  <script>
    const params = new URLSearchParams(window.location.search);
    const manifest = params.get('manifest');
    const canvas = params.get('canvas');

    if (manifest) {
      fetch(manifest)
        .then(r => r.json())
        .then(m => {
          const canvasData = canvas
            ? m.items.find(c => c.id === canvas)
            : m.items[0];
          if (canvasData && canvasData.items?.[0]?.items?.[0]?.body?.service) {
            OpenSeadragon({
              id: 'viewer',
              prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@3.1/images/',
              tileSources: canvasData.items[0].items[0].body.service[0].id + '/info.json',
              showNavigator: true
            });
          }
        });
    }
  </script>
</body>
</html>`;

    files.push({
      path: 'viewer.html',
      content: viewerPage,
      type: 'html'
    });

    return files;
  }

  /**
   * Generate stylesheet
   */
  private generateStylesheet(cfg: StaticSiteConfig): string {
    return `/* IIIF Field Studio - Static Site Styles */
:root {
  --iiif-blue: #2f5496;
  --iiif-red: #ed1d33;
  --bg: #fafafa;
  --text: #1a1a1a;
  --border: #e0e0e0;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.site-header {
  background: var(--iiif-blue);
  color: white;
  padding: 1rem 2rem;
}

.site-header.hero {
  padding: 4rem 2rem;
  text-align: center;
}

.site-header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
.site-header .description { opacity: 0.9; margin-bottom: 1.5rem; }

.site-header nav {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.site-header nav a {
  color: white;
  text-decoration: none;
  font-weight: 500;
}

.site-header nav a.site-title { font-weight: 700; font-size: 1.25rem; }
.site-header nav a:hover { text-decoration: underline; }
.site-header nav a.active { border-bottom: 2px solid white; }

.btn {
  display: inline-block;
  background: white;
  color: var(--iiif-blue);
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 600;
}

.btn:hover { background: #f0f0f0; }

main { max-width: 1200px; margin: 0 auto; padding: 2rem; }

.featured, .about { margin-bottom: 3rem; }
.featured h2, .about h2 { margin-bottom: 1.5rem; color: var(--iiif-blue); }

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
}

.browse-gallery {
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.gallery-item {
  display: block;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}

.gallery-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.gallery-item img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.gallery-item .label {
  display: block;
  padding: 0.75rem;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.view-all {
  display: block;
  text-align: center;
  margin-top: 1.5rem;
  color: var(--iiif-blue);
  font-weight: 500;
}

.iiif-badge img { height: 20px; vertical-align: middle; margin-right: 0.5rem; }

/* Item Page */
.item-page { max-width: 900px; }
.item h1 { margin-bottom: 1rem; }
.item .summary { font-size: 1.1rem; color: #555; margin-bottom: 2rem; }

.iiif-viewer {
  width: 100%;
  height: 500px;
  background: #1a1a1a;
  border-radius: 8px;
  margin-bottom: 2rem;
}

.metadata { margin-bottom: 2rem; }
.metadata h2 { font-size: 1.25rem; margin-bottom: 1rem; color: var(--iiif-blue); }

.metadata-table {
  width: 100%;
  border-collapse: collapse;
}

.metadata-table th, .metadata-table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  text-align: left;
}

.metadata-table th {
  width: 30%;
  font-weight: 600;
  color: #555;
}

.iiif-links a {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--iiif-blue);
  text-decoration: none;
  font-weight: 500;
}

.site-footer {
  text-align: center;
  padding: 2rem;
  color: #666;
  font-size: 0.9rem;
  border-top: 1px solid var(--border);
  margin-top: 3rem;
}

.site-footer a { color: var(--iiif-blue); }

.count { color: #666; margin-bottom: 1.5rem; }

@media (max-width: 768px) {
  .site-header.hero { padding: 2rem 1rem; }
  .site-header h1 { font-size: 1.75rem; }
  main { padding: 1rem; }
  .gallery { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
}
`;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private slugify(str: string | undefined | null): string {
    if (!str) return 'item';
    return String(str)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'item';
  }

  private escapeHtml(str: string | undefined | null): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapeYaml(str: string | undefined | null): string {
    if (!str) return '';
    return String(str).replace(/"/g, '\\"').replace(/\n/g, ' ');
  }

  private normalizeForSearch(str: string | undefined | null): string {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getPaintingAnnotation(canvas: IIIFCanvas): any {
    const page = canvas.items?.[0];
    if (!page || !(page as any).items) return null;
    return (page as any).items.find((a: any) => isPaintingMotivation(a.motivation));
  }

  private getParentManifestSlug(item: IIIFItem): string {
    // For now, use a simple hash of the item ID
    return this.slugify(item.id.split('/').slice(0, -1).join('/') || 'manifest');
  }

  /**
   * Download the export as a ZIP file
   */
  async downloadAsZip(result: StaticSiteExportResult, filename: string = 'static-site.zip'): Promise<void> {
    // Use JSZip (would need to be imported)
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const file of result.files) {
      if (file.content instanceof Blob) {
        zip.file(file.path, file.content);
      } else {
        zip.file(file.path, file.content);
      }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}

export const staticSiteExporter = new StaticSiteExporter();
