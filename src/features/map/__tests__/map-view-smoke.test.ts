/**
 * MapView — smoke tests
 *
 * Purpose: verify the component renders user-visible content: the "Map"
 * heading, zoom controls, and the "No geotagged items" empty state when
 * the collection has no geo data. Tests both standard and field modes.
 *
 * MapView uses a pure CSS/div positioning approach with no external map
 * library, so happy-dom is sufficient.
 *
 * Pattern: mount -> flushSync -> assert visible text / ARIA roles -> unmount.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import MapView from '../ui/organisms/MapView.svelte';
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

const t = (key: string, fallback?: string) => fallback ?? key;

function makeCollection(): IIIFItem {
  return {
    id: 'collection-1',
    type: 'Collection',
    label: { en: ['Test Collection'] },
    items: [],
  } as unknown as IIIFItem;
}

// ── Test lifecycle ────────────────────────────────────────────────────────────

describe('MapView smoke tests', () => {
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

  it('renders the "Map" heading text', () => {
    instance = mount(MapView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        isAdvanced: false,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Map');
  });

  it('renders zoom-in, reset, and zoom-out buttons with proper aria-labels', () => {
    instance = mount(MapView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        isAdvanced: false,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    const zoomIn = target.querySelector('[aria-label="Zoom in"]');
    const zoomOut = target.querySelector('[aria-label="Zoom out"]');
    const resetZoom = target.querySelector('[aria-label="Reset zoom"]');

    expect(zoomIn).not.toBeNull();
    expect(zoomOut).not.toBeNull();
    expect(resetZoom).not.toBeNull();
  });

  it('displays "No geotagged items" empty state when collection has no geo data', () => {
    instance = mount(MapView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        isAdvanced: false,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('No geotagged items');
    expect(target.textContent).toContain('Add GPS coordinates to canvas metadata to see them on the map.');
  });

  it('renders "Reset" button text in the zoom controls', () => {
    instance = mount(MapView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        isAdvanced: false,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    const buttons = target.querySelectorAll('button');
    const buttonTexts = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(buttonTexts).toContain('Reset');
  });

  it('renders in advanced mode without crashing and shows empty state', () => {
    instance = mount(MapView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        isAdvanced: true,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    // With empty collection, even in advanced mode we see empty state
    expect(target.textContent).toContain('No geotagged items');
  });

  it('renders in field mode without crashing and still shows map heading', () => {
    instance = mount(MapView, {
      target,
      props: {
        cx,
        fieldMode: true,
        t,
        isAdvanced: false,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    expect(target.textContent).toContain('Map');
    expect(target.textContent).toContain('No geotagged items');
  });

  it('handles a manifest with no items (no canvases to extract geo data from)', () => {
    vault.load({
      id: 'manifest-empty',
      type: 'Manifest',
      label: { en: ['Empty Manifest'] },
      items: [],
    } as unknown as IIIFItem);

    instance = mount(MapView, {
      target,
      props: {
        cx,
        fieldMode: false,
        t,
        isAdvanced: false,
        onSelect: vi.fn(),
        onSwitchView: vi.fn(),
      },
    });
    flushSync();

    // Should show empty state
    expect(target.textContent).toContain('No geotagged items');
  });
});
