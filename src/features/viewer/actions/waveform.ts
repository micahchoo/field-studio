/* eslint-disable @typescript-eslint/no-explicit-any -- TYPE_DEBT: no @types/wavesurfer.js available */
/**
 * Waveform -- DOM behavior action (Category 3)
 *
 * Replaces useWaveform React hook.
 * Architecture doc S4 Cat 3: Svelte action (use:waveform)
 *
 * Wraps WaveSurfer.js for audio waveform visualization with
 * region-based time annotation support and playback sync.
 *
 * NOTE: WaveSurfer is an external runtime dependency. The action
 * references it by type and dynamic import. The region color cycling,
 * throttle logic, and annotation sync are fully implemented.
 *
 * Usage in a Svelte component:
 *   <div use:waveform={{
 *     src: audioUrl,
 *     annotations: timeAnnotations,
 *     annotationMode: isAnnotating,
 *     onReady: handleReady,
 *     onTimeUpdate: handleTime,
 *   }} />
 */

import type { Action } from 'svelte/action';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Color palette for annotation region overlays (cycles through) */
export const REGION_COLORS = [
  'rgba(59, 130, 246, 0.3)',   // blue
  'rgba(34, 197, 94, 0.3)',    // green
  'rgba(168, 85, 247, 0.3)',   // purple
  'rgba(245, 158, 11, 0.3)',   // amber
  'rgba(239, 68, 68, 0.3)',    // red
  'rgba(6, 182, 212, 0.3)',    // cyan
];

/** Field mode color palette */
const FIELD_MODE_COLORS = {
  waveColor: '#eab308',
  progressColor: '#fbbf24',
  cursorColor: '#fbbf24',
  hoverLine: '#eab308',
  hoverBg: '#000',
  regionDrag: 'rgba(234, 179, 8, 0.3)',
} as const;

/** Normal mode color palette */
const NORMAL_COLORS = {
  waveColor: '#64748b',
  progressColor: '#22c55e',
  cursorColor: '#3b82f6',
  hoverLine: '#22c55e',
  hoverBg: '#333',
  regionDrag: 'rgba(34, 197, 94, 0.3)',
} as const;

/** Throttle interval for time updates in milliseconds */
const TIME_UPDATE_THROTTLE = 250;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Annotation region for waveform display */
export interface WaveformAnnotation {
  id: string;
  start: number;
  end?: number;
  label?: string;
}

export interface WaveformParams {
  /** Audio source URL */
  src?: string;
  /** Time-based annotations to display as regions */
  annotations?: WaveformAnnotation[];
  /** Whether annotation mode is active (enables drag-to-select regions) */
  annotationMode?: boolean;
  /** Field mode styling (yellow theme) */
  fieldMode?: boolean;
  /** Called when audio is loaded and ready */
  onReady?: (duration: number) => void;
  /** Called on playback time update (throttled) */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when a new region is created by dragging */
  onRegionCreate?: (start: number, end: number) => void;
  /** Called when an existing region is clicked */
  onRegionClick?: (id: string) => void;
  /** Called when playback starts */
  onPlay?: () => void;
  /** Called when playback pauses */
  onPause?: () => void;
  /** Called when playback finishes */
  onFinish?: () => void;
  /** Called on play state change (convenience, fires for play/pause/finish) */
  onPlayStateChange?: (playing: boolean) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get region color by index (cycles through REGION_COLORS) */
export function getRegionColor(index: number): string {
  return REGION_COLORS[index % REGION_COLORS.length];
}

/**
 * Resolve the color palette based on field mode.
 */
function getColorPalette(fieldMode: boolean) {
  return fieldMode ? FIELD_MODE_COLORS : NORMAL_COLORS;
}

// ---------------------------------------------------------------------------
// Svelte action
// ---------------------------------------------------------------------------

/**
 * Svelte action that wraps WaveSurfer.js for audio waveform visualization.
 *
 * Pseudocode:
 * 1. Dynamically import WaveSurfer and its plugins (Regions, Timeline, Hover)
 * 2. Create WaveSurfer instance on the node element
 * 3. Load audio source
 * 4. Subscribe to ready/timeupdate/play/pause/finish events
 * 5. Render annotation regions with cycling REGION_COLORS
 * 6. Enable drag-to-select when annotationMode is true
 * 7. Throttle time updates to TIME_UPDATE_THROTTLE ms
 * 8. On update: diff params, reload src or sync regions as needed
 * 9. On destroy: call ws.destroy() to clean up
 */
export const waveform: Action<HTMLElement, WaveformParams> = (
  node: HTMLElement,
  params: WaveformParams,
) => {
  let wsInstance: any = null;
  let regionsPlugin: any = null;
  let dragDisable: (() => void) | null = null;
  let lastTimeUpdate = 0;
  let currentParams = params;
  let isReady = false;
  let destroyed = false;

  // ---- Initialize WaveSurfer ----

  // Pseudocode:
  // 1. Import WaveSurfer and plugins
  // 2. Create plugins array (Regions always, Timeline if node has child, Hover)
  // 3. Create WaveSurfer with src, colors, and plugins
  // 4. Wire up all event handlers
  async function initialize(p: WaveformParams): Promise<void> {
    if (destroyed || !p.src) return;

    const colors = getColorPalette(p.fieldMode ?? false);

    // Dynamic imports for WaveSurfer and plugins
    let WaveSurfer: any;
    let RegionsPlugin: any;
    let HoverPlugin: any;

    try {
      // These are runtime dependencies; the action is a no-op without them
      const wsModule = await import('wavesurfer.js');
      WaveSurfer = wsModule.default ?? wsModule;
      const regionsModule = await import('wavesurfer.js/dist/plugins/regions.js');
      RegionsPlugin = regionsModule.default ?? regionsModule;
      const hoverModule = await import('wavesurfer.js/dist/plugins/hover.js');
      HoverPlugin = hoverModule.default ?? hoverModule;
    } catch {
      // WaveSurfer not installed; action is a no-op
      console.warn('[waveform action] wavesurfer.js not available');
      return;
    }

    if (destroyed) return; // check again after async

    // Create plugins
    const regions = RegionsPlugin.create();
    regionsPlugin = regions;

    const plugins: any[] = [regions];

    // Add hover plugin
    plugins.push(HoverPlugin.create({
      lineColor: colors.hoverLine,
      lineWidth: 2,
      labelBackground: colors.hoverBg,
      labelColor: '#fff',
      labelSize: '11px',
    }));

    // Create WaveSurfer instance
    const ws = WaveSurfer.create({
      container: node,
      url: p.src,
      waveColor: colors.waveColor,
      progressColor: colors.progressColor,
      cursorColor: colors.cursorColor,
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 'auto',
      normalize: true,
      plugins,
    });

    wsInstance = ws;

    // ---- Event: ready ----
    ws.on('ready', () => {
      if (destroyed) return;
      isReady = true;
      const duration = ws.getDuration();
      currentParams.onReady?.(duration);

      // Load initial annotation regions
      syncAnnotationRegions(currentParams.annotations ?? []);

      // Enable drag selection if annotation mode is active
      if (currentParams.annotationMode) {
        enableDragSelection();
      }
    });

    // ---- Event: timeupdate (throttled) ----
    ws.on('timeupdate', (time: number) => {
      const now = Date.now();
      if (now - lastTimeUpdate >= TIME_UPDATE_THROTTLE) {
        lastTimeUpdate = now;
        currentParams.onTimeUpdate?.(time);
      }
    });

    // ---- Event: play ----
    ws.on('play', () => {
      currentParams.onPlay?.();
      currentParams.onPlayStateChange?.(true);
    });

    // ---- Event: pause ----
    ws.on('pause', () => {
      currentParams.onPause?.();
      currentParams.onPlayStateChange?.(false);
    });

    // ---- Event: finish ----
    ws.on('finish', () => {
      currentParams.onFinish?.();
      currentParams.onPlayStateChange?.(false);
    });

    // ---- Region events ----
    // User-created regions (via drag selection) have IDs prefixed with 'user-'
    regions.on('region-created', (region: any) => {
      if (region.id?.startsWith('user-')) {
        currentParams.onRegionCreate?.(region.start, region.end);
      }
    });

    regions.on('region-updated', (region: any) => {
      if (region.id?.startsWith('user-')) {
        currentParams.onRegionCreate?.(region.start, region.end);
      }
    });

    regions.on('region-clicked', (region: any) => {
      // Strip 'anno-' prefix to get the original annotation ID
      const annoId = region.id?.startsWith('anno-')
        ? region.id.slice(5)
        : region.id;
      currentParams.onRegionClick?.(annoId);
    });
  }

  // ---- Sync annotation regions ----

  // Pseudocode:
  // 1. Remove all existing 'anno-' prefixed regions
  // 2. For each annotation with a time range, add a region
  // 3. Cycle through REGION_COLORS for visual distinction
  function syncAnnotationRegions(annotations: WaveformAnnotation[]): void {
    if (!regionsPlugin || !isReady) return;

    // Remove existing annotation regions (keep user-created ones)
    const existingRegions = regionsPlugin.getRegions?.() ?? [];
    for (const region of existingRegions) {
      if (region.id?.startsWith('anno-')) {
        region.remove();
      }
    }

    // Add annotation regions with cycling colors
    annotations.forEach((anno: WaveformAnnotation, idx: number) => {
      regionsPlugin.addRegion({
        id: `anno-${anno.id}`,
        start: anno.start,
        end: anno.end ?? anno.start + 0.5,
        color: getRegionColor(idx),
        content: anno.label || '',
        drag: false,
        resize: false,
      });
    });
  }

  // ---- Enable/disable drag selection ----

  function enableDragSelection(): void {
    if (!regionsPlugin) return;

    // Disable previous if active
    disableDragSelection();

    const colors = getColorPalette(currentParams.fieldMode ?? false);
    dragDisable = regionsPlugin.enableDragSelection?.({
      color: colors.regionDrag,
      id: `user-${Date.now()}`,
    }) ?? null;
  }

  function disableDragSelection(): void {
    if (dragDisable) {
      dragDisable();
      dragDisable = null;
    }
  }

  // ---- Start initialization ----
  initialize(params);

  // ---- Svelte action return: update + destroy ----
  return {
    /**
     * Called when action parameters change.
     *
     * Pseudocode:
     * 1. If src changed, destroy old instance and reinitialize
     * 2. If fieldMode changed, reinitialize (colors are set at creation)
     * 3. If annotationMode changed, enable/disable drag selection
     * 4. If annotations changed, sync regions
     */
    update(newParams: WaveformParams) {
      const prevParams = currentParams;
      currentParams = newParams;

      // Source or field mode changed: full reinitialize
      if (
        newParams.src !== prevParams.src ||
        newParams.fieldMode !== prevParams.fieldMode
      ) {
        // Destroy existing instance
        if (wsInstance) {
          disableDragSelection();
          wsInstance.destroy();
          wsInstance = null;
          regionsPlugin = null;
          isReady = false;
        }
        // Reinitialize with new params
        initialize(newParams);
        return;
      }

      // Annotation mode toggled
      if (newParams.annotationMode !== prevParams.annotationMode) {
        if (newParams.annotationMode) {
          enableDragSelection();
        } else {
          disableDragSelection();
        }
      }

      // Annotations changed: sync regions
      if (newParams.annotations !== prevParams.annotations) {
        syncAnnotationRegions(newParams.annotations ?? []);
      }
    },

    destroy() {
      destroyed = true;
      disableDragSelection();
      if (wsInstance) {
        wsInstance.destroy();
        wsInstance = null;
        regionsPlugin = null;
      }
      isReady = false;
    },
  };
};
