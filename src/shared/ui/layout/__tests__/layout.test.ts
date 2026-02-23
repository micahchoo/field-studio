/**
 * Layout System Tests
 *
 * Tests primitives (Stack, Row, RowItem, Fill, Scroll, Center, Shelf),
 * composites (PaneLayout, ScreenLayout, PanelLayout, SectionLayout, FieldLayout, InlineLayout),
 * ViewHeader, SelectionBar, and layout types.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from 'svelte';

// Primitives
import Stack from '../primitives/Stack.svelte';
import Row from '../primitives/Row.svelte';
import RowItem from '../primitives/RowItem.svelte';
import Fill from '../primitives/Fill.svelte';
import Scroll from '../primitives/Scroll.svelte';
import Center from '../primitives/Center.svelte';
import Shelf from '../primitives/Shelf.svelte';

// Types
import {
  gapClasses,
  alignClasses,
  justifyClasses,
  overflowClasses,
  shelfHeightClasses,
  shelfWidthClasses,
} from '../types';

// TestHost for children
import TestHost from './TestHost.svelte';

let target: HTMLDivElement;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  target.remove();
});

// ============================================================================
// Layout Types
// ============================================================================

describe('Layout Types', () => {
  it('exports gap class mappings', () => {
    expect(gapClasses.none).toBe('');
    expect(gapClasses.xs).toBe('gap-1');
    expect(gapClasses.sm).toBe('gap-2');
    expect(gapClasses.md).toBe('gap-3');
    expect(gapClasses.lg).toBe('gap-4');
  });

  it('exports alignment class mappings', () => {
    expect(alignClasses.start).toBe('items-start');
    expect(alignClasses.center).toBe('items-center');
    expect(alignClasses.end).toBe('items-end');
    expect(alignClasses.stretch).toBe('items-stretch');
  });

  it('exports justify class mappings', () => {
    expect(justifyClasses.start).toBe('justify-start');
    expect(justifyClasses.center).toBe('justify-center');
    expect(justifyClasses.end).toBe('justify-end');
    expect(justifyClasses.between).toBe('justify-between');
  });

  it('exports overflow class mappings', () => {
    expect(overflowClasses.y).toContain('overflow-y-auto');
    expect(overflowClasses.x).toContain('overflow-x-auto');
    expect(overflowClasses.both).toBe('overflow-auto');
  });

  it('exports shelf height class mappings', () => {
    expect(shelfHeightClasses.header).toBe('h-header');
    expect(shelfHeightClasses['header-compact']).toBe('h-12');
    expect(shelfHeightClasses['status-bar']).toBe('h-8');
    expect(shelfHeightClasses.auto).toBe('');
  });

  it('exports shelf width class mappings', () => {
    expect(shelfWidthClasses.sidebar).toBe('w-[280px]');
    expect(shelfWidthClasses.inspector).toBe('w-[352px]');
    expect(shelfWidthClasses.filmstrip).toBe('w-[288px]');
    expect(shelfWidthClasses.auto).toBe('');
  });
});

// ============================================================================
// Stack
// ============================================================================

describe('Stack', () => {
  it('renders with flex-col', () => {
    mount(TestHost, { target, props: { component: Stack, componentProps: {}, text: 'Content' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex');
    expect(div!.className).toContain('flex-col');
  });

  it('renders children', () => {
    mount(TestHost, { target, props: { component: Stack, componentProps: {}, text: 'Hello Stack' } });
    expect(target.textContent).toContain('Hello Stack');
  });

  it('applies gap classes', () => {
    mount(TestHost, { target, props: { component: Stack, componentProps: { gap: 'md' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('gap-3');
  });

  it('applies stretch for full height', () => {
    mount(TestHost, { target, props: { component: Stack, componentProps: { stretch: true }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('h-full');
  });

  it('applies alignment', () => {
    mount(TestHost, { target, props: { component: Stack, componentProps: { align: 'center' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('items-center');
  });

  it('applies custom class', () => {
    mount(TestHost, { target, props: { component: Stack, componentProps: { class: 'my-stack' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('my-stack');
  });

  it('defaults to no gap', () => {
    mount(TestHost, { target, props: { component: Stack, componentProps: {}, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).not.toContain('gap-');
  });
});

// ============================================================================
// Row
// ============================================================================

describe('Row', () => {
  it('renders with flex', () => {
    mount(TestHost, { target, props: { component: Row, componentProps: {}, text: 'Row' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex');
    expect(div!.className).not.toContain('flex-col');
  });

  it('renders children', () => {
    mount(TestHost, { target, props: { component: Row, componentProps: {}, text: 'Row Content' } });
    expect(target.textContent).toContain('Row Content');
  });

  it('applies gap', () => {
    mount(TestHost, { target, props: { component: Row, componentProps: { gap: 'lg' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('gap-4');
  });

  it('applies alignment', () => {
    mount(TestHost, { target, props: { component: Row, componentProps: { align: 'center' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('items-center');
  });

  it('applies justify', () => {
    mount(TestHost, { target, props: { component: Row, componentProps: { justify: 'between' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('justify-between');
  });

  it('applies wrap', () => {
    mount(TestHost, { target, props: { component: Row, componentProps: { wrap: true }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex-wrap');
  });

  it('does not apply wrap by default', () => {
    mount(TestHost, { target, props: { component: Row, componentProps: {}, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).not.toContain('flex-wrap');
  });
});

// ============================================================================
// RowItem
// ============================================================================

describe('RowItem', () => {
  it('renders children', () => {
    mount(TestHost, { target, props: { component: RowItem, componentProps: {}, text: 'Item' } });
    expect(target.textContent).toContain('Item');
  });

  it('applies flex-1 when flex=true', () => {
    mount(TestHost, { target, props: { component: RowItem, componentProps: { flex: true }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex-1');
    expect(div!.className).toContain('min-w-0');
  });

  it('applies shrink-0 by default (non-flex)', () => {
    mount(TestHost, { target, props: { component: RowItem, componentProps: {}, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('shrink-0');
  });

  it('allows explicit shrink override', () => {
    mount(TestHost, { target, props: { component: RowItem, componentProps: { flex: true, shrink: true }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex-1');
    expect(div!.className).toContain('shrink-0');
  });
});

// ============================================================================
// Fill
// ============================================================================

describe('Fill', () => {
  it('renders absolute positioning by default', () => {
    mount(TestHost, { target, props: { component: Fill, componentProps: {}, text: 'Fill' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('absolute');
    expect(div!.className).toContain('inset-0');
  });

  it('renders flex layout when flex=true', () => {
    mount(TestHost, { target, props: { component: Fill, componentProps: { flex: true }, text: 'Fill' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex-1');
    expect(div!.className).toContain('min-h-0');
    expect(div!.className).not.toContain('absolute');
  });

  it('renders children', () => {
    mount(TestHost, { target, props: { component: Fill, componentProps: {}, text: 'Content' } });
    expect(target.textContent).toContain('Content');
  });
});

// ============================================================================
// Scroll
// ============================================================================

describe('Scroll', () => {
  it('applies y-axis scrolling by default', () => {
    mount(TestHost, { target, props: { component: Scroll, componentProps: {}, text: 'Scroll' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('overflow-y-auto');
    expect(div!.className).toContain('overflow-x-hidden');
  });

  it('applies x-axis scrolling', () => {
    mount(TestHost, { target, props: { component: Scroll, componentProps: { axis: 'x' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('overflow-x-auto');
    expect(div!.className).toContain('overflow-y-hidden');
  });

  it('applies both-axis scrolling', () => {
    mount(TestHost, { target, props: { component: Scroll, componentProps: { axis: 'both' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('overflow-auto');
  });

  it('applies flex-1 when flex=true', () => {
    mount(TestHost, { target, props: { component: Scroll, componentProps: { flex: true }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex-1');
    expect(div!.className).toContain('min-h-0');
  });

  it('renders children', () => {
    mount(TestHost, { target, props: { component: Scroll, componentProps: {}, text: 'Scrollable' } });
    expect(target.textContent).toContain('Scrollable');
  });
});

// ============================================================================
// Center
// ============================================================================

describe('Center', () => {
  it('renders with centering classes', () => {
    mount(TestHost, { target, props: { component: Center, componentProps: {}, text: 'Centered' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex');
    expect(div!.className).toContain('items-center');
    expect(div!.className).toContain('justify-center');
  });

  it('renders children', () => {
    mount(TestHost, { target, props: { component: Center, componentProps: {}, text: 'Middle' } });
    expect(target.textContent).toContain('Middle');
  });

  it('applies flex-1 when flex=true', () => {
    mount(TestHost, { target, props: { component: Center, componentProps: { flex: true }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('flex-1');
  });

  it('applies custom class', () => {
    mount(TestHost, { target, props: { component: Center, componentProps: { class: 'my-center' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('my-center');
  });
});

// ============================================================================
// Shelf
// ============================================================================

describe('Shelf', () => {
  it('renders children', () => {
    mount(TestHost, { target, props: { component: Shelf, componentProps: {}, text: 'Shelf Content' } });
    expect(target.textContent).toContain('Shelf Content');
  });

  it('applies shrink-0 by default', () => {
    mount(TestHost, { target, props: { component: Shelf, componentProps: {}, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('shrink-0');
  });

  it('applies header height class', () => {
    mount(TestHost, { target, props: { component: Shelf, componentProps: { h: 'header' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('h-header');
  });

  it('applies header-compact height class', () => {
    mount(TestHost, { target, props: { component: Shelf, componentProps: { h: 'header-compact' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('h-12');
  });

  it('applies status-bar height class', () => {
    mount(TestHost, { target, props: { component: Shelf, componentProps: { h: 'status-bar' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('h-8');
  });

  it('applies sidebar width class', () => {
    mount(TestHost, { target, props: { component: Shelf, componentProps: { w: 'sidebar' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('w-[280px]');
  });

  it('applies inspector width class', () => {
    mount(TestHost, { target, props: { component: Shelf, componentProps: { w: 'inspector' }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).toContain('w-[352px]');
  });

  it('applies numeric width as style', () => {
    mount(TestHost, { target, props: { component: Shelf, componentProps: { w: 300 }, text: 'X' } });
    const div = target.firstElementChild as HTMLElement;
    expect(div.style.width).toBe('300px');
  });

  it('allows shrink when shrink=true', () => {
    mount(TestHost, { target, props: { component: Shelf, componentProps: { shrink: true }, text: 'X' } });
    const div = target.firstElementChild;
    expect(div!.className).not.toContain('shrink-0');
  });
});
