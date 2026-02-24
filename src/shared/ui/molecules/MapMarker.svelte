<script lang="ts">
  import type { ContextualClassNames } from './ViewHeader/types';

  interface Props {
    id: string;
    lat: number;
    lng: number;
    title: string;
    type: string;
    thumbnail?: string;
    selected?: boolean;
    onSelect: (id: string) => void;
    count?: number;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    id,
    lat: _lat,
    lng: _lng,
    title,
    type,
    thumbnail,
    selected = false,
    onSelect,
    count = 1,
    size = 'md',
    disabled = false,
    cx,
    fieldMode: _fieldMode,
  }: Props = $props();

  let isHovered = $state(false);
  let imageError = $state(false);

  const sizeConfig = {
    sm: { marker: 'w-6 h-6', icon: 'text-xs', badge: 'text-[8px]' },
    md: { marker: 'w-8 h-8', icon: 'text-sm', badge: 'text-xs' },
    lg: { marker: 'w-10 h-10', icon: 'text-base', badge: 'text-xs' },
  };

  // Map type to color — simple static mapping
  const TYPE_COLORS: Record<string, string> = {
    Canvas: 'bg-nb-blue',
    Manifest: 'bg-nb-green',
    Collection: 'bg-nb-yellow',
  };

  const config = $derived(sizeConfig[size]);
  const markerColor = $derived(TYPE_COLORS[type] ?? 'bg-nb-black/70');
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -- tooltip-only hover; the inner <button> handles the actual interaction -->
<div
  class="relative group"
  style="position: absolute; transform: translate(-50%, -50%);"
  onmouseenter={() => { isHovered = true; }}
  onmouseleave={() => { isHovered = false; }}
>
  <!-- Tooltip on hover -->
  {#if isHovered}
    <div class={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 shadow-brutal whitespace-nowrap z-50 ${cx.surface ?? 'bg-nb-white'} ${cx.text ?? 'text-nb-black'} text-xs`}>
      {title}
      <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-current"></div>
    </div>
  {/if}

  <!-- Marker -->
  <button
    onclick={() => { if (!disabled) onSelect(id); }}
    {disabled}
    class={`
      ${config.marker} flex items-center justify-center relative
      transition-nb cursor-pointer p-0
      ${selected ? 'ring-2 ring-offset-2 ring-current scale-110' : 'hover:scale-105'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${markerColor} text-white shadow-brutal
    `}
    aria-label={`${title} (${type})`}
  >
    {#if thumbnail && !imageError && count === 1}
      <img src={thumbnail} alt="" class="w-full h-full object-cover" onerror={() => { imageError = true; }} />
    {:else}
      <span class={`material-icons ${config.icon}`}>{count > 1 ? 'layers' : 'place'}</span>
    {/if}

    <!-- Count badge for clusters -->
    {#if count > 1}
      <span class={`absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-nb-red text-white font-bold flex items-center justify-center ${config.badge}`}>
        {count}
      </span>
    {/if}
  </button>

  <!-- Selection indicator pulse -->
  {#if selected}
    <span class={`absolute inset-0 animate-ping opacity-75 ${markerColor}`}></span>
  {/if}
</div>
