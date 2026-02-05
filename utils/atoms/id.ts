/**
 * ID and URI generation primitives
 * Zero dependencies
 */

/**
 * Generate a UUID v4 for IIIF resource IDs
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Remove trailing slash from a string
 */
export function removeTrailingSlash(str: string): string {
  return str.endsWith('/') ? str.slice(0, -1) : str;
}

/**
 * Normalize URI by removing trailing slashes and ensuring http prefix
 */
export function normalizeUri(uri: string): string {
  if (!uri) {
    return '';
  }
  return removeTrailingSlash(uri.trim());
}

/**
 * Get the last segment of a URI path
 */
export function getUriLastSegment(uri: string): string {
  if (!uri) {
    return '';
  }
  const cleanUri = removeTrailingSlash(uri);
  const lastSlash = cleanUri.lastIndexOf('/');
  return lastSlash === -1 ? cleanUri : cleanUri.slice(lastSlash + 1);
}

/**
 * Convert string to valid HTTP URI
 */
export function convertToHttpUri(str: string): string {
  if (!str) {
    return '';
  }
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }
  return `https://${str}`;
}

/**
 * Generate a valid IIIF URI with UUID
 */
export function generateValidUri(baseUri: string): string {
  const normalized = normalizeUri(baseUri);
  const id = generateUUID();
  return `${normalized}/${id}`;
}
