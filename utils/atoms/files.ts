/**
 * File path and name primitives
 * Zero dependencies
 */

/**
 * Regex pattern for file extension
 */
const EXTENSION_PATTERN = /\.[^.]+$/;

/**
 * Invalid filename characters (cross-platform)
 */
const INVALID_FILENAME_CHARS = /[<>:"|?*\/\\]/g;

/**
 * Maximum filename length (most file systems)
 */
export const MAX_FILENAME_LENGTH = 255;

/**
 * Get file extension from filename (without the dot)
 * Handles URLs with query parameters and fragments
 */
export function getExtension(filename: string): string {
  if (!filename) {
    return '';
  }

  try {
    // Try to parse as URL first
    const url = new URL(filename);
    const { pathname } = url;
    const lastDot = pathname.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return pathname.substring(lastDot + 1).toLowerCase().split('?')[0];
  } catch {
    // Handle as plain filename
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return (
      filename
        .substring(lastDot + 1)
        .toLowerCase()
        .split('?')[0]
        // eslint-disable-next-line no-useless-escape
        .split('#')[0]
    );
  }
}

/**
 * Get filename without extension
 */
export function removeExtension(filename: string): string {
  if (!filename) {
    return '';
  }
  const ext = getExtension(filename);
  if (!ext) {
    return filename;
  }
  return filename.slice(0, -(ext.length + 1));
}

/**
 * Get base name from file path (filename with extension)
 */
export function getBaseName(filePath: string): string {
  if (!filePath) {
    return '';
  }

  // Normalize path separators and extract filename
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  const nameWithExt = parts[parts.length - 1];

  // Handle hidden files (starting with .)
  if (nameWithExt.startsWith('.') && !nameWithExt.includes('.', 1)) {
    return nameWithExt;
  }

  // Remove extension
  const lastDotIndex = nameWithExt.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return nameWithExt;
  }

  return nameWithExt.slice(0, lastDotIndex);
}

/**
 * Parse file path into components
 */
export function parseFilePath(filePath: string): {
  dir: string;
  name: string;
  ext: string;
  base: string;
} {
  if (!filePath || typeof filePath !== 'string') {
    return { dir: '', name: '', ext: '', base: '' };
  }

  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // Split into directory and filename
  const lastSlash = normalized.lastIndexOf('/');
  const dir = lastSlash === -1 ? '' : normalized.slice(0, lastSlash);
  const base = lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);

  // Split filename into name and extension
  const lastDot = base.lastIndexOf('.');
  let name = base;
  let ext = '';

  if (lastDot > 0) {
    name = base.slice(0, lastDot);
    ext = base.slice(lastDot + 1);
  }

  return { dir, name, ext, base };
}

/**
 * Sanitize filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'untitled';
  }

  // Remove invalid characters
  let sanitized = filename.replace(INVALID_FILENAME_CHARS, '');

  // Replace multiple consecutive spaces with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Trim leading/trailing spaces
  sanitized = sanitized.trim();

  // If empty after sanitization, use default
  if (!sanitized) {
    return 'untitled';
  }

  // Enforce maximum length
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const extMatch = sanitized.match(EXTENSION_PATTERN);
    const ext = extMatch ? extMatch[0] : '';
    const nameWithoutExt = sanitized.slice(0, sanitized.length - ext.length);
    sanitized = nameWithoutExt.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
  }

  return sanitized;
}

/**
 * Extract sequence number from filename
 */
export function extractSequenceNumber(filename: string): number | null {
  if (!filename || typeof filename !== 'string') {
    return null;
  }

  // Try matching trailing numbers before extension first
  let match = filename.match(/(\d+)(?:\.[^.]+)?$/);

  if (match?.[1]) {
    return parseInt(match[1], 10);
  }

  // Also try matching numbers at the start
  match = filename.match(/^(\d+)/);

  if (match?.[1]) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Counter for generating unique filenames
 */
let filenameCounter = 0;

/**
 * Generate a safe filename
 */
export function generateSafeFilename(
  baseName: string,
  extension: string,
  addTimestamp = false
): string {
  // Sanitize base name
  let safe = sanitizeFilename(baseName || 'untitled');

  // Convert to lowercase and replace spaces with hyphens
  safe = safe.toLowerCase().replace(/\s+/g, '-');

  // Remove any remaining special characters except hyphens and underscores
  safe = safe.replace(/[^a-z0-9_-]/g, '');

  // Clean up multiple consecutive hyphens
  safe = safe.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  safe = safe.replace(/^-+|-+$/g, '');

  // Add timestamp if requested
  if (addTimestamp) {
    const timestamp = Date.now();
    filenameCounter += 1;
    safe = `${safe}-${timestamp}-${filenameCounter}`;
  }

  // Add extension
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  return safe + ext;
}
