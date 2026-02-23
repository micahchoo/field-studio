<script lang="ts">
  import type { ContextualClassNames } from './ViewHeader/types';

  export interface ClusterItem {
    id: string;
    title: string;
    type: string;
    thumbnail?: string;
  }

  interface Props {
    count: number;
    items?: ClusterItem[];
    onExpand?: () => void;
    onSelectItem?: (id: string) => void;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    disabled?: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    count,
    items = [],
    onExpand,
    onSelectItem,
    size = 'md',
    disabled = false,
    cx,
    fieldMode: _fieldMode,
  }: Props = $props();

  let isExpanded = $state(false);

  const sizeConfig = {
    sm: { badge: 'w-8 h-8 text-xs', expanded: 'w-48' },
    md: { badge: 'w-10 h-10 text-sm', expanded: 'w-56' },
    lg: { badge: 'w-12 h-12 text-base', expanded: 'w-64' },
    xl: { badge: 'w-14 h-14 text-lg', expanded: 'w-72' },
  };

  const intensityMap: Record<string, string> = {
    sm: 'bg-nb-blue/60',
    md: 'bg-nb-blue/80',
    lg: 'bg-nb-blue',
    xl: 'bg-nb-blue',
    default: 'bg-nb-blue/70',
  };

  const config = $derived(sizeConfig[size]);
  const intensity = $derived(intensityMap[size] ?? intensityMap.default);

  function handleClick() {
    if (items.length > 0 && onSelectItem) {
      isExpanded = !isExpanded;
    } else if (onExpand) {
      onExpand();
    }
  }
</script>

<div class="relative">
  <!-- Cluster badge button -->
  <button
    onclick={handleClick}
    {disabled}
    class={`
      ${config.badge} flex items-center justify-center
      font-bold text-white shadow-brutal transition-nb
      ${intensity}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
      ${isExpanded ? 'ring-4 ring-offset-2 ring-current' : ''}
    `}
    aria-label={`${count} items in cluster`}
  >
    {count > 99 ? '99+' : count}
  </button>

  <!-- Expanded item preview -->
  {#if isExpanded && items.length > 0}
    <div class={`
      absolute top-full left-1/2 -translate-x-1/2 mt-2
      ${config.expanded} max-h-64 overflow-auto
      shadow-brutal border ${cx.border ?? 'border-nb-black/20'} ${cx.surface ?? 'bg-nb-white'}
      z-50
    `}>
      <!-- Header -->
      <div class={`sticky top-0 px-3 py-2 border-b ${cx.border ?? 'border-nb-black/20'} ${cx.headerBg ?? 'bg-nb-cream'} flex justify-between items-center`}>
        <span class={`text-sm font-medium ${cx.text ?? 'text-nb-black'}`}>{count} items</span>
        <button onclick={() => { isExpanded = false; }} class="p-1 hover:opacity-70" aria-label="Close">
          <span class={`material-icons text-sm ${cx.textMuted ?? 'text-nb-black/40'}`}>close</span>
        </button>
      </div>

      <!-- Item list -->
      <div class="p-2 space-y-1">
        {#each items.slice(0, 5) as item}
          <button
            onclick={() => { onSelectItem?.(item.id); isExpanded = false; }}
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

        {#if count > 5}
          <p class={`text-center text-xs ${cx.textMuted ?? 'text-nb-black/40'} py-2`}>and {count - 5} more...</p>
        {/if}
      </div>

      <!-- Expand button -->
      {#if onExpand}
        <div class={`p-2 border-t ${cx.border ?? 'border-nb-black/20'}`}>
          <button
            onclick={() => { onExpand?.(); isExpanded = false; }}
            class="w-full text-sm py-1.5 px-3 border hover:opacity-80"
          >
            Zoom to cluster
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
