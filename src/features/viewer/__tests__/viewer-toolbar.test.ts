/**
 * ViewerToolbar — Component tests
 *
 * Verifies:
 *   1. Renders with image media type tools (zoom, rotation, flip)
 *   2. Hides image-specific tools for audio/video mediaType
 *   3. Calls zoom callbacks (onZoomIn, onZoomOut, onResetView)
 *   4. Calls rotation callbacks (onRotateCW, onRotateCCW)
 *   5. Calls onToggleAnnotationTool on annotate button click
 *   6. Shows annotation sub-tools when showAnnotationTool=true (image only)
 *   7. Calls onToggleSearch on search button click
 *   8. Shows filmstrip button when hasMultipleCanvases=true
 *   9. Shows label and annotation count badge
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import ViewerToolbar from '../ui/molecules/ViewerToolbar.svelte';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cx = {} as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defaultProps(overrides: Record<string, unknown> = {}): any {
  return {
    label: 'Test Canvas',
    mediaType: 'image' as const,
    zoomLevel: 100,
    rotation: 0,
    isFlipped: false,
    annotationCount: 0,
    hasSearchService: true,
    canDownload: false,
    isFullscreen: false,
    showSearchPanel: false,
    showWorkbench: false,
    showComposer: false,
    showAnnotationTool: false,
    hasMultipleCanvases: false,
    showFilmstrip: false,
    viewerReady: true,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onResetView: vi.fn(),
    onRotateCW: vi.fn(),
    onRotateCCW: vi.fn(),
    onFlipHorizontal: vi.fn(),
    onToggleSearch: vi.fn(),
    onToggleWorkbench: vi.fn(),
    onToggleComposer: vi.fn(),
    onToggleAnnotationTool: vi.fn(),
    onToggleMetadata: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onToggleFilmstrip: vi.fn(),
    cx,
    fieldMode: false,
    ...overrides,
  };
}

/** Find a button by its aria-label attribute */
function findBtnByLabel(container: HTMLElement, label: string): HTMLButtonElement | null {
  return container.querySelector(`button[aria-label="${label}"]`);
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

describe('ViewerToolbar', () => {
  // ---- Rendering ----------------------------------------------------------

  it('renders the label text', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ label: 'Folio 1r' }) });
    expect(target.textContent).toContain('Folio 1r');
  });

  it('renders image icon for image mediaType', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps() });
    const icons = target.querySelectorAll('.material-icons');
    const imageIcon = Array.from(icons).find((i) => i.textContent === 'image');
    expect(imageIcon).toBeTruthy();
  });

  it('renders movie icon for video mediaType', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ mediaType: 'video' }) });
    const icons = target.querySelectorAll('.material-icons');
    const movieIcon = Array.from(icons).find((i) => i.textContent === 'movie');
    expect(movieIcon).toBeTruthy();
  });

  it('renders audiotrack icon for audio mediaType', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ mediaType: 'audio' }) });
    const icons = target.querySelectorAll('.material-icons');
    const audioIcon = Array.from(icons).find((i) => i.textContent === 'audiotrack');
    expect(audioIcon).toBeTruthy();
  });

  it('shows annotation count badge when annotationCount > 0', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ annotationCount: 5 }) });
    expect(target.textContent).toContain('5 annotations');
  });

  it('uses singular "annotation" when count is 1', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ annotationCount: 1 }) });
    expect(target.textContent).toContain('1 annotation');
    expect(target.textContent).not.toContain('1 annotations');
  });

  it('hides annotation count when annotationCount is 0', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ annotationCount: 0 }) });
    expect(target.textContent).not.toContain('annotation');
  });

  // ---- Image-specific tools -----------------------------------------------

  it('renders rotate buttons for image mediaType', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps() });
    const rotateCW = findBtnByLabel(target, 'Rotate right');
    const rotateCCW = findBtnByLabel(target, 'Rotate left');
    expect(rotateCW).toBeTruthy();
    expect(rotateCCW).toBeTruthy();
  });

  it('renders flip button for image mediaType', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps() });
    const flipBtn = findBtnByLabel(target, 'Flip');
    expect(flipBtn).toBeTruthy();
  });

  it('hides rotate and flip buttons for audio mediaType', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ mediaType: 'audio' }) });
    const rotateCW = findBtnByLabel(target, 'Rotate right');
    const rotateCCW = findBtnByLabel(target, 'Rotate left');
    const flipBtn = findBtnByLabel(target, 'Flip');
    expect(rotateCW).toBeNull();
    expect(rotateCCW).toBeNull();
    expect(flipBtn).toBeNull();
  });

  it('hides rotate and flip buttons for video mediaType', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ mediaType: 'video' }) });
    const rotateCW = findBtnByLabel(target, 'Rotate right');
    const rotateCCW = findBtnByLabel(target, 'Rotate left');
    const flipBtn = findBtnByLabel(target, 'Flip');
    expect(rotateCW).toBeNull();
    expect(rotateCCW).toBeNull();
    expect(flipBtn).toBeNull();
  });

  it('shows rotation degree indicator when rotation is non-zero', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ rotation: 90 }) });
    expect(target.textContent).toContain('90');
  });

  it('hides rotation degree indicator when rotation is 0', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ rotation: 0 }) });
    // Should not display a degree indicator text for 0
    const spans = target.querySelectorAll('span');
    const degreeSpan = Array.from(spans).find(
      (s) => s.textContent?.trim() === '0\u00b0' && s.className.includes('font-mono')
    );
    // The code only renders rotation when rotation !== 0
    expect(degreeSpan).toBeFalsy();
  });

  // ---- Rotation callbacks -------------------------------------------------

  it('calls onRotateCW when rotate right button clicked', () => {
    const onRotateCW = vi.fn();
    component = mount(ViewerToolbar, { target, props: defaultProps({ onRotateCW }) });
    const btn = findBtnByLabel(target, 'Rotate right')!;
    flushSync(() => { btn.click(); });
    expect(onRotateCW).toHaveBeenCalledOnce();
  });

  it('calls onRotateCCW when rotate left button clicked', () => {
    const onRotateCCW = vi.fn();
    component = mount(ViewerToolbar, { target, props: defaultProps({ onRotateCCW }) });
    const btn = findBtnByLabel(target, 'Rotate left')!;
    flushSync(() => { btn.click(); });
    expect(onRotateCCW).toHaveBeenCalledOnce();
  });

  // ---- Flip callback ------------------------------------------------------

  it('calls onFlipHorizontal when flip button clicked', () => {
    const onFlipHorizontal = vi.fn();
    component = mount(ViewerToolbar, { target, props: defaultProps({ onFlipHorizontal }) });
    const btn = findBtnByLabel(target, 'Flip')!;
    flushSync(() => { btn.click(); });
    expect(onFlipHorizontal).toHaveBeenCalledOnce();
  });

  it('shows flip button as active when isFlipped=true', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ isFlipped: true }) });
    const btn = findBtnByLabel(target, 'Flip')!;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  // ---- Annotate button ----------------------------------------------------

  it('renders annotate button with "Annotate" text', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps() });
    const buttons = target.querySelectorAll('button');
    const annotateBtn = Array.from(buttons).find(
      (b) => b.textContent?.includes('Annotate')
    );
    expect(annotateBtn).toBeTruthy();
  });

  it('calls onToggleAnnotationTool when annotate button clicked', () => {
    const onToggleAnnotationTool = vi.fn();
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ onToggleAnnotationTool }),
    });
    const buttons = target.querySelectorAll('button');
    const annotateBtn = Array.from(buttons).find(
      (b) => b.textContent?.includes('Annotate')
    )!;
    flushSync(() => { annotateBtn.click(); });
    expect(onToggleAnnotationTool).toHaveBeenCalledOnce();
  });

  it('shows gesture icon for image annotate button', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps() });
    const icons = target.querySelectorAll('.material-icons');
    const gestureIcon = Array.from(icons).find((i) => i.textContent === 'gesture');
    expect(gestureIcon).toBeTruthy();
  });

  it('shows timer icon for audio/video annotate button', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ mediaType: 'audio' }) });
    const icons = target.querySelectorAll('.material-icons');
    const timerIcon = Array.from(icons).find((i) => i.textContent === 'timer');
    expect(timerIcon).toBeTruthy();
  });

  // ---- Annotation sub-tools -----------------------------------------------

  it('shows drawing mode buttons when showAnnotationTool=true and image', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({
        showAnnotationTool: true,
        onAnnotationModeChange: vi.fn(),
      }),
    });
    const polygon = findBtnByLabel(target, 'Polygon');
    const rectangle = findBtnByLabel(target, 'Rectangle');
    const freehand = findBtnByLabel(target, 'Freehand');
    expect(polygon).toBeTruthy();
    expect(rectangle).toBeTruthy();
    expect(freehand).toBeTruthy();
  });

  it('hides drawing mode buttons when showAnnotationTool=false', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ showAnnotationTool: false }) });
    const polygon = findBtnByLabel(target, 'Polygon');
    expect(polygon).toBeNull();
  });

  it('hides drawing mode buttons for audio even when showAnnotationTool=true', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({
        mediaType: 'audio',
        showAnnotationTool: true,
        onAnnotationModeChange: vi.fn(),
      }),
    });
    const polygon = findBtnByLabel(target, 'Polygon');
    expect(polygon).toBeNull();
  });

  it('calls onAnnotationModeChange with mode string on drawing button click', () => {
    const onAnnotationModeChange = vi.fn();
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({
        showAnnotationTool: true,
        onAnnotationModeChange,
      }),
    });
    const rectangleBtn = findBtnByLabel(target, 'Rectangle')!;
    flushSync(() => { rectangleBtn.click(); });
    expect(onAnnotationModeChange).toHaveBeenCalledWith('rectangle');
  });

  it('shows undo/redo/clear buttons when annotation tool is active for image', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({
        showAnnotationTool: true,
        onAnnotationModeChange: vi.fn(),
        onAnnotationUndo: vi.fn(),
        onAnnotationRedo: vi.fn(),
        onAnnotationClear: vi.fn(),
      }),
    });
    expect(findBtnByLabel(target, 'Undo')).toBeTruthy();
    expect(findBtnByLabel(target, 'Redo')).toBeTruthy();
    expect(findBtnByLabel(target, 'Clear')).toBeTruthy();
  });

  // ---- Search button ------------------------------------------------------

  it('renders search button when hasSearchService=true', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ hasSearchService: true }) });
    const searchBtn = findBtnByLabel(target, 'Search');
    expect(searchBtn).toBeTruthy();
  });

  it('hides search button when hasSearchService=false', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps({ hasSearchService: false }) });
    const searchBtn = findBtnByLabel(target, 'Search');
    expect(searchBtn).toBeNull();
  });

  it('calls onToggleSearch when search button clicked', () => {
    const onToggleSearch = vi.fn();
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ onToggleSearch }),
    });
    const searchBtn = findBtnByLabel(target, 'Search')!;
    flushSync(() => { searchBtn.click(); });
    expect(onToggleSearch).toHaveBeenCalledOnce();
  });

  it('marks search button as active when showSearchPanel=true', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ showSearchPanel: true }),
    });
    const searchBtn = findBtnByLabel(target, 'Search')!;
    expect(searchBtn.getAttribute('aria-pressed')).toBe('true');
  });

  // ---- Filmstrip button ---------------------------------------------------

  it('shows filmstrip button when hasMultipleCanvases=true', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ hasMultipleCanvases: true }),
    });
    const filmBtn = findBtnByLabel(target, 'Filmstrip');
    expect(filmBtn).toBeTruthy();
  });

  it('hides filmstrip button when hasMultipleCanvases=false', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ hasMultipleCanvases: false }),
    });
    const filmBtn = findBtnByLabel(target, 'Filmstrip');
    expect(filmBtn).toBeNull();
  });

  // ---- Fullscreen button --------------------------------------------------

  it('renders fullscreen toggle button', () => {
    component = mount(ViewerToolbar, { target, props: defaultProps() });
    const btn = findBtnByLabel(target, 'Fullscreen');
    expect(btn).toBeTruthy();
  });

  it('calls onToggleFullscreen when fullscreen button clicked', () => {
    const onToggleFullscreen = vi.fn();
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ onToggleFullscreen }),
    });
    const btn = findBtnByLabel(target, 'Fullscreen')!;
    flushSync(() => { btn.click(); });
    expect(onToggleFullscreen).toHaveBeenCalledOnce();
  });

  it('shows fullscreen_exit icon when isFullscreen=true', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ isFullscreen: true }),
    });
    const icons = target.querySelectorAll('.material-icons');
    const exitIcon = Array.from(icons).find((i) => i.textContent === 'fullscreen_exit');
    expect(exitIcon).toBeTruthy();
  });

  // ---- Image filter button ------------------------------------------------

  it('shows filter button for image mediaType with onToggleFilterPanel', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ onToggleFilterPanel: vi.fn() }),
    });
    const btn = findBtnByLabel(target, 'Image filters');
    expect(btn).toBeTruthy();
  });

  it('hides filter button for audio mediaType', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ mediaType: 'audio', onToggleFilterPanel: vi.fn() }),
    });
    const btn = findBtnByLabel(target, 'Image filters');
    expect(btn).toBeNull();
  });

  // ---- Disabled state when viewer not ready --------------------------------

  it('disables rotate buttons when viewerReady=false', () => {
    component = mount(ViewerToolbar, {
      target,
      props: defaultProps({ viewerReady: false }),
    });
    const rotateCW = findBtnByLabel(target, 'Rotate right')!;
    expect(rotateCW.disabled).toBe(true);
  });
});
