/**
 * HTML and content sanitization molecules
 * Depends on: atoms/text, atoms/regex
 */

import { escapeHTML, stripTags } from '../atoms/text';
import { SCRIPT_PATTERN, EVENT_HANDLER_PATTERN } from '../atoms/regex';

/**
 * Sanitizer configuration options
 */
export interface SanitizeConfig {
  allowedTags?: string[];
  allowedAttributes?: string[];
  stripAll?: boolean;
}

/**
 * Default HTML sanitization config
 */
const DEFAULT_HTML_CONFIG: SanitizeConfig = {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'img'],
  allowedAttributes: ['href', 'target', 'src', 'alt'],
  stripAll: false,
};

/**
 * Sanitize HTML content
 * Removes dangerous tags and attributes while preserving safe formatting
 */
export function sanitizeHTML(
  html: string,
  config: SanitizeConfig = DEFAULT_HTML_CONFIG
): string {
  if (!html) {
    return '';
  }

  let sanitized = html;

  // Remove script tags first (most dangerous)
  sanitized = sanitized.replace(SCRIPT_PATTERN, '');

  // Remove event handlers
  sanitized = sanitized.replace(EVENT_HANDLER_PATTERN, '');

  // If stripAll, remove all tags
  if (config.stripAll) {
    return stripTags(sanitized);
  }

  // TODO: Implement tag/attribute filtering based on config
  // For now, use simple regex-based approach
  const allowedTags = config.allowedTags || [];
  const allowedAttrs = config.allowedAttributes || [];

  // Remove style attributes and on* handlers
  sanitized = sanitized.replace(/\s*style\s*=\s*"[^"]*"/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '');

  return sanitized;
}

/**
 * Sanitize URL to prevent javascript: protocol attacks
 */
export function sanitizeURL(url: string): string {
  if (!url) {
    return '';
  }

  const urlStr = url.trim();

  if (!urlStr) {
    return '';
  }

  // Check for dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(urlStr)) {
    // eslint-disable-next-line no-console
    console.warn('Blocked dangerous URL protocol:', urlStr.substring(0, 50));
    return '';
  }

  // Validate it's a valid URL format
  try {
    // eslint-disable-next-line no-new
    new URL(urlStr);
    return urlStr;
  } catch {
    // Allow relative URLs
    if (
      urlStr.startsWith('/') ||
      urlStr.startsWith('./') ||
      urlStr.startsWith('../')
    ) {
      return urlStr;
    }
    // Allow hash-only URLs
    if (urlStr.startsWith('#')) {
      return urlStr;
    }
    return '';
  }
}

/**
 * Sanitize to plain text only
 */
export function sanitizePlainText(content: string): string {
  if (!content) {
    return '';
  }

  // First sanitize HTML
  const sanitized = sanitizeHTML(content, { stripAll: true });

  // Then decode HTML entities by creating a temporary element
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.innerHTML = sanitized;
    return div.textContent || div.innerText || '';
  }

  return sanitized;
}

/**
 * Check if content contains potentially dangerous HTML
 */
export function containsDangerousContent(content: string): boolean {
  if (!content) {
    return false;
  }

  const hasScriptTags = SCRIPT_PATTERN.test(content);
  const hasEventHandlers = /\s(on\w+)\s*=/i.test(content);
  const hasJsProtocol = /javascript:/i.test(content);
  const hasDataUri = /data:text\/html/i.test(content);

  return hasScriptTags || hasEventHandlers || hasJsProtocol || hasDataUri;
}

/**
 * Sanitize SVG content
 */
export function sanitizeSVG(svg: string): string {
  if (!svg) {
    return '';
  }

  // Remove script tags
  let sanitized = svg.replace(SCRIPT_PATTERN, '');

  // Remove event handlers
  sanitized = sanitized.replace(EVENT_HANDLER_PATTERN, '');

  return sanitized;
}

/**
 * Sanitize a user input attribute value
 */
export function sanitizeAttribute(value: string): string {
  if (!value) {
    return '';
  }

  // Strip HTML tags first
  const withoutTags = stripTags(value);

  // Escape dangerous characters
  return (
    withoutTags
      // eslint-disable-next-line quotes
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/`/g, '&#x60;')
      .replace(/\0/g, '')
  );
}
