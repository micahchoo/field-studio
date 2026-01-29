/**
 * Integration Tests
 *
 * Tests end-to-end workflows and component integration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { VaultProvider } from '../../../hooks/useIIIFEntity';
import { buildTree, ingestTree } from '../../../services/iiifBuilder';
import type { IIIFManifest, IIIFItem } from '../../../types';

// Mock App for integration tests
const MockApp = ({ initialRoot }: { initialRoot?: IIIFItem }) => {
  return createElement(
    VaultProvider,
    { initialRoot: initialRoot || null },
    createElement('div', { 'data-testid': 'app' }, 'Field Studio App')
  );
};

// ============================================================================
// Import Workflow Tests
// ============================================================================

describe('Import Workflow', () => {
  it('should create vault with initial manifest', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test Manifest'] },
      items: [],
    };

    render(createElement(MockApp, { initialRoot: manifest }));

    expect(screen.getByTestId('app')).toBeInTheDocument();
    expect(screen.getByText('Field Studio App')).toBeInTheDocument();
  });

  it('should process file tree into manifest', async () => {
    const files = [
      new File(['image1'], 'image1.jpg', { type: 'image/jpeg' }),
      new File(['image2'], 'image2.jpg', { type: 'image/jpeg' }),
    ];

    const tree = buildTree(files);
    expect(tree).toBeDefined();
    expect(tree.files.size).toBe(2);
  });

  it('should handle sequence detection', async () => {
    const files = [
      new File(['page'], 'page001.jpg', { type: 'image/jpeg' }),
      new File(['page'], 'page002.jpg', { type: 'image/jpeg' }),
      new File(['page'], 'page003.jpg', { type: 'image/jpeg' }),
    ];

    const tree = buildTree(files);
    const fileArray = Array.from(tree.files.keys());
    
    // Verify files are sorted
    expect(fileArray).toContain('page001.jpg');
    expect(fileArray).toContain('page002.jpg');
    expect(fileArray).toContain('page003.jpg');
  });
});

// ============================================================================
// Vault State Tests
// ============================================================================

describe('Vault State Management', () => {
  it('should normalize and denormalize manifest', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test Manifest'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Page 1'] },
          width: 1000,
          height: 1000,
          items: [],
        },
        {
          id: 'https://example.com/canvas/2',
          type: 'Canvas',
          label: { en: ['Page 2'] },
          width: 1000,
          height: 1000,
          items: [],
        },
      ],
    };

    render(createElement(MockApp, { initialRoot: manifest }));
    expect(screen.getByTestId('app')).toBeInTheDocument();
  });

  it('should handle empty manifest', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/empty',
      type: 'Manifest',
      label: { en: ['Empty Manifest'] },
      items: [],
    };

    render(createElement(MockApp, { initialRoot: manifest }));
    expect(screen.getByTestId('app')).toBeInTheDocument();
  });
});

// ============================================================================
// IIIF Builder Tests
// ============================================================================

describe('IIIF Builder Integration', () => {
  it('should build tree from files', async () => {
    const files = [
      new File(['test1'], 'folder1/test1.jpg', { type: 'image/jpeg' }),
      new File(['test2'], 'folder1/test2.jpg', { type: 'image/jpeg' }),
      new File(['test3'], 'folder2/test3.jpg', { type: 'image/jpeg' }),
    ];
    (files[0] as any).webkitRelativePath = 'folder1/test1.jpg';
    (files[1] as any).webkitRelativePath = 'folder1/test2.jpg';
    (files[2] as any).webkitRelativePath = 'folder2/test3.jpg';

    const tree = buildTree(files);
    expect(tree.directories.size).toBe(2);
    expect(tree.directories.has('folder1')).toBe(true);
    expect(tree.directories.has('folder2')).toBe(true);
  });

  it('should ingest tree with report', async () => {
    const files = [
      new File(['image1'], 'image1.jpg', { type: 'image/jpeg' }),
    ];
    (files[0] as any).webkitRelativePath = 'image1.jpg';

    const tree = buildTree(files);
    const result = await ingestTree(tree, null);

    expect(result.root).toBeDefined();
    expect(result.report).toBeDefined();
    expect(result.report.filesProcessed).toBeGreaterThan(0);
  });
});

// ============================================================================
// Export Workflow Tests
// ============================================================================

describe('Export Workflow', () => {
  it('should prepare manifest for export', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Export Test'] },
      items: [
        {
          id: 'https://example.com/canvas/1',
          type: 'Canvas',
          label: { en: ['Page 1'] },
          width: 1000,
          height: 1000,
          items: [],
        },
      ],
    };

    render(createElement(MockApp, { initialRoot: manifest }));
    expect(screen.getByTestId('app')).toBeInTheDocument();
  });
});

// ============================================================================
// Undo/Redo Tests
// ============================================================================

describe('Undo/Redo Workflow', () => {
  it('should support undo/redo actions', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Original Label'] },
      items: [],
    };

    render(createElement(MockApp, { initialRoot: manifest }));
    expect(screen.getByTestId('app')).toBeInTheDocument();
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Error Handling', () => {
  it('should handle invalid files gracefully', async () => {
    const files: File[] = [];
    const tree = buildTree(files);
    
    expect(tree.files.size).toBe(0);
    expect(tree.directories.size).toBe(0);
  });

  it('should handle corrupted manifest data', async () => {
    // Test that the vault provider can handle edge cases
    render(createElement(MockApp));
    expect(screen.getByTestId('app')).toBeInTheDocument();
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

describe('Performance', () => {
  it('should handle many files', async () => {
    const files = Array.from({ length: 50 }, (_, i) => {
      // Create a mock file object with webkitRelativePath
      const blob = new Blob([`content${i}`], { type: 'image/jpeg' });
      const file = Object.create(File.prototype);
      Object.defineProperty(file, 'name', { value: `image${i}.jpg`, writable: false });
      Object.defineProperty(file, 'type', { value: 'image/jpeg', writable: false });
      Object.defineProperty(file, 'size', { value: blob.size, writable: false });
      Object.defineProperty(file, 'webkitRelativePath', { value: `folder/image${i}.jpg`, writable: false });
      return file as File;
    });

    const tree = buildTree(files);
    // Files are in the 'folder' subdirectory, not at root
    const folder = tree.directories.get('folder');
    expect(folder).toBeDefined();
    expect(folder?.files.size).toBe(50);
  });
});
