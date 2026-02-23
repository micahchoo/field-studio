/**
 * viewer-atoms-new — Component tests for the 23 new viewer atoms
 *
 * Coverage:
 *   - Rendering, callback props, keyboard interaction, aria attributes
 *   - Browser API mocks (navigator.clipboard, fullscreen, localStorage)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';

import AutoAdvanceToast from '../ui/atoms/AutoAdvanceToast.svelte';
import ChoiceSelector from '../ui/atoms/ChoiceSelector.svelte';
import CodePanel from '../ui/atoms/CodePanel.svelte';
import CoordinateInput from '../ui/atoms/CoordinateInput.svelte';
import FullscreenButton from '../ui/atoms/FullscreenButton.svelte';
import ImagePreview from '../ui/atoms/ImagePreview.svelte';
import LayerToggle from '../ui/atoms/LayerToggle.svelte';
import MediaControlGroup from '../ui/atoms/MediaControlGroup.svelte';
import MediaErrorOverlay from '../ui/atoms/MediaErrorOverlay.svelte';
import MediaLoadingOverlay from '../ui/atoms/MediaLoadingOverlay.svelte';
import PageCounter from '../ui/atoms/PageCounter.svelte';
import ParameterSection from '../ui/atoms/ParameterSection.svelte';
import PlaybackRateSelect from '../ui/atoms/PlaybackRateSelect.svelte';
import ProgressBar from '../ui/atoms/ProgressBar.svelte';
import RenderingDownloadMenu from '../ui/atoms/RenderingDownloadMenu.svelte';
import RotationDial from '../ui/atoms/RotationDial.svelte';
import ScreenshotMenu from '../ui/atoms/ScreenshotMenu.svelte';
import Slider from '../ui/atoms/Slider.svelte';
import TimeDisplay from '../ui/atoms/TimeDisplay.svelte';
import UpscaleToggle from '../ui/atoms/UpscaleToggle.svelte';
import UrlBar from '../ui/atoms/UrlBar.svelte';
import ViewerModeSwitcher from '../ui/atoms/ViewerModeSwitcher.svelte';
import VolumeControl from '../ui/atoms/VolumeControl.svelte';

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

let target: HTMLDivElement;
let component: Record<string, unknown>;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);

  // Mock clipboard API
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });

  // Mock fullscreen APIs
  Object.defineProperty(document, 'fullscreenElement', {
    value: null,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document.documentElement, 'requestFullscreen', {
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document, 'exitFullscreen', {
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
    configurable: true,
  });

  // Mock localStorage
  const storage: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, val: string) => { storage[key] = val; }),
      removeItem: vi.fn((key: string) => { delete storage[key]; }),
      clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]); }),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  if (component) { try { unmount(component); } catch { /* already unmounted */ } }
  target.remove();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Shared cx for PageCounter
// ---------------------------------------------------------------------------
const cx = {
  surface: 'bg-nb-white border-2 border-nb-black',
  text: 'text-nb-black',
  textMuted: 'text-nb-black/50',
  border: 'border-nb-black',
  input: 'bg-nb-white',
  accent: 'text-nb-blue',
};

// ---------------------------------------------------------------------------
// AutoAdvanceToast
// ---------------------------------------------------------------------------

describe('AutoAdvanceToast', () => {
  it('renders the next canvas label', () => {
    component = mount(AutoAdvanceToast, {
      target,
      props: {
        nextLabel: 'Canvas 2',
        onAdvance: vi.fn(),
        onCancel: vi.fn(),
      },
    });
    expect(target.textContent).toContain('Canvas 2');
  });

  it('shows a countdown in seconds', () => {
    component = mount(AutoAdvanceToast, {
      target,
      props: { nextLabel: 'Next', duration: 5, onAdvance: vi.fn(), onCancel: vi.fn() },
    });
    expect(target.textContent).toMatch(/in \ds/);
  });

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn();
    component = mount(AutoAdvanceToast, {
      target,
      props: { nextLabel: 'Next', onAdvance: vi.fn(), onCancel },
    });
    const btn = target.querySelector('button[aria-label="Cancel auto-advance"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    flushSync(() => { btn.click(); });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('has status role for screen readers', () => {
    component = mount(AutoAdvanceToast, {
      target,
      props: { nextLabel: 'Next', onAdvance: vi.fn(), onCancel: vi.fn() },
    });
    const el = target.querySelector('[role="status"]');
    expect(el).toBeTruthy();
  });

  it('renders progress bar element', () => {
    component = mount(AutoAdvanceToast, {
      target,
      props: { nextLabel: 'Next', onAdvance: vi.fn(), onCancel: vi.fn() },
    });
    // Progress bar outer container
    const bars = target.querySelectorAll('.h-1');
    expect(bars.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// ChoiceSelector
// ---------------------------------------------------------------------------

describe('ChoiceSelector', () => {
  const items = [{ label: 'Layer A' }, { label: 'Layer B' }, { label: 'Layer C' }];

  it('renders nothing when only one item', () => {
    component = mount(ChoiceSelector, {
      target,
      props: { items: [{ label: 'Only' }], activeIndex: 0, onSelect: vi.fn() },
    });
    expect(target.querySelector('[role="radiogroup"]')).toBeNull();
  });

  it('renders radiogroup with multiple items', () => {
    component = mount(ChoiceSelector, {
      target,
      props: { items, activeIndex: 0, onSelect: vi.fn() },
    });
    expect(target.querySelector('[role="radiogroup"]')).toBeTruthy();
  });

  it('calls onSelect when a choice button is clicked', () => {
    const onSelect = vi.fn();
    component = mount(ChoiceSelector, {
      target,
      props: { items, activeIndex: 0, onSelect },
    });
    const radios = target.querySelectorAll('[role="radio"]') as NodeListOf<HTMLButtonElement>;
    flushSync(() => { radios[1].click(); });
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('marks active item with aria-checked=true', () => {
    component = mount(ChoiceSelector, {
      target,
      props: { items, activeIndex: 1, onSelect: vi.fn() },
    });
    const radios = target.querySelectorAll('[role="radio"]');
    expect(radios[1].getAttribute('aria-checked')).toBe('true');
    expect(radios[0].getAttribute('aria-checked')).toBe('false');
  });

  it('responds to keyboard shortcut (key "2" selects index 1)', () => {
    const onSelect = vi.fn();
    component = mount(ChoiceSelector, {
      target,
      props: { items, activeIndex: 0, onSelect },
    });
    // flushSync ensures the $effect (window.addEventListener) runs before we dispatch
    flushSync(() => {});
    const event = new KeyboardEvent('keydown', { key: '2', bubbles: true });
    window.dispatchEvent(event);
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});

// ---------------------------------------------------------------------------
// CodePanel
// ---------------------------------------------------------------------------

describe('CodePanel', () => {
  it('renders cURL command', () => {
    component = mount(CodePanel, {
      target,
      props: { curlCommand: 'curl https://example.com/image/full/max/0/default.jpg' },
    });
    expect(target.textContent).toContain('curl https://example.com');
  });

  it('renders HTML tag', () => {
    component = mount(CodePanel, {
      target,
      props: { htmlTag: '<img src="https://example.com/full/max/0/default.jpg" />' },
    });
    expect(target.textContent).toContain('<img src=');
  });

  it('calls clipboard.writeText when Copy cURL is clicked', async () => {
    const curlCommand = 'curl https://iiif.example.com/image';
    component = mount(CodePanel, {
      target,
      props: { curlCommand },
    });
    const btn = target.querySelector('button[aria-label="Copy cURL command"]') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    flushSync(() => { btn.click(); });
    await Promise.resolve();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(curlCommand);
  });

  it('renders pre blocks with monospace font class', () => {
    component = mount(CodePanel, {
      target,
      props: { curlCommand: 'curl ...', htmlTag: '<img />' },
    });
    const pres = target.querySelectorAll('pre');
    expect(pres.length).toBe(2);
    pres.forEach(pre => expect(pre.className).toContain('font-mono'));
  });
});

// ---------------------------------------------------------------------------
// CoordinateInput
// ---------------------------------------------------------------------------

describe('CoordinateInput', () => {
  const fields = [
    { key: 'x', label: 'X', value: 10 },
    { key: 'y', label: 'Y', value: 20 },
    { key: 'w', label: 'W', value: 100 },
    { key: 'h', label: 'H', value: 200 },
  ];

  it('renders one input per field', () => {
    component = mount(CoordinateInput, {
      target,
      props: { fields, onChange: vi.fn() },
    });
    expect(target.querySelectorAll('input[type="number"]').length).toBe(4);
  });

  it('renders field labels', () => {
    component = mount(CoordinateInput, {
      target,
      props: { fields, onChange: vi.fn() },
    });
    expect(target.textContent).toContain('X');
    expect(target.textContent).toContain('W');
  });

  it('calls onChange with key and value on input', () => {
    const onChange = vi.fn();
    component = mount(CoordinateInput, {
      target,
      props: { fields, onChange },
    });
    const input = target.querySelector('input[type="number"]') as HTMLInputElement;
    input.value = '42';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith('x', 42);
  });

  it('uses 2-column grid by default', () => {
    component = mount(CoordinateInput, {
      target,
      props: { fields, onChange: vi.fn() },
    });
    const grid = target.querySelector('.grid');
    expect(grid?.className).toContain('grid-cols-2');
  });
});

// ---------------------------------------------------------------------------
// FullscreenButton
// ---------------------------------------------------------------------------

describe('FullscreenButton', () => {
  it('renders a fullscreen button', () => {
    component = mount(FullscreenButton, {
      target,
      props: {},
    });
    const btn = target.querySelector('button[aria-label="Enter fullscreen"]');
    expect(btn).toBeTruthy();
  });

  it('shows fullscreen icon when not in fullscreen', () => {
    component = mount(FullscreenButton, { target, props: {} });
    const icon = target.querySelector('.material-icons');
    expect(icon?.textContent).toBe('fullscreen');
  });

  it('calls requestFullscreen when clicked', async () => {
    component = mount(FullscreenButton, { target, props: {} });
    const btn = target.querySelector('button') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    await Promise.resolve();
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
  });

  it('calls onFullscreenChange callback when fullscreen state changes', () => {
    const onFullscreenChange = vi.fn();
    component = mount(FullscreenButton, { target, props: { onFullscreenChange } });
    // flushSync ensures the $effect (addEventListener) runs before dispatching
    flushSync(() => {});
    const event = new Event('fullscreenchange');
    document.dispatchEvent(event);
    expect(onFullscreenChange).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------
// ImagePreview
// ---------------------------------------------------------------------------

describe('ImagePreview', () => {
  it('renders img element when src is provided', () => {
    component = mount(ImagePreview, {
      target,
      props: { src: 'https://example.com/image.jpg', alt: 'Test image' },
    });
    const img = target.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('alt')).toBe('Test image');
  });

  it('applies rotation transform via style', () => {
    component = mount(ImagePreview, {
      target,
      props: { src: 'https://example.com/image.jpg', rotation: 90 },
    });
    const img = target.querySelector('img');
    expect(img?.style.transform).toContain('rotate(90deg)');
  });

  it('applies mirror transform when mirrored=true', () => {
    component = mount(ImagePreview, {
      target,
      props: { src: 'https://example.com/image.jpg', mirrored: true },
    });
    const img = target.querySelector('img');
    expect(img?.style.transform).toContain('scaleX(-1)');
  });

  it('uses fieldMode dark background', () => {
    component = mount(ImagePreview, {
      target,
      props: { src: 'https://example.com/image.jpg', fieldMode: true },
    });
    const container = target.firstElementChild;
    expect(container?.className).toContain('bg-nb-black');
  });

  it('renders no img when src is empty', () => {
    component = mount(ImagePreview, { target, props: { src: '' } });
    expect(target.querySelector('img')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// LayerToggle
// ---------------------------------------------------------------------------

describe('LayerToggle', () => {
  it('renders layer label and count', () => {
    component = mount(LayerToggle, {
      target,
      props: { id: 'l1', label: 'Annotations', count: 5, onToggle: vi.fn() },
    });
    expect(target.textContent).toContain('Annotations');
    expect(target.textContent).toContain('(5)');
  });

  it('calls onToggle with id when button clicked', () => {
    const onToggle = vi.fn();
    component = mount(LayerToggle, {
      target,
      props: { id: 'layer-1', label: 'Test', count: 0, onToggle },
    });
    const btn = target.querySelector('[role="checkbox"]') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    expect(onToggle).toHaveBeenCalledWith('layer-1');
  });

  it('sets aria-checked=true when visible', () => {
    component = mount(LayerToggle, {
      target,
      props: { id: 'l1', label: 'Test', count: 0, visible: true, onToggle: vi.fn() },
    });
    const btn = target.querySelector('[role="checkbox"]');
    expect(btn?.getAttribute('aria-checked')).toBe('true');
  });

  it('sets aria-checked=false when not visible', () => {
    component = mount(LayerToggle, {
      target,
      props: { id: 'l1', label: 'Test', count: 0, visible: false, onToggle: vi.fn() },
    });
    const btn = target.querySelector('[role="checkbox"]');
    expect(btn?.getAttribute('aria-checked')).toBe('false');
  });

  it('shows opacity slider when visible and onOpacityChange provided', () => {
    component = mount(LayerToggle, {
      target,
      props: {
        id: 'l1', label: 'Test', count: 0, visible: true,
        onToggle: vi.fn(), onOpacityChange: vi.fn(), opacity: 0.8,
      },
    });
    const slider = target.querySelector('input[type="range"]');
    expect(slider).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// MediaControlGroup
// ---------------------------------------------------------------------------

describe('MediaControlGroup', () => {
  it('renders children', () => {
    component = mount(MediaControlGroup, {
      target,
      props: {
        children: (() => {}) as unknown as import('svelte').Snippet,
      },
    });
    // Just check it renders a flex container
    const div = target.querySelector('div');
    expect(div).toBeTruthy();
    expect(div?.className).toContain('flex');
  });

  it('applies horizontal flex by default', () => {
    component = mount(MediaControlGroup, {
      target,
      props: { children: (() => {}) as unknown as import('svelte').Snippet },
    });
    const div = target.querySelector('div');
    expect(div?.className).toContain('flex-row');
  });

  it('applies vertical flex when direction=vertical', () => {
    component = mount(MediaControlGroup, {
      target,
      props: {
        direction: 'vertical',
        children: (() => {}) as unknown as import('svelte').Snippet,
      },
    });
    const div = target.querySelector('div');
    expect(div?.className).toContain('flex-col');
  });
});

// ---------------------------------------------------------------------------
// MediaErrorOverlay
// ---------------------------------------------------------------------------

describe('MediaErrorOverlay', () => {
  it('renders with role=alert', () => {
    component = mount(MediaErrorOverlay, {
      target,
      props: { message: 'Network error' },
    });
    expect(target.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('displays error message', () => {
    component = mount(MediaErrorOverlay, {
      target,
      props: { message: 'Connection failed' },
    });
    expect(target.textContent).toContain('Connection failed');
  });

  it('shows retry button when onRetry is provided', () => {
    component = mount(MediaErrorOverlay, {
      target,
      props: { message: 'Error', onRetry: vi.fn() },
    });
    expect(target.querySelector('button[aria-label="Retry loading media"]')).toBeTruthy();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    component = mount(MediaErrorOverlay, {
      target,
      props: { message: 'Error', onRetry },
    });
    const btn = target.querySelector('button[aria-label="Retry loading media"]') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('hides retry button when onRetry not provided', () => {
    component = mount(MediaErrorOverlay, {
      target,
      props: { message: 'Error' },
    });
    expect(target.querySelector('button')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// MediaLoadingOverlay
// ---------------------------------------------------------------------------

describe('MediaLoadingOverlay', () => {
  it('renders with role=status', () => {
    component = mount(MediaLoadingOverlay, { target, props: {} });
    expect(target.querySelector('[role="status"]')).toBeTruthy();
  });

  it('has aria-busy=true', () => {
    component = mount(MediaLoadingOverlay, { target, props: {} });
    const el = target.querySelector('[role="status"]');
    expect(el?.getAttribute('aria-busy')).toBe('true');
  });

  it('shows message when provided', () => {
    component = mount(MediaLoadingOverlay, {
      target,
      props: { message: 'Buffering...' },
    });
    expect(target.textContent).toContain('Buffering...');
  });

  it('includes sr-only loading text', () => {
    component = mount(MediaLoadingOverlay, { target, props: {} });
    const srOnly = target.querySelector('.sr-only');
    expect(srOnly?.textContent).toContain('Loading media');
  });
});

// ---------------------------------------------------------------------------
// PageCounter
// ---------------------------------------------------------------------------

describe('PageCounter', () => {
  it('renders current and total pages', () => {
    component = mount(PageCounter, {
      target,
      props: { current: 3, total: 10, onPageChange: vi.fn(), cx },
    });
    expect(target.textContent).toContain('3');
    expect(target.textContent).toContain('10');
  });

  it('calls onPageChange when Next clicked', () => {
    const onPageChange = vi.fn();
    component = mount(PageCounter, {
      target,
      props: { current: 3, total: 10, onPageChange, cx },
    });
    const nextBtn = target.querySelector('button[aria-label="Next page"]') as HTMLButtonElement;
    flushSync(() => { nextBtn.click(); });
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageChange when Prev clicked', () => {
    const onPageChange = vi.fn();
    component = mount(PageCounter, {
      target,
      props: { current: 5, total: 10, onPageChange, cx },
    });
    const prevBtn = target.querySelector('button[aria-label="Previous page"]') as HTMLButtonElement;
    flushSync(() => { prevBtn.click(); });
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('disables prev button on first page', () => {
    component = mount(PageCounter, {
      target,
      props: { current: 1, total: 10, onPageChange: vi.fn(), cx },
    });
    const prevBtn = target.querySelector('button[aria-label="Previous page"]') as HTMLButtonElement;
    expect(prevBtn.disabled).toBe(true);
  });

  it('disables next button on last page', () => {
    component = mount(PageCounter, {
      target,
      props: { current: 10, total: 10, onPageChange: vi.fn(), cx },
    });
    const nextBtn = target.querySelector('button[aria-label="Next page"]') as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
  });

  it('shows first/last buttons when showFirstLast=true', () => {
    component = mount(PageCounter, {
      target,
      props: { current: 5, total: 10, onPageChange: vi.fn(), cx, showFirstLast: true },
    });
    expect(target.querySelector('button[aria-label="Go to first page"]')).toBeTruthy();
    expect(target.querySelector('button[aria-label="Go to last page"]')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ParameterSection
// ---------------------------------------------------------------------------

describe('ParameterSection', () => {
  it('renders the section label', () => {
    component = mount(ParameterSection, {
      target,
      props: {
        label: 'Region',
        children: (() => {}) as unknown as import('svelte').Snippet,
      },
    });
    expect(target.textContent).toContain('Region');
  });

  it('renders icon when provided', () => {
    component = mount(ParameterSection, {
      target,
      props: {
        label: 'Region',
        icon: 'crop',
        children: (() => {}) as unknown as import('svelte').Snippet,
      },
    });
    const icon = target.querySelector('.material-icons');
    expect(icon?.textContent).toBe('crop');
  });

  it('is collapsible by default and starts open', () => {
    component = mount(ParameterSection, {
      target,
      props: {
        label: 'Test Section',
        collapsible: true,
        defaultOpen: true,
        children: (() => {}) as unknown as import('svelte').Snippet,
      },
    });
    const btn = target.querySelector('button[aria-expanded]');
    expect(btn?.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles collapsed state when header clicked', () => {
    component = mount(ParameterSection, {
      target,
      props: {
        label: 'Test',
        collapsible: true,
        defaultOpen: true,
        children: (() => {}) as unknown as import('svelte').Snippet,
      },
    });
    const btn = target.querySelector('button[type="button"]') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});

// ---------------------------------------------------------------------------
// PlaybackRateSelect
// ---------------------------------------------------------------------------

describe('PlaybackRateSelect', () => {
  it('renders a select element', () => {
    component = mount(PlaybackRateSelect, {
      target,
      props: { value: 1, onChange: vi.fn() },
    });
    expect(target.querySelector('select')).toBeTruthy();
  });

  it('renders all rate options', () => {
    component = mount(PlaybackRateSelect, {
      target,
      props: { value: 1, onChange: vi.fn() },
    });
    const options = target.querySelectorAll('option');
    expect(options.length).toBe(6);
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    component = mount(PlaybackRateSelect, {
      target,
      props: { value: 1, onChange },
    });
    const select = target.querySelector('select') as HTMLSelectElement;
    select.value = '1.5';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith(1.5);
  });

  it('has aria-label', () => {
    component = mount(PlaybackRateSelect, {
      target,
      props: { value: 1, onChange: vi.fn() },
    });
    const select = target.querySelector('select');
    expect(select?.getAttribute('aria-label')).toBe('Playback rate');
  });
});

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

describe('ProgressBar', () => {
  it('renders with role=slider', () => {
    component = mount(ProgressBar, {
      target,
      props: { currentTime: 30, duration: 100, onSeek: vi.fn() },
    });
    expect(target.querySelector('[role="slider"]')).toBeTruthy();
  });

  it('sets aria-valuenow to progress percentage', () => {
    component = mount(ProgressBar, {
      target,
      props: { currentTime: 50, duration: 100, onSeek: vi.fn() },
    });
    const slider = target.querySelector('[role="slider"]');
    expect(Number(slider?.getAttribute('aria-valuenow'))).toBe(50);
  });

  it('sets aria-valuemax to duration', () => {
    component = mount(ProgressBar, {
      target,
      props: { currentTime: 0, duration: 120, onSeek: vi.fn() },
    });
    const slider = target.querySelector('[role="slider"]');
    expect(Number(slider?.getAttribute('aria-valuemax'))).toBe(120);
  });

  it('calls onSeek with new time on ArrowRight key', () => {
    const onSeek = vi.fn();
    component = mount(ProgressBar, {
      target,
      props: { currentTime: 0, duration: 100, onSeek },
    });
    const slider = target.querySelector('[role="slider"]') as HTMLElement;
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(onSeek).toHaveBeenCalled();
    const arg = onSeek.mock.calls[0][0] as number;
    expect(arg).toBeGreaterThan(0);
  });

  it('calls onSeek with 0 on Home key', () => {
    const onSeek = vi.fn();
    component = mount(ProgressBar, {
      target,
      props: { currentTime: 50, duration: 100, onSeek },
    });
    const slider = target.querySelector('[role="slider"]') as HTMLElement;
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(onSeek).toHaveBeenCalledWith(0);
  });
});

// ---------------------------------------------------------------------------
// RenderingDownloadMenu
// ---------------------------------------------------------------------------

describe('RenderingDownloadMenu', () => {
  it('renders nothing when renderings is empty', () => {
    component = mount(RenderingDownloadMenu, {
      target,
      props: { renderings: [] },
    });
    expect(target.querySelector('button')).toBeNull();
  });

  it('renders download button when renderings are provided', () => {
    component = mount(RenderingDownloadMenu, {
      target,
      props: { renderings: [{ id: 'https://example.com/file.pdf', format: 'application/pdf' }] },
    });
    expect(target.querySelector('button[aria-label="Download options"]')).toBeTruthy();
  });

  it('shows menu on button click', () => {
    component = mount(RenderingDownloadMenu, {
      target,
      props: { renderings: [{ id: 'https://example.com/file.pdf', label: 'PDF Download' }] },
    });
    const btn = target.querySelector('button[aria-label="Download options"]') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    expect(target.querySelector('[role="menu"]')).toBeTruthy();
  });

  it('renders download links for each rendering', () => {
    component = mount(RenderingDownloadMenu, {
      target,
      props: {
        renderings: [
          { id: 'https://example.com/a.pdf', label: 'PDF' },
          { id: 'https://example.com/b.epub', label: 'EPUB' },
        ],
      },
    });
    const btn = target.querySelector('button') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    const links = target.querySelectorAll('[role="menuitem"]');
    expect(links.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// RotationDial
// ---------------------------------------------------------------------------

describe('RotationDial', () => {
  it('renders 4 preset buttons', () => {
    component = mount(RotationDial, {
      target,
      props: { value: 0, onChange: vi.fn() },
    });
    const buttons = target.querySelectorAll('button[aria-label]');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('calls onChange when 90° preset clicked', () => {
    const onChange = vi.fn();
    component = mount(RotationDial, {
      target,
      props: { value: 0, onChange },
    });
    const btn90 = target.querySelector('button[aria-label="Rotate to 90 degrees"]') as HTMLButtonElement;
    flushSync(() => { btn90.click(); });
    expect(onChange).toHaveBeenCalledWith(90);
  });

  it('marks active preset with aria-pressed=true', () => {
    component = mount(RotationDial, {
      target,
      props: { value: 180, onChange: vi.fn() },
    });
    const btn180 = target.querySelector('button[aria-label="Rotate to 180 degrees"]');
    expect(btn180?.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders the fine-tune slider', () => {
    component = mount(RotationDial, {
      target,
      props: { value: 45, onChange: vi.fn() },
    });
    const slider = target.querySelector('input[type="range"]');
    expect(slider).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ScreenshotMenu
// ---------------------------------------------------------------------------

describe('ScreenshotMenu', () => {
  it('renders the screenshot button', () => {
    component = mount(ScreenshotMenu, {
      target,
      props: { onCapture: vi.fn() },
    });
    expect(target.querySelector('button[aria-label^="Take screenshot"]')).toBeTruthy();
  });

  it('calls onCapture when main screenshot button clicked', () => {
    const onCapture = vi.fn();
    component = mount(ScreenshotMenu, {
      target,
      props: { onCapture },
    });
    const btn = target.querySelector('button[aria-label^="Take screenshot"]') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    expect(onCapture).toHaveBeenCalledWith('image/png');
  });

  it('opens dropdown on arrow button click', () => {
    component = mount(ScreenshotMenu, {
      target,
      props: { onCapture: vi.fn() },
    });
    const arrowBtn = target.querySelector('button[aria-label="Screenshot options"]') as HTMLButtonElement;
    flushSync(() => { arrowBtn.click(); });
    expect(target.querySelector('[role="menu"]')).toBeTruthy();
  });

  it('disables buttons when disabled=true', () => {
    component = mount(ScreenshotMenu, {
      target,
      props: { onCapture: vi.fn(), disabled: true },
    });
    const buttons = target.querySelectorAll('button:disabled');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Slider
// ---------------------------------------------------------------------------

describe('Slider', () => {
  it('renders a range input', () => {
    component = mount(Slider, {
      target,
      props: { value: 50, onChange: vi.fn() },
    });
    expect(target.querySelector('input[type="range"]')).toBeTruthy();
  });

  it('calls onChange with numeric value on input', () => {
    const onChange = vi.fn();
    component = mount(Slider, {
      target,
      props: { value: 50, min: 0, max: 100, onChange },
    });
    const input = target.querySelector('input[type="range"]') as HTMLInputElement;
    input.value = '75';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith(75);
  });

  it('sets min, max on the input element', () => {
    component = mount(Slider, {
      target,
      props: { value: 5, min: 0, max: 359, onChange: vi.fn() },
    });
    const input = target.querySelector('input[type="range"]') as HTMLInputElement;
    expect(Number(input.min)).toBe(0);
    expect(Number(input.max)).toBe(359);
  });

  it('applies gradient background style', () => {
    component = mount(Slider, {
      target,
      props: { value: 50, onChange: vi.fn(), color: 'blue' },
    });
    const input = target.querySelector('input[type="range"]') as HTMLInputElement;
    expect(input.style.background).toContain('#3b82f6');
  });
});

// ---------------------------------------------------------------------------
// TimeDisplay
// ---------------------------------------------------------------------------

describe('TimeDisplay', () => {
  it('formats seconds as MM:SS', () => {
    component = mount(TimeDisplay, {
      target,
      props: { currentTime: 65 },
    });
    // 65s = 1:05
    expect(target.textContent).toContain('1:05');
  });

  it('shows duration when showDuration=true', () => {
    component = mount(TimeDisplay, {
      target,
      props: { currentTime: 30, duration: 120, showDuration: true },
    });
    expect(target.textContent).toContain('2:00');
  });

  it('uses custom separator', () => {
    component = mount(TimeDisplay, {
      target,
      props: { currentTime: 0, duration: 60, showDuration: true, separator: ' — ' },
    });
    expect(target.textContent).toContain('—');
  });

  it('applies fieldMode yellow color class', () => {
    component = mount(TimeDisplay, {
      target,
      props: { currentTime: 0, fieldMode: true },
    });
    const span = target.querySelector('span');
    expect(span?.className).toContain('text-nb-yellow');
  });

  it('renders time elements with datetime attribute', () => {
    component = mount(TimeDisplay, {
      target,
      props: { currentTime: 90 },
    });
    const time = target.querySelector('time');
    expect(time?.getAttribute('datetime')).toContain('PT90S');
  });
});

// ---------------------------------------------------------------------------
// UpscaleToggle
// ---------------------------------------------------------------------------

describe('UpscaleToggle', () => {
  it('renders toggle button', () => {
    component = mount(UpscaleToggle, {
      target,
      props: { value: false, onChange: vi.fn() },
    });
    expect(target.querySelector('button')).toBeTruthy();
  });

  it('calls onChange with true when inactive and clicked', () => {
    const onChange = vi.fn();
    component = mount(UpscaleToggle, {
      target,
      props: { value: false, onChange },
    });
    const btn = target.querySelector('button') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when active and clicked', () => {
    const onChange = vi.fn();
    component = mount(UpscaleToggle, {
      target,
      props: { value: true, onChange },
    });
    const btn = target.querySelector('button') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('sets aria-pressed=true when enabled', () => {
    component = mount(UpscaleToggle, {
      target,
      props: { value: true, onChange: vi.fn() },
    });
    const btn = target.querySelector('button');
    expect(btn?.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows Upscale text', () => {
    component = mount(UpscaleToggle, {
      target,
      props: { value: false, onChange: vi.fn() },
    });
    expect(target.textContent).toContain('Upscale');
  });
});

// ---------------------------------------------------------------------------
// UrlBar
// ---------------------------------------------------------------------------

describe('UrlBar', () => {
  it('renders copy button', () => {
    component = mount(UrlBar, {
      target,
      props: { url: 'https://example.com/iiif/image/full/max/0/default.jpg' },
    });
    expect(target.querySelector('button[aria-label="Copy URL"]')).toBeTruthy();
  });

  it('calls clipboard.writeText with the url on copy click', async () => {
    const url = 'https://example.com/iiif/image/full/max/0/default.jpg';
    component = mount(UrlBar, { target, props: { url } });
    const btn = target.querySelector('button[aria-label="Copy URL"]') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    await Promise.resolve();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
  });

  it('renders URL segments when imageId provided', () => {
    component = mount(UrlBar, {
      target,
      props: {
        imageId: 'https://example.com/iiif/image',
        region: 'full',
        size: 'max',
        rotation: '0',
        quality: 'default',
        format: 'jpg',
      },
    });
    expect(target.textContent).toContain('full');
    expect(target.textContent).toContain('max');
  });
});

// ---------------------------------------------------------------------------
// ViewerModeSwitcher
// ---------------------------------------------------------------------------

describe('ViewerModeSwitcher', () => {
  it('renders radiogroup', () => {
    component = mount(ViewerModeSwitcher, {
      target,
      props: { mode: 'individuals', onChange: vi.fn() },
    });
    expect(target.querySelector('[role="radiogroup"]')).toBeTruthy();
  });

  it('marks active mode with aria-checked=true', () => {
    component = mount(ViewerModeSwitcher, {
      target,
      props: { mode: 'continuous', onChange: vi.fn() },
    });
    const radios = target.querySelectorAll('[role="radio"]');
    const continuousRadio = Array.from(radios).find(r => r.getAttribute('aria-label') === 'Continuous strip');
    expect(continuousRadio?.getAttribute('aria-checked')).toBe('true');
  });

  it('calls onChange when mode button clicked', () => {
    const onChange = vi.fn();
    component = mount(ViewerModeSwitcher, {
      target,
      props: { mode: 'individuals', onChange },
    });
    const pagedBtn = target.querySelector('[aria-label="Paged spread"]') as HTMLButtonElement;
    flushSync(() => { pagedBtn.click(); });
    expect(onChange).toHaveBeenCalledWith('paged');
  });

  it('renders all 3 mode options', () => {
    component = mount(ViewerModeSwitcher, {
      target,
      props: { mode: 'individuals', onChange: vi.fn() },
    });
    const radios = target.querySelectorAll('[role="radio"]');
    expect(radios.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// VolumeControl
// ---------------------------------------------------------------------------

describe('VolumeControl', () => {
  it('renders mute button', () => {
    component = mount(VolumeControl, {
      target,
      props: { volume: 0.8, isMuted: false, onVolumeChange: vi.fn(), onMuteToggle: vi.fn() },
    });
    expect(target.querySelector('button[aria-label="Mute"]')).toBeTruthy();
  });

  it('calls onMuteToggle when mute button clicked', () => {
    const onMuteToggle = vi.fn();
    component = mount(VolumeControl, {
      target,
      props: { volume: 0.5, isMuted: false, onVolumeChange: vi.fn(), onMuteToggle },
    });
    const btn = target.querySelector('button[aria-label="Mute"]') as HTMLButtonElement;
    flushSync(() => { btn.click(); });
    expect(onMuteToggle).toHaveBeenCalledOnce();
  });

  it('shows Unmute label when muted', () => {
    component = mount(VolumeControl, {
      target,
      props: { volume: 0.5, isMuted: true, onVolumeChange: vi.fn(), onMuteToggle: vi.fn() },
    });
    expect(target.querySelector('button[aria-label="Unmute"]')).toBeTruthy();
  });

  it('renders volume range input', () => {
    component = mount(VolumeControl, {
      target,
      props: { volume: 0.5, isMuted: false, onVolumeChange: vi.fn(), onMuteToggle: vi.fn() },
    });
    const slider = target.querySelector('input[aria-label="Volume"]');
    expect(slider).toBeTruthy();
  });

  it('shows 0 volume when muted', () => {
    component = mount(VolumeControl, {
      target,
      props: { volume: 0.8, isMuted: true, onVolumeChange: vi.fn(), onMuteToggle: vi.fn() },
    });
    const slider = target.querySelector('input[type="range"]') as HTMLInputElement;
    expect(Number(slider.value)).toBe(0);
  });
});
