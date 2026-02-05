/**
 * Regular expression patterns
 * Zero dependencies - pure constants
 */

/**
 * HTML tag pattern - matches any HTML tag
 */
export const HTML_TAG_PATTERN = /<[^>]*>/gi;

/**
 * Script tag pattern - matches script elements (aggressive)
 */
export const SCRIPT_PATTERN =
  /<script[^>]*>[\s\S]*?<\/script>|<script[^>]*\/>/gi;

/**
 * Event handler pattern - matches onerror, onclick, etc.
 */
export const EVENT_HANDLER_PATTERN =
  /\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*) /gi;

/**
 * Control character pattern (except common whitespace)
 */
export const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

/**
 * HTTP(S) URI pattern
 */
export const HTTP_URI_PATTERN = /^https?:\/\//i;

/**
 * UUID v4 pattern
 */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * File extension pattern
 */
export const EXTENSION_PATTERN = /\.[^.]+$/;

/**
 * Invalid filename characters (cross-platform)
 */
export const INVALID_FILENAME_CHARS = /[<>:"|?*\/\\]/g;

/**
 * ISO 8601 date pattern for navDate validation
 */
export const ISO_8601_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
