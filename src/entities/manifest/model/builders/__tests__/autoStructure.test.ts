import { describe, it, expect, vi, beforeEach } from 'vitest';
import { autoStructureService } from '../autoStructure';
import type { IIIFManifest, IIIFCanvas } from '@/src/shared/types';

// crypto.randomUUID is available in happy-dom, but we stub it to get
// deterministic range IDs in assertions that need them.
beforeEach(() => {
  let callCount = 0;
  vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
    callCount++;
    return `00000000-0000-0000-0000-${String(callCount).padStart(12, '0')}` as ReturnType<typeof crypto.randomUUID>;
  });
});

// ============================================================================
// Helpers
// ============================================================================

function makeCanvas(label: string, id?: string): IIIFCanvas {
  return {
    id: id ?? `https://example.org/canvas/${label}`,
    type: 'Canvas',
    label: { en: [label] },
    width: 800,
    height: 600,
    items: [],
  } as IIIFCanvas;
}

function makeManifest(canvases: IIIFCanvas[]): IIIFManifest {
  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: 'https://example.org/manifest/1',
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: canvases,
  } as IIIFManifest;
}

// ============================================================================
// Tests
// ============================================================================

describe('autoStructureService', () => {
  describe('generateRangesFromPatterns', () => {
    it('returns the manifest unchanged when items array is empty', () => {
      const manifest = makeManifest([]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);
      expect(result).toBe(manifest); // exact same reference
      expect(result.structures).toBeUndefined();
    });

    it('returns the manifest unchanged when there is only one canvas', () => {
      const manifest = makeManifest([makeCanvas('p001.jpg')]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);
      expect(result).toBe(manifest);
      expect(result.structures).toBeUndefined();
    });

    it('groups consecutively-numbered canvases into a single range', () => {
      const manifest = makeManifest([
        makeCanvas('p001.jpg'),
        makeCanvas('p002.jpg'),
        makeCanvas('p003.jpg'),
      ]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);

      expect(result.structures).toHaveLength(1);
      expect(result.structures![0].items).toHaveLength(3);
    });

    it('creates a new range when there is a numeric gap greater than 1', () => {
      const manifest = makeManifest([
        makeCanvas('p001.jpg'),
        makeCanvas('p002.jpg'),
        makeCanvas('p010.jpg'), // gap of 8 -> new range
      ]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);

      expect(result.structures).toHaveLength(2);
      expect(result.structures![0].items).toHaveLength(2); // p001, p002
      expect(result.structures![1].items).toHaveLength(1); // p010
    });

    it('creates a new range for every canvas that has no numeric component', () => {
      const manifest = makeManifest([
        makeCanvas('cover'),
        makeCanvas('introduction'),
        makeCanvas('p001.jpg'),
      ]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);

      // Each non-numeric canvas triggers a break, plus p001 continues its own group
      // cover -> range 1, introduction -> range 2, p001 -> range 3
      expect(result.structures).toHaveLength(3);
    });

    it('each range item references the original canvas id', () => {
      const c1 = makeCanvas('p001.jpg', 'https://example.org/canvas/1');
      const c2 = makeCanvas('p002.jpg', 'https://example.org/canvas/2');
      const manifest = makeManifest([c1, c2]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);

      const items = result.structures![0].items;
      expect(items[0]).toMatchObject({ id: c1.id, type: 'Canvas' });
      expect(items[1]).toMatchObject({ id: c2.id, type: 'Canvas' });
    });

    it('range labels include the label of the first canvas in each group', () => {
      const manifest = makeManifest([
        makeCanvas('p001.jpg'),
        makeCanvas('p010.jpg'), // gap -> new range
      ]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);

      expect(result.structures![0].label).toMatchObject({ none: ['Section starting at p001.jpg'] });
      expect(result.structures![1].label).toMatchObject({ none: ['Section starting at p010.jpg'] });
    });

    it('range ids are namespaced under the manifest id', () => {
      const manifest = makeManifest([makeCanvas('p001.jpg'), makeCanvas('p002.jpg')]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);

      const rangeId = result.structures![0].id;
      expect(rangeId).toMatch(new RegExp(`^${manifest.id}/range/auto-`));
    });

    it('each generated range has type "Range"', () => {
      const manifest = makeManifest([makeCanvas('p001.jpg'), makeCanvas('p010.jpg')]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);

      for (const range of result.structures!) {
        expect(range.type).toBe('Range');
      }
    });

    it('does not mutate the original manifest object', () => {
      const canvases = [makeCanvas('p001.jpg'), makeCanvas('p002.jpg')];
      const manifest = makeManifest(canvases);
      const originalItems = manifest.items;

      autoStructureService.generateRangesFromPatterns(manifest);

      expect(manifest.items).toBe(originalItems);
      expect(manifest.structures).toBeUndefined();
    });

    it('handles mixed numeric and non-numeric labels correctly', () => {
      const manifest = makeManifest([
        makeCanvas('cover'),   // no number -> range 1
        makeCanvas('p001.jpg'), // number 1 -> range 2
        makeCanvas('p002.jpg'), // consecutive -> still range 2
        makeCanvas('back'),    // no number -> range 3
      ]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);

      expect(result.structures).toHaveLength(3);
      expect(result.structures![1].items).toHaveLength(2); // p001, p002
    });

    it('uses the first numeric capture group from the label', () => {
      // label "scan_002_v3" - first number is 2, not 3
      const manifest = makeManifest([
        makeCanvas('scan_001_v1'),
        makeCanvas('scan_002_v1'),
      ]);
      const result = autoStructureService.generateRangesFromPatterns(manifest);
      // 1 -> 2: gap of 1, should stay in one range
      expect(result.structures).toHaveLength(1);
      expect(result.structures![0].items).toHaveLength(2);
    });
  });
});
