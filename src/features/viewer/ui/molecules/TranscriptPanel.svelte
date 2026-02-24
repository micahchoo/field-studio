<!--
  TranscriptPanel — IIIF accompanying canvas transcript sidebar

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Displays synchronized transcript entries from an IIIF accompanyingCanvas.
  Highlights the current sync point and allows clicking to seek to a time.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import { formatTimeForDisplay } from '../../model/annotation';
  import { getIIIFValue } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface SyncPoint {
    mainTime: number;
    accompanyingPosition: string;
  }

  interface Props {
    syncPoints: SyncPoint[];
    currentSyncPoint: SyncPoint | null;
    accompanyingCanvas: any;
    onSeek: (time: number) => void;
    onClose: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    syncPoints,
    currentSyncPoint,
    accompanyingCanvas,
    onSeek,
    onClose,
    cx,
    fieldMode = false,
  }: Props = $props();
</script>

<div class={cn(
  'w-80 bg-nb-black border-l flex flex-col',
  fieldMode ? 'border-nb-black' : 'border-nb-black/80'
)}>
  <!-- Header -->
  <div class={cn(
    'p-3 border-b flex items-center justify-between',
    fieldMode ? 'border-nb-black' : 'border-nb-black/80'
  )}>
    <div class="flex items-center gap-2">
      <Icon name="subtitles" class="text-nb-black/40" />
      <span class={cn('text-sm font-medium', fieldMode ? 'text-nb-yellow' : 'text-white')}>
        {accompanyingCanvas?.label ? getIIIFValue(accompanyingCanvas.label) : 'Transcript'}
      </span>
    </div>
    <Button
      variant="ghost"
      size="bare"
      onclick={onClose}
      class="text-nb-black/40 hover:text-white p-1"
    >
      <Icon name="close" class="text-lg" />
    </Button>
  </div>

  <!-- Transcript body -->
  <div class="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
    {#each syncPoints as point}
      <button
        onclick={() => onSeek(point.mainTime)}
        class={cn(
          'w-full text-left p-2 transition-nb',
          currentSyncPoint === point
            ? fieldMode
              ? 'bg-nb-yellow/20 border border-nb-yellow/50'
              : 'bg-nb-blue/20 border border-nb-blue/50'
            : fieldMode
              ? 'hover:bg-nb-black'
              : 'hover:bg-nb-black/80'
        )}
      >
        <div class={cn(
          'text-[10px] font-mono mb-1',
          fieldMode ? 'text-nb-yellow/70' : 'text-nb-blue'
        )}>
          {formatTimeForDisplay(point.mainTime)}
        </div>
        <div class={cn(
          'text-sm',
          fieldMode ? 'text-nb-black/30' : 'text-nb-black/20'
        )}>
          {String(point.accompanyingPosition)}
        </div>
      </button>
    {/each}
  </div>
</div>
