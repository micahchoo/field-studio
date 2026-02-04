/**
 * Image Test Fixtures
 *
 * Provides utilities for loading and using real image files in tests.
 * Uses images from .Images iiif test/ directory for realistic testing.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const IMAGE_DIR = '.Images iiif test';
const PROJECT_ROOT = resolve(__dirname, '../../..');

/**
 * Available test images with their characteristics
 */
export const TEST_IMAGES = {
  // JPEG images
  jpegSmall: {
    filename: '_265a2329-fae7-4528-9448-1793e2fc27ab.jpg',
    type: 'image/jpeg',
    approximateSize: 58475,
  },
  jpegMedium: {
    filename: '500571375_0f5adeb3-b5dc-4fc5-941f-0fa4da92f8e9.jpg',
    type: 'image/jpeg',
    approximateSize: 183050,
  },
  jpegLarge: {
    filename: '11046270_815083215249450_7249415012582760885_n.jpg',
    type: 'image/jpeg',
    approximateSize: 85692,
  },

  // PNG images
  pngSmall: {
    filename: '2163161_2938x1016_500.png',
    type: 'image/png',
    approximateSize: 20386,
  },
  pngLarge: {
    filename: '26527_A1000_front.png',
    type: 'image/png',
    approximateSize: 439818,
  },

  // WebP images
  webpSmall: {
    filename: '1600115354-design-appr-table.webp',
    type: 'image/webp',
    approximateSize: 65308,
  },
  webpMedium: {
    filename: '1559_D500_front.webp',
    type: 'image/webp',
    approximateSize: 162170,
  },

  // Special cases
  sequence1: {
    filename: '52802731.jpg',
    type: 'image/jpeg',
    approximateSize: 0, // Will be determined at runtime
  },
  sequence2: {
    filename: '52802731 (1).jpg',
    type: 'image/jpeg',
    approximateSize: 0,
  },
} as const;

export type TestImageKey = keyof typeof TEST_IMAGES;

/**
 * Load image file as Buffer
 */
export function loadImageBuffer(imageKey: TestImageKey): Buffer {
  const imageInfo = TEST_IMAGES[imageKey];
  const imagePath = join(PROJECT_ROOT, IMAGE_DIR, imageInfo.filename);

  try {
    return readFileSync(imagePath);
  } catch (error) {
    throw new Error(
      `Failed to load test image "${imageInfo.filename}" from "${imagePath}". ` +
      `Ensure the .Images iiif test/ directory exists with test images.`
    );
  }
}

/**
 * Load image file as Uint8Array
 */
export function loadImageBytes(imageKey: TestImageKey): Uint8Array {
  const buffer = loadImageBuffer(imageKey);
  return new Uint8Array(buffer);
}

/**
 * Create a File object from a test image
 */
export function createImageFile(
  imageKey: TestImageKey,
  customName?: string
): File {
  const buffer = loadImageBuffer(imageKey);
  const imageInfo = TEST_IMAGES[imageKey];
  const filename = customName || imageInfo.filename;

  // Convert Buffer to ArrayBuffer for Blob compatibility
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: imageInfo.type });

  // Create File from Blob
  return new File([blob], filename, {
    type: imageInfo.type,
    lastModified: Date.now(),
  });
}

/**
 * Create multiple File objects for batch testing
 */
export function createImageFiles(
  count: number,
  imageKeys?: TestImageKey[]
): File[] {
  const keys = imageKeys || Object.keys(TEST_IMAGES) as TestImageKey[];
  const files: File[] = [];

  for (let i = 0; i < count; i++) {
    const key = keys[i % keys.length];
    const file = createImageFile(key, `image${String(i).padStart(3, '0')}.${getExtension(key)}`);

    // Add webkitRelativePath for realistic file tree testing
    Object.defineProperty(file, 'webkitRelativePath', {
      value: `test-folder/image${String(i).padStart(3, '0')}.${getExtension(key)}`,
      writable: false,
    });

    files.push(file);
  }

  return files;
}

/**
 * Create a sequence of numbered files for sequence detection tests
 */
export function createSequenceFiles(
  prefix: string,
  count: number,
  startNumber: number = 1
): File[] {
  const files: File[] = [];
  const imageKey: TestImageKey = 'jpegSmall';
  const buffer = loadImageBuffer(imageKey);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

  for (let i = 0; i < count; i++) {
    const number = startNumber + i;
    const filename = `${prefix}${String(number).padStart(3, '0')}.jpg`;
    const blob = new Blob([arrayBuffer], { type: 'image/jpeg' });
    const file = new File([blob], filename, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    Object.defineProperty(file, 'webkitRelativePath', {
      value: `sequence/${filename}`,
      writable: false,
    });

    files.push(file);
  }

  return files;
}

/**
 * Create files in folder structure for tree building tests
 */
export function createFolderStructure(): Map<string, File[]> {
  const folders = new Map<string, File[]>();
  const imageKeys: TestImageKey[] = ['jpegSmall', 'pngSmall', 'webpSmall'];

  // Root folder files
  folders.set('root', [
    createImageFile('jpegMedium', 'root-image.jpg'),
  ]);

  // Subfolder 1
  folders.set('folder1', [
    createImageFile('pngSmall', 'folder1/image1.png'),
    createImageFile('pngSmall', 'folder1/image2.png'),
  ]);

  // Subfolder 2
  folders.set('folder2', [
    createImageFile('webpSmall', 'folder2/item1.webp'),
    createImageFile('webpSmall', 'folder2/item2.webp'),
    createImageFile('webpSmall', 'folder2/item3.webp'),
  ]);

  // Nested folder
  folders.set('nested/deep', [
    createImageFile('jpegLarge', 'nested/deep/photo.jpg'),
  ]);

  return folders;
}

/**
 * Create a corrupted image file for error testing
 */
export function createCorruptedImageFile(filename: string): File {
  // Create invalid JPEG (wrong magic bytes)
  const corruptedData = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0xFF, 0xD8]);
  const blob = new Blob([corruptedData], { type: 'image/jpeg' });

  return new File([blob], filename, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

/**
 * Create an empty image file for edge case testing
 */
export function createEmptyImageFile(filename: string): File {
  const blob = new Blob([], { type: 'image/jpeg' });

  return new File([blob], filename, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

/**
 * Get file extension from image key
 */
function getExtension(imageKey: TestImageKey): string {
  const {type} = TEST_IMAGES[imageKey];
  switch (type) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}

/**
 * Verify image can be loaded and has valid structure
 */
export function verifyImageIntegrity(imageKey: TestImageKey): boolean {
  try {
    const buffer = loadImageBuffer(imageKey);

    // Check minimum size
    if (buffer.length < 100) {
      return false;
    }

    // Check magic bytes for common formats
    const header = buffer.slice(0, 12);

    // JPEG: FF D8 FF
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
      return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E) {
      return true;
    }

    // WebP: RIFF....WEBP
    if (header.slice(0, 4).toString() === 'RIFF' &&
        header.slice(8, 12).toString() === 'WEBP') {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get image dimensions if possible (requires additional processing)
 * Returns null if dimensions cannot be determined
 */
export function getImageDimensions(imageKey: TestImageKey): { width: number; height: number } | null {
  const buffer = loadImageBuffer(imageKey);

  // Try to extract dimensions from JPEG
  if (TEST_IMAGES[imageKey].type === 'image/jpeg') {
    return extractJpegDimensions(buffer);
  }

  // Try to extract dimensions from PNG
  if (TEST_IMAGES[imageKey].type === 'image/png') {
    return extractPngDimensions(buffer);
  }

  return null;
}

/**
 * Extract JPEG dimensions from buffer
 */
function extractJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  let offset = 0;

  while (offset < buffer.length) {
    // Look for SOF markers
    if (buffer[offset] === 0xFF) {
      const marker = buffer[offset + 1];

      // SOF0, SOF1, SOF2 markers
      if (marker >= 0xC0 && marker <= 0xC3) {
        return {
          height: buffer.readUInt16BE(offset + 5),
          width: buffer.readUInt16BE(offset + 7),
        };
      }

      // Skip marker segment
      if (marker !== 0x00 && marker !== 0x01 && (marker < 0xD0 || marker > 0xD9)) {
        const length = buffer.readUInt16BE(offset + 2);
        offset += length + 2;
        continue;
      }
    }
    offset++;
  }

  return null;
}

/**
 * Extract PNG dimensions from buffer
 */
function extractPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  // PNG IHDR chunk starts at byte 16
  if (buffer.length >= 24) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }
  return null;
}
