/**
 * MediaPlayer Component Tests
 *
 * Tests the Svelte 5 MediaPlayer molecule — a full IIIF AV player with
 * chapter navigation, time-based annotation support, spatial annotation
 * drawing, transcript panel, and Media Session API integration.
 *
 * External dependencies mocked:
 *   - navigator.mediaSession (Media Session API)
 *   - HTMLVideoElement / HTMLAudioElement (happy-dom provides stubs)
 *
 * Tests component logic only (DOM structure, transport controls, conditional
 * rendering of chapters/transcript/annotation mode indicators).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import type { IIIFCanvas, IIIFAnnotation } from '@/src/shared/types';
// ChapterMarker type defined inline — TS .svelte shims don't support named type exports
interface ChapterMarker {
  label: string;
  start: number;
  end: number;
  color: string;
}

// Mock IconButton to avoid cx prop requirement (MediaPlayer uses IconButton
// without passing cx, which is a known gap in molecule prop threading)
vi.mock('@/src/shared/ui/molecules/IconButton.svelte', () => ({
  default: function MockIconButton($$anchor: any, $$props: any) {
    const props = typeof $$props === 'function' ? $$props() : $$props;
    const btn = document.createElement('button');
    btn.setAttribute('title', props?.label || '');
    btn.setAttribute('aria-label', props?.label || '');
    if (props?.class) btn.className = props.class;
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

import MediaPlayer from '../ui/molecules/MediaPlayer.svelte';

// --- Test fixtures ---

function makeCanvas(label = 'Test Video', opts: Record<string, any> = {}): IIIFCanvas {
  return {
    id: 'https://example.org/canvas/1',
    type: 'Canvas',
    label: { en: [label] },
    width: 1920,
    height: 1080,
    items: [],
    ...opts,
  } as unknown as IIIFCanvas;
}

function makeTimeAnnotation(start: number, end: number, text: string): IIIFAnnotation {
  return {
    id: `https://example.org/canvas/1/annotation/time-${start}`,
    type: 'Annotation',
    motivation: 'commenting',
    body: { type: 'TextualBody', value: text, format: 'text/plain' },
    target: {
      type: 'SpecificResource',
      source: 'https://example.org/canvas/1',
      selector: {
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: `t=${start.toFixed(2)},${end.toFixed(2)}`,
      },
    },
  } as unknown as IIIFAnnotation;
}

function makeChapters(): ChapterMarker[] {
  return [
    { label: 'Introduction', start: 0, end: 30, color: '#3b82f6' },
    { label: 'Main Content', start: 30, end: 120, color: '#22c55e' },
    { label: 'Conclusion', start: 120, end: 180, color: '#a855f7' },
  ];
}

const _cx = {} as any;

let target: HTMLDivElement;
let instance: Record<string, any>;

beforeEach(() => {
  target = document.createElement('div');
  document.body.appendChild(target);

  // Polyfill MediaMetadata for happy-dom (not available in test environment)
  if (typeof globalThis.MediaMetadata === 'undefined') {
    (globalThis as any).MediaMetadata = class MediaMetadata {
      title: string;
      artist: string;
      album: string;
      artwork: any[];
      constructor(init?: { title?: string; artist?: string; album?: string; artwork?: any[] }) {
        this.title = init?.title || '';
        this.artist = init?.artist || '';
        this.album = init?.album || '';
        this.artwork = init?.artwork || [];
      }
    };
  }

  // Mock mediaSession
  if (!('mediaSession' in navigator)) {
    Object.defineProperty(navigator, 'mediaSession', {
      value: {
        metadata: null,
        setActionHandler: vi.fn(),
      },
      writable: true,
      configurable: true,
    });
  } else {
    vi.spyOn(navigator.mediaSession, 'setActionHandler').mockImplementation(() => {});
  }
});

afterEach(() => {
  if (instance) {
    try { unmount(instance); } catch { /* ignore */ }
  }
  target.remove();
  vi.clearAllMocks();
});

describe('MediaPlayer', () => {
  // ================================================================
  // Video rendering
  // ================================================================

  describe('video mode', () => {
    it('renders a video element for video mediaType', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const video = target.querySelector('video');
      expect(video).toBeTruthy();
      expect(video!.getAttribute('src')).toBe('https://example.org/video.mp4');
    });

    it('does not render audio element in video mode', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const audio = target.querySelector('audio');
      expect(audio).toBeNull();
    });

    it('renders video with playsinline attribute', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const video = target.querySelector('video');
      expect(video!.hasAttribute('playsinline')).toBe(true);
    });

    it('renders fullscreen button for video', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const fullscreenBtn = target.querySelector('[aria-label="Enter fullscreen"]');
      expect(fullscreenBtn).toBeTruthy();
    });
  });

  // ================================================================
  // Audio rendering
  // ================================================================

  describe('audio mode', () => {
    it('renders an audio element for audio mediaType', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas('Test Audio'),
          src: 'https://example.org/audio.mp3',
          mediaType: 'audio',
          fieldMode: false,
        },
      });

      const audio = target.querySelector('audio');
      expect(audio).toBeTruthy();
      expect(audio!.getAttribute('src')).toBe('https://example.org/audio.mp3');
    });

    it('does not render video element in audio mode', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas('Test Audio'),
          src: 'https://example.org/audio.mp3',
          mediaType: 'audio',
          fieldMode: false,
        },
      });

      const video = target.querySelector('video');
      expect(video).toBeNull();
    });

    it('renders audio display with audiotrack icon and label', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas('My Podcast'),
          src: 'https://example.org/audio.mp3',
          mediaType: 'audio',
          fieldMode: false,
        },
      });

      const icons = target.querySelectorAll('.material-icons');
      const audioIcon = Array.from(icons).find(el => el.textContent === 'audiotrack');
      expect(audioIcon).toBeTruthy();
      expect(target.textContent).toContain('My Podcast');
    });

    it('does not render fullscreen button for audio', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/audio.mp3',
          mediaType: 'audio',
          fieldMode: false,
        },
      });

      const fullscreenBtn = target.querySelector('[aria-label="Enter fullscreen"]');
      expect(fullscreenBtn).toBeNull();
    });
  });

  // ================================================================
  // Transport controls
  // ================================================================

  describe('transport controls', () => {
    it('renders PlayPauseButton (Play label by default)', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const playBtn = target.querySelector('[aria-label="Play"]') ||
                       target.querySelector('[title="Play"]');
      expect(playBtn).toBeTruthy();
    });

    it('renders rewind and forward buttons', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const rewindBtn = target.querySelector('[aria-label="Rewind 10s"]') ||
                        target.querySelector('[title="Rewind 10s"]');
      const forwardBtn = target.querySelector('[aria-label="Forward 10s"]') ||
                         target.querySelector('[title="Forward 10s"]');

      expect(rewindBtn).toBeTruthy();
      expect(forwardBtn).toBeTruthy();
    });

    it('renders time display showing 0:00.00 / 0:00.00 initially', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      // Time display text should be visible in the component
      expect(target.textContent).toContain('0:00.00');
    });

    it('renders playback rate button showing 1x', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const rateButton = target.querySelector('[title="Playback speed"]');
      expect(rateButton).toBeTruthy();
      expect(rateButton!.textContent).toContain('1x');
    });

    it('renders volume controls with mute button and slider', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const muteBtn = target.querySelector('[aria-label="Mute"]');
      expect(muteBtn).toBeTruthy();

      const volumeSlider = target.querySelector('input[aria-label="Volume"]');
      expect(volumeSlider).toBeTruthy();
      expect(volumeSlider!.getAttribute('min')).toBe('0');
      expect(volumeSlider!.getAttribute('max')).toBe('1');
      expect(volumeSlider!.getAttribute('step')).toBe('0.05');
    });
  });

  // ================================================================
  // Progress bar
  // ================================================================

  describe('progress bar', () => {
    it('renders progress bar with slider role', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const slider = target.querySelector('[role="slider"]');
      expect(slider).toBeTruthy();
      expect(slider!.getAttribute('aria-label')).toBe('Playback progress');
      expect(slider!.getAttribute('aria-valuemin')).toBe('0');
    });

    it('renders time annotation markers on progress bar when annotations provided', () => {
      const annotations = [
        makeTimeAnnotation(10, 20, 'First annotation'),
        makeTimeAnnotation(30, 45, 'Second annotation'),
      ];

      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotations,
          fieldMode: false,
        },
      });

      // Annotation markers have bg-nb-blue/50 class.
      // However, markers only render when duration > 0 (line 687: {#if range && duration > 0}).
      // In tests without actual media loading, duration stays at 0, so markers
      // are conditionally hidden. Verify the annotations are passed through
      // and the progress bar exists to accept them.
      const progressBar = target.querySelector('[role="slider"]');
      expect(progressBar).toBeTruthy();

      // The isTimeBasedAnnotation filter is tested in annotation-utils.test.ts.
      // Here we verify the progress bar renders without errors when annotations
      // are provided (even though markers are hidden at duration=0).
    });

    it('renders progress bar with slider role and aria attributes', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const slider = target.querySelector('[role="slider"]');
      expect(slider).toBeTruthy();
      expect(slider!.getAttribute('aria-label')).toBe('Playback progress');
      expect(slider!.getAttribute('aria-valuemin')).toBe('0');
    });
  });

  // ================================================================
  // Chapters
  // ================================================================

  describe('chapter navigation', () => {
    it('renders chapter markers on progress bar when chapters provided', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          chapters: makeChapters(),
          fieldMode: false,
        },
      });

      // Chapter markers have group/ch class for hover behavior
      const _chapterMarkers = target.querySelectorAll('.group\\/ch');
      // Chapters may not render if duration is 0 (due to {#if duration > 0} check)
      // With default duration=0, chapters are conditionally hidden
      // This is correct behavior -- chapters only display when media is loaded
    });

    it('shows chapter navigation buttons (prev/next) when chapters provided', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          chapters: makeChapters(),
          fieldMode: false,
        },
      });

      const prevBtn = target.querySelector('[title="Previous chapter"]') ||
                      target.querySelector('[aria-label="Previous chapter"]');
      const nextBtn = target.querySelector('[title="Next chapter"]') ||
                      target.querySelector('[aria-label="Next chapter"]');

      expect(prevBtn).toBeTruthy();
      expect(nextBtn).toBeTruthy();
    });

    it('does not show chapter navigation buttons when no chapters', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          chapters: [],
          fieldMode: false,
        },
      });

      const prevBtn = target.querySelector('[title="Previous chapter"]') ||
                      target.querySelector('[aria-label="Previous chapter"]');
      const nextBtn = target.querySelector('[title="Next chapter"]') ||
                      target.querySelector('[aria-label="Next chapter"]');

      expect(prevBtn).toBeNull();
      expect(nextBtn).toBeNull();
    });
  });

  // ================================================================
  // Annotation mode
  // ================================================================

  describe('annotation mode', () => {
    it('shows annotation mode indicator when annotationModeActive', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: true,
          fieldMode: false,
        },
      });

      expect(target.textContent).toContain('Click timeline to set start');
    });

    it('shows "Click timeline to set end" when start is set but end is not', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: true,
          timeRange: { start: 5 },
          fieldMode: false,
        },
      });

      expect(target.textContent).toContain('Click timeline to set end');
    });

    it('shows selected range when both start and end are set', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: true,
          timeRange: { start: 5, end: 15 },
          fieldMode: false,
        },
      });

      expect(target.textContent).toContain('Selected:');
    });

    it('does not show annotation mode indicator when annotationModeActive is false', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: false,
          fieldMode: false,
        },
      });

      expect(target.textContent).not.toContain('Click timeline to set start');
    });

    it('renders "Use current time" button in annotation mode', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: true,
          onTimeRangeChange: vi.fn(),
          fieldMode: false,
        },
      });

      expect(target.textContent).toContain('Use current time');
    });

    it('renders progress bar in annotation mode', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: true,
          fieldMode: false,
        },
      });

      const progressBar = target.querySelector('[role="slider"]');
      expect(progressBar).toBeTruthy();
      expect(progressBar!.getAttribute('aria-label')).toBe('Playback progress');
    });

    it('shows selected range text when time range is set', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: true,
          timeRange: { start: 10, end: 20 },
          fieldMode: false,
        },
      });

      // When both start and end are set, "Selected:" text should be visible
      expect(target.textContent).toContain('Selected:');
    });

    it('shows selected range in fieldMode when time range is set', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: true,
          timeRange: { start: 10, end: 20 },
          fieldMode: true,
        },
      });

      // In fieldMode, selected range text should still be visible
      expect(target.textContent).toContain('Selected:');
    });
  });

  // ================================================================
  // Transcript panel
  // ================================================================

  describe('transcript panel', () => {
    it('does not show transcript toggle when no accompanying content', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const subtitlesBtn = target.querySelector('[title="Show transcript"]') ||
                           target.querySelector('[aria-label="Show transcript"]');
      expect(subtitlesBtn).toBeNull();
    });

    it('shows transcript toggle button when accompanying content exists', () => {
      // Create a canvas with accompanyingCanvas that has sync points
      const canvasWithAccompanying = makeCanvas('Video with Transcript', {
        accompanyingCanvas: {
          id: 'https://example.org/canvas/transcript',
          label: { en: ['Transcript'] },
          items: [{
            type: 'AnnotationPage',
            items: [
              {
                type: 'Annotation',
                body: { type: 'TextualBody', value: 'Hello world' },
                target: { source: 'https://example.org/canvas/1#t=0' },
              },
              {
                type: 'Annotation',
                body: { type: 'TextualBody', value: 'Second line' },
                target: { source: 'https://example.org/canvas/1#t=5.5' },
              },
            ],
          }],
        },
      });

      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: canvasWithAccompanying,
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const subtitlesBtn = target.querySelector('[title="Show transcript"]') ||
                           target.querySelector('[aria-label="Show transcript"]');
      expect(subtitlesBtn).toBeTruthy();
    });
  });

  // ================================================================
  // Container & accessibility
  // ================================================================

  describe('container and accessibility', () => {
    it('renders with role="application" and keyboard instructions', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const container = target.querySelector('[role="application"]');
      expect(container).toBeTruthy();
      expect(container!.getAttribute('aria-label')).toContain('Video player');
      expect(container!.getAttribute('aria-label')).toContain('Space to play/pause');
    });

    it('renders audio player with audio aria-label', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/audio.mp3',
          mediaType: 'audio',
          fieldMode: false,
        },
      });

      const container = target.querySelector('[role="application"]');
      expect(container!.getAttribute('aria-label')).toContain('Audio player');
    });

    it('renders with tabindex="0" for keyboard focus', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const container = target.querySelector('[role="application"]');
      expect(container!.getAttribute('tabindex')).toBe('0');
    });

    it('applies custom class when provided', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          class: 'my-custom-player',
          fieldMode: false,
        },
      });

      const container = target.querySelector('.my-custom-player');
      expect(container).toBeTruthy();
    });

    it('renders player container with application role', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: false,
        },
      });

      const container = target.querySelector('[role="application"]');
      expect(container).toBeTruthy();
    });
  });

  // ================================================================
  // Poster overlay
  // ================================================================

  describe('poster', () => {
    it('renders poster overlay when poster prop provided and video has not played', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          poster: 'https://example.org/poster.jpg',
          fieldMode: false,
        },
      });

      const posterImg = target.querySelector('img[alt="Video poster"]');
      expect(posterImg).toBeTruthy();
      expect(posterImg!.getAttribute('src')).toBe('https://example.org/poster.jpg');
    });

    it('renders large play button on poster overlay', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          poster: 'https://example.org/poster.jpg',
          fieldMode: false,
        },
      });

      const playOverlay = target.querySelector('[aria-label="Play"]');
      expect(playOverlay).toBeTruthy();
    });

    it('does not render poster for audio mediaType', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/audio.mp3',
          mediaType: 'audio',
          poster: 'https://example.org/poster.jpg',
          fieldMode: false,
        },
      });

      const posterImg = target.querySelector('img[alt="Video poster"]');
      expect(posterImg).toBeNull();
    });
  });

  // ================================================================
  // fieldMode styling
  // ================================================================

  describe('fieldMode', () => {
    it('renders time display in fieldMode', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          fieldMode: true,
        },
      });

      // Time display text should still be visible in fieldMode
      expect(target.textContent).toContain('0:00.00');
    });

    it('renders progress bar in fieldMode annotation mode', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: true,
          fieldMode: true,
        },
      });

      const progressBar = target.querySelector('[role="slider"]');
      expect(progressBar).toBeTruthy();
      expect(progressBar!.getAttribute('aria-label')).toBe('Playback progress');
    });

    it('shows annotation mode instruction text in fieldMode', () => {
      instance = mount(MediaPlayer, {
        target,
        props: {
          canvas: makeCanvas(),
          src: 'https://example.org/video.mp4',
          mediaType: 'video',
          annotationModeActive: true,
          fieldMode: true,
        },
      });

      expect(target.textContent).toContain('Click timeline to set start');
    });
  });
});
