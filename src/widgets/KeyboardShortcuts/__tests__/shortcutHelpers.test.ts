import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  formatKey,
  getCategoryLabel,
} from '../lib/shortcutHelpers';

// ---------------------------------------------------------------------------
// escapeHtml
// ---------------------------------------------------------------------------
describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes all four special characters in a combined string', () => {
    expect(escapeHtml('<div class="a" & b>')).toBe(
      '&lt;div class=&quot;a&quot; &amp; b&gt;',
    );
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns normal text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });
});

// ---------------------------------------------------------------------------
// formatKey
// ---------------------------------------------------------------------------
describe('formatKey', () => {
  describe('Mac mode (isMac = true)', () => {
    it('replaces Ctrl with Command symbol', () => {
      expect(formatKey('Ctrl', true)).toBe('\u2318');
    });

    it('replaces Alt with Option symbol', () => {
      expect(formatKey('Alt', true)).toBe('\u2325');
    });

    it('replaces Shift with Shift symbol', () => {
      expect(formatKey('Shift', true)).toBe('\u21E7');
    });

    it('replaces Enter with Return symbol', () => {
      expect(formatKey('Enter', true)).toBe('\u21A9');
    });

    it('replaces Backspace with Delete symbol', () => {
      expect(formatKey('Backspace', true)).toBe('\u232B');
    });

    it('handles combined key string (Ctrl+Shift+Z)', () => {
      expect(formatKey('Ctrl+Shift+Z', true)).toBe('\u2318+\u21E7+Z');
    });

    it('leaves normal keys unchanged on Mac', () => {
      expect(formatKey('Z', true)).toBe('Z');
    });
  });

  describe('Non-Mac mode (isMac = false)', () => {
    it('returns Ctrl unchanged', () => {
      expect(formatKey('Ctrl', false)).toBe('Ctrl');
    });

    it('returns Alt unchanged', () => {
      expect(formatKey('Alt', false)).toBe('Alt');
    });

    it('returns Shift unchanged', () => {
      expect(formatKey('Shift', false)).toBe('Shift');
    });

    it('returns Enter unchanged', () => {
      expect(formatKey('Enter', false)).toBe('Enter');
    });

    it('returns Backspace unchanged', () => {
      expect(formatKey('Backspace', false)).toBe('Backspace');
    });

    it('returns combined key string unchanged', () => {
      expect(formatKey('Ctrl+Shift+Z', false)).toBe('Ctrl+Shift+Z');
    });
  });
});

// ---------------------------------------------------------------------------
// getCategoryLabel
// ---------------------------------------------------------------------------
describe('getCategoryLabel', () => {
  const categories = [
    { id: 'navigation', label: 'Navigation' },
    { id: 'editing', label: 'Editing' },
    { id: 'selection', label: 'Selection' },
  ];

  it('returns the label for a known category', () => {
    expect(getCategoryLabel('editing', categories)).toBe('Editing');
  });

  it('falls back to the raw id for an unknown category', () => {
    expect(getCategoryLabel('unknown-cat', categories)).toBe('unknown-cat');
  });

  it('falls back to the raw id when categories array is empty', () => {
    expect(getCategoryLabel('navigation', [])).toBe('navigation');
  });
});
