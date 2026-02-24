<script lang="ts">
  import type { ContextualClassNames } from './ViewHeader/types';

  interface Props {
    id: string;
    title: string;
    type: string;
    thumbnail?: string;
    metadata?: Record<string, string>;
    selected?: boolean;
    onSelect: (id: string) => void;
    highlightTerms?: string[];
    date?: string;
    loading?: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    id,
    title,
    type,
    thumbnail,
    metadata,
    selected = false,
    onSelect,
    highlightTerms = [],
    date,
    loading = false,
    cx,
    fieldMode: _fieldMode,
  }: Props = $props();

  let imageError = $state(false);

  /**
   * Simple highlight: split text by matching terms and wrap matches in <mark>.
   * Returns an array of {text, highlight} segments.
   */
  function buildSegments(text: string): Array<{ text: string; highlight: boolean }> {
    if (!highlightTerms.length) return [{ text, highlight: false }];
    const pattern = new RegExp(`(${highlightTerms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(pattern);
    return parts.map(part => ({
      text: part,
      highlight: highlightTerms.some(t => part.toLowerCase() === t.toLowerCase()),
    }));
  }

  const titleSegments = $derived(buildSegments(title));
</script>

{#if loading}
  <div class={`border ${cx.border ?? 'border-nb-black/20'} ${cx.surface ?? 'bg-nb-white'} p-4 animate-pulse`}>
    <div class={`h-32 ${cx.headerBg ?? 'bg-nb-cream'} mb-3`}></div>
    <div class={`h-4 ${cx.headerBg ?? 'bg-nb-cream'} w-3/4 mb-2`}></div>
    <div class={`h-3 ${cx.headerBg ?? 'bg-nb-cream'} w-1/2`}></div>
  </div>
{:else}
  <div
    onclick={() => onSelect(id)}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(id); } }}
    class={`
      group relative border overflow-hidden
      transition-nb cursor-pointer
      ${selected
        ? `${cx.accent ?? 'bg-nb-blue'} border-current ring-2 ring-current ring-opacity-50`
        : `${cx.surface ?? 'bg-nb-white'} ${cx.border ?? 'border-nb-black/20'} hover:${cx.headerBg ?? 'bg-nb-cream'}`
      }
    `}
    role="button"
    tabindex="0"
    aria-pressed={selected}
  >
    <!-- Thumbnail -->
    <div class={`aspect-video ${cx.headerBg ?? 'bg-nb-cream'} relative overflow-hidden`}>
      {#if thumbnail && !imageError}
        <img
          src={thumbnail}
          alt=""
          class="w-full h-full object-cover transition-transform group-hover:scale-105"
          onerror={() => { imageError = true; }}
          loading="lazy"
        />
      {:else}
        <div class="w-full h-full flex items-center justify-center">
          <span class={`material-icons text-4xl ${cx.textMuted ?? 'text-nb-black/40'}`}>image_not_supported</span>
        </div>
      {/if}

      <!-- Type badge -->
      <span class={`absolute top-2 left-2 px-2 py-1 text-xs font-medium ${cx.surface ?? 'bg-nb-white'} shadow-brutal-sm ${cx.textMuted ?? 'text-nb-black/40'}`}>
        {type}
      </span>

      <!-- Selection indicator -->
      {#if selected}
        <div class={`absolute top-2 right-2 w-6 h-6 ${cx.accent ?? 'bg-nb-blue'} text-white flex items-center justify-center`}>
          <span class="material-icons text-sm">check</span>
        </div>
      {/if}
    </div>

    <!-- Content -->
    <div class="p-3">
      <h3 class={`font-medium ${cx.text ?? 'text-nb-black'} line-clamp-2`}>
        {#each titleSegments as seg}
          {#if seg.highlight}
            <mark class={`${cx.accent ?? 'bg-nb-blue'} bg-opacity-20 text-inherit font-semibold`}>{seg.text}</mark>
          {:else}
            {seg.text}
          {/if}
        {/each}
      </h3>

      {#if date}
        <p class={`text-xs ${cx.textMuted ?? 'text-nb-black/40'} mt-1`}>{date}</p>
      {/if}

      <!-- Metadata preview -->
      {#if metadata && Object.keys(metadata).length > 0}
        <dl class="mt-2 space-y-1">
          {#each Object.entries(metadata).slice(0, 3) as [key, val]}
            {@const valSegments = buildSegments(String(val))}
            <div class="flex gap-2 text-xs">
              <dt class={`${cx.textMuted ?? 'text-nb-black/40'} min-w-[60px]`}>{key}:</dt>
              <dd class={`${cx.text ?? 'text-nb-black'} truncate`}>
                {#each valSegments as seg}
                  {#if seg.highlight}
                    <mark class={`${cx.accent ?? 'bg-nb-blue'} bg-opacity-20 text-inherit font-semibold`}>{seg.text}</mark>
                  {:else}
                    {seg.text}
                  {/if}
                {/each}
              </dd>
            </div>
          {/each}
        </dl>
      {/if}
    </div>
  </div>
{/if}
