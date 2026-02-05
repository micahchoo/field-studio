/**
 * Search and fuzzy matching molecules
 * Depends on: atoms/text
 */

import { escapeHTML } from '../atoms/text';

/**
 * Fuzzy match result
 */
export interface FuzzyMatchResult {
  score: number;
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
 * - Consecutive match: +10 base +5 per consecutive char
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
      matches: [{ start: 0, end: text.length }],
    };
  }

  // Prefix match
  if (textLower.startsWith(patternLower)) {
    return {
      score: 50 + Math.min(pattern.length * 2, 20),
      matches: [{ start: 0, end: pattern.length }],
    };
  }

  // Word boundary match
  const words = textLower.split(/[-_\s\/]+/);
  let wordBoundaryScore = 0;
  const wordBoundaryMatches: Array<{ start: number; end: number }> = [];
  let remainingPattern = patternLower;
  let currentIndex = 0;

  for (const word of words) {
    if (remainingPattern.length === 0) break;

    if (word.startsWith(remainingPattern)) {
      wordBoundaryScore += 15 + Math.min(remainingPattern.length * 3, 15);
      wordBoundaryMatches.push({
        start: currentIndex,
        end: currentIndex + remainingPattern.length,
      });
      remainingPattern = '';
      break;
    } else if (remainingPattern.startsWith(word)) {
      wordBoundaryScore += 15 + Math.min(word.length * 3, 15);
      wordBoundaryMatches.push({
        start: currentIndex,
        end: currentIndex + word.length,
      });
      remainingPattern = remainingPattern.slice(word.length);
    }
    currentIndex += word.length + 1;
  }

  if (remainingPattern.length === 0 && wordBoundaryMatches.length > 0) {
    return {
      score: Math.min(wordBoundaryScore, 80),
      matches: wordBoundaryMatches,
    };
  }

  // Fuzzy matching
  const state: MatchState = {
    score: 10,
    matches: [],
    patternIndex: 0,
    textIndex: 0,
    consecutiveCount: 0,
    inMatch: false,
    matchStart: -1,
  };

  while (state.patternIndex < pattern.length && state.textIndex < text.length) {
    const textChar = textLower[state.textIndex];
    const patternChar = patternLower[state.patternIndex];

    if (textChar === patternChar) {
      if (!state.inMatch) {
        state.matchStart = state.textIndex;
        state.inMatch = true;
        state.consecutiveCount = 1;

        if (isWordBoundary(text, state.textIndex)) {
          state.score += 15;
        }
      } else {
        state.consecutiveCount += 1;
        state.score += 5;
      }

      state.patternIndex += 1;
    } else {
      if (state.inMatch) {
        state.matches.push({ start: state.matchStart, end: state.textIndex });
        state.inMatch = false;
        state.matchStart = -1;
      }
      state.score -= 1;
    }
    state.textIndex += 1;
  }

  if (state.inMatch) {
    state.matches.push({ start: state.matchStart, end: state.textIndex });
  }

  if (state.patternIndex === pattern.length) {
    return {
      score: Math.max(0, state.score),
      matches: state.matches,
    };
  }

  return null;
}

/**
 * Simple fuzzy match returning boolean
 */
export function fuzzyMatchSimple(pattern: string, text: string): boolean {
  if (!pattern) return true;
  if (!text) return false;

  const result = fuzzyMatch(text, pattern);
  return result !== null;
}

/**
 * Get fuzzy match score
 */
export function fuzzyScore(pattern: string, text: string): number {
  if (!pattern || !text) return 0;

  const result = fuzzyMatch(text, pattern);
  return result ? result.score : 0;
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
    return items.map((item) => ({ item, result: { score: 0, matches: [] } }));
  }

  const results: Array<{ item: T; result: FuzzyMatchResult }> = [];

  for (const item of items) {
    const text = getText(item);
    const match = fuzzyMatch(text, pattern);
    if (match !== null) {
      results.push({ item, result: match });
    }
  }

  results.sort((a, b) => b.result.score - a.result.score);
  return results;
}

/**
 * Filter array by fuzzy match
 */
export function fuzzyFilter<T>(
  items: T[],
  query: string,
  options: { key?: keyof T; threshold?: number } = {}
): T[] {
  if (!query.trim()) {
    return items;
  }

  const threshold = options.threshold || 0;

  return items.filter((item) => {
    const text = options.key ? String(item[options.key]) : String(item);
    const result = fuzzyMatch(text, query);
    return result !== null && result.score >= threshold;
  });
}

/**
 * Sort array by fuzzy match score
 */
export function fuzzySort<T>(
  items: T[],
  query: string,
  options: { key?: keyof T } = {}
): T[] {
  if (!query.trim()) {
    return [...items].sort((a, b) => {
      const aText = options.key ? String(a[options.key]) : String(a);
      const bText = options.key ? String(b[options.key]) : String(b);
      return aText.localeCompare(bText);
    });
  }

  const scored = items.map((item) => {
    const text = options.key ? String(item[options.key]) : String(item);
    const result = fuzzyMatch(text, query);
    return {
      item,
      score: result ? result.score : -1,
    };
  });

  return scored
    .filter((s) => s.score >= 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aText = options.key ? String(a.item[options.key]) : String(a.item);
      const bText = options.key ? String(b.item[options.key]) : String(b.item);
      return aText.localeCompare(bText);
    })
    .map((s) => s.item);
}

/**
 * Highlight matched characters with HTML tags
 */
export function highlightMatches(
  pattern: string,
  text: string,
  options: { tag?: string } = {}
): string {
  if (!pattern || !text) {
    return escapeHTML(text || '');
  }

  const result = fuzzyMatch(text, pattern);
  if (!result || result.matches.length === 0) {
    return escapeHTML(text);
  }

  const tag = options.tag || 'mark';
  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;

  let highlighted = '';
  let lastIndex = 0;

  for (const match of result.matches) {
    highlighted += escapeHTML(text.slice(lastIndex, match.start));
    highlighted += openTag + escapeHTML(text.slice(match.start, match.end)) + closeTag;
    lastIndex = match.end;
  }

  highlighted += escapeHTML(text.slice(lastIndex));
  return highlighted;
}
