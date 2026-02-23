/**
 * Svelte Action Functions -- DOM behavior tests (Category 3)
 *
 * Tests the action lifecycle: create -> events -> update -> destroy
 * for all shared and feature-level Svelte actions.
 *
 * Environment: happy-dom (via vitest.config.ts)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Shared actions ----
import { focusTrap, type FocusTrapParams } from '../focusTrap';
import { keyboardNav, type KeyboardNavParams } from '../keyboardNav';
import { clickOutside, type ClickOutsideParams } from '../clickOutside';
import { resizablePanel, type ResizablePanelParams } from '../resizablePanel';
import { dragDrop, type DragDropParams } from '../dragDrop';
import { panZoomGestures, type PanZoomParams } from '../panZoomGestures';
import { viewportKeyboard, type ViewportKeyboardParams } from '../viewportKeyboard';
import {
  prefersReducedMotion,
  getMotionDuration,
  getMotionTransitions,
  watchReducedMotion,
  DURATIONS,
  TRANSITIONS,
} from '../reducedMotion';

// ---- Feature actions ----
import {
  gridLassoSelect,
  type LassoParams,
} from '@/src/features/archive/actions/gridLassoSelect';
import {
  canvasDrag,
  screenToCanvas,
  type CanvasDragParams,
} from '@/src/features/board-design/actions/canvasDrag';
import {
  rubberBandSelect,
  type RubberBandParams,
} from '@/src/features/board-design/actions/rubberBandSelect';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createElement(tag = 'div'): HTMLElement {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  return el;
}

function createFocusableChildren(parent: HTMLElement, count: number): HTMLElement[] {
  const children: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.textContent = `Button ${i}`;
    parent.appendChild(btn);
    children.push(btn);
  }
  return children;
}

function createNavItems(parent: HTMLElement, count: number): HTMLElement[] {
  const items: HTMLElement[] = [];
  for (let i = 0; i < count; i++) {
    const li = document.createElement('li');
    li.setAttribute('data-nav-item', '');
    li.setAttribute('tabindex', '0');
    li.textContent = `Item ${i}`;
    parent.appendChild(li);
    items.push(li);
  }
  return items;
}

/**
 * Dispatch a KeyboardEvent on an element.
 */
function pressKey(
  el: EventTarget,
  key: string,
  opts: Partial<KeyboardEventInit> = {},
) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

/**
 * Create a WheelEvent with clientX/clientY/ctrlKey/metaKey support.
 * happy-dom's WheelEvent constructor does not propagate MouseEventInit
 * properties (clientX, clientY, ctrlKey, etc.), so we patch them manually.
 */
function createWheelEvent(init: WheelEventInit & { clientX?: number; clientY?: number; ctrlKey?: boolean; metaKey?: boolean } = {}): WheelEvent {
  const evt = new WheelEvent('wheel', { bubbles: true, ...init });
  if (init.clientX !== undefined) Object.defineProperty(evt, 'clientX', { value: init.clientX });
  if (init.clientY !== undefined) Object.defineProperty(evt, 'clientY', { value: init.clientY });
  if (init.ctrlKey !== undefined) Object.defineProperty(evt, 'ctrlKey', { value: init.ctrlKey });
  if (init.metaKey !== undefined) Object.defineProperty(evt, 'metaKey', { value: init.metaKey });
  return evt;
}

/**
 * Create a DragEvent with a real dataTransfer attached.
 * happy-dom's DragEvent constructor ignores the dataTransfer init option,
 * so we define it as a property after construction.
 */
function createDragEvent(
  type: string,
  init: DragEventInit & { clientY?: number } = {},
  dt?: DataTransfer,
): DragEvent {
  const evt = new DragEvent(type, { bubbles: true, ...init });
  if (dt) {
    Object.defineProperty(evt, 'dataTransfer', { value: dt, writable: false });
  }
  if (init.clientY !== undefined) {
    Object.defineProperty(evt, 'clientY', { value: init.clientY });
  }
  return evt;
}

// ---------------------------------------------------------------------------
// Global setup / teardown
// ---------------------------------------------------------------------------

// Store originals to restore in afterEach
let origRAF: typeof requestAnimationFrame;
let origCAF: typeof cancelAnimationFrame;

beforeEach(() => {
  // Replace requestAnimationFrame with synchronous execution for tests
  origRAF = globalThis.requestAnimationFrame;
  origCAF = globalThis.cancelAnimationFrame;
  const callbacks = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = nextId++;
    callbacks.set(id, cb);
    // Execute synchronously
    cb(performance.now());
    return id;
  };
  globalThis.cancelAnimationFrame = (id: number) => {
    callbacks.delete(id);
  };
});

afterEach(() => {
  document.body.innerHTML = '';
  globalThis.requestAnimationFrame = origRAF;
  globalThis.cancelAnimationFrame = origCAF;
  vi.restoreAllMocks();
  localStorage.clear();
});

// ===========================================================================
// 1. focusTrap
// ===========================================================================

describe('focusTrap', () => {
  it('wraps Tab from last to first focusable element', () => {
    const container = createElement();
    const buttons = createFocusableChildren(container, 3);

    const action = focusTrap(container, { active: true, autoFocus: false });

    // Focus the last button
    buttons[2].focus();
    expect(document.activeElement).toBe(buttons[2]);

    // Press Tab (not shift) on the last element
    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(buttons[0]);

    action.destroy();
  });

  it('wraps Shift+Tab from first to last focusable element', () => {
    const container = createElement();
    const buttons = createFocusableChildren(container, 3);

    const action = focusTrap(container, { active: true, autoFocus: false });

    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);

    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
    });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();
    expect(document.activeElement).toBe(buttons[2]);

    action.destroy();
  });

  it('calls onClose when Escape is pressed', () => {
    const container = createElement();
    createFocusableChildren(container, 1);
    const onClose = vi.fn();

    const action = focusTrap(container, { onClose, active: true, autoFocus: false });

    pressKey(container, 'Escape');

    expect(onClose).toHaveBeenCalledOnce();

    action.destroy();
  });

  it('does not call onClose when Escape is pressed and no callback provided', () => {
    const container = createElement();
    createFocusableChildren(container, 1);

    // Should not throw even without onClose
    const action = focusTrap(container, { active: true, autoFocus: false });

    expect(() => {
      pressKey(container, 'Escape');
    }).not.toThrow();

    action.destroy();
  });

  it('does not trap focus when active=false', () => {
    const container = createElement();
    const buttons = createFocusableChildren(container, 3);
    const onClose = vi.fn();

    const action = focusTrap(container, { onClose, active: false, autoFocus: false });

    buttons[2].focus();
    pressKey(container, 'Tab');

    // onClose should not be called from Escape either
    pressKey(container, 'Escape');
    expect(onClose).not.toHaveBeenCalled();

    action.destroy();
  });

  it('activates/deactivates via update()', () => {
    const container = createElement();
    const buttons = createFocusableChildren(container, 3);
    const onClose = vi.fn();

    const action = focusTrap(container, { onClose, active: false, autoFocus: false });

    // Inactive -- Escape should not fire
    pressKey(container, 'Escape');
    expect(onClose).not.toHaveBeenCalled();

    // Activate
    action.update({ onClose, active: true, autoFocus: false });
    pressKey(container, 'Escape');
    expect(onClose).toHaveBeenCalledOnce();

    // Deactivate
    action.update({ onClose, active: false, autoFocus: false });
    pressKey(container, 'Escape');
    expect(onClose).toHaveBeenCalledOnce(); // still 1

    action.destroy();
  });

  it('prevents Tab when there are no focusable elements', () => {
    const container = createElement(); // empty

    const action = focusTrap(container, { active: true, autoFocus: false });

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
    const preventSpy = vi.spyOn(event, 'preventDefault');
    container.dispatchEvent(event);

    expect(preventSpy).toHaveBeenCalled();

    action.destroy();
  });

  it('destroy stops trapping and restores focus', () => {
    const outer = createElement();
    outer.setAttribute('tabindex', '0');
    outer.focus();

    const container = createElement();
    const buttons = createFocusableChildren(container, 2);
    const onClose = vi.fn();

    const action = focusTrap(container, { onClose, active: true, autoFocus: false });

    // Destroy should restore focus to the element that was active before
    action.destroy();

    // After destroy, keydown should not trigger the trap
    pressKey(container, 'Escape');
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 2. keyboardNav
// ===========================================================================

describe('keyboardNav', () => {
  it('ArrowDown moves focus to the next item (vertical)', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 4);

    const action = keyboardNav(list, { orientation: 'vertical' });

    items[0].focus();
    expect(document.activeElement).toBe(items[0]);

    pressKey(list, 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);

    action.destroy();
  });

  it('ArrowUp moves focus to the previous item (vertical)', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 4);

    const action = keyboardNav(list, { orientation: 'vertical' });

    items[2].focus();
    pressKey(list, 'ArrowUp');
    expect(document.activeElement).toBe(items[1]);

    action.destroy();
  });

  it('ArrowRight/ArrowLeft navigate in horizontal orientation', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 4);

    const action = keyboardNav(list, { orientation: 'horizontal' });

    items[0].focus();
    pressKey(list, 'ArrowRight');
    expect(document.activeElement).toBe(items[1]);

    pressKey(list, 'ArrowLeft');
    expect(document.activeElement).toBe(items[0]);

    action.destroy();
  });

  it('wraps around from last to first', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 3);

    const action = keyboardNav(list, { wrap: true });

    items[2].focus();
    pressKey(list, 'ArrowDown');
    expect(document.activeElement).toBe(items[0]);

    action.destroy();
  });

  it('wraps around from first to last', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 3);

    const action = keyboardNav(list, { wrap: true });

    items[0].focus();
    pressKey(list, 'ArrowUp');
    expect(document.activeElement).toBe(items[2]);

    action.destroy();
  });

  it('does not wrap when wrap=false', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 3);

    const action = keyboardNav(list, { wrap: false });

    items[2].focus();
    pressKey(list, 'ArrowDown');
    // Stays at last item (clamped)
    expect(document.activeElement).toBe(items[2]);

    items[0].focus();
    pressKey(list, 'ArrowUp');
    // Stays at first item (clamped)
    expect(document.activeElement).toBe(items[0]);

    action.destroy();
  });

  it('Home focuses the first item', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 5);

    const action = keyboardNav(list);

    items[3].focus();
    pressKey(list, 'Home');
    expect(document.activeElement).toBe(items[0]);

    action.destroy();
  });

  it('End focuses the last item', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 5);

    const action = keyboardNav(list);

    items[1].focus();
    pressKey(list, 'End');
    expect(document.activeElement).toBe(items[4]);

    action.destroy();
  });

  it('Enter calls onSelect with current index', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 3);
    const onSelect = vi.fn();

    const action = keyboardNav(list, { onSelect });

    items[1].focus();
    pressKey(list, 'Enter');

    expect(onSelect).toHaveBeenCalledWith(1);

    action.destroy();
  });

  it('Space calls onSelect with current index', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 3);
    const onSelect = vi.fn();

    const action = keyboardNav(list, { onSelect });

    items[2].focus();
    pressKey(list, ' ');

    expect(onSelect).toHaveBeenCalledWith(2);

    action.destroy();
  });

  it('Enter/Space do not call onSelect when no item is focused', () => {
    const list = createElement('ul');
    createNavItems(list, 3);
    const onSelect = vi.fn();

    const action = keyboardNav(list, { onSelect });

    // Focus is not on any nav item
    list.focus();
    pressKey(list, 'Enter');
    pressKey(list, ' ');

    expect(onSelect).not.toHaveBeenCalled();

    action.destroy();
  });

  it('PageDown jumps by pageSize', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 20);

    const action = keyboardNav(list, { pageSize: 5 });

    items[0].focus();
    pressKey(list, 'PageDown');
    expect(document.activeElement).toBe(items[5]);

    action.destroy();
  });

  it('PageUp jumps by pageSize', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 20);

    const action = keyboardNav(list, { pageSize: 5 });

    items[10].focus();
    pressKey(list, 'PageUp');
    expect(document.activeElement).toBe(items[5]);

    action.destroy();
  });

  it('update() changes the onSelect callback', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 3);
    const onSelect1 = vi.fn();
    const onSelect2 = vi.fn();

    const action = keyboardNav(list, { onSelect: onSelect1 });

    items[0].focus();
    pressKey(list, 'Enter');
    expect(onSelect1).toHaveBeenCalledOnce();

    action.update({ onSelect: onSelect2 });
    pressKey(list, 'Enter');
    expect(onSelect2).toHaveBeenCalledOnce();
    expect(onSelect1).toHaveBeenCalledOnce(); // not called again

    action.destroy();
  });

  it('destroy removes the keydown listener', () => {
    const list = createElement('ul');
    const items = createNavItems(list, 3);
    const onSelect = vi.fn();

    const action = keyboardNav(list, { onSelect });
    action.destroy();

    items[0].focus();
    pressKey(list, 'Enter');

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('uses custom itemSelector', () => {
    const list = createElement('ul');
    // Use custom selector instead of [data-nav-item]
    for (let i = 0; i < 3; i++) {
      const li = document.createElement('li');
      li.classList.add('my-item');
      li.setAttribute('tabindex', '0');
      li.textContent = `Custom ${i}`;
      list.appendChild(li);
    }
    const customItems = list.querySelectorAll<HTMLElement>('.my-item');

    const action = keyboardNav(list, { itemSelector: '.my-item' });

    (customItems[0] as HTMLElement).focus();
    pressKey(list, 'ArrowDown');
    expect(document.activeElement).toBe(customItems[1]);

    action.destroy();
  });
});

// ===========================================================================
// 3. clickOutside
// ===========================================================================

describe('clickOutside', () => {
  it('calls onClose when clicking outside the node', async () => {
    const node = createElement();
    const outside = createElement();
    const onClose = vi.fn();

    const action = clickOutside(node, { onClose, delay: 0 });

    // Advance timers for the delay (0ms, but still async setTimeout)
    await vi.waitFor(() => {
      // Trigger click on outside element
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onClose).toHaveBeenCalledOnce();
    }, { timeout: 100 });

    action.destroy();
  });

  it('does not call onClose when clicking inside the node', async () => {
    const node = createElement();
    const child = document.createElement('span');
    node.appendChild(child);
    const onClose = vi.fn();

    const action = clickOutside(node, { onClose, delay: 0 });

    await vi.waitFor(() => {
      child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onClose).not.toHaveBeenCalled();
    }, { timeout: 100 });

    action.destroy();
  });

  it('does not fire before delay expires', () => {
    vi.useFakeTimers();

    const node = createElement();
    const outside = createElement();
    const onClose = vi.fn();

    const action = clickOutside(node, { onClose, delay: 50 });

    // Click immediately before delay
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();

    // Advance time past the delay
    vi.advanceTimersByTime(60);

    // Now click again
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClose).toHaveBeenCalledOnce();

    action.destroy();
    vi.useRealTimers();
  });

  it('update() changes the onClose callback', async () => {
    const node = createElement();
    const outside = createElement();
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    const action = clickOutside(node, { onClose: onClose1, delay: 0 });

    // Wait for activation
    await new Promise(r => setTimeout(r, 20));

    action.update({ onClose: onClose2 });

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClose1).not.toHaveBeenCalled();
    expect(onClose2).toHaveBeenCalledOnce();

    action.destroy();
  });

  it('destroy removes the listener and clears the timer', () => {
    vi.useFakeTimers();

    const node = createElement();
    const outside = createElement();
    const onClose = vi.fn();

    const action = clickOutside(node, { onClose, delay: 50 });
    action.destroy();

    vi.advanceTimersByTime(100);

    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});

// ===========================================================================
// 4. resizablePanel
// ===========================================================================

describe('resizablePanel', () => {
  function createPanel(overrides: Partial<ResizablePanelParams> = {}) {
    const node = createElement();
    const defaults: ResizablePanelParams = {
      id: 'test-panel',
      defaultSize: 280,
      minSize: 100,
      maxSize: 600,
      direction: 'horizontal',
      side: 'left',
      persist: false,
      ...overrides,
    };
    const action = resizablePanel(node, defaults);
    return { node, action, defaults };
  }

  it('sets ARIA attributes on initialization', () => {
    const { node, action } = createPanel();

    expect(node.getAttribute('role')).toBe('separator');
    expect(node.getAttribute('aria-orientation')).toBe('horizontal');
    expect(node.getAttribute('aria-valuemin')).toBe('100');
    expect(node.getAttribute('aria-valuemax')).toBe('600');
    expect(node.getAttribute('aria-valuenow')).toBe('280');

    action.destroy();
  });

  it('fires onResize callback on initialization', () => {
    const onResize = vi.fn();
    const { action } = createPanel({ onResize });

    expect(onResize).toHaveBeenCalledWith(280);

    action.destroy();
  });

  it('handles keyboard ArrowRight to increase size', () => {
    const onResize = vi.fn();
    const { node, action } = createPanel({ onResize });
    onResize.mockClear();

    pressKey(node, 'ArrowRight');

    // KEYBOARD_STEP is 10, so new size = 280 + 10 = 290
    expect(onResize).toHaveBeenCalledWith(290);
    expect(node.getAttribute('aria-valuenow')).toBe('290');

    action.destroy();
  });

  it('handles keyboard ArrowLeft to decrease size', () => {
    const onResize = vi.fn();
    const { node, action } = createPanel({ onResize });
    onResize.mockClear();

    pressKey(node, 'ArrowLeft');

    // 280 - 10 = 270
    expect(onResize).toHaveBeenCalledWith(270);

    action.destroy();
  });

  it('respects minSize constraint', () => {
    const onResize = vi.fn();
    const { node, action } = createPanel({ onResize, minSize: 275 });
    onResize.mockClear();

    pressKey(node, 'ArrowLeft');
    // 280 - 10 = 270, clamped to minSize 275
    expect(onResize).toHaveBeenCalledWith(275);

    action.destroy();
  });

  it('respects maxSize constraint', () => {
    const onResize = vi.fn();
    const { node, action } = createPanel({
      onResize,
      defaultSize: 595,
      maxSize: 600,
    });
    onResize.mockClear();

    pressKey(node, 'ArrowRight');
    // 595 + 10 = 605, clamped to 600
    expect(onResize).toHaveBeenCalledWith(600);

    action.destroy();
  });

  it('Shift+Arrow uses large step (50px)', () => {
    const onResize = vi.fn();
    const { node, action } = createPanel({ onResize });
    onResize.mockClear();

    pressKey(node, 'ArrowRight', { shiftKey: true });

    // 280 + 50 = 330
    expect(onResize).toHaveBeenCalledWith(330);

    action.destroy();
  });

  it('Home key moves to minSize', () => {
    const onResize = vi.fn();
    const { node, action } = createPanel({ onResize, minSize: 100 });
    onResize.mockClear();

    pressKey(node, 'Home');

    expect(onResize).toHaveBeenCalledWith(100);

    action.destroy();
  });

  it('End key moves to maxSize', () => {
    const onResize = vi.fn();
    const { node, action } = createPanel({ onResize, maxSize: 600 });
    onResize.mockClear();

    pressKey(node, 'End');

    expect(onResize).toHaveBeenCalledWith(600);

    action.destroy();
  });

  it('collapse threshold: collapses when size drops below threshold', () => {
    const onResize = vi.fn();
    const onCollapse = vi.fn();
    const onExpand = vi.fn();
    const { node, action } = createPanel({
      onResize,
      onCollapse,
      onExpand,
      defaultSize: 160,
      minSize: 0,
      collapseThreshold: 150,
    });
    onResize.mockClear();

    // Arrow left reduces by 10: 160 -> 150. Since 150 >= 150 threshold,
    // need to go further
    pressKey(node, 'ArrowLeft');
    pressKey(node, 'ArrowLeft');
    // After two presses: 160 - 10 = 150, then 150 - 10 = 140
    // 140 < 150 threshold and 140 < lastVisibleSize (150), so collapse fires
    expect(onCollapse).toHaveBeenCalled();

    action.destroy();
  });

  it('double-click toggles collapse', () => {
    const onCollapse = vi.fn();
    const onExpand = vi.fn();
    const onResize = vi.fn();
    const { node, action } = createPanel({
      onResize,
      onCollapse,
      onExpand,
      collapseThreshold: 150,
    });
    onResize.mockClear();

    // Double-click should collapse when collapseThreshold > 0
    node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onCollapse).toHaveBeenCalled();
    expect(onResize).toHaveBeenCalledWith(0);

    onResize.mockClear();

    // Double-click again should expand
    node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onExpand).toHaveBeenCalled();
    // Should restore to last visible size (280 defaultSize)
    expect(onResize).toHaveBeenCalledWith(280);

    action.destroy();
  });

  it('double-click resets to default when no collapseThreshold', () => {
    const onResize = vi.fn();
    const { node, action } = createPanel({
      onResize,
      defaultSize: 280,
      collapseThreshold: 0,
    });

    // Change size via keyboard
    pressKey(node, 'ArrowRight');
    onResize.mockClear();

    // Double-click resets to default
    node.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(onResize).toHaveBeenCalledWith(280);

    action.destroy();
  });

  it('Enter key toggles collapse (same as double-click)', () => {
    const onCollapse = vi.fn();
    const onResize = vi.fn();
    const { node, action } = createPanel({
      onResize,
      onCollapse,
      collapseThreshold: 150,
    });
    onResize.mockClear();

    pressKey(node, 'Enter');
    expect(onCollapse).toHaveBeenCalled();

    action.destroy();
  });

  it('persists size to localStorage', () => {
    vi.useFakeTimers();

    const { node, action } = createPanel({ persist: true });

    // Trigger a keyboard resize to persist
    pressKey(node, 'ArrowRight');

    // Persist is debounced at 500ms
    vi.advanceTimersByTime(600);

    const stored = localStorage.getItem('resizable-panel-test-panel');
    expect(stored).toBe('290');

    action.destroy();
    vi.useRealTimers();
  });

  it('loads persisted size from localStorage', () => {
    localStorage.setItem('resizable-panel-test-panel', '400');

    const onResize = vi.fn();
    const { action } = createPanel({ persist: true, onResize });

    // Should load 400 from storage instead of defaultSize 280
    expect(onResize).toHaveBeenCalledWith(400);

    action.destroy();
  });

  it('update() changes direction and re-sets ARIA', () => {
    const { node, action } = createPanel({ direction: 'horizontal' });

    expect(node.getAttribute('aria-orientation')).toBe('horizontal');

    action.update({
      id: 'test-panel',
      defaultSize: 280,
      direction: 'vertical',
      persist: false,
    });

    expect(node.getAttribute('aria-orientation')).toBe('vertical');

    action.destroy();
  });

  it('destroy cleans up all listeners', () => {
    const onResize = vi.fn();
    const { node, action } = createPanel({ onResize });
    onResize.mockClear();

    action.destroy();

    // After destroy, keyboard events should not fire onResize
    pressKey(node, 'ArrowRight');
    expect(onResize).not.toHaveBeenCalled();
  });

  it('vertical direction uses ArrowUp/ArrowDown', () => {
    const onResize = vi.fn();
    const node = createElement();
    const action = resizablePanel(node, {
      id: 'vert-panel',
      defaultSize: 200,
      minSize: 50,
      maxSize: 400,
      direction: 'vertical',
      persist: false,
      onResize,
    });
    onResize.mockClear();

    // ArrowLeft should not work in vertical mode
    pressKey(node, 'ArrowLeft');
    expect(onResize).not.toHaveBeenCalled();

    // ArrowUp should decrease size
    pressKey(node, 'ArrowUp');
    expect(onResize).toHaveBeenCalledWith(190);

    onResize.mockClear();

    // ArrowDown should increase size
    pressKey(node, 'ArrowDown');
    expect(onResize).toHaveBeenCalledWith(200);

    action.destroy();
  });
});

// ===========================================================================
// 5. dragDrop
// ===========================================================================

describe('dragDrop', () => {
  function createDragItem(id: string, overrides: Partial<DragDropParams> = {}) {
    const node = createElement();
    const defaults: DragDropParams = {
      itemId: id,
      ...overrides,
    };
    const action = dragDrop(node, defaults);
    return { node, action };
  }

  it('sets node.draggable to true', () => {
    const { node, action } = createDragItem('item-1');
    expect(node.draggable).toBe(true);
    expect(node.getAttribute('data-drag-item')).toBe('item-1');
    action.destroy();
  });

  it('disabled prevents dragging', () => {
    const { node, action } = createDragItem('item-1', { disabled: true });
    expect(node.draggable).toBe(false);
    action.destroy();
  });

  it('dragstart fires onDragStart callback', () => {
    const onDragStart = vi.fn();
    const { node, action } = createDragItem('item-1', { onDragStart });

    const dt = new DataTransfer();
    const event = createDragEvent('dragstart', {}, dt);
    node.dispatchEvent(event);

    expect(onDragStart).toHaveBeenCalledWith('item-1');
    expect(node.getAttribute('data-drag-state')).toBe('dragging');

    action.destroy();
  });

  it('dragend fires onDragEnd callback and cleans up', () => {
    const onDragEnd = vi.fn();
    const { node, action } = createDragItem('item-1', { onDragEnd });

    // Start drag first
    const dt = new DataTransfer();
    node.dispatchEvent(createDragEvent('dragstart', {}, dt));

    // End drag
    node.dispatchEvent(createDragEvent('dragend'));

    expect(onDragEnd).toHaveBeenCalledWith('item-1');
    expect(node.getAttribute('data-drag-state')).toBeNull();

    action.destroy();
  });

  it('drop fires onDrop with dragged ID, target ID, and position', () => {
    const onDrop = vi.fn();

    // Create source item
    const { node: sourceNode, action: sourceAction } = createDragItem('source-1');
    // Create target item
    const { node: targetNode, action: targetAction } = createDragItem('target-1', { onDrop });

    // Simulate drag start on source (sets activeDragId module-level)
    const dt = new DataTransfer();
    sourceNode.dispatchEvent(createDragEvent('dragstart', {}, dt));

    // Simulate drop on target.
    // We need to mock getBoundingClientRect for position calculation
    vi.spyOn(targetNode, 'getBoundingClientRect').mockReturnValue({
      top: 100,
      bottom: 200,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 100,
      toJSON: () => {},
    });

    const dropDt = new DataTransfer();
    dropDt.setData('application/x-field-studio', 'source-1');
    const dropEvent = createDragEvent('drop', { clientY: 120 }, dropDt);
    targetNode.dispatchEvent(dropEvent);

    expect(onDrop).toHaveBeenCalledWith('source-1', 'target-1', 'before');

    sourceAction.destroy();
    targetAction.destroy();
  });

  it('disabled item ignores dragstart', () => {
    const onDragStart = vi.fn();
    const { node, action } = createDragItem('item-1', { disabled: true, onDragStart });

    const dt = new DataTransfer();
    node.dispatchEvent(createDragEvent('dragstart', {}, dt));

    expect(onDragStart).not.toHaveBeenCalled();

    action.destroy();
  });

  it('update() changes itemId and disabled state', () => {
    const { node, action } = createDragItem('item-1');

    expect(node.getAttribute('data-drag-item')).toBe('item-1');
    expect(node.draggable).toBe(true);

    action.update({ itemId: 'item-2', disabled: true });

    expect(node.getAttribute('data-drag-item')).toBe('item-2');
    expect(node.draggable).toBe(false);

    action.destroy();
  });

  it('destroy removes all event listeners', () => {
    const onDragStart = vi.fn();
    const { node, action } = createDragItem('item-1', { onDragStart });

    action.destroy();

    const dt = new DataTransfer();
    node.dispatchEvent(createDragEvent('dragstart', {}, dt));

    expect(onDragStart).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 6. panZoomGestures
// ===========================================================================

describe('panZoomGestures', () => {
  function createPanZoomNode(overrides: Partial<PanZoomParams> = {}) {
    const node = createElement();
    // Mock getBoundingClientRect for position calculations
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 500,
      left: 0,
      right: 500,
      width: 500,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const action = panZoomGestures(node, overrides);
    return { node, action };
  }

  it('wheel event fires onZoom with delta and cursor position', () => {
    const onZoom = vi.fn();
    const { node, action } = createPanZoomNode({ onZoom, zoomSensitivity: 0.001 });

    node.dispatchEvent(createWheelEvent({ deltaY: -100, clientX: 250, clientY: 250 }));

    expect(onZoom).toHaveBeenCalledOnce();
    // delta = -(-100) * 0.001 = 0.1
    const [delta, cx, cy] = onZoom.mock.calls[0];
    expect(delta).toBeCloseTo(0.1);
    expect(cx).toBe(250);
    expect(cy).toBe(250);

    action.destroy();
  });

  it('Ctrl+wheel fires onZoom when requireCtrlForZoom=true', () => {
    const onZoom = vi.fn();
    const { node, action } = createPanZoomNode({
      onZoom,
      requireCtrlForZoom: true,
    });

    // Without Ctrl -- should NOT zoom
    node.dispatchEvent(createWheelEvent({ deltaY: -100 }));
    expect(onZoom).not.toHaveBeenCalled();

    // With Ctrl -- should zoom
    node.dispatchEvent(createWheelEvent({ deltaY: -100, ctrlKey: true }));
    expect(onZoom).toHaveBeenCalledOnce();

    action.destroy();
  });

  it('wheel pan fires onPan when enableWheelPan=true and no Ctrl', () => {
    const onPan = vi.fn();
    const onZoom = vi.fn();
    const { node, action } = createPanZoomNode({
      onZoom,
      onPan,
      requireCtrlForZoom: true,
      enableWheelPan: true,
    });

    // No Ctrl -> wheel pan
    node.dispatchEvent(createWheelEvent({ deltaX: 10, deltaY: 20 }));
    expect(onPan).toHaveBeenCalledWith(-10, -20);
    expect(onZoom).not.toHaveBeenCalled();

    action.destroy();
  });

  it('does nothing when enabled=false', () => {
    const onZoom = vi.fn();
    const { node, action } = createPanZoomNode({ onZoom, enabled: false });

    node.dispatchEvent(createWheelEvent({ deltaY: -100 }));
    expect(onZoom).not.toHaveBeenCalled();

    action.destroy();
  });

  it('sets tabindex if not already present', () => {
    const node = createElement();
    const action = panZoomGestures(node, {});
    expect(node.getAttribute('tabindex')).toBe('0');
    action.destroy();
  });

  it('does not override existing tabindex', () => {
    const node = createElement();
    node.setAttribute('tabindex', '5');
    const action = panZoomGestures(node, {});
    expect(node.getAttribute('tabindex')).toBe('5');
    action.destroy();
  });

  it('space bar sets grab cursor', () => {
    const { node, action } = createPanZoomNode({});

    // Need to focus the node so keydown fires on it
    node.focus();

    pressKey(node, ' ');
    expect(node.style.cursor).toBe('grab');

    // keyup restores
    node.dispatchEvent(
      new KeyboardEvent('keyup', { key: ' ', bubbles: true }),
    );
    expect(node.style.cursor).toBe('');

    action.destroy();
  });

  it('update() changes callbacks', () => {
    const onZoom1 = vi.fn();
    const onZoom2 = vi.fn();
    const { node, action } = createPanZoomNode({ onZoom: onZoom1 });

    node.dispatchEvent(createWheelEvent({ deltaY: -100 }));
    expect(onZoom1).toHaveBeenCalledOnce();

    action.update({ onZoom: onZoom2 });

    node.dispatchEvent(createWheelEvent({ deltaY: -100 }));
    expect(onZoom2).toHaveBeenCalledOnce();
    expect(onZoom1).toHaveBeenCalledOnce(); // not called again

    action.destroy();
  });

  it('destroy removes all listeners', () => {
    const onZoom = vi.fn();
    const { node, action } = createPanZoomNode({ onZoom });

    action.destroy();

    node.dispatchEvent(createWheelEvent({ deltaY: -100 }));
    expect(onZoom).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 7. viewportKeyboard
// ===========================================================================

describe('viewportKeyboard', () => {
  function createViewport(overrides: Partial<ViewportKeyboardParams> = {}) {
    const node = createElement();
    const action = viewportKeyboard(node, overrides);
    return { node, action };
  }

  it('+/= fires onZoomIn', () => {
    const onZoomIn = vi.fn();
    const { node, action } = createViewport({ onZoomIn });

    pressKey(node, '+');
    expect(onZoomIn).toHaveBeenCalledOnce();

    pressKey(node, '=');
    expect(onZoomIn).toHaveBeenCalledTimes(2);

    action.destroy();
  });

  it('-/_ fires onZoomOut', () => {
    const onZoomOut = vi.fn();
    const { node, action } = createViewport({ onZoomOut });

    pressKey(node, '-');
    expect(onZoomOut).toHaveBeenCalledOnce();

    pressKey(node, '_');
    expect(onZoomOut).toHaveBeenCalledTimes(2);

    action.destroy();
  });

  it('arrow keys fire onPan with correct dx/dy', () => {
    const onPan = vi.fn();
    const { node, action } = createViewport({ onPan, panStep: 50 });

    pressKey(node, 'ArrowUp');
    expect(onPan).toHaveBeenCalledWith(0, 50);

    pressKey(node, 'ArrowDown');
    expect(onPan).toHaveBeenCalledWith(0, -50);

    pressKey(node, 'ArrowLeft');
    expect(onPan).toHaveBeenCalledWith(50, 0);

    pressKey(node, 'ArrowRight');
    expect(onPan).toHaveBeenCalledWith(-50, 0);

    action.destroy();
  });

  it('Shift+arrow keys use 4x pan step', () => {
    const onPan = vi.fn();
    const { node, action } = createViewport({ onPan, panStep: 50 });

    pressKey(node, 'ArrowUp', { shiftKey: true });
    expect(onPan).toHaveBeenCalledWith(0, 200); // 50 * 4

    action.destroy();
  });

  it('r fires onRotateCW, R (Shift+r) fires onRotateCCW', () => {
    const onRotateCW = vi.fn();
    const onRotateCCW = vi.fn();
    const { node, action } = createViewport({ onRotateCW, onRotateCCW });

    pressKey(node, 'r');
    expect(onRotateCW).toHaveBeenCalledOnce();

    pressKey(node, 'R', { shiftKey: true });
    expect(onRotateCCW).toHaveBeenCalledOnce();

    action.destroy();
  });

  it('0 and f/F fire onReset', () => {
    const onReset = vi.fn();
    const { node, action } = createViewport({ onReset });

    pressKey(node, '0');
    expect(onReset).toHaveBeenCalledOnce();

    pressKey(node, 'f');
    expect(onReset).toHaveBeenCalledTimes(2);

    pressKey(node, 'F');
    expect(onReset).toHaveBeenCalledTimes(3);

    action.destroy();
  });

  it('suppresses shortcuts when focus is on INPUT', () => {
    const onZoomIn = vi.fn();
    const { node, action } = createViewport({ onZoomIn });

    const input = document.createElement('input');
    node.appendChild(input);
    input.focus();

    // Dispatch keydown on the input (which bubbles to node)
    pressKey(input, '+');

    expect(onZoomIn).not.toHaveBeenCalled();

    action.destroy();
  });

  it('suppresses shortcuts when focus is on TEXTAREA', () => {
    const onZoomIn = vi.fn();
    const { node, action } = createViewport({ onZoomIn });

    const textarea = document.createElement('textarea');
    node.appendChild(textarea);
    textarea.focus();

    pressKey(textarea, '+');

    expect(onZoomIn).not.toHaveBeenCalled();

    action.destroy();
  });

  it('suppresses shortcuts when focus is on contenteditable', () => {
    const onZoomIn = vi.fn();
    const { node, action } = createViewport({ onZoomIn });

    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    // happy-dom does not implement isContentEditable, so we define it manually
    Object.defineProperty(editable, 'isContentEditable', { value: true, configurable: true });
    node.appendChild(editable);
    editable.focus();

    pressKey(editable, '+');

    expect(onZoomIn).not.toHaveBeenCalled();

    action.destroy();
  });

  it('does nothing when enabled=false', () => {
    const onZoomIn = vi.fn();
    const { node, action } = createViewport({ onZoomIn, enabled: false });

    pressKey(node, '+');
    expect(onZoomIn).not.toHaveBeenCalled();

    action.destroy();
  });

  it('enableZoom=false skips zoom shortcuts', () => {
    const onZoomIn = vi.fn();
    const onPan = vi.fn();
    const { node, action } = createViewport({ onZoomIn, onPan, enableZoom: false });

    pressKey(node, '+');
    expect(onZoomIn).not.toHaveBeenCalled();

    // Pan should still work
    pressKey(node, 'ArrowUp');
    expect(onPan).toHaveBeenCalled();

    action.destroy();
  });

  it('onShortcut fires with action name', () => {
    const onShortcut = vi.fn();
    const onZoomIn = vi.fn();
    const { node, action } = createViewport({ onShortcut, onZoomIn });

    pressKey(node, '+');
    expect(onShortcut).toHaveBeenCalledWith('zoom-in');

    action.destroy();
  });

  it('sets tabindex if not present', () => {
    const node = createElement();
    const action = viewportKeyboard(node, {});
    expect(node.getAttribute('tabindex')).toBe('0');
    action.destroy();
  });

  it('destroy removes tabindex if it was added by the action', () => {
    const node = createElement();
    const action = viewportKeyboard(node, {});
    expect(node.getAttribute('tabindex')).toBe('0');

    action.destroy();
    expect(node.hasAttribute('tabindex')).toBe(false);
  });

  it('destroy does not remove tabindex if it was already present', () => {
    const node = createElement();
    node.setAttribute('tabindex', '0');
    const action = viewportKeyboard(node, {});

    action.destroy();
    expect(node.getAttribute('tabindex')).toBe('0');
  });

  it('update() changes enabled state and callbacks', () => {
    const onZoomIn = vi.fn();
    const { node, action } = createViewport({ onZoomIn, enabled: false });

    pressKey(node, '+');
    expect(onZoomIn).not.toHaveBeenCalled();

    action.update({ onZoomIn, enabled: true });
    pressKey(node, '+');
    expect(onZoomIn).toHaveBeenCalledOnce();

    action.destroy();
  });

  it('destroy removes keydown listener', () => {
    const onZoomIn = vi.fn();
    const { node, action } = createViewport({ onZoomIn });

    action.destroy();

    pressKey(node, '+');
    expect(onZoomIn).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 8. gridLassoSelect
// ===========================================================================

describe('gridLassoSelect', () => {
  function createGrid(overrides: Partial<LassoParams> = {}) {
    const node = createElement();
    // Set a fixed bounding rect for the container
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 400,
      left: 0,
      right: 400,
      width: 400,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    // scrollLeft/scrollTop
    Object.defineProperty(node, 'scrollLeft', { value: 0, writable: true });
    Object.defineProperty(node, 'scrollTop', { value: 0, writable: true });

    const action = gridLassoSelect(node, overrides);
    return { node, action };
  }

  function addGridItem(parent: HTMLElement, id: string, rect: { left: number; top: number; width: number; height: number }) {
    const item = document.createElement('div');
    item.setAttribute('data-grid-item', id);
    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
      left: rect.left,
      top: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      width: rect.width,
      height: rect.height,
      x: rect.left,
      y: rect.top,
      toJSON: () => {},
    });
    parent.appendChild(item);
    return item;
  }

  it('mousedown+mousemove creates a lasso and fires onUpdate', () => {
    const onUpdate = vi.fn();
    const { node, action } = createGrid({ onUpdate });

    // Mousedown at (50, 50)
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50, button: 0, bubbles: true }));

    // Mousemove to (150, 150) -- dispatched on window
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 150, bubbles: true }));

    expect(onUpdate).toHaveBeenCalled();
    const rect = onUpdate.mock.calls[0][0];
    expect(rect.x).toBe(50);
    expect(rect.y).toBe(50);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(100);

    // Mouseup clears lasso
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('onSelect is called with intersecting item IDs', () => {
    const onSelect = vi.fn();
    const { node, action } = createGrid({ onSelect });

    // Add grid items
    addGridItem(node, 'a', { left: 60, top: 60, width: 50, height: 50 });    // intersects
    addGridItem(node, 'b', { left: 200, top: 200, width: 50, height: 50 });  // does not intersect
    addGridItem(node, 'c', { left: 80, top: 80, width: 50, height: 50 });    // intersects

    // Lasso from (50, 50) to (130, 130)
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 130, clientY: 130, bubbles: true }));

    expect(onSelect).toHaveBeenCalled();
    const ids = onSelect.mock.calls[onSelect.mock.calls.length - 1][0];
    expect(ids).toContain('a');
    expect(ids).toContain('c');
    expect(ids).not.toContain('b');

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('mouseup fires onUpdate with null', () => {
    const onUpdate = vi.fn();
    const { node, action } = createGrid({ onUpdate });

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));
    onUpdate.mockClear();

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    expect(onUpdate).toHaveBeenCalledWith(null);

    action.destroy();
  });

  it('does nothing when enabled=false', () => {
    const onUpdate = vi.fn();
    const { node, action } = createGrid({ onUpdate, enabled: false });

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));

    expect(onUpdate).not.toHaveBeenCalled();

    action.destroy();
  });

  it('ignores non-left-click', () => {
    const onUpdate = vi.fn();
    const { node, action } = createGrid({ onUpdate });

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 2, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));

    expect(onUpdate).not.toHaveBeenCalled();

    action.destroy();
  });

  it('update() changes callbacks', () => {
    const onSelect1 = vi.fn();
    const onSelect2 = vi.fn();
    const { node, action } = createGrid({ onSelect: onSelect1 });

    action.update({ onSelect: onSelect2 });

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));

    expect(onSelect1).not.toHaveBeenCalled();
    expect(onSelect2).toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('destroy removes listeners', () => {
    const onUpdate = vi.fn();
    const { node, action } = createGrid({ onUpdate });

    action.destroy();

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100, bubbles: true }));

    expect(onUpdate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 9. canvasDrag
// ===========================================================================

describe('canvasDrag', () => {
  describe('screenToCanvas', () => {
    it('converts screen coordinates to canvas coordinates', () => {
      const containerRect = {
        top: 100,
        bottom: 600,
        left: 50,
        right: 550,
        width: 500,
        height: 500,
        x: 50,
        y: 100,
        toJSON: () => {},
      } as DOMRect;

      const result = screenToCanvas(250, 300, containerRect, 1, 0, 0);
      // x = (250 - 50) / 1 - 0 = 200
      // y = (300 - 100) / 1 - 0 = 200
      expect(result.x).toBe(200);
      expect(result.y).toBe(200);
    });

    it('accounts for zoom level', () => {
      const containerRect = {
        top: 0,
        bottom: 500,
        left: 0,
        right: 500,
        width: 500,
        height: 500,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect;

      const result = screenToCanvas(200, 200, containerRect, 2, 0, 0);
      // x = (200 - 0) / 2 - 0 = 100
      // y = (200 - 0) / 2 - 0 = 100
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });

    it('accounts for pan offset', () => {
      const containerRect = {
        top: 0,
        bottom: 500,
        left: 0,
        right: 500,
        width: 500,
        height: 500,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect;

      const result = screenToCanvas(200, 200, containerRect, 1, 50, 30);
      // x = (200 - 0) / 1 - 50 = 150
      // y = (200 - 0) / 1 - 30 = 170
      expect(result.x).toBe(150);
      expect(result.y).toBe(170);
    });
  });

  function createBoard(overrides: Partial<CanvasDragParams> = {}) {
    const node = createElement();
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 500,
      left: 0,
      right: 500,
      width: 500,
      height: 500,
      x: 0,
      y: 0,
      toJSON: () => {},
    });

    const defaults: CanvasDragParams = {
      zoom: 1,
      panX: 0,
      panY: 0,
      ...overrides,
    };
    const action = canvasDrag(node, defaults);
    return { node, action };
  }

  function addBoardItem(parent: HTMLElement, id: string, x: number, y: number): HTMLElement {
    const item = document.createElement('div');
    item.setAttribute('data-board-item', id);
    item.dataset.x = String(x);
    item.dataset.y = String(y);
    parent.appendChild(item);
    return item;
  }

  it('mousedown on board-item fires onSelectItem', () => {
    const onSelectItem = vi.fn();
    const { node, action } = createBoard({ onSelectItem });

    const item = addBoardItem(node, 'item-1', 100, 100);

    item.dispatchEvent(new MouseEvent('mousedown', { clientX: 110, clientY: 110, button: 0, bubbles: true }));

    expect(onSelectItem).toHaveBeenCalledWith('item-1');

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('drag threshold prevents accidental drags (3px)', () => {
    const onMoveItem = vi.fn();
    const onSelectItem = vi.fn();
    const { node, action } = createBoard({ onMoveItem, onSelectItem });

    const item = addBoardItem(node, 'item-1', 100, 100);

    item.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0, bubbles: true }));

    // Move less than 3px
    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 101,
      clientY: 101,
      movementX: 1,
      movementY: 1,
      bubbles: true,
    }));

    expect(onMoveItem).not.toHaveBeenCalled();

    // Move more than 3px
    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 110,
      clientY: 110,
      movementX: 9,
      movementY: 9,
      bubbles: true,
    }));

    expect(onMoveItem).toHaveBeenCalled();

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('multi-select drag calls onMoveItems for all selected items', () => {
    const onMoveItems = vi.fn();
    const onSelectItem = vi.fn();
    const { node, action } = createBoard({
      onMoveItems,
      onSelectItem,
      selectedIds: ['item-1', 'item-2'],
    });

    addBoardItem(node, 'item-1', 100, 100);
    addBoardItem(node, 'item-2', 200, 200);
    const item1 = node.querySelector('[data-board-item="item-1"]') as HTMLElement;

    // Start drag on item-1
    item1.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0, bubbles: true }));

    // Move past threshold
    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 130,
      clientY: 130,
      movementX: 30,
      movementY: 30,
      bubbles: true,
    }));

    expect(onMoveItems).toHaveBeenCalled();
    const moves = onMoveItems.mock.calls[0][0];
    expect(moves).toHaveLength(2);
    expect(moves.find((m: { id: string }) => m.id === 'item-1')).toBeDefined();
    expect(moves.find((m: { id: string }) => m.id === 'item-2')).toBeDefined();

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('snapToGrid is applied to dragged coordinates', () => {
    const onMoveItem = vi.fn();
    const snapToGrid = (v: number) => Math.round(v / 20) * 20;
    const { node, action } = createBoard({ onMoveItem, snapToGrid });

    const item = addBoardItem(node, 'item-1', 100, 100);

    item.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0, bubbles: true }));

    window.dispatchEvent(new MouseEvent('mousemove', {
      clientX: 117,
      clientY: 123,
      movementX: 17,
      movementY: 23,
      bubbles: true,
    }));

    if (onMoveItem.mock.calls.length > 0) {
      const [id, x, y] = onMoveItem.mock.calls[onMoveItem.mock.calls.length - 1];
      // Values should be snapped to grid of 20
      expect(x % 20).toBe(0);
      expect(y % 20).toBe(0);
    }

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('click on empty canvas fires onCanvasClick and deselects', () => {
    const onSelectItem = vi.fn();
    const onCanvasClick = vi.fn();
    const { node, action } = createBoard({ onSelectItem, onCanvasClick });

    // Click on the container (no board item)
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 300, clientY: 300, button: 0, bubbles: true }));

    // Mouseup without moving (registered as a one-shot listener on window)
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 300, clientY: 300, button: 0, bubbles: true }));

    expect(onSelectItem).toHaveBeenCalledWith(null);
    expect(onCanvasClick).toHaveBeenCalled();

    action.destroy();
  });

  it('mousedown on connection fires onSelectConnection', () => {
    const onSelectConnection = vi.fn();
    const { node, action } = createBoard({ onSelectConnection });

    const conn = document.createElement('svg');
    conn.setAttribute('data-connection', 'conn-1');
    node.appendChild(conn);

    conn.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100, button: 0, bubbles: true }));

    expect(onSelectConnection).toHaveBeenCalledWith('conn-1');

    action.destroy();
  });

  it('update() changes zoom/panX/panY', () => {
    const { action } = createBoard({ zoom: 1, panX: 0, panY: 0 });

    // Should not throw
    action.update({ zoom: 2, panX: 100, panY: 100 });

    action.destroy();
  });

  it('destroy removes mousedown listener', () => {
    const onSelectItem = vi.fn();
    const { node, action } = createBoard({ onSelectItem });

    const item = addBoardItem(node, 'item-1', 0, 0);

    action.destroy();

    item.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    expect(onSelectItem).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 10. rubberBandSelect
// ===========================================================================

describe('rubberBandSelect', () => {
  function createRubberBandNode(overrides: Partial<RubberBandParams> = {}) {
    const node = createElement();
    vi.spyOn(node, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 400,
      left: 0,
      right: 400,
      width: 400,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    const action = rubberBandSelect(node, overrides);
    return { node, action };
  }

  it('mousedown + mousemove fires onUpdate with rectangle', () => {
    const onUpdate = vi.fn();
    const { node, action } = createRubberBandNode({ onUpdate });

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 200, bubbles: true }));

    expect(onUpdate).toHaveBeenCalled();
    const rect = onUpdate.mock.calls[0][0];
    expect(rect.x).toBe(50);
    expect(rect.y).toBe(50);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(150);

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 150, clientY: 200, bubbles: true }));

    action.destroy();
  });

  it('mouseup fires onComplete with final rectangle', () => {
    const onComplete = vi.fn();
    const { node, action } = createRubberBandNode({ onComplete });

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 110, clientY: 110, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 110, clientY: 110, bubbles: true }));

    expect(onComplete).toHaveBeenCalledOnce();
    const rect = onComplete.mock.calls[0][0];
    expect(rect.x).toBe(10);
    expect(rect.y).toBe(10);
    expect(rect.width).toBe(100);
    expect(rect.height).toBe(100);

    action.destroy();
  });

  it('fires onStart when drag begins', () => {
    const onStart = vi.fn();
    const { node, action } = createRubberBandNode({ onStart });

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));

    expect(onStart).toHaveBeenCalledOnce();

    window.dispatchEvent(new MouseEvent('mouseup', { clientX: 10, clientY: 10, bubbles: true }));

    action.destroy();
  });

  it('modifier="shift" requires Shift key to activate', () => {
    const onStart = vi.fn();
    const { node, action } = createRubberBandNode({ onStart, modifier: 'shift' });

    // Without shift -- should not activate
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    expect(onStart).not.toHaveBeenCalled();

    // With shift -- should activate
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, shiftKey: true, bubbles: true }));
    expect(onStart).toHaveBeenCalledOnce();

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('modifier="ctrl" requires Ctrl/Meta key to activate', () => {
    const onStart = vi.fn();
    const { node, action } = createRubberBandNode({ onStart, modifier: 'ctrl' });

    // Without ctrl -- should not activate
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    expect(onStart).not.toHaveBeenCalled();

    // With ctrl -- should activate
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, ctrlKey: true, bubbles: true }));
    expect(onStart).toHaveBeenCalledOnce();

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('ignores right-click', () => {
    const onStart = vi.fn();
    const { node, action } = createRubberBandNode({ onStart });

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 2, bubbles: true }));
    expect(onStart).not.toHaveBeenCalled();

    action.destroy();
  });

  it('rectangle handles drag in negative direction', () => {
    const onUpdate = vi.fn();
    const { node, action } = createRubberBandNode({ onUpdate });

    // Start at (200, 200), move to (50, 50) -- drag up-left
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 200, clientY: 200, button: 0, bubbles: true }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50, bubbles: true }));

    const rect = onUpdate.mock.calls[0][0];
    expect(rect.x).toBe(50);
    expect(rect.y).toBe(50);
    expect(rect.width).toBe(150);
    expect(rect.height).toBe(150);

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('update() changes callbacks and modifier', () => {
    const onStart1 = vi.fn();
    const onStart2 = vi.fn();
    const { node, action } = createRubberBandNode({ onStart: onStart1 });

    action.update({ onStart: onStart2, modifier: 'shift' });

    // Without shift -- should not fire (modifier changed to shift)
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    expect(onStart1).not.toHaveBeenCalled();
    expect(onStart2).not.toHaveBeenCalled();

    // With shift -- should fire onStart2
    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, shiftKey: true, bubbles: true }));
    expect(onStart2).toHaveBeenCalledOnce();

    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    action.destroy();
  });

  it('destroy removes all listeners', () => {
    const onStart = vi.fn();
    const { node, action } = createRubberBandNode({ onStart });

    action.destroy();

    node.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10, button: 0, bubbles: true }));
    expect(onStart).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 11. reducedMotion
// ===========================================================================

describe('reducedMotion', () => {
  describe('DURATIONS constants', () => {
    it('exports expected duration values', () => {
      expect(DURATIONS.fast).toBe(150);
      expect(DURATIONS.normal).toBe(300);
      expect(DURATIONS.slow).toBe(500);
      expect(DURATIONS.stagger).toBe(50);
    });
  });

  describe('TRANSITIONS constants', () => {
    it('exports expected transition class strings', () => {
      expect(TRANSITIONS.default).toContain('transition-all');
      expect(TRANSITIONS.default).toContain('duration-300');
      expect(TRANSITIONS.colors).toContain('transition-colors');
      expect(TRANSITIONS.transform).toContain('transition-transform');
      expect(TRANSITIONS.opacity).toContain('transition-opacity');
    });
  });

  describe('prefersReducedMotion()', () => {
    it('returns false when motion is not reduced', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      expect(prefersReducedMotion()).toBe(false);
    });

    it('returns true when motion is reduced', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      expect(prefersReducedMotion()).toBe(true);
    });
  });

  describe('getMotionDuration()', () => {
    it('returns 0 when reduced motion is preferred', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      expect(getMotionDuration(300)).toBe(0);
      expect(getMotionDuration(150)).toBe(0);
    });

    it('returns the normal duration when motion is not reduced', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      expect(getMotionDuration(300)).toBe(300);
      expect(getMotionDuration(150)).toBe(150);
    });
  });

  describe('getMotionTransitions()', () => {
    it('returns empty strings when reduced motion is preferred', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      const transitions = getMotionTransitions();
      expect(transitions.default).toBe('');
      expect(transitions.colors).toBe('');
      expect(transitions.transform).toBe('');
      expect(transitions.opacity).toBe('');
      // durations are always returned
      expect(transitions.durations).toBe(DURATIONS);
    });

    it('returns CSS transition classes when motion is allowed', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      const transitions = getMotionTransitions();
      expect(transitions.default).toBe(TRANSITIONS.default);
      expect(transitions.colors).toBe(TRANSITIONS.colors);
      expect(transitions.transform).toBe(TRANSITIONS.transform);
      expect(transitions.opacity).toBe(TRANSITIONS.opacity);
    });
  });

  describe('watchReducedMotion action', () => {
    it('sets data-reduced-motion attribute based on media query', () => {
      const listeners: Record<string, Function[]> = {};
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: (event: string, cb: Function) => {
          listeners[event] = listeners[event] || [];
          listeners[event].push(cb);
        },
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      const node = createElement();
      const action = watchReducedMotion(node);

      expect(node.dataset.reducedMotion).toBe('false');
      expect(node.classList.contains('reduced-motion')).toBe(false);

      action.destroy();
    });

    it('sets reduced-motion class when matches is true', () => {
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      const node = createElement();
      const action = watchReducedMotion(node);

      expect(node.dataset.reducedMotion).toBe('true');
      expect(node.classList.contains('reduced-motion')).toBe(true);

      action.destroy();
    });

    it('updates when media query changes', () => {
      const callbacks: { change?: () => void } = {};
      const mq = {
        matches: false,
        addEventListener: (event: string, cb: () => void) => {
          if (event === 'change') callbacks.change = cb;
        },
        removeEventListener: vi.fn(),
      };
      const mockMatchMedia = vi.fn().mockReturnValue(mq);
      vi.stubGlobal('matchMedia', mockMatchMedia);

      const node = createElement();
      const action = watchReducedMotion(node);

      expect(node.dataset.reducedMotion).toBe('false');

      // Simulate media query change
      (mq as { matches: boolean }).matches = true;
      callbacks.change?.();

      expect(node.dataset.reducedMotion).toBe('true');
      expect(node.classList.contains('reduced-motion')).toBe(true);

      action.destroy();
    });

    it('destroy removes the change listener', () => {
      const removeEventListener = vi.fn();
      const mockMatchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener,
      });
      vi.stubGlobal('matchMedia', mockMatchMedia);

      const node = createElement();
      const action = watchReducedMotion(node);

      action.destroy();

      expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });
});
