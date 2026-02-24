<!--
  ComparisonModeSelector -- Mode selector toolbar for ComparisonViewer

  LAYER: atom
  FSD: features/viewer/ui/atoms

  Mode buttons (side-by-side, overlay, curtain), opacity slider,
  sync toggle, and close button for the comparison viewer.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import IconButton from '@/src/shared/ui/molecules/IconButton.svelte';
  import type { ComparisonMode } from '../../model/comparison.svelte';

  interface Props {
    mode: ComparisonMode;
    overlayOpacity: number;
    syncViewports: boolean;
    primaryLabel: string;
    secondLabel: string;
    onModeChange: (mode: ComparisonMode) => void;
    onOpacityChange: (e: Event) => void;
    onToggleSync: () => void;
    onClose: () => void;
    fieldMode?: boolean;
  }

  let {
    mode,
    overlayOpacity,
    syncViewports,
    primaryLabel,
    secondLabel,
    onModeChange,
    onOpacityChange,
    onToggleSync,
    onClose,
    fieldMode = false,
  }: Props = $props();

  let accentColor = $derived(fieldMode ? 'text-nb-yellow' : 'text-nb-blue');
</script>

<!-- Comparison toolbar -->
<div class={cn(
  'h-10 flex items-center justify-between px-3 border-b shrink-0',
  fieldMode ? 'bg-nb-black/95 border-nb-yellow/20' : 'bg-nb-white border-nb-black/10'
)}>
  <div class="flex items-center gap-3">
    <span class={cn('text-xs font-semibold', accentColor)}>
      <Icon name="compare" class="text-sm mr-1" />
      Compare
    </span>
    <div class="flex items-center gap-1">
      <IconButton icon="view_column" label="Side by side" onclick={() => onModeChange('side-by-side')}
        size="sm" class={cn(mode === 'side-by-side' && 'bg-nb-blue/20')} />
      <IconButton icon="layers" label="Overlay" onclick={() => onModeChange('overlay')}
        size="sm" class={cn(mode === 'overlay' && 'bg-nb-blue/20')} />
      <IconButton icon="vertical_split" label="Curtain" onclick={() => onModeChange('curtain')}
        size="sm" class={cn(mode === 'curtain' && 'bg-nb-blue/20')} />
    </div>
  </div>

  <div class="flex items-center gap-2">
    {#if mode === 'overlay'}
      <!-- eslint-disable-next-line @field-studio/no-native-html-in-molecules -- atom: native range input for opacity -->
      <div class="flex items-center gap-1.5">
        <span class={cn('text-[10px]', fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40')}>Opacity</span>
        <input type="range" min="0" max="100" value={Math.round(overlayOpacity * 100)} oninput={onOpacityChange} class="w-20 h-1 accent-current" />
        <span class={cn('text-[10px] font-mono w-7', fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40')}>{Math.round(overlayOpacity * 100)}%</span>
      </div>
    {/if}
    <Button variant={syncViewports ? 'primary' : 'ghost'} size="sm" onclick={onToggleSync}>
      <Icon name="sync" class="text-xs mr-0.5" /><span class="text-[10px]">Sync</span>
    </Button>
    <Button variant="ghost" size="sm" onclick={onClose}>
      <Icon name="close" class="text-sm" />
    </Button>
  </div>
</div>

<!-- Canvas labels -->
<div class={cn(
  'flex items-center justify-between px-3 py-1 text-[10px] font-mono',
  fieldMode ? 'bg-nb-black/80 text-nb-yellow/50' : 'bg-nb-black/5 text-nb-black/40'
)}>
  <span>A: {primaryLabel}</span>
  <span>B: {secondLabel}</span>
</div>
