/**
 * Unit Tests for utils/sanitization.ts
 *
 * Tests HTML sanitization, XSS prevention, and content security.
 */

import { describe, expect, it } from 'vitest';
import {
  escapeHTML,
  isValidURL,
  sanitizeAnnotationBody,
  sanitizeHTML,
  sanitizeURL,
  stripHTML,
} from '@/utils/sanitization';

// ============================================================================
// sanitizeHTML Tests
// ============================================================================

describe('sanitizeHTML', () => {
  it('should allow safe HTML tags', () => {
    const safe = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeHTML(safe);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
  });

  it('should remove script tags', () => {
    const unsafe = '<p>Hello</p><script>alert("XSS")</script>';
    const result = sanitizeHTML(unsafe);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should remove event handlers', () => {
    const unsafe = '<div onclick="alert(\'XSS\')">Click</div>';
    const result = sanitizeHTML(unsafe);
    expect(result).not.toContain('onclick');
  });

  it('should remove javascript: URLs', () => {
    const unsafe = '<a href="javascript:alert(\'XSS\')">Link</a>';
    const result = sanitizeHTML(unsafe);
    expect(result).not.toContain('javascript:');
  });

  it('should allow data URLs for images', () => {
    const dataURL = '<img src="data:image/png;base64,iVBORw0KGg...">';
    const result = sanitizeHTML(dataURL);
    expect(result).toContain('data:image/png');
  });

  it('should remove style tags', () => {
    const unsafe = '<style>body { display: none; }</style><p>Text</p>';
    const result = sanitizeHTML(unsafe);
    expect(result).not.toContain('<style>');
  });

  it('should allow safe links', () => {
    const safe = '<a href="https://example.com">Link</a>';
    const result = sanitizeHTML(safe);
    expect(result).toContain('href="https://example.com"');
  });
});

// ============================================================================
// sanitizeURL Tests
// ============================================================================

describe('sanitizeURL', () => {
  it('should allow HTTP URLs', () => {
    expect(sanitizeURL('http://example.com')).toBe('http://example.com');
    expect(sanitizeURL('https://example.com')).toBe('https://example.com');
  });

  it('should allow IIIF URLs', () => {
    expect(sanitizeURL('iiif://example.com/image')).toBe('iiif://example.com/image');
  });

  it('should block javascript: URLs', () => {
    expect(sanitizeURL('javascript:alert("XSS")')).toBe('');
  });

  it('should block data: URLs', () => {
    expect(sanitizeURL('data:text/html,<script>alert("XSS")</script>')).toBe('');
  });

  it('should allow relative URLs', () => {
    expect(sanitizeURL('/path/to/resource')).toBe('/path/to/resource');
  });

  it('should handle null and undefined', () => {
    expect(sanitizeURL(null as any)).toBe('');
    expect(sanitizeURL(undefined as any)).toBe('');
  });

  it('should decode URL encoding', () => {
    expect(sanitizeURL('https://example.com/path%20with%20spaces')).toBeTruthy();
  });
});

// ============================================================================
// sanitizeAnnotationBody Tests
// ============================================================================

describe('sanitizeAnnotationBody', () => {
  it('should sanitize TextualBody content', () => {
    const body = {
      type: 'TextualBody',
      value: '<p>Safe</p><script>alert("XSS")</script>',
      format: 'text/html',
    };

    const result = sanitizeAnnotationBody(body);
    expect(result.value).not.toContain('<script>');
    expect(result.value).toContain('<p>Safe</p>');
  });

  it('should handle plain text bodies', () => {
    const body = {
      type: 'TextualBody',
      value: 'Plain text with <tags>',
      format: 'text/plain',
    };

    const result = sanitizeAnnotationBody(body);
    expect(result.value).toBe('Plain text with <tags>');
  });

  it('should handle array of bodies', () => {
    const bodies = [
      { type: 'TextualBody', value: '<p>First</p><script>bad</script>' },
      { type: 'TextualBody', value: '<p>Second</p>' },
    ];

    const result = bodies.map(sanitizeAnnotationBody);
    expect(result[0].value).not.toContain('<script>');
    expect(result[1].value).toContain('<p>Second</p>');
  });
});

// ============================================================================
// stripHTML Tests
// ============================================================================

describe('stripHTML', () => {
  it('should remove all HTML tags', () => {
    expect(stripHTML('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('should handle nested tags', () => {
    expect(stripHTML('<div><p><span>Text</span></p></div>')).toBe('Text');
  });

  it('should preserve whitespace', () => {
    expect(stripHTML('<p>Hello</p> <p>world</p>')).toContain('Hello');
    expect(stripHTML('<p>Hello</p> <p>world</p>')).toContain('world');
  });

  it('should handle malformed HTML', () => {
    expect(stripHTML('<p>Unclosed tag')).toBe('Unclosed tag');
  });

  it('should handle empty string', () => {
    expect(stripHTML('')).toBe('');
  });

  it('should handle text without HTML', () => {
    expect(stripHTML('Plain text')).toBe('Plain text');
  });
});

// ============================================================================
// escapeHTML Tests
// ============================================================================

describe('escapeHTML', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHTML('<div>')).toBe('&lt;div&gt;');
    expect(escapeHTML('A & B')).toBe('A &amp; B');
    expect(escapeHTML('"quoted"')).toContain('&quot;');
  });

  it('should escape apostrophes', () => {
    expect(escapeHTML("It's")).toContain('&#39;');
  });

  it('should handle multiple characters', () => {
    const result = escapeHTML('<script>alert("XSS")</script>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('should handle empty string', () => {
    expect(escapeHTML('')).toBe('');
  });

  it('should not double-escape', () => {
    const escaped = escapeHTML('&lt;div&gt;');
    expect(escaped).toBe('&amp;lt;div&amp;gt;');
  });
});

// ============================================================================
// isValidURL Tests
// ============================================================================

describe('isValidURL', () => {
  it('should validate HTTP URLs', () => {
    expect(isValidURL('http://example.com')).toBe(true);
    expect(isValidURL('https://example.com')).toBe(true);
  });

  it('should validate URLs with paths', () => {
    expect(isValidURL('https://example.com/path/to/resource')).toBe(true);
  });

  it('should validate URLs with query parameters', () => {
    expect(isValidURL('https://example.com?query=value')).toBe(true);
  });

  it('should reject invalid protocols', () => {
    expect(isValidURL('javascript:alert("XSS")')).toBe(false);
    expect(isValidURL('data:text/html,<script>')).toBe(false);
  });

  it('should reject malformed URLs', () => {
    expect(isValidURL('not a url')).toBe(false);
    expect(isValidURL('htt://broken.com')).toBe(false);
  });

  it('should handle empty strings', () => {
    expect(isValidURL('')).toBe(false);
  });

  it('should validate localhost URLs', () => {
    expect(isValidURL('http://localhost:3000')).toBe(true);
  });
});
