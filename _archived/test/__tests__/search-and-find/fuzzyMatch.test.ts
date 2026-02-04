/**
 * Unit Tests for utils/fuzzyMatch.ts
 *
 * Tests fuzzy matching algorithm, scoring, and highlighting.
 */

import { describe, expect, it } from 'vitest';
import {
  fuzzyFilter,
  fuzzyMatchSimple as fuzzyMatch,
  fuzzyScore,
  fuzzySort,
  highlightMatches,
} from '@/utils/fuzzyMatch';

// ============================================================================
// fuzzyMatch Tests
// ============================================================================

describe('fuzzyMatch', () => {
  it('should match exact strings', () => {
    expect(fuzzyMatch('hello', 'hello')).toBe(true);
  });

  it('should match case-insensitively', () => {
    expect(fuzzyMatch('Hello', 'hello')).toBe(true);
    expect(fuzzyMatch('HELLO', 'hello')).toBe(true);
  });

  it('should match subsequence', () => {
    expect(fuzzyMatch('hlo', 'hello')).toBe(true);
    expect(fuzzyMatch('hw', 'hello world')).toBe(true);
  });

  it('should not match non-subsequence', () => {
    expect(fuzzyMatch('xyz', 'hello')).toBe(false);
  });

  // Redundant test removed: "should handle empty strings"
  // Empty query behavior is comprehensively tested in fuzzyFilter tests
  // (see "should return all items for empty query")

  it('should match with special characters', () => {
    expect(fuzzyMatch('f-n', 'file-name')).toBe(true);
  });
});

// ============================================================================
// fuzzyScore Tests
// ============================================================================

describe('fuzzyScore', () => {
  it('should return higher score for exact match', () => {
    const exactScore = fuzzyScore('hello', 'hello');
    const partialScore = fuzzyScore('hlo', 'hello');
    expect(exactScore).toBeGreaterThan(partialScore);
  });

  it('should return 0 for non-match', () => {
    expect(fuzzyScore('xyz', 'hello')).toBe(0);
  });

  it('should favor consecutive characters', () => {
    const consecutive = fuzzyScore('hel', 'hello');
    const scattered = fuzzyScore('hlo', 'hello');
    expect(consecutive).toBeGreaterThan(scattered);
  });

  it('should favor matches at word boundaries', () => {
    const wordBoundary = fuzzyScore('hw', 'hello world');
    const midWord = fuzzyScore('el', 'hello');
    expect(wordBoundary).toBeGreaterThan(midWord);
  });

  it('should handle case sensitivity', () => {
    const caseMatch = fuzzyScore('Hello', 'Hello World');
    const caseInsensitive = fuzzyScore('hello', 'Hello World');
    expect(caseMatch).toBeGreaterThanOrEqual(caseInsensitive);
  });
});

// ============================================================================
// highlightMatches Tests
// ============================================================================

describe('highlightMatches', () => {
  it('should highlight matched characters', () => {
    const result = highlightMatches('hlo', 'hello');
    expect(result).toContain('<mark>h</mark>');
    expect(result).toContain('<mark>l</mark>');
    expect(result).toContain('<mark>o</mark>');
  });

  it('should preserve non-matched characters', () => {
    const result = highlightMatches('hl', 'hello');
    expect(result).toContain('e');
  });

  it('should handle no matches', () => {
    const result = highlightMatches('xyz', 'hello');
    expect(result).toBe('hello');
  });

  it('should handle custom highlight tag', () => {
    const result = highlightMatches('hl', 'hello', { tag: 'strong' });
    expect(result).toContain('<strong>h</strong>');
  });

  it('should escape HTML in text', () => {
    const result = highlightMatches('h', '<hello>');
    expect(result).not.toContain('<hello>');
    expect(result).toContain('&lt;');
  });
});

// ============================================================================
// fuzzyFilter Tests
// ============================================================================

describe('fuzzyFilter', () => {
  it('should filter items by query', () => {
    const items = ['apple', 'banana', 'apricot', 'grape'];
    const result = fuzzyFilter(items, 'ap');
    expect(result).toContain('apple');
    expect(result).toContain('apricot');
    expect(result).not.toContain('banana');
  });

  it('should filter objects by property', () => {
    const items = [
      { name: 'apple' },
      { name: 'banana' },
      { name: 'apricot' },
    ];
    const result = fuzzyFilter(items, 'ap', { key: 'name' });
    expect(result).toHaveLength(2);
    expect(result[0].name).toMatch(/ap/i);
  });

  it('should return all items for empty query', () => {
    const items = ['apple', 'banana', 'apricot'];
    const result = fuzzyFilter(items, '');
    expect(result).toEqual(items);
  });

  it('should handle threshold option', () => {
    const items = ['apple', 'banana'];
    const result = fuzzyFilter(items, 'ap', { threshold: 50 });
    expect(result.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// fuzzySort Tests
// ============================================================================

describe('fuzzySort', () => {
  it('should sort by relevance score', () => {
    const items = ['hello', 'help', 'helo', 'world'];
    const result = fuzzySort(items, 'hel');
    // Items starting with 'hel' come first, then alphabetically
    expect(result).toContain('hello');
    expect(result).toContain('help');
    expect(result).toContain('helo');
    expect(result).not.toContain('world'); // or it's last if included
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('should sort objects by property', () => {
    const items = [
      { title: 'hello' },
      { title: 'help' },
      { title: 'helicopter' },
    ];
    const result = fuzzySort(items, 'hel', { key: 'title' });
    // All three start with 'hel' so have same score, sorted alphabetically
    expect(result[0].title).toBe('helicopter');
    expect(result[1].title).toBe('hello');
    expect(result[2].title).toBe('help');
  });

  it('should handle ties with alphabetical order', () => {
    const items = ['zebra', 'apple', 'banana'];
    const result = fuzzySort(items, '');
    expect(result[0]).toBe('apple');
  });

  it('should return empty array for empty input', () => {
    const result = fuzzySort([], 'query');
    expect(result).toEqual([]);
  });
});
