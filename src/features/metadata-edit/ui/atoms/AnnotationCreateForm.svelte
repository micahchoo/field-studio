<!--
  AnnotationCreateForm — Annotation creation form for spatial and time-based annotations.
  React source: src/features/metadata-edit/ui/atoms/AnnotationCreateForm.tsx
  Architecture: Atom (zero state, props-only, Rule 2.F: static types in script module)
-->
<script module lang="ts">
  export interface TimeRange {
    start: number;
    end?: number;
  }

  export function formatTimeForDisplay(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    fieldMode: boolean;
    mediaType?: 'image' | 'audio' | 'video' | null;
    annotationDrawingState?: {
      pointCount: number;
      isDrawing: boolean;
      canSave: boolean;
    } | null;
    timeRange?: TimeRange | null;
    currentPlaybackTime?: number;
    annotationMotivation?: string;
    onAnnotationMotivationChange?: (motivation: string) => void;
    annotationText?: string;
    onAnnotationTextChange?: (text: string) => void;
    onSaveAnnotation?: () => void;
    onClearAnnotation?: () => void;
    cx?: Partial<ContextualClassNames>;
  }

  let {
    fieldMode,
    mediaType = null,
    annotationDrawingState = null,
    timeRange = null,
    currentPlaybackTime = 0,
    annotationMotivation = 'commenting',
    onAnnotationMotivationChange,
    annotationText = '',
    onAnnotationTextChange,
    onSaveAnnotation,
    onClearAnnotation,
    cx = {},
  }: Props = $props();

  let isAV = $derived(mediaType === 'audio' || mediaType === 'video');
  let showForm = $derived(
    annotationDrawingState?.canSave || (isAV && timeRange != null)
  );

  let motivationOptions = ['commenting', 'tagging', 'describing'] as const;

  let labelClass = $derived(
    cn(
      'text-xs font-bold uppercase tracking-wider font-mono',
      fieldMode ? 'text-nb-yellow/80' : cx.label ?? 'text-nb-black/70'
    )
  );

  let inputClass = $derived(
    cn(
      'w-full px-2 py-1.5 text-sm border outline-none focus:ring-2 font-mono',
      fieldMode
        ? 'bg-nb-black text-nb-yellow border-nb-yellow/30 focus:ring-nb-yellow focus:border-nb-yellow'
        : cx.input ?? 'bg-nb-white text-nb-black/80 border-nb-black/20 focus:ring-nb-blue focus:border-nb-blue'
    )
  );
</script>

{#if showForm}
  <div class={cn(
    'space-y-3 p-3 border',
    fieldMode ? 'border-nb-yellow/20 bg-nb-black' : 'border-nb-black/10 bg-nb-white'
  )}>
    <!-- Target info -->
    <div>
      <p class={labelClass}>Target</p>
      {#if isAV && timeRange}
        <p class={cn('text-sm font-mono mt-1', fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black')}>
          <Icon name="schedule" class="text-base align-middle mr-1" />
          {formatTimeForDisplay(timeRange.start)}
          {#if timeRange.end != null}
            &ndash; {formatTimeForDisplay(timeRange.end)}
          {/if}
        </p>
      {:else if annotationDrawingState}
        <p class={cn('text-sm font-mono mt-1', fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black')}>
          <Icon name="crop" class="text-base align-middle mr-1" />
          Spatial region ({annotationDrawingState.pointCount} point{annotationDrawingState.pointCount !== 1 ? 's' : ''})
        </p>
      {/if}
    </div>

    <!-- Motivation selector -->
    <div>
      <p class={labelClass}>Motivation</p>
      <div class="flex gap-1 mt-1">
        {#each motivationOptions as mot (mot)}
          <Button
            variant={annotationMotivation === mot ? 'primary' : 'secondary'}
            size="sm"
            onclick={() => onAnnotationMotivationChange?.(mot)}
          >
            {#snippet children()}{mot}{/snippet}
          </Button>
        {/each}
      </div>
    </div>

    <!-- Annotation text -->
    <div>
      <p class={labelClass}>Text</p>
      <textarea
        value={annotationText}
        oninput={(e) => onAnnotationTextChange?.(e.currentTarget.value)}
        placeholder="Annotation text..."
        rows={3}
        class={inputClass}
      ></textarea>
    </div>

    <!-- Current playback time (AV only) -->
    {#if isAV && currentPlaybackTime != null}
      <p class={cn('text-xs font-mono', fieldMode ? 'text-nb-yellow/50' : cx.textMuted ?? 'text-nb-black/40')}>
        Playback: {formatTimeForDisplay(currentPlaybackTime)}
      </p>
    {/if}

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <Button
        variant="primary"
        size="sm"
        onclick={onSaveAnnotation}
        disabled={!annotationText.trim()}
      >
        {#snippet icon()}
          <Icon name="save" />
        {/snippet}
        {#snippet children()}Save{/snippet}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onclick={onClearAnnotation}
      >
        {#snippet icon()}
          <Icon name="clear" />
        {/snippet}
        {#snippet children()}Cancel{/snippet}
      </Button>
    </div>
  </div>
{:else}
  <!-- Guidance when no region/range is selected -->
  <div class={cn(
    'flex items-center gap-2 p-3 text-sm',
    fieldMode ? 'text-nb-yellow/50' : cx.textMuted ?? 'text-nb-black/40'
  )}>
    <Icon name={isAV ? 'timeline' : 'draw'} class="text-lg" />
    <span>
      {#if isAV}
        Select a time range on the media player to create an annotation.
      {:else}
        Draw a region on the canvas to create an annotation.
      {/if}
    </span>
  </div>
{/if}
