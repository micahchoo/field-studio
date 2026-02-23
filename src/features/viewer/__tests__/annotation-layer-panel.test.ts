/**
 * AnnotationLayerPanel — Component tests
 *
 * Covers:
 *   - Does not render when visible=false
 *   - Renders layer list with correct count
 *   - Calls onToggleLayer with layer id on visibility toggle
 *   - Calls onSetAllVisible when show/hide all clicked
 *   - Expands opacity slider on expand button click
 *   - Calls onLayerOpacityChange with id and value
 *   - Empty state message
 *   - Close button behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import AnnotationLayerPanel from '../ui/molecules/AnnotationLayerPanel.svelte';
import type { AnnotationLayer } from '../model/annotationLayers.svelte';

function makeLayers(count: number, allVisible = true): AnnotationLayer[] {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
  return Array.from({ length: count }, (_, i) => ({
    id: `layer-${i}`,
    label: `Layer ${i + 1}`,
    visible: allVisible,
    color: colors[i % colors.length],
    opacity: 1,
  }));
}

describe('AnnotationLayerPanel', () => {
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

  it('does not render when visible=false', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(3),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        visible: false,
      },
    });
    const dialog = target.querySelector('[role="dialog"]');
    expect(dialog).toBeNull();
  });

  it('renders when visible=true (default)', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(3),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const dialog = target.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog!.getAttribute('aria-label')).toBe('Annotation layers');
  });

  // --------------------------------------------------------------------------
  // Layer list rendering
  // --------------------------------------------------------------------------

  it('renders correct number of layer rows', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(4),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    // Each layer has a visibility toggle with an aria-label like "Hide Layer X"
    const toggleBtns = target.querySelectorAll('[aria-pressed]');
    expect(toggleBtns.length).toBe(4);
  });

  it('renders layer labels', () => {
    const layers = makeLayers(2);
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    expect(target.textContent).toContain('Layer 1');
    expect(target.textContent).toContain('Layer 2');
  });

  it('renders color dots with correct background-color', () => {
    const layers = makeLayers(2);
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const dots = target.querySelectorAll('.rounded-full') as NodeListOf<HTMLElement>;
    expect(dots.length).toBe(2);
    expect(dots[0].style.backgroundColor).toBe(layers[0].color);
    expect(dots[1].style.backgroundColor).toBe(layers[1].color);
  });

  it('shows "No annotation layers" message when layers is empty', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: [],
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    expect(target.textContent).toContain('No annotation layers');
  });

  it('renders "Layers" header with icon', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    expect(target.textContent).toContain('Layers');
    // Icon for "layers"
    const icons = target.querySelectorAll('.material-icons');
    const layersIcon = Array.from(icons).find(i => i.textContent === 'layers');
    expect(layersIcon).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // onToggleLayer callback
  // --------------------------------------------------------------------------

  it('calls onToggleLayer with layer id when visibility toggle is clicked', () => {
    const handler = vi.fn();
    const layers = makeLayers(3);
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: handler,
        onSetAllVisible: vi.fn(),
      },
    });
    // Click the visibility toggle for the second layer
    const toggleBtn = target.querySelector('[aria-label="Hide Layer 2"]') as HTMLButtonElement;
    expect(toggleBtn).toBeTruthy();
    toggleBtn.click();
    expect(handler).toHaveBeenCalledWith('layer-1');
  });

  it('sets aria-pressed=true for visible layers', () => {
    const layers = makeLayers(2, true);
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const toggleBtns = target.querySelectorAll('[aria-pressed="true"]');
    expect(toggleBtns.length).toBe(2);
  });

  it('sets aria-pressed=false for hidden layers', () => {
    const layers = makeLayers(2, false);
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const toggleBtns = target.querySelectorAll('[aria-pressed="false"]');
    expect(toggleBtns.length).toBe(2);
  });

  it('renders visibility icon for visible layer', () => {
    const layers = makeLayers(1, true);
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const icons = target.querySelectorAll('.material-icons');
    const visibilityIcon = Array.from(icons).find(i => i.textContent === 'visibility');
    expect(visibilityIcon).toBeTruthy();
  });

  it('renders visibility_off icon for hidden layer', () => {
    const layers: AnnotationLayer[] = [{
      id: 'layer-0',
      label: 'Hidden Layer',
      visible: false,
      color: '#FF6B6B',
      opacity: 1,
    }];
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const icons = target.querySelectorAll('.material-icons');
    const offIcon = Array.from(icons).find(i => i.textContent === 'visibility_off');
    expect(offIcon).toBeTruthy();
  });

  // --------------------------------------------------------------------------
  // onSetAllVisible callback
  // --------------------------------------------------------------------------

  it('calls onSetAllVisible(false) when "Hide All" is clicked (all visible)', () => {
    const handler = vi.fn();
    const layers = makeLayers(3, true);
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: handler,
      },
    });
    // When all visible, button shows "Hide All"
    const hideAllBtn = target.querySelector('[aria-label="Hide all layers"]') as HTMLButtonElement;
    expect(hideAllBtn).toBeTruthy();
    hideAllBtn.click();
    expect(handler).toHaveBeenCalledWith(false);
  });

  it('calls onSetAllVisible(true) when "Show All" is clicked (some hidden)', () => {
    const handler = vi.fn();
    const layers: AnnotationLayer[] = [
      { id: 'a', label: 'A', visible: true, color: '#FF6B6B', opacity: 1 },
      { id: 'b', label: 'B', visible: false, color: '#4ECDC4', opacity: 1 },
    ];
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: handler,
      },
    });
    const showAllBtn = target.querySelector('[aria-label="Show all layers"]') as HTMLButtonElement;
    expect(showAllBtn).toBeTruthy();
    showAllBtn.click();
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('shows "Hide All" text when all layers are visible', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(2, true),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const btn = target.querySelector('[aria-label="Hide all layers"]');
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toContain('Hide All');
  });

  it('shows "Show All" text when some layers are hidden', () => {
    const layers: AnnotationLayer[] = [
      { id: 'a', label: 'A', visible: false, color: '#FF6B6B', opacity: 1 },
    ];
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const btn = target.querySelector('[aria-label="Show all layers"]');
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toContain('Show All');
  });

  // --------------------------------------------------------------------------
  // Opacity slider expand/collapse
  // --------------------------------------------------------------------------

  it('does not show opacity slider by default', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onLayerOpacityChange: vi.fn(),
      },
    });
    const slider = target.querySelector('input[type="range"]');
    expect(slider).toBeNull();
  });

  it('expands opacity slider on tune button click', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onLayerOpacityChange: vi.fn(),
      },
    });
    // The expand button has title="Adjust opacity"
    const tuneBtn = target.querySelector('[title="Adjust opacity"]') as HTMLButtonElement;
    expect(tuneBtn).toBeTruthy();
    tuneBtn.click();
    flushSync();

    const slider = target.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).toBeTruthy();
    expect(slider.getAttribute('min')).toBe('0');
    expect(slider.getAttribute('max')).toBe('100');
  });

  it('shows "Opacity" label and percentage when slider expanded', () => {
    const layers: AnnotationLayer[] = [{
      id: 'layer-0',
      label: 'Test',
      visible: true,
      color: '#FF6B6B',
      opacity: 0.75,
    }];
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers,
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onLayerOpacityChange: vi.fn(),
      },
    });
    const tuneBtn = target.querySelector('[title="Adjust opacity"]') as HTMLButtonElement;
    tuneBtn.click();
    flushSync();

    expect(target.textContent).toContain('Opacity');
    expect(target.textContent).toContain('75%');
  });

  it('collapses opacity slider on second click of tune button', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onLayerOpacityChange: vi.fn(),
      },
    });
    const tuneBtn = target.querySelector('[title="Adjust opacity"]') as HTMLButtonElement;

    // First click: expand
    tuneBtn.click();
    flushSync();
    expect(target.querySelector('input[type="range"]')).toBeTruthy();

    // Second click: collapse
    tuneBtn.click();
    flushSync();
    expect(target.querySelector('input[type="range"]')).toBeNull();
  });

  it('does not render tune button when onLayerOpacityChange is not provided', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        // No onLayerOpacityChange
      },
    });
    const tuneBtn = target.querySelector('[title="Adjust opacity"]');
    expect(tuneBtn).toBeNull();
  });

  // --------------------------------------------------------------------------
  // onLayerOpacityChange callback
  // --------------------------------------------------------------------------

  it('calls onLayerOpacityChange with id and normalized value on slider input', () => {
    const handler = vi.fn();
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onLayerOpacityChange: handler,
      },
    });

    // Expand the slider
    const tuneBtn = target.querySelector('[title="Adjust opacity"]') as HTMLButtonElement;
    tuneBtn.click();
    flushSync();

    const slider = target.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).toBeTruthy();

    // Simulate changing the slider value
    // The component divides by 100 to normalize: parseInt(target.value, 10) / 100
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!
      .set!.call(slider, '50');
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    expect(handler).toHaveBeenCalledWith('layer-0', 0.5);
  });

  // --------------------------------------------------------------------------
  // Close button and Escape
  // --------------------------------------------------------------------------

  it('renders close button when onClose is provided', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onClose: vi.fn(),
      },
    });
    const closeBtn = target.querySelector('[aria-label="Close layers panel"]');
    expect(closeBtn).toBeTruthy();
  });

  it('does not render close button when onClose is not provided', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const closeBtn = target.querySelector('[aria-label="Close layers panel"]');
    expect(closeBtn).toBeNull();
  });

  it('calls onClose when close button is clicked', () => {
    const handler = vi.fn();
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onClose: handler,
      },
    });
    const closeBtn = target.querySelector('[aria-label="Close layers panel"]') as HTMLButtonElement;
    closeBtn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key within the panel', () => {
    const handler = vi.fn();
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onClose: handler,
      },
    });
    const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    dialog.dispatchEvent(escapeEvent);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Create layer button
  // --------------------------------------------------------------------------

  it('renders create layer button when onCreateLayer is provided', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onCreateLayer: vi.fn(),
      },
    });
    const createBtn = target.querySelector('[aria-label="Create annotation layer"]');
    expect(createBtn).toBeTruthy();
  });

  it('does not render create layer button when onCreateLayer is not provided', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
      },
    });
    const createBtn = target.querySelector('[aria-label="Create annotation layer"]');
    expect(createBtn).toBeNull();
  });

  it('calls onCreateLayer when create button is clicked', () => {
    const handler = vi.fn();
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        onCreateLayer: handler,
      },
    });
    const createBtn = target.querySelector('[aria-label="Create annotation layer"]') as HTMLButtonElement;
    createBtn.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Field mode styling
  // --------------------------------------------------------------------------

  it('applies field mode dark styling when fieldMode=true', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        fieldMode: true,
      },
    });
    const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.classList.contains('bg-nb-black/95')).toBe(true);
    expect(dialog.classList.contains('border-nb-yellow/80')).toBe(true);
  });

  it('applies light styling when fieldMode=false', () => {
    component = mount(AnnotationLayerPanel, {
      target,
      props: {
        layers: makeLayers(1),
        onToggleLayer: vi.fn(),
        onSetAllVisible: vi.fn(),
        fieldMode: false,
      },
    });
    const dialog = target.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.classList.contains('bg-nb-white')).toBe(true);
  });
});
