/**
 * Unit Tests for utils/filenameUtils.ts
 *
 * Tests filename parsing, sanitization, and sequence detection.
 */

import { describe, expect, it } from 'vitest';
import {
  detectFileSequence,
  extractSequenceNumber,
  generateSafeFilename,
  getBaseName,
  parseFilePath,
  sanitizeFilename,
} from '@/utils/filenameUtils';

// ============================================================================
// sanitizeFilename Tests
// ============================================================================

describe('sanitizeFilename', () => {
  it('should remove invalid characters', () => {
    expect(sanitizeFilename('file<name>.jpg')).toBe('filename.jpg');
    expect(sanitizeFilename('file|name.jpg')).toBe('filename.jpg');
    expect(sanitizeFilename('file?name.jpg')).toBe('filename.jpg');
  });

  it('should handle multiple consecutive spaces', () => {
    expect(sanitizeFilename('file   name.jpg')).toBe('file name.jpg');
  });

  it('should trim leading and trailing spaces', () => {
    expect(sanitizeFilename('  filename.jpg  ')).toBe('filename.jpg');
  });

  it('should handle empty strings', () => {
    expect(sanitizeFilename('')).toBe('untitled');
    expect(sanitizeFilename('   ')).toBe('untitled');
  });

  it('should preserve valid characters', () => {
    expect(sanitizeFilename('my-file_name.123.jpg')).toBe('my-file_name.123.jpg');
  });

  it('should handle unicode characters', () => {
    expect(sanitizeFilename('файл.jpg')).toBeTruthy();
    expect(sanitizeFilename('文件.jpg')).toBeTruthy();
  });

  // Trivial test removed: "should handle very long filenames"
  // Only checked length <= 255 without verifying truncation logic,
  // extension preservation, or intelligent truncation behavior.
});

// ============================================================================
// extractSequenceNumber Tests
// ============================================================================

describe('extractSequenceNumber', () => {
  it('should extract sequence number from filename', () => {
    expect(extractSequenceNumber('image001.jpg')).toBe(1);
    expect(extractSequenceNumber('photo_042.png')).toBe(42);
    expect(extractSequenceNumber('scan-123.tiff')).toBe(123);
  });

  it('should handle padded zeros', () => {
    expect(extractSequenceNumber('file0001.jpg')).toBe(1);
    expect(extractSequenceNumber('img00042.jpg')).toBe(42);
  });

  it('should return null for files without sequence', () => {
    expect(extractSequenceNumber('image.jpg')).toBeNull();
    expect(extractSequenceNumber('photo.png')).toBeNull();
  });

  it('should handle multiple numbers in filename', () => {
    expect(extractSequenceNumber('set1_image_042.jpg')).toBe(42);
  });

  it('should handle numbers at start', () => {
    expect(extractSequenceNumber('001-image.jpg')).toBe(1);
  });
});

// ============================================================================
// detectFileSequence Tests
// ============================================================================

describe('detectFileSequence', () => {
  it('should detect sequential files', () => {
    const files = [
      { name: 'image001.jpg', path: '/path/image001.jpg' },
      { name: 'image002.jpg', path: '/path/image002.jpg' },
      { name: 'image003.jpg', path: '/path/image003.jpg' },
    ];

    const result = detectFileSequence(files);
    expect(result.isSequence).toBe(true);
    expect(result.pattern).toBeTruthy();
  });

  it('should handle non-sequential files', () => {
    const files = [
      { name: 'photo.jpg', path: '/path/photo.jpg' },
      { name: 'image.png', path: '/path/image.png' },
    ];

    const result = detectFileSequence(files);
    expect(result.isSequence).toBe(false);
  });

  it('should detect sequence with gaps', () => {
    const files = [
      { name: 'image001.jpg', path: '/path/image001.jpg' },
      { name: 'image003.jpg', path: '/path/image003.jpg' },
      { name: 'image005.jpg', path: '/path/image005.jpg' },
    ];

    const result = detectFileSequence(files);
    expect(result.isSequence).toBe(true);
    expect(result.hasGaps).toBe(true);
  });

  it('should handle single file', () => {
    const files = [
      { name: 'image001.jpg', path: '/path/image001.jpg' },
    ];

    const result = detectFileSequence(files);
    expect(result.isSequence).toBe(false);
  });
});

// ============================================================================
// generateSafeFilename Tests
// ============================================================================

describe('generateSafeFilename', () => {
  it('should generate safe filename from base and extension', () => {
    const result = generateSafeFilename('My File', 'jpg');
    expect(result).toBe('my-file.jpg');
  });

  it('should handle special characters', () => {
    const result = generateSafeFilename('My File & Stuff!', 'png');
    expect(result).toMatch(/^my-file-stuff.*\.png$/);
  });

  it('should add timestamp for uniqueness', () => {
    const result1 = generateSafeFilename('file', 'jpg', true);
    const result2 = generateSafeFilename('file', 'jpg', true);
    expect(result1).not.toBe(result2);
  });

  it('should handle empty base name', () => {
    const result = generateSafeFilename('', 'jpg');
    expect(result).toMatch(/^untitled.*\.jpg$/);
  });
});

// ============================================================================
// getBaseName Tests
// ============================================================================

describe('getBaseName', () => {
  it('should extract base name without extension', () => {
    expect(getBaseName('image.jpg')).toBe('image');
    expect(getBaseName('photo.png')).toBe('photo');
  });

  it('should handle multiple extensions', () => {
    expect(getBaseName('archive.tar.gz')).toBe('archive.tar');
  });

  it('should handle files without extension', () => {
    expect(getBaseName('README')).toBe('README');
  });

  it('should handle hidden files', () => {
    expect(getBaseName('.gitignore')).toBe('.gitignore');
  });

  it('should handle paths', () => {
    expect(getBaseName('/path/to/file.jpg')).toBe('file');
  });
});

// ============================================================================
// parseFilePath Tests
// ============================================================================

describe('parseFilePath', () => {
  it('should parse file path into components', () => {
    const result = parseFilePath('/path/to/file.jpg');
    expect(result).toEqual({
      dir: '/path/to',
      name: 'file',
      ext: 'jpg',
      base: 'file.jpg',
    });
  });

  it('should handle relative paths', () => {
    const result = parseFilePath('path/to/file.jpg');
    expect(result.dir).toBe('path/to');
    expect(result.name).toBe('file');
  });

  it('should handle files without path', () => {
    const result = parseFilePath('file.jpg');
    expect(result.dir).toBe('');
    expect(result.name).toBe('file');
    expect(result.ext).toBe('jpg');
  });

  it('should handle files without extension', () => {
    const result = parseFilePath('/path/to/file');
    expect(result.ext).toBe('');
    expect(result.name).toBe('file');
  });
});
