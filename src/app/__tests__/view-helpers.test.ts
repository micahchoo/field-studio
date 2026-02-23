/**
 * View Helper Function Tests
 *
 * Tests pure helper functions extracted from the view components
 * (ViewRouter, ViewerView). These functions are defined inline in the
 * Svelte components but their logic is testable by re-implementing
 * them as pure functions here.
 *
 * No DOM or framework imports required.
 */

import { describe, it, expect } from 'vitest';
import type {
  IIIFItem,
  IIIFCanvas,
  IIIFManifest,
  IIIFAnnotation,
  IIIFAnnotationPage,
  IIIFExternalWebResource,
} from '@/src/shared/types';

// ═══════════════════════════════════════════════════════════════════════
// Helper function re-implementations (extracted from component logic)
// ═══════════════════════════════════════════════════════════════════════

function findFirstCanvas(node: any): { canvas: IIIFCanvas | null; manifest: IIIFManifest | null } {
  if (node.type === 'Canvas') return { canvas: node, manifest: null };
  if (node.items && Array.isArray(node.items)) {
    for (const item of node.items) {
      const result = findFirstCanvas(item);
      if (result.canvas) {
        if (node.type === 'Manifest') return { canvas: result.canvas, manifest: node };
        return result;
      }
    }
  }
  return { canvas: null, manifest: null };
}

function getCanvasAnnotations(canvas: IIIFCanvas | null): IIIFAnnotation[] {
  if (!canvas?.annotations) return [];
  const annotations: IIIFAnnotation[] = [];
  for (const page of canvas.annotations) {
    if (page.items) annotations.push(...page.items);
  }
  return annotations;
}

function getCanvasMediaType(canvas: IIIFItem | null): 'image' | 'video' | 'audio' | 'other' {
  if (!canvas) return 'other';
  const items = (canvas as any).items;
  if (!items?.length) return 'other';
  for (const page of items) {
    if (page.items) {
      for (const anno of page.items) {
        const body = anno.body as { type?: string };
        if (body?.type === 'Image') return 'image';
        if (body?.type === 'Video') return 'video';
        if (body?.type === 'Sound') return 'audio';
      }
    }
  }
  return 'other';
}

const CHAPTER_COLORS = ['#3b82f6', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];

function extractChapters(manifest: IIIFManifest | null, canvasId: string) {
  if (!manifest?.structures || !canvasId) return [];
  const markers: { label: string; start: number; end: number; color: string }[] = [];
  const extractFromRange = (range: any, colorIdx: number) => {
    for (const ref of range.items) {
      const refId = ref.id || '';
      if (!refId.includes(canvasId)) continue;
      const hashIdx = refId.indexOf('#t=');
      if (hashIdx === -1) continue;
      const fragment = refId.substring(hashIdx + 3);
      const parts = fragment.split(',');
      const start = parseFloat(parts[0]);
      const end = parts.length > 1 ? parseFloat(parts[1]) : start;
      if (isNaN(start)) continue;
      markers.push({
        label: range.label?.en?.[0] || `Chapter ${markers.length + 1}`,
        start,
        end: isNaN(end) ? start : end,
        color: CHAPTER_COLORS[colorIdx % CHAPTER_COLORS.length],
      });
    }
  };
  manifest.structures.forEach((range: any, idx: number) => extractFromRange(range, idx));
  return markers.sort((a, b) => a.start - b.start);
}

function resolveMediaType(item: IIIFItem | null): 'image' | 'video' | 'audio' | 'other' {
  if (!item) return 'other';
  const items = (item as any).items;
  if (!items?.length) return 'other';
  for (const page of items) {
    if (!page.items) continue;
    for (const anno of page.items) {
      const body = anno.body as { type?: string; format?: string };
      if (!body) continue;
      if (body.type === 'Image') return 'image';
      if (body.type === 'Video') return 'video';
      if (body.type === 'Sound' || body.type === 'Audio') return 'audio';
      if (body.format) {
        if (body.format.startsWith('image/')) return 'image';
        if (body.format.startsWith('video/')) return 'video';
        if (body.format.startsWith('audio/')) return 'audio';
      }
    }
  }
  return 'other';
}

// ═══════════════════════════════════════════════════════════════════════
// Fixture Helpers
// ═══════════════════════════════════════════════════════════════════════

function makeCanvas(id: string, overrides?: Partial<IIIFCanvas>): IIIFCanvas {
  return {
    id,
    type: 'Canvas',
    width: 1000,
    height: 800,
    items: [],
    ...overrides,
  };
}

function makeAnnotation(id: string, motivation: string, body: any): IIIFAnnotation {
  return {
    id,
    type: 'Annotation',
    motivation,
    body,
    target: `canvas-1#xywh=0,0,100,100`,
  };
}

function makeAnnotationPage(id: string, items: IIIFAnnotation[]): IIIFAnnotationPage {
  return {
    id,
    type: 'AnnotationPage',
    items,
  };
}

function makeManifest(id: string, canvases: IIIFCanvas[], overrides?: Partial<IIIFManifest>): IIIFManifest {
  return {
    id,
    type: 'Manifest',
    items: canvases,
    ...overrides,
  };
}

function makePaintingPage(bodyType: string, bodyId: string = 'body-1', format: string = 'image/jpeg'): IIIFAnnotationPage {
  return makeAnnotationPage('page-paint-1', [
    makeAnnotation('anno-paint-1', 'painting', {
      id: bodyId,
      type: bodyType,
      format,
    } as IIIFExternalWebResource),
  ]);
}

// ═══════════════════════════════════════════════════════════════════════
// 1. findFirstCanvas
// ═══════════════════════════════════════════════════════════════════════

describe('findFirstCanvas', () => {
  it('returns null for empty collection', () => {
    const collection = { id: 'col-1', type: 'Collection', items: [] };
    const result = findFirstCanvas(collection);
    expect(result.canvas).toBeNull();
    expect(result.manifest).toBeNull();
  });

  it('finds canvas directly at root level', () => {
    const canvas = makeCanvas('canvas-1');
    const result = findFirstCanvas(canvas);
    expect(result.canvas).toBe(canvas);
    expect(result.manifest).toBeNull();
  });

  it('finds canvas nested in manifest and returns both', () => {
    const canvas = makeCanvas('canvas-1');
    const manifest = makeManifest('manifest-1', [canvas]);
    const result = findFirstCanvas(manifest);
    expect(result.canvas).toBe(canvas);
    expect(result.manifest).toBe(manifest);
  });

  it('finds first canvas in collection with multiple manifests', () => {
    const canvas1 = makeCanvas('canvas-1');
    const canvas2 = makeCanvas('canvas-2');
    const manifest1 = makeManifest('manifest-1', [canvas1]);
    const manifest2 = makeManifest('manifest-2', [canvas2]);
    const collection = {
      id: 'col-1',
      type: 'Collection',
      items: [manifest1, manifest2],
    };
    const result = findFirstCanvas(collection);
    expect(result.canvas).toBe(canvas1);
    expect(result.manifest).toBe(manifest1);
  });

  it('returns null for tree with only collections', () => {
    const innerCollection = { id: 'col-inner', type: 'Collection', items: [] };
    const outerCollection = {
      id: 'col-outer',
      type: 'Collection',
      items: [innerCollection],
    };
    const result = findFirstCanvas(outerCollection);
    expect(result.canvas).toBeNull();
    expect(result.manifest).toBeNull();
  });

  it('finds canvas deeply nested in collection > collection > manifest', () => {
    const canvas = makeCanvas('deep-canvas');
    const manifest = makeManifest('deep-manifest', [canvas]);
    const inner = { id: 'col-inner', type: 'Collection', items: [manifest] };
    const outer = { id: 'col-outer', type: 'Collection', items: [inner] };
    const result = findFirstCanvas(outer);
    expect(result.canvas).toBe(canvas);
    expect(result.manifest).toBe(manifest);
  });

  it('returns null for node with no items property', () => {
    const node = { id: 'range-1', type: 'Range' };
    const result = findFirstCanvas(node);
    expect(result.canvas).toBeNull();
    expect(result.manifest).toBeNull();
  });

  it('skips empty manifests and finds canvas in second manifest', () => {
    const canvas = makeCanvas('canvas-2');
    const emptyManifest = makeManifest('manifest-empty', []);
    const manifest = makeManifest('manifest-2', [canvas]);
    const collection = {
      id: 'col-1',
      type: 'Collection',
      items: [emptyManifest, manifest],
    };
    const result = findFirstCanvas(collection);
    expect(result.canvas).toBe(canvas);
    expect(result.manifest).toBe(manifest);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. getCanvasAnnotations
// ═══════════════════════════════════════════════════════════════════════

describe('getCanvasAnnotations', () => {
  it('returns empty for null canvas', () => {
    const result = getCanvasAnnotations(null);
    expect(result).toEqual([]);
  });

  it('returns empty for canvas with no annotations property', () => {
    const canvas = makeCanvas('canvas-1');
    const result = getCanvasAnnotations(canvas);
    expect(result).toEqual([]);
  });

  it('returns empty for canvas with empty annotation pages', () => {
    const canvas = makeCanvas('canvas-1', {
      annotations: [makeAnnotationPage('page-1', [])],
    });
    const result = getCanvasAnnotations(canvas);
    expect(result).toEqual([]);
  });

  it('flattens single page with multiple annotations', () => {
    const anno1 = makeAnnotation('anno-1', 'commenting', { type: 'TextualBody', value: 'Note 1', format: 'text/plain' });
    const anno2 = makeAnnotation('anno-2', 'tagging', { type: 'TextualBody', value: 'tag-a', format: 'text/plain' });
    const canvas = makeCanvas('canvas-1', {
      annotations: [makeAnnotationPage('page-1', [anno1, anno2])],
    });
    const result = getCanvasAnnotations(canvas);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(anno1);
    expect(result[1]).toBe(anno2);
  });

  it('flattens multiple pages', () => {
    const anno1 = makeAnnotation('anno-1', 'commenting', { type: 'TextualBody', value: 'A', format: 'text/plain' });
    const anno2 = makeAnnotation('anno-2', 'commenting', { type: 'TextualBody', value: 'B', format: 'text/plain' });
    const anno3 = makeAnnotation('anno-3', 'tagging', { type: 'TextualBody', value: 'C', format: 'text/plain' });
    const canvas = makeCanvas('canvas-1', {
      annotations: [
        makeAnnotationPage('page-1', [anno1, anno2]),
        makeAnnotationPage('page-2', [anno3]),
      ],
    });
    const result = getCanvasAnnotations(canvas);
    expect(result).toHaveLength(3);
    expect(result).toEqual([anno1, anno2, anno3]);
  });

  it('handles page with undefined items gracefully', () => {
    const canvas = makeCanvas('canvas-1', {
      annotations: [{ id: 'page-1', type: 'AnnotationPage' } as IIIFAnnotationPage],
    });
    // items is undefined on the page, should not throw
    const result = getCanvasAnnotations(canvas);
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. getCanvasMediaType
// ═══════════════════════════════════════════════════════════════════════

describe('getCanvasMediaType', () => {
  it('returns other for null', () => {
    expect(getCanvasMediaType(null)).toBe('other');
  });

  it('returns other for canvas with no items', () => {
    const canvas = makeCanvas('canvas-1', { items: [] });
    expect(getCanvasMediaType(canvas)).toBe('other');
  });

  it('returns image for Image body', () => {
    const canvas = makeCanvas('canvas-1', {
      items: [makePaintingPage('Image')],
    });
    expect(getCanvasMediaType(canvas)).toBe('image');
  });

  it('returns video for Video body', () => {
    const canvas = makeCanvas('canvas-1', {
      items: [makePaintingPage('Video', 'video-body', 'video/mp4')],
    });
    expect(getCanvasMediaType(canvas)).toBe('video');
  });

  it('returns audio for Sound body', () => {
    const canvas = makeCanvas('canvas-1', {
      items: [makePaintingPage('Sound', 'audio-body', 'audio/mp3')],
    });
    expect(getCanvasMediaType(canvas)).toBe('audio');
  });

  it('returns other for unknown body type', () => {
    const canvas = makeCanvas('canvas-1', {
      items: [makePaintingPage('Dataset', 'data-body', 'application/json')],
    });
    expect(getCanvasMediaType(canvas)).toBe('other');
  });

  it('returns first recognized type when multiple annotations exist', () => {
    const page = makeAnnotationPage('page-1', [
      makeAnnotation('a1', 'painting', { id: 'img-1', type: 'Image', format: 'image/jpeg' }),
      makeAnnotation('a2', 'painting', { id: 'vid-1', type: 'Video', format: 'video/mp4' }),
    ]);
    const canvas = makeCanvas('canvas-1', { items: [page] });
    // First annotation is Image, so image wins
    expect(getCanvasMediaType(canvas)).toBe('image');
  });

  it('returns other for page with no items', () => {
    const canvas = makeCanvas('canvas-1', {
      items: [{ id: 'page-empty', type: 'AnnotationPage' } as IIIFAnnotationPage],
    });
    expect(getCanvasMediaType(canvas)).toBe('other');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. extractChapters
// ═══════════════════════════════════════════════════════════════════════

describe('extractChapters', () => {
  const canvasId = 'https://example.org/canvas/1';

  it('returns empty for null manifest', () => {
    expect(extractChapters(null, canvasId)).toEqual([]);
  });

  it('returns empty for manifest with no structures', () => {
    const manifest = makeManifest('m-1', []);
    expect(extractChapters(manifest, canvasId)).toEqual([]);
  });

  it('returns empty for empty canvasId', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [{
        id: 'range-1',
        type: 'Range' as const,
        label: { en: ['Chapter 1'] },
        items: [{ id: `${canvasId}#t=0,30`, type: 'Canvas' as const }],
      }],
    });
    expect(extractChapters(manifest, '')).toEqual([]);
  });

  it('extracts single chapter with start and end', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [{
        id: 'range-1',
        type: 'Range' as const,
        label: { en: ['Introduction'] },
        items: [{ id: `${canvasId}#t=0,30`, type: 'Canvas' as const }],
      }],
    });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].label).toBe('Introduction');
    expect(chapters[0].start).toBe(0);
    expect(chapters[0].end).toBe(30);
    expect(chapters[0].color).toBe(CHAPTER_COLORS[0]);
  });

  it('extracts multiple chapters sorted by start time', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [
        {
          id: 'range-2',
          type: 'Range' as const,
          label: { en: ['Part B'] },
          items: [{ id: `${canvasId}#t=60,120`, type: 'Canvas' as const }],
        },
        {
          id: 'range-1',
          type: 'Range' as const,
          label: { en: ['Part A'] },
          items: [{ id: `${canvasId}#t=0,60`, type: 'Canvas' as const }],
        },
      ],
    });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(2);
    // Sorted by start time: Part A (0) first, Part B (60) second
    expect(chapters[0].label).toBe('Part A');
    expect(chapters[0].start).toBe(0);
    expect(chapters[1].label).toBe('Part B');
    expect(chapters[1].start).toBe(60);
  });

  it('skips ranges that do not reference the target canvas', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [
        {
          id: 'range-1',
          type: 'Range' as const,
          label: { en: ['Relevant'] },
          items: [{ id: `${canvasId}#t=10,20`, type: 'Canvas' as const }],
        },
        {
          id: 'range-2',
          type: 'Range' as const,
          label: { en: ['Other Canvas'] },
          items: [{ id: 'https://example.org/canvas/99#t=0,100', type: 'Canvas' as const }],
        },
      ],
    });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].label).toBe('Relevant');
  });

  it('handles fragments with only start (no comma)', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [{
        id: 'range-1',
        type: 'Range' as const,
        label: { en: ['Point Marker'] },
        items: [{ id: `${canvasId}#t=45`, type: 'Canvas' as const }],
      }],
    });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].start).toBe(45);
    // With only one value in the fragment and no comma, parts.length is 1,
    // so end falls back to start
    expect(chapters[0].end).toBe(45);
  });

  it('assigns colors cyclically from CHAPTER_COLORS', () => {
    const structures = Array.from({ length: 8 }, (_, i) => ({
      id: `range-${i}`,
      type: 'Range' as const,
      label: { en: [`Chapter ${i + 1}`] },
      items: [{ id: `${canvasId}#t=${i * 10},${(i + 1) * 10}`, type: 'Canvas' as const }],
    }));
    const manifest = makeManifest('m-1', [], { structures });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(8);
    // First 6 chapters get colors 0-5, then it wraps around
    expect(chapters[0].color).toBe(CHAPTER_COLORS[0]);
    expect(chapters[5].color).toBe(CHAPTER_COLORS[5]);
    expect(chapters[6].color).toBe(CHAPTER_COLORS[6 % 6]); // wraps to 0
    expect(chapters[7].color).toBe(CHAPTER_COLORS[7 % 6]); // wraps to 1
  });

  it('handles label fallback when range label is missing', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [
        {
          id: 'range-1',
          type: 'Range' as const,
          // No label at all
          items: [{ id: `${canvasId}#t=0,15`, type: 'Canvas' as const }],
        },
        {
          id: 'range-2',
          type: 'Range' as const,
          label: { fr: ['Chapitre Deux'] }, // No 'en' key
          items: [{ id: `${canvasId}#t=15,30`, type: 'Canvas' as const }],
        },
      ],
    });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(2);
    // First range has no label, so fallback: "Chapter N"
    expect(chapters[0].label).toBe('Chapter 1');
    // Second range has label but no 'en', so range.label?.en?.[0] is undefined -> fallback
    expect(chapters[1].label).toBe('Chapter 2');
  });

  it('skips references without #t= fragment', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [{
        id: 'range-1',
        type: 'Range' as const,
        label: { en: ['No Fragment'] },
        items: [{ id: canvasId, type: 'Canvas' as const }], // No #t=
      }],
    });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(0);
  });

  it('skips NaN start values', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [{
        id: 'range-1',
        type: 'Range' as const,
        label: { en: ['Bad Fragment'] },
        items: [{ id: `${canvasId}#t=abc,def`, type: 'Canvas' as const }],
      }],
    });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(0);
  });

  it('handles NaN end with valid start (end falls back to start)', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [{
        id: 'range-1',
        type: 'Range' as const,
        label: { en: ['Partial'] },
        items: [{ id: `${canvasId}#t=10,abc`, type: 'Canvas' as const }],
      }],
    });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].start).toBe(10);
    expect(chapters[0].end).toBe(10); // NaN end -> fallback to start
  });

  it('handles decimal time values', () => {
    const manifest = makeManifest('m-1', [], {
      structures: [{
        id: 'range-1',
        type: 'Range' as const,
        label: { en: ['Precise'] },
        items: [{ id: `${canvasId}#t=1.5,3.75`, type: 'Canvas' as const }],
      }],
    });
    const chapters = extractChapters(manifest, canvasId);
    expect(chapters).toHaveLength(1);
    expect(chapters[0].start).toBe(1.5);
    expect(chapters[0].end).toBe(3.75);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. resolveMediaType
// ═══════════════════════════════════════════════════════════════════════

describe('resolveMediaType', () => {
  it('returns image from body.type === Image', () => {
    const canvas = makeCanvas('c-1', {
      items: [makePaintingPage('Image', 'img-1', 'image/jpeg')],
    });
    expect(resolveMediaType(canvas)).toBe('image');
  });

  it('returns video from body.type === Video', () => {
    const canvas = makeCanvas('c-1', {
      items: [makePaintingPage('Video', 'vid-1', 'video/mp4')],
    });
    expect(resolveMediaType(canvas)).toBe('video');
  });

  it('returns audio from body.type === Sound', () => {
    const canvas = makeCanvas('c-1', {
      items: [makePaintingPage('Sound', 'snd-1', 'audio/mpeg')],
    });
    expect(resolveMediaType(canvas)).toBe('audio');
  });

  it('returns audio from body.type === Audio', () => {
    const page = makeAnnotationPage('page-1', [
      makeAnnotation('a-1', 'painting', {
        id: 'audio-1',
        type: 'Audio',
        format: 'audio/wav',
      }),
    ]);
    const canvas = makeCanvas('c-1', { items: [page] });
    expect(resolveMediaType(canvas)).toBe('audio');
  });

  it('detects image from format starting with image/', () => {
    const page = makeAnnotationPage('page-1', [
      makeAnnotation('a-1', 'painting', {
        id: 'res-1',
        type: 'Dataset', // Not a recognized type
        format: 'image/tiff',
      }),
    ]);
    const canvas = makeCanvas('c-1', { items: [page] });
    expect(resolveMediaType(canvas)).toBe('image');
  });

  it('detects video from format starting with video/', () => {
    const page = makeAnnotationPage('page-1', [
      makeAnnotation('a-1', 'painting', {
        id: 'res-1',
        type: 'Dataset',
        format: 'video/webm',
      }),
    ]);
    const canvas = makeCanvas('c-1', { items: [page] });
    expect(resolveMediaType(canvas)).toBe('video');
  });

  it('detects audio from format starting with audio/', () => {
    const page = makeAnnotationPage('page-1', [
      makeAnnotation('a-1', 'painting', {
        id: 'res-1',
        type: 'Dataset',
        format: 'audio/ogg',
      }),
    ]);
    const canvas = makeCanvas('c-1', { items: [page] });
    expect(resolveMediaType(canvas)).toBe('audio');
  });

  it('returns other for unknown body type and format', () => {
    const page = makeAnnotationPage('page-1', [
      makeAnnotation('a-1', 'painting', {
        id: 'res-1',
        type: 'Dataset',
        format: 'application/json',
      }),
    ]);
    const canvas = makeCanvas('c-1', { items: [page] });
    expect(resolveMediaType(canvas)).toBe('other');
  });

  it('returns other for null item', () => {
    expect(resolveMediaType(null)).toBe('other');
  });

  it('returns other for item with no items array', () => {
    const item: IIIFItem = { id: 'x', type: 'Canvas' } as any;
    expect(resolveMediaType(item)).toBe('other');
  });

  it('returns other for item with empty items array', () => {
    const canvas = makeCanvas('c-1', { items: [] });
    expect(resolveMediaType(canvas)).toBe('other');
  });
});
