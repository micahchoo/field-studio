<!--
  RenderingDownloadMenu — Menu for downloading alternate renderings

  ORIGINAL: src/features/viewer/ui/atoms/RenderingDownloadMenu.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Dropdown/popover with rendering list. Each triggers download link.
  Renders nothing when items list is empty.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface RenderingItem {
    id: string;
    label?: string;
    format?: string;
  }

  interface Props {
    /** Available rendering links */
    renderings: RenderingItem[];
    /** Field mode styling */
    fieldMode?: boolean;
  }

  let {
    renderings,
    fieldMode = false,
  }: Props = $props();

  let open = $state(false);
  let menuEl: HTMLDivElement | undefined = $state(undefined);

  const FORMAT_LABELS: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/epub+zip': 'EPUB',
    'text/plain': 'Plain Text',
    'text/html': 'HTML',
    'application/xml': 'XML',
  };

  function getLabel(item: RenderingItem): string {
    return item.label || FORMAT_LABELS[item.format || ''] || item.format || 'Download';
  }

  function handleClickOutside(e: MouseEvent) {
    if (menuEl && !menuEl.contains(e.target as Node)) {
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

{#if renderings.length > 0}
  <div bind:this={menuEl} class="relative">
    <button
      class={cn(
        'p-1.5 transition-nb border',
        fieldMode
          ? 'border-nb-yellow/40 text-nb-yellow hover:bg-nb-yellow hover:text-nb-black'
          : 'border-nb-black/20 text-nb-black hover:bg-nb-black hover:text-nb-white'
      )}
      onclick={() => { open = !open; }}
      title="Download options"
      aria-label="Download options"
      aria-expanded={open}
      aria-haspopup="menu"
    >
      <span class="material-icons text-lg">download</span>
    </button>

    {#if open}
      <div class={cn(
        'absolute right-0 top-full mt-1 z-30 min-w-[200px] shadow-brutal border py-1',
        fieldMode
          ? 'bg-nb-black border-nb-black/80'
          : 'bg-nb-white border-nb-black/20'
      )} role="menu">
        <div class={cn(
          'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider',
          fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'
        )}>
          Downloads
        </div>
        {#each renderings as item (item.id)}
          <a
            href={item.id}
            download
            target="_blank"
            rel="noopener noreferrer"
            onclick={() => { open = false; }}
            class={cn(
              'flex items-center gap-2 px-3 py-2 text-sm transition-nb',
              fieldMode
                ? 'text-nb-black/30 hover:bg-nb-black'
                : 'text-nb-black/60 hover:bg-nb-white'
            )}
            role="menuitem"
            aria-label="Download {getLabel(item)}"
          >
            <span class="material-icons text-base">description</span>
            <span class="flex-1">{getLabel(item)}</span>
            {#if item.format}
              <span class={cn('text-[10px]', fieldMode ? 'text-nb-black/60' : 'text-nb-black/40')}>
                {FORMAT_LABELS[item.format] || item.format}
              </span>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </div>
{/if}
