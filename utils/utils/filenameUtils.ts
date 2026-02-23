/**
 * Filename Utilities — Stub
 * Sequence detection patterns for file ordering during ingest.
 */

export interface FilenamePattern {
  name: string;
  regex: RegExp;
  tags: string[];
  description: string;
}

/** Common filename sequence patterns */
export const filenameRelationshipPatterns: FilenamePattern[] = [
  {
    name: 'numeric-suffix',
    regex: /^(.+?)[-_]?(\d+)\.[^.]+$/,
    tags: ['sequence'],
    description: 'Files with numeric suffix: file_001.jpg, file_002.jpg',
  },
  {
    name: 'page-prefix',
    regex: /^(p(?:age)?[-_]?)(\d+)\.[^.]+$/i,
    tags: ['sequence'],
    description: 'Page-prefixed files: page_1.jpg, p001.tif',
  },
  {
    name: 'img-prefix',
    regex: /^(img[-_]?)(\d+)\.[^.]+$/i,
    tags: ['sequence'],
    description: 'Image-prefixed files: img_001.jpg, IMG001.tif',
  },
  {
    name: 'scan-prefix',
    regex: /^(scan[-_]?)(\d+)\.[^.]+$/i,
    tags: ['sequence'],
    description: 'Scan-prefixed files: scan_01.tif, SCAN001.jpg',
  },
  {
    name: 'dsc-prefix',
    regex: /^(DSC[-_]?)(\d+)\.[^.]+$/i,
    tags: ['sequence', 'camera'],
    description: 'Camera DSC files: DSC_0001.jpg, DSC0001.NEF',
  },
];
