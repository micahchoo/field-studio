/**
 * IIIF Type Module Tests
 *
 * Tests pure functions exported from IIIF type definition files.
 * No DOM or framework imports required.
 */

import { describe, it, expect } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════
// 1. Search API — buildSearchUrl
// ═══════════════════════════════════════════════════════════════════════

import { buildSearchUrl } from '../search-api';
import type { SearchQuery } from '../search-api';

describe('search-api', () => {
  describe('buildSearchUrl', () => {
    it('builds URL with all query params', () => {
      const query: SearchQuery = {
        q: 'medieval',
        motivation: 'painting',
        date: '2024-01-15',
        user: 'admin',
      };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe(
        'https://example.org/search?q=medieval&motivation=painting&date=2024-01-15&user=admin'
      );
    });

    it('builds URL with only q param', () => {
      const query: SearchQuery = { q: 'illuminated' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search?q=illuminated');
    });

    it('builds URL with only motivation param', () => {
      const query: SearchQuery = { motivation: 'commenting' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search?motivation=commenting');
    });

    it('builds URL with only date param', () => {
      const query: SearchQuery = { date: '2024-06-01' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search?date=2024-06-01');
    });

    it('builds URL with only user param', () => {
      const query: SearchQuery = { user: 'curator' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search?user=curator');
    });

    it('returns bare serviceId when query is empty', () => {
      const url = buildSearchUrl('https://example.org/search', {});
      expect(url).toBe('https://example.org/search');
    });

    it('returns bare serviceId when all params are undefined', () => {
      const query: SearchQuery = {
        q: undefined,
        motivation: undefined,
        date: undefined,
        user: undefined,
      };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toBe('https://example.org/search');
    });

    it('omits falsy params (empty strings)', () => {
      const query: SearchQuery = { q: '', motivation: 'tagging' };
      const url = buildSearchUrl('https://example.org/search', query);
      // Empty string is falsy, so q should be omitted
      expect(url).toBe('https://example.org/search?motivation=tagging');
    });

    it('encodes special characters in query string', () => {
      const query: SearchQuery = { q: 'hello world & goodbye' };
      const url = buildSearchUrl('https://example.org/search', query);
      // URLSearchParams encodes spaces as + and & as %26
      expect(url).toContain('q=hello+world+%26+goodbye');
    });

    it('encodes unicode characters', () => {
      const query: SearchQuery = { q: 'manuscrit medieval' };
      const url = buildSearchUrl('https://example.org/search', query);
      expect(url).toContain('q=');
      // The result should be parseable back
      const parsed = new URL(url);
      expect(parsed.searchParams.get('q')).toBe('manuscrit medieval');
    });

    it('handles serviceId with trailing slash', () => {
      const url = buildSearchUrl('https://example.org/search/', { q: 'test' });
      expect(url).toBe('https://example.org/search/?q=test');
    });

    it('handles serviceId that already has query params', () => {
      // buildSearchUrl appends ?... directly to serviceId
      const url = buildSearchUrl('https://example.org/search?v=2', { q: 'test' });
      // This creates a double-? URL — testing the actual behavior
      expect(url).toBe('https://example.org/search?v=2?q=test');
    });

    it('handles multiple params with special characters', () => {
      const query: SearchQuery = {
        q: 'cote d\'ivoire',
        user: 'user@example.com',
      };
      const url = buildSearchUrl('https://example.org/search', query);
      const parsed = new URL(url);
      expect(parsed.searchParams.get('q')).toBe('cote d\'ivoire');
      expect(parsed.searchParams.get('user')).toBe('user@example.com');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. Image Pipeline — buildImageApiUrl
// ═══════════════════════════════════════════════════════════════════════

import {
  buildImageApiUrl,
  calculateTileGrid,
  calculateScaleFactors,
  estimateTotalTiles,
} from '../image-pipeline';
import type { ImageRequestParams } from '../image-pipeline';

describe('image-pipeline', () => {
  describe('buildImageApiUrl', () => {
    it('builds standard IIIF Image API URL', () => {
      const params: ImageRequestParams = {
        identifier: 'abc123',
        region: 'full',
        size: 'max',
        rotation: '0',
        quality: 'default',
        format: 'jpg',
      };
      const url = buildImageApiUrl('https://iiif.example.org', params);
      expect(url).toBe('https://iiif.example.org/abc123/full/max/0/default.jpg');
    });

    it('builds URL with square region', () => {
      const params: ImageRequestParams = {
        identifier: 'img001',
        region: 'square',
        size: '200,200',
        rotation: '0',
        quality: 'default',
        format: 'png',
      };
      const url = buildImageApiUrl('https://iiif.example.org', params);
      expect(url).toBe('https://iiif.example.org/img001/square/200,200/0/default.png');
    });

    it('builds URL with pixel region', () => {
      const params: ImageRequestParams = {
        identifier: 'page1',
        region: '100,200,300,400',
        size: 'max',
        rotation: '0',
        quality: 'color',
        format: 'jpg',
      };
      const url = buildImageApiUrl('https://iiif.example.org', params);
      expect(url).toBe('https://iiif.example.org/page1/100,200,300,400/max/0/color.jpg');
    });

    it('builds URL with percentage region', () => {
      const params: ImageRequestParams = {
        identifier: 'folio',
        region: 'pct:10,20,50,50',
        size: 'max',
        rotation: '0',
        quality: 'default',
        format: 'webp',
      };
      const url = buildImageApiUrl('https://iiif.example.org', params);
      expect(url).toBe('https://iiif.example.org/folio/pct:10,20,50,50/max/0/default.webp');
    });

    it('builds URL with rotation', () => {
      const params: ImageRequestParams = {
        identifier: 'scan',
        region: 'full',
        size: 'max',
        rotation: '90',
        quality: 'default',
        format: 'jpg',
      };
      const url = buildImageApiUrl('https://iiif.example.org', params);
      expect(url).toBe('https://iiif.example.org/scan/full/max/90/default.jpg');
    });

    it('builds URL with mirroring', () => {
      const params: ImageRequestParams = {
        identifier: 'scan',
        region: 'full',
        size: 'max',
        rotation: '!180',
        quality: 'default',
        format: 'jpg',
      };
      const url = buildImageApiUrl('https://iiif.example.org', params);
      expect(url).toBe('https://iiif.example.org/scan/full/max/!180/default.jpg');
    });

    it('builds URL with gray quality', () => {
      const params: ImageRequestParams = {
        identifier: 'photo',
        region: 'full',
        size: 'max',
        rotation: '0',
        quality: 'gray',
        format: 'png',
      };
      const url = buildImageApiUrl('https://iiif.example.org', params);
      expect(url).toBe('https://iiif.example.org/photo/full/max/0/gray.png');
    });

    it('builds URL with bitonal quality', () => {
      const params: ImageRequestParams = {
        identifier: 'manuscript',
        region: 'full',
        size: '!800,600',
        rotation: '0',
        quality: 'bitonal',
        format: 'png',
      };
      const url = buildImageApiUrl('https://iiif.example.org', params);
      expect(url).toBe('https://iiif.example.org/manuscript/full/!800,600/0/bitonal.png');
    });

    it('builds URL with webp format', () => {
      const params: ImageRequestParams = {
        identifier: 'tile',
        region: '0,0,512,512',
        size: '256,',
        rotation: '0',
        quality: 'default',
        format: 'webp',
      };
      const url = buildImageApiUrl('https://iiif.example.org', params);
      expect(url).toBe('https://iiif.example.org/tile/0,0,512,512/256,/0/default.webp');
    });

    it('preserves base URL without trailing slash', () => {
      const params: ImageRequestParams = {
        identifier: 'id',
        region: 'full',
        size: 'max',
        rotation: '0',
        quality: 'default',
        format: 'jpg',
      };
      const url = buildImageApiUrl('https://iiif.example.org/image', params);
      expect(url).toBe('https://iiif.example.org/image/id/full/max/0/default.jpg');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. Image Pipeline — calculateTileGrid
  // ═══════════════════════════════════════════════════════════════════════

  describe('calculateTileGrid', () => {
    it('calculates exact fit (4000x3000, tileSize 1000, factor 1)', () => {
      const result = calculateTileGrid(4000, 3000, 1000, 1);
      expect(result.cols).toBe(4);
      expect(result.rows).toBe(3);
      expect(result.totalTiles).toBe(12);
    });

    it('rounds up for non-exact fit (4001x3001, tileSize 1000, factor 1)', () => {
      const result = calculateTileGrid(4001, 3001, 1000, 1);
      expect(result.cols).toBe(5);
      expect(result.rows).toBe(4);
      expect(result.totalTiles).toBe(20);
    });

    it('halves dimensions with scale factor 2', () => {
      // 4000/2=2000, ceil(2000/1000)=2 cols
      // 3000/2=1500, ceil(1500/1000)=2 rows
      const result = calculateTileGrid(4000, 3000, 1000, 2);
      expect(result.cols).toBe(2);
      expect(result.rows).toBe(2);
      expect(result.totalTiles).toBe(4);
    });

    it('quarters dimensions with scale factor 4', () => {
      // 4000/4=1000, ceil(1000/1000)=1 col
      // 3000/4=750, ceil(750/1000)=1 row
      const result = calculateTileGrid(4000, 3000, 1000, 4);
      expect(result.cols).toBe(1);
      expect(result.rows).toBe(1);
      expect(result.totalTiles).toBe(1);
    });

    it('produces single tile for small image', () => {
      const result = calculateTileGrid(256, 256, 512, 1);
      expect(result.cols).toBe(1);
      expect(result.rows).toBe(1);
      expect(result.totalTiles).toBe(1);
    });

    it('handles non-exact division with scale factor 2', () => {
      // 4001/2 = 2000.5 -> ceil = 2001, ceil(2001/1000) = 3
      // 3001/2 = 1500.5 -> ceil = 1501, ceil(1501/1000) = 2
      const result = calculateTileGrid(4001, 3001, 1000, 2);
      expect(result.cols).toBe(3);
      expect(result.rows).toBe(2);
      expect(result.totalTiles).toBe(6);
    });

    it('handles standard 512 tile size at scale factor 1', () => {
      // 8000/1 = 8000, ceil(8000/512) = 16
      // 6000/1 = 6000, ceil(6000/512) = 12 (6000/512 = 11.71...)
      const result = calculateTileGrid(8000, 6000, 512, 1);
      expect(result.cols).toBe(Math.ceil(8000 / 512));
      expect(result.rows).toBe(Math.ceil(6000 / 512));
      expect(result.totalTiles).toBe(result.cols * result.rows);
    });

    it('handles large scale factor that reduces to single tile', () => {
      // 1024/16 = 64, ceil(64/512) = 1
      // 768/16 = 48, ceil(48/512) = 1
      const result = calculateTileGrid(1024, 768, 512, 16);
      expect(result.cols).toBe(1);
      expect(result.rows).toBe(1);
      expect(result.totalTiles).toBe(1);
    });

    it('handles square image', () => {
      const result = calculateTileGrid(2048, 2048, 512, 1);
      expect(result.cols).toBe(4);
      expect(result.rows).toBe(4);
      expect(result.totalTiles).toBe(16);
    });

    it('handles very wide image', () => {
      // panorama: 10000 x 500
      const result = calculateTileGrid(10000, 500, 512, 1);
      expect(result.cols).toBe(Math.ceil(10000 / 512)); // 20
      expect(result.rows).toBe(1);
      expect(result.totalTiles).toBe(result.cols);
    });

    it('handles very tall image', () => {
      // scroll: 500 x 10000
      const result = calculateTileGrid(500, 10000, 512, 1);
      expect(result.cols).toBe(1);
      expect(result.rows).toBe(Math.ceil(10000 / 512)); // 20
      expect(result.totalTiles).toBe(result.rows);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. Image Pipeline — calculateScaleFactors
  // ═══════════════════════════════════════════════════════════════════════

  describe('calculateScaleFactors', () => {
    it('returns correct factors for 8000x6000 with 512 tile', () => {
      // maxDim=8000, tileSize=512
      // 8000/1=8000 > 512 -> push 1, factor=2
      // 8000/2=4000 > 512 -> push 2, factor=4
      // 8000/4=2000 > 512 -> push 4, factor=8
      // 8000/8=1000 > 512 -> push 8, factor=16
      // 8000/16=500 <= 512 -> exit loop, push 16
      const factors = calculateScaleFactors(8000, 6000, 512);
      expect(factors).toEqual([1, 2, 4, 8, 16]);
    });

    it('returns [1, 2] for 1024x1024 with 512 tile', () => {
      // maxDim=1024
      // 1024/1=1024 > 512 -> push 1, factor=2
      // 1024/2=512 <= 512 -> exit loop, push 2
      const factors = calculateScaleFactors(1024, 1024, 512);
      expect(factors).toEqual([1, 2]);
    });

    it('returns [1] for 512x512 with 512 tile', () => {
      // maxDim=512
      // 512/1=512 <= 512 -> exit loop immediately, push 1
      const factors = calculateScaleFactors(512, 512, 512);
      expect(factors).toEqual([1]);
    });

    it('returns [1] for image smaller than tile size', () => {
      // maxDim=256
      // 256/1=256 <= 512 -> exit loop immediately, push 1
      const factors = calculateScaleFactors(256, 128, 512);
      expect(factors).toEqual([1]);
    });

    it('limits output with maxFactors=3', () => {
      // Without limit, would be [1, 2, 4, 8, 16]
      const factors = calculateScaleFactors(8000, 6000, 512, 3);
      expect(factors).toEqual([1, 2, 4]);
      expect(factors).toHaveLength(3);
    });

    it('limits output with maxFactors=1', () => {
      const factors = calculateScaleFactors(8000, 6000, 512, 1);
      expect(factors).toEqual([1]);
    });

    it('maxFactors larger than actual factors does not pad', () => {
      // 1024x1024 with 512 -> [1, 2], maxFactors=10 should not change
      const factors = calculateScaleFactors(1024, 1024, 512, 10);
      expect(factors).toEqual([1, 2]);
    });

    it('handles very large image', () => {
      // maxDim=65536
      // 65536 / 1 = 65536 > 512 -> push 1
      // 65536 / 2 = 32768 > 512 -> push 2
      // ... continues until 65536/128 = 512, exit loop, push 128
      const factors = calculateScaleFactors(65536, 65536, 512);
      expect(factors[0]).toBe(1);
      expect(factors[factors.length - 1]).toBe(128);
      // Should be [1, 2, 4, 8, 16, 32, 64, 128]
      expect(factors).toEqual([1, 2, 4, 8, 16, 32, 64, 128]);
    });

    it('handles rectangular image using max dimension', () => {
      // 4096x256 -> maxDim=4096
      // 4096/1=4096 > 512 -> push 1, factor=2
      // 4096/2=2048 > 512 -> push 2, factor=4
      // 4096/4=1024 > 512 -> push 4, factor=8
      // 4096/8=512 <= 512 -> exit loop, push 8
      const factors = calculateScaleFactors(4096, 256, 512);
      expect(factors).toEqual([1, 2, 4, 8]);
    });

    it('always starts with factor 1', () => {
      const factors = calculateScaleFactors(10000, 10000, 512);
      expect(factors[0]).toBe(1);
    });

    it('each factor is double the previous', () => {
      const factors = calculateScaleFactors(16000, 12000, 512);
      for (let i = 1; i < factors.length; i++) {
        expect(factors[i]).toBe(factors[i - 1] * 2);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. Image Pipeline — estimateTotalTiles
  // ═══════════════════════════════════════════════════════════════════════

  describe('estimateTotalTiles', () => {
    it('sums tiles across all scale factors', () => {
      // 4096x4096 with 512 tile -> factors [1, 2, 4, 8]
      // factor 1: ceil(4096/512)=8 cols, 8 rows = 64 tiles
      // factor 2: ceil(2048/512)=4 cols, 4 rows = 16 tiles
      // factor 4: ceil(1024/512)=2 cols, 2 rows = 4 tiles
      // factor 8: ceil(512/512)=1 col, 1 row = 1 tile
      // total = 64 + 16 + 4 + 1 = 85
      const total = estimateTotalTiles(4096, 4096, 512);
      expect(total).toBe(85);
    });

    it('returns few tiles for small image', () => {
      // 512x512 with 512 tile -> factors [1]
      // factor 1: 1 col, 1 row = 1 tile
      const total = estimateTotalTiles(512, 512, 512);
      expect(total).toBe(1);
    });

    it('returns 1 tile for image smaller than tile size', () => {
      // 256x128 with 512 tile -> factors [1]
      // factor 1: ceil(256/512)=1, ceil(128/512)=1 = 1 tile
      const total = estimateTotalTiles(256, 128, 512);
      expect(total).toBe(1);
    });

    it('maxFactors limits total tile count', () => {
      const unlimited = estimateTotalTiles(8000, 6000, 512);
      const limited = estimateTotalTiles(8000, 6000, 512, 2);
      expect(limited).toBeLessThan(unlimited);
    });

    it('maxFactors=1 returns only full-resolution tiles', () => {
      const total = estimateTotalTiles(4096, 4096, 512, 1);
      // Only factor 1: 8x8 = 64 tiles
      expect(total).toBe(64);
    });

    it('matches manual calculation for 1024x1024 with 512 tile', () => {
      // factors [1, 2]
      // factor 1: ceil(1024/512)=2 cols, 2 rows = 4 tiles
      // factor 2: ceil(512/512)=1 col, 1 row = 1 tile
      // total = 5
      const total = estimateTotalTiles(1024, 1024, 512);
      expect(total).toBe(5);
    });

    it('handles large image tile count', () => {
      // 65536x65536 with 512 -> many tiles
      const total = estimateTotalTiles(65536, 65536, 512);
      expect(total).toBeGreaterThan(0);
      // factor 1 alone: 128*128 = 16384, plus smaller levels
      expect(total).toBeGreaterThan(16384);
    });

    it('result equals sum of calculateTileGrid across all factors', () => {
      const width = 3000;
      const height = 2000;
      const tileSize = 512;
      const factors = calculateScaleFactors(width, height, tileSize);
      const manualTotal = factors.reduce((sum, f) => {
        return sum + calculateTileGrid(width, height, tileSize, f).totalTiles;
      }, 0);
      const estimated = estimateTotalTiles(width, height, tileSize);
      expect(estimated).toBe(manualTotal);
    });

    it('non-square image tile count is correct', () => {
      // 2048x512, tile 512 -> factors: maxDim=2048
      // 2048/1=2048 > 512 -> push 1
      // 2048/2=1024 > 512 -> push 2
      // 2048/4=512 <= 512 -> push 4
      // factors [1, 2, 4]
      // factor 1: ceil(2048/512)=4, ceil(512/512)=1 -> 4 tiles
      // factor 2: ceil(1024/512)=2, ceil(256/512)=1 -> 2 tiles
      // factor 4: ceil(512/512)=1, ceil(128/512)=1 -> 1 tile
      // total = 7
      const total = estimateTotalTiles(2048, 512, 512);
      expect(total).toBe(7);
    });
  });
});
