/**
 * AudioWaveform Component Tests
 *
 * Tests the Svelte 5 AudioWaveform molecule that integrates WaveSurfer.js
 * for audio waveform visualization, transport controls, and annotation
 * region support.
 *
 * External dependencies mocked:
 *   - wavesurfer.js (WaveSurfer.create)
 *   - wavesurfer.js/dist/plugins/regions.js (RegionsPlugin.create)
 *   - wavesurfer.js/dist/plugins/timeline.js (TimelinePlugin.create)
 *   - wavesurfer.js/dist/plugins/hover.js (HoverPlugin.create)
 *   - IconButton (requires cx prop that AudioWaveform does not pass)
 *
 * Tests component logic only (transport state, callbacks, DOM structure).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import type { IIIFCanvas } from '@/src/shared/types';

// --- WaveSurfer mock factory ---

let wsEventHandlers: Record<string, Function[]>;
let mockWaveSurferInstance: Record<string, any>;
let mockRegionsInstance: Record<string, any>;
let regionEventHandlers: Record<string, Function[]>;

function createMockWaveSurfer() {
  wsEventHandlers = {};
  mockWaveSurferInstance = {
    on: vi.fn((event: string, handler: Function) => {
      if (!wsEventHandlers[event]) wsEventHandlers[event] = [];
      wsEventHandlers[event].push(handler);
    }),
    playPause: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    setPlaybackRate: vi.fn(),
    getDuration: vi.fn(() => 120),
    destroy: vi.fn(),
    getCurrentTime: vi.fn(() => 0),
  };
  return mockWaveSurferInstance;
}

function createMockRegionsPlugin() {
  regionEventHandlers = {};
  mockRegionsInstance = {
    on: vi.fn((event: string, handler: Function) => {
      if (!regionEventHandlers[event]) regionEventHandlers[event] = [];
      regionEventHandlers[event].push(handler);
    }),
    enableDragSelection: vi.fn(() => vi.fn()),
    getRegions: vi.fn(() => []),
    addRegion: vi.fn(),
    create: vi.fn(),
  };
  return mockRegionsInstance;
}

// Mock WaveSurfer modules BEFORE importing the component
vi.mock('wavesurfer.js', () => ({
  default: {
    create: vi.fn(() => createMockWaveSurfer()),
  },
}));

vi.mock('wavesurfer.js/dist/plugins/regions.js', () => ({
  default: {
    create: vi.fn(() => createMockRegionsPlugin()),
  },
}));

vi.mock('wavesurfer.js/dist/plugins/timeline.js', () => ({
  default: {
    create: vi.fn(() => ({})),
  },
}));

vi.mock('wavesurfer.js/dist/plugins/hover.js', () => ({
  default: {
    create: vi.fn(() => ({})),
  },
}));

// Mock IconButton to avoid cx prop requirement (AudioWaveform uses IconButton
// without passing cx, which is a known gap in molecule prop threading).
// Svelte 5 components are functions; provide a minimal stub that renders a <button>.
vi.mock('@/src/shared/ui/molecules/IconButton.svelte', () => ({
  default: function MockIconButton($$anchor: any, $$props: any) {
    // Minimal Svelte 5 component stub — renders a button into the anchor's parent
    const props = typeof $$props === 'function' ? $$props() : $$props;
    const btn = document.createElement('button');
    btn.setAttribute('title', props?.label || '');
    btn.setAttribute('aria-label', props?.label || '');
    const icon = document.createElement('span');
    icon.className = 'material-icons';
    icon.textContent = props?.icon || '';
    btn.appendChild(icon);
    if (props?.onclick) btn.addEventListener('click', props.onclick);
    if ($$anchor && $$anchor.parentNode) {
      $$anchor.parentNode.insertBefore(btn, $$anchor);
    }
  },
}));

import AudioWaveform from '../ui/molecules/AudioWaveform.svelte';

// --- Test fixtures ---

function makeCanvas(label = 'Test Audio'): IIIFCanvas {
  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    label: { en: [label] },
    width: 0,
    height: 0,
    items: [],
  } as unknown as IIIFCanvas;
}

// --- Test suite ---

let target: HTMLDivElement;
let instance: Record<string, any>;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);
});

afterEach(() => {
  if (instance) {
    try { unmount(instance); } catch { /* ignore */ }
  }
  target.remove();
  vi.clearAllMocks();
});

describe('AudioWaveform', () => {
  it('renders the component container with bg-nb-black class', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    const container = target.querySelector('.bg-nb-black');
    expect(container).toBeTruthy();
  });

  it('renders canvas label from IIIF label', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas('My Recording'),
        src: 'https://example.org/audio.mp3',
      },
    });

    expect(target.textContent).toContain('My Recording');
  });

  it('renders audiotrack icon', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    const icons = target.querySelectorAll('.material-icons');
    const audioIcon = Array.from(icons).find(el => el.textContent === 'audiotrack');
    expect(audioIcon).toBeTruthy();
  });

  it('shows loading state initially', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    expect(target.textContent).toContain('Loading waveform...');
    const spinner = target.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('renders waveform container div for WaveSurfer', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    // The waveform container has min-height: 120px
    const waveformDiv = target.querySelector('[style*="min-height"]');
    expect(waveformDiv).toBeTruthy();
  });

  it('renders transport controls section with border-t', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    // Controls section has border-t border-nb-white/10
    const controlsSection = target.querySelector('.border-t');
    expect(controlsSection).toBeTruthy();
  });

  it('renders PlayPauseButton (play_arrow icon by default)', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    // PlayPauseButton renders an IconButton with play_arrow or pause
    const buttons = target.querySelectorAll('button');
    const playButton = Array.from(buttons).find(b =>
      b.getAttribute('aria-label') === 'Play' || b.getAttribute('title') === 'Play'
    );
    expect(playButton).toBeTruthy();
  });

  it('renders rewind and forward buttons', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    const rewindBtn = target.querySelector('[aria-label="Rewind 10s"]') ||
                      target.querySelector('[title="Rewind 10s"]');
    const forwardBtn = target.querySelector('[aria-label="Forward 10s"]') ||
                       target.querySelector('[title="Forward 10s"]');

    expect(rewindBtn).toBeTruthy();
    expect(forwardBtn).toBeTruthy();
  });

  it('renders time display in font-mono showing 0:00.00 / 0:00.00 initially', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    const timeDisplay = target.querySelector('.font-mono.tabular-nums');
    expect(timeDisplay).toBeTruthy();
    // Initial state: 0:00.00 / 0:00.00
    expect(timeDisplay!.textContent).toContain('0:00.00');
  });

  it('renders playback rate button showing 1x', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    const rateButton = target.querySelector('[title="Playback speed"]');
    expect(rateButton).toBeTruthy();
    expect(rateButton!.textContent).toContain('1x');
  });

  it('renders volume slider input range', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    const volumeSlider = target.querySelector('input[type="range"]');
    expect(volumeSlider).toBeTruthy();
    expect(volumeSlider!.getAttribute('min')).toBe('0');
    expect(volumeSlider!.getAttribute('max')).toBe('1');
  });

  it('applies fieldMode styling when fieldMode is true', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
        fieldMode: true,
      },
    });

    // In fieldMode, label text uses text-nb-yellow
    const label = target.querySelector('.text-nb-yellow');
    expect(label).toBeTruthy();
  });

  it('does not show annotation range when annotationModeActive is false', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
        annotationModeActive: false,
        timeRange: { start: 5, end: 10 },
      },
    });

    // The "Selected:" text only appears when annotationModeActive AND timeRange
    expect(target.textContent).not.toContain('Selected:');
  });

  it('shows annotation range when annotationModeActive is true and timeRange provided', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
        annotationModeActive: true,
        timeRange: { start: 5, end: 10 },
      },
    });

    expect(target.textContent).toContain('Selected:');
  });

  it('renders volume icon reflecting current volume state', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
      },
    });

    // Default volume = 0.8, so icon should be volume_up
    const icons = target.querySelectorAll('.material-icons');
    const volumeIcon = Array.from(icons).find(el => el.textContent === 'volume_up');
    expect(volumeIcon).toBeTruthy();
  });

  it('renders additional CSS class when passed', () => {
    instance = mount(AudioWaveform, {
      target,
      props: {
        canvas: makeCanvas(),
        src: 'https://example.org/audio.mp3',
        class: 'custom-audio-class',
      },
    });

    const container = target.querySelector('.custom-audio-class');
    expect(container).toBeTruthy();
  });
});
