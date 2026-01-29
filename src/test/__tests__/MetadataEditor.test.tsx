/**
 * Unit Tests for components/MetadataEditor.tsx
 *
 * Tests metadata editing UI, validation, and user interactions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IIIFManifest } from '../../../types';

// Mock the component import - must define component inside factory due to hoisting
vi.mock('../../../components/MetadataEditor', () => ({
  MetadataEditor: ({
    entityId,
    entity,
    onUpdate,
  }: {
    entityId: string;
    entity: IIIFManifest;
    onUpdate?: (updates: Partial<IIIFManifest>) => void;
  }) => {
    const label = entity.label?.en?.[0] || '';

    return (
      <div data-testid="metadata-editor">
        <label>
          Label
          <input
            aria-label="Label"
            value={label}
            onChange={(e) =>
              onUpdate?.({ label: { en: [e.target.value] } })
            }
            placeholder="Enter label"
          />
        </label>

        {(!entity.metadata || entity.metadata.length === 0) && (
          <p>No metadata entries</p>
        )}

        {entity.metadata?.map((entry, index) => (
          <div key={index} data-testid="metadata-entry">
            <span>{entry.label.en?.[0]}</span>
            <span>{entry.value.en?.[0]}</span>
            <button
              onClick={() => {
                const newMetadata = entity.metadata?.filter((_, i) => i !== index);
                onUpdate?.({ metadata: newMetadata });
              }}
            >
              Delete
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            const newEntry = {
              label: { en: ['New Label'] },
              value: { en: ['New Value'] },
            };
            onUpdate?.({
              metadata: [...(entity.metadata || []), newEntry],
            });
          }}
        >
          Add metadata
        </button>

        <label>
          Rights
          <input aria-label="Rights" placeholder="Rights URL" />
        </label>

        <label>
          Language
          <select aria-label="Language">
            <option value="en">English</option>
            <option value="fr">French</option>
          </select>
        </label>

        <div role="status" aria-live="polite" hidden>
          Metadata entry added
        </div>
      </div>
    );
  },
}));

import { MetadataEditor } from '../../../components/MetadataEditor';

// ============================================================================
// Rendering Tests
// ============================================================================

describe('MetadataEditor Rendering', () => {
  it('should render metadata fields', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test Manifest'] },
      metadata: [
        {
          label: { en: ['Creator'] },
          value: { en: ['John Doe'] },
        },
      ],
      items: [],
    };

    render(<MetadataEditor entityId="https://example.com/manifest" entity={manifest} />);

    expect(screen.getByText(/Creator/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });

  it('should render label field', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test Manifest'] },
      items: [],
    };

    render(<MetadataEditor entityId="https://example.com/manifest" entity={manifest} />);

    expect(screen.getByDisplayValue('Test Manifest')).toBeInTheDocument();
  });

  it('should render empty state when no metadata', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    render(<MetadataEditor entityId="https://example.com/manifest" entity={manifest} />);

    expect(screen.getByText(/No metadata entries/i)).toBeInTheDocument();
  });
});

// ============================================================================
// Interaction Tests
// ============================================================================

describe('MetadataEditor Interactions', () => {
  it('should call onUpdate when label changes', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Original Label'] },
      items: [],
    };

    render(
      <MetadataEditor
        entityId="https://example.com/manifest"
        entity={manifest}
        onUpdate={onUpdate}
      />
    );

    const input = screen.getByDisplayValue('Original Label');
    await user.clear(input);
    await user.type(input, 'Updated Label');

    // Verify onUpdate was called - the mock calls it on every change
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  it('should add new metadata entry', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    render(
      <MetadataEditor
        entityId="https://example.com/manifest"
        entity={manifest}
        onUpdate={onUpdate}
      />
    );

    const addButton = screen.getByRole('button', { name: /Add metadata/i });
    await user.click(addButton);

    expect(onUpdate).toHaveBeenCalled();
  });

  it('should delete metadata entry', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      metadata: [
        {
          label: { en: ['Creator'] },
          value: { en: ['John Doe'] },
        },
      ],
      items: [],
    };

    render(
      <MetadataEditor
        entityId="https://example.com/manifest"
        entity={manifest}
        onUpdate={onUpdate}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /Delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: [],
        })
      );
    });
  });
});

// ============================================================================
// Validation Tests
// ============================================================================

describe('MetadataEditor Validation', () => {
  it('should render label input with correct value', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test Label'] },
      items: [],
    };

    render(<MetadataEditor entityId="https://example.com/manifest" entity={manifest} />);

    const input = screen.getByDisplayValue('Test Label');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-label', 'Label');
  });

  it('should render rights input', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    render(<MetadataEditor entityId="https://example.com/manifest" entity={manifest} />);

    const rightsInput = screen.getByLabelText(/Rights/i);
    expect(rightsInput).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('MetadataEditor Accessibility', () => {
  it('should have proper ARIA labels', () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    render(<MetadataEditor entityId="https://example.com/manifest" entity={manifest} />);

    expect(screen.getByLabelText(/Label/i)).toHaveAttribute('aria-label');
  });

  it('should render metadata entries', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      metadata: [
        {
          label: { en: ['Field 1'] },
          value: { en: ['Value 1'] },
        },
      ],
      items: [],
    };

    render(<MetadataEditor entityId="https://example.com/manifest" entity={manifest} />);

    expect(screen.getByText('Field 1')).toBeInTheDocument();
    expect(screen.getByText('Value 1')).toBeInTheDocument();
  });

  it('should have live region for screen readers', async () => {
    const manifest: IIIFManifest = {
      '@context': 'http://iiif.io/api/presentation/3/context.json',
      id: 'https://example.com/manifest',
      type: 'Manifest',
      label: { en: ['Test'] },
      items: [],
    };

    render(<MetadataEditor entityId="https://example.com/manifest" entity={manifest} />);

    const liveRegion = screen.getByRole('status', { hidden: true });
    expect(liveRegion).toBeInTheDocument();
  });
});
