/**
 * Ingest Analyzer - Two-Pass Folder Analysis for IIIF Conversion
 *
 * Implements the recommended approach for folder-to-IIIF mapping:
 * 1. Scan pass: Walk tree, collect statistics, detect patterns
 * 2. Present summary: Show proposed IIIF types with confidence scores
 * 3. User adjusts: Promote/demote items, exclude folders
 * 4. Generate pass: Apply rules, output IIIF JSON
 *
 * Detection patterns:
 * - Leaf detection: Folders with only images → Manifest
 * - Marker files: .iiif-manifest, .iiif-collection, info.yml
 * - Naming conventions: page_001, recto/verso, numbered sequences
 * - Depth rules: User-configurable depth-based mapping
 *
 * @see IIIF Presentation API 3.0: Collections are "cheap overlays"
 */

import { FileTree } from '../types';
import { MIME_TYPE_MAP } from '../constants';
import { load } from 'js-yaml';

// ============================================================================
// Types
// ============================================================================

export type ProposedIIIFType = 'Collection' | 'Manifest' | 'Excluded';

export interface DetectionReason {
  rule: string;
  confidence: number; // 0-1
  details: string;
}

export interface IngestPreviewNode {
  /** Folder path */
  path: string;
  /** Folder name */
  name: string;
  /** Proposed IIIF type */
  proposedType: ProposedIIIFType;
  /** Why this type was chosen */
  detectionReasons: DetectionReason[];
  /** Combined confidence score */
  confidence: number;
  /** User has overridden the automatic detection */
  userOverride: boolean;
  /** Statistics about this folder */
  stats: FolderStats;
  /** Child preview nodes */
  children: IngestPreviewNode[];
  /** Label from marker file or folder name */
  label: string;
  /** Additional metadata from info.yml */
  metadata?: Record<string, unknown>;
}

export interface FolderStats {
  /** Number of image files */
  imageCount: number;
  /** Number of video files */
  videoCount: number;
  /** Number of audio files */
  audioCount: number;
  /** Number of text/sidecar files */
  textCount: number;
  /** Number of subdirectories */
  subdirCount: number;
  /** Total file size in bytes */
  totalSize: number;
  /** Whether folder contains only media files (no subdirs) */
  isLeaf: boolean;
  /** Whether files follow a numbered sequence pattern */
  hasSequencePattern: boolean;
  /** Detected sequence pattern (e.g., "page_###", "img###") */
  sequencePattern?: string;
  /** Depth from root */
  depth: number;
}

export interface IngestAnalysisResult {
  /** Root preview node */
  root: IngestPreviewNode;
  /** Summary statistics */
  summary: {
    totalFolders: number;
    proposedManifests: number;
    proposedCollections: number;
    totalImages: number;
    totalVideos: number;
    totalAudios: number;
    hasMarkerFiles: boolean;
    maxDepth: number;
  };
  /** Detected configuration from marker files */
  config?: IngestConfig;
}

export interface IngestConfig {
  /** Depth at which folders become Manifests (if no other detection) */
  manifestDepth?: number;
  /** How to sort canvases: 'natural', 'alpha', 'date' */
  canvasSort?: 'natural' | 'alpha' | 'date';
  /** Where to get labels: 'foldername', 'metadata', 'first-file' */
  labelSource?: 'foldername' | 'metadata' | 'first-file';
  /** File patterns to include */
  includePatterns?: string[];
  /** File patterns to exclude */
  excludePatterns?: string[];
  /** Base URL for generated IIIF IDs */
  baseUrl?: string;
}

// ============================================================================
// Marker File Detection
// ============================================================================

const MARKER_FILES = {
  MANIFEST: ['.iiif-manifest', 'manifest.json', 'manifest.yml'],
  COLLECTION: ['.iiif-collection', 'collection.json', 'collection.yml'],
  METADATA: ['info.yml', 'info.yaml', 'metadata.yml', 'metadata.yaml', 'metadata.json'],
  CONFIG: ['.iiif-ingest.json', '.iiif-ingest.yml', 'iiif-config.json'],
  SEQUENCE: ['sequence.txt', 'order.txt'],
  EXCLUDE: ['.iiif-exclude', '.noiiif'],
};

/**
 * Check if a file is a media file (image, video, audio)
 */
function isMediaFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return !!MIME_TYPE_MAP[ext];
}

/**
 * Check if a file is an image
 */
function isImageFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mime = MIME_TYPE_MAP[ext];
  return mime?.type === 'Image';
}

/**
 * Check if a file is a video
 */
function isVideoFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mime = MIME_TYPE_MAP[ext];
  return mime?.type === 'Video';
}

/**
 * Check if a file is audio
 */
function isAudioFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mime = MIME_TYPE_MAP[ext];
  return mime?.type === 'Sound';
}

/**
 * Detect numbered sequence patterns in filenames
 */
function detectSequencePattern(filenames: string[]): { hasPattern: boolean; pattern?: string } {
  if (filenames.length < 2) return { hasPattern: false };

  // Common patterns to check
  const patterns = [
    /^(.+?)(\d+)\.(\w+)$/,           // prefix123.ext
    /^(\d+)\.(\w+)$/,                 // 123.ext
    /^(.+?)_(\d+)\.(\w+)$/,          // prefix_123.ext
    /^(.+?)-(\d+)\.(\w+)$/,          // prefix-123.ext
    /^page[_-]?(\d+)\.(\w+)$/i,      // page_001.ext, page-1.ext
    /^img[_-]?(\d+)\.(\w+)$/i,       // img_001.ext
    /^(recto|verso)\.(\w+)$/i,       // recto.ext, verso.ext (folio)
    /^(front|back|spine)\.(\w+)$/i,  // front.ext, back.ext (book cover)
  ];

  for (const pattern of patterns) {
    const matches = filenames.filter(f => pattern.test(f));
    if (matches.length >= filenames.length * 0.5) {
      return {
        hasPattern: true,
        pattern: pattern.source
      };
    }
  }

  return { hasPattern: false };
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Compute statistics for a folder
 */
function computeStats(node: FileTree, depth: number): FolderStats {
  const filenames = Array.from(node.files.keys());
  const mediaFiles = filenames.filter(f => isMediaFile(f) && !f.startsWith('.'));

  const imageCount = filenames.filter(isImageFile).length;
  const videoCount = filenames.filter(isVideoFile).length;
  const audioCount = filenames.filter(isAudioFile).length;
  const textCount = filenames.filter(f =>
    f.endsWith('.txt') || f.endsWith('.srt') || f.endsWith('.vtt')
  ).length;

  const subdirCount = node.directories.size;

  // Calculate total size
  let totalSize = 0;
  for (const file of node.files.values()) {
    totalSize += file.size;
  }

  // Detect sequence pattern
  const { hasPattern, pattern } = detectSequencePattern(mediaFiles);

  return {
    imageCount,
    videoCount,
    audioCount,
    textCount,
    subdirCount,
    totalSize,
    isLeaf: subdirCount === 0 && mediaFiles.length > 0,
    hasSequencePattern: hasPattern,
    sequencePattern: pattern,
    depth
  };
}

/**
 * Detect IIIF type based on folder contents and structure
 */
function detectType(
  node: FileTree,
  stats: FolderStats,
  parentType: ProposedIIIFType | null
): { type: ProposedIIIFType; reasons: DetectionReason[] } {
  const reasons: DetectionReason[] = [];
  const filenames = Array.from(node.files.keys());

  // Check for exclude markers
  const hasExcludeMarker = MARKER_FILES.EXCLUDE.some(m => filenames.includes(m));
  if (hasExcludeMarker) {
    reasons.push({
      rule: 'exclude-marker',
      confidence: 1.0,
      details: 'Folder has .iiif-exclude or .noiiif marker'
    });
    return { type: 'Excluded', reasons };
  }

  // Check for explicit manifest marker
  const hasManifestMarker = MARKER_FILES.MANIFEST.some(m => filenames.includes(m));
  if (hasManifestMarker) {
    reasons.push({
      rule: 'manifest-marker',
      confidence: 1.0,
      details: 'Folder has explicit manifest marker file'
    });
    return { type: 'Manifest', reasons };
  }

  // Check for explicit collection marker
  const hasCollectionMarker = MARKER_FILES.COLLECTION.some(m => filenames.includes(m));
  if (hasCollectionMarker) {
    reasons.push({
      rule: 'collection-marker',
      confidence: 1.0,
      details: 'Folder has explicit collection marker file'
    });
    return { type: 'Collection', reasons };
  }

  // Leaf detection: folders with only media files (no subdirs) → Manifest
  if (stats.isLeaf) {
    reasons.push({
      rule: 'leaf-detection',
      confidence: 0.9,
      details: `Leaf folder with ${stats.imageCount + stats.videoCount + stats.audioCount} media files`
    });
    return { type: 'Manifest', reasons };
  }

  // Sequence pattern detection
  if (stats.hasSequencePattern && stats.imageCount >= 2) {
    reasons.push({
      rule: 'sequence-pattern',
      confidence: 0.85,
      details: `Detected numbered sequence pattern: ${stats.sequencePattern}`
    });
    // If this folder has subdirs AND sequence pattern, it's probably a Collection
    // with loose files that should become a Manifest
    if (stats.subdirCount > 0) {
      // This is a Collection with mixed content
      return { type: 'Collection', reasons };
    }
    return { type: 'Manifest', reasons };
  }

  // Has subdirectories → Collection
  if (stats.subdirCount > 0) {
    reasons.push({
      rule: 'has-subdirs',
      confidence: 0.8,
      details: `Contains ${stats.subdirCount} subdirectories`
    });
    return { type: 'Collection', reasons };
  }

  // Root or underscore-prefixed → Collection
  if (node.name === 'root' || node.name.startsWith('_')) {
    reasons.push({
      rule: 'naming-convention',
      confidence: 0.7,
      details: 'Name indicates collection (root or underscore prefix)'
    });
    return { type: 'Collection', reasons };
  }

  // Has media files but no clear pattern → Manifest
  if (stats.imageCount + stats.videoCount + stats.audioCount > 0) {
    reasons.push({
      rule: 'has-media',
      confidence: 0.6,
      details: 'Contains media files without clear collection structure'
    });
    return { type: 'Manifest', reasons };
  }

  // Default: Empty or text-only folder → Collection (can be populated later)
  reasons.push({
    rule: 'default',
    confidence: 0.3,
    details: 'No clear indicators, defaulting to Collection'
  });
  return { type: 'Collection', reasons };
}

/**
 * Parse metadata from info.yml or similar files
 */
async function parseMetadata(node: FileTree): Promise<{
  label?: string;
  metadata?: Record<string, unknown>;
}> {
  for (const metaFile of MARKER_FILES.METADATA) {
    if (node.files.has(metaFile)) {
      try {
        const text = await node.files.get(metaFile)!.text();
        if (metaFile.endsWith('.json')) {
          const data = JSON.parse(text);
          return {
            label: data.label || data.title || data.name,
            metadata: data
          };
        } else {
          const data = load(text) as Record<string, unknown>;
          return {
            label: (data.label || data.title || data.name) as string | undefined,
            metadata: data
          };
        }
      } catch (e) {
        console.warn(`Failed to parse ${metaFile}:`, e);
      }
    }
  }
  return {};
}

/**
 * Recursively analyze a folder tree
 */
async function analyzeNode(
  node: FileTree,
  depth: number,
  parentType: ProposedIIIFType | null
): Promise<IngestPreviewNode> {
  const stats = computeStats(node, depth);
  const { type, reasons } = detectType(node, stats, parentType);
  const { label, metadata } = await parseMetadata(node);

  // Calculate combined confidence
  const confidence = reasons.length > 0
    ? reasons.reduce((sum, r) => sum + r.confidence, 0) / reasons.length
    : 0;

  // Clean up display name
  let displayName = node.name;
  if (displayName.startsWith('_')) displayName = displayName.substring(1);
  if (displayName === 'root') displayName = 'My Archive';

  const children: IngestPreviewNode[] = [];

  // Recursively analyze subdirectories
  for (const [name, dir] of node.directories.entries()) {
    // Skip special directories
    if (name.startsWith('.') || name.startsWith('+') || name.startsWith('!')) {
      continue;
    }
    children.push(await analyzeNode(dir, depth + 1, type));
  }

  return {
    path: node.path,
    name: node.name,
    proposedType: type,
    detectionReasons: reasons,
    confidence,
    userOverride: false,
    stats,
    children,
    label: label || displayName,
    metadata
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Analyze a folder tree and propose IIIF structure
 *
 * This is the "scan pass" - it analyzes the folder structure without
 * making any changes, allowing the user to review and adjust before
 * the actual ingest.
 */
export async function analyzeForIngest(tree: FileTree): Promise<IngestAnalysisResult> {
  const root = await analyzeNode(tree, 0, null);

  // Compute summary statistics
  let totalFolders = 0;
  let proposedManifests = 0;
  let proposedCollections = 0;
  let totalImages = 0;
  let totalVideos = 0;
  let totalAudios = 0;
  let hasMarkerFiles = false;
  let maxDepth = 0;

  const traverse = (node: IngestPreviewNode) => {
    totalFolders++;
    if (node.proposedType === 'Manifest') proposedManifests++;
    if (node.proposedType === 'Collection') proposedCollections++;
    totalImages += node.stats.imageCount;
    totalVideos += node.stats.videoCount;
    totalAudios += node.stats.audioCount;
    if (node.detectionReasons.some(r => r.rule.includes('marker'))) hasMarkerFiles = true;
    if (node.stats.depth > maxDepth) maxDepth = node.stats.depth;
    node.children.forEach(traverse);
  };

  traverse(root);

  // Check for config file at root
  let config: IngestConfig | undefined;
  for (const configFile of MARKER_FILES.CONFIG) {
    if (tree.files.has(configFile)) {
      try {
        const text = await tree.files.get(configFile)!.text();
        config = configFile.endsWith('.json')
          ? JSON.parse(text)
          : load(text) as IngestConfig;
      } catch (e) {
        console.warn(`Failed to parse config ${configFile}:`, e);
      }
    }
  }

  return {
    root,
    summary: {
      totalFolders,
      proposedManifests,
      proposedCollections,
      totalImages,
      totalVideos,
      totalAudios,
      hasMarkerFiles,
      maxDepth
    },
    config
  };
}

/**
 * Update a node's proposed type (user override)
 */
export function overrideNodeType(
  root: IngestPreviewNode,
  path: string,
  newType: ProposedIIIFType
): IngestPreviewNode {
  const clone = JSON.parse(JSON.stringify(root)) as IngestPreviewNode;

  const findAndUpdate = (node: IngestPreviewNode): boolean => {
    if (node.path === path) {
      node.proposedType = newType;
      node.userOverride = true;
      node.detectionReasons = [{
        rule: 'user-override',
        confidence: 1.0,
        details: `User set type to ${newType}`
      }];
      return true;
    }
    for (const child of node.children) {
      if (findAndUpdate(child)) return true;
    }
    return false;
  };

  findAndUpdate(clone);
  return clone;
}

/**
 * Convert analyzed preview back to FileTree with iiifIntent set
 */
export function applyAnalysisToTree(
  tree: FileTree,
  preview: IngestPreviewNode
): FileTree {
  const clone: FileTree = {
    ...tree,
    files: new Map(tree.files),
    directories: new Map(),
    iiifIntent: preview.proposedType === 'Excluded'
      ? undefined
      : preview.proposedType
  };

  // Process subdirectories
  for (const [name, dir] of tree.directories.entries()) {
    const childPreview = preview.children.find(c => c.name === name);
    if (childPreview && childPreview.proposedType !== 'Excluded') {
      clone.directories.set(name, applyAnalysisToTree(dir, childPreview));
    }
  }

  return clone;
}

/**
 * Get all manifests from the preview tree (for UI display)
 */
export function getProposedManifests(root: IngestPreviewNode): IngestPreviewNode[] {
  const manifests: IngestPreviewNode[] = [];

  const traverse = (node: IngestPreviewNode) => {
    if (node.proposedType === 'Manifest') {
      manifests.push(node);
    }
    node.children.forEach(traverse);
  };

  traverse(root);
  return manifests;
}

/**
 * Get all collections from the preview tree (for UI display)
 */
export function getProposedCollections(root: IngestPreviewNode): IngestPreviewNode[] {
  const collections: IngestPreviewNode[] = [];

  const traverse = (node: IngestPreviewNode) => {
    if (node.proposedType === 'Collection') {
      collections.push(node);
    }
    node.children.forEach(traverse);
  };

  traverse(root);
  return collections;
}
