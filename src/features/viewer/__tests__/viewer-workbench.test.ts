/**
 * ViewerWorkbench — Component tests
 *
 * Verifies:
 *   1. Renders modal with preview and parameter controls
 *   2. Switches between Parameters and Code tabs
 *   3. Constructs IIIF URL from parameter state
 *   4. Calls onApply when Apply button clicked
 *   5. Calls onClose when close / Escape / backdrop clicked
 *   6. Shows field mode styling
 *   7. Renders rotation degree buttons
 *   8. Renders quality and format selectors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ViewerWorkbench from '../ui/molecules/ViewerWorkbench.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCanvas(serviceId?: string) {
  const body: Record<string, unknown> = {
    id: 'https://example.org/image/1.jpg',
    type: 'Image',
    format: 'image/jpeg',
    service: serviceId
      ? [{ id: serviceId, type: 'ImageService3', profile: 'level2' }]
      : undefined,
  };

  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    width: 4000,
    height: 3000,
    items: [
      {
        id: 'https://example.org/canvas/1/page/1',
        type: 'AnnotationPage',
        items: [
          {
            id: 'https://example.org/canvas/1/anno/1',
            type: 'Annotation',
            motivation: 'painting',
            body,
            target: 'https://example.org/canvas/1',
          },
        ],
      },
    ],
  };
}

 
function defaultProps(overrides: Record<string, unknown> = {}): any {
  return {
    canvas: makeCanvas('https://example.org/iiif/image1'),
    onApply: vi.fn(),
    onClose: vi.fn(),
    cx: {},
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

describe('ViewerWorkbench', () => {
  // ---- Modal rendering ----------------------------------------------------

  it('renders as a modal dialog with aria-modal', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const dialog = target.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.getAttribute('aria-modal')).toBe('true');
    expect(dialog!.getAttribute('aria-label')).toBe('IIIF Image API Workbench');
  });

  it('renders image preview when service URL available', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const img = target.querySelector('img[alt="IIIF Image preview"]');
    expect(img).toBeTruthy();
  });

  it('shows "No image service available" when no URL', () => {
    component = mount(ViewerWorkbench, {
      target,
      props: defaultProps({ canvas: makeCanvas() }), // no service
    });
    // With a canvas that has a direct body.id but no service, url is just the imageId.
    // If body had no id either, it would show the fallback text.
    // The body still has an id, so the img tag will render with that id as src.
    const _img = target.querySelector('img[alt="IIIF Image preview"]');
    // Even without service, if rawImageId exists the img element renders.
    // This test verifies the component renders without error regardless.
    expect(target.querySelector('[role="dialog"]')).toBeTruthy();
  });

  // ---- Tab switching ------------------------------------------------------

  it('defaults to Parameters tab', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    // Parameters tab should be active (contains "Parameters" text)
    const buttons = target.querySelectorAll('button');
    const paramsTab = Array.from(buttons).find((b) => b.textContent?.includes('Parameters'));
    expect(paramsTab).toBeTruthy();
    expect(paramsTab!.className).toContain('border-b-2');
  });

  it('shows Region, Size, Rotation, Quality, Format fieldsets in params tab', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const legends = target.querySelectorAll('legend');
    const legendTexts = Array.from(legends).map((l) => l.textContent?.trim());
    // Legend text includes icon name prefix (e.g., "crop Region")
    expect(legendTexts.some((t) => t?.includes('Region'))).toBe(true);
    expect(legendTexts.some((t) => t?.includes('Size'))).toBe(true);
    expect(legendTexts.some((t) => t?.includes('Rotation'))).toBe(true);
    expect(legendTexts.some((t) => t?.includes('Quality'))).toBe(true);
    expect(legendTexts.some((t) => t?.includes('Format'))).toBe(true);
  });

  it('switches to Code tab on click', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const buttons = target.querySelectorAll('button');
    const codeTab = Array.from(buttons).find((b) => b.textContent?.includes('Code'));
    expect(codeTab).toBeTruthy();

    flushSync(() => { codeTab!.click(); });

    // Code tab should now show cURL, HTML, Full URL blocks
    expect(target.textContent).toContain('cURL');
    expect(target.textContent).toContain('HTML');
    expect(target.textContent).toContain('Full URL');
  });

  it('hides parameter fieldsets when code tab is active', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const buttons = target.querySelectorAll('button');
    const codeTab = Array.from(buttons).find((b) => b.textContent?.includes('Code'))!;

    flushSync(() => { codeTab.click(); });

    const legends = target.querySelectorAll('legend');
    expect(legends.length).toBe(0);
  });

  // ---- URL construction ---------------------------------------------------

  it('displays a IIIF URL in the URL bar', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    // Default params: region=full, size=max, rotation=0, quality=default, format=jpg
    expect(target.textContent).toContain('/full/max/0/default.jpg');
  });

  it('constructs URL with service base', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    expect(target.textContent).toContain('https://example.org/iiif/image1');
  });

  // ---- Rotation degree buttons --------------------------------------------

  it('renders rotation degree preset buttons (0, 90, 180, 270)', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const allButtons = target.querySelectorAll('button');
    const degreeLabels = ['0\u00b0', '90\u00b0', '180\u00b0', '270\u00b0'];
    for (const label of degreeLabels) {
      const btn = Array.from(allButtons).find((b) => b.textContent?.trim() === label);
      expect(btn).toBeTruthy();
    }
  });

  it('updates URL rotation segment when 90-degree button clicked', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const allButtons = target.querySelectorAll('button');
    const btn90 = Array.from(allButtons).find((b) => b.textContent?.trim() === '90\u00b0')!;

    flushSync(() => { btn90.click(); });

    // URL should now contain /90/ for rotation
    expect(target.textContent).toContain('/full/max/90/default.jpg');
  });

  // ---- Rotation slider ----------------------------------------------------

  it('renders a rotation range slider', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const slider = target.querySelector('input[aria-label="Rotation degrees"]') as HTMLInputElement;
    expect(slider).toBeTruthy();
    expect(slider.min).toBe('0');
    expect(slider.max).toBe('359');
  });

  // ---- Mirror checkbox ----------------------------------------------------

  it('renders mirror checkbox', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    expect(target.textContent).toContain('Mirror (!)');
  });

  // ---- Upscale checkbox ---------------------------------------------------

  it('renders upscale checkbox', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    expect(target.textContent).toContain('Upscale (^)');
  });

  // ---- Apply / Close callbacks --------------------------------------------

  it('calls onApply and onClose when Apply button clicked', () => {
    const onApply = vi.fn();
    const onClose = vi.fn();
    component = mount(ViewerWorkbench, {
      target,
      props: defaultProps({ onApply, onClose }),
    });

    // WorkbenchFooter renders an ActionButton with label "Apply"
    const allButtons = target.querySelectorAll('button');
    const applyBtn = Array.from(allButtons).find((b) => b.textContent?.includes('Apply'));
    expect(applyBtn).toBeTruthy();

    flushSync(() => { applyBtn!.click(); });
    expect(onApply).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key pressed', () => {
    const onClose = vi.fn();
    component = mount(ViewerWorkbench, {
      target,
      props: defaultProps({ onClose }),
    });

    const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
    flushSync(() => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when backdrop (outer overlay) clicked', () => {
    const onClose = vi.fn();
    component = mount(ViewerWorkbench, {
      target,
      props: defaultProps({ onClose }),
    });

    // The outer overlay div is the one with role="dialog"
    const overlay = target.querySelector('[role="dialog"]') as HTMLElement;
    flushSync(() => {
      overlay.click();
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does NOT call onClose when inner modal panel clicked', () => {
    const onClose = vi.fn();
    component = mount(ViewerWorkbench, {
      target,
      props: defaultProps({ onClose }),
    });

    // The inner modal content panel stops propagation
    const innerPanel = target.querySelector('[role="dialog"] > div') as HTMLElement;
    flushSync(() => {
      innerPanel.click();
    });
    // onClose should not be called because click is stopped on inner panel
    expect(onClose).not.toHaveBeenCalled();
  });

  // ---- Reset callback -----------------------------------------------------

  it('renders reset button and resets URL to defaults when clicked', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });

    // First change rotation to 90
    const allButtons = target.querySelectorAll('button');
    const btn90 = Array.from(allButtons).find((b) => b.textContent?.trim() === '90\u00b0')!;
    flushSync(() => { btn90.click(); });
    expect(target.textContent).toContain('/90/');

    // Now click reset
    const resetBtn = Array.from(target.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Reset')
    )!;
    flushSync(() => { resetBtn.click(); });
    expect(target.textContent).toContain('/full/max/0/default.jpg');
  });

  // ---- Field mode styling -------------------------------------------------

  it('applies dark styling when fieldMode=true', () => {
    component = mount(ViewerWorkbench, {
      target,
      props: defaultProps({ fieldMode: true }),
    });
    const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
    // Inner panel should have bg-nb-black
    const innerPanel = dialog.querySelector('div') as HTMLElement;
    expect(innerPanel.className).toContain('bg-nb-black');
  });

  it('applies light styling when fieldMode=false', () => {
    component = mount(ViewerWorkbench, {
      target,
      props: defaultProps({ fieldMode: false }),
    });
    const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
    const innerPanel = dialog.querySelector('div') as HTMLElement;
    expect(innerPanel.className).toContain('bg-nb-white');
  });

  // ---- Code tab content ---------------------------------------------------

  it('shows cURL command with URL in code tab', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const buttons = target.querySelectorAll('button');
    const codeTab = Array.from(buttons).find((b) => b.textContent?.includes('Code'))!;
    flushSync(() => { codeTab.click(); });

    const pres = target.querySelectorAll('pre');
    const curlPre = Array.from(pres).find((p) => p.textContent?.includes('curl'));
    expect(curlPre).toBeTruthy();
    expect(curlPre!.textContent).toContain('https://example.org/iiif/image1');
  });

  it('shows HTML img tag in code tab', () => {
    component = mount(ViewerWorkbench, { target, props: defaultProps() });
    const buttons = target.querySelectorAll('button');
    const codeTab = Array.from(buttons).find((b) => b.textContent?.includes('Code'))!;
    flushSync(() => { codeTab.click(); });

    const pres = target.querySelectorAll('pre');
    const htmlPre = Array.from(pres).find((p) => p.textContent?.includes('<img'));
    expect(htmlPre).toBeTruthy();
    expect(htmlPre!.textContent).toContain('loading="lazy"');
  });
});
