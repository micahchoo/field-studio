/**
 * Unit Tests for utils/iiifTypes.ts
 * 
 * Tests IIIF type validation, MIME type handling, and value type utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  // MIME Types
  getMimeType,
  getExtensionForMime,
  getContentTypeFromMime,
  getContentTypeFromFilename,
  isImageMime,
  isVideoMime,
  isAudioMime,
  isTimeBasedMime,
  isVisualMime,
  
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
  
  // URI Validation
  isValidHttpUri,
  hasFragmentIdentifier,
  isValidId,
  
  // DateTime
  isValidNavDate,
  formatNavDate,
  
  // Rights
  isKnownRightsUri,
  isValidRightsUri,
  
  // Dimensions
  isValidDimension,
  isValidDuration,
  
  // Service Types
  isKnownServiceType,
  
  // Motivations
  isValidMotivation,
  isPaintingMotivation,
  
  // UUID
  generateUUID,
} from '../../../utils/iiifTypes';

// ============================================================================
// MIME Type Tests
// ============================================================================

describe('MIME Type Functions', () => {
  describe('getMimeType', () => {
    it('should return correct MIME type for image files', () => {
      expect(getMimeType('image.jpg')).toBe('image/jpeg');
      expect(getMimeType('image.jpeg')).toBe('image/jpeg');
      expect(getMimeType('image.png')).toBe('image/png');
      expect(getMimeType('image.webp')).toBe('image/webp');
    });

    it('should return correct MIME type for video files', () => {
      expect(getMimeType('video.mp4')).toBe('video/mp4');
      expect(getMimeType('video.webm')).toBe('video/webm');
    });

    it('should return correct MIME type for audio files', () => {
      expect(getMimeType('audio.mp3')).toBe('audio/mpeg');
      expect(getMimeType('audio.wav')).toBe('audio/wav');
    });

    it('should return null for unknown extensions', () => {
      expect(getMimeType('file.xyz')).toBeNull();
      expect(getMimeType('file')).toBeNull();
    });

    it('should be case insensitive', () => {
      expect(getMimeType('IMAGE.JPG')).toBe('image/jpeg');
      expect(getMimeType('Image.Jpeg')).toBe('image/jpeg');
    });
  });

  describe('getExtensionForMime', () => {
    it('should return correct extension for MIME types', () => {
      expect(getExtensionForMime('image/jpeg')).toBe('.jpg');
      expect(getExtensionForMime('image/png')).toBe('.png');
      expect(getExtensionForMime('video/mp4')).toBe('.mp4');
    });

    it('should return null for unknown MIME types', () => {
      expect(getExtensionForMime('application/unknown')).toBeNull();
    });
  });

  describe('getContentTypeFromMime', () => {
    it('should return correct content type for images', () => {
      expect(getContentTypeFromMime('image/jpeg')).toBe('Image');
      expect(getContentTypeFromMime('image/png')).toBe('Image');
    });

    it('should return correct content type for videos', () => {
      expect(getContentTypeFromMime('video/mp4')).toBe('Video');
    });

    it('should return correct content type for audio', () => {
      expect(getContentTypeFromMime('audio/mpeg')).toBe('Sound');
    });

    it('should return Text for PDF', () => {
      expect(getContentTypeFromMime('application/pdf')).toBe('Text');
    });

    it('should return Dataset for JSON/XML', () => {
      expect(getContentTypeFromMime('application/json')).toBe('Dataset');
      expect(getContentTypeFromMime('application/xml')).toBe('Dataset');
      expect(getContentTypeFromMime('application/ld+json')).toBe('Dataset');
    });
  });

  describe('MIME type checkers', () => {
    it('isImageMime should identify image MIME types', () => {
      expect(isImageMime('image/jpeg')).toBe(true);
      expect(isImageMime('image/png')).toBe(true);
      expect(isImageMime('video/mp4')).toBe(false);
    });

    it('isVideoMime should identify video MIME types', () => {
      expect(isVideoMime('video/mp4')).toBe(true);
      expect(isVideoMime('image/jpeg')).toBe(false);
    });

    it('isAudioMime should identify audio MIME types', () => {
      expect(isAudioMime('audio/mpeg')).toBe(true);
      expect(isAudioMime('image/jpeg')).toBe(false);
    });

    it('isTimeBasedMime should identify video and audio', () => {
      expect(isTimeBasedMime('video/mp4')).toBe(true);
      expect(isTimeBasedMime('audio/mpeg')).toBe(true);
      expect(isTimeBasedMime('image/jpeg')).toBe(false);
    });

    it('isVisualMime should identify image and video', () => {
      expect(isVisualMime('image/jpeg')).toBe(true);
      expect(isVisualMime('video/mp4')).toBe(true);
      expect(isVisualMime('audio/mpeg')).toBe(false);
    });
  });
});

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
// URI Validation Tests
// ============================================================================

describe('URI Validation Functions', () => {
  describe('isValidHttpUri', () => {
    it('should validate HTTP and HTTPS URIs', () => {
      expect(isValidHttpUri('https://example.com')).toBe(true);
      expect(isValidHttpUri('http://example.com')).toBe(true);
      expect(isValidHttpUri('https://example.com/path/to/resource')).toBe(true);
    });

    it('should reject invalid URIs', () => {
      expect(isValidHttpUri('ftp://example.com')).toBe(false);
      expect(isValidHttpUri('/path/to/resource')).toBe(false);
      expect(isValidHttpUri('example.com')).toBe(false);
      expect(isValidHttpUri('')).toBe(false);
      expect(isValidHttpUri(null as any)).toBe(false);
    });
  });

  describe('hasFragmentIdentifier', () => {
    it('should detect fragment identifiers', () => {
      expect(hasFragmentIdentifier('https://example.com#section')).toBe(true);
      expect(hasFragmentIdentifier('https://example.com/resource#id')).toBe(true);
    });

    it('should return false for URIs without fragments', () => {
      expect(hasFragmentIdentifier('https://example.com')).toBe(false);
      expect(hasFragmentIdentifier('https://example.com/resource')).toBe(false);
    });
  });

  describe('isValidId', () => {
    it('should validate correct IDs', () => {
      expect(isValidId('https://example.com/resource', 'Manifest')).toEqual({ valid: true });
    });

    it('should reject missing IDs', () => {
      expect(isValidId('', 'Manifest')).toEqual({
        valid: false,
        error: 'ID is required'
      });
    });

    it('should reject non-HTTP URIs', () => {
      expect(isValidId('urn:uuid:123', 'Manifest')).toEqual({
        valid: false,
        error: 'ID must be a valid HTTP(S) URI'
      });
    });

    it('should reject fragment identifiers for Canvas', () => {
      expect(isValidId('https://example.com/canvas#1', 'Canvas')).toEqual({
        valid: false,
        error: 'Canvas ID must not contain a fragment identifier'
      });
    });

    it('should allow fragment identifiers for non-Canvas resources', () => {
      expect(isValidId('https://example.com/resource#section', 'Annotation')).toEqual({ valid: true });
    });
  });
});

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
// Dimension Tests
// ============================================================================

describe('Dimension Functions', () => {
  describe('isValidDimension', () => {
    it('should validate positive integers', () => {
      expect(isValidDimension(100)).toBe(true);
      expect(isValidDimension(1)).toBe(true);
      expect(isValidDimension(1920)).toBe(true);
    });

    it('should reject invalid dimensions', () => {
      expect(isValidDimension(0)).toBe(false);
      expect(isValidDimension(-100)).toBe(false);
      expect(isValidDimension(100.5)).toBe(false);
      expect(isValidDimension('100')).toBe(false);
    });
  });

  describe('isValidDuration', () => {
    it('should validate positive numbers', () => {
      expect(isValidDuration(120)).toBe(true);
      expect(isValidDuration(0.5)).toBe(true);
      expect(isValidDuration(120.456)).toBe(true);
    });

    it('should reject invalid durations', () => {
      expect(isValidDuration(0)).toBe(false);
      expect(isValidDuration(-10)).toBe(false);
      expect(isValidDuration('120')).toBe(false);
    });
  });
});

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
// UUID Tests
// ============================================================================

describe('UUID Functions', () => {
  describe('generateUUID', () => {
    it('should generate a valid UUID format', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});
