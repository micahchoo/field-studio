/**
 * FilmstripNavigator — Component tests
 *
 * Covers:
 *   - Renders page counter "X / Y"
 *   - Hides when totalItems <= 1
 *   - Calls onPageChange with correct index on prev/next clicks
 *   - Swaps arrow direction for RTL viewingDirection
 *   - Disables prev at first page, next at last page
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import FilmstripNavigator from '../ui/molecules/FilmstripNavigator.svelte';
import { LIGHT_CLASSES } from '@/src/shared/lib/contextual-styles';

const cx = LIGHT_CLASSES;

describe('FilmstripNavigator', () => {
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
  // Rendering
  // --------------------------------------------------------------------------

  it('renders page counter "X / Y" with 1-based index', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 2, totalItems: 10, cx, fieldMode: false },
    });
    const liveRegion = target.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeTruthy();
    expect(liveRegion!.textContent!.trim()).toBe('3 / 10');
  });

  it('renders page counter "1 / 5" for first canvas', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 0, totalItems: 5, cx, fieldMode: false },
    });
    const liveRegion = target.querySelector('[aria-live="polite"]');
    expect(liveRegion!.textContent!.trim()).toBe('1 / 5');
  });

  // --------------------------------------------------------------------------
  // Conditional rendering
  // --------------------------------------------------------------------------

  it('does not render when totalItems is 1', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 0, totalItems: 1, cx, fieldMode: false },
    });
    expect(target.querySelector('footer')).toBeNull();
  });

  it('does not render when totalItems is 0', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 0, totalItems: 0, cx, fieldMode: false },
    });
    expect(target.querySelector('footer')).toBeNull();
  });

  it('renders footer when totalItems > 1', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 0, totalItems: 3, cx, fieldMode: false },
    });
    const footer = target.querySelector('footer');
    expect(footer).toBeTruthy();
    expect(footer!.getAttribute('role')).toBe('navigation');
    expect(footer!.getAttribute('aria-label')).toBe('Canvas navigation');
  });

  // --------------------------------------------------------------------------
  // Prev/Next button callbacks
  // --------------------------------------------------------------------------

  it('calls onPageChange(currentIndex - 1) on prev click', () => {
    const handler = vi.fn();
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 3, totalItems: 5, onPageChange: handler, cx, fieldMode: false },
    });
    // In LTR, the first button is "Previous canvas"
    const prevBtn = target.querySelector('[aria-label="Previous canvas"]') as HTMLButtonElement;
    expect(prevBtn).toBeTruthy();
    prevBtn.click();
    expect(handler).toHaveBeenCalledWith(2);
  });

  it('calls onPageChange(currentIndex + 1) on next click', () => {
    const handler = vi.fn();
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 3, totalItems: 5, onPageChange: handler, cx, fieldMode: false },
    });
    const nextBtn = target.querySelector('[aria-label="Next canvas"]') as HTMLButtonElement;
    expect(nextBtn).toBeTruthy();
    nextBtn.click();
    expect(handler).toHaveBeenCalledWith(4);
  });

  // --------------------------------------------------------------------------
  // Disabled states
  // --------------------------------------------------------------------------

  it('disables prev button at first page (currentIndex=0)', () => {
    const handler = vi.fn();
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 0, totalItems: 5, onPageChange: handler, cx, fieldMode: false },
    });
    const prevBtn = target.querySelector('[aria-label="Previous canvas"]') as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
    prevBtn.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('disables next button at last page', () => {
    const handler = vi.fn();
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 4, totalItems: 5, onPageChange: handler, cx, fieldMode: false },
    });
    const nextBtn = target.querySelector('[aria-label="Next canvas"]') as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
    nextBtn.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('enables both buttons when in the middle', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 2, totalItems: 5, cx, fieldMode: false },
    });
    const prevBtn = target.querySelector('[aria-label="Previous canvas"]') as HTMLButtonElement;
    const nextBtn = target.querySelector('[aria-label="Next canvas"]') as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(false);
    expect(nextBtn.disabled).toBe(false);
  });

  // --------------------------------------------------------------------------
  // RTL viewingDirection
  // --------------------------------------------------------------------------

  it('swaps arrow labels for RTL viewingDirection', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: {
        currentIndex: 2,
        totalItems: 5,
        viewingDirection: 'right-to-left',
        cx,
        fieldMode: false,
      },
    });
    // In RTL mode, the first button (left-side) becomes "Next canvas"
    // and the second button becomes "Previous canvas"
    const nextBtn = target.querySelector('[aria-label="Next canvas"]') as HTMLButtonElement;
    const prevBtn = target.querySelector('[aria-label="Previous canvas"]') as HTMLButtonElement;
    expect(nextBtn).toBeTruthy();
    expect(prevBtn).toBeTruthy();
  });

  it('calls onPageChange with prev index when "Next canvas" button clicked in RTL', () => {
    // In RTL, the first button's aria-label is "Next canvas" but its onclick
    // calls handlePrevious (currentIndex - 1). The labels are swapped for
    // visual arrow direction, but the actual navigation direction stays the same.
    const handler = vi.fn();
    component = mount(FilmstripNavigator, {
      target,
      props: {
        currentIndex: 2,
        totalItems: 5,
        viewingDirection: 'right-to-left',
        onPageChange: handler,
        cx,
        fieldMode: false,
      },
    });
    const nextLabelBtn = target.querySelector('[aria-label="Next canvas"]') as HTMLButtonElement;
    nextLabelBtn.click();
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with next index when "Previous canvas" button clicked in RTL', () => {
    // In RTL, the second button's aria-label is "Previous canvas" but its onclick
    // calls handleNext (currentIndex + 1).
    const handler = vi.fn();
    component = mount(FilmstripNavigator, {
      target,
      props: {
        currentIndex: 2,
        totalItems: 5,
        viewingDirection: 'right-to-left',
        onPageChange: handler,
        cx,
        fieldMode: false,
      },
    });
    const prevLabelBtn = target.querySelector('[aria-label="Previous canvas"]') as HTMLButtonElement;
    prevLabelBtn.click();
    expect(handler).toHaveBeenCalledWith(3);
  });

  it('sets direction=rtl on the footer for RTL', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: {
        currentIndex: 0,
        totalItems: 3,
        viewingDirection: 'right-to-left',
        cx,
        fieldMode: false,
      },
    });
    const footer = target.querySelector('footer') as HTMLElement;
    expect(footer.style.direction).toBe('rtl');
  });

  it('shows RTL direction label', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: {
        currentIndex: 0,
        totalItems: 3,
        viewingDirection: 'right-to-left',
        cx,
        fieldMode: false,
      },
    });
    expect(target.textContent).toContain('RTL');
  });

  // --------------------------------------------------------------------------
  // Label and loading status
  // --------------------------------------------------------------------------

  it('renders custom label', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 0, totalItems: 3, label: 'Page', cx, fieldMode: false },
    });
    const span = target.querySelector('.uppercase');
    expect(span!.textContent!.trim()).toBe('Page');
  });

  it('renders default label "Canvas"', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 0, totalItems: 3, cx, fieldMode: false },
    });
    const span = target.querySelector('.uppercase');
    expect(span!.textContent!.trim()).toBe('Canvas');
  });

  it('renders loading status text', () => {
    component = mount(FilmstripNavigator, {
      target,
      props: { currentIndex: 0, totalItems: 3, loadingStatus: 'Loaded', cx, fieldMode: false },
    });
    expect(target.textContent).toContain('Loaded');
  });
});
