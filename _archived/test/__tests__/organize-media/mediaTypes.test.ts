/**
 * Unit Tests for utils/mediaTypes.ts
 * 
 * Tests MIME type mapping, file extension detection, and content type classification.
 */

import { describe, expect, it } from 'vitest';
import {
  AUDIO_EXTENSIONS,
  detectMediaType,
  getContentTypeFromMime,
  getExtension,
  getFilenameFromUrl,
  getMimeType,
  getMimeTypeString,
  IMAGE_EXTENSIONS,
  isAudioFile,
  isAudioMimeType,
  isAudioUrl,
  isImageFile,
  isImageMimeType,
  isImageUrl,
  isMediaFile,
  isMediaUrl,
  isModelFile,
  isPdfFile,
  isTextFile,
  isTimeBasedMimeType,
  isVideoFile,
  isVideoMimeType,
  isVideoUrl,
  isVisualMimeType,
  MIME_TYPE_MAP,
  MODEL_EXTENSIONS,
  removeExtension,
  TEXT_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from '@/utils/mediaTypes';

// ============================================================================
// Extension Arrays Tests - REMOVED (Tautological)
// ============================================================================
// These tests verified constant definitions, not behavior.
// Behavioral tests (e.g., isImageFile('test.jpg')) already provide coverage.

// ============================================================================
// getExtension Tests
// ============================================================================

describe('getExtension', () => {
  it('should extract extension from simple filename', () => {
    expect(getExtension('image.jpg')).toBe('jpg');
    expect(getExtension('document.pdf')).toBe('pdf');
  });

  it('should extract extension from filename with multiple dots', () => {
    expect(getExtension('archive.tar.gz')).toBe('gz');
    expect(getExtension('my.file.name.txt')).toBe('txt');
  });

  it('should extract extension from URL', () => {
    expect(getExtension('https://example.com/image.jpg')).toBe('jpg');
    expect(getExtension('https://example.com/path/to/file.pdf')).toBe('pdf');
  });

  it('should handle URL with query parameters', () => {
    expect(getExtension('https://example.com/image.jpg?size=large')).toBe('jpg');
    expect(getExtension('https://example.com/file.pdf?download=true#hash')).toBe('pdf');
  });

  it('should return empty string for files without extension', () => {
    expect(getExtension('README')).toBe('');
    expect(getExtension('Makefile')).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(getExtension('')).toBe('');
  });

  it('should be case insensitive', () => {
    expect(getExtension('IMAGE.JPG')).toBe('jpg');
    expect(getExtension('Image.Jpeg')).toBe('jpeg');
  });
});

// ============================================================================
// getMimeType Tests
// ============================================================================

describe('getMimeType', () => {
  it('should return MimeTypeInfo for image files', () => {
    const result = getMimeType('image.jpg');
    expect(result).toEqual({
      type: 'Image',
      format: 'image/jpeg',
      motivation: 'painting'
    });
  });

  it('should return MimeTypeInfo for video files', () => {
    const result = getMimeType('video.mp4');
    expect(result).toEqual({
      type: 'Video',
      format: 'video/mp4',
      motivation: 'painting'
    });
  });

  it('should return MimeTypeInfo for audio files', () => {
    const result = getMimeType('audio.mp3');
    expect(result).toEqual({
      type: 'Sound',
      format: 'audio/mpeg',
      motivation: 'painting'
    });
  });

  it('should return MimeTypeInfo for text files', () => {
    const result = getMimeType('document.txt');
    expect(result).toEqual({
      type: 'Text',
      format: 'text/plain',
      motivation: 'supplementing'
    });
  });

  it('should return null for unknown extensions', () => {
    expect(getMimeType('file.xyz')).toBeNull();
    expect(getMimeType('file.unknown')).toBeNull();
  });

  it('should work with URLs', () => {
    const result = getMimeType('https://example.com/path/to/image.jpg');
    expect(result?.type).toBe('Image');
    expect(result?.format).toBe('image/jpeg');
  });
});

// ============================================================================
// getMimeTypeString Tests
// ============================================================================

describe('getMimeTypeString', () => {
  it('should return MIME type string for known files', () => {
    expect(getMimeTypeString('image.jpg')).toBe('image/jpeg');
    expect(getMimeTypeString('video.mp4')).toBe('video/mp4');
    expect(getMimeTypeString('audio.mp3')).toBe('audio/mpeg');
  });

  it('should return default for unknown files', () => {
    expect(getMimeTypeString('file.xyz')).toBe('application/octet-stream');
    expect(getMimeTypeString('')).toBe('application/octet-stream');
  });
});

// ============================================================================
// File Type Detection Tests
// ============================================================================

describe('File Type Detection', () => {
  describe('isMediaFile', () => {
    it('should return true for media files', () => {
      expect(isMediaFile('image.jpg')).toBe(true);
      expect(isMediaFile('video.mp4')).toBe(true);
      expect(isMediaFile('audio.mp3')).toBe(true);
    });

    it('should return false for non-media files', () => {
      expect(isMediaFile('file.xyz')).toBe(false);
      expect(isMediaFile('README')).toBe(false);
    });
  });

  describe('isImageFile', () => {
    it('should return true for image files', () => {
      expect(isImageFile('image.jpg')).toBe(true);
      expect(isImageFile('image.png')).toBe(true);
      expect(isImageFile('image.webp')).toBe(true);
    });

    it('should return false for non-image files', () => {
      expect(isImageFile('video.mp4')).toBe(false);
      expect(isImageFile('file.txt')).toBe(false);
    });
  });

  describe('isVideoFile', () => {
    it('should return true for video files', () => {
      expect(isVideoFile('video.mp4')).toBe(true);
      expect(isVideoFile('video.webm')).toBe(true);
      expect(isVideoFile('video.avi')).toBe(true);
    });

    it('should return false for non-video files', () => {
      expect(isVideoFile('image.jpg')).toBe(false);
      expect(isVideoFile('audio.mp3')).toBe(false);
    });
  });

  describe('isAudioFile', () => {
    it('should return true for audio files', () => {
      expect(isAudioFile('audio.mp3')).toBe(true);
      expect(isAudioFile('audio.wav')).toBe(true);
      expect(isAudioFile('audio.flac')).toBe(true);
    });

    it('should return false for non-audio files', () => {
      expect(isAudioFile('video.mp4')).toBe(false);
      expect(isAudioFile('image.jpg')).toBe(false);
    });
  });

  describe('isTextFile', () => {
    it('should return true for text files', () => {
      expect(isTextFile('document.txt')).toBe(true);
      expect(isTextFile('document.html')).toBe(true);
      expect(isTextFile('document.md')).toBe(true);
    });

    it('should return false for non-text files', () => {
      expect(isTextFile('image.jpg')).toBe(false);
      expect(isTextFile('video.mp4')).toBe(false);
    });
  });

  describe('isModelFile', () => {
    it('should return true for 3D model files', () => {
      expect(isModelFile('model.glb')).toBe(true);
      expect(isModelFile('model.gltf')).toBe(true);
      expect(isModelFile('model.obj')).toBe(true);
    });

    it('should return false for non-model files', () => {
      expect(isModelFile('image.jpg')).toBe(false);
      expect(isModelFile('video.mp4')).toBe(false);
    });
  });

  describe('isPdfFile', () => {
    it('should return true for PDF files', () => {
      expect(isPdfFile('document.pdf')).toBe(true);
    });

    it('should return false for non-PDF files', () => {
      expect(isPdfFile('document.txt')).toBe(false);
      expect(isPdfFile('image.jpg')).toBe(false);
    });
  });
});

// ============================================================================
// URL Detection Tests
// ============================================================================

describe('URL Detection', () => {
  describe('isImageUrl', () => {
    it('should return true for image URLs', () => {
      expect(isImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(isImageUrl('https://example.com/path/to/photo.png')).toBe(true);
    });

    it('should return false for non-image URLs', () => {
      expect(isImageUrl('https://example.com/video.mp4')).toBe(false);
      expect(isImageUrl('https://example.com/audio.mp3')).toBe(false);
    });
  });

  describe('isVideoUrl', () => {
    it('should return true for video URLs', () => {
      expect(isVideoUrl('https://example.com/video.mp4')).toBe(true);
      expect(isVideoUrl('https://example.com/movie.webm')).toBe(true);
    });

    it('should return false for non-video URLs', () => {
      expect(isVideoUrl('https://example.com/image.jpg')).toBe(false);
      expect(isVideoUrl('https://example.com/audio.mp3')).toBe(false);
    });
  });

  describe('isAudioUrl', () => {
    it('should return true for audio URLs', () => {
      expect(isAudioUrl('https://example.com/audio.mp3')).toBe(true);
      expect(isAudioUrl('https://example.com/song.wav')).toBe(true);
    });

    it('should return false for non-audio URLs', () => {
      expect(isAudioUrl('https://example.com/image.jpg')).toBe(false);
      expect(isAudioUrl('https://example.com/video.mp4')).toBe(false);
    });
  });

  describe('isMediaUrl', () => {
    it('should return true for any media URL', () => {
      expect(isMediaUrl('https://example.com/image.jpg')).toBe(true);
      expect(isMediaUrl('https://example.com/video.mp4')).toBe(true);
      expect(isMediaUrl('https://example.com/audio.mp3')).toBe(true);
      expect(isMediaUrl('https://example.com/model.glb')).toBe(true);
    });

    it('should return false for non-media URLs', () => {
      expect(isMediaUrl('https://example.com/document.txt')).toBe(false);
      expect(isMediaUrl('https://example.com/page.html')).toBe(false);
    });
  });

  describe('detectMediaType', () => {
    it('should detect image type', () => {
      expect(detectMediaType('https://example.com/image.jpg')).toBe('Image');
    });

    it('should detect video type', () => {
      expect(detectMediaType('https://example.com/video.mp4')).toBe('Video');
    });

    it('should detect audio type', () => {
      expect(detectMediaType('https://example.com/audio.mp3')).toBe('Sound');
    });

    it('should detect model type', () => {
      expect(detectMediaType('https://example.com/model.glb')).toBe('Model');
    });

    it('should return unknown for unrecognized types', () => {
      expect(detectMediaType('https://example.com/file.xyz')).toBe('unknown');
    });
  });
});

// ============================================================================
// MIME Type Classification Tests
// ============================================================================

describe('MIME Type Classification', () => {
  describe('isImageMimeType', () => {
    it('should identify image MIME types', () => {
      expect(isImageMimeType('image/jpeg')).toBe(true);
      expect(isImageMimeType('image/png')).toBe(true);
      expect(isImageMimeType('video/mp4')).toBe(false);
    });
  });

  describe('isVideoMimeType', () => {
    it('should identify video MIME types', () => {
      expect(isVideoMimeType('video/mp4')).toBe(true);
      expect(isVideoMimeType('video/webm')).toBe(true);
      expect(isVideoMimeType('image/jpeg')).toBe(false);
    });
  });

  describe('isAudioMimeType', () => {
    it('should identify audio MIME types', () => {
      expect(isAudioMimeType('audio/mpeg')).toBe(true);
      expect(isAudioMimeType('audio/wav')).toBe(true);
      expect(isAudioMimeType('image/jpeg')).toBe(false);
    });
  });

  describe('isTimeBasedMimeType', () => {
    it('should identify time-based MIME types', () => {
      expect(isTimeBasedMimeType('video/mp4')).toBe(true);
      expect(isTimeBasedMimeType('audio/mpeg')).toBe(true);
      expect(isTimeBasedMimeType('image/jpeg')).toBe(false);
    });
  });

  describe('isVisualMimeType', () => {
    it('should identify visual MIME types', () => {
      expect(isVisualMimeType('image/jpeg')).toBe(true);
      expect(isVisualMimeType('video/mp4')).toBe(true);
      expect(isVisualMimeType('audio/mpeg')).toBe(false);
    });
  });

  describe('getContentTypeFromMime', () => {
    it('should map image MIME types', () => {
      expect(getContentTypeFromMime('image/jpeg')).toBe('Image');
      expect(getContentTypeFromMime('image/png')).toBe('Image');
    });

    it('should map video MIME types', () => {
      expect(getContentTypeFromMime('video/mp4')).toBe('Video');
    });

    it('should map audio MIME types', () => {
      expect(getContentTypeFromMime('audio/mpeg')).toBe('Sound');
    });

    it('should map text MIME types', () => {
      expect(getContentTypeFromMime('text/plain')).toBe('Text');
    });

    it('should map model MIME types', () => {
      expect(getContentTypeFromMime('model/gltf-binary')).toBe('Model');
    });

    it('should handle PDF as Text', () => {
      expect(getContentTypeFromMime('application/pdf')).toBe('Text');
    });

    it('should handle JSON/XML as Dataset', () => {
      expect(getContentTypeFromMime('application/json')).toBe('Dataset');
      expect(getContentTypeFromMime('application/xml')).toBe('Dataset');
      expect(getContentTypeFromMime('application/ld+json')).toBe('Dataset');
    });

    it('should return unknown for unrecognized types', () => {
      expect(getContentTypeFromMime('application/unknown')).toBe('unknown');
    });
  });
});

// ============================================================================
// Filename Utilities Tests
// ============================================================================

describe('Filename Utilities', () => {
  describe('getFilenameFromUrl', () => {
    it('should extract filename from URL', () => {
      expect(getFilenameFromUrl('https://example.com/image.jpg')).toBe('image.jpg');
      expect(getFilenameFromUrl('https://example.com/path/to/file.pdf')).toBe('file.pdf');
    });

    it('should decode URL-encoded filenames', () => {
      expect(getFilenameFromUrl('https://example.com/my%20file.jpg')).toBe('my file.jpg');
      expect(getFilenameFromUrl('https://example.com/file%2Bname.pdf')).toBe('file+name.pdf');
    });

    it('should handle URLs without path', () => {
      expect(getFilenameFromUrl('https://example.com/')).toBe('resource');
    });

    it('should handle non-URL strings', () => {
      expect(getFilenameFromUrl('path/to/file.jpg')).toBe('file.jpg');
    });

    it('should strip query parameters', () => {
      expect(getFilenameFromUrl('https://example.com/image.jpg?size=large')).toBe('image.jpg');
      expect(getFilenameFromUrl('path/to/file.jpg?download=true')).toBe('file.jpg');
    });
  });

  describe('removeExtension', () => {
    it('should remove extension from filename', () => {
      expect(removeExtension('image.jpg')).toBe('image');
      expect(removeExtension('document.pdf')).toBe('document');
    });

    it('should handle filenames with multiple dots', () => {
      expect(removeExtension('archive.tar.gz')).toBe('archive.tar');
      expect(removeExtension('my.file.name.txt')).toBe('my.file.name');
    });

    it('should return original string if no extension', () => {
      expect(removeExtension('README')).toBe('README');
      expect(removeExtension('Makefile')).toBe('Makefile');
    });

    it('should handle empty string', () => {
      expect(removeExtension('')).toBe('');
    });
  });
});

// ============================================================================
// MIME_TYPE_MAP Tests - REMOVED (Tautological)
// ============================================================================
// These tests verified data structure consistency, not behavior.
// Functional tests (e.g., getMimeType, getContentType) already validate the map works correctly.
