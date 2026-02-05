/**
 * URL validation and manipulation primitives
 * Zero dependencies
 */

/**
 * Check if a string is a valid HTTP(S) URI
 */
export function isValidHttpUri(uri: string): boolean {
  if (!uri || typeof uri !== 'string') {
    return false;
  }
  return uri.startsWith('http://') || uri.startsWith('https://');
}

/**
 * Check if a URI contains a fragment identifier
 */
export function hasFragmentIdentifier(uri: string): boolean {
  return uri.includes('#');
}

/**
 * Check if URL has a dangerous protocol (javascript:, data:, etc.)
 */
export function hasDangerousProtocol(url: string): boolean {
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  return dangerousProtocols.test(url);
}

/**
 * Check if URL is valid relative URL
 */
export function isRelativeUrl(url: string): boolean {
  return (
    url.startsWith('/') || url.startsWith('./') || url.startsWith('../')
  );
}

/**
 * Check if URL is a hash anchor only
 */
export function isHashAnchor(url: string): boolean {
  return url.startsWith('#');
}

/**
 * Validate URL format and safety
 */
export function isValidUrlFormat(url: string): boolean {
  if (hasDangerousProtocol(url)) {
    return false;
  }

  try {
    // eslint-disable-next-line no-new
    new URL(url);
    return true;
  } catch {
    return isRelativeUrl(url) || isHashAnchor(url);
  }
}
