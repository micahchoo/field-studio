<!--
  TimeModeSelector — IIIF timeMode radio toggle group.
  React source: src/features/metadata-edit/ui/atoms/TimeModeSelector.tsx (163 lines)
  Architecture: Atom (zero local state — value controlled by parent)
  Spec: https://iiif.io/api/presentation/3.0/#timemode
-->
<script module lang="ts">
  export type TimeMode = 'trim' | 'scale' | 'loop';

  export interface TimeModeSelectorProps {
    /** Current time mode */
    value: TimeMode;
    /** Called when mode changes */
    onChange: (mode: TimeMode) => void;
    /** Annotation time range for display */
    timeRange?: { start: number; end?: number };
    /** Canvas duration in seconds */
    canvasDuration?: number;
    /** Loop count (0 = infinite) */
    loopCount?: number;
    /** Called when loop count changes */
    onLoopCountChange?: (count: number) => void;
    /** Field mode styling */
    fieldMode?: boolean;
    /** Whether editing is disabled */
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  let {
    value,
    onChange,
    timeRange,
    canvasDuration,
    loopCount = 0,
    onLoopCountChange,
    fieldMode = false,
    disabled = false,
  }: TimeModeSelectorProps = $props();

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  let annotationDuration = $derived(
    timeRange ? ((timeRange.end ?? timeRange.start) - timeRange.start) : 0
  );

  let playbackRate = $derived(
    canvasDuration && annotationDuration > 0
      ? (canvasDuration / annotationDuration).toFixed(2)
      : '1.00'
  );

  interface ModeOption {
    mode: TimeMode;
    icon: string;
    label: string;
    description: string;
  }

  let options = $derived<ModeOption[]>([
    {
      mode: 'trim',
      icon: 'content_cut',
      label: 'Trim',
      description: timeRange
        ? `${formatTime(timeRange.start)} to ${formatTime(timeRange.end ?? timeRange.start)}`
        : 'Play only the annotated segment',
    },
    {
      mode: 'scale',
      icon: 'speed',
      label: 'Scale',
      description: `Playback rate: ${playbackRate}x`,
    },
    {
      mode: 'loop',
      icon: 'repeat',
      label: 'Loop',
      description: loopCount === 0 ? 'Loop indefinitely' : `Loop ${loopCount} times`,
    },
  ]);
</script>

<div class="space-y-2">
  <!-- Section header -->
  <div class={cn(
    'flex items-center gap-1.5',
    fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
  )}>
    <Icon name="timer" class="text-sm" />
    <span class="text-xs font-semibold uppercase tracking-wider">Time Mode</span>
  </div>

  <!-- Radio button group -->
  <div class="space-y-1" role="radiogroup" aria-label="Time mode selection">
    {#each options as opt (opt.mode)}
      {@const isActive = value === opt.mode}
      <button
        type="button"
        role="radio"
        aria-checked={isActive}
        {disabled}
        onclick={() => onChange(opt.mode)}
        class={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 border text-left transition-nb',
          isActive
            ? fieldMode
              ? 'border-nb-yellow bg-nb-yellow/20 text-white'
              : 'border-nb-blue/40 bg-nb-blue/10 text-nb-blue'
            : fieldMode
              ? 'border-nb-black/80 bg-nb-black/30 text-nb-black/40 hover:bg-nb-black'
              : 'border-nb-black/20 bg-nb-white text-nb-black/50 hover:bg-nb-white',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <!-- Radio dot indicator -->
        <span class={cn(
          'w-3.5 h-3.5 border-2 flex items-center justify-center shrink-0',
          isActive
            ? fieldMode ? 'border-nb-yellow' : 'border-nb-blue'
            : fieldMode ? 'border-nb-black/60' : 'border-nb-black/20'
        )}>
          {#if isActive}
            <span class={cn('w-1.5 h-1.5', fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue')}></span>
          {/if}
        </span>

        <Icon name={opt.icon} class="text-base" />

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium">{opt.label}</div>
          <div class={cn(
            'text-xs',
            isActive
              ? fieldMode ? 'text-nb-yellow/60' : 'text-nb-blue'
              : fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'
          )}>
            {opt.description}
          </div>
        </div>
      </button>
    {/each}
  </div>

  <!-- Loop count input (only when loop mode active and callback provided) -->
  {#if value === 'loop' && onLoopCountChange && !disabled}
    <div class="pl-9">
      <label
        for="loop-count-input"
        class={cn(
          'block text-[10px] font-bold mb-1 uppercase tracking-wider',
          fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'
        )}
      >
        Loop count (0 = infinite)
      </label>
      <input
        id="loop-count-input"
        type="number"
        value={loopCount}
        min={0}
        max={100}
        oninput={(e) => {
          const val = parseInt((e.currentTarget as HTMLInputElement).value, 10);
          onLoopCountChange?.(isNaN(val) ? 0 : val);
        }}
        class={cn(
          'w-full text-sm border px-2 py-1.5 outline-none',
          fieldMode
            ? 'bg-nb-black border-nb-black/60 text-white'
            : 'bg-nb-white border-nb-black/20 text-nb-black/80'
        )}
      />
    </div>
  {/if}
</div>
