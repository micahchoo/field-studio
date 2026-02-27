/**
 * SearchView — smoke tests
 *
 * Purpose: verify the component renders user-visible content: the "Search"
 * heading, search input placeholder, filter pills, empty-state tips, and
 * tip keywords. Tests both loaded vault and empty vault scenarios, plus
 * field mode.
 *
 * Pattern: mount -> flushSync -> assert visible text / ARIA roles -> unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import SearchView from '../ui/organisms/SearchView.svelte';
import type { IIIFItem } from '@/src/shared/types';
import { vault } from '@/src/shared/stores/vault.svelte';

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
    vault.load(makeManifest());
  });

  afterEach(() => {
    if (instance) unmount(instance);
    target.remove();
    vi.clearAllMocks();
  });

  it('renders the "Search" heading', () => {
    instance = mount(SearchView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Search');
  });

  it('renders the search input with placeholder text', () => {
    instance = mount(SearchView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();

    const searchInput = target.querySelector('input[placeholder*="Search"]');
    expect(searchInput).not.toBeNull();
  });

  it('renders a search region with role="search"', () => {
    instance = mount(SearchView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();

    const searchRegion = target.querySelector('[role="search"]');
    expect(searchRegion).not.toBeNull();
  });

  it('renders filter pills with radio role for All, Manifest, Canvas, and Annotation', () => {
    instance = mount(SearchView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();

    const radios = target.querySelectorAll('[role="radio"]');
    const radioTexts = Array.from(radios).map((r) => r.textContent?.trim());
    expect(radioTexts).toContain('All');
    expect(radioTexts).toContain('Manifest');
    expect(radioTexts).toContain('Canvas');
    expect(radioTexts).toContain('Annotation');
  });

  it('renders the "Search Your Archive" empty-state heading when there is no query', () => {
    instance = mount(SearchView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Search Your Archive');
    expect(target.textContent).toContain('Find items by name, metadata, or content');
  });

  it('renders search tip keywords when no query is active', () => {
    instance = mount(SearchView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();

    // Tips: sunset, archaeological site, 2017, portrait
    expect(target.textContent).toContain('sunset');
    expect(target.textContent).toContain('archaeological site');
    expect(target.textContent).toContain('2017');
    expect(target.textContent).toContain('portrait');
  });

  it('renders without crashing when vault has empty collection', () => {
    vault.load({
      id: 'empty-collection',
      type: 'Collection',
      label: { en: ['Empty'] },
      items: [],
    } as unknown as IIIFItem);

    instance = mount(SearchView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();

    // Should still show Search heading and empty state
    expect(target.textContent).toContain('Search');
    expect(target.textContent).toContain('Search Your Archive');
  });

  it('renders filter pill radiogroup with proper aria-label', () => {
    instance = mount(SearchView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();

    const radiogroup = target.querySelector('[role="radiogroup"]');
    expect(radiogroup).not.toBeNull();
    expect(radiogroup?.getAttribute('aria-label')).toBe('Result type filter');
  });

  it('renders in field mode without crashing and still shows Search heading', () => {
    instance = mount(SearchView, {
      target,
      props: {
        cx,
        fieldMode: true,
        t,
        onSelect: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Search');
    // Filter pills should still be present
    const radios = target.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(4);
  });
});
