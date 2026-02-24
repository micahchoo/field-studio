import { describe, it, expect } from 'vitest';
import {
  RIGHTS_OPTIONS,
  DUBLIN_CORE_MAP,
  METADATA_FIELD_DEFINITIONS,
  getVisibleFields,
} from '@/src/shared/constants/metadata';
import type { MetadataComplexity } from '@/src/shared/constants/metadata';

// ============================================================================
// RIGHTS_OPTIONS
// ============================================================================

describe('RIGHTS_OPTIONS', () => {
  it('has exactly 6 entries', () => {
    expect(RIGHTS_OPTIONS).toHaveLength(6);
  });

  it('each option has a label and value', () => {
    for (const opt of RIGHTS_OPTIONS) {
      expect(opt).toHaveProperty('label');
      expect(opt).toHaveProperty('value');
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
      expect(typeof opt.value).toBe('string');
      expect(opt.value.length).toBeGreaterThan(0);
    }
  });

  it('each value is a valid URL', () => {
    for (const opt of RIGHTS_OPTIONS) {
      expect(() => new URL(opt.value)).not.toThrow();
    }
  });

  it('Creative Commons URLs start with https://creativecommons.org/', () => {
    const ccOptions = RIGHTS_OPTIONS.filter(opt => opt.label.includes('CC'));
    expect(ccOptions.length).toBeGreaterThan(0);
    for (const opt of ccOptions) {
      expect(opt.value).toMatch(/^https:\/\/creativecommons\.org\//);
    }
  });

  it('Rights Statements URLs start with http://rightsstatements.org/', () => {
    const rsOptions = RIGHTS_OPTIONS.filter(opt =>
      opt.value.includes('rightsstatements.org')
    );
    expect(rsOptions.length).toBeGreaterThan(0);
    for (const opt of rsOptions) {
      expect(opt.value).toMatch(/^http:\/\/rightsstatements\.org\//);
    }
  });

  it('has 3 Creative Commons options and 3 Rights Statements options', () => {
    const ccOptions = RIGHTS_OPTIONS.filter(opt =>
      opt.value.includes('creativecommons.org')
    );
    const rsOptions = RIGHTS_OPTIONS.filter(opt =>
      opt.value.includes('rightsstatements.org')
    );
    expect(ccOptions).toHaveLength(3);
    expect(rsOptions).toHaveLength(3);
  });

  it('includes CC0 (public domain)', () => {
    const cc0 = RIGHTS_OPTIONS.find(opt =>
      opt.value.includes('publicdomain/zero')
    );
    expect(cc0).toBeDefined();
    expect(cc0!.label).toContain('CC0');
  });

  it('includes In Copyright', () => {
    const inC = RIGHTS_OPTIONS.find(opt =>
      opt.value.includes('InC')
    );
    expect(inC).toBeDefined();
    expect(inC!.label).toBe('In Copyright');
  });
});

// ============================================================================
// DUBLIN_CORE_MAP
// ============================================================================

describe('DUBLIN_CORE_MAP', () => {
  it('has exactly 17 entries', () => {
    expect(Object.keys(DUBLIN_CORE_MAP)).toHaveLength(17);
  });

  it('maps title to dc:title', () => {
    expect(DUBLIN_CORE_MAP['title']).toBe('dc:title');
  });

  it('maps creator to dc:creator', () => {
    expect(DUBLIN_CORE_MAP['creator']).toBe('dc:creator');
  });

  it('maps subject to dc:subject', () => {
    expect(DUBLIN_CORE_MAP['subject']).toBe('dc:subject');
  });

  it('maps description to dc:description', () => {
    expect(DUBLIN_CORE_MAP['description']).toBe('dc:description');
  });

  it('all values are prefixed with dc:', () => {
    for (const [, dcTerm] of Object.entries(DUBLIN_CORE_MAP)) {
      expect(dcTerm).toMatch(/^dc:/);
    }
  });

  it('includes the 15 standard Dublin Core elements', () => {
    const standardElements = [
      'title', 'creator', 'subject', 'description', 'publisher',
      'contributor', 'date', 'type', 'format', 'identifier',
      'source', 'language', 'relation', 'coverage', 'rights',
    ];
    for (const el of standardElements) {
      expect(DUBLIN_CORE_MAP).toHaveProperty(el);
    }
  });

  it('maps location and gps as aliases for dc:coverage', () => {
    expect(DUBLIN_CORE_MAP['location']).toBe('dc:coverage');
    expect(DUBLIN_CORE_MAP['gps']).toBe('dc:coverage');
  });

  it('all keys are lowercase', () => {
    for (const key of Object.keys(DUBLIN_CORE_MAP)) {
      expect(key).toBe(key.toLowerCase());
    }
  });
});

// ============================================================================
// METADATA_FIELD_DEFINITIONS
// ============================================================================

describe('METADATA_FIELD_DEFINITIONS', () => {
  it('has exactly 16 entries', () => {
    expect(METADATA_FIELD_DEFINITIONS).toHaveLength(16);
  });

  it('each definition has key, label, description, minLevel, and category', () => {
    for (const def of METADATA_FIELD_DEFINITIONS) {
      expect(def).toHaveProperty('key');
      expect(def).toHaveProperty('label');
      expect(def).toHaveProperty('description');
      expect(def).toHaveProperty('minLevel');
      expect(def).toHaveProperty('category');
      expect(typeof def.key).toBe('string');
      expect(def.key.length).toBeGreaterThan(0);
      expect(typeof def.label).toBe('string');
      expect(def.label.length).toBeGreaterThan(0);
      expect(typeof def.description).toBe('string');
      expect(def.description.length).toBeGreaterThan(0);
    }
  });

  it('minLevel is one of simple, standard, or advanced', () => {
    const validLevels: MetadataComplexity[] = ['simple', 'standard', 'advanced'];
    for (const def of METADATA_FIELD_DEFINITIONS) {
      expect(validLevels).toContain(def.minLevel);
    }
  });

  it('category is one of core, descriptive, technical, or structural', () => {
    const validCategories = ['core', 'descriptive', 'technical', 'structural'];
    for (const def of METADATA_FIELD_DEFINITIONS) {
      expect(validCategories).toContain(def.category);
    }
  });

  it('label, summary, and thumbnail are at the simple level', () => {
    const simpleKeys = ['label', 'summary', 'thumbnail'];
    for (const key of simpleKeys) {
      const def = METADATA_FIELD_DEFINITIONS.find(d => d.key === key);
      expect(def).toBeDefined();
      expect(def!.minLevel).toBe('simple');
    }
  });

  it('behavior and viewingDirection are at the advanced level', () => {
    const advancedKeys = ['behavior', 'viewingDirection'];
    for (const key of advancedKeys) {
      const def = METADATA_FIELD_DEFINITIONS.find(d => d.key === key);
      expect(def).toBeDefined();
      expect(def!.minLevel).toBe('advanced');
    }
  });

  it('rights and requiredStatement are at the standard level', () => {
    const standardKeys = ['rights', 'requiredStatement'];
    for (const key of standardKeys) {
      const def = METADATA_FIELD_DEFINITIONS.find(d => d.key === key);
      expect(def).toBeDefined();
      expect(def!.minLevel).toBe('standard');
    }
  });

  it('has unique keys', () => {
    const keys = METADATA_FIELD_DEFINITIONS.map(d => d.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('core category fields are all simple level', () => {
    const coreFields = METADATA_FIELD_DEFINITIONS.filter(d => d.category === 'core');
    for (const def of coreFields) {
      expect(def.minLevel).toBe('simple');
    }
  });
});

// ============================================================================
// getVisibleFields
// ============================================================================

describe('getVisibleFields', () => {
  it('returns only simple fields for "simple" level', () => {
    const fields = getVisibleFields('simple');
    expect(fields).toHaveLength(3);
    for (const f of fields) {
      expect(f.minLevel).toBe('simple');
    }
  });

  it('simple fields are label, summary, thumbnail', () => {
    const fields = getVisibleFields('simple');
    const keys = fields.map(f => f.key);
    expect(keys).toEqual(['label', 'summary', 'thumbnail']);
  });

  it('returns simple + standard fields for "standard" level', () => {
    const fields = getVisibleFields('standard');
    const simpleCount = METADATA_FIELD_DEFINITIONS.filter(d => d.minLevel === 'simple').length;
    const standardCount = METADATA_FIELD_DEFINITIONS.filter(d => d.minLevel === 'standard').length;
    expect(fields).toHaveLength(simpleCount + standardCount);
  });

  it('standard level includes rights and requiredStatement', () => {
    const fields = getVisibleFields('standard');
    const keys = fields.map(f => f.key);
    expect(keys).toContain('rights');
    expect(keys).toContain('requiredStatement');
  });

  it('standard level does NOT include advanced fields', () => {
    const fields = getVisibleFields('standard');
    const advancedFields = fields.filter(f => f.minLevel === 'advanced');
    expect(advancedFields).toHaveLength(0);
  });

  it('returns all 16 fields for "advanced" level', () => {
    const fields = getVisibleFields('advanced');
    expect(fields).toHaveLength(16);
  });

  it('advanced level includes behavior and viewingDirection', () => {
    const fields = getVisibleFields('advanced');
    const keys = fields.map(f => f.key);
    expect(keys).toContain('behavior');
    expect(keys).toContain('viewingDirection');
  });

  it('advanced level includes structural fields', () => {
    const fields = getVisibleFields('advanced');
    const structuralFields = fields.filter(f => f.category === 'structural');
    expect(structuralFields.length).toBeGreaterThan(0);
    const keys = structuralFields.map(f => f.key);
    expect(keys).toContain('partOf');
    expect(keys).toContain('start');
    expect(keys).toContain('structures');
  });

  it('fields are returned in the same order as METADATA_FIELD_DEFINITIONS', () => {
    const allFields = getVisibleFields('advanced');
    for (let i = 0; i < allFields.length; i++) {
      expect(allFields[i].key).toBe(METADATA_FIELD_DEFINITIONS[i].key);
    }
  });

  it('each progressive level returns a superset of the previous level', () => {
    const simpleFields = getVisibleFields('simple');
    const standardFields = getVisibleFields('standard');
    const advancedFields = getVisibleFields('advanced');

    // standard is a superset of simple
    const simpleKeys = simpleFields.map(f => f.key);
    const standardKeys = standardFields.map(f => f.key);
    const advancedKeys = advancedFields.map(f => f.key);

    for (const key of simpleKeys) {
      expect(standardKeys).toContain(key);
    }
    for (const key of standardKeys) {
      expect(advancedKeys).toContain(key);
    }
  });

  it('simple count < standard count < advanced count', () => {
    const simpleFields = getVisibleFields('simple');
    const standardFields = getVisibleFields('standard');
    const advancedFields = getVisibleFields('advanced');

    expect(simpleFields.length).toBeLessThan(standardFields.length);
    expect(standardFields.length).toBeLessThan(advancedFields.length);
  });
});
