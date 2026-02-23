<script lang="ts">
  import type { ContextualClassNames } from './ViewHeader/types';

  interface Props {
    urls: string[];
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    class?: string;
    icon?: string;
    placeholderBg?: string;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    urls,
    size = 'md',
    class: className = '',
    icon = 'image',
    placeholderBg,
    cx,
    fieldMode: _fieldMode,
  }: Props = $props();

  const containerSizes: Record<string, string> = {
    xs: 'w-6 h-6 rounded',
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-full h-full',
    xl: 'w-40 h-40',
  };

  let failedUrls = $state<Set<string>>(new Set());

  function handleImageError(url: string) {
    failedUrls = new Set([...failedUrls, url]);
  }

  const bgClass = $derived(placeholderBg ?? cx?.subtleBg ?? 'bg-nb-cream');
  const iconColor = $derived(cx?.textMuted ?? 'text-nb-black/30');
  const borderClass = $derived(cx?.border ?? 'border-nb-black/20');
  const containerSize = $derived(containerSizes[size]);
  const validUrls = $derived(urls.filter(u => u && !failedUrls.has(u)));
  const urlCount = $derived(validUrls.length);
</script>

{#if urlCount === 0}
  <div class={`${containerSize} ${bgClass} flex items-center justify-center shrink-0 overflow-hidden border ${borderClass} ${className}`}>
    <span class={`material-icons ${iconColor}`}>{icon}</span>
  </div>
{:else if urlCount === 1}
  <div class={`${containerSize} bg-nb-black shrink-0 overflow-hidden border ${borderClass} ${className}`}>
    <img
      src={validUrls[0]}
      alt=""
      class="w-full h-full object-cover"
      loading="lazy"
      onerror={() => handleImageError(validUrls[0])}
    />
  </div>
{:else}
  <div class={`${containerSize} ${cx?.separator ?? 'bg-nb-cream'} shrink-0 overflow-hidden ${borderClass} grid grid-cols-2 grid-rows-2 gap-0.5 ${className}`}>
    {#each validUrls.slice(0, 4) as url, i}
      <div
        class={`bg-nb-black
          ${urlCount === 2 ? 'col-span-1 row-span-2' : ''}
          ${urlCount === 3 && i === 0 ? 'col-span-2 row-span-1' : ''}
        `}
      >
        <img src={url} alt="" class="w-full h-full object-cover" loading="lazy" onerror={() => handleImageError(url)} />
      </div>
    {/each}
    {#if urlCount === 3}
      <div class={`${cx?.subtleBg ?? 'bg-nb-black'} flex items-center justify-center`}>
        <span class={`material-icons text-[10px] ${cx?.textMuted ?? 'text-nb-black/50'}`}>{icon}</span>
      </div>
    {/if}
  </div>
{/if}
