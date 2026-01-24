/**
 * Archival Package Export Service
 *
 * Implements digital preservation export formats:
 * - OCFL (Oxford Common File Layout) - https://ocfl.io/
 * - BagIt (RFC 8493) - https://tools.ietf.org/html/rfc8493
 *
 * These formats ensure manifests meet long-term digital preservation standards
 * for repository ingest.
 */

import { IIIFItem, IIIFManifest, IIIFCanvas, getIIIFValue } from '../types';
import { storage } from './storage';

// ============================================================================
// Types
// ============================================================================

export interface OCFLObject {
  id: string;
  type: 'https://iiif.io/api/presentation/3/context.json#Manifest';
  digestAlgorithm: 'sha512' | 'sha256';
  head: string; // Current version
  manifest: OCFLInventory;
  versions: OCFLVersion[];
}

export interface OCFLInventory {
  id: string;
  type: 'https://ocfl.io/1.1/spec/#inventory';
  digestAlgorithm: 'sha512' | 'sha256';
  head: string;
  contentDirectory?: string;
  manifest: Record<string, string[]>; // digest -> paths
  versions: Record<string, OCFLVersionBlock>;
}

export interface OCFLVersionBlock {
  created: string;
  message?: string;
  user?: { name: string; address?: string };
  state: Record<string, string[]>; // digest -> logical paths
}

export interface OCFLVersion {
  number: string;
  created: Date;
  message?: string;
  user?: string;
  files: OCFLFile[];
}

export interface OCFLFile {
  logicalPath: string;
  contentPath: string;
  digest: string;
  size: number;
}

export interface BagItBag {
  version: '1.0';
  tagFileEncoding: 'UTF-8';
  payloadOxum: string; // "octetCount.streamCount"
  baggingDate: string;
  sourceOrganization?: string;
  externalDescription?: string;
  externalIdentifier?: string;
  bagSize?: string;
  payloadFiles: BagItFile[];
  tagFiles: BagItFile[];
  manifests: BagItManifest[];
  tagManifests: BagItManifest[];
}

export interface BagItFile {
  path: string;
  content: string | Blob;
  size: number;
}

export interface BagItManifest {
  algorithm: 'sha256' | 'sha512' | 'md5';
  entries: Array<{ digest: string; path: string }>;
}

export interface ArchivalPackageOptions {
  /** Include original media files */
  includeMedia: boolean;
  /** Digest algorithm */
  digestAlgorithm: 'sha256' | 'sha512';
  /** Organization name */
  organization?: string;
  /** Description */
  description?: string;
  /** External identifier */
  externalId?: string;
  /** Version message */
  versionMessage?: string;
  /** User info */
  user?: { name: string; email?: string };
}

export interface ArchivalPackageResult {
  success: boolean;
  files: Array<{ path: string; content: string | Blob }>;
  errors: string[];
  stats: {
    totalFiles: number;
    totalSize: number;
    mediaFiles: number;
    metadataFiles: number;
  };
}

// ============================================================================
// Archival Package Service
// ============================================================================

class ArchivalPackageService {
  /**
   * Export as OCFL object
   */
  async exportOCFL(
    root: IIIFItem,
    options: ArchivalPackageOptions
  ): Promise<ArchivalPackageResult> {
    const files: Array<{ path: string; content: string | Blob }> = [];
    const errors: string[] = [];
    let totalSize = 0;
    let mediaFiles = 0;
    let metadataFiles = 0;

    try {
      const objectId = this.sanitizeId(root.id);
      const version = 'v1';
      const created = new Date().toISOString();

      // Collect all files and compute digests
      const contentFiles: Array<{
        logicalPath: string;
        content: string | Blob;
        digest: string;
        size: number;
      }> = [];

      // 1. Add manifest JSON
      const manifestJson = JSON.stringify(root, null, 2);
      const manifestDigest = await this.computeDigest(manifestJson, options.digestAlgorithm);
      contentFiles.push({
        logicalPath: 'manifest.json',
        content: manifestJson,
        digest: manifestDigest,
        size: new Blob([manifestJson]).size
      });
      metadataFiles++;

      // 2. Collect media files from canvases
      if (options.includeMedia) {
        const canvases = this.collectCanvases(root);
        for (const canvas of canvases) {
          try {
            const mediaFile = await this.extractCanvasMedia(canvas, options.digestAlgorithm);
            if (mediaFile) {
              contentFiles.push(mediaFile);
              mediaFiles++;
            }
          } catch (e) {
            errors.push(`Failed to extract media from canvas ${canvas.id}: ${e}`);
          }
        }
      }

      // Build OCFL structure

      // 0=ocfl_object_1.1 marker file
      files.push({
        path: `${objectId}/0=ocfl_object_1.1`,
        content: 'ocfl_object_1.1\n'
      });

      // Build manifest (digest -> content paths)
      const manifestMap: Record<string, string[]> = {};
      const stateMap: Record<string, string[]> = {};

      for (const file of contentFiles) {
        const contentPath = `${version}/content/${file.logicalPath}`;

        if (!manifestMap[file.digest]) {
          manifestMap[file.digest] = [];
        }
        manifestMap[file.digest].push(contentPath);

        if (!stateMap[file.digest]) {
          stateMap[file.digest] = [];
        }
        stateMap[file.digest].push(file.logicalPath);

        // Add content file
        files.push({
          path: `${objectId}/${contentPath}`,
          content: file.content
        });

        totalSize += file.size;
      }

      // Build inventory
      const inventory: OCFLInventory = {
        id: root.id,
        type: 'https://ocfl.io/1.1/spec/#inventory',
        digestAlgorithm: options.digestAlgorithm,
        head: version,
        contentDirectory: 'content',
        manifest: manifestMap,
        versions: {
          [version]: {
            created,
            message: options.versionMessage || 'Initial version',
            user: options.user ? {
              name: options.user.name,
              address: options.user.email ? `mailto:${options.user.email}` : undefined
            } : undefined,
            state: stateMap
          }
        }
      };

      const inventoryJson = JSON.stringify(inventory, null, 2);
      const inventoryDigest = await this.computeDigest(inventoryJson, options.digestAlgorithm);

      // Root inventory
      files.push({
        path: `${objectId}/inventory.json`,
        content: inventoryJson
      });
      files.push({
        path: `${objectId}/inventory.json.${options.digestAlgorithm}`,
        content: `${inventoryDigest} inventory.json\n`
      });
      metadataFiles += 2;

      // Version inventory (copy)
      files.push({
        path: `${objectId}/${version}/inventory.json`,
        content: inventoryJson
      });
      files.push({
        path: `${objectId}/${version}/inventory.json.${options.digestAlgorithm}`,
        content: `${inventoryDigest} inventory.json\n`
      });
      metadataFiles += 2;

      return {
        success: errors.length === 0,
        files,
        errors,
        stats: {
          totalFiles: files.length,
          totalSize,
          mediaFiles,
          metadataFiles
        }
      };
    } catch (e) {
      return {
        success: false,
        files: [],
        errors: [`OCFL export failed: ${e}`],
        stats: { totalFiles: 0, totalSize: 0, mediaFiles: 0, metadataFiles: 0 }
      };
    }
  }

  /**
   * Export as BagIt bag
   */
  async exportBagIt(
    root: IIIFItem,
    options: ArchivalPackageOptions
  ): Promise<ArchivalPackageResult> {
    const files: Array<{ path: string; content: string | Blob }> = [];
    const errors: string[] = [];
    const payloadFiles: Array<{ path: string; content: string | Blob; size: number; digest: string }> = [];
    let totalSize = 0;
    let mediaFiles = 0;
    let metadataFiles = 0;

    try {
      const bagName = this.sanitizeId(getIIIFValue(root.label) || root.id);
      const baggingDate = new Date().toISOString().split('T')[0];

      // 1. Collect payload files

      // Manifest JSON
      const manifestJson = JSON.stringify(root, null, 2);
      const manifestSize = new Blob([manifestJson]).size;
      const manifestDigest = await this.computeDigest(manifestJson, options.digestAlgorithm);
      payloadFiles.push({
        path: 'data/manifest.json',
        content: manifestJson,
        size: manifestSize,
        digest: manifestDigest
      });
      totalSize += manifestSize;
      metadataFiles++;

      // Media files
      if (options.includeMedia) {
        const canvases = this.collectCanvases(root);
        for (const canvas of canvases) {
          try {
            const mediaFile = await this.extractCanvasMedia(canvas, options.digestAlgorithm);
            if (mediaFile) {
              payloadFiles.push({
                path: `data/media/${mediaFile.logicalPath}`,
                content: mediaFile.content,
                size: mediaFile.size,
                digest: mediaFile.digest
              });
              totalSize += mediaFile.size;
              mediaFiles++;
            }
          } catch (e) {
            errors.push(`Failed to extract media from canvas ${canvas.id}: ${e}`);
          }
        }
      }

      // 2. Generate bag declaration file (bagit.txt)
      const bagitTxt = `BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n`;
      files.push({ path: `${bagName}/bagit.txt`, content: bagitTxt });

      // 3. Generate bag-info.txt
      const bagInfoLines: string[] = [
        `Bagging-Date: ${baggingDate}`,
        `Payload-Oxum: ${totalSize}.${payloadFiles.length}`
      ];

      if (options.organization) {
        bagInfoLines.push(`Source-Organization: ${options.organization}`);
      }
      if (options.description) {
        bagInfoLines.push(`External-Description: ${options.description}`);
      }
      if (options.externalId) {
        bagInfoLines.push(`External-Identifier: ${options.externalId}`);
      }
      if (options.user) {
        bagInfoLines.push(`Contact-Name: ${options.user.name}`);
        if (options.user.email) {
          bagInfoLines.push(`Contact-Email: ${options.user.email}`);
        }
      }

      // Calculate bag size
      const bagSize = this.formatSize(totalSize);
      bagInfoLines.push(`Bag-Size: ${bagSize}`);

      const bagInfoTxt = bagInfoLines.join('\n') + '\n';
      files.push({ path: `${bagName}/bag-info.txt`, content: bagInfoTxt });

      // 4. Generate manifest file (checksums)
      const manifestLines: string[] = [];
      for (const file of payloadFiles) {
        manifestLines.push(`${file.digest}  ${file.path}`);
      }
      const manifestTxt = manifestLines.join('\n') + '\n';
      files.push({
        path: `${bagName}/manifest-${options.digestAlgorithm}.txt`,
        content: manifestTxt
      });

      // 5. Generate tagmanifest (checksums for tag files)
      const tagFiles = [
        { path: 'bagit.txt', content: bagitTxt },
        { path: 'bag-info.txt', content: bagInfoTxt },
        { path: `manifest-${options.digestAlgorithm}.txt`, content: manifestTxt }
      ];

      const tagManifestLines: string[] = [];
      for (const tagFile of tagFiles) {
        const digest = await this.computeDigest(tagFile.content, options.digestAlgorithm);
        tagManifestLines.push(`${digest}  ${tagFile.path}`);
      }
      const tagManifestTxt = tagManifestLines.join('\n') + '\n';
      files.push({
        path: `${bagName}/tagmanifest-${options.digestAlgorithm}.txt`,
        content: tagManifestTxt
      });

      metadataFiles += 4; // bagit.txt, bag-info.txt, manifest, tagmanifest

      // 6. Add payload files
      for (const file of payloadFiles) {
        files.push({
          path: `${bagName}/${file.path}`,
          content: file.content
        });
      }

      return {
        success: errors.length === 0,
        files,
        errors,
        stats: {
          totalFiles: files.length,
          totalSize,
          mediaFiles,
          metadataFiles
        }
      };
    } catch (e) {
      return {
        success: false,
        files: [],
        errors: [`BagIt export failed: ${e}`],
        stats: { totalFiles: 0, totalSize: 0, mediaFiles: 0, metadataFiles: 0 }
      };
    }
  }

  /**
   * Validate a BagIt bag
   */
  async validateBagIt(
    files: Map<string, string | Blob>,
    algorithm: 'sha256' | 'sha512' = 'sha256'
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check for required files
    const bagitTxt = Array.from(files.keys()).find(k => k.endsWith('/bagit.txt'));
    if (!bagitTxt) {
      errors.push('Missing bagit.txt');
      return { valid: false, errors };
    }

    // Find manifest file
    const manifestFile = Array.from(files.keys()).find(k =>
      k.match(/manifest-(sha256|sha512|md5)\.txt$/)
    );
    if (!manifestFile) {
      errors.push('Missing manifest file');
      return { valid: false, errors };
    }

    // Parse manifest
    const manifestContent = files.get(manifestFile);
    if (!manifestContent || typeof manifestContent !== 'string') {
      errors.push('Cannot read manifest file');
      return { valid: false, errors };
    }

    const manifestLines = manifestContent.trim().split('\n');
    for (const line of manifestLines) {
      const match = line.match(/^([a-f0-9]+)\s+(.+)$/);
      if (!match) continue;

      const [, expectedDigest, filePath] = match;
      const fullPath = Array.from(files.keys()).find(k => k.endsWith(filePath));

      if (!fullPath) {
        errors.push(`Missing file: ${filePath}`);
        continue;
      }

      const content = files.get(fullPath);
      if (!content) {
        errors.push(`Cannot read file: ${filePath}`);
        continue;
      }

      const actualDigest = await this.computeDigest(content, algorithm);
      if (actualDigest !== expectedDigest) {
        errors.push(`Checksum mismatch for ${filePath}: expected ${expectedDigest}, got ${actualDigest}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Collect all canvases from an IIIF tree
   */
  private collectCanvases(root: IIIFItem): IIIFCanvas[] {
    const canvases: IIIFCanvas[] = [];

    const traverse = (item: IIIFItem) => {
      if (item.type === 'Canvas') {
        canvases.push(item as IIIFCanvas);
      }
      if (item.items) {
        for (const child of item.items) {
          traverse(child);
        }
      }
    };

    traverse(root);
    return canvases;
  }

  /**
   * Extract media file from canvas
   */
  private async extractCanvasMedia(
    canvas: IIIFCanvas,
    algorithm: 'sha256' | 'sha512'
  ): Promise<{
    logicalPath: string;
    content: Blob;
    digest: string;
    size: number;
  } | null> {
    // Check for _fileRef (local file)
    if ((canvas as any)._fileRef) {
      const file = (canvas as any)._fileRef as File;
      const content = file;
      const digest = await this.computeDigest(content, algorithm);
      return {
        logicalPath: file.name,
        content,
        digest,
        size: file.size
      };
    }

    // Try to get from storage
    const paintingAnno = canvas.items?.[0]?.items?.[0];
    if (!paintingAnno?.body) return null;

    const body = Array.isArray(paintingAnno.body) ? paintingAnno.body[0] : paintingAnno.body;
    const mediaId = typeof body === 'string' ? body : body?.id;

    if (!mediaId) return null;

    // Try to fetch from storage
    const stored = await storage.getFile(mediaId);
    if (stored) {
      const digest = await this.computeDigest(stored, algorithm);
      const filename = mediaId.split('/').pop() || 'media';
      return {
        logicalPath: filename,
        content: stored,
        digest,
        size: stored.size
      };
    }

    return null;
  }

  /**
   * Compute digest of content
   */
  private async computeDigest(
    content: string | Blob,
    algorithm: 'sha256' | 'sha512'
  ): Promise<string> {
    const data = typeof content === 'string'
      ? new TextEncoder().encode(content)
      : new Uint8Array(await content.arrayBuffer());

    const hashBuffer = await crypto.subtle.digest(
      algorithm === 'sha256' ? 'SHA-256' : 'SHA-512',
      data
    );

    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Sanitize ID for filesystem
   */
  private sanitizeId(id: string): string {
    return id
      .replace(/^https?:\/\//, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100);
  }

  /**
   * Format size in human readable form
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Download as ZIP
   */
  async downloadAsZip(
    result: ArchivalPackageResult,
    filename: string = 'archival-package.zip'
  ): Promise<void> {
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

export const archivalPackageService = new ArchivalPackageService();

export default archivalPackageService;
