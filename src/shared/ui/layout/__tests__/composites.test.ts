/**
 * Layout Composite Tests
 *
 * Tests PaneLayout, ScreenLayout, PanelLayout, SectionLayout,
 * FieldLayout, InlineLayout, ViewHeader, SelectionBar.
 *
 * Components using named snippets (body, control, etc.) need
 * dedicated test host wrappers since TestHost only handles children.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from 'svelte';

// Composites with children (TestHost compatible)
import InlineLayout from '../composites/InlineLayout.svelte';

// Composites with named snippets (use dedicated hosts)
import PanelLayoutHost from './PanelLayoutHost.svelte';
import SectionLayoutHost from './SectionLayoutHost.svelte';
import FieldLayoutHost from './FieldLayoutHost.svelte';

// ViewHeader
import ViewHeader from '../../molecules/ViewHeader/ViewHeader.svelte';
import SelectionBar from '../../molecules/ViewHeader/SelectionBar.svelte';

// TestHost for children
import TestHost from './TestHost.svelte';

 
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
// PanelLayout (uses body: Snippet, needs host wrapper)
// ============================================================================

describe('PanelLayout', () => {
  it('renders with flex-col', () => {
    mount(PanelLayoutHost, { target, props: {} });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex');
    expect(div!.className).toContain('flex-col');
  });

  it('renders body content', () => {
    mount(PanelLayoutHost, { target, props: {} });
    expect(target.textContent).toContain('Body Content');
  });

  it('applies h-full by default', () => {
    mount(PanelLayoutHost, { target, props: {} });
    const div = target.firstElementChild;
    expect(div!.className).toContain('h-full');
  });

  it('applies custom class', () => {
    mount(PanelLayoutHost, { target, props: { class: 'my-panel' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('my-panel');
  });

  it('applies bodyScroll (overflow-y-auto) by default', () => {
    mount(PanelLayoutHost, { target, props: {} });
    // The body wrapper div has overflow-y-auto
    const bodyDiv = target.querySelector('.flex-1');
    expect(bodyDiv!.className).toContain('overflow-y-auto');
  });

  it('disables scroll when bodyScroll=false', () => {
    mount(PanelLayoutHost, { target, props: { bodyScroll: false } });
    const bodyDiv = target.querySelector('.flex-1');
    expect(bodyDiv!.className).toContain('overflow-hidden');
    expect(bodyDiv!.className).not.toContain('overflow-y-auto');
  });
});

// ============================================================================
// SectionLayout (uses body: Snippet, title: Snippet)
// ============================================================================

describe('SectionLayout', () => {
  it('renders div container', () => {
    mount(SectionLayoutHost, { target, props: {} });
    const div = target.firstElementChild;
    expect(div).toBeTruthy();
    expect(div!.className).toContain('flex');
    expect(div!.className).toContain('flex-col');
  });

  it('renders body content', () => {
    mount(SectionLayoutHost, { target, props: {} });
    expect(target.textContent).toContain('Section Body');
  });

  it('renders title when provided', () => {
    mount(SectionLayoutHost, { target, props: { showTitle: true } });
    expect(target.textContent).toContain('Section Title');
  });

  it('does not render title by default', () => {
    mount(SectionLayoutHost, { target, props: {} });
    expect(target.textContent).not.toContain('Section Title');
  });

  it('applies bodyGap', () => {
    mount(SectionLayoutHost, { target, props: { bodyGap: 'lg' } });
    const bodyDiv = target.querySelector('.flex-1');
    expect(bodyDiv!.className).toContain('gap-6');
  });
});

// ============================================================================
// FieldLayout (uses control: Snippet, label: Snippet, hint: Snippet)
// ============================================================================

describe('FieldLayout', () => {
  it('renders control', () => {
    mount(FieldLayoutHost, { target, props: {} });
    const input = target.querySelector('input');
    expect(input).toBeTruthy();
  });

  it('renders label when provided', () => {
    mount(FieldLayoutHost, { target, props: { showLabel: true } });
    const label = target.querySelector('label');
    expect(label).toBeTruthy();
    expect(label!.textContent).toContain('Field Label');
  });

  it('does not render label by default', () => {
    mount(FieldLayoutHost, { target, props: {} });
    expect(target.querySelector('label')).toBeNull();
  });

  it('renders hint when provided', () => {
    mount(FieldLayoutHost, { target, props: { showHint: true } });
    expect(target.textContent).toContain('Hint text');
  });

  it('has flex-col gap layout', () => {
    mount(FieldLayoutHost, { target, props: {} });
    const container = target.firstElementChild;
    expect(container!.className).toContain('flex');
    expect(container!.className).toContain('flex-col');
    expect(container!.className).toContain('gap-1');
  });
});

// ============================================================================
// InlineLayout (uses children)
// ============================================================================

describe('InlineLayout', () => {
  it('renders with inline-flex', () => {
    mount(TestHost, { target, props: { component: InlineLayout, componentProps: {}, text: 'Inline' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('inline-flex');
    expect(div!.className).toContain('items-center');
  });

  it('renders children', () => {
    mount(TestHost, { target, props: { component: InlineLayout, componentProps: {}, text: 'Inline Content' } });
    expect(target.textContent).toContain('Inline Content');
  });

  it('applies gap', () => {
    mount(TestHost, { target, props: { component: InlineLayout, componentProps: { gap: 'sm' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('gap-2');
  });

  it('defaults to xs gap', () => {
    mount(TestHost, { target, props: { component: InlineLayout, componentProps: {}, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('gap-1');
  });

  it('applies alignment', () => {
    mount(TestHost, { target, props: { component: InlineLayout, componentProps: { align: 'start' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('items-start');
  });
});

// ============================================================================
// ViewHeader
// ============================================================================

describe('ViewHeader', () => {
  it('renders header container', () => {
    mount(ViewHeader, { target, props: { cx } });
    const container = target.firstElementChild;
    expect(container).toBeTruthy();
    expect(container!.className).toContain('shrink-0');
  });

  it('applies default bg styling', () => {
    mount(ViewHeader, { target, props: { cx } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('bg-nb-cream');
    expect(container!.className).toContain('border-b-4');
  });

  it('applies cx.headerBg override', () => {
     
    mount(ViewHeader, { target, props: { cx: { headerBg: 'bg-nb-black text-nb-cream' } as any } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('bg-nb-black');
    expect(container!.className).not.toContain('bg-nb-cream');
  });

  it('applies default height variant', () => {
    mount(ViewHeader, { target, props: { cx } });
    const mainRow = target.querySelector('.h-header-compact');
    expect(mainRow).toBeTruthy();
  });

  it('applies compact height variant', () => {
    mount(ViewHeader, { target, props: { cx, height: 'compact' } });
    const mainRow = target.querySelector('.h-12');
    expect(mainRow).toBeTruthy();
  });

  it('applies fluid height variant', () => {
    mount(ViewHeader, { target, props: { cx, height: 'fluid' } });
    const container = target.firstElementChild;
    const mainRow = container?.firstElementChild;
    expect(mainRow!.className).not.toContain('h-header');
    expect(mainRow!.className).not.toContain('h-12');
  });

  it('applies custom class', () => {
    mount(ViewHeader, { target, props: { cx, class: 'custom-header' } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('custom-header');
  });

  it('applies zIndex when provided', () => {
    mount(ViewHeader, { target, props: { cx, zIndex: 'z-50' } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('z-50');
  });
});

// ============================================================================
// SelectionBar
// ============================================================================

describe('SelectionBar', () => {
  it('renders nothing when count is 0', () => {
    mount(SelectionBar, { target, props: { count: 0, onClear: () => {}, cx } });
    expect(target.textContent?.trim()).toBe('');
  });

  it('renders count when > 0', () => {
    mount(SelectionBar, { target, props: { count: 5, onClear: () => {}, cx } });
    expect(target.textContent).toContain('5 selected');
  });

  it('renders clear button in desktop mode', () => {
    mount(SelectionBar, { target, props: { count: 3, onClear: () => {}, cx } });
    expect(target.textContent).toContain('Clear');
  });

  it('renders mobile layout when isMobile=true', () => {
    mount(SelectionBar, { target, props: { count: 2, onClear: () => {}, cx, isMobile: true } });
    expect(target.textContent).toContain('2 selected');
    const mobile = target.querySelector('.absolute');
    expect(mobile).toBeTruthy();
  });

  it('renders desktop layout by default', () => {
    mount(SelectionBar, { target, props: { count: 1, onClear: () => {}, cx } });
    const container = target.firstElementChild;
    expect(container!.className).toContain('w-full');
    expect(container!.className).not.toContain('absolute');
  });

  it('calls onClear when clear button clicked', () => {
    const onClear = vi.fn();
    mount(SelectionBar, { target, props: { count: 3, onClear, cx } });
    const buttons = target.querySelectorAll('button');
    const clearBtn = Array.from(buttons).find(b => b.textContent?.includes('Clear'));
    if (clearBtn) clearBtn.click();
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
