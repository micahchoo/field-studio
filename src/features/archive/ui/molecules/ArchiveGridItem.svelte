<!--
  ArchiveGridItem Molecule
  =========================
  Individual grid item for the virtualized ArchiveGrid organism.
  Renders thumbnail with BlurUpThumbnail, metadata badges, validation dot,
  selection checkmark, drag-drop support, and keyboard focus ring.
  Extracted from ArchiveGrid organism.
-->
<script lang="ts">
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import type { TreeValidationIssue } from '@/src/shared/types';
  import type { FileDNA } from '@/src/features/archive/model';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import BlurUpThumbnail from './BlurUpThumbnail.svelte';
  import { cn } from '@/src/shared/lib/cn';

  type GridDensity = 'compact' | 'comfortable' | 'spacious';

  interface Props {
    asset: IIIFCanvas;
    selected: boolean;
    isFocused: boolean;
    isDragging: boolean;
    isDropTarget: boolean;
    dna: FileDNA;
    thumbUrl: string;
    lowResUrl: string;
    fallbackIcon: string;
    density: GridDensity;
    reorderEnabled: boolean;
    fieldMode: boolean;
    cx: { [key: string]: string | undefined };
    issues?: TreeValidationIssue[];
    onToggleSelect?: (id: string) => void;
    onBadgeTooltip: (tooltip: { text: string; x: number; y: number } | null) => void;
  }

  let {
    asset,
    selected,
    isFocused,
    isDragging,
    isDropTarget,
    dna,
    thumbUrl,
    lowResUrl,
    fallbackIcon,
    density,
    reorderEnabled,
    fieldMode,
    cx,
    issues,
    onToggleSelect,
    onBadgeTooltip,
  }: Props = $props();

  const PADDING_CLASSES: Record<GridDensity, string> = {
    compact: 'p-1',
    comfortable: 'p-2',
    spacious: 'p-3',
  };
</script>

<div
  class={cn(
    'group relative transition-nb outline-none',
    PADDING_CLASSES[density],
    reorderEnabled ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
    isDragging && 'opacity-50 scale-95',
    isDropTarget && (
      fieldMode
        ? 'ring-2 ring-nb-yellow ring-offset-2 ring-offset-black'
        : 'ring-2 ring-nb-blue ring-offset-2'
    ),
    isFocused && !isDropTarget && (
      fieldMode
        ? 'ring-2 ring-offset-1 ring-nb-yellow'
        : 'ring-2 ring-offset-1 ring-nb-blue'
    ),
    selected
      ? 'bg-nb-orange/20 border-2 border-nb-orange shadow-brutal-sm'
      : 'bg-nb-black border border-nb-black/20 hover:shadow-brutal hover:border-nb-black/20'
  )}
>
  <!-- Thumbnail area -->
  <div class="aspect-square overflow-hidden flex items-center justify-center mb-2 relative bg-nb-black">
    {#if selected}
      <div class="absolute inset-0 bg-nb-orange/10 z-10 pointer-events-none"></div>
    {/if}

    {#if issues}
      <div class="absolute top-2 left-2 z-20" title={`${issues.length} issue(s)`}>
        <div class={cn(
          'w-2.5 h-2.5 rounded-full shadow-brutal-sm',
          issues.some(i => i.severity === 'error') ? 'bg-nb-red' : 'bg-nb-orange'
        )}></div>
      </div>
    {/if}

    <Button
      variant="ghost"
      size="bare"
      onclick={(e) => { e.stopPropagation(); onToggleSelect?.(asset.id); }}
      class={cn(
        'absolute top-2 right-2 z-20 w-6 h-6 flex items-center justify-center transition-nb shadow-brutal-sm cursor-pointer',
        selected
          ? fieldMode
            ? 'bg-nb-yellow text-white scale-100'
            : 'bg-nb-orange text-white scale-100'
          : 'bg-nb-white/90 text-nb-black/40 scale-0 group-hover:scale-100 hover:bg-nb-cream'
      )}
      title={selected ? 'Deselect' : 'Select (add to selection)'}
    >
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
      </svg>
    </Button>

    <BlurUpThumbnail
      lowResUrl={lowResUrl}
      highResUrl={thumbUrl}
      fallbackIcon={fallbackIcon}
      {cx}
      {fieldMode}
    />

    <!-- Metadata badges -->
    <div class="absolute bottom-2 right-2 flex gap-1">
      {#if dna.hasTime}
        <Button
          variant="ghost" size="bare"
          class="w-5 h-5 bg-nb-orange text-white flex items-center justify-center shadow-brutal-sm hover:bg-nb-orange transition-nb"
          onmouseenter={(e: MouseEvent) => { onBadgeTooltip({ text: 'Has date/time metadata', x: e.clientX, y: e.clientY }); }}
          onmouseleave={() => { onBadgeTooltip(null); }}
          title="Has Time metadata"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Button>
      {/if}
      {#if dna.hasLocation}
        <Button
          variant="ghost" size="bare"
          class="w-5 h-5 bg-nb-green text-white flex items-center justify-center shadow-brutal-sm hover:bg-nb-green transition-nb"
          onmouseenter={(e: MouseEvent) => { onBadgeTooltip({ text: 'Has GPS location data', x: e.clientX, y: e.clientY }); }}
          onmouseleave={() => { onBadgeTooltip(null); }}
          title="Has GPS metadata"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
        </Button>
      {/if}
      {#if dna.hasDevice}
        <Button
          variant="ghost" size="bare"
          class="w-5 h-5 bg-sky-500 text-white flex items-center justify-center shadow-brutal-sm hover:bg-sky-600 transition-nb"
          onmouseenter={(e: MouseEvent) => { onBadgeTooltip({ text: 'Has camera/device info', x: e.clientX, y: e.clientY }); }}
          onmouseleave={() => { onBadgeTooltip(null); }}
          title="Has Device metadata"
        >
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </Button>
      {/if}
      {#if asset.rights}
        <Button
          variant="ghost" size="bare"
          class="w-5 h-5 bg-nb-purple text-white flex items-center justify-center shadow-brutal-sm hover:bg-nb-purple/80 transition-nb"
          onmouseenter={(e: MouseEvent) => { onBadgeTooltip({ text: `Rights: ${asset.rights}`, x: e.clientX, y: e.clientY }); }}
          onmouseleave={() => { onBadgeTooltip(null); }}
          title={`Rights: ${asset.rights}`}
        >
          <Icon name="copyright" class="text-[10px]" />
        </Button>
      {/if}
    </div>
  </div>

  <!-- Filename label -->
  <div class="px-1 min-w-0 h-6 flex items-center">
    <div class="text-nb-xs font-medium truncate text-nb-black" title={getIIIFValue(asset.label)}>
      {getIIIFValue(asset.label)}
    </div>
  </div>
</div>
