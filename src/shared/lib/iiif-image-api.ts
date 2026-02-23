// Pure TypeScript — no Svelte-specific conversion

/**
 * IIIF Image API Pure Functions
 *
 * Canonical implementations of IIIF Image API utility functions.
 * These are tested here. sw.js keeps inline copies for the SW context.
 */

// ============================================================================
// Rotation
// ============================================================================

export interface RotationParams {
  degrees: number;
  mirror: boolean;
}

/**
 * Parse a IIIF rotation parameter string.
 * @param param - e.g. "90", "!180", "0"
 * @returns Parsed rotation with degrees (mod 360) and mirror flag
 */
export function parseRotation(param: string): RotationParams {
  const mirror = param.startsWith('!');
  const degreesStr = mirror ? param.substring(1) : param;
  const degrees = parseFloat(degreesStr) || 0;
  return { degrees: degrees % 360, mirror };
}

// ============================================================================
// Region
// ============================================================================

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Calculate a centered square region from image dimensions.
 */
export function calculateSquareRegion(width: number, height: number): Region {
  const size = Math.min(width, height);
  const x = Math.floor((width - size) / 2);
  const y = Math.floor((height - size) / 2);
  return { x, y, w: size, h: size };
}

// ============================================================================
// Size
// ============================================================================

export interface Size {
  width: number;
  height: number;
}

/**
 * Calculate confined size (best fit within bounds, no upscale).
 */
export function calculateConfinedSize(
  regionWidth: number,
  regionHeight: number,
  maxWidth: number,
  maxHeight: number
): Size {
  const scaleW = maxWidth / regionWidth;
  const scaleH = maxHeight / regionHeight;
  const scale = Math.min(scaleW, scaleH, 1); // Don't upscale
  return {
    width: Math.round(regionWidth * scale),
    height: Math.round(regionHeight * scale)
  };
}

// ============================================================================
// Format
// ============================================================================

export interface FormatOptions {
  mimeType: string;
  options: Record<string, number>;
}

/**
 * Get MIME type and encoding options for an image format.
 */
export function getFormatOptions(format: string, quality?: string): FormatOptions {
  const formatMap: Record<string, FormatOptions> = {
    'jpg': { mimeType: 'image/jpeg', options: { quality: 0.85 } },
    'jpeg': { mimeType: 'image/jpeg', options: { quality: 0.85 } },
    'png': { mimeType: 'image/png', options: {} },
    'webp': { mimeType: 'image/webp', options: { quality: 0.85 } },
    'gif': { mimeType: 'image/gif', options: {} }
  };

  // For bitonal, prefer PNG for lossless
  if (quality === 'bitonal' && format === 'jpg') return formatMap['png'];

  return formatMap[format] || formatMap['jpg'];
}

// ============================================================================
// Media MIME Types
// ============================================================================

/**
 * Get MIME type for a media file extension.
 */
export function getMimeTypeForExtension(ext: string): string {
  const mimeTypes: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'svg': 'image/svg+xml'
  };
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
}

// ============================================================================
// Range Requests
// ============================================================================

export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Parse an HTTP Range header.
 */
export function parseRangeHeader(header: string, total: number): ByteRange | null {
  const match = header.match(/bytes=(\d+)-(\d*)/);
  if (!match) return null;

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : total - 1;
  const clampedEnd = Math.min(end, total - 1);

  if (start < 0 || clampedEnd >= total || start > clampedEnd) return null;

  return { start, end: clampedEnd };
}

/**
 * Build an HTTP Content-Range header value.
 */
export function buildContentRangeHeader(start: number, end: number, total: number): string {
  return `bytes ${start}-${end}/${total}`;
}

// ============================================================================
// Backoff Tracking
// ============================================================================

export interface FailureEntry {
  count: number;
  lastAttempt: number;
  backoffUntil: number;
  lastError?: string;
}

/**
 * Check if a key is currently in backoff.
 * @returns false if OK to proceed, or remaining backoff ms
 */
export function isInBackoff(tracker: Map<string, FailureEntry>, key: string): false | number {
  const entry = tracker.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (now < entry.backoffUntil) return entry.backoffUntil - now;
  return false;
}

/**
 * Record a failure for a key with exponential backoff.
 * Schedule: 1s, 2s, 4s, 8s, 16s, 30s, 30s... (capped at 30s).
 * After 10 consecutive failures, backoff jumps to 5 minutes.
 */
export function recordFailure(tracker: Map<string, FailureEntry>, key: string, errorMsg: string): void {
  const entry = tracker.get(key) || { count: 0, lastAttempt: 0, backoffUntil: 0 };
  entry.count++;
  entry.lastAttempt = Date.now();
  entry.lastError = errorMsg;

  let backoffMs: number;
  if (entry.count >= 10) {
    backoffMs = 5 * 60 * 1000; // 5 minutes
  } else {
    backoffMs = Math.min(Math.pow(2, entry.count - 1) * 1000, 30000);
  }
  entry.backoffUntil = Date.now() + backoffMs;

  tracker.set(key, entry);
}

/**
 * Clear failure record for a key (asset recovered).
 */
export function clearFailure(tracker: Map<string, FailureEntry>, key: string): void {
  tracker.delete(key);
}
