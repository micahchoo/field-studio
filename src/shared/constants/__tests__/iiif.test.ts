import { describe, it, expect } from 'vitest';
import {
  BEHAVIOR_DEFINITIONS,
  BEHAVIOR_CONFLICTS,
  getConflictingBehaviors,
  VIEWING_DIRECTIONS,
  MOTIVATION_TYPES,
  TIME_MODES,
  SUPPORTED_LANGUAGES,
  BEHAVIOR_OPTIONS,
} from '@/src/shared/constants/iiif';

// ============================================================================
// BEHAVIOR_DEFINITIONS
// ============================================================================

describe('BEHAVIOR_DEFINITIONS', () => {
  it('has exactly 16 entries', () => {
    expect(Object.keys(BEHAVIOR_DEFINITIONS)).toHaveLength(16);
  });

  it('each entry has value, label, description, and category properties', () => {
    for (const [key, def] of Object.entries(BEHAVIOR_DEFINITIONS)) {
      expect(def).toHaveProperty('value');
      expect(def).toHaveProperty('label');
      expect(def).toHaveProperty('description');
      expect(def).toHaveProperty('category');
      // The key must match the value field
      expect(def.value).toBe(key);
      // All fields are non-empty strings
      expect(typeof def.value).toBe('string');
      expect(def.value.length).toBeGreaterThan(0);
      expect(typeof def.label).toBe('string');
      expect(def.label.length).toBeGreaterThan(0);
      expect(typeof def.description).toBe('string');
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it('category is one of layout, time, browsing, page, or navigation', () => {
    const validCategories = ['layout', 'time', 'browsing', 'page', 'navigation'];
    for (const def of Object.values(BEHAVIOR_DEFINITIONS)) {
      expect(validCategories).toContain(def.category);
    }
  });

  it('contains the expected behavior keys', () => {
    const expectedKeys = [
      'multi-part', 'together', 'auto-advance', 'no-auto-advance',
      'repeat', 'no-repeat', 'unordered', 'individuals', 'continuous',
      'paged', 'facing-pages', 'non-paged', 'sequence', 'thumbnail-nav',
      'no-nav', 'hidden',
    ];
    expect(Object.keys(BEHAVIOR_DEFINITIONS).sort()).toEqual(expectedKeys.sort());
  });

  it('has correct categories for specific behaviors', () => {
    expect(BEHAVIOR_DEFINITIONS['multi-part'].category).toBe('layout');
    expect(BEHAVIOR_DEFINITIONS['together'].category).toBe('layout');
    expect(BEHAVIOR_DEFINITIONS['auto-advance'].category).toBe('time');
    expect(BEHAVIOR_DEFINITIONS['repeat'].category).toBe('time');
    expect(BEHAVIOR_DEFINITIONS['individuals'].category).toBe('browsing');
    expect(BEHAVIOR_DEFINITIONS['paged'].category).toBe('browsing');
    expect(BEHAVIOR_DEFINITIONS['facing-pages'].category).toBe('page');
    expect(BEHAVIOR_DEFINITIONS['non-paged'].category).toBe('page');
    expect(BEHAVIOR_DEFINITIONS['sequence'].category).toBe('navigation');
    expect(BEHAVIOR_DEFINITIONS['hidden'].category).toBe('navigation');
  });
});

// ============================================================================
// BEHAVIOR_CONFLICTS
// ============================================================================

describe('BEHAVIOR_CONFLICTS', () => {
  it('has exactly 9 conflict pairs', () => {
    expect(BEHAVIOR_CONFLICTS).toHaveLength(9);
  });

  it('each pair is a tuple of two strings', () => {
    for (const pair of BEHAVIOR_CONFLICTS) {
      expect(pair).toHaveLength(2);
      expect(typeof pair[0]).toBe('string');
      expect(typeof pair[1]).toBe('string');
    }
  });

  it('each conflict pair references behaviors that exist in BEHAVIOR_DEFINITIONS', () => {
    const definedBehaviors = Object.keys(BEHAVIOR_DEFINITIONS);
    for (const [a, b] of BEHAVIOR_CONFLICTS) {
      expect(definedBehaviors).toContain(a);
      expect(definedBehaviors).toContain(b);
    }
  });

  it('contains the expected conflict pairs', () => {
    const expectedPairs: [string, string][] = [
      ['auto-advance', 'no-auto-advance'],
      ['repeat', 'no-repeat'],
      ['individuals', 'continuous'],
      ['individuals', 'paged'],
      ['continuous', 'paged'],
      ['multi-part', 'together'],
      ['thumbnail-nav', 'no-nav'],
      ['thumbnail-nav', 'hidden'],
      ['no-nav', 'hidden'],
    ];
    expect(BEHAVIOR_CONFLICTS).toEqual(expectedPairs);
  });

  it('no behavior conflicts with itself', () => {
    for (const [a, b] of BEHAVIOR_CONFLICTS) {
      expect(a).not.toBe(b);
    }
  });
});

// ============================================================================
// getConflictingBehaviors
// ============================================================================

describe('getConflictingBehaviors', () => {
  it('returns ["no-auto-advance"] for "auto-advance"', () => {
    expect(getConflictingBehaviors('auto-advance')).toEqual(['no-auto-advance']);
  });

  it('returns ["auto-advance"] for "no-auto-advance"', () => {
    expect(getConflictingBehaviors('no-auto-advance')).toEqual(['auto-advance']);
  });

  it('returns ["continuous", "paged"] for "individuals"', () => {
    const result = getConflictingBehaviors('individuals');
    expect(result).toEqual(['continuous', 'paged']);
  });

  it('returns ["individuals", "paged"] for "continuous"', () => {
    const result = getConflictingBehaviors('continuous');
    expect(result).toEqual(['individuals', 'paged']);
  });

  it('returns ["individuals", "continuous"] for "paged"', () => {
    const result = getConflictingBehaviors('paged');
    expect(result).toEqual(['individuals', 'continuous']);
  });

  it('returns ["no-repeat"] for "repeat"', () => {
    expect(getConflictingBehaviors('repeat')).toEqual(['no-repeat']);
  });

  it('returns ["together"] for "multi-part"', () => {
    expect(getConflictingBehaviors('multi-part')).toEqual(['together']);
  });

  it('returns ["no-nav", "hidden"] for "thumbnail-nav"', () => {
    expect(getConflictingBehaviors('thumbnail-nav')).toEqual(['no-nav', 'hidden']);
  });

  it('returns an empty array for an unknown behavior', () => {
    expect(getConflictingBehaviors('unknown-behavior')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(getConflictingBehaviors('')).toEqual([]);
  });
});

// ============================================================================
// VIEWING_DIRECTIONS
// ============================================================================

describe('VIEWING_DIRECTIONS', () => {
  it('has exactly 4 entries', () => {
    expect(VIEWING_DIRECTIONS).toHaveLength(4);
  });

  it('each entry has a value and label property', () => {
    for (const dir of VIEWING_DIRECTIONS) {
      expect(dir).toHaveProperty('value');
      expect(dir).toHaveProperty('label');
      expect(typeof dir.value).toBe('string');
      expect(typeof dir.label).toBe('string');
    }
  });

  it('contains the four IIIF viewing directions', () => {
    const values = VIEWING_DIRECTIONS.map(d => d.value);
    expect(values).toEqual([
      'left-to-right',
      'right-to-left',
      'top-to-bottom',
      'bottom-to-top',
    ]);
  });

  it('has human-readable labels', () => {
    const labels = VIEWING_DIRECTIONS.map(d => d.label);
    expect(labels).toEqual([
      'Left to Right',
      'Right to Left',
      'Top to Bottom',
      'Bottom to Top',
    ]);
  });
});

// ============================================================================
// MOTIVATION_TYPES
// ============================================================================

describe('MOTIVATION_TYPES', () => {
  it('has exactly 10 entries', () => {
    expect(MOTIVATION_TYPES).toHaveLength(10);
  });

  it('includes painting', () => {
    expect(MOTIVATION_TYPES).toContain('painting');
  });

  it('includes supplementing', () => {
    expect(MOTIVATION_TYPES).toContain('supplementing');
  });

  it('includes commenting', () => {
    expect(MOTIVATION_TYPES).toContain('commenting');
  });

  it('includes all expected motivation types', () => {
    const expected = [
      'painting', 'supplementing', 'commenting', 'tagging', 'linking',
      'identifying', 'describing', 'highlighting', 'bookmarking', 'contentState',
    ];
    expect([...MOTIVATION_TYPES]).toEqual(expected);
  });

  it('all entries are non-empty strings', () => {
    for (const m of MOTIVATION_TYPES) {
      expect(typeof m).toBe('string');
      expect(m.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// TIME_MODES
// ============================================================================

describe('TIME_MODES', () => {
  it('has exactly 3 entries', () => {
    expect(TIME_MODES).toHaveLength(3);
  });

  it('contains trim, scale, and loop', () => {
    expect([...TIME_MODES]).toEqual(['trim', 'scale', 'loop']);
  });
});

// ============================================================================
// SUPPORTED_LANGUAGES
// ============================================================================

describe('SUPPORTED_LANGUAGES', () => {
  it('has exactly 11 entries', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(11);
  });

  it('each entry has a code and label', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('label');
      expect(typeof lang.code).toBe('string');
      expect(lang.code.length).toBeGreaterThan(0);
      expect(typeof lang.label).toBe('string');
      expect(lang.label.length).toBeGreaterThan(0);
    }
  });

  it('includes English as the first entry', () => {
    expect(SUPPORTED_LANGUAGES[0].code).toBe('en');
    expect(SUPPORTED_LANGUAGES[0].label).toBe('English');
  });

  it('includes a language-neutral option', () => {
    const neutral = SUPPORTED_LANGUAGES.find(l => l.code === 'none');
    expect(neutral).toBeDefined();
    expect(neutral!.label).toBe('Language-neutral');
  });

  it('the language-neutral option has no nativeName', () => {
    const neutral = SUPPORTED_LANGUAGES.find(l => l.code === 'none');
    expect(neutral!.nativeName).toBeUndefined();
  });

  it('all non-neutral languages have nativeName set', () => {
    const nonNeutral = SUPPORTED_LANGUAGES.filter(l => l.code !== 'none');
    for (const lang of nonNeutral) {
      expect(lang.nativeName).toBeDefined();
      expect(typeof lang.nativeName).toBe('string');
      expect(lang.nativeName!.length).toBeGreaterThan(0);
    }
  });

  it('includes all expected language codes', () => {
    const codes = SUPPORTED_LANGUAGES.map(l => l.code);
    expect(codes).toEqual(['en', 'de', 'fr', 'es', 'it', 'ja', 'zh', 'ar', 'pt', 'ru', 'none']);
  });
});

// ============================================================================
// BEHAVIOR_OPTIONS
// ============================================================================

describe('BEHAVIOR_OPTIONS', () => {
  it('has MANIFEST, CANVAS, COLLECTION, and RANGE keys', () => {
    expect(BEHAVIOR_OPTIONS).toHaveProperty('MANIFEST');
    expect(BEHAVIOR_OPTIONS).toHaveProperty('CANVAS');
    expect(BEHAVIOR_OPTIONS).toHaveProperty('COLLECTION');
    expect(BEHAVIOR_OPTIONS).toHaveProperty('RANGE');
  });

  it('MANIFEST includes paged and individuals', () => {
    expect(BEHAVIOR_OPTIONS.MANIFEST).toContain('paged');
    expect(BEHAVIOR_OPTIONS.MANIFEST).toContain('individuals');
  });

  it('MANIFEST includes auto-advance and sequence', () => {
    expect(BEHAVIOR_OPTIONS.MANIFEST).toContain('auto-advance');
    expect(BEHAVIOR_OPTIONS.MANIFEST).toContain('sequence');
  });

  it('CANVAS includes facing-pages', () => {
    expect(BEHAVIOR_OPTIONS.CANVAS).toContain('facing-pages');
  });

  it('CANVAS includes non-paged', () => {
    expect(BEHAVIOR_OPTIONS.CANVAS).toContain('non-paged');
  });

  it('COLLECTION includes multi-part and together', () => {
    expect(BEHAVIOR_OPTIONS.COLLECTION).toContain('multi-part');
    expect(BEHAVIOR_OPTIONS.COLLECTION).toContain('together');
  });

  it('RANGE includes auto-advance and thumbnail-nav', () => {
    expect(BEHAVIOR_OPTIONS.RANGE).toContain('auto-advance');
    expect(BEHAVIOR_OPTIONS.RANGE).toContain('thumbnail-nav');
  });

  it('all BEHAVIOR_OPTIONS values reference known behaviors', () => {
    const definedBehaviors = Object.keys(BEHAVIOR_DEFINITIONS);
    const allOptions = [
      ...BEHAVIOR_OPTIONS.MANIFEST,
      ...BEHAVIOR_OPTIONS.CANVAS,
      ...BEHAVIOR_OPTIONS.COLLECTION,
      ...BEHAVIOR_OPTIONS.RANGE,
    ];
    for (const opt of allOptions) {
      expect(definedBehaviors).toContain(opt);
    }
  });

  it('CANVAS does not include browsing behaviors like paged or continuous', () => {
    expect(BEHAVIOR_OPTIONS.CANVAS).not.toContain('paged');
    expect(BEHAVIOR_OPTIONS.CANVAS).not.toContain('continuous');
    expect(BEHAVIOR_OPTIONS.CANVAS).not.toContain('individuals');
  });
});
