/**
 * ExportDialog — smoke tests
 *
 * Purpose: verify the multi-step export wizard mounts without crashing.
 * The dialog owns all step state internally; the smoke test only needs
 * to supply the four required props.
 *
 * External services (exportService, archivalPackageService, etc.) are
 * imported lazily inside async handlers — they are never called on mount,
 * so no mocking is required here.
 *
 * Pattern: mount → flushSync → assert non-empty DOM → unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ExportDialog from '../ui/organisms/ExportDialog.svelte';
import type { IIIFItem } from '@/src/shared/types';

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
  });

  afterEach(() => {
    if (instance) unmount(instance);
    target.remove();
    vi.clearAllMocks();
  });

  it('mounts with a collection root without crashing', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        root: makeCollection(),
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with null root without crashing', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        root: null,
        onClose: vi.fn(),
        cx,
        fieldMode: false,
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts in field mode without crashing', () => {
    instance = mount(ExportDialog, {
      target,
      props: {
        root: makeCollection(),
        onClose: vi.fn(),
        cx,
        fieldMode: true,
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });
});
