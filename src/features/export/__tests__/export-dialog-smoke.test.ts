/**
 * ExportDialog — smoke tests
 *
 * Purpose: verify the multi-step export wizard renders user-visible content:
 * dialog title, step label, format selection cards, Cancel button, and
 * format-specific labels. Tests both loaded vault and empty vault cases.
 *
 * External services (exportService, archivalPackageService, etc.) are
 * imported lazily inside async handlers — they are never called on mount,
 * so no mocking is required here.
 *
 * Pattern: mount -> flushSync -> assert visible text / ARIA roles -> unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ExportDialog from '../ui/organisms/ExportDialog.svelte';
import type { IIIFItem } from '@/src/shared/types';
import { vault } from '@/src/shared/stores/vault.svelte';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const cx = {
  surface: 'bg-nb-white',
  text: 'text-nb-black',
  accent: 'text-nb-blue',
  border: 'border-nb-black/10',
  divider: 'border-nb-black/10',
  headerBg: 'bg-nb-cream',
  textMuted: 'text-nb-black/40',
  input: '',
  label: '',
  active: '',
  inactive: '',
  warningBg: '',
};

function makeCollection(): IIIFItem {
  return {
    id: 'collection-1',
    type: 'Collection',
    label: { en: ['Test Collection'] },
    items: [],
  } as unknown as IIIFItem;
}

// ── Test lifecycle ────────────────────────────────────────────────────────────

describe('ExportDialog smoke tests', () => {
  let target: HTMLDivElement;
  let instance: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
    instance = undefined;
    vault.load(makeCollection());
  });

  afterEach(() => {
    if (instance) unmount(instance);
    target.remove();
    vi.clearAllMocks();
  });

  it('renders "Archive Export" dialog title and step 1 label', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();

    expect(target.textContent).toContain('Archive Export');
    expect(target.textContent).toContain('Step 1: Format Selection');
  });

  it('renders the dialog with proper ARIA role and labelledby', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();

    const dialog = target.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBe('export-dialog-title');
  });

  it('renders all five export format options', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();

    expect(target.textContent).toContain('Canopy IIIF Site');
    expect(target.textContent).toContain('Raw IIIF');
    expect(target.textContent).toContain('OCFL Package');
    expect(target.textContent).toContain('BagIt Bag');
    expect(target.textContent).toContain('Activity Log');
  });

  it('renders format cards as radio buttons in a radiogroup', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();

    const radiogroup = target.querySelector('[role="radiogroup"]');
    expect(radiogroup).not.toBeNull();

    const radios = target.querySelectorAll('[role="radio"]');
    expect(radios.length).toBeGreaterThanOrEqual(5);
  });

  it('renders Cancel button on the config step', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();

    const buttons = target.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(buttonTexts).toContain('Cancel');
  });

  it('renders a close button with aria-label "Close dialog"', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();

    const closeButton = target.querySelector('[aria-label="Close dialog"]');
    expect(closeButton).not.toBeNull();
  });

  it('renders "Digital Preservation" section heading for archival formats', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();

    expect(target.textContent).toContain('Digital Preservation');
  });

  it('renders without crashing when vault is empty (no manifest loaded)', () => {
    vault.load({
      id: 'empty',
      type: 'Collection',
      label: { en: ['Empty'] },
      items: [],
    } as unknown as IIIFItem);

    instance = mount(ExportDialog, {
      target,
      props: {
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();

    // Should still render dialog title and format options
    expect(target.textContent).toContain('Archive Export');
    expect(target.textContent).toContain('Canopy IIIF Site');
    expect(target.textContent).toContain('Cancel');
  });

  it('renders in field mode without crashing and still shows export dialog', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        onClose: vi.fn(),
        cx,
        fieldMode: true,
      },
    });
    flushSync();

    expect(target.textContent).toContain('Archive Export');
    expect(target.textContent).toContain('Step 1: Format Selection');
  });
});
