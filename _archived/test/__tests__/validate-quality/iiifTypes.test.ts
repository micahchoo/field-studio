/**
 * Unit Tests for utils/iiifTypes.ts
 * 
 * Tests IIIF type validation, MIME type handling, and value type utilities.
 */

import { describe, expect, it } from 'vitest';
import {
  // MIME Types - REMOVED (Redundant with mediaTypes.test.ts)

  // LanguageMap
  isValidLanguageMap,
  createLanguageMap,
  getLanguageValue,
  
  // MetadataEntry
  isValidMetadataEntry,
  createMetadataEntry,
  
  // Agent
  isValidAgent,
  
  // Reference
  isValidReference,
  
  // ExternalResource
  isValidExternalResource,

  // ContentResource
  isValidContentResource,

  // URI Validation - REMOVED (Redundant with iiifValidation.test.ts)

  // DateTime
  isValidNavDate,
  formatNavDate,
  
  // Rights
  isKnownRightsUri,
  isValidRightsUri,

  // Dimensions - REMOVED (Redundant with validator.test.ts)

  // Service Types
  isKnownServiceType,

  // Motivations
  isValidMotivation,
  isPaintingMotivation,

  // UUID - REMOVED (Tests library)
} from '@/utils/iiifTypes';

// ============================================================================
// MIME Type Tests - REMOVED (Redundant with mediaTypes.test.ts)
// ============================================================================
// All MIME type function tests have been consolidated in mediaTypes.test.ts
// to eliminate duplication and improve maintainability.

// ============================================================================
// LanguageMap Tests
// ============================================================================

describe('LanguageMap Functions', () => {
  describe('isValidLanguageMap', () => {
    it('should validate correct LanguageMap structure', () => {
      expect(isValidLanguageMap({ en: ['Hello'] })).toBe(true);
      expect(isValidLanguageMap({ en: ['Hello', 'World'] })).toBe(true);
      expect(isValidLanguageMap({ en: [''], fr: ['Bonjour'] })).toBe(true);
    });

    it('should reject invalid LanguageMap structures', () => {
      expect(isValidLanguageMap(null)).toBe(false);
      expect(isValidLanguageMap(undefined)).toBe(false);
      expect(isValidLanguageMap('string')).toBe(false);
      expect(isValidLanguageMap({ en: 'not an array' })).toBe(false);
      expect(isValidLanguageMap({ en: [123] })).toBe(false);
    });
  });

  describe('createLanguageMap', () => {
    it('should create a LanguageMap with default language', () => {
      const result = createLanguageMap('Hello');
      expect(result).toEqual({ none: ['Hello'] });
    });

    it('should create a LanguageMap with specified language', () => {
      const result = createLanguageMap('Hello', 'en');
      expect(result).toEqual({ en: ['Hello'] });
    });
  });

  describe('getLanguageValue', () => {
    it('should return value in preferred language', () => {
      const map = { en: ['Hello'], fr: ['Bonjour'] };
      expect(getLanguageValue(map, 'en')).toBe('Hello');
      expect(getLanguageValue(map, 'fr')).toBe('Bonjour');
    });

    it('should fallback to English', () => {
      const map = { en: ['Hello'], de: ['Hallo'] };
      expect(getLanguageValue(map, 'fr')).toBe('Hello');
    });

    it('should fallback to none/@none', () => {
      const map = { none: ['Greetings'] };
      expect(getLanguageValue(map, 'en')).toBe('Greetings');
    });

    it('should return empty string for empty map', () => {
      expect(getLanguageValue({})).toBe('');
      expect(getLanguageValue(undefined)).toBe('');
    });

    it('should return first available value as last resort', () => {
      const map = { de: ['Hallo'] };
      expect(getLanguageValue(map, 'en')).toBe('Hallo');
    });
  });
});

// ============================================================================
// MetadataEntry Tests
// ============================================================================

describe('MetadataEntry Functions', () => {
  describe('isValidMetadataEntry', () => {
    it('should validate correct MetadataEntry structure', () => {
      const entry = {
        label: { en: ['Title'] },
        value: { en: ['The Value'] }
      };
      expect(isValidMetadataEntry(entry)).toBe(true);
    });

    it('should reject invalid MetadataEntry structures', () => {
      expect(isValidMetadataEntry(null)).toBe(false);
      expect(isValidMetadataEntry({ label: { en: ['Title'] } })).toBe(false);
      expect(isValidMetadataEntry({ value: { en: ['Value'] } })).toBe(false);
    });
  });

  describe('createMetadataEntry', () => {
    it('should create a MetadataEntry with default language', () => {
      const result = createMetadataEntry('Title', 'The Value');
      expect(result).toEqual({
        label: { none: ['Title'] },
        value: { none: ['The Value'] }
      });
    });

    it('should create a MetadataEntry with specified language', () => {
      const result = createMetadataEntry('Title', 'The Value', 'en');
      expect(result).toEqual({
        label: { en: ['Title'] },
        value: { en: ['The Value'] }
      });
    });
  });
});

// ============================================================================
// Agent Tests
// ============================================================================

describe('Agent Functions', () => {
  describe('isValidAgent', () => {
    it('should validate correct Agent structure', () => {
      const agent = {
        id: 'https://example.com/agent/1',
        type: 'Agent',
        label: { en: ['John Doe'] }
      };
      expect(isValidAgent(agent)).toBe(true);
    });

    it('should reject invalid Agent structures', () => {
      expect(isValidAgent(null)).toBe(false);
      expect(isValidAgent({})).toBe(false);
      expect(isValidAgent({ id: 'https://example.com', type: 'Person' })).toBe(false);
      expect(isValidAgent({ id: 'https://example.com', type: 'Agent' })).toBe(false);
    });
  });
});

// ============================================================================
// Reference Tests
// ============================================================================

describe('Reference Functions', () => {
  describe('isValidReference', () => {
    it('should validate correct Reference structure', () => {
      const ref = {
        id: 'https://example.com/resource',
        type: 'Manifest'
      };
      expect(isValidReference(ref)).toBe(true);
    });

    it('should validate Reference with optional label', () => {
      const ref = {
        id: 'https://example.com/resource',
        type: 'Manifest',
        label: { en: ['My Manifest'] }
      };
      expect(isValidReference(ref)).toBe(true);
    });

    it('should reject invalid Reference structures', () => {
      expect(isValidReference(null)).toBe(false);
      expect(isValidReference({ id: 'https://example.com' })).toBe(false);
      expect(isValidReference({ type: 'Manifest' })).toBe(false);
    });
  });
});

// ============================================================================
// ExternalResource Tests
// ============================================================================

describe('ExternalResource Functions', () => {
  describe('isValidExternalResource', () => {
    it('should validate correct ExternalResource structure', () => {
      const resource = {
        id: 'https://example.com/resource',
        type: 'Text'
      };
      expect(isValidExternalResource(resource)).toBe(true);
    });

    it('should validate with optional properties', () => {
      const resource = {
        id: 'https://example.com/resource',
        type: 'Text',
        format: 'text/html',
        profile: 'https://example.com/profile',
        language: ['en']
      };
      expect(isValidExternalResource(resource)).toBe(true);
    });

    it('should reject invalid language array', () => {
      const resource = {
        id: 'https://example.com/resource',
        type: 'Text',
        language: ['en', 123]
      };
      expect(isValidExternalResource(resource)).toBe(false);
    });
  });
});

// ============================================================================
// ContentResource Tests
// ============================================================================

describe('ContentResource Functions', () => {
  describe('isValidContentResource', () => {
    it('should validate correct ContentResource structure', () => {
      const resource = {
        id: 'https://example.com/image.jpg',
        type: 'Image'
      };
      expect(isValidContentResource(resource)).toBe(true);
    });

    it('should validate with dimensions', () => {
      const resource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        width: 1920,
        height: 1080
      };
      expect(isValidContentResource(resource)).toBe(true);
    });

    it('should validate with duration for video', () => {
      const resource = {
        id: 'https://example.com/video.mp4',
        type: 'Video',
        duration: 120.5
      };
      expect(isValidContentResource(resource)).toBe(true);
    });

    it('should reject invalid dimensions', () => {
      const resource = {
        id: 'https://example.com/image.jpg',
        type: 'Image',
        width: -100
      };
      expect(isValidContentResource(resource)).toBe(false);
    });

    it('should reject invalid type', () => {
      const resource = {
        id: 'https://example.com/image.jpg',
        type: 'Picture'
      };
      expect(isValidContentResource(resource)).toBe(false);
    });
  });
});

// ============================================================================
// URI Validation Tests - REMOVED (Redundant with iiifValidation.test.ts)
// ============================================================================
// All URI validation tests (isValidHttpUri, hasFragmentIdentifier, isValidId)
// have been consolidated in iiifValidation.test.ts to eliminate duplication.

// ============================================================================
// DateTime Tests
// ============================================================================

describe('DateTime Functions', () => {
  describe('isValidNavDate', () => {
    it('should validate correct ISO 8601 dates', () => {
      expect(isValidNavDate('2024-01-15T10:30:00Z')).toBe(true);
      expect(isValidNavDate('2024-01-15T10:30:00+05:00')).toBe(true);
      expect(isValidNavDate('2024-01-15T10:30:00-08:00')).toBe(true);
    });

    it('should reject invalid date formats', () => {
      expect(isValidNavDate('2024-01-15')).toBe(false);
      expect(isValidNavDate('2024/01/15 10:30:00')).toBe(false);
      expect(isValidNavDate('invalid')).toBe(false);
      expect(isValidNavDate('')).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(isValidNavDate('2024-13-15T10:30:00Z')).toBe(false);
      expect(isValidNavDate('2024-01-32T10:30:00Z')).toBe(false);
    });
  });

  describe('formatNavDate', () => {
    it('should format dates to IIIF navDate format', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatNavDate(date)).toBe('2024-01-15T10:30:00Z');
    });
  });
});

// ============================================================================
// Rights Tests
// ============================================================================

describe('Rights Functions', () => {
  describe('isKnownRightsUri', () => {
    it('should recognize Creative Commons URIs', () => {
      expect(isKnownRightsUri('https://creativecommons.org/licenses/by/4.0/')).toBe(true);
      expect(isKnownRightsUri('http://creativecommons.org/licenses/by-nc/4.0/')).toBe(true);
    });

    it('should recognize RightsStatements.org URIs', () => {
      expect(isKnownRightsUri('https://rightsstatements.org/vocab/InC/1.0/')).toBe(true);
      expect(isKnownRightsUri('http://rightsstatements.org/vocab/NoC-CR/1.0/')).toBe(true);
    });

    it('should reject unknown rights URIs', () => {
      expect(isKnownRightsUri('https://example.com/custom-license')).toBe(false);
    });
  });

  describe('isValidRightsUri', () => {
    it('should validate HTTP URIs', () => {
      expect(isValidRightsUri('https://creativecommons.org/licenses/by/4.0/')).toEqual({
        valid: true
      });
    });

    it('should add warning for unknown rights URIs', () => {
      expect(isValidRightsUri('https://example.com/custom-license')).toEqual({
        valid: true,
        warning: 'Rights URI is not from Creative Commons or RightsStatements.org'
      });
    });

    it('should reject non-HTTP URIs', () => {
      expect(isValidRightsUri('urn:uuid:123')).toEqual({ valid: false });
    });
  });
});

// ============================================================================
// Dimension Tests - REMOVED (Redundant with validator.test.ts)
// ============================================================================
// Dimension validation is tested comprehensively in validator.test.ts

// ============================================================================
// Service Type Tests
// ============================================================================

describe('Service Type Functions', () => {
  describe('isKnownServiceType', () => {
    it('should recognize legacy service types', () => {
      expect(isKnownServiceType('ImageService1')).toBe(true);
      expect(isKnownServiceType('ImageService2')).toBe(true);
      expect(isKnownServiceType('ImageService3')).toBe(true);
      expect(isKnownServiceType('SearchService1')).toBe(true);
    });

    it('should reject unknown service types', () => {
      expect(isKnownServiceType('CustomService')).toBe(false);
      expect(isKnownServiceType('UnknownService')).toBe(false);
    });
  });
});

// ============================================================================
// Motivation Tests
// ============================================================================

describe('Motivation Functions', () => {
  describe('isValidMotivation', () => {
    it('should validate standard IIIF motivations', () => {
      expect(isValidMotivation('painting')).toBe(true);
      expect(isValidMotivation('commenting')).toBe(true);
      expect(isValidMotivation('tagging')).toBe(true);
      expect(isValidMotivation('supplementing')).toBe(true);
    });

    it('should reject invalid motivations', () => {
      expect(isValidMotivation('invalid')).toBe(false);
      expect(isValidMotivation('')).toBe(false);
    });
  });

  describe('isPaintingMotivation', () => {
    it('should identify painting motivation', () => {
      expect(isPaintingMotivation('painting')).toBe(true);
      expect(isPaintingMotivation('commenting')).toBe(false);
    });

    it('should handle array of motivations', () => {
      expect(isPaintingMotivation(['painting', 'commenting'])).toBe(true);
      expect(isPaintingMotivation(['tagging', 'commenting'])).toBe(false);
    });
  });
});

// ============================================================================
// UUID Tests - REMOVED (Tests library, not our code)
// ============================================================================
// UUID generation is provided by crypto.randomUUID() or similar library.
// Testing UUID format/uniqueness adds no value - it tests the library, not our logic.
