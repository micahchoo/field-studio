<!--
  MeasurementOverlay — SVG overlay + control panel for distance measurement

  ORIGINAL: src/features/viewer/ui/molecules/MeasurementOverlay.tsx (267 lines)
  LAYER: molecule (receives fieldMode prop)
  FSD: features/viewer/ui/molecules

  SVG overlay drawn on top of the OSD viewer for point-to-point distance
  measurement with calibration support. Coordinate transforms happen via
  OSD viewport methods (image-space to screen-space).
-->

<script lang="ts" module>
  import type { MeasurementStore } from '../../model/measurement.svelte';

  /** Available measurement units */
  const UNITS = ['px', 'cm', 'in', 'mm'] as const;
  type MeasureUnit = (typeof UNITS)[number];

  /** Convert image-space point to window coordinates via OSD viewport */
  function imageToViewport(
    viewer: any,
    point: { x: number; y: number },
  ): { x: number; y: number } | null {
    if (!viewer?.viewport) return null;
    try {
      const OSD = (window as any).OpenSeadragon;
      const vp = viewer.viewport.imageToViewportCoordinates(
        new OSD.Point(point.x, point.y),
      );
      const web = viewer.viewport.viewportToWindowCoordinates(vp);
      return { x: web.x, y: web.y };
    } catch {
      return null;
    }
  }
</script>

<script lang="ts">
  /* eslint-disable @field-studio/lifecycle-restrictions -- OSD viewport tracking requires $effect lifecycle hooks for coordinate transforms */
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';

  interface Props {
    measurement: MeasurementStore;
    viewerRef: any;
    osdContainerRef: HTMLDivElement | null;
    fieldMode?: boolean;
  }

  let {
    measurement,
    viewerRef,
    osdContainerRef,
    fieldMode = false,
  }: Props = $props();

  // Local state
  let calibrationInput = $state('');
  let viewportPoints = $state<[{ x: number; y: number }, { x: number; y: number }] | null>(null);

  // Derived from measurement store
  let active = $derived(measurement.active);
  let startPoint = $derived(measurement.startPoint);
  let endPoint = $derived(measurement.endPoint);
  let calibration = $derived(measurement.calibration);
  let currentDistancePx = $derived(measurement.currentDistancePx);

  let hasPoints = $derived(startPoint !== null && endPoint !== null);
  let distanceUnit = $derived.by(() => {
    if (!calibration || currentDistancePx === 0) return null;
    return currentDistancePx / calibration.pixelsPerUnit;
  });
  let unit = $derived(calibration?.unit ?? 'px');

  function formatDistance(): string {
    if (distanceUnit !== null && calibration !== null) {
      return `${distanceUnit.toFixed(2)} ${calibration.unit}`;
    }
    if (currentDistancePx > 0) {
      return `${Math.round(currentDistancePx)} px`;
    }
    return '';
  }

  let accentColor = $derived(fieldMode ? '#eab308' : '#3b82f6');

  // Convert image-space points to viewport coordinates for SVG overlay
  function updateViewportPoints() {
    if (!active || !startPoint || !endPoint) {
      viewportPoints = null;
      return;
    }

    const viewer = viewerRef;
    if (!viewer || !osdContainerRef) return;

    const rect = osdContainerRef.getBoundingClientRect();
    const p1 = imageToViewport(viewer, startPoint);
    const p2 = imageToViewport(viewer, endPoint);

    if (p1 && p2) {
      viewportPoints = [
        { x: p1.x - rect.left, y: p1.y - rect.top },
        { x: p2.x - rect.left, y: p2.y - rect.top },
      ];
    }
  }

  // OSD viewport tracking: update SVG overlay on zoom/pan/animation
  $effect(() => {
    if (!active || !startPoint || !endPoint) {
      viewportPoints = null;
      return;
    }

    const viewer = viewerRef;
    if (!viewer) return;

    updateViewportPoints();

    const handler = () => updateViewportPoints();
    viewer.addHandler('animation', handler);
    viewer.addHandler('zoom', handler);

    return () => {
      viewer.removeHandler('animation', handler);
      viewer.removeHandler('zoom', handler);
    };
  });

  // Register OSD canvas-click handler for point placement
  $effect(() => {
    if (!active) return;

    const viewer = viewerRef;
    if (!viewer) return;

    const handler = (e: { position: { x: number; y: number }; quick: boolean }) => {
      if (!e.quick) return;
      try {
        const viewportPoint = viewer.viewport.pointFromPixel(e.position);
        const imagePoint = viewer.viewport.viewportToImageCoordinates(viewportPoint);

        if (!startPoint) {
          measurement.setStart({ x: imagePoint.x, y: imagePoint.y });
        } else if (!endPoint) {
          measurement.setEnd({ x: imagePoint.x, y: imagePoint.y });
        } else {
          // Both set, start over
          measurement.setStart({ x: imagePoint.x, y: imagePoint.y });
        }
      } catch {
        // Ignore coordinate conversion errors
      }
    };

    viewer.addHandler('canvas-click', handler);
    return () => viewer.removeHandler('canvas-click', handler);
  });

  // --- Unit / calibration handlers ---

  function setUnit(u: string) {
    if (u !== 'px' && calibration) {
      // Only allow non-px units if calibrated
      measurement.calibrate(calibration.pixelsPerUnit, u);
    }
  }

  function handleCalibrationSubmit() {
    const value = parseFloat(calibrationInput);
    if (isNaN(value) || value <= 0 || currentDistancePx === 0) return;
    measurement.calibrate(currentDistancePx / value, 'cm');
    calibrationInput = '';
  }

  let isCalibrating = $state(false);

  function startCalibration() {
    isCalibrating = true;
    measurement.clearAll();
  }

  function cancelCalibration() {
    isCalibrating = false;
  }

  function finishCalibration() {
    const value = parseFloat(calibrationInput);
    if (isNaN(value) || value <= 0 || currentDistancePx === 0) return;
    measurement.calibrate(currentDistancePx / value, unit === 'px' ? 'cm' : unit);
    calibrationInput = '';
    isCalibrating = false;
  }

  function handleClear() {
    measurement.clearAll();
    viewportPoints = null;
  }
</script>

{#if active}
  <!-- SVG overlay for measurement line -->
  {#if viewportPoints}
    <svg class="absolute inset-0 w-full h-full pointer-events-none z-10">
      <!-- Dashed line between endpoints -->
      <line
        x1={viewportPoints[0].x}
        y1={viewportPoints[0].y}
        x2={viewportPoints[1].x}
        y2={viewportPoints[1].y}
        stroke={accentColor}
        stroke-width="2"
        stroke-dasharray="6,3"
      />
      <!-- Endpoint circles -->
      <circle cx={viewportPoints[0].x} cy={viewportPoints[0].y} r="4" fill={accentColor} />
      <circle cx={viewportPoints[1].x} cy={viewportPoints[1].y} r="4" fill={accentColor} />
      <!-- Distance label at midpoint -->
      <text
        x={(viewportPoints[0].x + viewportPoints[1].x) / 2}
        y={(viewportPoints[0].y + viewportPoints[1].y) / 2 - 10}
        text-anchor="middle"
        fill={accentColor}
        font-size="12"
        font-weight="bold"
        font-family="monospace"
      >
        <tspan dy="-2">{formatDistance()}</tspan>
      </text>
    </svg>
  {/if}

  <!-- Control panel -->
  <div class={cn(
    'absolute bottom-4 right-4 z-20 w-48 shadow-brutal backdrop-blur-sm border',
    fieldMode
      ? 'bg-nb-black/95 border-nb-yellow/30'
      : 'bg-nb-white border-nb-black/20'
  )}>
    <!-- Header -->
    <div class={cn(
      'flex items-center justify-between px-3 py-2 border-b',
      fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10'
    )}>
      <span class={cn(
        'text-xs font-semibold flex items-center gap-1',
        fieldMode ? 'text-nb-yellow/70' : 'text-nb-black/50'
      )}>
        <Icon name="straighten" class="text-sm" />
        Measure
      </span>
      {#if hasPoints}
        <Button variant="ghost" size="bare" onclick={handleClear}>
          <span class={cn('text-[10px]', fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/40')}>
            Clear
          </span>
        </Button>
      {/if}
    </div>

    <div class="p-2 space-y-2">
      <!-- Distance display -->
      {#if currentDistancePx > 0}
        <div class={cn(
          'text-center py-1 text-sm font-mono font-bold',
          fieldMode ? 'text-nb-yellow' : 'text-nb-blue'
        )}>
          {formatDistance()}
        </div>
      {:else}
        <div class={cn(
          'text-center py-1 text-xs',
          fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/40'
        )}>
          {isCalibrating ? 'Click two points of known distance' : 'Click two points to measure'}
        </div>
      {/if}

      <!-- Unit selector -->
      <div class="flex gap-1">
        {#each UNITS as u}
          <button
            onclick={() => setUnit(u)}
            class={cn(
              'flex-1 text-[10px] py-1 font-bold uppercase',
              u === unit
                ? fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-blue/10 text-nb-blue'
                : fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/30'
            )}
          >
            {u}
          </button>
        {/each}
      </div>

      <!-- Calibration -->
      {#if isCalibrating}
        <div class="space-y-1">
          {#if hasPoints}
            <div class="flex items-center gap-1">
              <input
                type="number"
                bind:value={calibrationInput}
                placeholder="Distance in {unit === 'px' ? 'cm' : unit}"
                class={cn(
                  'flex-1 text-xs px-2 py-1 border',
                  fieldMode
                    ? 'bg-nb-black border-nb-yellow/30 text-nb-yellow'
                    : 'border-nb-black/20'
                )}
              />
              <Button
                variant="primary"
                size="sm"
                onclick={finishCalibration}
                class="text-[10px]"
              >
                Set
              </Button>
            </div>
          {/if}
          <Button variant="ghost" size="sm" onclick={cancelCalibration} class="w-full text-[10px]">
            Cancel
          </Button>
        </div>
      {:else}
        <Button
          variant="ghost"
          size="sm"
          onclick={startCalibration}
          class={cn('w-full text-[10px]', !calibration && 'opacity-70')}
        >
          {calibration
            ? `Calibrated (${calibration.pixelsPerUnit.toFixed(1)} px/${calibration.unit})`
            : 'Calibrate Scale'}
        </Button>
      {/if}
    </div>
  </div>
{/if}
