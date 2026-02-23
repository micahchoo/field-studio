/**
 * IIIF Image API Types — Stub
 * Type definitions for IIIF Image API service profiles.
 */

export type ImageApiProfile = 'level0' | 'level1' | 'level2';

export interface ImageServiceInfo {
  id: string;
  type: string;
  profile: ImageApiProfile;
  width?: number;
  height?: number;
  sizes?: Array<{ width: number; height: number }>;
  tiles?: Array<{ width: number; height?: number; scaleFactors: number[] }>;
}
