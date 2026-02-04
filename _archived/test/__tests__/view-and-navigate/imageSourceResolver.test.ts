/**
 * Unit Tests for services/imageSourceResolver.ts
 *
 * Tests image source resolution strategies, IIIF service detection,
 * and memory management for blob URLs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildIIIFImageUrl,
  cleanupImageSource,
  createSourceCleanup,
  getImageService,
  getPaintingBody,
  getThumbnailUrl,
  type ImageSourceResolverOptions,
  isSourceCleaned,
  resolveBodySource,
  type ResolvedImageSource,
  resolveImageSource,
} from '@/services/imageSourceResolver';
import type {
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFCanvas,
  IIIFExternalWebResource,
} from '@/types';

describe('imageSourceResolver', () => {
  describe('getPaintingBody', () => {
    it('should return null for canvas with no items', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [],
      };

      const result = getPaintingBody(canvas);
      expect(result).toBeNull();
    });

    it('should return null for canvas with no painting annotations', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [
          {
            id: 'https://example.com/page/1',
            type: 'AnnotationPage',
            items: [
              {
                id: 'https://example.com/anno/1',
                type: 'Annotation',
                motivation: 'commenting',
                body: {
                  id: 'https://example.com/comment.txt',
                  type: 'Text',
                  format: 'text/plain',
                },
                target: 'https://example.com/canvas/1',
              },
            ],
          },
        ],
      };

      const result = getPaintingBody(canvas);
      expect(result).toBeNull();
    });

    it('should extract painting annotation body', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [
          {
            id: 'https://example.com/page/1',
            type: 'AnnotationPage',
            items: [
              {
                id: 'https://example.com/anno/1',
                type: 'Annotation',
                motivation: 'painting',
                body: {
                  id: 'https://example.com/image.jpg',
                  type: 'Image',
                  format: 'image/jpeg',
                  width: 1000,
                  height: 1000,
                },
                target: 'https://example.com/canvas/1',
              },
            ],
          },
        ],
      };

      const result = getPaintingBody(canvas);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('https://example.com/image.jpg');
      expect(result?.type).toBe('Image');
    });

    it('should extract first annotation body (not necessarily painting)', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [
          {
            id: 'https://example.com/page/1',
            type: 'AnnotationPage',
            items: [
              {
                id: 'https://example.com/anno/1',
                type: 'Annotation',
                motivation: 'painting',
                body: {
                  id: 'https://example.com/first.jpg',
                  type: 'Image',
                  format: 'image/jpeg',
                },
                target: 'https://example.com/canvas/1',
              },
              {
                id: 'https://example.com/anno/2',
                type: 'Annotation',
                motivation: 'painting',
                body: {
                  id: 'https://example.com/second.jpg',
                  type: 'Image',
                  format: 'image/jpeg',
                },
                target: 'https://example.com/canvas/1',
              },
            ],
          },
        ],
      };

      // getPaintingBody just takes the first annotation, doesn't filter by motivation
      const result = getPaintingBody(canvas);
      expect(result?.id).toBe('https://example.com/first.jpg');
    });
  });

  describe('getImageService', () => {
    it('should return null for body with no service', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
      };

      const result = getImageService(body);
      expect(result).toBeNull();
    });

    it('should extract IIIF Image API 3.0 service', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        service: [
          {
            id: 'https://iiif.example.com/image/1',
            type: 'ImageService3',
            profile: 'level2',
          },
        ],
      };

      const result = getImageService(body);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('https://iiif.example.com/image/1');
      expect(result?.profile).toBe('level2');
    });

    it('should extract IIIF Image API 2.0 service', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        service: [
          {
            '@id': 'https://iiif.example.com/image/1',
            '@type': 'ImageService2',
            profile: 'http://iiif.io/api/image/2/level2.json',
          },
        ],
      };

      const result = getImageService(body);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('https://iiif.example.com/image/1');
      expect(result?.profile).toBe('level2');
    });

    it('should handle service as single object (not array)', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        service: {
          id: 'https://iiif.example.com/image/1',
          type: 'ImageService3',
          profile: 'level1',
        } as any,
      };

      const result = getImageService(body);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('https://iiif.example.com/image/1');
      expect(result?.profile).toBe('level1');
    });

    it('should detect level0 profile', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        service: [
          {
            id: 'https://iiif.example.com/image/1',
            type: 'ImageService3',
            profile: 'level0',
          },
        ],
      };

      const result = getImageService(body);
      expect(result).not.toBeNull();
      expect(result?.profile).toBe('level0');
    });

    it('should default to level2 for unrecognized profile URLs', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        service: [
          {
            id: 'https://iiif.example.com/image/1',
            type: 'ImageService3',
            profile: 'http://iiif.io/api/image/3/level2.json',
          },
        ],
      };

      const result = getImageService(body);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('https://iiif.example.com/image/1');
      expect(result?.profile).toBe('level2');
    });
  });

  describe('getThumbnailUrl', () => {
    it('should return null for item with no thumbnail', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [],
      };

      const result = getThumbnailUrl(canvas);
      expect(result).toBeNull();
    });

    it('should return null for empty thumbnail array', () => {
      const canvas: any = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        thumbnail: [],
        items: [],
      };

      const result = getThumbnailUrl(canvas);
      expect(result).toBeNull();
    });

    it('should extract thumbnail URL from array', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        thumbnail: [
          {
            id: 'https://example.com/thumb.jpg',
            type: 'Image',
            format: 'image/jpeg',
          },
        ],
        items: [],
      };

      const result = getThumbnailUrl(canvas);
      expect(result).toBe('https://example.com/thumb.jpg');
    });

    it('should extract first thumbnail from multiple thumbnails', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        thumbnail: [
          {
            id: 'https://example.com/thumb1.jpg',
            type: 'Image',
            format: 'image/jpeg',
          },
          {
            id: 'https://example.com/thumb2.jpg',
            type: 'Image',
            format: 'image/jpeg',
          },
        ],
        items: [],
      };

      const result = getThumbnailUrl(canvas);
      expect(result).toBe('https://example.com/thumb1.jpg');
    });
  });

  describe('buildIIIFImageUrl', () => {
    it('should build full region URL for level2', () => {
      const source: ResolvedImageSource = {
        url: 'https://iiif.example.com/image/1/full/max/0/default.jpg',
        type: 'iiif-level2',
        serviceId: 'https://iiif.example.com/image/1',
        profile: 'level2',
        supportsRegion: true,
        supportsSizeParam: true,
        supportsRotation: true,
        supportsQuality: true,
        needsCleanup: false,
      };

      const url = buildIIIFImageUrl(source, {
        region: '0,0,500,500',
        size: '!400,400',
        rotation: 0,
        quality: 'default',
        format: 'jpg'
      });

      expect(url).toBe('https://iiif.example.com/image/1/0,0,500,500/!400,400/0/default.jpg');
    });

    it('should build size-only URL for level1', () => {
      const source: ResolvedImageSource = {
        url: 'https://iiif.example.com/image/1/full/max/0/default.jpg',
        type: 'iiif-level1',
        serviceId: 'https://iiif.example.com/image/1',
        profile: 'level1',
        supportsRegion: true,
        supportsSizeParam: true,
        supportsRotation: false,
        supportsQuality: false,
        needsCleanup: false,
      };

      const url = buildIIIFImageUrl(source, {
        region: 'full',
        size: '400,',
        rotation: 0,
        quality: 'default',
        format: 'jpg'
      });

      expect(url).toBe('https://iiif.example.com/image/1/full/400,/0/default.jpg');
    });

    it('should return original URL for level0', () => {
      const source: ResolvedImageSource = {
        url: 'https://iiif.example.com/image/1/full/full/0/default.jpg',
        type: 'iiif-level0',
        serviceId: 'https://iiif.example.com/image/1',
        profile: 'level0',
        supportsRegion: false,
        supportsSizeParam: false,
        supportsRotation: false,
        supportsQuality: false,
        needsCleanup: false,
      };

      const url = buildIIIFImageUrl(source, {
        region: 'full',
        size: 'full',
        rotation: 0,
        quality: 'default',
        format: 'jpg'
      });

      // Level 0 can't be modified, should return original URL
      expect(url).toBe('https://iiif.example.com/image/1/full/full/0/default.jpg');
    });

    it('should respect capability limitations', () => {
      const source: ResolvedImageSource = {
        url: 'https://iiif.example.com/image/1/full/max/0/default.jpg',
        type: 'iiif-level1',
        serviceId: 'https://iiif.example.com/image/1',
        profile: 'level1',
        supportsRegion: true,
        supportsSizeParam: true,
        supportsRotation: false, // Level 1 doesn't support rotation
        supportsQuality: false,
        needsCleanup: false,
      };

      const url = buildIIIFImageUrl(source, {
        region: 'full',
        size: 'max',
        rotation: 90, // Will be ignored
        quality: 'color', // Will be ignored
        format: 'jpg'
      });

      // Should use defaults for unsupported features
      expect(url).toBe('https://iiif.example.com/image/1/full/max/0/default.jpg');
    });

    it('should use default format and quality if not specified', () => {
      const source: ResolvedImageSource = {
        url: 'https://iiif.example.com/image/1/full/max/0/default.jpg',
        type: 'iiif-level2',
        serviceId: 'https://iiif.example.com/image/1',
        profile: 'level2',
        supportsRegion: true,
        supportsSizeParam: true,
        supportsRotation: true,
        supportsQuality: true,
        needsCleanup: false,
      };

      const url = buildIIIFImageUrl(source);

      expect(url).toBe('https://iiif.example.com/image/1/full/max/0/default.jpg');
    });

    it('should handle rotation parameter for level2', () => {
      const source: ResolvedImageSource = {
        url: 'https://iiif.example.com/image/1/full/max/0/default.jpg',
        type: 'iiif-level2',
        serviceId: 'https://iiif.example.com/image/1',
        profile: 'level2',
        supportsRegion: true,
        supportsSizeParam: true,
        supportsRotation: true,
        supportsQuality: true,
        needsCleanup: false,
      };

      const url = buildIIIFImageUrl(source, { rotation: 90 });

      expect(url).toBe('https://iiif.example.com/image/1/full/max/90/default.jpg');
    });
  });

  describe('resolveBodySource', () => {
    it('should resolve static image URL', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        width: 1000,
        height: 1000,
      };

      const result = resolveBodySource(body);
      expect(result.url).toBe('https://example.com/image.jpg');
      expect(result.type).toBe('static');
      expect(result.width).toBe(1000);
      expect(result.height).toBe(1000);
      expect(result.supportsRegion).toBe(false);
    });

    it('should resolve IIIF level2 service', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        width: 1000,
        height: 1000,
        service: [
          {
            id: 'https://iiif.example.com/image/1',
            type: 'ImageService3',
            profile: 'level2',
          },
        ],
      };

      const result = resolveBodySource(body);
      expect(result.type).toBe('iiif-level2');
      expect(result.serviceId).toBe('https://iiif.example.com/image/1');
      expect(result.supportsRegion).toBe(true);
      expect(result.supportsSizeParam).toBe(true);
      expect(result.supportsRotation).toBe(true);
    });

    it('should resolve IIIF level1 service', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        service: [
          {
            id: 'https://iiif.example.com/image/1',
            type: 'ImageService3',
            profile: 'level1',
          },
        ],
      };

      const result = resolveBodySource(body);
      expect(result.type).toBe('iiif-level1');
      expect(result.supportsRegion).toBe(true);
      expect(result.supportsSizeParam).toBe(true);
      expect(result.supportsRotation).toBe(false);
    });

    it('should resolve IIIF level0 service', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        service: [
          {
            id: 'https://iiif.example.com/image/1',
            type: 'ImageService3',
            profile: 'level0',
          },
        ],
      };

      const result = resolveBodySource(body);
      expect(result.type).toBe('iiif-level0');
      expect(result.supportsRegion).toBe(false);
      expect(result.supportsSizeParam).toBe(false);
      expect(result.supportsRotation).toBe(false);
    });

    it('should use direct URL if skipIIIFService is true', () => {
      const body: IIIFExternalWebResource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        format: 'image/jpeg',
        service: [
          {
            id: 'https://iiif.example.com/image/1',
            type: 'ImageService3',
            profile: 'level2',
          },
        ],
      };

      const result = resolveBodySource(body, { skipIIIFService: true });
      expect(result.type).toBe('static');
      expect(result.url).toBe('https://example.com/image.jpg');
    });
  });

  describe('resolveImageSource', () => {
    it('should return placeholder for null canvas', () => {
      const result = resolveImageSource(null);
      expect(result.type).toBe('placeholder');
      expect(result.url).toContain('data:image/svg+xml');
      expect(result.supportsRegion).toBe(false);
    });

    it('should return placeholder for canvas with no painting', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [],
      };

      const result = resolveImageSource(canvas);
      expect(result.type).toBe('placeholder');
    });

    it('should resolve painting annotation to static image', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [
          {
            id: 'https://example.com/page/1',
            type: 'AnnotationPage',
            items: [
              {
                id: 'https://example.com/anno/1',
                type: 'Annotation',
                motivation: 'painting',
                body: {
                  id: 'https://example.com/image.jpg',
                  type: 'Image',
                  format: 'image/jpeg',
                  width: 1000,
                  height: 1000,
                },
                target: 'https://example.com/canvas/1',
              },
            ],
          },
        ],
      };

      const result = resolveImageSource(canvas);
      expect(result.type).toBe('static');
      expect(result.url).toBe('https://example.com/image.jpg');
      expect(result.width).toBe(1000);
      expect(result.height).toBe(1000);
    });

    it('should resolve IIIF service from painting annotation', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [
          {
            id: 'https://example.com/page/1',
            type: 'AnnotationPage',
            items: [
              {
                id: 'https://example.com/anno/1',
                type: 'Annotation',
                motivation: 'painting',
                body: {
                  id: 'https://example.com/image.jpg',
                  type: 'Image',
                  format: 'image/jpeg',
                  width: 2000,
                  height: 2000,
                  service: [
                    {
                      id: 'https://iiif.example.com/image/1',
                      type: 'ImageService3',
                      profile: 'level2',
                    },
                  ],
                },
                target: 'https://example.com/canvas/1',
              },
            ],
          },
        ],
      };

      const result = resolveImageSource(canvas);
      expect(result.type).toBe('iiif-level2');
      expect(result.serviceId).toBe('https://iiif.example.com/image/1');
      expect(result.supportsRegion).toBe(true);
    });

    it('should fallback to thumbnail when fallbackToThumbnail is true', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        thumbnail: [
          {
            id: 'https://example.com/thumb.jpg',
            type: 'Image',
            format: 'image/jpeg',
          },
        ],
        items: [],
      };

      const result = resolveImageSource(canvas, { fallbackToThumbnail: true });
      expect(result.type).toBe('thumbnail');
      expect(result.url).toBe('https://example.com/thumb.jpg');
    });

    it('should use custom placeholder URL', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [],
      };

      const customPlaceholder = 'https://example.com/custom-placeholder.png';
      const result = resolveImageSource(canvas, { placeholderUrl: customPlaceholder });
      expect(result.type).toBe('placeholder');
      expect(result.url).toBe(customPlaceholder);
    });

    it('should use IIIF service even with requireDeepZoom if available', () => {
      const canvas: IIIFCanvas = {
        id: 'https://example.com/canvas/1',
        type: 'Canvas',
        width: 1000,
        height: 1000,
        items: [
          {
            id: 'https://example.com/page/1',
            type: 'AnnotationPage',
            items: [
              {
                id: 'https://example.com/anno/1',
                type: 'Annotation',
                motivation: 'painting',
                body: {
                  id: 'https://example.com/image.jpg',
                  type: 'Image',
                  format: 'image/jpeg',
                  service: [
                    {
                      id: 'https://iiif.example.com/image/1',
                      type: 'ImageService3',
                      profile: 'level1',
                    },
                  ],
                },
                target: 'https://example.com/canvas/1',
              },
            ],
          },
        ],
      };

      const result = resolveImageSource(canvas, { requireDeepZoom: true });
      // requireDeepZoom is a preference hint, not a strict filter
      // It should still use available IIIF service
      expect(result.type).toBe('iiif-level1');
      expect(result.serviceId).toBe('https://iiif.example.com/image/1');
    });
  });

  describe('cleanupImageSource', () => {
    it('should return false for null source', () => {
      const result = cleanupImageSource(null);
      expect(result).toBe(false);
    });

    it('should return false for source that does not need cleanup', () => {
      const source: ResolvedImageSource = {
        url: 'https://example.com/image.jpg',
        type: 'static',
        supportsRegion: false,
        supportsSizeParam: false,
        supportsRotation: false,
        supportsQuality: false,
        needsCleanup: false,
      };

      const result = cleanupImageSource(source);
      expect(result).toBe(false);
    });

    it('should track cleaned sources', () => {
      const source: ResolvedImageSource = {
        url: 'blob:http://localhost/12345',
        type: 'blob',
        supportsRegion: false,
        supportsSizeParam: false,
        supportsRotation: false,
        supportsQuality: false,
        needsCleanup: true,
        _blobRef: 'blob:http://localhost/12345',
      };

      // First cleanup should work
      cleanupImageSource(source);
      expect(isSourceCleaned(source)).toBe(true);

      // Second cleanup should be no-op (already cleaned)
      const result = cleanupImageSource(source);
      expect(result).toBe(false);
    });
  });

  describe('createSourceCleanup', () => {
    it('should return cleanup function for valid source', () => {
      const source: ResolvedImageSource = {
        url: 'blob:http://localhost/12345',
        type: 'blob',
        supportsRegion: false,
        supportsSizeParam: false,
        supportsRotation: false,
        supportsQuality: false,
        needsCleanup: true,
        _blobRef: 'blob:http://localhost/12345',
      };

      const cleanup = createSourceCleanup(source);
      expect(typeof cleanup).toBe('function');

      cleanup();
      expect(isSourceCleaned(source)).toBe(true);
    });

    it('should return no-op function for null source', () => {
      const cleanup = createSourceCleanup(null);
      expect(typeof cleanup).toBe('function');

      // Should not throw
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('isSourceCleaned', () => {
    it('should return false for uncleaned source', () => {
      const source: ResolvedImageSource = {
        url: 'blob:http://localhost/12345',
        type: 'blob',
        supportsRegion: false,
        supportsSizeParam: false,
        supportsRotation: false,
        supportsQuality: false,
        needsCleanup: true,
      };

      expect(isSourceCleaned(source)).toBe(false);
    });

    it('should return true after cleanup', () => {
      const source: ResolvedImageSource = {
        url: 'blob:http://localhost/12345',
        type: 'blob',
        supportsRegion: false,
        supportsSizeParam: false,
        supportsRotation: false,
        supportsQuality: false,
        needsCleanup: true,
        _blobRef: 'blob:http://localhost/12345',
      };

      cleanupImageSource(source);
      expect(isSourceCleaned(source)).toBe(true);
    });
  });
});
