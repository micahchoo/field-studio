/**
 * SearchView — smoke tests
 *
 * Purpose: verify the component mounts without throwing when given
 * realistic minimal props. Does NOT assert specific text or styling —
 * only guards against crashes (undefined property access, missing
 * store initialisation, etc.).
 *
 * Pattern: mount → flushSync → assert non-empty DOM → unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import SearchView from '../ui/organisms/SearchView.svelte';
import type { IIIFItem } from '@/src/shared/types';

// ── Mocks ────────────────────────────────────────────────────────────────────
// searchService accesses vault state outside a Svelte component tree — mock it
// so that buildIndexEntries returns an empty array without side-effects.
vi.mock('@/src/shared/services/searchService', () => ({
  buildIndexEntries: vi.fn(() => []),
}));

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

const t = (key: string) => key;

function makeManifest(id = 'manifest-1'): IIIFItem {
  return {
    id,
    type: 'Manifest',
    label: { en: ['Test Manifest'] },
    items: [],
  } as unknown as IIIFItem;
}

// ── Test lifecycle ────────────────────────────────────────────────────────────

describe('SearchView smoke tests', () => {
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

  it('mounts with null root without crashing', () => {
    instance = mount(SearchView, {
      target,
      props: {
        root: null,
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts with a manifest root without crashing', () => {
    instance = mount(SearchView, {
      target,
      props: {
        root: makeManifest(),
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
        onRevealMap: vi.fn(),
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });

  it('mounts in field mode without crashing', () => {
    instance = mount(SearchView, {
      target,
      props: {
        root: makeManifest(),
        cx,
        fieldMode: true,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();
    expect(target.firstChild).not.toBeNull();
  });
});
