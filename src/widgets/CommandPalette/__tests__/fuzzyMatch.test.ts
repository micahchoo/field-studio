import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  fuzzyScore,
  fuzzyHighlightRanges,
  renderHighlighted,
} from '../lib/fuzzyMatch';

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------
describe('escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than signs', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes greater-than signs', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('leaves normal text untouched', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('escapes combined entities in one string', () => {
    expect(escapeHtml('<b>Tom & Jerry</b>')).toBe(
      '&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;'
    );
  });
});

// ---------------------------------------------------------------------------
// fuzzyScore
// ---------------------------------------------------------------------------
describe('fuzzyScore', () => {
  it('returns a high score for exact match', () => {
    const score = fuzzyScore('Open File', 'open file');
    expect(score).toBeGreaterThan(0);
  });

  it('scores partial match when all query chars are found', () => {
    // "ofl" matches "Open File" -> O(0), F(5 word boundary), l(8 - not present?)
    // Actually let's use "opf" -> O(0), p(1), f(5 word boundary)
    const score = fuzzyScore('Open File', 'opf');
    expect(score).toBeGreaterThan(0);
  });

  it('returns 0 when query chars are not all found', () => {
    expect(fuzzyScore('Open File', 'xyz')).toBe(0);
  });

  it('is case insensitive', () => {
    const lower = fuzzyScore('Open File', 'open');
    const upper = fuzzyScore('Open File', 'OPEN'.toLowerCase());
    expect(lower).toBe(upper);
    expect(lower).toBeGreaterThan(0);
  });

  it('gives consecutive character matches a boost', () => {
    // "ope" matches consecutively at positions 0,1,2
    // "ofe" would be non-consecutive (o=0, f=5, e=8)
    const consecutive = fuzzyScore('Open File', 'ope');
    const nonConsecutive = fuzzyScore('Open File', 'ofe');
    expect(consecutive).toBeGreaterThan(nonConsecutive);
  });

  it('gives a word boundary bonus', () => {
    // "f" at position 5 (word boundary after space) should score higher
    // than "i" at position 6 (not a boundary)
    const boundaryScore = fuzzyScore('Open File', 'f');
    const midWordScore = fuzzyScore('Open File', 'i');
    expect(boundaryScore).toBeGreaterThan(midWordScore);
  });

  it('returns 0 for empty query (no chars to match)', () => {
    // qi starts at 0, query.length is 0 => qi === query.length => score 0
    expect(fuzzyScore('Open File', '')).toBe(0);
  });

  it('returns 0 for empty text', () => {
    expect(fuzzyScore('', 'abc')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fuzzyHighlightRanges
// ---------------------------------------------------------------------------
describe('fuzzyHighlightRanges', () => {
  it('returns no ranges for empty query', () => {
    expect(fuzzyHighlightRanges('Hello World', '')).toEqual([]);
  });

  it('returns a single-char range for a one-character query', () => {
    const ranges = fuzzyHighlightRanges('Hello', 'h');
    expect(ranges).toEqual([[0, 1]]);
  });

  it('returns ranges for multiple matched characters', () => {
    const ranges = fuzzyHighlightRanges('Hello', 'hlo');
    // h matches at 0, l matches at 2, o matches at 4
    // h(0) alone -> [0,1], l(2) alone -> [2,3], o(4) alone -> [4,5]
    expect(ranges.length).toBeGreaterThanOrEqual(1);
    // Verify that all query chars are covered somewhere
    const coveredChars = ranges.reduce((sum, [s, e]) => sum + (e - s), 0);
    expect(coveredChars).toBe(3);
  });

  it('merges contiguous matches into a single range', () => {
    const ranges = fuzzyHighlightRanges('Hello', 'hel');
    // h(0), e(1), l(2) are contiguous => single range [0, 3]
    expect(ranges).toEqual([[0, 3]]);
  });

  it('produces non-contiguous ranges for scattered matches', () => {
    const ranges = fuzzyHighlightRanges('Open File', 'of');
    // O matches at 0, F matches at 5 (word boundary) => two separate ranges
    expect(ranges.length).toBe(2);
    expect(ranges[0][0]).toBe(0); // 'O'
    expect(ranges[1][0]).toBe(5); // 'F'
  });

  it('returns no ranges when query does not match', () => {
    const ranges = fuzzyHighlightRanges('Hello', 'xyz');
    // fuzzyHighlightRanges walks the string but won't match all chars;
    // if no chars match at all, ranges should be empty
    expect(ranges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// renderHighlighted
// ---------------------------------------------------------------------------
describe('renderHighlighted', () => {
  const markOpen = '<mark class="bg-theme-primary/20 text-theme-text rounded-sm px-0.5">';
  const markClose = '</mark>';

  it('returns escaped text when ranges are empty', () => {
    expect(renderHighlighted('Tom & Jerry', [])).toBe('Tom &amp; Jerry');
  });

  it('highlights a single range', () => {
    const result = renderHighlighted('Hello', [[0, 3]]);
    expect(result).toBe(
      `${markOpen}Hel${markClose}lo`
    );
  });

  it('highlights multiple ranges', () => {
    const result = renderHighlighted('Open File', [[0, 1], [5, 6]]);
    expect(result).toBe(
      `${markOpen}O${markClose}pen ${markOpen}F${markClose}ile`
    );
  });

  it('handles a range at the very start of the string', () => {
    const result = renderHighlighted('ABC', [[0, 2]]);
    expect(result).toBe(`${markOpen}AB${markClose}C`);
  });

  it('handles a range at the very end of the string', () => {
    const result = renderHighlighted('ABC', [[1, 3]]);
    expect(result).toBe(`A${markOpen}BC${markClose}`);
  });

  it('escapes HTML entities inside highlighted ranges', () => {
    const result = renderHighlighted('A<B', [[0, 3]]);
    expect(result).toBe(`${markOpen}A&lt;B${markClose}`);
  });

  it('escapes HTML entities outside highlighted ranges', () => {
    const result = renderHighlighted('A & <B>', [[0, 1]]);
    expect(result).toBe(`${markOpen}A${markClose} &amp; &lt;B&gt;`);
  });
});
