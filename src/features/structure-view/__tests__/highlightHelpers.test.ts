import { describe, it, expect } from 'vitest';
import {
  splitByQuery,
  getTypeIcon,
  getTypeColor,
} from '../lib/highlightHelpers';

// ---------------------------------------------------------------------------
// splitByQuery
// ---------------------------------------------------------------------------
describe('splitByQuery', () => {
  it('returns single non-match segment for empty query', () => {
    const result = splitByQuery('Hello World', '');
    expect(result).toEqual([{ text: 'Hello World', isMatch: false }]);
  });

  it('returns single non-match segment for whitespace-only query', () => {
    const result = splitByQuery('Hello World', '   ');
    expect(result).toEqual([{ text: 'Hello World', isMatch: false }]);
  });

  it('highlights a single match at the start', () => {
    const result = splitByQuery('Hello World', 'Hel');
    expect(result).toEqual([
      { text: 'Hel', isMatch: true },
      { text: 'lo World', isMatch: false },
    ]);
  });

  it('highlights a single match at the end', () => {
    const result = splitByQuery('Hello World', 'orld');
    expect(result).toEqual([
      { text: 'Hello W', isMatch: false },
      { text: 'orld', isMatch: true },
    ]);
  });

  it('highlights a single match in the middle', () => {
    const result = splitByQuery('Hello World', 'lo W');
    expect(result).toEqual([
      { text: 'Hel', isMatch: false },
      { text: 'lo W', isMatch: true },
      { text: 'orld', isMatch: false },
    ]);
  });

  it('highlights multiple matches', () => {
    const result = splitByQuery('banana', 'an');
    expect(result).toEqual([
      { text: 'b', isMatch: false },
      { text: 'an', isMatch: true },
      { text: 'an', isMatch: true },
      { text: 'a', isMatch: false },
    ]);
  });

  it('matches case-insensitively', () => {
    const result = splitByQuery('Hello World', 'hello');
    expect(result).toEqual([
      { text: 'Hello', isMatch: true },
      { text: ' World', isMatch: false },
    ]);
  });

  it('returns single non-match segment when query is not found', () => {
    const result = splitByQuery('Hello World', 'xyz');
    expect(result).toEqual([{ text: 'Hello World', isMatch: false }]);
  });

  it('returns single match segment when query equals full text', () => {
    const result = splitByQuery('Hello', 'Hello');
    expect(result).toEqual([{ text: 'Hello', isMatch: true }]);
  });

  it('returns empty result array for empty text with non-empty query', () => {
    const result = splitByQuery('', 'abc');
    // No matches found, and lastIndex (0) is not < text.length (0),
    // so no trailing segment is added either.
    expect(result).toEqual([]);
  });

  it('uses first found match for overlapping potential matches', () => {
    // Searching "aa" in "aaa": first match at 0 consumes positions 0-1,
    // next search starts at 2, so the third "a" is a non-match remainder.
    const result = splitByQuery('aaa', 'aa');
    expect(result).toEqual([
      { text: 'aa', isMatch: true },
      { text: 'a', isMatch: false },
    ]);
  });

  it('preserves original casing in output segments', () => {
    const result = splitByQuery('HeLLo WoRLd', 'hello');
    expect(result).toEqual([
      { text: 'HeLLo', isMatch: true },
      { text: ' WoRLd', isMatch: false },
    ]);
    // The matched segment text must be the original casing, not the query casing
    expect(result[0].text).toBe('HeLLo');
  });
});

// ---------------------------------------------------------------------------
// getTypeIcon
// ---------------------------------------------------------------------------
describe('getTypeIcon', () => {
  it('returns "folder" for Collection', () => {
    expect(getTypeIcon('Collection')).toBe('folder');
  });

  it('returns "description" for Manifest', () => {
    expect(getTypeIcon('Manifest')).toBe('description');
  });

  it('returns "image" for Canvas', () => {
    expect(getTypeIcon('Canvas')).toBe('image');
  });

  it('returns "format_list_bulleted" for Range', () => {
    expect(getTypeIcon('Range')).toBe('format_list_bulleted');
  });

  it('returns "label" for an unknown type', () => {
    expect(getTypeIcon('SomethingElse')).toBe('label');
  });
});

// ---------------------------------------------------------------------------
// getTypeColor
// ---------------------------------------------------------------------------
describe('getTypeColor', () => {
  it('returns "text-nb-blue" for Collection', () => {
    expect(getTypeColor('Collection')).toBe('text-nb-blue');
  });

  it('returns "text-nb-purple" for Canvas', () => {
    expect(getTypeColor('Canvas')).toBe('text-nb-purple');
  });

  it('returns "text-nb-black/50" for an unknown type', () => {
    expect(getTypeColor('UnknownType')).toBe('text-nb-black/50');
  });
});
