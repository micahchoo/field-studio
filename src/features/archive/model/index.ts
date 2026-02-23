/**
 * Archive Feature Model — Stub
 *
 * Stub implementations for archive feature model functions.
 * Full implementation deferred to archive pipeline migration.
 */

import type { IIIFCanvas } from '@/src/shared/types';

/**
 * File DNA — extracted metadata characteristics of a canvas/file
 */
export interface FileDNA {
  hasTime: boolean;
  hasLocation: boolean;
  hasDevice: boolean;
}

/**
 * Extract file DNA from a canvas item — reads metadata annotations
 * for time, location, and device information.
 */
export function getFileDNA(_canvas: IIIFCanvas): FileDNA {
  return {
    hasTime: false,
    hasLocation: false,
    hasDevice: false,
  };
}
