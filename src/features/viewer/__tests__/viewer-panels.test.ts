/**
 * ViewerPanels — Component tests
 *
 * Covers:
 *   - Does not render panel when showSearchPanel=false
 *   - Renders panel with "Search" heading when showSearchPanel=true
 *   - Calls onCloseSearchPanel on close button click
 *   - Calls onCloseSearchPanel on Escape key
 *   - Correct ARIA attributes on the panel
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import ViewerPanels from '../ui/molecules/ViewerPanels.svelte';
import type { IIIFManifest } from '@/src/shared/types';
import { LIGHT_CLASSES } from '@/src/shared/lib/contextual-styles';

const cx = LIGHT_CLASSES;

/** Minimal props shared by most tests */
function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    manifest: { id: 'test-manifest', type: 'Manifest' } as unknown as IIIFManifest,
    searchService: { id: 'https://example.com/search', type: 'SearchService2' },
    showSearchPanel: false,
    onCloseSearchPanel: vi.fn(),
    cx,
    fieldMode: false,
    ...overrides,
  };
}

describe('ViewerPanels', () => {
  let target: HTMLElement;
  let component: Record<string, unknown>;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (component) unmount(component);
    target.remove();
  });

  // --------------------------------------------------------------------------
  // Conditional display
  // --------------------------------------------------------------------------

  it('does not render panel when showSearchPanel=false', () => {
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: false }),
    });
    const panel = target.querySelector('[role="complementary"]');
    expect(panel).toBeNull();
  });

  it('renders panel when showSearchPanel=true', async () => {
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true }),
    });
    // Transition uses slide; after test-setup microtask the element should exist
    await new Promise<void>(r => queueMicrotask(() => r()));
    const panel = target.querySelector('[role="complementary"]');
    expect(panel).toBeTruthy();
  });

  it('panel has correct aria-label', async () => {
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true }),
    });
    await new Promise<void>(r => queueMicrotask(() => r()));
    const panel = target.querySelector('[role="complementary"]');
    expect(panel!.getAttribute('aria-label')).toBe('Search panel');
  });

  // --------------------------------------------------------------------------
  // Header content
  // --------------------------------------------------------------------------

  it('renders "Search" heading in panel header', async () => {
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true }),
    });
    await new Promise<void>(r => queueMicrotask(() => r()));
    const heading = target.querySelector('h3');
    expect(heading).toBeTruthy();
    expect(heading!.textContent!.trim()).toBe('Search');
  });

  // --------------------------------------------------------------------------
  // Close button callback
  // --------------------------------------------------------------------------

  it('calls onCloseSearchPanel when close button is clicked', async () => {
    const handler = vi.fn();
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true, onCloseSearchPanel: handler }),
    });
    await new Promise<void>(r => queueMicrotask(() => r()));
    const closeBtn = target.querySelector('[aria-label="Close search panel"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Escape key
  // --------------------------------------------------------------------------

  it('calls onCloseSearchPanel on Escape key within panel', async () => {
    const handler = vi.fn();
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true, onCloseSearchPanel: handler }),
    });
    await new Promise<void>(r => queueMicrotask(() => r()));
    const panel = target.querySelector('[role="complementary"]') as HTMLElement;
    expect(panel).toBeTruthy();
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    panel.dispatchEvent(escapeEvent);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call onCloseSearchPanel for non-Escape keys', async () => {
    const handler = vi.fn();
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true, onCloseSearchPanel: handler }),
    });
    await new Promise<void>(r => queueMicrotask(() => r()));
    const panel = target.querySelector('[role="complementary"]') as HTMLElement;
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    panel.dispatchEvent(enterEvent);
    expect(handler).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Panel styling
  // --------------------------------------------------------------------------

  it('renders panel with complementary role and correct label', async () => {
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true }),
    });
    await new Promise<void>(r => queueMicrotask(() => r()));
    const panel = target.querySelector('[role="complementary"]') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('aria-label')).toBe('Search panel');
  });

  it('renders search panel with heading in fieldMode', async () => {
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true, fieldMode: true }),
    });
    await new Promise<void>(r => queueMicrotask(() => r()));
    const panel = target.querySelector('[role="complementary"]') as HTMLElement;
    expect(panel).toBeTruthy();
    const heading = target.querySelector('h3');
    expect(heading!.textContent!.trim()).toBe('Search');
  });

  it('renders search panel with heading in light mode', async () => {
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true, fieldMode: false }),
    });
    await new Promise<void>(r => queueMicrotask(() => r()));
    const panel = target.querySelector('[role="complementary"]') as HTMLElement;
    expect(panel).toBeTruthy();
    const heading = target.querySelector('h3');
    expect(heading!.textContent!.trim()).toBe('Search');
  });

  // --------------------------------------------------------------------------
  // No manifest
  // --------------------------------------------------------------------------

  it('does not render ViewerSearchPanel body when manifest is null', async () => {
    component = mount(ViewerPanels, {
      target,
      props: baseProps({ showSearchPanel: true, manifest: null }),
    });
    await new Promise<void>(r => queueMicrotask(() => r()));
    // The panel container still renders but the body should be empty
    const panel = target.querySelector('[role="complementary"]');
    expect(panel).toBeTruthy();
    // ViewerSearchPanel is only rendered inside {#if manifest}, so the panel
    // should not contain any search input or results
    const searchInput = panel!.querySelector('input[type="search"]') || panel!.querySelector('input[type="text"]');
    expect(searchInput).toBeNull();
  });
});
