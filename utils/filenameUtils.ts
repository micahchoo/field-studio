/**
 * Filename utility functions for file handling, sanitization, and sequence detection
 */

// Maximum filename length (most file systems)
const MAX_FILENAME_LENGTH = 255;

// Invalid filename characters for cross-platform compatibility
const INVALID_CHARS = /[<>:"|?*\/\\]/g;

/**
 * Sanitize filename by removing invalid characters
 * @param filename - Raw filename to sanitize
 * @returns Sanitized filename safe for file systems
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'untitled';
  }

  // Remove invalid characters
  let sanitized = filename.replace(INVALID_CHARS, '');

  // Replace multiple consecutive spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Trim leading/trailing spaces
  sanitized = sanitized.trim();

  // If empty after sanitization, use default
  if (!sanitized) {
    return 'untitled';
  }

  // Enforce maximum length
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = sanitized.match(/\.[^.]+$/)?.[0] || '';
    const nameWithoutExt = sanitized.slice(0, sanitized.length - ext.length);
    sanitized = nameWithoutExt.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
  }

  return sanitized;
}

/**
 * Extract sequence number from filename
 * @param filename - Filename to analyze
 * @returns Sequence number or null if not found
 */
export function extractSequenceNumber(filename: string): number | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Try matching trailing numbers before extension first (most common pattern)
  let match = filename.match(/(\d+)(?:\.[^.]+)?$/);

  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  // Also try matching numbers at the start (e.g., "001-image.jpg")
  match = filename.match(/^(\d+)/);

  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Detect if files form a sequence
 * @param files - Array of file objects with name and path
 * @returns Sequence detection result
 */
export function detectFileSequence(
  files: Array<{ name: string; path: string }>
): {
  isSequence: boolean;
  pattern?: string;
  hasGaps?: boolean;
} {
  if (!files || files.length < 2) {
    return { isSequence: false };
  }

  // Extract sequence numbers
  const filesWithNumbers = files
    .map(file => ({
      ...file,
      number: extractSequenceNumber(file.name),
      baseName: file.name.replace(/\d+(\.[^.]+)?$/, ''),
    }))
    .filter(f => f.number !== null);

  if (filesWithNumbers.length < 2) {
    return { isSequence: false };
  }

  // Check if all files have the same base name
  const {baseName} = filesWithNumbers[0];
  const sameBaseName = filesWithNumbers.every(f => f.baseName === baseName);

  if (!sameBaseName) {
    return { isSequence: false };
  }

  // Sort by sequence number
  const sorted = [...filesWithNumbers].sort((a, b) => a.number! - b.number!);

  // Check for gaps in sequence
  let hasGaps = false;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].number! - sorted[i-1].number! > 1) {
      hasGaps = true;
      break;
    }
  }

  return {
    isSequence: true,
    pattern: `${baseName}{number}`,
    hasGaps,
  };
}

// Counter for generating unique filenames when timestamp alone isn't enough
let filenameCounter = 0;

/**
 * Generate a safe filename
 * @param baseName - Base name for the file
 * @param extension - File extension (without dot)
 * @param addTimestamp - Whether to add timestamp for uniqueness
 * @returns Safe filename
 */
export function generateSafeFilename(
  baseName: string,
  extension: string,
  addTimestamp: boolean = false
): string {
  // Sanitize base name
  let safe = sanitizeFilename(baseName || 'untitled');

  // Convert to lowercase and replace spaces with hyphens
  safe = safe.toLowerCase().replace(/\s+/g, '-');

  // Remove any remaining special characters except hyphens and underscores
  safe = safe.replace(/[^a-z0-9_-]/g, '');

  // Clean up multiple consecutive hyphens
  safe = safe.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  safe = safe.replace(/^-+|-+$/g, '');

  // Add timestamp if requested (with counter for uniqueness within same millisecond)
  if (addTimestamp) {
    const timestamp = Date.now();
    filenameCounter++;
    safe = `${safe}-${timestamp}-${filenameCounter}`;
  }

  // Add extension
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  return safe + ext;
}

/**
 * Get base name without extension
 * @param filename - Full filename
 * @returns Filename without extension
 */
export function getBaseName(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  // Handle paths - extract just the filename
  const parts = filename.split(/[/\\]/);
  const nameWithExt = parts[parts.length - 1];

  // Handle hidden files (starting with .)
  if (nameWithExt.startsWith('.') && !nameWithExt.includes('.', 1)) {
    return nameWithExt;
  }

  // Remove extension
  const lastDotIndex = nameWithExt.lastIndexOf('.');

  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return nameWithExt;
  }

  return nameWithExt.slice(0, lastDotIndex);
}

/**
 * Parse file path into components
 * @param filePath - Full file path
 * @returns Parsed path components
 */
export function parseFilePath(filePath: string): {
  dir: string;
  name: string;
  ext: string;
  base: string;
} {
  if (!filePath || typeof filePath !== 'string') {
    return { dir: '', name: '', ext: '', base: '' };
  }

  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // Split into directory and filename
  const lastSlash = normalized.lastIndexOf('/');
  const dir = lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
  const base = lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);

  // Split filename into name and extension
  const lastDot = base.lastIndexOf('.');
  let name = base;
  let ext = '';

  if (lastDot > 0) {
    name = base.slice(0, lastDot);
    ext = base.slice(lastDot + 1);
  }

  return { dir, name, ext, base };
}

// Patterns from Documentation/regex library.md
export const filenameRelationshipPatterns = [
  // SEQUENCE DETECTION PATTERNS
  {
    name: "Simple numerical sequence",
    regex: /^(.+?)[\s._\-]?(\d{1,5})(?:\.\w+)?$/i,
    description: "Extracts base name and number for sequences like 'file1.txt', 'document_001.pdf'",
    groups: ["base", "sequence"],
    tags: "sequence,numerical,incremental"
  },
  {
    name: "Padded numerical sequence",
    regex: /^(.+?)[\s._\-]?(\d{2,8})(?:\.\w+)?$/i,
    description: "Matches zero-padded sequences like 'img_001.jpg', 'scan_000045.tif'",
    groups: ["base", "padded_sequence"],
    tags: "sequence,padded,incremental"
  },
  {
    name: "Alphabetical sequence",
    regex: /^(.+?)[\s._\-]?([a-zA-Z])(?:\.\w+)?$/i,
    description: "Matches alphabetical sequences like 'chapter_a.pdf', 'appendix_B.docx'",
    groups: ["base", "letter"],
    tags: "sequence,alphabetical"
  },
  {
    name: "Roman numeral sequence",
    regex: /^(.+?)[\s._\-]?(i{1,3}|iv|v|vi{1,3}|ix|x{1,3}|x[cl]|l?x{0,3})(?:\.\w+)?$/i,
    description: "Matches Roman numeral sequences like 'volume_I.pdf', 'act_iv.txt'",
    groups: ["base", "roman"],
    tags: "sequence,roman"
  },
  {
    name: "Date-based sequence",
    regex: /^(.+?)[\s._\-]?(\d{4}[._\-]?\d{2}[._\-]?\d{2})(?:\.\w+)?$/i,
    description: "Extracts dates for sequenced files like 'log_2023-01-15.txt', 'report20231231.pdf'",
    groups: ["base", "date"],
    tags: "sequence,date,temporal"
  },
  {
    name: "Versioned sequence",
    regex: /^(.+?)[\s._\-]?([vV]?\d+(?:\.\d+)*)(?:\.\w+)?$/i,
    description: "Matches version numbers like 'document_v1.2.pdf', 'app_2.1.3.zip'",
    groups: ["base", "version"],
    tags: "sequence,version,semver"
  },
  
  // SIMILARITY DETECTION PATTERNS
  {
    name: "Common prefix groups",
    regex: /^([a-zA-Z0-9_-]{3,})[\s._\-].+\.\w+$/i,
    description: "Identifies files sharing a common prefix for grouping",
    groups: ["prefix"],
    tags: "similarity,prefix,grouping"
  },
  {
    name: "Common suffix groups",
    regex: /^.+[\s._\-]([a-zA-Z0-9_-]+)(?:\.\w+)?$/i,
    description: "Identifies files sharing a common suffix before extension",
    groups: ["suffix"],
    tags: "similarity,suffix,grouping"
  },
  {
    name: "Similar patterns with variations",
    regex: /^(.+?)(?:_(?:copy|dup|backup|old|new|final|rev|draft))(?:\d*)(?:\.\w+)?$/i,
    description: "Matches variant files indicating edits, copies, or backups",
    groups: ["original_base"],
    tags: "similarity,variants,derivatives"
  },
  
  // ADJACENCY & RELATIONSHIP PATTERNS
  {
    name: "Page range indicators",
    regex: /^(.+?)[\s._\-]?(\d+)[\s._\-]?to[\s._\-]?(\d+)(?:\.\w+)?$/i,
    description: "Matches files indicating page ranges like 'document_1to50.pdf'",
    groups: ["base", "start", "end"],
    tags: "adjacency,range,pagination"
  },
  {
    name: "Part/segment indicators",
    regex: /^(.+?)[\s._\-]?(?:part|pt|segment|sec|section)[\s._\-]?(\d+)(?:of\d+)?(?:\.\w+)?$/i,
    description: "Matches segmented files like 'book_part1.pdf', 'archive_sec3of5.zip'",
    groups: ["base", "part_number", "total_parts"],
    tags: "adjacency,segments,parts"
  }
];

// Helper to normalize strings for comparison
const normalizeForComparison = (filename: string): string => {
  return filename
    .replace(/\.[^/.]+$/, '')           // remove extension
    .replace(/[\s._\-]?\d+[\s._\-]?/g, '') // remove numbers
    .replace(/_(copy|dup|backup|old|new|final|rev|draft)\d*/gi, '')
    .toLowerCase();
};

// Create N-Grams (bi-grams default)
const createNGrams = (str: string, n = 2): Set<string> => {
  const grams = new Set<string>();
  const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.length < n) return grams;
  for (let i = 0; i <= normalized.length - n; i++) {
    grams.add(normalized.slice(i, i + n));
  }
  return grams;
};

// Jaccard Similarity — computed directly without intermediate arrays/sets
const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  // Count intersection by iterating the smaller set
  let intersectionSize = 0;
  const [smaller, larger] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
  for (const item of smaller) {
    if (larger.has(item)) intersectionSize++;
  }
  // |A ∪ B| = |A| + |B| - |A ∩ B|
  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
};

export interface SimilarityMatch {
  filename: string;
  reason: string;
  score: number;
}

/**
 * Finds files similar to the target filename from a list of candidates.
 * Uses a combination of Regex Pattern Matching and N-Gram Similarity.
 */
export const findSimilarFiles = (
  targetFilename: string, 
  candidates: string[], 
  options = { threshold: 0.6 }
): SimilarityMatch[] => {
  const matches: SimilarityMatch[] = [];
  const targetGrams = createNGrams(targetFilename);
  
  // 1. Check for Sequence/Pattern relationships (High Confidence)
  const matchingPattern = filenameRelationshipPatterns.find(p => p.regex.test(targetFilename));
  let targetBase = '';
  
  if (matchingPattern) {
    const match = targetFilename.match(matchingPattern.regex);
    // If groups exist and first group is 'base' (common convention in our patterns)
    if (match && matchingPattern.groups && matchingPattern.groups[0] === 'base') {
      targetBase = match[1].toLowerCase();
    }
  }

  for (const candidate of candidates) {
    if (candidate === targetFilename) continue;

    // A. Pattern Matching (Sequence Detection)
    if (matchingPattern && targetBase) {
      const candidateMatch = candidate.match(matchingPattern.regex);
      if (candidateMatch && candidateMatch[1].toLowerCase() === targetBase) {
        matches.push({
          filename: candidate,
          reason: `Part of same ${matchingPattern.name.toLowerCase()}`,
          score: 1.0
        });
        continue; // Skip N-Gram check if pattern matches
      }
    }

    // B. N-Gram Fuzzy Matching (Fallback)
    const candidateGrams = createNGrams(candidate);
    const sim = jaccardSimilarity(targetGrams, candidateGrams);
    
    if (sim >= options.threshold) {
      matches.push({
        filename: candidate,
        reason: 'Similar naming pattern',
        score: sim
      });
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
};
