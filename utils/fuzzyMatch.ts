/**
 * Fuzzy matching utility with scoring algorithm
 * 
 * Provides fzf-style fuzzy matching with detailed scoring.
 */

export interface FuzzyMatchResult {
  /** Match score (higher is better) */
  score: number;
  /** Array of matched ranges [start, end] */
  matches: Array<{ start: number; end: number }>;
}

interface MatchState {
  score: number;
  matches: Array<{ start: number; end: number }>;
  patternIndex: number;
  textIndex: number;
  consecutiveCount: number;
  inMatch: boolean;
  matchStart: number;
}

/**
 * Check if a character is at a word boundary
 */
function isWordBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  const prev = text[index - 1];
  return prev === ' ' || prev === '-' || prev === '_' || prev === '.' || prev === '/';
}

/**
 * Fuzzy matching algorithm with detailed scoring
 * 
 * Scoring Algorithm:
 * - Exact match: +100
 * - Prefix match: +50
 * - Word boundary match: +15
 * - Consecutive match (base): +10
 * - Per consecutive character: +5
 * - Character skip penalty: -1
 */
export function fuzzyMatch(text: string, pattern: string): FuzzyMatchResult | null {
  if (!pattern) {
    return { score: 0, matches: [] };
  }

  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();

  // Exact match
  if (textLower === patternLower) {
    return {
      score: 100,
      matches: [{ start: 0, end: text.length }]
    };
  }

  // Prefix match (starts with pattern)
  if (textLower.startsWith(patternLower)) {
    return {
      score: 50 + Math.min(pattern.length * 2, 20), // +2 per character, max +20
      matches: [{ start: 0, end: pattern.length }]
    };
  }

  // Word boundary match (pattern matches at word boundaries)
  const words = textLower.split(/[-_\s\/]+/);
  let wordBoundaryScore = 0;
  let wordBoundaryMatches: Array<{ start: number; end: number }> = [];
  let remainingPattern = patternLower;
  let currentIndex = 0;

  for (const word of words) {
    if (remainingPattern.length === 0) break;
    
    if (word.startsWith(remainingPattern)) {
      // Full remaining pattern matches start of word
      wordBoundaryScore += 15 + Math.min(remainingPattern.length * 3, 15);
      wordBoundaryMatches.push({ start: currentIndex, end: currentIndex + remainingPattern.length });
      remainingPattern = '';
      break;
    } else if (remainingPattern.startsWith(word)) {
      // Word matches start of remaining pattern
      wordBoundaryScore += 15 + Math.min(word.length * 3, 15);
      wordBoundaryMatches.push({ start: currentIndex, end: currentIndex + word.length });
      remainingPattern = remainingPattern.slice(word.length);
    }
    currentIndex += word.length + 1; // +1 for separator
  }

  if (remainingPattern.length === 0 && wordBoundaryMatches.length > 0) {
    return {
      score: Math.min(wordBoundaryScore, 80), // Cap at 80 (below prefix)
      matches: wordBoundaryMatches
    };
  }

  // Fuzzy matching
  const state: MatchState = {
    score: 10, // Base consecutive match score
    matches: [],
    patternIndex: 0,
    textIndex: 0,
    consecutiveCount: 0,
    inMatch: false,
    matchStart: -1
  };

  while (state.patternIndex < pattern.length && state.textIndex < text.length) {
    const textChar = textLower[state.textIndex];
    const patternChar = patternLower[state.patternIndex];

    if (textChar === patternChar) {
      // Character matches
      if (!state.inMatch) {
        state.matchStart = state.textIndex;
        state.inMatch = true;
        state.consecutiveCount = 1;
        
        // Word boundary bonus
        if (isWordBoundary(text, state.textIndex)) {
          state.score += 15;
        }
      } else {
        // Consecutive character bonus
        state.consecutiveCount++;
        state.score += 5;
      }
      
      state.patternIndex++;
    } else {
      // Character doesn't match
      if (state.inMatch) {
        state.matches.push({ start: state.matchStart, end: state.textIndex });
        state.inMatch = false;
        state.matchStart = -1;
      }
      // Penalty for skipped character
      state.score -= 1;
    }
    state.textIndex++;
  }

  // Close final match if in progress
  if (state.inMatch) {
    state.matches.push({ start: state.matchStart, end: state.textIndex });
  }

  // Check if we matched the entire pattern
  if (state.patternIndex === pattern.length) {
    // Ensure score doesn't go below 0
    return {
      score: Math.max(0, state.score),
      matches: state.matches
    };
  }

  // Pattern not fully matched
  return null;
}

/**
 * Fuzzy search an array of items
 */
export function fuzzySearch<T>(
  items: T[],
  pattern: string,
  getText: (item: T) => string
): Array<{ item: T; result: FuzzyMatchResult }> {
  if (!pattern.trim()) {
    return items.map(item => ({ item, result: { score: 0, matches: [] } }));
  }

  const results: Array<{ item: T; result: FuzzyMatchResult }> = [];

  for (const item of items) {
    const text = getText(item);
    const match = fuzzyMatch(text, pattern);
    if (match !== null) {
      results.push({ item, result: match });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.result.score - a.result.score);

  return results;
}

export default fuzzyMatch;
