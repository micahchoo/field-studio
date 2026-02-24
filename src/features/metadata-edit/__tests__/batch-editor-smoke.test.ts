/**
 * BatchEditor — smoke tests
 *
 * Purpose: verify the bulk-edit organism renders user-visible content:
 * dialog title with item count, tab labels (Rename/Metadata/Pattern Detector),
 * input fields, action buttons (Apply Changes, Cancel), and the Preview panel.
 *
 * BatchEditor uses localStorage for its rollback snapshot — happy-dom
 * provides a stub implementation that satisfies getItem/setItem/removeItem calls.
 *
 * Pattern: mount -> flushSync -> assert visible text / ARIA roles -> unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import BatchEditor from '../ui/organisms/BatchEditor.svelte';
import type { IIIFItem } from '@/src/shared/types';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeManifest(id = 'manifest-1'): IIIFItem {
  return {
    id,
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [
      {
        id: 'canvas-1',
        type: 'Canvas',
        label: { en: ['Canvas One'] },
        items: [],
      },
      {
        id: 'canvas-2',
        type: 'Canvas',
        label: { en: ['Canvas Two'] },
        items: [],
      },
      {
        id: 'canvas-3',
        type: 'Canvas',
        label: { en: ['Canvas Three'] },
        items: [],
      },
    ],
  } as unknown as IIIFItem;
}

// ── Test lifecycle ────────────────────────────────────────────────────────────

describe('BatchEditor smoke tests', () => {
  let target: HTMLDivElement;
  let instance: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = undefined;
  });

  afterEach(() => {
    if (instance) unmount(instance);
    target.remove();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders "Batch Archive Toolkit" heading and item count', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Batch Archive Toolkit');
    expect(target.textContent).toContain('Editing 1 Items');
  });

  it('renders the dialog with proper ARIA role and label', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    const dialog = target.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-label')).toBe('Batch Archive Toolkit');
  });

  it('renders all three tab labels: Rename, Metadata, and Pattern Detector', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1', 'canvas-2'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Rename');
    expect(target.textContent).toContain('Metadata');
    expect(target.textContent).toContain('Pattern Detector');
  });

  it('renders the "Rename Pattern" label and input on the default tab', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Rename Pattern');
    const renameInput = target.querySelector('#rename-pattern-input') as HTMLInputElement;
    expect(renameInput).not.toBeNull();
    // Default pattern is '{orig}'
    expect(renameInput?.value).toBe('{orig}');
  });

  it('renders token insertion buttons for {orig} and {nnn}', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Original Name');
    expect(target.textContent).toContain('{orig}');
    expect(target.textContent).toContain('Index (001...)');
    expect(target.textContent).toContain('{nnn}');
  });

  it('renders "Apply Changes" and "Cancel" action buttons', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    const buttons = target.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(buttonTexts.some((t) => t?.includes('Apply Changes'))).toBe(true);
    expect(buttonTexts).toContain('Cancel');
  });

  it('renders a close button with aria-label "Close batch editor"', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    const closeBtn = target.querySelector('[aria-label="Close batch editor"]');
    expect(closeBtn).not.toBeNull();
  });

  it('renders "Preview" panel heading', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Preview');
  });

  it('displays selected item labels in the preview panel', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['canvas-1', 'canvas-2', 'canvas-3'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Canvas One');
    expect(target.textContent).toContain('Canvas Two');
    expect(target.textContent).toContain('Canvas Three');
    expect(target.textContent).toContain('Editing 3 Items');
  });

  it('renders without crashing when ids array is empty (zero selection)', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: [],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Batch Archive Toolkit');
    expect(target.textContent).toContain('Editing 0 Items');
    // Should still show tabs and action buttons
    expect(target.textContent).toContain('Rename');
    expect(target.textContent).toContain('Cancel');
  });

  it('renders without crashing when selected IDs do not match any item in root', () => {
    instance = mount(BatchEditor, {
      target,
      props: {
        ids: ['nonexistent-id-1', 'nonexistent-id-2'],
        root: makeManifest(),
        onApply: vi.fn(),
        onClose: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Batch Archive Toolkit');
    expect(target.textContent).toContain('Editing 2 Items');
    // Preview should be empty but not crashing
    expect(target.textContent).toContain('Preview');
  });
});
