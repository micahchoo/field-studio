/**
 * Ingest Analyzer — Stub
 * Two-pass folder analysis for ingestion planning.
 * Full implementation deferred to ingest pipeline migration.
 */

export interface IngestPreviewNodeStats {
  imageCount: number;
  audioCount: number;
  videoCount: number;
  documentCount: number;
  unknownCount: number;
  totalSize: number;
  hasSequencePattern?: boolean;
}

export interface IngestPreviewNode {
  path: string;
  proposedType: string;
  confidence: number;
  detectionReasons: Array<{ type: string; details: string }>;
  children: IngestPreviewNode[];
  stats?: IngestPreviewNodeStats;
}

export interface IngestAnalysis {
  totalFiles: number;
  mediaFiles: number;
  metadataFiles: number;
  directories: number;
  estimatedCanvases: number;
  estimatedManifests: number;
  detectedPatterns: string[];
}

export function analyzeFolder(_files: File[]): IngestAnalysis {
  return {
    totalFiles: 0, mediaFiles: 0, metadataFiles: 0, directories: 0,
    estimatedCanvases: 0, estimatedManifests: 0, detectedPatterns: [],
  };
}

export function analyzeFileList(_files: FileList): IngestAnalysis {
  return analyzeFolder(Array.from(_files));
}

/** Summary of ingest planning proposals */
export interface IngestAnalysisSummary {
  proposedManifests: number;
  proposedCollections: number;
  hasMarkerFiles: boolean;
  totalImages: number;
  totalAudios: number;
  totalVideos: number;
  totalDocuments: number;
}

/**
 * Full result of analyzing a file tree for ingest.
 * Extends the flat IngestAnalysis with the preview tree and summary.
 */
export interface IngestAnalysisResult extends IngestAnalysis {
  root: IngestPreviewNode;
  summary: IngestAnalysisSummary;
}

/**
 * Analyze a file tree for ingest planning.
 * Stub: full implementation deferred to ingest pipeline migration.
 */
export async function analyzeForIngest(
  _tree: unknown
): Promise<IngestAnalysisResult> {
  const rootNode: IngestPreviewNode = {
    path: '/',
    proposedType: 'Collection',
    confidence: 1,
    detectionReasons: [],
    children: [],
  };
  return {
    totalFiles: 0, mediaFiles: 0, metadataFiles: 0, directories: 0,
    estimatedCanvases: 0, estimatedManifests: 0, detectedPatterns: [],
    root: rootNode,
    summary: { proposedManifests: 0, proposedCollections: 0, hasMarkerFiles: false, totalImages: 0, totalAudios: 0, totalVideos: 0, totalDocuments: 0 },
  };
}
