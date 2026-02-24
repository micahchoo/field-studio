/**
 * KeyboardShortcutsModal — Component tests
 *
 * Covers:
 *   - Does not render when isOpen=false
 *   - Renders shortcut groups when isOpen=true
 *   - Filters groups by mediaType (image vs media/audio/video)
 *   - Calls onClose when close button clicked
 *   - Calls onClose on Escape key press
 *   - Shows correct shortcut entries per group
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import KeyboardShortcutsModal from '../ui/molecules/KeyboardShortcutsModal.svelte';
import { SHORTCUT_GROUPS } from '../ui/molecules/KeyboardShortcutsModal.constants';
import { LIGHT_CLASSES } from '@/src/shared/lib/contextual-styles';

const cx = LIGHT_CLASSES;

describe('KeyboardShortcutsModal', () => {
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
  // Visibility
  // --------------------------------------------------------------------------

  it('does not render when isOpen=false', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: false, onClose: vi.fn(), cx, fieldMode: false },
    });
    // ModalDialog uses {#if open}, so nothing should be in the DOM
    const dialog = target.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('renders dialog when isOpen=true', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), cx, fieldMode: false },
    });
    const dialog = target.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
  });

  it('renders "Keyboard Shortcuts" title when open', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), cx, fieldMode: false },
    });
    expect(target.textContent).toContain('Keyboard Shortcuts');
  });

  // --------------------------------------------------------------------------
  // Group filtering by mediaType
  // --------------------------------------------------------------------------

  it('shows image groups (Navigation, Zoom, Rotation, Tools, General) for mediaType=image', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), mediaType: 'image', cx, fieldMode: false },
    });
    const headings = Array.from(target.querySelectorAll('h3')).map(h => h.textContent?.trim());
    expect(headings).toContain('Navigation');
    expect(headings).toContain('Zoom');
    expect(headings).toContain('Rotation & Flip');
    expect(headings).toContain('Tools');
    expect(headings).toContain('General');
    // Should NOT show media groups
    expect(headings).not.toContain('Playback');
    expect(headings).not.toContain('Volume & Speed');
  });

  it('shows media groups (Playback, Volume & Speed, General) for mediaType=audio', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), mediaType: 'audio', cx, fieldMode: false },
    });
    const headings = Array.from(target.querySelectorAll('h3')).map(h => h.textContent?.trim());
    expect(headings).toContain('Playback');
    expect(headings).toContain('Volume & Speed');
    expect(headings).toContain('General');
    // Should NOT show image groups
    expect(headings).not.toContain('Navigation');
    expect(headings).not.toContain('Zoom');
    expect(headings).not.toContain('Rotation & Flip');
    expect(headings).not.toContain('Tools');
  });

  it('shows media groups for mediaType=video', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), mediaType: 'video', cx, fieldMode: false },
    });
    const headings = Array.from(target.querySelectorAll('h3')).map(h => h.textContent?.trim());
    expect(headings).toContain('Playback');
    expect(headings).toContain('Volume & Speed');
    expect(headings).toContain('General');
  });

  it('shows only General group for mediaType=other', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), mediaType: 'other', cx, fieldMode: false },
    });
    const headings = Array.from(target.querySelectorAll('h3')).map(h => h.textContent?.trim());
    expect(headings).toEqual(['General']);
  });

  // --------------------------------------------------------------------------
  // Shortcut entries rendered correctly
  // --------------------------------------------------------------------------

  it('renders kbd elements for shortcut keys', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), mediaType: 'image', cx, fieldMode: false },
    });
    const kbds = target.querySelectorAll('kbd');
    // Should have many kbd elements for all the image shortcuts
    expect(kbds.length).toBeGreaterThan(10);
  });

  it('renders shortcut descriptions as dd elements', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), mediaType: 'image', cx, fieldMode: false },
    });
    const descriptions = target.querySelectorAll('dd');
    expect(descriptions.length).toBeGreaterThan(0);
    // Check a known description from the Navigation group
    const descTexts = Array.from(descriptions).map(d => d.textContent?.trim());
    expect(descTexts).toContain('Pan up');
    expect(descTexts).toContain('Reset view (home)');
  });

  it('renders dl grid for each group', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), mediaType: 'image', cx, fieldMode: false },
    });
    const dlElements = target.querySelectorAll('dl');
    // image groups: Navigation, Zoom, Rotation & Flip, Tools, General = 5
    expect(dlElements.length).toBe(5);
  });

  // --------------------------------------------------------------------------
  // Close behavior
  // --------------------------------------------------------------------------

  it('calls onClose when close button is clicked', () => {
    const handler = vi.fn();
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: handler, cx, fieldMode: false },
    });
    // ModalDialog renders a close button with aria-label="Close"
    const closeBtn = target.querySelector('[aria-label="Close"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key press', async () => {
    const handler = vi.fn();
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: handler, cx, fieldMode: false },
    });
    // ModalDialog registers the document-level keydown listener inside a $effect.
    // In happy-dom, effects may run asynchronously; flush microtasks first.
    await new Promise<void>(r => queueMicrotask(() => r()));
    flushSync();
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(event);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Footer
  // --------------------------------------------------------------------------

  it('renders footer with Esc instruction', () => {
    component = mount(KeyboardShortcutsModal, {
      target,
      props: { isOpen: true, onClose: vi.fn(), cx, fieldMode: false },
    });
    expect(target.textContent).toContain('Esc');
    expect(target.textContent).toContain('click outside to close');
  });

  // --------------------------------------------------------------------------
  // SHORTCUT_GROUPS export
  // --------------------------------------------------------------------------

  it('exports SHORTCUT_GROUPS array with 7 groups', () => {
    // Pure data test; no component mounted, so clear component ref to skip unmount
    component = undefined as unknown as Record<string, unknown>;
    expect(SHORTCUT_GROUPS).toBeDefined();
    expect(SHORTCUT_GROUPS.length).toBe(7);
  });

  it('has correct mediaType classification for each group', () => {
    // Pure data test; no component mounted
    component = undefined as unknown as Record<string, unknown>;
    const imageGroups = SHORTCUT_GROUPS.filter((g: { mediaType: string }) => g.mediaType === 'image');
    const mediaGroups = SHORTCUT_GROUPS.filter((g: { mediaType: string }) => g.mediaType === 'media');
    const allGroups = SHORTCUT_GROUPS.filter((g: { mediaType: string }) => g.mediaType === 'all');
    expect(imageGroups.length).toBe(4); // Navigation, Zoom, Rotation & Flip, Tools
    expect(mediaGroups.length).toBe(2); // Playback, Volume & Speed
    expect(allGroups.length).toBe(1);   // General
  });
});
