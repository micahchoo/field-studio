/**
 * Fuzzy matching utilities for the Command Palette.
 *
 * Extracted from CommandPalette.svelte so they can be unit-tested
 * independently and reused elsewhere.
 */

/**
 * Escape HTML special characters to prevent injection.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Simple fuzzy scoring: consecutive char matches score higher.
 * Returns 0 for no match, higher values for better matches.
 */
export function fuzzyScore(text: string, query: string): number {
  const lower = text.toLowerCase();
  let score = 0;
  let qi = 0;
  let consecutive = 0;

  for (let ti = 0; ti < lower.length && qi < query.length; ti++) {
    if (lower[ti] === query[qi]) {
      qi++;
      consecutive++;
      score += consecutive; // Consecutive matches boost score
      // Bonus for matching at word boundaries
      if (ti === 0 || text[ti - 1] === ' ' || text[ti - 1] === '/') {
        score += 2;
      }
    } else {
      consecutive = 0;
    }
  }

  // All query chars must be found
  return qi === query.length ? score : 0;
}

/**
 * Compute highlight ranges for fuzzy match display.
 * Returns array of [start, end] tuples for each contiguous match.
 */
export function fuzzyHighlightRanges(
  text: string,
  query: string
): [number, number][] {
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  let qi = 0;
  let rangeStart = -1;

  for (let ti = 0; ti < lower.length && qi < query.length; ti++) {
    if (lower[ti] === query[qi]) {
      if (rangeStart === -1) rangeStart = ti;
      qi++;
    } else if (rangeStart !== -1) {
      ranges.push([rangeStart, ti]);
      rangeStart = -1;
    }
  }
  if (rangeStart !== -1) {
    ranges.push([rangeStart, rangeStart + (qi - ranges.reduce((s, r) => s + r[1] - r[0], 0))]);
  }

  return ranges;
}

/**
 * Render text with highlighted ranges as HTML string.
 * Safe because highlight ranges come from our own fuzzy algorithm,
 * and text comes from command definitions (not user input).
 */
export function renderHighlighted(text: string, ranges: [number, number][]): string {
  if (ranges.length === 0) return escapeHtml(text);

  let result = '';
  let lastEnd = 0;

  for (const [start, end] of ranges) {
    result += escapeHtml(text.slice(lastEnd, start));
    result += `<mark class="bg-theme-primary/20 text-theme-text rounded-sm px-0.5">${escapeHtml(text.slice(start, end))}</mark>`;
    lastEnd = end;
  }
  result += escapeHtml(text.slice(lastEnd));

  return result;
}
