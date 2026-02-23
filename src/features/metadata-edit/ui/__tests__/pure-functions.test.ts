/**
 * Pure Function Tests -- metadata-edit atoms & molecules
 *
 * Tests logic exported from <script module> blocks in Svelte components.
 * Functions are duplicated here because Svelte module-level exports from
 * .svelte files may not be directly importable in vitest without the
 * Svelte preprocessor running in test mode. The canonical implementations
 * live in the component files noted above each section.
 *
 * Pure TypeScript -- no DOM required.
 */

import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LANGUAGES,
  getConflictingBehaviors,
  BEHAVIOR_CONFLICTS,
} from '@/src/shared/constants/iiif';

// ==================================================================
// 1. getMetadataInputType
//    Canonical: MetadataFieldsPanel.svelte <script module>
// ==================================================================

function getMetadataInputType(
  key: string,
): 'date' | 'location' | 'language' | 'url' | 'rights' | 'text' {
  const k = key.toLowerCase().trim();
  if (['date', 'created', 'modified', 'issued', 'navdate'].includes(k)) return 'date';
  if (['location', 'gps', 'place', 'coverage', 'coordinates'].includes(k)) return 'location';
  if (['language', 'lang'].includes(k)) return 'language';
  if (
    ['url', 'uri', 'link', 'homepage', 'source', 'identifier'].includes(k) ||
    k.startsWith('http')
  )
    return 'url';
  if (['rights', 'license'].includes(k)) return 'rights';
  return 'text';
}

describe('getMetadataInputType', () => {
  // ----------------------------------------------------------------
  // Date fields
  // ----------------------------------------------------------------
  describe('date detection', () => {
    it('maps "date" to date', () => {
      expect(getMetadataInputType('date')).toBe('date');
    });

    it('is case-insensitive ("Date")', () => {
      expect(getMetadataInputType('Date')).toBe('date');
    });

    it('maps "created" to date', () => {
      expect(getMetadataInputType('created')).toBe('date');
    });

    it('maps "modified" to date', () => {
      expect(getMetadataInputType('modified')).toBe('date');
    });

    it('maps "issued" to date', () => {
      expect(getMetadataInputType('issued')).toBe('date');
    });

    it('maps "navDate" to date (lowercased to navdate)', () => {
      expect(getMetadataInputType('navDate')).toBe('date');
    });

    it('maps "NAVDATE" to date', () => {
      expect(getMetadataInputType('NAVDATE')).toBe('date');
    });
  });

  // ----------------------------------------------------------------
  // Location fields
  // ----------------------------------------------------------------
  describe('location detection', () => {
    it('maps "location" to location', () => {
      expect(getMetadataInputType('location')).toBe('location');
    });

    it('maps "GPS" to location (case-insensitive)', () => {
      expect(getMetadataInputType('GPS')).toBe('location');
    });

    it('maps "place" to location', () => {
      expect(getMetadataInputType('place')).toBe('location');
    });

    it('maps "coverage" to location', () => {
      expect(getMetadataInputType('coverage')).toBe('location');
    });

    it('maps "coordinates" to location', () => {
      expect(getMetadataInputType('coordinates')).toBe('location');
    });
  });

  // ----------------------------------------------------------------
  // Language fields
  // ----------------------------------------------------------------
  describe('language detection', () => {
    it('maps "language" to language', () => {
      expect(getMetadataInputType('language')).toBe('language');
    });

    it('maps "LANG" to language (case-insensitive)', () => {
      expect(getMetadataInputType('LANG')).toBe('language');
    });

    it('maps "lang" to language', () => {
      expect(getMetadataInputType('lang')).toBe('language');
    });
  });

  // ----------------------------------------------------------------
  // URL fields
  // ----------------------------------------------------------------
  describe('url detection', () => {
    it('maps "url" to url', () => {
      expect(getMetadataInputType('url')).toBe('url');
    });

    it('maps "uri" to url', () => {
      expect(getMetadataInputType('uri')).toBe('url');
    });

    it('maps "link" to url', () => {
      expect(getMetadataInputType('link')).toBe('url');
    });

    it('maps "homepage" to url', () => {
      expect(getMetadataInputType('homepage')).toBe('url');
    });

    it('maps "source" to url', () => {
      expect(getMetadataInputType('source')).toBe('url');
    });

    it('maps "identifier" to url', () => {
      expect(getMetadataInputType('identifier')).toBe('url');
    });

    it('maps keys starting with "http" to url', () => {
      expect(getMetadataInputType('http://example.com')).toBe('url');
    });

    it('maps keys starting with "https" to url', () => {
      expect(getMetadataInputType('https://example.org/resource')).toBe('url');
    });
  });

  // ----------------------------------------------------------------
  // Rights fields
  // ----------------------------------------------------------------
  describe('rights detection', () => {
    it('maps "rights" to rights', () => {
      expect(getMetadataInputType('rights')).toBe('rights');
    });

    it('maps "license" to rights', () => {
      expect(getMetadataInputType('license')).toBe('rights');
    });

    it('maps "License" to rights (case-insensitive)', () => {
      expect(getMetadataInputType('License')).toBe('rights');
    });
  });

  // ----------------------------------------------------------------
  // Text fallback
  // ----------------------------------------------------------------
  describe('text fallback', () => {
    it('maps "title" to text', () => {
      expect(getMetadataInputType('title')).toBe('text');
    });

    it('maps "custom field" to text', () => {
      expect(getMetadataInputType('custom field')).toBe('text');
    });

    it('maps empty string to text', () => {
      expect(getMetadataInputType('')).toBe('text');
    });

    it('maps "description" to text', () => {
      expect(getMetadataInputType('description')).toBe('text');
    });

    it('maps "creator" to text', () => {
      expect(getMetadataInputType('creator')).toBe('text');
    });
  });

  // ----------------------------------------------------------------
  // Whitespace trimming
  // ----------------------------------------------------------------
  describe('whitespace handling', () => {
    it('trims leading/trailing whitespace before matching', () => {
      expect(getMetadataInputType('  date  ')).toBe('date');
    });

    it('trims and lowercases together', () => {
      expect(getMetadataInputType('  GPS  ')).toBe('location');
    });
  });
});

// ==================================================================
// 2. formatDate & parseDate
//    Canonical: MetadataTextField.svelte <script module>
// ==================================================================

function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function parseDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toISOString();
  } catch {
    return dateString;
  }
}

describe('formatDate', () => {
  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns the original string for invalid dates', () => {
    expect(formatDate('invalid')).toBe('invalid');
  });

  it('returns the original string for non-parseable input', () => {
    expect(formatDate('not-a-date-at-all')).toBe('not-a-date-at-all');
  });

  it('formats a valid ISO string to human-readable form', () => {
    // Use midday UTC to avoid timezone date-shift issues
    const result = formatDate('2024-01-15T12:00:00Z');
    expect(result).toContain('January');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats a date-only ISO string', () => {
    // "2024-06-30" is parseable by Date constructor
    const result = formatDate('2024-06-30');
    expect(result).toContain('2024');
  });

  it('formats a full ISO date-time', () => {
    const result = formatDate('2023-12-25T12:00:00.000Z');
    expect(result).toContain('December');
    expect(result).toContain('25');
    expect(result).toContain('2023');
  });
});

describe('parseDate', () => {
  it('returns empty string for empty input', () => {
    expect(parseDate('')).toBe('');
  });

  it('returns the original string for invalid dates', () => {
    expect(parseDate('invalid')).toBe('invalid');
  });

  it('returns the original string for non-parseable input', () => {
    expect(parseDate('absolutely-not-a-date')).toBe('absolutely-not-a-date');
  });

  it('parses a human-readable date to ISO string', () => {
    const result = parseDate('January 15, 2024');
    expect(result).toContain('2024-01-15');
    // Should be a full ISO string with T and Z
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('parses an existing ISO string back to ISO', () => {
    const result = parseDate('2024-03-20T10:30:00.000Z');
    expect(result).toContain('2024-03-20');
    expect(result).toMatch(/T\d{2}:\d{2}:\d{2}/);
  });

  it('is the inverse of formatDate for valid dates', () => {
    // Use midday UTC to avoid timezone date-shift issues
    const iso = '2024-01-15T12:00:00.000Z';
    const formatted = formatDate(iso);
    const roundTrip = parseDate(formatted);
    // The round-trip should preserve the date portion
    expect(roundTrip).toContain('2024-01-15');
  });
});

// ==================================================================
// 3. Behavior conflict resolution (resolveConflicts)
//    Canonical logic: BehaviorSelector.svelte toggle() function
// ==================================================================

/**
 * Extracted from BehaviorSelector's toggle() add-path:
 * When adding a behavior, remove any conflicting behaviors first,
 * then append the new one.
 */
function resolveConflicts(
  current: string[],
  adding: string,
  getConflicts: (b: string) => string[],
): string[] {
  let next = [...current];
  const conflicts = getConflicts(adding);
  next = next.filter(b => !conflicts.includes(b));
  next.push(adding);
  return next;
}

describe('resolveConflicts (behavior conflict resolution)', () => {
  describe('using real getConflictingBehaviors', () => {
    it('removes "no-auto-advance" when adding "auto-advance"', () => {
      const result = resolveConflicts(
        ['no-auto-advance', 'repeat'],
        'auto-advance',
        getConflictingBehaviors,
      );
      expect(result).toContain('auto-advance');
      expect(result).not.toContain('no-auto-advance');
      expect(result).toContain('repeat');
    });

    it('removes "auto-advance" when adding "no-auto-advance"', () => {
      const result = resolveConflicts(
        ['auto-advance'],
        'no-auto-advance',
        getConflictingBehaviors,
      );
      expect(result).toContain('no-auto-advance');
      expect(result).not.toContain('auto-advance');
    });

    it('removes "individuals" and "continuous" when adding "paged"', () => {
      const result = resolveConflicts(
        ['individuals', 'continuous', 'auto-advance'],
        'paged',
        getConflictingBehaviors,
      );
      expect(result).toContain('paged');
      expect(result).not.toContain('individuals');
      expect(result).not.toContain('continuous');
      expect(result).toContain('auto-advance');
    });

    it('removes "paged" and "continuous" when adding "individuals"', () => {
      const result = resolveConflicts(
        ['paged', 'continuous'],
        'individuals',
        getConflictingBehaviors,
      );
      expect(result).toContain('individuals');
      expect(result).not.toContain('paged');
      expect(result).not.toContain('continuous');
    });

    it('removes "repeat" when adding "no-repeat"', () => {
      const result = resolveConflicts(
        ['repeat'],
        'no-repeat',
        getConflictingBehaviors,
      );
      expect(result).toEqual(['no-repeat']);
    });

    it('removes "together" when adding "multi-part"', () => {
      const result = resolveConflicts(
        ['together', 'unordered'],
        'multi-part',
        getConflictingBehaviors,
      );
      expect(result).toContain('multi-part');
      expect(result).not.toContain('together');
      expect(result).toContain('unordered');
    });
  });

  describe('no-conflict scenarios', () => {
    it('keeps all existing behaviors when adding one with no conflicts', () => {
      const result = resolveConflicts(
        ['auto-advance', 'repeat'],
        'unordered',
        getConflictingBehaviors,
      );
      expect(result).toEqual(['auto-advance', 'repeat', 'unordered']);
    });

    it('appends to an empty array', () => {
      const result = resolveConflicts([], 'paged', getConflictingBehaviors);
      expect(result).toEqual(['paged']);
    });

    it('handles adding a behavior that is already present (duplicates)', () => {
      // In the real BehaviorSelector, toggle() would remove it instead.
      // resolveConflicts only covers the "add" path.
      const result = resolveConflicts(
        ['paged'],
        'paged',
        getConflictingBehaviors,
      );
      expect(result).toEqual(['paged', 'paged']);
    });
  });

  describe('with custom conflict function', () => {
    it('uses the provided getConflicts callback', () => {
      const customConflicts = (b: string) => (b === 'A' ? ['B', 'C'] : []);
      const result = resolveConflicts(['B', 'C', 'D'], 'A', customConflicts);
      expect(result).toEqual(['D', 'A']);
    });

    it('handles a getConflicts that returns empty array', () => {
      const noConflicts = () => [] as string[];
      const result = resolveConflicts(['X', 'Y'], 'Z', noConflicts);
      expect(result).toEqual(['X', 'Y', 'Z']);
    });
  });
});

// ==================================================================
// 4. getConflictingBehaviors (from shared/constants/iiif)
// ==================================================================

describe('getConflictingBehaviors', () => {
  it('returns ["no-auto-advance"] for "auto-advance"', () => {
    expect(getConflictingBehaviors('auto-advance')).toContain('no-auto-advance');
  });

  it('returns ["auto-advance"] for "no-auto-advance"', () => {
    expect(getConflictingBehaviors('no-auto-advance')).toContain('auto-advance');
  });

  it('returns conflicts for "individuals" (continuous and paged)', () => {
    const conflicts = getConflictingBehaviors('individuals');
    expect(conflicts).toContain('continuous');
    expect(conflicts).toContain('paged');
  });

  it('returns conflicts for "paged" (individuals and continuous)', () => {
    const conflicts = getConflictingBehaviors('paged');
    expect(conflicts).toContain('individuals');
    expect(conflicts).toContain('continuous');
  });

  it('returns empty array for a behavior with no conflicts', () => {
    expect(getConflictingBehaviors('unordered')).toEqual([]);
  });

  it('returns empty array for unknown behavior', () => {
    expect(getConflictingBehaviors('nonexistent-behavior')).toEqual([]);
  });

  it('covers all pairs defined in BEHAVIOR_CONFLICTS', () => {
    for (const [a, b] of BEHAVIOR_CONFLICTS) {
      expect(getConflictingBehaviors(a)).toContain(b);
      expect(getConflictingBehaviors(b)).toContain(a);
    }
  });
});

// ==================================================================
// 5. LANGUAGE_SELECT_OPTIONS generation
//    Canonical: MetadataFieldsPanel.svelte <script module>
// ==================================================================

const LANGUAGE_SELECT_OPTIONS = SUPPORTED_LANGUAGES.map(l => ({
  value: l.code,
  label: l.nativeName ? `${l.label} (${l.nativeName})` : l.label,
}));

describe('LANGUAGE_SELECT_OPTIONS', () => {
  it('produces options for all 11 supported languages', () => {
    expect(LANGUAGE_SELECT_OPTIONS).toHaveLength(11);
  });

  it('each option has a value and label', () => {
    for (const opt of LANGUAGE_SELECT_OPTIONS) {
      expect(opt).toHaveProperty('value');
      expect(opt).toHaveProperty('label');
      expect(typeof opt.value).toBe('string');
      expect(typeof opt.label).toBe('string');
      expect(opt.value.length).toBeGreaterThan(0);
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });

  it('English entry has label "English (English)"', () => {
    const en = LANGUAGE_SELECT_OPTIONS.find(o => o.value === 'en');
    expect(en).toBeDefined();
    expect(en!.label).toBe('English (English)');
  });

  it('German entry has label "German (Deutsch)"', () => {
    const de = LANGUAGE_SELECT_OPTIONS.find(o => o.value === 'de');
    expect(de).toBeDefined();
    expect(de!.label).toBe('German (Deutsch)');
  });

  it('Japanese entry has label "Japanese (日本語)"', () => {
    const ja = LANGUAGE_SELECT_OPTIONS.find(o => o.value === 'ja');
    expect(ja).toBeDefined();
    expect(ja!.label).toBe('Japanese (日本語)');
  });

  it('Language-neutral entry has label "Language-neutral" (no parenthesized nativeName)', () => {
    const none = LANGUAGE_SELECT_OPTIONS.find(o => o.value === 'none');
    expect(none).toBeDefined();
    expect(none!.label).toBe('Language-neutral');
    // Should NOT contain parentheses
    expect(none!.label).not.toContain('(');
  });

  it('all codes from SUPPORTED_LANGUAGES are present', () => {
    const codes = LANGUAGE_SELECT_OPTIONS.map(o => o.value);
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(codes).toContain(lang.code);
    }
  });

  it('all entries with nativeName include it in parentheses', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const opt = LANGUAGE_SELECT_OPTIONS.find(o => o.value === lang.code)!;
      if (lang.nativeName) {
        expect(opt.label).toBe(`${lang.label} (${lang.nativeName})`);
      } else {
        expect(opt.label).toBe(lang.label);
        expect(opt.label).not.toContain('(');
      }
    }
  });
});
