<script lang="ts">
  import type { ContextualClassNames } from './ViewHeader/types';

  export interface TimelineItem {
    id: string;
    title: string;
    type: string;
    thumbnail?: string;
    timestamp: string;
  }

  interface Props {
    timestamp: string;
    label: string;
    items: TimelineItem[];
    position: number;
    onSelectItem: (id: string) => void;
    selected?: boolean;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    timestamp: _timestamp,
    label,
    items,
    position,
    onSelectItem,
    selected = false,
    size = 'md',
    disabled = false,
    cx,
    fieldMode: _fieldMode,
  }: Props = $props();

  let isHovered = $state(false);
  let isExpanded = $state(false);

  const count = $derived(items.length);

  const sizeConfig = {
    sm: { dot: 'w-2 h-2', label: 'text-[10px]', badge: 'text-[8px]' },
    md: { dot: 'w-3 h-3', label: 'text-xs', badge: 'text-[10px]' },
    lg: { dot: 'w-4 h-4', label: 'text-sm', badge: 'text-xs' },
  };

  // Intensity thresholds for color: > 10 items = high, > 3 = med, else low
  const intensity = $derived(
    count > 10 ? 'bg-nb-red' : count > 3 ? 'bg-nb-blue' : 'bg-nb-black/50'
  );

  const config = $derived(sizeConfig[size]);

  function handleTickClick() {
    if (count === 1) {
      onSelectItem(items[0].id);
    } else {
      isExpanded = !isExpanded;
    }
  }
</script>

<div
  class="absolute flex flex-col items-center"
  style={`left: ${position * 100}%`}
  onmouseenter={() => { isHovered = true; }}
  onmouseleave={() => { isHovered = false; }}
>
  <!-- Label above tick -->
  <span class={`${config.label} ${cx.textMuted ?? 'text-nb-black/40'} whitespace-nowrap mb-1 transition-nb ${isHovered || selected ? 'opacity-100' : 'opacity-60'}`}>
    {label}
  </span>

  <!-- Tick dot -->
  <button
    onclick={handleTickClick}
    {disabled}
    class={`
      ${config.dot} relative transition-nb p-0
      ${intensity}
      ${selected ? 'ring-2 ring-offset-2 ring-current scale-150' : 'hover:scale-125'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      ${isHovered ? 'shadow-brutal' : ''}
    `}
    aria-label={`${label}: ${count} items`}
    aria-expanded={isExpanded}
  >
    <!-- Count badge for multiple items -->
    {#if count > 1}
      <span class={`absolute -top-2 -right-2 min-w-[14px] h-3.5 px-1 bg-current text-white font-bold flex items-center justify-center ${config.badge}`}>
        {count > 9 ? '9+' : count}
      </span>
    {/if}
  </button>

  <!-- Expanded item popup -->
  {#if isExpanded && count > 1}
    <div class={`absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 shadow-brutal border ${cx.border ?? 'border-nb-black/20'} ${cx.surface ?? 'bg-nb-white'} z-50 overflow-hidden`}>
      <!-- Header -->
      <div class={`px-3 py-2 border-b ${cx.border ?? 'border-nb-black/20'} ${cx.headerBg ?? 'bg-nb-cream'} flex justify-between items-center`}>
        <span class={`text-sm font-medium ${cx.text ?? 'text-nb-black'}`}>{label} ({count} items)</span>
        <button onclick={() => { isExpanded = false; }} class="p-1 hover:opacity-70" aria-label="Close">
          <span class={`material-icons text-sm ${cx.textMuted ?? 'text-nb-black/40'}`}>close</span>
        </button>
      </div>

      <!-- Item list -->
      <div class="p-2 space-y-1 max-h-48 overflow-auto">
        {#each items as item}
          <button
            onclick={() => { onSelectItem(item.id); isExpanded = false; }}
            class={`w-full flex items-center gap-2 p-2 text-left transition-nb hover:${cx.headerBg ?? 'bg-nb-cream'}`}
          >
            {#if item.thumbnail}
              <img src={item.thumbnail} alt="" class="w-8 h-8 object-cover" />
            {:else}
              <div class={`w-8 h-8 flex items-center justify-center ${cx.headerBg ?? 'bg-nb-cream'}`}>
                <span class={`material-icons text-sm ${cx.textMuted ?? 'text-nb-black/40'}`}>image</span>
              </div>
            {/if}
            <div class="flex-1 min-w-0">
              <p class={`text-sm truncate ${cx.text ?? 'text-nb-black'}`}>{item.title}</p>
              <p class={`text-xs ${cx.textMuted ?? 'text-nb-black/40'}`}>{item.type}</p>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
