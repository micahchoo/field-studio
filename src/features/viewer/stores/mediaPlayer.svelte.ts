/**
 * Media Player -- State container (Category 2)
 *
 * Replaces useMediaPlayer React hook.
 * Architecture doc S4 Cat 2: Reactive class in .svelte.ts file.
 *
 * Manages HTML5 audio/video playback state. Does NOT create the
 * media element -- the component does that. This store manages
 * the state and provides control methods.
 *
 * Usage in a Svelte component:
 *   const player = new MediaPlayerStore();
 *   onMount(() => { player.attach(audioEl); });
 *   onDestroy(() => { player.detach(); });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  playbackRate: number;
  isBuffering: boolean;
  isLoaded: boolean;
}

export interface MediaPlayerOptions {
  /** Milliseconds between reactive time updates (default 250) */
  updateThrottle?: number;
  /** Callback on time update (throttled) */
  onTimeUpdate?: (time: number) => void;
  /** Callback when media ends */
  onEnded?: () => void;
  /** Callback when play state changes */
  onPlayStateChange?: (playing: boolean) => void;
  /** Start muted */
  initialMuted?: boolean;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class MediaPlayerStore {
  // ------------------------------------------------------------------
  // Reactive state fields ($state)
  // ------------------------------------------------------------------
  #currentTime = $state(0);
  #duration = $state(0);
  #isPlaying = $state(false);
  #isMuted = $state(false);
  #volume = $state(1);
  #playbackRate = $state(1);
  #isBuffering = $state(false);
  #isLoaded = $state(false);
  #error = $state<string | null>(null);
  #showPoster = $state(true);

  // ------------------------------------------------------------------
  // Non-reactive internals
  // ------------------------------------------------------------------
  #element: HTMLMediaElement | null = null;
  #updateThrottle: number;
  #lastTimeUpdate = 0;
  #listeners: Array<{ event: string; handler: EventListener }> = [];
  #onTimeUpdate?: (time: number) => void;
  #onEnded?: () => void;
  #onPlayStateChange?: (playing: boolean) => void;

  // ------------------------------------------------------------------
  // Derived state ($derived)
  // ------------------------------------------------------------------

  /** Progress as a 0-1 fraction */
  readonly progress = $derived(
    this.#duration > 0 ? this.#currentTime / this.#duration : 0
  );

  /** Remaining time in seconds */
  readonly remaining = $derived(
    Math.max(0, this.#duration - this.#currentTime)
  );

  // ------------------------------------------------------------------
  // Constructor
  // ------------------------------------------------------------------
  constructor(options: MediaPlayerOptions = {}) {
    this.#updateThrottle = options.updateThrottle ?? 250;
    this.#onTimeUpdate = options.onTimeUpdate;
    this.#onEnded = options.onEnded;
    this.#onPlayStateChange = options.onPlayStateChange;
    if (options.initialMuted) {
      this.#isMuted = true;
    }
  }

  // ------------------------------------------------------------------
  // Read-only accessors for reactive state
  // ------------------------------------------------------------------

  get currentTime(): number { return this.#currentTime; }
  get duration(): number { return this.#duration; }
  get isPlaying(): boolean { return this.#isPlaying; }
  get isMuted(): boolean { return this.#isMuted; }
  get volume(): number { return this.#volume; }
  get playbackRate(): number { return this.#playbackRate; }
  get isBuffering(): boolean { return this.#isBuffering; }
  get isLoaded(): boolean { return this.#isLoaded; }
  get error(): string | null { return this.#error; }
  get showPoster(): boolean { return this.#showPoster; }

  /** Snapshot of all state as a plain object */
  get state(): MediaState {
    return {
      currentTime: this.#currentTime,
      duration: this.#duration,
      isPlaying: this.#isPlaying,
      isMuted: this.#isMuted,
      volume: this.#volume,
      playbackRate: this.#playbackRate,
      isBuffering: this.#isBuffering,
      isLoaded: this.#isLoaded,
    };
  }

  // ------------------------------------------------------------------
  // Lifecycle: attach / detach
  // ------------------------------------------------------------------

  /**
   * Bind to an HTML media element. Call from component's onMount.
   *
   * Pseudocode:
   * 1. Store element reference
   * 2. Register event listeners for all media events
   * 3. Sync initial state from element (if already loaded)
   * 4. Apply initial muted state
   */
  attach(element: HTMLMediaElement): void {
    // Detach previous if any
    if (this.#element) {
      this.detach();
    }

    this.#element = element;

    // Helper to add a listener and track it for cleanup
    const on = (event: string, handler: EventListener) => {
      element.addEventListener(event, handler);
      this.#listeners.push({ event, handler });
    };

    // --- timeupdate: throttled to reduce reactive churn ---
    on('timeupdate', () => {
      const now = Date.now();
      if (now - this.#lastTimeUpdate >= this.#updateThrottle) {
        this.#lastTimeUpdate = now;
        this.#currentTime = element.currentTime;
        this.#onTimeUpdate?.(element.currentTime);
      }
    });

    // --- play ---
    on('play', () => {
      this.#isPlaying = true;
      this.#showPoster = false;
      this.#error = null;
      this.#onPlayStateChange?.(true);
    });

    // --- pause ---
    on('pause', () => {
      this.#isPlaying = false;
      this.#onPlayStateChange?.(false);
    });

    // --- ended ---
    on('ended', () => {
      this.#isPlaying = false;
      this.#onPlayStateChange?.(false);
      this.#onEnded?.();
    });

    // --- volumechange ---
    on('volumechange', () => {
      this.#volume = element.volume;
      this.#isMuted = element.muted;
    });

    // --- ratechange ---
    on('ratechange', () => {
      this.#playbackRate = element.playbackRate;
    });

    // --- loadedmetadata ---
    on('loadedmetadata', () => {
      this.#duration = element.duration;
      this.#isLoaded = true;
      this.#isBuffering = false;
    });

    // --- waiting (buffering) ---
    on('waiting', () => {
      this.#isBuffering = true;
    });

    // --- canplay (buffered enough) ---
    on('canplay', () => {
      this.#isBuffering = false;
    });

    // --- error ---
    on('error', () => {
      const code = element.error?.code;
      this.#error = MediaPlayerStore.#getErrorMessage(code);
      this.#isPlaying = false;
      this.#isBuffering = false;
    });

    // Sync initial state if element is already loaded
    if (element.readyState >= 1) {
      this.#duration = element.duration;
      this.#isLoaded = true;
    }
    if (element.readyState >= 3) {
      this.#isBuffering = false;
    }

    // Apply initial muted state
    element.muted = this.#isMuted;
  }

  /**
   * Unbind from the media element. Call from component's onDestroy.
   *
   * Pseudocode:
   * 1. Remove all event listeners
   * 2. Clear element reference
   * 3. Reset state to defaults
   */
  detach(): void {
    if (this.#element) {
      for (const { event, handler } of this.#listeners) {
        this.#element.removeEventListener(event, handler);
      }
    }
    this.#listeners = [];
    this.#element = null;

    // Reset state
    this.#currentTime = 0;
    this.#duration = 0;
    this.#isPlaying = false;
    this.#isBuffering = false;
    this.#isLoaded = false;
    this.#error = null;
    this.#showPoster = true;
  }

  // ------------------------------------------------------------------
  // Controls
  // ------------------------------------------------------------------

  /** Start playback */
  async play(): Promise<void> {
    if (!this.#element) return;
    try {
      await this.#element.play();
      this.#error = null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown playback error';
      this.#error = `Unable to play: ${msg}`;
      this.#isPlaying = false;
    }
  }

  /** Pause playback */
  pause(): void {
    this.#element?.pause();
  }

  /** Toggle play/pause */
  async togglePlay(): Promise<void> {
    if (this.#isPlaying) {
      this.pause();
    } else {
      await this.play();
    }
  }

  /** Seek to an absolute time in seconds */
  seek(time: number): void {
    if (!this.#element) return;
    const clamped = Math.max(0, Math.min(time, this.#duration || Infinity));
    this.#element.currentTime = clamped;
    this.#currentTime = clamped;
  }

  /** Seek relative to current position */
  seekRelative(delta: number): void {
    const current = this.#element?.currentTime ?? this.#currentTime;
    this.seek(current + delta);
  }

  /** Seek to a percentage (0-1) of duration */
  seekToPercent(percent: number): void {
    const clamped = Math.max(0, Math.min(1, percent));
    this.seek(clamped * this.#duration);
  }

  /** Set volume (0-1) */
  setVolume(vol: number): void {
    if (!this.#element) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.#element.volume = clamped;
    this.#volume = clamped;
    // Auto-unmute if setting volume above 0
    if (clamped > 0 && this.#isMuted) {
      this.#element.muted = false;
      this.#isMuted = false;
    }
  }

  /** Toggle mute state */
  toggleMute(): void {
    if (!this.#element) return;
    this.#element.muted = !this.#element.muted;
    this.#isMuted = this.#element.muted;
  }

  /** Set playback rate */
  setPlaybackRate(rate: number): void {
    if (!this.#element) return;
    const clamped = Math.max(0.25, Math.min(4, rate));
    this.#element.playbackRate = clamped;
    this.#playbackRate = clamped;
  }

  /** Clear the current error */
  clearError(): void {
    this.#error = null;
  }

  // ------------------------------------------------------------------
  // Time formatting
  // ------------------------------------------------------------------

  /**
   * Format time as MM:SS or HH:MM:SS for durations >= 1 hour.
   * If no argument provided, formats the current time.
   */
  formatTime(seconds?: number): string {
    const t = seconds ?? this.#currentTime;
    if (!isFinite(t) || t < 0) return '0:00';

    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ------------------------------------------------------------------
  // Keyboard shortcuts
  // ------------------------------------------------------------------

  /**
   * Handle keyboard shortcuts for media control.
   * Call from a keydown handler on the player container.
   *
   * Pseudocode:
   * 1. Ignore if target is an input/textarea (user is typing)
   * 2. Match key to action: Space/K toggle, arrows seek/volume, etc.
   * 3. Return true if the key was handled (caller should preventDefault)
   *
   * @returns true if the keystroke was handled
   */
  handleKeyboard(e: KeyboardEvent): boolean {
    // Don't intercept when user is typing in an input
    const target = e.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return false;
    }

    const key = e.key.toLowerCase();

    switch (key) {
      // --- Play/Pause ---
      case ' ':
      case 'k':
        e.preventDefault();
        this.togglePlay();
        return true;

      // --- Seek backward ---
      case 'arrowleft':
      case 'j':
        e.preventDefault();
        this.seekRelative(-5);
        return true;

      // --- Seek forward ---
      case 'arrowright':
      case 'l':
        e.preventDefault();
        this.seekRelative(5);
        return true;

      // --- Volume up ---
      case 'arrowup':
        e.preventDefault();
        this.setVolume(Math.min(1, this.#volume + 0.1));
        return true;

      // --- Volume down ---
      case 'arrowdown':
        e.preventDefault();
        this.setVolume(Math.max(0, this.#volume - 0.1));
        return true;

      // --- Toggle mute ---
      case 'm':
        e.preventDefault();
        this.toggleMute();
        return true;

      // --- Seek to beginning ---
      case 'home':
        e.preventDefault();
        this.seek(0);
        return true;

      // --- Seek to end ---
      case 'end':
        e.preventDefault();
        this.seek(this.#duration);
        return true;

      // --- Playback rate decrease ---
      case '<':
      case ',':
        e.preventDefault();
        this.setPlaybackRate(this.#playbackRate - 0.25);
        return true;

      // --- Playback rate increase ---
      case '>':
      case '.':
        e.preventDefault();
        this.setPlaybackRate(this.#playbackRate + 0.25);
        return true;
    }

    // --- Number keys: seek to percentage (0 = 0%, 9 = 90%) ---
    if (/^[0-9]$/.test(key)) {
      e.preventDefault();
      this.seekToPercent(parseInt(key) / 10);
      return true;
    }

    return false;
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  static #getErrorMessage(code: number | undefined): string {
    switch (code) {
      case 1: return 'Media loading aborted';
      case 2: return 'Network error while loading media';
      case 3: return 'Media decoding failed';
      case 4: return 'Media format not supported';
      default: return 'Unknown media error';
    }
  }
}
