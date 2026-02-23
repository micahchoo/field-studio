/**
 * ViewerEmptyState — Component tests
 *
 * Covers:
 *   - Shows "has content" workflow when hasContent=true
 *   - Shows "empty" workflow when hasContent=false
 *   - Calls onGoToArchive when "Go to Archive" / "Browse Archive" button clicked
 *   - Calls onImport when "Import" button clicked
 *   - Correct button labels for each state
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import ViewerEmptyState from '../ui/molecules/ViewerEmptyState.svelte';
import { LIGHT_CLASSES } from '@/src/shared/lib/contextual-styles';

const cx = LIGHT_CLASSES;

/** Minimal t() that returns the key as the translated term */
const mockT = (key: string) => key;

describe('ViewerEmptyState', () => {
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
  // Has content workflow (hasContent=true)
  // --------------------------------------------------------------------------

  it('shows "has content" description when hasContent=true', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: true, cx, fieldMode: false },
    });
    // Description mentions "choose a canvas from the archive"
    expect(target.textContent).toContain('Choose a canvas from the archive to view it here');
  });

  it('shows "Browse Archive" button when hasContent=true and onGoToArchive provided', () => {
    const handler = vi.fn();
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: true, onGoToArchive: handler, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const browseBtn = Array.from(buttons).find(b => b.textContent?.includes('Browse Archive'));
    expect(browseBtn).toBeTruthy();
  });

  it('shows "Import More" button when hasContent=true and onImport provided', () => {
    const handler = vi.fn();
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: true, onImport: handler, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const importBtn = Array.from(buttons).find(b => b.textContent?.includes('Import More'));
    expect(importBtn).toBeTruthy();
  });

  it('shows has-content steps (folder_open, touch_app, visibility icons)', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: true, cx, fieldMode: false },
    });
    expect(target.textContent).toContain('Go to Archive to see your content');
    expect(target.textContent).toContain('Select a canvas to view it');
    expect(target.textContent).toContain('See the full image and metadata here');
  });

  it('shows has-content tip about double-click', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: true, cx, fieldMode: false },
    });
    expect(target.textContent).toContain('double-click any canvas');
  });

  // --------------------------------------------------------------------------
  // Empty workflow (hasContent=false)
  // --------------------------------------------------------------------------

  it('shows "empty" description when hasContent=false', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: false, cx, fieldMode: false },
    });
    expect(target.textContent).toContain('Your archive is empty');
    expect(target.textContent).toContain('Import files to get started');
  });

  it('shows "Import Your First Files" button when hasContent=false and onImport provided', () => {
    const handler = vi.fn();
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: false, onImport: handler, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const importBtn = Array.from(buttons).find(b => b.textContent?.includes('Import Your First Files'));
    expect(importBtn).toBeTruthy();
  });

  it('shows "Go to Archive" button when hasContent=false and onGoToArchive provided', () => {
    const handler = vi.fn();
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: false, onGoToArchive: handler, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const goBtn = Array.from(buttons).find(b => b.textContent?.includes('Go to Archive'));
    expect(goBtn).toBeTruthy();
  });

  it('shows empty-state steps (upload, folder, visibility icons)', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: false, cx, fieldMode: false },
    });
    expect(target.textContent).toContain('Add photos, videos, or documents');
    expect(target.textContent).toContain('Arrange into albums and groups');
    expect(target.textContent).toContain('Open items in the viewer');
  });

  it('shows empty-state tip about drag and drop', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: false, cx, fieldMode: false },
    });
    expect(target.textContent).toContain('Drag and drop a folder');
  });

  // --------------------------------------------------------------------------
  // Button callbacks
  // --------------------------------------------------------------------------

  it('calls onGoToArchive when archive button clicked (hasContent=true)', () => {
    const handler = vi.fn();
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: true, onGoToArchive: handler, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const browseBtn = Array.from(buttons).find(b => b.textContent?.includes('Browse Archive'));
    expect(browseBtn).toBeTruthy();
    browseBtn!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onGoToArchive when archive button clicked (hasContent=false)', () => {
    const handler = vi.fn();
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: false, onGoToArchive: handler, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const goBtn = Array.from(buttons).find(b => b.textContent?.includes('Go to Archive'));
    expect(goBtn).toBeTruthy();
    goBtn!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onImport when import button clicked (hasContent=false)', () => {
    const handler = vi.fn();
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: false, onImport: handler, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const importBtn = Array.from(buttons).find(b => b.textContent?.includes('Import Your First Files'));
    expect(importBtn).toBeTruthy();
    importBtn!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onImport when "Import More" button clicked (hasContent=true)', () => {
    const handler = vi.fn();
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: true, onImport: handler, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const importBtn = Array.from(buttons).find(b => b.textContent?.includes('Import More'));
    expect(importBtn).toBeTruthy();
    importBtn!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // No callbacks: buttons not rendered
  // --------------------------------------------------------------------------

  it('does not show import button when onImport is not provided (hasContent=false)', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: false, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const importBtn = Array.from(buttons).find(b => b.textContent?.includes('Import'));
    expect(importBtn).toBeUndefined();
  });

  it('does not show archive button when onGoToArchive is not provided', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, hasContent: true, cx, fieldMode: false },
    });
    const buttons = target.querySelectorAll('button');
    const archiveBtn = Array.from(buttons).find(b => b.textContent?.includes('Archive'));
    expect(archiveBtn).toBeUndefined();
  });

  // --------------------------------------------------------------------------
  // Custom message
  // --------------------------------------------------------------------------

  it('uses custom message as title when provided', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, message: 'Custom empty message', cx, fieldMode: false },
    });
    expect(target.textContent).toContain('Custom empty message');
  });

  it('uses default title "Select a Canvas" when no message', () => {
    component = mount(ViewerEmptyState, {
      target,
      props: { t: mockT, cx, fieldMode: false },
    });
    expect(target.textContent).toContain('Select a Canvas');
  });
});
