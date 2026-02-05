/**
 * Text manipulation primitives
 * Zero dependencies - can be imported by any layer
 */

/**
 * Escape HTML special characters to prevent XSS
 * Converts <, >, &, ", and ' to their HTML entity equivalents
 */
export function escapeHTML(text: string): string {
  if (!text) {
    return '';
  }

  return (
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  );
}

/**
 * Strip all HTML tags from content, returning only plain text
 */
export function stripTags(html: string): string {
  if (!html) {
    return '';
  }
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Normalize whitespace (multiple spaces/newlines to single space)
 */
export function normalizeWhitespace(text: string): string {
  if (!text) {
    return '';
  }
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Convert camelCase to kebab-case
 */
export function toKebabCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Convert kebab-case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
