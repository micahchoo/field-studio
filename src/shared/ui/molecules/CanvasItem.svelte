<script lang="ts">
  import type { ContextualClassNames } from './ViewHeader/types';

  interface Props {
    id: string;
    label: string;
    subtitle?: string;
    thumbnailUrl?: string | null;
    index: number;
    isSelected?: boolean;
    isDragTarget?: boolean;
    isDragging?: boolean;
    class?: string;
    onSelect?: (e: MouseEvent) => void;
    onDoubleClick?: () => void;
    navId?: string;
    tabIndex?: number;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    id,
    label,
    subtitle,
    thumbnailUrl,
    index,
    isSelected = false,
    isDragTarget = false,
    isDragging = false,
    class: className = '',
    onSelect,
    onDoubleClick,
    navId,
    tabIndex = -1,
    cx,
    fieldMode: _fieldMode,
  }: Props = $props();

  let imageError = $state(false);

  $effect(() => {
    // Reset error when thumbnailUrl changes
    thumbnailUrl;
    imageError = false;
  });
</script>

<div
  data-canvas-id={id}
  data-nav-id={navId ?? id}
  data-nav-index={index}
  tabindex={tabIndex}
  onclick={onSelect}
  ondblclick={onDoubleClick}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(new MouseEvent("click")); } }}
  role="option"
  aria-selected={isSelected}
  class={`
    group relative flex items-center gap-3 p-2 cursor-pointer transition-nb
    ${isSelected
      ? 'bg-nb-blue/20 border-2 border-nb-blue shadow-brutal-sm'
      : `border ${cx?.surface ?? 'bg-nb-white border-nb-black/20'} hover:shadow-brutal-sm`
    }
    ${isDragTarget ? 'border-nb-blue border-dashed bg-nb-blue/10' : ''}
    ${isDragging ? 'opacity-50' : ''}
    ${className}
  `}
>
  <!-- Index badge -->
  <span class={`flex-shrink-0 w-7 h-7 ${cx?.subtleBg ?? 'bg-nb-cream'} text-[11px] font-bold ${cx?.textMuted ?? 'text-nb-black/50'} flex items-center justify-center`}>
    {index + 1}
  </span>

  <!-- Thumbnail -->
  <div class={`flex-shrink-0 w-12 h-12 ${cx?.thumbnailBg ?? 'bg-nb-cream'} overflow-hidden flex items-center justify-center`}>
    {#if thumbnailUrl && !imageError}
      <img
        src={thumbnailUrl}
        alt={label}
        class="w-full h-full object-cover"
        onerror={() => { imageError = true; }}
        loading="lazy"
      />
    {:else}
      <span class={`material-icons text-xl ${cx?.placeholderIcon ?? 'text-nb-black/40'}`}>image</span>
    {/if}
  </div>

  <!-- Label -->
  <div class="flex-1 min-w-0">
    <div class={`text-sm font-medium ${cx?.subtleText ?? 'text-nb-black/80'} truncate`} title={label}>{label}</div>
    {#if subtitle}
      <div class="text-[11px] text-nb-black/40 truncate">{subtitle}</div>
    {/if}
  </div>

  <!-- Selection indicator -->
  {#if isSelected}
    <div class="flex-shrink-0">
      <span class="material-icons text-nb-blue text-lg">check_circle</span>
    </div>
  {/if}
</div>
