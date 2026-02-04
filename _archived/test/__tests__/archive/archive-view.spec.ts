/**
 * Archive View Tests - IDEAL/FAILURE Pattern
 *
 * These tests verify the archive feature using the IDEAL/FAILURE criteria
 * documented in the Atomic Design Implementation Plan.
 *
 * IDEAL: The "happy path" - what should happen when everything works
 * FAILURE: Graceful degradation - what should happen when things go wrong
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArchiveView } from '@/src/features/archive/ui/organisms/ArchiveView';
import { createMockIIIFCollection, createMockIIIFManifest } from '@/test/fixtures';

describe('ArchiveView → Browse IIIF Collection', () => {
  const IDEAL = 'Users can browse, filter, select, and organize IIIF items efficiently';
  const FAILURE = 'Clear empty states, error messages, and graceful degradation';

  describe(`IDEAL: ${IDEAL}`, () => {
    it('displays grid of items when collection has contents', async () => {
      // Arrange
      const mockRoot = createMockIIIFCollection({
        items: [
          createMockIIIFManifest({ id: 'm1', label: 'Manifest 1' }),
          createMockIIIFManifest({ id: 'm2', label: 'Manifest 2' }),
        ],
      });

      // Act
      render(
        <ArchiveView
          root={mockRoot}
          onSelect={() => {}}
          onOpen={() => {}}
          onBatchEdit={() => {}}
        />
      );

      // Assert
      expect(screen.getByText('Manifest 1')).toBeInTheDocument();
      expect(screen.getByText('Manifest 2')).toBeInTheDocument();
    });

    it('filters items when search term is entered', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockRoot = createMockIIIFCollection({
        items: [
          createMockIIIFManifest({ id: 'm1', label: 'Photos from Paris' }),
          createMockIIIFManifest({ id: 'm2', label: 'Videos from London' }),
        ],
      });

      render(
        <ArchiveView
          root={mockRoot}
          onSelect={() => {}}
          onOpen={() => {}}
          onBatchEdit={() => {}}
        />
      );

      // Act
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Paris');

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Photos from Paris')).toBeInTheDocument();
        expect(screen.queryByText('Videos from London')).not.toBeInTheDocument();
      });
    });

    it('allows multi-select with shift-click', async () => {
      // Arrange
      const user = userEvent.setup();
      const onBatchEdit = vi.fn();
      const mockRoot = createMockIIIFCollection({
        items: [
          createMockIIIFManifest({ id: 'm1', label: 'Item 1' }),
          createMockIIIFManifest({ id: 'm2', label: 'Item 2' }),
          createMockIIIFManifest({ id: 'm3', label: 'Item 3' }),
        ],
      });

      render(
        <ArchiveView
          root={mockRoot}
          onSelect={() => {}}
          onOpen={() => {}}
          onBatchEdit={onBatchEdit}
        />
      );

      // Act
      const items = screen.getAllByRole('button', { name: /item/i });
      await user.click(items[0]);
      await user.keyboard('{Shift>}');
      await user.click(items[2]);
      await user.keyboard('{/Shift}');

      // Assert
      const selectedCount = screen.getByText(/3 items selected/i);
      expect(selectedCount).toBeInTheDocument();
    });

    it('switches between grid and list views', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockRoot = createMockIIIFCollection({
        items: [createMockIIIFManifest({ id: 'm1', label: 'Test' })],
      });

      render(
        <ArchiveView
          root={mockRoot}
          onSelect={() => {}}
          onOpen={() => {}}
          onBatchEdit={() => {}}
        />
      );

      // Act - switch to list view
      const listViewButton = screen.getByRole('button', { name: /list view/i });
      await user.click(listViewButton);

      // Assert
      expect(screen.getByRole('list')).toBeInTheDocument();
    });
  });

describe(`FAILURE: ${FAILURE}`, () => {
    it('shows empty state when collection has no items', () => {
      // Arrange
      const mockRoot = createMockIIIFCollection({ items: [] });

      // Act
      render(
        <ArchiveView
          root={mockRoot}
          onSelect={() => {}}
          onOpen={() => {}}
          onBatchEdit={() => {}}
        />
      );

      // Assert
      expect(screen.getByText(/no items in archive/i)).toBeInTheDocument();
      expect(screen.getByText(/import files to get started/i)).toBeInTheDocument();
    });

    it('shows "no results" when filter matches nothing', async () => {
      // Arrange
      const user = userEvent.setup();
      const mockRoot = createMockIIIFCollection({
        items: [
          createMockIIIFManifest({ id: 'm1', label: 'Item A' }),
        ],
      });

      render(
        <ArchiveView
          root={mockRoot}
          onSelect={() => {}}
          onOpen={() => {}}
          onBatchEdit={() => {}}
        />
      );

      // Act
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'xyz123nonexistent');

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/no items match your filter/i)).toBeInTheDocument();
      });
    });

    it('handles null root gracefully', () => {
      // Act
      render(
        <ArchiveView
          root={null}
          onSelect={() => {}}
          onOpen={() => {}}
          onBatchEdit={() => {}}
        />
      );

      // Assert
      expect(screen.getByText(/no archive loaded/i)).toBeInTheDocument();
    });

    it('preserves selection on error', async () => {
      // Arrange
      const user = userEvent.setup();
      const onBatchEdit = vi.fn(() => {
        throw new Error('Batch edit failed');
      });
      const mockRoot = createMockIIIFCollection({
        items: [
          createMockIIIFManifest({ id: 'm1', label: 'Item 1' }),
        ],
      });

      render(
        <ArchiveView
          root={mockRoot}
          onSelect={() => {}}
          onOpen={() => {}}
          onBatchEdit={onBatchEdit}
        />
      );

      // Act
      const item = screen.getByText('Item 1');
      await user.click(item);

      // Try batch edit (will fail)
      const batchEditButton = screen.getByRole('button', { name: /batch edit/i });
      await user.click(batchEditButton);

      // Assert - selection should be preserved
      expect(screen.getByText(/1 item selected/i)).toBeInTheDocument();
    });
  });
});
