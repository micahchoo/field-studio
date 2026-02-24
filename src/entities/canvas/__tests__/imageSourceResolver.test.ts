import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPaintingBody,
  getImageService,
  getThumbnailUrl,
  resolveImageSource,
  resolveBodySource,
  buildIIIFImageUrl,
  cleanupImageSource,
  createSourceCleanup,
  isSourceCleaned,
  type ResolvedImageSource,
} from '../model/imageSourceResolver';
import type { IIIFCanvas, IIIFExternalWebResource } from '@/src/shared/types';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/src/shared/constants', () => ({
  FEATURE_FLAGS: { USE_IMAGE_SOURCE_CLEANUP: false },
}));

vi.mock('@/src/shared/services/logger', () => ({
  uiLog: { warn: vi.fn(), debug: vi.fn() },
}));

// ============================================================================
// Helpers
// ============================================================================

function makeCanvas(overrides: Partial<IIIFCanvas> = {}): IIIFCanvas {
  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    label: { en: ['Test Canvas'] },
    width: 1000,
    height: 800,
    items: [],
    ...overrides,
  } as IIIFCanvas;
}

function makeCanvasWithImage(imageUrl: string, serviceOverride?: object): IIIFCanvas {
  const body: IIIFExternalWebResource = {
    id: imageUrl,
    type: 'Image',
    format: 'image/jpeg',
    width: 1000,
    height: 800,
    ...(serviceOverride ? { service: [serviceOverride] } : {}),
  };
  return makeCanvas({
    items: [{
      id: 'https://example.org/canvas/1/page/1',
      type: 'AnnotationPage',
      items: [{
        id: 'https://example.org/canvas/1/annotation/1',
        type: 'Annotation',
        motivation: 'painting',
        body,
        target: 'https://example.org/canvas/1',
      }],
    }],
  });
}

function makeLevel2Service(id = 'https://example.org/iiif/image') {
  return {
    id,
    type: 'ImageService3',
    profile: 'level2',
    width: 2000,
    height: 1500,
  };
}

// ============================================================================
// getPaintingBody
// ============================================================================

describe('getPaintingBody', () => {
  it('returns null when canvas has no items', () => {
    const canvas = makeCanvas({ items: [] });
    expect(getPaintingBody(canvas)).toBeNull();
  });

  it('returns null when annotation page has no annotations', () => {
    const canvas = makeCanvas({
      items: [{ id: 'p', type: 'AnnotationPage', items: [] }],
    });
    expect(getPaintingBody(canvas)).toBeNull();
  });

  it('returns null when annotation body is not type Image', () => {
    const canvas = makeCanvasWithImage('https://example.org/image.jpg');
    // Replace body type with something non-image
    (canvas.items![0].items![0] as any).body = { type: 'Sound', id: 'https://example.org/audio.mp3' };
    expect(getPaintingBody(canvas)).toBeNull();
  });

  it('returns the Image body from the first painting annotation', () => {
    const canvas = makeCanvasWithImage('https://example.org/image.jpg');
    const body = getPaintingBody(canvas);
    expect(body).not.toBeNull();
    expect(body!.type).toBe('Image');
    expect(body!.id).toBe('https://example.org/image.jpg');
  });

  it('picks the Image body when the annotation has an array of bodies', () => {
    const canvas = makeCanvas({
      items: [{
        id: 'p',
        type: 'AnnotationPage',
        items: [{
          id: 'a',
          type: 'Annotation',
          motivation: 'painting',
          body: [
            { type: 'Sound', id: 'https://example.org/sound.mp3', format: 'audio/mpeg' },
            { type: 'Image', id: 'https://example.org/image.jpg', format: 'image/jpeg' },
          ],
          target: 'c',
        }],
      }],
    });
    const body = getPaintingBody(canvas);
    expect(body!.type).toBe('Image');
    expect(body!.id).toBe('https://example.org/image.jpg');
  });
});

// ============================================================================
// getImageService
// ============================================================================

describe('getImageService', () => {
  it('returns null when body has no service property', () => {
    const body = { id: 'x', type: 'Image' } as IIIFExternalWebResource;
    expect(getImageService(body)).toBeNull();
  });

  it('detects ImageService3 and defaults to level2', () => {
    const body = {
      id: 'x',
      type: 'Image',
      service: [{ id: 'https://example.org/iiif', type: 'ImageService3', profile: 'level2' }],
    } as unknown as IIIFExternalWebResource;
    const svc = getImageService(body);
    expect(svc).not.toBeNull();
    expect(svc!.profile).toBe('level2');
    expect(svc!.id).toBe('https://example.org/iiif');
  });

  it('detects level1 from string profile', () => {
    const body = {
      id: 'x',
      type: 'Image',
      service: [{ id: 'https://example.org/iiif', type: 'ImageService2', profile: 'http://iiif.io/api/image/2/level1.json' }],
    } as unknown as IIIFExternalWebResource;
    const svc = getImageService(body);
    expect(svc!.profile).toBe('level1');
  });

  it('detects level0 from string profile', () => {
    const body = {
      id: 'x',
      type: 'Image',
      service: [{ id: 'https://example.org/iiif', type: 'ImageService3', profile: 'level0' }],
    } as unknown as IIIFExternalWebResource;
    const svc = getImageService(body);
    expect(svc!.profile).toBe('level0');
  });

  it('accepts a single (non-array) service object', () => {
    const body = {
      id: 'x',
      type: 'Image',
      service: { id: 'https://example.org/iiif', type: 'ImageService3', profile: 'level2' },
    } as unknown as IIIFExternalWebResource;
    const svc = getImageService(body);
    expect(svc).not.toBeNull();
  });
});

// ============================================================================
// getThumbnailUrl
// ============================================================================

describe('getThumbnailUrl', () => {
  it('returns null when thumbnail is undefined', () => {
    const canvas = makeCanvas({ thumbnail: undefined });
    expect(getThumbnailUrl(canvas)).toBeNull();
  });

  it('returns null when thumbnail array is empty', () => {
    const canvas = makeCanvas({ thumbnail: [] });
    expect(getThumbnailUrl(canvas)).toBeNull();
  });

  it('returns the id of the first thumbnail', () => {
    const canvas = makeCanvas({
      thumbnail: [{ id: 'https://example.org/thumb.jpg', type: 'Image', format: 'image/jpeg' }],
    });
    expect(getThumbnailUrl(canvas)).toBe('https://example.org/thumb.jpg');
  });
});

// ============================================================================
// resolveImageSource
// ============================================================================

describe('resolveImageSource', () => {
  it('returns placeholder when canvas is null', () => {
    const result = resolveImageSource(null);
    expect(result.type).toBe('placeholder');
    expect(result.needsCleanup).toBe(false);
  });

  it('returns placeholder for a canvas with no image data', () => {
    const result = resolveImageSource(makeCanvas());
    expect(result.type).toBe('placeholder');
  });

  it('returns blob type when canvas has _blobUrl', () => {
    const canvas = makeCanvas({ _blobUrl: 'blob:https://example.org/abc123' } as any);
    const result = resolveImageSource(canvas);
    expect(result.type).toBe('blob');
    expect(result.url).toBe('blob:https://example.org/abc123');
    expect(result.needsCleanup).toBe(false);
  });

  it('returns static type for direct painting body URL without service', () => {
    const canvas = makeCanvasWithImage('https://example.org/image.jpg');
    const result = resolveImageSource(canvas);
    expect(result.type).toBe('static');
    expect(result.url).toBe('https://example.org/image.jpg');
  });

  it('returns iiif-level2 type when a Level 2 service is present', () => {
    const canvas = makeCanvasWithImage('https://example.org/image.jpg', makeLevel2Service());
    const result = resolveImageSource(canvas);
    expect(result.type).toBe('iiif-level2');
    expect(result.supportsRegion).toBe(true);
    expect(result.supportsRotation).toBe(true);
    expect(result.supportsQuality).toBe(true);
  });

  it('builds the correct full-size IIIF URL for Level 2 service', () => {
    const serviceId = 'https://example.org/iiif/image';
    const canvas = makeCanvasWithImage('x', makeLevel2Service(serviceId));
    const result = resolveImageSource(canvas, { preferredSize: 'full' });
    expect(result.url).toBe(`${serviceId}/full/max/0/default.jpg`);
  });

  it('builds a thumbnail IIIF URL when preferredSize is "thumbnail"', () => {
    const serviceId = 'https://example.org/iiif/image';
    const canvas = makeCanvasWithImage('x', makeLevel2Service(serviceId));
    const result = resolveImageSource(canvas, { preferredSize: 'thumbnail' });
    expect(result.url).toBe(`${serviceId}/full/,150/0/default.jpg`);
  });

  it('falls back to thumbnail when painting body URL is absent', () => {
    const canvas = makeCanvas({
      thumbnail: [{ id: 'https://example.org/thumb.jpg', type: 'Image', format: 'image/jpeg' }],
    });
    const result = resolveImageSource(canvas);
    expect(result.type).toBe('thumbnail');
    expect(result.url).toBe('https://example.org/thumb.jpg');
  });

  it('uses a custom placeholder URL when provided', () => {
    const custom = 'https://example.org/custom-placeholder.png';
    const result = resolveImageSource(null, { placeholderUrl: custom });
    expect(result.url).toBe(custom);
    expect(result.type).toBe('placeholder');
  });

  it('skips IIIF service when skipIIIFService option is true', () => {
    const canvas = makeCanvasWithImage('https://example.org/image.jpg', makeLevel2Service());
    const result = resolveImageSource(canvas, { skipIIIFService: true });
    expect(result.type).toBe('static');
  });

  it('skips Level 0 service when requireDeepZoom is true', () => {
    const service = { id: 'https://example.org/iiif', type: 'ImageService3', profile: 'level0' };
    const canvas = makeCanvasWithImage('https://example.org/image.jpg', service);
    const result = resolveImageSource(canvas, { requireDeepZoom: true });
    // Should fall through to static URL
    expect(result.type).toBe('static');
  });
});

// ============================================================================
// resolveBodySource
// ============================================================================

describe('resolveBodySource', () => {
  it('returns placeholder when body is null', () => {
    const result = resolveBodySource(null);
    expect(result.type).toBe('placeholder');
  });

  it('returns placeholder when body type is not Image', () => {
    const body = { type: 'Sound', id: 'https://example.org/audio.mp3' } as any;
    const result = resolveBodySource(body);
    expect(result.type).toBe('placeholder');
  });

  it('returns static source for a plain Image body with direct URL', () => {
    const body: IIIFExternalWebResource = {
      id: 'https://example.org/image.jpg',
      type: 'Image',
      format: 'image/jpeg',
    };
    const result = resolveBodySource(body);
    expect(result.type).toBe('static');
    expect(result.url).toBe('https://example.org/image.jpg');
  });

  it('returns iiif-level2 when body has a Level 2 service', () => {
    const body: IIIFExternalWebResource = {
      id: 'https://example.org/image.jpg',
      type: 'Image',
      format: 'image/jpeg',
      service: [{ id: 'https://example.org/iiif', type: 'ImageService3', profile: 'level2' }],
    } as unknown as IIIFExternalWebResource;
    const result = resolveBodySource(body);
    expect(result.type).toBe('iiif-level2');
    expect(result.supportsRotation).toBe(true);
  });
});

// ============================================================================
// buildIIIFImageUrl
// ============================================================================

describe('buildIIIFImageUrl', () => {
  function makeSource(overrides: Partial<ResolvedImageSource> = {}): ResolvedImageSource {
    return {
      url: 'https://example.org/iiif/full/max/0/default.jpg',
      type: 'iiif-level2',
      serviceId: 'https://example.org/iiif',
      supportsRegion: true,
      supportsSizeParam: true,
      supportsRotation: true,
      supportsQuality: true,
      needsCleanup: false,
      ...overrides,
    };
  }

  it('builds a full IIIF URL from service ID and params', () => {
    const source = makeSource();
    const url = buildIIIFImageUrl(source, { region: 'full', size: 'max', rotation: 0, quality: 'default', format: 'jpg' });
    expect(url).toBe('https://example.org/iiif/full/max/0/default.jpg');
  });

  it('returns original URL when source has no serviceId', () => {
    const source = makeSource({ serviceId: undefined, url: 'https://example.org/image.jpg' });
    const url = buildIIIFImageUrl(source);
    expect(url).toBe('https://example.org/image.jpg');
  });

  it('returns original URL when source is iiif-level0', () => {
    const source = makeSource({ type: 'iiif-level0', url: 'https://example.org/iiif/static.jpg' });
    const url = buildIIIFImageUrl(source);
    expect(url).toBe('https://example.org/iiif/static.jpg');
  });

  it('falls back to "full" region when supportsRegion is false', () => {
    const source = makeSource({ supportsRegion: false });
    const url = buildIIIFImageUrl(source, { region: '0,0,500,500' });
    expect(url).toContain('/full/');
  });

  it('applies custom rotation only when supportsRotation is true', () => {
    const source = makeSource({ supportsRotation: true });
    const url = buildIIIFImageUrl(source, { rotation: 90 });
    expect(url).toContain('/90/');
  });

  it('ignores rotation when supportsRotation is false', () => {
    const source = makeSource({ supportsRotation: false });
    const url = buildIIIFImageUrl(source, { rotation: 90 });
    expect(url).toContain('/0/');
  });
});

// ============================================================================
// cleanupImageSource / createSourceCleanup / isSourceCleaned
// ============================================================================

describe('cleanupImageSource', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when source is null', () => {
    expect(cleanupImageSource(null)).toBe(false);
  });

  it('returns false when needsCleanup is false', () => {
    const source: ResolvedImageSource = {
      url: 'blob:x',
      type: 'blob',
      supportsRegion: false,
      supportsSizeParam: false,
      supportsRotation: false,
      supportsQuality: false,
      needsCleanup: false,
      _blobRef: 'blob:x',
    };
    expect(cleanupImageSource(source)).toBe(false);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('calls URL.revokeObjectURL and returns true when needsCleanup is true', () => {
    const source: ResolvedImageSource = {
      url: 'blob:https://example.org/abc',
      type: 'blob',
      supportsRegion: false,
      supportsSizeParam: false,
      supportsRotation: false,
      supportsQuality: false,
      needsCleanup: true,
      _blobRef: 'blob:https://example.org/abc',
    };
    const result = cleanupImageSource(source);
    expect(result).toBe(true);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:https://example.org/abc');
  });

  it('returns false on double cleanup of the same source', () => {
    const source: ResolvedImageSource = {
      url: 'blob:https://example.org/xyz',
      type: 'blob',
      supportsRegion: false,
      supportsSizeParam: false,
      supportsRotation: false,
      supportsQuality: false,
      needsCleanup: true,
      _blobRef: 'blob:https://example.org/xyz',
    };
    cleanupImageSource(source); // first call
    const second = cleanupImageSource(source); // second call
    expect(second).toBe(false);
  });
});

describe('isSourceCleaned', () => {
  it('returns false for a source that has never been cleaned', () => {
    const source: ResolvedImageSource = {
      url: 'blob:fresh',
      type: 'blob',
      supportsRegion: false,
      supportsSizeParam: false,
      supportsRotation: false,
      supportsQuality: false,
      needsCleanup: true,
      _blobRef: 'blob:fresh',
    };
    expect(isSourceCleaned(source)).toBe(false);
  });
});

describe('createSourceCleanup', () => {
  it('returns a function', () => {
    const source: ResolvedImageSource = {
      url: 'x',
      type: 'static',
      supportsRegion: false,
      supportsSizeParam: false,
      supportsRotation: false,
      supportsQuality: false,
      needsCleanup: false,
    };
    const cleanup = createSourceCleanup(source);
    expect(typeof cleanup).toBe('function');
  });

  it('calls cleanupImageSource when invoked', () => {
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const source: ResolvedImageSource = {
      url: 'blob:https://example.org/cleanup-test',
      type: 'blob',
      supportsRegion: false,
      supportsSizeParam: false,
      supportsRotation: false,
      supportsQuality: false,
      needsCleanup: true,
      _blobRef: 'blob:https://example.org/cleanup-test',
    };
    const cleanup = createSourceCleanup(source);
    cleanup();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});
