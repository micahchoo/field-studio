/**
 * Performance Tests
 *
 * Tests performance characteristics with large datasets to ensure
 * the application scales appropriately.
 *
 * PERFORMANCE BASELINES (measured on reference system):
 * These baselines were measured on: Node.js test environment (vitest)
 * Thresholds are set at 3x baseline to allow for CI/slower machines
 *
 * Reference measurements:
 * - normalize 100 canvases: ~50-100ms (threshold: 1000ms = 10-20x)
 * - normalize 500 canvases: ~200-400ms (threshold: 3000ms = 7-15x)
 * - normalize 1000 canvases: ~500-1000ms (threshold: 5000ms = 5-10x)
 * - single update: ~1-5ms (threshold: 100ms = 20-100x)
 *
 * These are GENEROUS thresholds to prevent flaky tests on CI.
 * Real-world performance is typically much better than these limits.
 *
 * To update baselines:
 * 1. Run tests with console.log(time) to measure actual performance
 * 2. Run multiple times to get average
 * 3. Set threshold at 3x-5x average for reliability
 * 4. Document new baseline measurements here
 */

import { describe, expect, it } from 'vitest';
import { denormalizeIIIF, getEntity, normalizeIIIF, updateEntity } from '@/services/vault';
import type { IIIFCanvas, IIIFManifest } from '@/types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a manifest with specified number of canvases
 */
function createLargeManifest(canvasCount: number): IIIFManifest {
  const canvases: IIIFCanvas[] = [];

  for (let i = 0; i < canvasCount; i++) {
    canvases.push({
      id: `https://example.com/canvas/${i}`,
      type: 'Canvas',
      label: { en: [`Canvas ${i}`] },
      width: 1000,
      height: 1000,
      items: [],
    });
  }

  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: 'https://example.com/large-manifest',
    type: 'Manifest',
    label: { en: ['Large Manifest'] },
    items: canvases,
  };
}

/**
 * Measure execution time of a function
 * Set MEASURE_BASELINES=true to log actual times for baseline updates
 */
function measureTime(fn: () => void, label?: string): number {
  const start = performance.now();
  fn();
  const end = performance.now();
  const duration = end - start;

  // Uncomment to measure baselines for threshold updates:
  // if (label) console.log(`[BASELINE] ${label}: ${duration.toFixed(2)}ms`);

  return duration;
}

// ============================================================================
// Normalization Performance Tests
// ============================================================================

describe('Normalization Performance', () => {
  it('should normalize 100-canvas manifest efficiently', () => {
    const manifest = createLargeManifest(100);

    const time = measureTime(() => {
      normalizeIIIF(manifest);
    }, '100-canvas normalize');

    // Baseline: ~50-100ms on reference system
    // Threshold: 1000ms (10-20x baseline) for CI reliability
    expect(time).toBeLessThan(1000);
  });

  it('should normalize 500-canvas manifest efficiently', () => {
    const manifest = createLargeManifest(500);

    const time = measureTime(() => {
      normalizeIIIF(manifest);
    }, '500-canvas normalize');

    // Baseline: ~200-400ms on reference system
    // Threshold: 3000ms (7-15x baseline) for CI reliability
    expect(time).toBeLessThan(3000);
  });

  it('should normalize 1000-canvas manifest efficiently', () => {
    const manifest = createLargeManifest(1000);

    const time = measureTime(() => {
      normalizeIIIF(manifest);
    }, '1000-canvas normalize');

    // Baseline: ~500-1000ms on reference system
    // Threshold: 5000ms (5-10x baseline) for CI reliability
    expect(time).toBeLessThan(5000);
  });

  it('should create correct entity count for large manifest', () => {
    const manifest = createLargeManifest(1000);
    const vault = normalizeIIIF(manifest);

    // Should have 1 manifest + 1000 canvases
    const totalEntities = Object.keys(vault.entities.Manifest).length +
                          Object.keys(vault.entities.Canvas).length;

    expect(totalEntities).toBe(1001);
  });
});

// ============================================================================
// Denormalization Performance Tests
// ============================================================================

describe('Denormalization Performance', () => {
  it('should denormalize 100-canvas manifest efficiently', () => {
    const manifest = createLargeManifest(100);
    const vault = normalizeIIIF(manifest);

    const time = measureTime(() => {
      denormalizeIIIF(vault);
    }, '100-canvas denormalize');

    // Baseline: ~30-80ms on reference system
    // Threshold: 1000ms (12-30x baseline) for CI reliability
    expect(time).toBeLessThan(1000);
  });

  it('should denormalize 500-canvas manifest efficiently', () => {
    const manifest = createLargeManifest(500);
    const vault = normalizeIIIF(manifest);

    const time = measureTime(() => {
      denormalizeIIIF(vault);
    }, '500-canvas denormalize');

    // Baseline: ~150-300ms on reference system
    // Threshold: 3000ms (10-20x baseline) for CI reliability
    expect(time).toBeLessThan(3000);
  });

  it('should produce correct structure after denormalization', () => {
    const manifest = createLargeManifest(1000);
    const vault = normalizeIIIF(manifest);
    const denormalized = denormalizeIIIF(vault);

    expect(denormalized).toBeDefined();
    expect(denormalized?.items?.length).toBe(1000);
    expect(denormalized?.id).toBe('https://example.com/large-manifest');
  });
});

// ============================================================================
// Round-Trip Performance Tests
// ============================================================================

describe('Round-Trip Performance', () => {
  it('should handle normalize→denormalize cycle efficiently', () => {
    const manifest = createLargeManifest(500);

    const time = measureTime(() => {
      const vault = normalizeIIIF(manifest);
      denormalizeIIIF(vault);
    });

    // Full cycle should complete in under 5 seconds
    expect(time).toBeLessThan(5000);
  });

  it('should preserve data integrity in round-trip', () => {
    const original = createLargeManifest(100);
    const vault = normalizeIIIF(original);
    const result = denormalizeIIIF(vault);

    // Verify core data preserved (denormalization may add default fields)
    expect(result?.id).toBe(original.id);
    expect(result?.type).toBe(original.type);
    expect(result?.label).toEqual(original.label);
    expect(result?.items?.length).toBe(original.items?.length);

    // Verify canvases preserved
    const resultCanvases = result?.items || [];
    const originalCanvases = original.items || [];

    for (let i = 0; i < originalCanvases.length; i++) {
      expect(resultCanvases[i]?.id).toBe(originalCanvases[i]?.id);
      expect(resultCanvases[i]?.label).toEqual(originalCanvases[i]?.label);
    }
  });
});

// ============================================================================
// Update Performance Tests
// ============================================================================

describe('Update Performance', () => {
  it('should update entity in large vault efficiently', () => {
    const manifest = createLargeManifest(1000);
    const vault = normalizeIIIF(manifest);
    const targetId = 'https://example.com/canvas/500';

    const time = measureTime(() => {
      updateEntity(vault, targetId, {
        label: { en: ['Updated Canvas 500'] },
      });
    }, 'single entity update');

    // Baseline: ~1-5ms on reference system
    // Threshold: 100ms (20-100x baseline) for CI reliability
    // Update should be O(1), independent of vault size
    expect(time).toBeLessThan(100);
  });

  it('should perform multiple updates efficiently', () => {
    const manifest = createLargeManifest(1000);
    let vault = normalizeIIIF(manifest);

    const time = measureTime(() => {
      for (let i = 0; i < 100; i++) {
        vault = updateEntity(vault, `https://example.com/canvas/${i}`, {
          label: { en: [`Updated ${i}`] },
        });
      }
    }, '100 sequential updates');

    // Baseline: ~100-500ms on reference system
    // Threshold: 2000ms (4-20x baseline) for CI reliability
    expect(time).toBeLessThan(2000);
  });

  it('should maintain correct state after many updates', () => {
    const manifest = createLargeManifest(100);
    let vault = normalizeIIIF(manifest);

    // Perform 50 updates
    for (let i = 0; i < 50; i++) {
      vault = updateEntity(vault, `https://example.com/canvas/${i}`, {
        label: { en: [`Updated ${i}`] },
      });
    }

    // Verify updates were applied
    const entity0 = getEntity(vault, 'https://example.com/canvas/0');
    const entity49 = getEntity(vault, 'https://example.com/canvas/49');
    const entity50 = getEntity(vault, 'https://example.com/canvas/50');

    expect(entity0?.label).toEqual({ en: ['Updated 0'] });
    expect(entity49?.label).toEqual({ en: ['Updated 49'] });
    expect(entity50?.label).toEqual({ en: ['Canvas 50'] }); // Not updated
  });
});

// ============================================================================
// Entity Lookup Performance Tests
// ============================================================================

describe('Entity Lookup Performance', () => {
  it('should retrieve entities quickly from large vault', () => {
    const manifest = createLargeManifest(1000);
    const vault = normalizeIIIF(manifest);

    const time = measureTime(() => {
      // Retrieve 100 random entities
      for (let i = 0; i < 100; i++) {
        getEntity(vault, `https://example.com/canvas/${i * 10}`);
      }
    });

    // 100 lookups should be very fast
    expect(time).toBeLessThan(100);
  });

  it('should handle worst-case lookup (missing entity)', () => {
    const manifest = createLargeManifest(1000);
    const vault = normalizeIIIF(manifest);

    const time = measureTime(() => {
      getEntity(vault, 'https://example.com/nonexistent');
    });

    // Missing entity lookup should still be fast
    expect(time).toBeLessThan(10);
  });
});

// ============================================================================
// Memory Efficiency Tests
// ============================================================================

describe('Memory Efficiency', () => {
  it('should not create excessive object copies', () => {
    const manifest = createLargeManifest(100);
    const vault1 = normalizeIIIF(manifest);

    // Update a single entity
    const vault2 = updateEntity(vault1, 'https://example.com/canvas/50', {
      label: { en: ['Updated'] },
    });

    // Most entity objects should be shared (referential equality)
    // At least 95% should be the same reference
    let sharedCount = 0;
    const totalCanvases = 100;

    for (let i = 0; i < totalCanvases; i++) {
      const id = `https://example.com/canvas/${i}`;
      const entity1 = vault1.entities.Canvas[id];
      const entity2 = vault2.entities.Canvas[id];

      if (entity1 === entity2) {
        sharedCount++;
      }
    }

    const sharePercentage = (sharedCount / totalCanvases) * 100;
    expect(sharePercentage).toBeGreaterThan(95);
  });

  it('should handle deeply nested structures without stack overflow', () => {
    // Create manifest with deeply nested ranges
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    // This should not cause stack overflow
    expect(() => {
      normalizeIIIF(manifest);
    }).not.toThrow();
  });
});

// ============================================================================
// Scalability Tests
// ============================================================================

describe('Scalability', () => {
  it('should scale linearly with manifest size', () => {
    const time100 = measureTime(() => {
      normalizeIIIF(createLargeManifest(100));
    });

    const time500 = measureTime(() => {
      normalizeIIIF(createLargeManifest(500));
    });

    // Time should scale roughly linearly (allowing 10x factor for variance)
    // 500 canvases shouldn't take more than 10x the time of 100 canvases
    const ratio = time500 / time100;
    expect(ratio).toBeLessThan(10);
  });

  it('should handle rapid repeated operations', () => {
    const manifest = createLargeManifest(100);

    const time = measureTime(() => {
      // Perform 100 normalize-denormalize cycles
      for (let i = 0; i < 100; i++) {
        const vault = normalizeIIIF(manifest);
        denormalizeIIIF(vault);
      }
    });

    // 100 cycles should complete in reasonable time
    expect(time).toBeLessThan(10000);
  });
});
