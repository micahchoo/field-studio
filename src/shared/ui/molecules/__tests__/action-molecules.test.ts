/**
 * Action & Display Molecule Tests
 *
 * Tests StatusBadge, FacetPill, ResourceTypeBadge, MuseumLabel,
 * PipelineBanner, ContextMenuItem, Toast, CollectionCard,
 * CollectionCardDropOverlay, EmptyState, ViewToggle, TabBar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from 'svelte';

import StatusBadge from '../StatusBadge.svelte';
import FacetPill from '../FacetPill.svelte';
import ResourceTypeBadge from '../ResourceTypeBadge.svelte';
import MuseumLabel from '../MuseumLabel.svelte';
import PipelineBanner from '../PipelineBanner.svelte';
import ContextMenuItem from '../ContextMenuItem.svelte';
import Toast from '../Toast.svelte';
import CollectionCard from '../CollectionCard.svelte';
import CollectionCardDropOverlay from '../CollectionCardDropOverlay.svelte';
import EmptyState from '../EmptyState.svelte';
import ViewToggle from '../ViewToggle.svelte';
import TabBar from '../TabBar.svelte';
// TestHost available but not needed for current tests (all mount directly)

 
const cx = {} as any;

let target: HTMLDivElement;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  target.remove();
});

// ============================================================================
// StatusBadge
// ============================================================================

describe('StatusBadge', () => {
  it('renders label text', () => {
    mount(StatusBadge, { target, props: { label: 'Active', variant: 'success' } });
    expect(target.textContent).toContain('Active');
  });

  it('applies success variant classes', () => {
    mount(StatusBadge, { target, props: { label: 'OK', variant: 'success' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-green-100');
    expect(span!.className).toContain('text-green-800');
    expect(span!.className).toContain('border-green-400');
  });

  it('applies error variant classes', () => {
    mount(StatusBadge, { target, props: { label: 'Fail', variant: 'error' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-red-100');
    expect(span!.className).toContain('text-red-800');
  });

  it('applies warning variant classes', () => {
    mount(StatusBadge, { target, props: { label: 'Warn', variant: 'warning' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-yellow-100');
  });

  it('applies info variant classes', () => {
    mount(StatusBadge, { target, props: { label: 'Info', variant: 'info' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-blue-100');
  });

  it('applies neutral variant classes', () => {
    mount(StatusBadge, { target, props: { label: 'Neutral', variant: 'neutral' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-gray-100');
  });

  it('renders icon when provided', () => {
    mount(StatusBadge, { target, props: { label: 'OK', variant: 'success', icon: 'check' } });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('check');
  });

  it('has neobrutalist styling', () => {
    mount(StatusBadge, { target, props: { label: 'NB', variant: 'info' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('border-2');
    expect(span!.className).toContain('font-mono');
    expect(span!.className).toContain('uppercase');
    expect(span!.className).toContain('font-bold');
  });

  it('applies custom class', () => {
    mount(StatusBadge, { target, props: { label: 'T', variant: 'info', class: 'my-class' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('my-class');
  });
});

// ============================================================================
// FacetPill
// ============================================================================

describe('FacetPill', () => {
  it('renders label text', () => {
    mount(FacetPill, { target, props: { label: 'Color: Red', onRemove: () => {}, cx } });
    expect(target.textContent).toContain('Color: Red');
  });

  it('renders remove button', () => {
    mount(FacetPill, { target, props: { label: 'Tag', onRemove: () => {}, cx } });
    const btn = target.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn!.getAttribute('aria-label')).toContain('Remove');
    expect(btn!.getAttribute('aria-label')).toContain('Tag');
  });

  it('calls onRemove when button clicked', () => {
    const onRemove = vi.fn();
    mount(FacetPill, { target, props: { label: 'X', onRemove, cx } });
    const btn = target.querySelector('button') as HTMLElement;
    btn.click();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('has neobrutalist styling', () => {
    mount(FacetPill, { target, props: { label: 'NB', onRemove: () => {}, cx } });
    const outer = target.querySelector('span');
    expect(outer!.className).toContain('border-2');
    expect(outer!.className).toContain('font-mono');
  });

  it('renders close icon', () => {
    mount(FacetPill, { target, props: { label: 'X', onRemove: () => {}, cx } });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('close');
  });
});

// ============================================================================
// ResourceTypeBadge
// ============================================================================

describe('ResourceTypeBadge', () => {
  it('renders type text', () => {
    mount(ResourceTypeBadge, { target, props: { type: 'Collection' } });
    expect(target.textContent).toContain('Collection');
  });

  it('applies Collection purple classes', () => {
    mount(ResourceTypeBadge, { target, props: { type: 'Collection' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-purple-100');
    expect(span!.className).toContain('text-purple-800');
  });

  it('applies Manifest blue classes', () => {
    mount(ResourceTypeBadge, { target, props: { type: 'Manifest' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-blue-100');
  });

  it('applies Canvas green classes', () => {
    mount(ResourceTypeBadge, { target, props: { type: 'Canvas' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-green-100');
  });

  it('applies Range orange classes', () => {
    mount(ResourceTypeBadge, { target, props: { type: 'Range' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-orange-100');
  });

  it('applies Annotation pink classes', () => {
    mount(ResourceTypeBadge, { target, props: { type: 'Annotation' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-pink-100');
  });

  it('falls back to gray for unknown type', () => {
    mount(ResourceTypeBadge, { target, props: { type: 'Unknown' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('bg-gray-100');
  });

  it('has neobrutalist styling', () => {
    mount(ResourceTypeBadge, { target, props: { type: 'Manifest' } });
    const span = target.querySelector('span');
    expect(span!.className).toContain('border-2');
    expect(span!.className).toContain('font-mono');
    expect(span!.className).toContain('font-bold');
    expect(span!.className).toContain('uppercase');
  });
});

// ============================================================================
// MuseumLabel
// ============================================================================

describe('MuseumLabel', () => {
  it('renders title', () => {
    mount(MuseumLabel, { target, props: { title: 'Mona Lisa' } });
    const h3 = target.querySelector('h3');
    expect(h3).toBeTruthy();
    expect(h3!.textContent).toBe('Mona Lisa');
  });

  it('renders date when provided', () => {
    mount(MuseumLabel, { target, props: { title: 'Art', date: '1503-1519' } });
    expect(target.textContent).toContain('1503-1519');
  });

  it('does not render date when not provided', () => {
    mount(MuseumLabel, { target, props: { title: 'Art' } });
    const paras = target.querySelectorAll('p');
    // Only title, no date paragraph
    expect(paras.length).toBe(0);
  });

  it('renders description when provided', () => {
    mount(MuseumLabel, { target, props: { title: 'Art', description: 'Oil on wood' } });
    expect(target.textContent).toContain('Oil on wood');
  });

  it('renders attribution when provided', () => {
    mount(MuseumLabel, { target, props: { title: 'Art', attribution: 'Louvre Museum' } });
    expect(target.textContent).toContain('Louvre Museum');
  });

  it('has neobrutalist styling', () => {
    mount(MuseumLabel, { target, props: { title: 'Test' } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('bg-nb-cream');
    expect(container!.className).toContain('border-4');
    expect(container!.className).toContain('shadow-brutal');
  });

  it('title has museum label typography', () => {
    mount(MuseumLabel, { target, props: { title: 'Label' } });
    const h3 = target.querySelector('h3');
    expect(h3!.className).toContain('font-bold');
    expect(h3!.className).toContain('uppercase');
    expect(h3!.className).toContain('font-mono');
  });
});

// ============================================================================
// PipelineBanner
// ============================================================================

describe('PipelineBanner', () => {
  it('renders status text', () => {
    mount(PipelineBanner, { target, props: { progress: 50, status: 'Processing...', cx } });
    expect(target.textContent).toContain('Processing...');
  });

  it('renders progress percentage', () => {
    mount(PipelineBanner, { target, props: { progress: 75, status: 'Working', cx } });
    expect(target.textContent).toContain('75%');
  });

  it('clamps progress to 0-100', () => {
    mount(PipelineBanner, { target, props: { progress: 150, status: 'Over', cx } });
    expect(target.textContent).toContain('100%');
  });

  it('clamps negative progress to 0', () => {
    mount(PipelineBanner, { target, props: { progress: -20, status: 'Under', cx } });
    expect(target.textContent).toContain('0%');
  });

  it('applies processing variant by default', () => {
    mount(PipelineBanner, { target, props: { progress: 50, status: 'Test', cx } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('bg-blue-50');
  });

  it('applies success variant', () => {
    mount(PipelineBanner, { target, props: { progress: 100, status: 'Done', variant: 'success', cx } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('bg-green-50');
  });

  it('applies error variant', () => {
    mount(PipelineBanner, { target, props: { progress: 30, status: 'Failed', variant: 'error', cx } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('bg-red-50');
  });

  it('renders cancel button when processing variant and onCancel provided', () => {
    const onCancel = vi.fn();
    mount(PipelineBanner, { target, props: { progress: 50, status: 'Working', onCancel, cx } });
    const buttons = target.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('does not render cancel button for success variant', () => {
    mount(PipelineBanner, { target, props: { progress: 100, status: 'Done', variant: 'success', onCancel: () => {}, cx } });
    // Cancel should not appear on success variant
    const closeIcons = target.querySelectorAll('.material-icons');
    const closeIcon = Array.from(closeIcons).find(i => i.textContent === 'close');
    expect(closeIcon).toBeFalsy();
  });

  it('renders progress bar', () => {
    mount(PipelineBanner, { target, props: { progress: 60, status: 'Working', cx } });
    // The progress bar div should have width style
    const progressBar = target.querySelector('.h-full');
    expect(progressBar).toBeTruthy();
    const style = (progressBar as HTMLElement).getAttribute('style');
    expect(style).toContain('60%');
  });
});

// ============================================================================
// ContextMenuItem
// ============================================================================

describe('ContextMenuItem', () => {
  it('renders as button with role="menuitem"', () => {
    mount(ContextMenuItem, { target, props: { label: 'Copy', onclick: () => {}, cx } });
    const btn = target.querySelector('[role="menuitem"]');
    expect(btn).toBeTruthy();
    expect(btn!.tagName).toBe('BUTTON');
  });

  it('renders label text', () => {
    mount(ContextMenuItem, { target, props: { label: 'Paste', onclick: () => {}, cx } });
    expect(target.textContent).toContain('Paste');
  });

  it('renders icon when provided', () => {
    mount(ContextMenuItem, { target, props: { label: 'Edit', icon: 'edit', onclick: () => {}, cx } });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('edit');
  });

  it('renders shortcut when provided', () => {
    mount(ContextMenuItem, { target, props: { label: 'Save', shortcut: '⌘S', onclick: () => {}, cx } });
    expect(target.textContent).toContain('⌘S');
  });

  it('applies destructive styles', () => {
    mount(ContextMenuItem, { target, props: { label: 'Delete', destructive: true, onclick: () => {}, cx } });
    const btn = target.querySelector('[role="menuitem"]');
    expect(btn!.className).toContain('text-red-600');
  });

  it('applies disabled state', () => {
    mount(ContextMenuItem, { target, props: { label: 'Cut', disabled: true, onclick: () => {}, cx } });
    const btn = target.querySelector('[role="menuitem"]') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.className).toContain('opacity-50');
  });

  it('calls onclick when clicked', () => {
    const onclick = vi.fn();
    mount(ContextMenuItem, { target, props: { label: 'Do', onclick, cx } });
    const btn = target.querySelector('[role="menuitem"]') as HTMLElement;
    btn.click();
    expect(onclick).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// Toast
// ============================================================================

describe('Toast', () => {
  it('renders message text', () => {
    mount(Toast, { target, props: { id: 't1', variant: 'info', message: 'Hello', onDismiss: () => {} } });
    expect(target.textContent).toContain('Hello');
  });

  it('has role="alert"', () => {
    mount(Toast, { target, props: { id: 't1', variant: 'success', message: 'OK', onDismiss: () => {} } });
    const alert = target.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
  });

  it('has aria-live="polite"', () => {
    mount(Toast, { target, props: { id: 't1', variant: 'info', message: 'Note', onDismiss: () => {} } });
    const alert = target.querySelector('[role="alert"]');
    expect(alert!.getAttribute('aria-live')).toBe('polite');
  });

  it('renders close button', () => {
    mount(Toast, { target, props: { id: 't1', variant: 'info', message: 'X', onDismiss: () => {} } });
    const btn = target.querySelector('[aria-label="Close notification"]');
    expect(btn).toBeTruthy();
  });

  it('calls onDismiss when close clicked', () => {
    const onDismiss = vi.fn();
    mount(Toast, { target, props: { id: 't1', variant: 'info', message: 'X', onDismiss } });
    const btn = target.querySelector('[aria-label="Close notification"]') as HTMLElement;
    btn.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies info variant icon', () => {
    mount(Toast, { target, props: { id: 't1', variant: 'info', message: 'Hi', onDismiss: () => {} } });
    const icons = target.querySelectorAll('.material-icons');
    const infoIcon = Array.from(icons).find(i => i.textContent === 'info');
    expect(infoIcon).toBeTruthy();
  });

  it('applies success variant icon', () => {
    mount(Toast, { target, props: { id: 't1', variant: 'success', message: 'OK', onDismiss: () => {} } });
    const icons = target.querySelectorAll('.material-icons');
    const checkIcon = Array.from(icons).find(i => i.textContent === 'check_circle');
    expect(checkIcon).toBeTruthy();
  });

  it('applies error variant icon', () => {
    mount(Toast, { target, props: { id: 't1', variant: 'error', message: 'Err', onDismiss: () => {} } });
    const icons = target.querySelectorAll('.material-icons');
    const errIcon = Array.from(icons).find(i => i.textContent === 'error');
    expect(errIcon).toBeTruthy();
  });

  it('auto-dismisses after duration', async () => {
    const onDismiss = vi.fn();
    mount(Toast, { target, props: { id: 't1', variant: 'info', message: 'Bye', duration: 50, onDismiss } });
    expect(onDismiss).not.toHaveBeenCalled();
    // Wait real time for the effect to run + setTimeout to fire
    await new Promise(r => setTimeout(r, 100));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not auto-dismiss when duration is 0', async () => {
    const onDismiss = vi.fn();
    mount(Toast, { target, props: { id: 't1', variant: 'info', message: 'Stay', duration: 0, onDismiss } });
    await new Promise(r => setTimeout(r, 100));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

// ============================================================================
// CollectionCard
// ============================================================================

describe('CollectionCard', () => {
  const collection = { id: 'c1', label: 'My Collection', thumbnails: ['a.jpg', 'b.jpg'], itemCount: 42 };

  it('renders collection label', () => {
    mount(CollectionCard, { target, props: { collection, cx } });
    expect(target.textContent).toContain('My Collection');
  });

  it('renders item count', () => {
    mount(CollectionCard, { target, props: { collection, cx } });
    expect(target.textContent).toContain('42');
  });

  it('renders thumbnail images', () => {
    mount(CollectionCard, { target, props: { collection, cx } });
    const imgs = target.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    expect(imgs[0].src).toContain('a.jpg');
  });

  it('has role="button" and tabindex', () => {
    mount(CollectionCard, { target, props: { collection, cx } });
    const btn = target.querySelector('[role="button"]');
    expect(btn).toBeTruthy();
    expect(btn!.getAttribute('tabindex')).toBe('0');
  });

  it('applies selected ring styles', () => {
    mount(CollectionCard, { target, props: { collection, selected: true, cx } });
    const outer = target.querySelector('[role="button"]');
    expect(outer!.className).toContain('ring-2');
  });

  it('renders empty placeholder when no thumbnails', () => {
    const empty = { ...collection, thumbnails: [] };
    mount(CollectionCard, { target, props: { collection: empty, cx } });
    expect(target.querySelector('img')).toBeNull();
    expect(target.textContent).toContain('folder');
  });

  it('limits thumbnails to 4', () => {
    const many = { ...collection, thumbnails: ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg'] };
    mount(CollectionCard, { target, props: { collection: many, cx } });
    const imgs = target.querySelectorAll('img');
    expect(imgs.length).toBe(4);
  });
});

// ============================================================================
// CollectionCardDropOverlay
// ============================================================================

describe('CollectionCardDropOverlay', () => {
  it('renders when active', () => {
    mount(CollectionCardDropOverlay, { target, props: { active: true, cx } });
    expect(target.textContent).toContain('Drop to add');
  });

  it('does not render when not active', () => {
    mount(CollectionCardDropOverlay, { target, props: { active: false, cx } });
    expect(target.textContent).not.toContain('Drop to add');
  });

  it('renders with overlay positioning', () => {
    mount(CollectionCardDropOverlay, { target, props: { active: true, cx } });
    const overlay = target.firstElementChild;
    expect(overlay!.className).toContain('absolute');
    expect(overlay!.className).toContain('inset-0');
  });

  it('renders add icon', () => {
    mount(CollectionCardDropOverlay, { target, props: { active: true, cx } });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('add_circle');
  });
});

// ============================================================================
// EmptyState
// ============================================================================

describe('EmptyState', () => {
  it('renders title', () => {
    mount(EmptyState, { target, props: { title: 'No items', cx } });
    const h3 = target.querySelector('h3');
    expect(h3).toBeTruthy();
    expect(h3!.textContent).toBe('No items');
  });

  it('renders description', () => {
    mount(EmptyState, { target, props: { title: 'Empty', description: 'Add some items', cx } });
    expect(target.textContent).toContain('Add some items');
  });

  it('renders icon when provided', () => {
    mount(EmptyState, { target, props: { title: 'Empty', icon: 'inbox', cx } });
    const icon = target.querySelector('.material-icons');
    expect(icon).toBeTruthy();
    expect(icon!.textContent).toBe('inbox');
  });

  it('has centered layout', () => {
    mount(EmptyState, { target, props: { title: 'Empty', cx } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('items-center');
    expect(container!.className).toContain('justify-center');
    expect(container!.className).toContain('text-center');
  });

  it('title has neobrutalist typography', () => {
    mount(EmptyState, { target, props: { title: 'NB', cx } });
    const h3 = target.querySelector('h3');
    expect(h3!.className).toContain('font-mono');
    expect(h3!.className).toContain('uppercase');
    expect(h3!.className).toContain('font-bold');
  });
});

// ============================================================================
// ViewToggle
// ============================================================================

describe('ViewToggle', () => {
  const options = [
    { id: 'grid', icon: 'grid_view', label: 'Grid' },
    { id: 'list', icon: 'list', label: 'List' },
  ];

  it('renders with role="radiogroup"', () => {
    mount(ViewToggle, { target, props: { options, cx } });
    const group = target.querySelector('[role="radiogroup"]');
    expect(group).toBeTruthy();
  });

  it('renders all options', () => {
    mount(ViewToggle, { target, props: { options, cx } });
    expect(target.textContent).toContain('Grid');
    expect(target.textContent).toContain('List');
  });

  it('renders icons for options', () => {
    mount(ViewToggle, { target, props: { options, cx } });
    const icons = target.querySelectorAll('.material-icons');
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });

  it('applies active styling to selected option', () => {
    mount(ViewToggle, { target, props: { options, value: 'grid', cx } });
    const buttons = target.querySelectorAll('button');
    // The first button (grid) should have active styling
    const gridButton = buttons[0];
    expect(gridButton.className).toContain('bg-nb-black');
  });
});

// ============================================================================
// TabBar
// ============================================================================

describe('TabBar', () => {
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'help', label: 'Help', icon: 'help' },
  ];

  it('renders with role="tablist"', () => {
    mount(TabBar, { target, props: { tabs, cx } });
    const tablist = target.querySelector('[role="tablist"]');
    expect(tablist).toBeTruthy();
  });

  it('renders all tabs', () => {
    mount(TabBar, { target, props: { tabs, cx } });
    expect(target.textContent).toContain('General');
    expect(target.textContent).toContain('Advanced');
    expect(target.textContent).toContain('Help');
  });

  it('renders border-b on container', () => {
    mount(TabBar, { target, props: { tabs, cx } });
    const tablist = target.querySelector('[role="tablist"]');
    expect(tablist!.className).toContain('border-b-2');
  });
});
