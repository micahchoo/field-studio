/**
 * ServiceDescriptor type guard tests
 */

import { describe, it, expect } from 'vitest';
import {
  isImageService,
  isAuthService,
  isSearchService,
  isAnnotationPage,
  getChildEntities,
  type ServiceDescriptor,
  type IIIFImageService,
  type IIIFAuthService,
  type IIIFSearchService,
  type IIIFGenericService,
  type IIIFItem,
  type IIIFManifest,
  type IIIFCollection,
  type IIIFCanvas,
  type IIIFRange,
} from '@/src/shared/types';

describe('ServiceDescriptor type guards', () => {
  describe('isImageService', () => {
    it('identifies ImageService2', () => {
      const svc: ServiceDescriptor = { type: 'ImageService2', id: 'https://example.com/image' };
      expect(isImageService(svc)).toBe(true);
    });

    it('identifies ImageService3', () => {
      const svc: ServiceDescriptor = { type: 'ImageService3', id: 'https://example.com/image' };
      expect(isImageService(svc)).toBe(true);
    });

    it('identifies type containing ImageService', () => {
      const svc: ServiceDescriptor = { type: 'ImageService2Level1', id: 'https://example.com/image' };
      expect(isImageService(svc)).toBe(true);
    });

    it('rejects non-image services', () => {
      const svc: ServiceDescriptor = { type: 'SearchService2', id: 'https://example.com/search' };
      expect(isImageService(svc)).toBe(false);
    });

    it('provides typed access to IIIFImageService fields', () => {
      const svc: ServiceDescriptor = {
        type: 'ImageService3',
        id: 'https://example.com/image',
        profile: 'level2',
        width: 4000,
        height: 3000,
        sizes: [{ width: 200, height: 150 }],
        '@id': 'https://example.com/image-v2',
      };
      if (isImageService(svc)) {
        expect(svc.id).toBe('https://example.com/image');
        expect(svc.profile).toBe('level2');
        expect(svc.width).toBe(4000);
        expect(svc.height).toBe(3000);
        expect(svc.sizes).toHaveLength(1);
        expect(svc['@id']).toBe('https://example.com/image-v2');
      }
    });
  });

  describe('isAuthService', () => {
    it('identifies AuthProbeService', () => {
      const svc: ServiceDescriptor = { type: 'AuthProbeService2', id: 'https://example.com/probe' };
      expect(isAuthService(svc)).toBe(true);
    });

    it('identifies AuthAccessService', () => {
      const svc: ServiceDescriptor = { type: 'AuthAccessService2', id: 'https://example.com/access' };
      expect(isAuthService(svc)).toBe(true);
    });

    it('identifies AuthAccessTokenService', () => {
      const svc: ServiceDescriptor = { type: 'AuthAccessTokenService2', id: 'https://example.com/token' };
      expect(isAuthService(svc)).toBe(true);
    });

    it('identifies AuthLogoutService', () => {
      const svc: ServiceDescriptor = { type: 'AuthLogoutService2', id: 'https://example.com/logout' };
      expect(isAuthService(svc)).toBe(true);
    });

    it('rejects non-auth services', () => {
      const svc: ServiceDescriptor = { type: 'ImageService3', id: 'https://example.com/image' };
      expect(isAuthService(svc)).toBe(false);
    });
  });

  describe('isSearchService', () => {
    it('identifies SearchService2', () => {
      const svc: ServiceDescriptor = { type: 'SearchService2', id: 'https://example.com/search' };
      expect(isSearchService(svc)).toBe(true);
    });

    it('identifies types containing SearchService', () => {
      const svc: ServiceDescriptor = { type: 'SearchService1', id: 'https://example.com/search' };
      expect(isSearchService(svc)).toBe(true);
    });

    it('rejects non-search services', () => {
      const svc: ServiceDescriptor = { type: 'AuthProbeService2', id: 'https://example.com/probe' };
      expect(isSearchService(svc)).toBe(false);
    });
  });

  describe('isAnnotationPage', () => {
    it('returns true for AnnotationPage type', () => {
      expect(isAnnotationPage({ type: 'AnnotationPage' })).toBe(true);
    });

    it('returns false for other types', () => {
      expect(isAnnotationPage({ type: 'Manifest' })).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isAnnotationPage(null)).toBe(false);
      expect(isAnnotationPage(undefined)).toBe(false);
    });
  });

  describe('getChildEntities', () => {
    it('returns canvases for a manifest', () => {
      const manifest: IIIFManifest = {
        id: 'm1', type: 'Manifest',
        items: [{ id: 'c1', type: 'Canvas', width: 100, height: 100, items: [] }],
      };
      const children = getChildEntities(manifest);
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe('c1');
    });

    it('returns members for a collection', () => {
      const collection: IIIFCollection = {
        id: 'col1', type: 'Collection',
        items: [{ id: 'm1', type: 'Manifest', items: [] } as IIIFItem],
      };
      const children = getChildEntities(collection);
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe('m1');
    });

    it('returns empty for a canvas (annotation pages are not IIIFItems)', () => {
      const canvas: IIIFCanvas = {
        id: 'c1', type: 'Canvas', width: 100, height: 100, items: [],
      };
      expect(getChildEntities(canvas)).toHaveLength(0);
    });

    it('returns only nested ranges, filtering out canvas references', () => {
      const range: IIIFRange = {
        id: 'r1', type: 'Range',
        items: [
          { id: 'c1', type: 'Canvas' },
          { id: 'r2', type: 'Range', items: [] },
        ],
      };
      const children = getChildEntities(range);
      expect(children).toHaveLength(1);
      expect(children[0].type).toBe('Range');
    });

    it('returns empty for unrecognized entity types', () => {
      const item: IIIFItem = { id: 'x', type: 'AnnotationPage' };
      expect(getChildEntities(item)).toHaveLength(0);
    });

    it('handles manifest with empty items array', () => {
      const manifest: IIIFManifest = {
        id: 'm1', type: 'Manifest', items: [],
      };
      expect(getChildEntities(manifest)).toHaveLength(0);
    });

    it('handles item with no items property', () => {
      const item: IIIFItem = { id: 'x', type: 'Manifest' };
      // isManifest returns true but items is undefined — getChildEntities must not crash
      const children = getChildEntities(item);
      expect(children).toHaveLength(0);
    });
  });

  describe('type narrowing', () => {
    it('ServiceDescriptor union covers all variants', () => {
      const services: ServiceDescriptor[] = [
        { type: 'ImageService3', id: 'img' } satisfies IIIFImageService,
        { type: 'AuthProbeService2', id: 'auth' } satisfies IIIFAuthService,
        { type: 'SearchService2', id: 'search' } satisfies IIIFSearchService,
        { type: 'CustomService', id: 'custom' } satisfies IIIFGenericService,
      ];
      expect(services).toHaveLength(4);
    });
  });
});
