/**
 * Sanitization utilities for XSS prevention
 * 
 * Centralizes all input sanitization using DOMPurify to prevent XSS attacks.
 * Used for annotation bodies, user-generated content, and any text rendered as HTML.
 */

import DOMPurify from 'dompurify';

/**
 * Configuration for annotation body sanitization
 * Allows basic formatting but strips dangerous content
 */
/**
 * Standard HTML sanitization config for user-generated content
 * Limited to basic formatting tags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br']
 * Allowed attributes: ['href', 'target']
 */
const HTML_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOW_DATA_ATTR: false,
  // Prevent javascript: URLs
  SANITIZE_DOM: true,
  // Keep text content of removed tags
  KEEP_CONTENT: true,
  // Block dangerous attributes
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  // Return string instead of TrustedHTML
  RETURN_TRUSTED_TYPE: false,
};

const ANNOTATION_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'class', 'title'],
  ALLOW_DATA_ATTR: false,
  // Prevent javascript: URLs
  SANITIZE_DOM: true,
  // Keep text content of removed tags
  KEEP_CONTENT: true,
  // Block dangerous protocols
  FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
  // Return string instead of TrustedHTML
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Strict configuration for plain text-like content
 * Removes all HTML, returns plain text only
 */
const PLAIN_TEXT_CONFIG = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Sanitize annotation body content
 * Allows safe HTML formatting while preventing XSS
 * 
 * @param content Raw annotation body content
 * @returns Sanitized HTML string safe for rendering
 * 
 * @example
 * const rawBody = "<script>alert('xss')</script><b>Important note</b>";
 * const safeBody = sanitizeAnnotationBody(rawBody);
 * // Returns: "<b>Important note</b>"
 */
export function sanitizeAnnotationBody(content: unknown): string {
  if (content === null || content === undefined) {
    return '';
  }
  
  const text = String(content);
  
  // Handle empty or whitespace-only content
  if (!text.trim()) {
    return '';
  }
  
  return String(DOMPurify.sanitize(text, ANNOTATION_CONFIG));
}

/**
 * Sanitize to plain text only
 * Strips all HTML tags, returns clean text
 * 
 * @param content Raw content
 * @returns Plain text string
 * 
 * @example
 * const raw = "<p>Hello <b>world</b></p>";
 * const text = sanitizePlainText(raw);
 * // Returns: "Hello world"
 */
export function sanitizePlainText(content: unknown): string {
  if (content === null || content === undefined) {
    return '';
  }
  
  const text = String(content);
  
  if (!text.trim()) {
    return '';
  }
  
  // First sanitize to remove dangerous content
  const sanitized = String(DOMPurify.sanitize(text, PLAIN_TEXT_CONFIG));
  
  // Then strip remaining HTML entities
  const div = document.createElement('div');
  div.innerHTML = sanitized;
  return div.textContent || div.innerText || '';
}

/**
 * Sanitize URL to prevent javascript: protocol attacks
 * 
 * @param url URL to sanitize
 * @returns Safe URL or empty string if unsafe
 * 
 * @example
 * const safe = sanitizeUrl("javascript:alert('xss')");
 * // Returns: ""
 * const safe = sanitizeUrl("https://example.com");
 * // Returns: "https://example.com"
 */
export function sanitizeUrl(url: unknown): string {
  if (url === null || url === undefined) {
    return '';
  }
  
  const urlStr = String(url).trim();
  
  if (!urlStr) {
    return '';
  }
  
  // Check for dangerous protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(urlStr)) {
    console.warn('Blocked dangerous URL protocol:', urlStr.substring(0, 50));
    return '';
  }
  
  // Validate it's a valid URL format
  try {
    new URL(urlStr);
    return urlStr;
  } catch {
    // Allow relative URLs (starting with / or ./ or ../)
    if (urlStr.startsWith('/') || urlStr.startsWith('./') || urlStr.startsWith('../')) {
      return urlStr;
    }
    // Allow hash-only URLs for in-page anchors
    if (urlStr.startsWith('#')) {
      return urlStr;
    }
    return '';
  }
}

/**
 * Sanitize IIIF identifier to ensure it's safe
 * IIIF IDs should be valid URIs
 * 
 * @param id Identifier to validate
 * @returns Original ID if valid, empty string if potentially dangerous
 */
export function sanitizeIIIFId(id: unknown): string {
  if (id === null || id === undefined) {
    return '';
  }
  
  const idStr = String(id).trim();
  
  if (!idStr) {
    return '';
  }
  
  // IDs should be valid HTTP(S) URIs
  const isValidUri = /^https?:\/\//i.test(idStr) || 
                     /^urn:/i.test(idStr) || 
                     idStr.startsWith('data:');
  
  if (!isValidUri) {
    // Allow relative URIs (common in local development)
    return idStr;
  }
  
  // Check for script injection in URL
  const hasScript = /<script|javascript:|on\w+=/i.test(idStr);
  if (hasScript) {
    console.warn('Blocked potentially dangerous IIIF ID:', idStr.substring(0, 50));
    return '';
  }
  
  return idStr;
}

/**
 * Validate and sanitize metadata values
 * Metadata should be plain text without HTML
 * 
 * @param value Metadata value
 * @returns Sanitized plain text
 */
export function sanitizeMetadataValue(value: unknown): string {
  return sanitizePlainText(value);
}

/**
 * Check if content contains potentially dangerous HTML
 * Useful for validation before storage
 * 
 * @param content Content to check
 * @returns True if dangerous content detected
 */
export function containsDangerousContent(content: unknown): boolean {
  if (content === null || content === undefined) {
    return false;
  }
  
  const text = String(content);
  
  // Check for script tags
  const hasScriptTags = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(text);
  
  // Check for event handlers
  const hasEventHandlers = /\s(on\w+)\s*=/i.test(text);
  
  // Check for javascript: protocol
  const hasJsProtocol = /javascript:/i.test(text);
  
  // Check for data: URI with executable content
  const hasDataUri = /data:text\/html/i.test(text);
  
  return hasScriptTags || hasEventHandlers || hasJsProtocol || hasDataUri;
}

/**
 * Sanitize user input for display in UI
 * General-purpose sanitizer for user-generated content
 * 
 * @param input Raw user input
 * @returns Sanitized string safe for React rendering
 */
export function sanitizeUserInput(input: unknown): string {
  return sanitizePlainText(input);
}

/**
 * Create a sanitized HTML string for trusted content
 * Only use for content from trusted sources (e.g., IIIF manifests)
 *
 * @param html HTML content
 * @returns Sanitized HTML
 */
export function sanitizeTrustedHtml(html: unknown): string {
  if (html === null || html === undefined) {
    return '';
  }
  
  return String(DOMPurify.sanitize(String(html), {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div'],
    ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'title'],
    ALLOW_DATA_ATTR: false,
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
    RETURN_TRUSTED_TYPE: false,
  }));
}

/**
 * General-purpose HTML sanitization for user-generated content
 * Uses strict allowed tags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br']
 * and allowed attributes: ['href', 'target']
 *
 * @param html HTML content to sanitize
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * const raw = "<script>alert('xss')</script><b>Bold text</b><p style='color:red'>paragraph</p>";
 * const safe = sanitizeHTML(raw);
 * // Returns: "<b>Bold text</b><p>paragraph</p>"
 */
export function sanitizeHTML(html: unknown): string {
  if (html === null || html === undefined) {
    return '';
  }
  
  const text = String(html);
  
  if (!text.trim()) {
    return '';
  }
  
  return String(DOMPurify.sanitize(text, HTML_CONFIG));
}

/**
 * Sanitize an attribute value to prevent XSS in HTML attributes
 * Strips HTML tags and dangerous characters from attribute values
 *
 * @param value Attribute value to sanitize
 * @returns Sanitized attribute value safe for use in HTML attributes
 *
 * @example
 * const rawAttr = '" onclick="alert(1)" data-x=';
 * const safe = sanitizeAttribute(rawAttr);
 * // Returns safe string for use in attributes
 */
export function sanitizeAttribute(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const text = String(value);
  
  // First strip all HTML tags
  const withoutTags = text.replace(/<[^>]*>/g, '');
  
  // Remove dangerous characters that could break out of attributes
  // Quotes, angle brackets, backticks, and null bytes
  const sanitized = withoutTags
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/`/g, '&#x60;')
    .replace(/\0/g, '');
  
  return sanitized;
}

/**
 * Configuration for SVG sanitization
 * Allows SVG tags and attributes while blocking dangerous content
 */
const SVG_CONFIG = {
  ALLOWED_TAGS: [
    'svg', 'g', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
    'ellipse', 'text', 'tspan', 'defs', 'use', 'symbol', 'marker',
    'linearGradient', 'radialGradient', 'stop',
    'clipPath', 'mask', 'pattern', 'image',
    'title', 'desc', 'metadata'
  ],
  ALLOWED_ATTR: [
    'viewBox', 'width', 'height', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry',
    'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
    'transform', 'opacity', 'class', 'id', 'href', 'xlink:href',
    'points', 'x1', 'y1', 'x2', 'y2', 'dx', 'dy', 'text-anchor',
    'font-size', 'font-family', 'font-weight', 'style',
    'marker', 'marker-start', 'marker-end', 'marker-mid',
    'clip-path', 'mask', 'filter', 'fill-opacity', 'stroke-opacity',
    'stroke-dasharray', 'stroke-dashoffset'
  ],
  ALLOW_DATA_ATTR: false,
  SANITIZE_DOM: true,
  KEEP_CONTENT: true,
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout'],
  RETURN_TRUSTED_TYPE: false,
};

/**
 * Sanitize SVG content for safe rendering
 * Allows SVG markup while preventing XSS through event handlers and scripts
 *
 * @param svg SVG string to sanitize
 * @returns Sanitized SVG string safe for use with dangerouslySetInnerHTML
 *
 * @example
 * const rawSvg = "<svg><script>alert('xss')</script><circle cx='50' cy='50' r='40'/></svg>";
 * const safeSvg = sanitizeSvg(rawSvg);
 * // Returns: "<svg><circle cx='50' cy='50' r='40'/></svg>"
 */
export function sanitizeSvg(svg: unknown): string {
  if (svg === null || svg === undefined) {
    return '';
  }
  
  const text = String(svg);
  
  if (!text.trim()) {
    return '';
  }
  
  return String(DOMPurify.sanitize(text, SVG_CONFIG));
}
