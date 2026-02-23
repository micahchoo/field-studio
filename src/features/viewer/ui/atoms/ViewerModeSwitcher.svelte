<!--
  ViewerModeSwitcher — Segmented control: paged/continuous/individuals

  ORIGINAL: src/features/viewer/ui/atoms/ViewerModeSwitcher.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Three-mode toggle group with Material icons for each mode.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  type ViewingLayout = 'individuals' | 'continuous' | 'paged';

  interface Props {
    /** Current viewing mode */
    mode: ViewingLayout;
    /** Called when mode changes */
    onChange: (mode: ViewingLayout) => void;
    /** Default mode from manifest hint */
    defaultMode?: ViewingLayout;
    /** Field mode styling */
    fieldMode?: boolean;
  }

  let {
    mode,
    onChange,
    defaultMode,
    fieldMode = false,
  }: Props = $props();

  const MODE_OPTIONS: Array<{
    value: ViewingLayout;
    icon: string;
    label: string;
    title: string;
  }> = [
    { value: 'individuals', icon: 'view_carousel', label: 'Single', title: 'Individual pages' },
    { value: 'continuous',  icon: 'view_day',      label: 'Scroll',  title: 'Continuous strip' },
    { value: 'paged',       icon: 'menu_book',     label: 'Book',    title: 'Paged spread' },
  ];
</script>

<div
  class={cn(
    'inline-flex border',
    fieldMode ? 'border-nb-black/80 bg-nb-black' : 'border-nb-black/20 bg-nb-white'
  )}
  role="radiogroup"
  aria-label="Viewer mode"
>
  {#each MODE_OPTIONS as opt}
    {@const isActive = mode === opt.value}
    {@const isDefault = defaultMode === opt.value}
    <button
      role="radio"
      aria-checked={isActive}
      title="{opt.title}{isDefault ? ' (manifest default)' : ''}"
      onclick={() => onChange(opt.value)}
      class={cn(
        'flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-nb first:rounded-l-lg last:rounded-r-lg',
        isActive
          ? fieldMode
            ? 'bg-nb-yellow/20 text-nb-yellow border-nb-yellow'
            : 'bg-nb-blue/10 text-nb-blue'
          : fieldMode
            ? 'text-nb-black/40 hover:bg-nb-black/80'
            : 'text-nb-black/50 hover:bg-nb-cream'
      )}
      aria-label="{opt.title}"
    >
      <span class="material-icons text-sm">{opt.icon}</span>
      <span>{opt.label}</span>
      {#if isDefault && !isActive}
        <span
          class={cn('w-1.5 h-1.5', fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue/40')}
          title="Manifest default"
        ></span>
      {/if}
    </button>
  {/each}
</div>
