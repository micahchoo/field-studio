/**
 * Pipeline Test Fixtures
 *
 * Provides real test data from `.Images iiif test/` for action-driven testing.
 * Each fixture corresponds to a user interaction or workflow scenario.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { basename, join, resolve } from 'path';
import { loadImageBuffer, TEST_IMAGES, TestImageKey } from './imageFixtures';

const IMAGE_DIR = '.Images iiif test';
const PROJECT_ROOT = resolve(__dirname, '../../..');
const TEST_DATA_PATH = join(PROJECT_ROOT, IMAGE_DIR);

/**
 * Pipeline test data inventory - Real files from .Images iiif test/
 */
export const PIPELINE_TEST_DATA = {
  // Sequence detection tests (Karwaan folder)
  sequences: {
    karwaan: {
      folder: 'Karwaan',
      files: ['108.png', '109.png', '110.png', '111.png', '112.png', '113.png', '114.png'],
      description: 'Numeric sequence for auto-range detection',
    },
  },

  // Multi-angle capture patterns
  multiAngle: {
    device: {
      files: ['1559_D500_front.webp', '1559_D500_back.webp'],
      pattern: 'front/back',
      description: 'Device product shots from multiple angles',
    },
  },

  // Geotagged images with EXIF/GPS
  geotagged: {
    fieldPhoto: {
      file: 'archive/00001788-PHOTO-2019-03-03-12-51-01.jpg',
      description: 'Field photo with timestamp in filename',
      expectedDate: '2019-03-03T12:51:01',
    },
  },

  // CSV metadata files
  metadata: {
    fieldResearch: {
      file: 'archive/2018_1.csv',
      description: '2018 field research metadata',
    },
  },

  // Large images for tile generation
  largeTiles: {
    aiArt: {
      file: 'AKICHI_ukiyoe_styleCat_dressed_as_a_young_rappercolorfulhighly__b3c9848c-6e6a-4ebc-b9be-4a82fd15c5e6.png',
      description: 'Large AI-generated art for tiling tests',
      approximateSize: 2500000, // ~2.5 MB
    },
  },

  // Documents for mixed-media tests
  documents: {
    pdf: {
      folder: 'archive',
      pattern: '*.pdf',
      description: 'PDF documents in archive',
    },
  },

  // Video files for A/V support
  video: {
    samples: {
      folder: 'video',
      pattern: '*.mp4',
      description: 'Video samples for A/V testing',
    },
  },
} as const;

/**
 * Load a file from the test data directory
 */
export function loadTestFile(relativePath: string): Buffer {
  const fullPath = join(TEST_DATA_PATH, relativePath);

  if (!existsSync(fullPath)) {
    throw new Error(
      `Test file not found: "${relativePath}" at "${fullPath}". ` +
      `Ensure the .Images iiif test/ directory exists.`
    );
  }

  return readFileSync(fullPath);
}

/**
 * Check if a test file exists
 */
export function testFileExists(relativePath: string): boolean {
  const fullPath = join(TEST_DATA_PATH, relativePath);
  return existsSync(fullPath);
}

/**
 * Create File object from test data path
 */
export function createTestFile(
  relativePath: string,
  customName?: string,
  mimeType?: string
): File {
  const buffer = loadTestFile(relativePath);
  const filename = customName || basename(relativePath);

  // Infer MIME type from extension if not provided
  const type = mimeType || inferMimeType(filename);

  // Convert Buffer to ArrayBuffer for Blob compatibility
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;

  const blob = new Blob([arrayBuffer], { type });

  return new File([blob], filename, {
    type,
    lastModified: Date.now(),
  });
}

/**
 * Create a minimal 1x1 PNG for mock testing
 */
function createMockPNG(): Uint8Array {
  // Minimal 1x1 red PNG (67 bytes)
  return new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xdd, 0x8d, 0xb4, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

/**
 * Create sequence of Karwaan files for sequence detection tests
 */
export function createKarwaanSequence(): File[] {
  const { folder, files } = PIPELINE_TEST_DATA.sequences.karwaan;
  const fileObjects: File[] = [];

  for (const filename of files) {
    const relativePath = `${folder}/${filename}`;

    if (testFileExists(relativePath)) {
      // Use real file if available
      const file = createTestFile(relativePath);

      // Add webkitRelativePath for folder structure testing
      Object.defineProperty(file, 'webkitRelativePath', {
        value: relativePath,
        writable: false,
      });

      fileObjects.push(file);
    } else {
      // Fallback to mock PNG
      console.warn(`Karwaan file not found: ${relativePath}, using mock`);
      const mockPNG = createMockPNG();
      const blob = new Blob([mockPNG], { type: 'image/png' });
      const file = new File([blob], filename, {
        type: 'image/png',
        lastModified: Date.now(),
      });

      Object.defineProperty(file, 'webkitRelativePath', {
        value: relativePath,
        writable: false,
      });

      fileObjects.push(file);
    }
  }

  if (fileObjects.length === 0) {
    throw new Error(
      'No Karwaan sequence files found. Ensure .Images iiif test/Karwaan/ exists with numbered PNG files.'
    );
  }

  return fileObjects;
}

/**
 * Create a minimal 1x1 WebP for mock testing
 */
function createMockWebP(): Uint8Array {
  // Minimal 1x1 WebP (26 bytes) - valid WebP header
  return new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x4c, 0x0d, 0x00, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
    0x00, 0x00,
  ]);
}

/**
 * Create multi-angle capture files for pattern detection tests
 */
export function createMultiAngleBatch(): File[] {
  const { files } = PIPELINE_TEST_DATA.multiAngle.device;
  const fileObjects: File[] = [];

  for (const filename of files) {
    if (testFileExists(filename)) {
      // Use real file if available
      const file = createTestFile(filename);
      fileObjects.push(file);
    } else {
      // Fallback to mock WebP
      console.warn(`Multi-angle file not found: ${filename}, using mock`);
      const mockWebP = createMockWebP();
      const blob = new Blob([mockWebP], { type: 'image/webp' });
      const file = new File([blob], filename, {
        type: 'image/webp',
        lastModified: Date.now(),
      });
      fileObjects.push(file);
    }
  }

  if (fileObjects.length === 0) {
    throw new Error(
      'No multi-angle files found. Ensure .Images iiif test/ has front/back WebP files.'
    );
  }

  return fileObjects;
}

/**
 * Create mixed media batch (images, PDFs, videos) for import tests
 */
export function createMixedMediaBatch(): File[] {
  const files: File[] = [];

  // Add some images from imageFixtures
  const imageKeys: TestImageKey[] = ['jpegSmall', 'pngSmall', 'webpSmall'];
  for (const key of imageKeys) {
    const buffer = loadImageBuffer(key);
    const {filename} = TEST_IMAGES[key];
    const {type} = TEST_IMAGES[key];

    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;

    const blob = new Blob([arrayBuffer], { type });
    const file = new File([blob], filename, { type, lastModified: Date.now() });

    files.push(file);
  }

  // Add a PDF if available
  try {
    const pdfPath = join(TEST_DATA_PATH, 'archive');
    if (existsSync(pdfPath)) {
      const pdfFiles = readdirSync(pdfPath).filter(f => f.endsWith('.pdf'));
      if (pdfFiles.length > 0) {
        const pdfFile = createTestFile(`archive/${pdfFiles[0]}`);
        files.push(pdfFile);
      }
    }
  } catch (error) {
    console.warn('PDF files not available for mixed media batch');
  }

  // Add a video if available
  try {
    const videoPath = join(TEST_DATA_PATH, 'video');
    if (existsSync(videoPath)) {
      const videoFiles = readdirSync(videoPath).filter(f => f.endsWith('.mp4'));
      if (videoFiles.length > 0) {
        const videoFile = createTestFile(`video/${videoFiles[0]}`);
        files.push(videoFile);
      }
    }
  } catch (error) {
    console.warn('Video files not available for mixed media batch');
  }

  return files;
}

/**
 * Create geotagged image file for metadata extraction tests
 */
export function createGeotaggedImage(): File | null {
  const { file } = PIPELINE_TEST_DATA.geotagged.fieldPhoto;

  if (!testFileExists(file)) {
    console.warn(`Geotagged image not found: ${file}`);
    return null;
  }

  return createTestFile(file);
}

/**
 * Load CSV metadata file for CSV import tests
 */
export function loadCSVMetadata(): string {
  const { file } = PIPELINE_TEST_DATA.metadata.fieldResearch;

  if (!testFileExists(file)) {
    throw new Error(
      `CSV metadata file not found: ${file}. ` +
      `Ensure .Images iiif test/archive/ contains CSV files.`
    );
  }

  const buffer = loadTestFile(file);
  return buffer.toString('utf-8');
}

/**
 * Create large image for tile generation tests
 */
export function createLargeTileImage(): File | null {
  const { file } = PIPELINE_TEST_DATA.largeTiles.aiArt;

  if (!testFileExists(file)) {
    console.warn(`Large tile image not found: ${file}`);
    return null;
  }

  return createTestFile(file);
}

/**
 * Create batch of files with folder structure for hierarchy tests
 */
export function createFolderHierarchy(): Map<string, File[]> {
  const structure = new Map<string, File[]>();

  // Try to use real Karwaan folder
  const karwaanFiles = createKarwaanSequence();
  if (karwaanFiles.length > 0) {
    structure.set('Karwaan', karwaanFiles);
  }

  // Add some root-level images
  const imageKeys: TestImageKey[] = ['jpegMedium', 'pngLarge'];
  const rootFiles: File[] = [];

  for (const key of imageKeys) {
    const buffer = loadImageBuffer(key);
    const {filename} = TEST_IMAGES[key];
    const {type} = TEST_IMAGES[key];

    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;

    const blob = new Blob([arrayBuffer], { type });
    const file = new File([blob], filename, { type, lastModified: Date.now() });

    Object.defineProperty(file, 'webkitRelativePath', {
      value: filename,
      writable: false,
    });

    rootFiles.push(file);
  }

  structure.set('root', rootFiles);

  return structure;
}

/**
 * Infer MIME type from filename extension
 */
function inferMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    json: 'application/json',
    csv: 'text/csv',
    txt: 'text/plain',
    xml: 'application/xml',
    kmz: 'application/vnd.google-earth.kmz',
  };

  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Action-specific test data helpers
 */
export const ActionTestData = {
  /**
   * Data for import action tests
   */
  forImport: {
    singleImage: () => createKarwaanSequence().slice(0, 1),
    sequence: () => createKarwaanSequence(),
    mixedMedia: () => createMixedMediaBatch(),
    largeImage: () => {
      const img = createLargeTileImage();
      return img ? [img] : [];
    },
  },

  /**
   * Data for metadata extraction action tests
   */
  forMetadataExtraction: {
    withEXIF: () => {
      const img = createGeotaggedImage();
      return img ? [img] : [];
    },
    csvMetadata: () => loadCSVMetadata(),
  },

  /**
   * Data for sequence detection action tests
   */
  forSequenceDetection: {
    numericSequence: () => createKarwaanSequence(),
    multiAngle: () => createMultiAngleBatch(),
  },

  /**
   * Data for structure management action tests
   */
  forStructureManagement: {
    hierarchy: () => createFolderHierarchy(),
    flatList: () => createKarwaanSequence(),
  },

  /**
   * Data for export action tests
   */
  forExport: {
    completeManifest: () => {
      const files = createKarwaanSequence().slice(0, 3); // 3 canvases
      return files;
    },
    withAssets: () => createMixedMediaBatch(),
  },
};

/**
 * Ideal outcomes and failure scenarios for action tests
 */
export const ActionExpectations = {
  /**
   * Import action expectations
   */
  import: {
    singleImage: {
      ideal: 'Canvas created with correct dimensions from image',
      failure: 'Import fails silently or creates invalid canvas',
    },
    sequence: {
      ideal: 'Range auto-created with numeric order preserved',
      failure: 'Manual reordering needed or flat list without structure',
    },
    corrupted: {
      ideal: 'Error logged, import continues with valid files',
      failure: 'Entire batch fails or silent corruption',
    },
  },

  /**
   * Content management action expectations
   */
  contentManagement: {
    updateLabel: {
      ideal: 'Label updated and reflected in tree, breadcrumb, search',
      failure: 'Empty label breaks navigation',
    },
    updateMetadata: {
      ideal: 'Metadata searchable and exportable',
      failure: 'Data lost or corrupted',
    },
    updateBehavior: {
      ideal: 'Viewer compatibility maintained',
      failure: 'Conflicting behaviors cause viewer rendering failure',
    },
  },

  /**
   * Export action expectations
   */
  export: {
    rawIIIF: {
      ideal: 'Valid ZIP with manifest.json that passes validation',
      failure: 'Unreadable archive or invalid IIIF structure',
    },
    staticSite: {
      ideal: 'Viewable HTML with functional search',
      failure: 'Non-functional site or missing assets',
    },
  },

  /**
   * Validation action expectations
   */
  validation: {
    autoValidate: {
      ideal: 'Issues highlighted immediately in UI',
      failure: 'Silent corruption without user awareness',
    },
    autoHeal: {
      ideal: 'Common issues automatically resolved',
      failure: 'Manual fixing required for simple issues',
    },
  },
};
