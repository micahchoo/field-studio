/**
 * ServiceDescriptor type guard tests
 */

import { describe, it, expect } from 'vitest';
import {
  isImageService,
  isAuthService,
  isSearchService,
  type ServiceDescriptor,
  type IIIFImageService,
  type IIIFAuthService,
  type IIIFSearchService,
  type IIIFGenericService,
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
