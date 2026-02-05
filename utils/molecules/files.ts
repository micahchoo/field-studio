/**
 * File sequence and pattern detection molecules
 * Depends on: atoms/files
 */

import {
  getExtension,
  getBaseName,
  extractSequenceNumber,
  sanitizeFilename,
} from '../atoms/files';

/**
 * Similar file match result
 */
export interface SimilarityMatch {
  filename: string;
  reason: string;
  score: number;
}

/**
 * File sequence detection result
 */
export interface SequenceResult {
  isSequence: boolean;
  pattern?: string;
  hasGaps?: boolean;
}

// Filename relationship patterns
const FILENAME_PATTERNS = [
  // SEQUENCE DETECTION
  {
    name: 'Simple numerical sequence',
    regex: /^(.+?)[\s._\-]?(\d{1,5})(?:\.\w+)?$/i,
    description: "Extracts base name and number for sequences like 'file1.txt'",
    groups: ['base', 'sequence'],
  },
  {
    name: 'Padded numerical sequence',
    regex: /^(.+?)[\s._\-]?(\d{2,8})(?:\.\w+)?$/i,
    description: "Matches zero-padded sequences like 'img_001.jpg'",
    groups: ['base', 'padded_sequence'],
  },
  {
    name: 'Date-based sequence',
    regex: /^(.+?)[\s._\-]?(\d{4}[._\-]?\d{2}[._\-]?\d{2})(?:\.\w+)?$/i,
    description: "Extracts dates for sequenced files like 'log_2023-01-15.txt'",
    groups: ['base', 'date'],
  },
  {
    name: 'Versioned sequence',
    regex: /^(.+?)[\s._\-]?([vV]?\d+(?:\.\d+)*)(?:\.\w+)?$/i,
    description: "Matches version numbers like 'document_v1.2.pdf'",
    groups: ['base', 'version'],
  },
  // SIMILARITY DETECTION
  {
    name: 'Common prefix groups',
    regex: /^([a-zA-Z0-9_-]{3,})[\s._\-].+\.\w+$/i,
    description: 'Identifies files sharing a common prefix',
    groups: ['prefix'],
  },
] as const;

/**
 * Detect if files form a sequence
 */
export function detectFileSequence(
  files: Array<{ name: string; path: string }>
): SequenceResult {
  if (!files || files.length < 2) {
    return { isSequence: false };
  }

  // Extract sequence numbers
  const filesWithNumbers = files
    .map((file) => ({
      ...file,
      number: extractSequenceNumber(file.name),
      baseName: file.name.replace(/\d+(\.[^.]+)?$/, ''),
    }))
    .filter((f) => f.number !== null);

  if (filesWithNumbers.length < 2) {
    return { isSequence: false };
  }

  // Check if all files have the same base name
  const { baseName } = filesWithNumbers[0];
  const sameBaseName = filesWithNumbers.every((f) => f.baseName === baseName);

  if (!sameBaseName) {
    return { isSequence: false };
  }

  // Sort by sequence number
  const sorted = [...filesWithNumbers].sort((a, b) => a.number! - b.number!);

  // Check for gaps
  let hasGaps = false;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].number! - sorted[i - 1].number! > 1) {
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

/**
 * Create N-grams for fuzzy matching
 */
function createNGrams(str: string, n = 2): Set<string> {
  const grams = new Set<string>();
  const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.length < n) return grams;

  for (let i = 0; i <= normalized.length - n; i++) {
    grams.add(normalized.slice(i, i + n));
  }
  return grams;
}

/**
 * Calculate Jaccard similarity between two sets
 */
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Find files similar to target filename
 */
export function findSimilarFiles(
  targetFilename: string,
  candidates: string[],
  options: { threshold?: number } = {}
): SimilarityMatch[] {
  const { threshold = 0.6 } = options;
  const matches: SimilarityMatch[] = [];
  const targetGrams = createNGrams(targetFilename);

  // Check for pattern relationships
  const matchingPattern = FILENAME_PATTERNS.find((p) =>
    p.regex.test(targetFilename)
  );
  let targetBase = '';

  if (matchingPattern) {
    const match = targetFilename.match(matchingPattern.regex);
    if (match && matchingPattern.groups?.[0] === 'base') {
      targetBase = match[1].toLowerCase();
    }
  }

  for (const candidate of candidates) {
    if (candidate === targetFilename) continue;

    // Pattern matching
    if (matchingPattern && targetBase) {
      const candidateMatch = candidate.match(matchingPattern.regex);
      if (candidateMatch && candidateMatch[1].toLowerCase() === targetBase) {
        matches.push({
          filename: candidate,
          reason: `Part of same ${matchingPattern.name.toLowerCase()}`,
          score: 1.0,
        });
        continue;
      }
    }

    // N-Gram fuzzy matching
    const candidateGrams = createNGrams(candidate);
    const similarity = jaccardSimilarity(targetGrams, candidateGrams);

    if (similarity >= threshold) {
      matches.push({
        filename: candidate,
        reason: 'Similar naming pattern',
        score: similarity,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

// Re-export for convenience
export { sanitizeFilename, getBaseName, getExtension };
