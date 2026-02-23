/**
 * ImageFilterPanel — Component tests
 *
 * Verifies:
 *   1. Renders filter controls (brightness, contrast sliders)
 *   2. Renders toggle buttons (invert, grayscale)
 *   3. Calls onBrightnessChange when brightness slider changes
 *   4. Calls onContrastChange when contrast slider changes
 *   5. Calls onToggleInvert / onToggleGrayscale on toggle clicks
 *   6. Calls onReset when reset button clicked (only visible when isActive)
 *   7. Calls onClose when close button clicked or Escape pressed
 *   8. Shows field mode styling when fieldMode=true
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ImageFilterPanel from '../ui/molecules/ImageFilterPanel.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cx = {} as any;

function defaultFilters() {
  return {
    brightness: 0,
    contrast: 0,
    saturation: 100,
    invert: false,
    grayscale: false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defaultProps(overrides: Record<string, unknown> = {}): any {
  return {
    filters: defaultFilters(),
    isActive: false,
    onBrightnessChange: vi.fn(),
    onContrastChange: vi.fn(),
    onToggleInvert: vi.fn(),
    onToggleGrayscale: vi.fn(),
    onReset: vi.fn(),
    onClose: vi.fn(),
    cx,
    fieldMode: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let target: HTMLDivElement;
let component: Record<string, unknown>;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  if (component) unmount(component);
  target.remove();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImageFilterPanel', () => {
  // ---- Rendering ----------------------------------------------------------

  it('renders as a dialog with aria-label "Image filters"', () => {
    component = mount(ImageFilterPanel, { target, props: defaultProps() });
    const dialog = target.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.getAttribute('aria-label')).toBe('Image filters');
  });

  it('renders two range sliders for brightness and contrast', () => {
    component = mount(ImageFilterPanel, { target, props: defaultProps() });
    const sliders = target.querySelectorAll('input[type="range"]');
    expect(sliders.length).toBe(2);

    const labels = Array.from(sliders).map((s) => s.getAttribute('aria-label'));
    expect(labels).toContain('Brightness');
    expect(labels).toContain('Contrast');
  });

  it('renders toggle buttons for Invert Colors and Grayscale', () => {
    component = mount(ImageFilterPanel, { target, props: defaultProps() });
    const buttons = target.querySelectorAll('button[aria-pressed]');
    expect(buttons.length).toBe(2);

    const firstText = buttons[0].textContent;
    const secondText = buttons[1].textContent;
    expect(firstText).toContain('Invert Colors');
    expect(secondText).toContain('Grayscale');
  });

  it('sets aria-pressed=false when filters are inactive', () => {
    component = mount(ImageFilterPanel, { target, props: defaultProps() });
    const toggles = target.querySelectorAll('button[aria-pressed]');
    expect(toggles[0].getAttribute('aria-pressed')).toBe('false');
    expect(toggles[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('sets aria-pressed=true when invert/grayscale are active', () => {
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({
        filters: { ...defaultFilters(), invert: true, grayscale: true },
      }),
    });
    const toggles = target.querySelectorAll('button[aria-pressed]');
    expect(toggles[0].getAttribute('aria-pressed')).toBe('true');
    expect(toggles[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('displays formatted brightness value with sign', () => {
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({
        filters: { ...defaultFilters(), brightness: 50 },
      }),
    });
    // formatValue(50) === "+50"
    expect(target.textContent).toContain('+50');
  });

  it('displays negative contrast value without plus sign', () => {
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({
        filters: { ...defaultFilters(), contrast: -30 },
      }),
    });
    expect(target.textContent).toContain('-30');
  });

  // ---- Slider callbacks ---------------------------------------------------

  it('calls onBrightnessChange when brightness slider changes', () => {
    const onBrightnessChange = vi.fn();
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ onBrightnessChange }),
    });

    const sliders = target.querySelectorAll('input[type="range"]');
    const brightnessSlider = Array.from(sliders).find(
      (s) => s.getAttribute('aria-label') === 'Brightness'
    ) as HTMLInputElement;

    brightnessSlider.value = '42';
    flushSync(() => {
      brightnessSlider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onBrightnessChange).toHaveBeenCalledWith(42);
  });

  it('calls onContrastChange when contrast slider changes', () => {
    const onContrastChange = vi.fn();
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ onContrastChange }),
    });

    const sliders = target.querySelectorAll('input[type="range"]');
    const contrastSlider = Array.from(sliders).find(
      (s) => s.getAttribute('aria-label') === 'Contrast'
    ) as HTMLInputElement;

    contrastSlider.value = '-20';
    flushSync(() => {
      contrastSlider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onContrastChange).toHaveBeenCalledWith(-20);
  });

  // ---- Toggle callbacks ---------------------------------------------------

  it('calls onToggleInvert when invert toggle clicked', () => {
    const onToggleInvert = vi.fn();
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ onToggleInvert }),
    });

    const toggles = target.querySelectorAll('button[aria-pressed]');
    flushSync(() => {
      (toggles[0] as HTMLButtonElement).click();
    });
    expect(onToggleInvert).toHaveBeenCalledOnce();
  });

  it('calls onToggleGrayscale when grayscale toggle clicked', () => {
    const onToggleGrayscale = vi.fn();
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ onToggleGrayscale }),
    });

    const toggles = target.querySelectorAll('button[aria-pressed]');
    flushSync(() => {
      (toggles[1] as HTMLButtonElement).click();
    });
    expect(onToggleGrayscale).toHaveBeenCalledOnce();
  });

  // ---- Reset button -------------------------------------------------------

  it('hides reset button when isActive=false', () => {
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ isActive: false }),
    });
    // "Reset" text should not appear (close button uses Icon, not text)
    const allText = target.textContent || '';
    expect(allText).not.toContain('Reset');
  });

  it('shows reset button when isActive=true and calls onReset on click', () => {
    const onReset = vi.fn();
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ isActive: true, onReset }),
    });

    // Find the button containing "Reset" text
    const buttons = target.querySelectorAll('button');
    const resetBtn = Array.from(buttons).find((b) => b.textContent?.includes('Reset'));
    expect(resetBtn).toBeTruthy();

    flushSync(() => {
      resetBtn!.click();
    });
    expect(onReset).toHaveBeenCalledOnce();
  });

  // ---- Close button / Escape key ------------------------------------------

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ onClose }),
    });

    // Close button has aria-label="Close"
    const closeBtn = target.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();

    flushSync(() => {
      closeBtn.click();
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key pressed within dialog', () => {
    const onClose = vi.fn();
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ onClose }),
    });

    const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
    flushSync(() => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ---- Field mode styling -------------------------------------------------

  it('applies dark background classes when fieldMode=true', () => {
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ fieldMode: true }),
    });
    const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('bg-nb-black/95');
    expect(dialog.className).toContain('border-nb-yellow/30');
  });

  it('applies light background classes when fieldMode=false', () => {
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({ fieldMode: false }),
    });
    const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).toContain('bg-nb-white');
    expect(dialog.className).toContain('border-nb-black/20');
  });

  it('renders header text "Image Filters"', () => {
    component = mount(ImageFilterPanel, { target, props: defaultProps() });
    expect(target.textContent).toContain('Image Filters');
  });

  it('renders check icon for active toggles', () => {
    component = mount(ImageFilterPanel, {
      target,
      props: defaultProps({
        filters: { ...defaultFilters(), invert: true },
      }),
    });
    const icons = target.querySelectorAll('.material-icons');
    const checkIcons = Array.from(icons).filter((i) => i.textContent === 'check');
    expect(checkIcons.length).toBeGreaterThanOrEqual(1);
  });
});
