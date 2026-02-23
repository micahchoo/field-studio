<!--
  RangeFilmstrip.svelte — Collapsible Range Thumbnail Strip
  ==========================================================
  React source: src/features/board-design/ui/atoms/RangeFilmstrip.tsx (102 lines)

  Purpose: Shows a collapsible horizontal row of small thumbnails for
  Range child canvases. When collapsed, shows "{N} canvases" toggle button.
  When expanded, shows up to 8 thumbnails with a "+N" overflow indicator.

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.D: Static class strings for toggle colors, thumbnail borders
  - Arch 2.G: Native <button> for collapse toggle
  - findInTree helper walks IIIF resource tree to resolve child canvas thumbnails
  - Composes: Icon atom, Button atom from shared/ui/atoms

  Svelte 5 patterns:
  - {#if}/{:else} for collapsed/expanded states
  - {#each} for thumbnail list (keyed by id)
  - onclick with stopPropagation
  - $derived for toggle class

  @migration: resolveHierarchicalThumb not yet available in svelte-migration.
  When available, import from utils/imageSourceResolver.
-->
<script lang="ts">
  import type { IIIFItem } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  // @migration: stub — resolveHierarchicalThumb
  function resolveHierarchicalThumb(_item: IIIFItem, _size: number): string | null {
    return _item._blobUrl || null;
  }

  // Tree walker to find a canvas by ID within the IIIF resource tree
  function findInTree(node: IIIFItem, targetId: string): IIIFItem | null {
    if (node.id === targetId) return node;
    const children = (node as IIIFItem & { items?: IIIFItem[] }).items;
    if (children) {
      for (const child of children) {
        const found = findInTree(child, targetId);
        if (found) return found;
      }
    }
    return null;
  }

  interface Props {
    childIds: string[];
    collapsed: boolean;
    onToggleCollapse: () => void;
    root: IIIFItem | null;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    childIds,
    collapsed,
    onToggleCollapse,
    root,
    cx: _cx,
    fieldMode,
  }: Props = $props();

  const toggleClass = $derived(
    fieldMode
      ? 'text-cyan-400/60 hover:text-cyan-400'
      : 'text-cyan-600/60 hover:text-cyan-600'
  );

  const thumbBorderClass = $derived(
    fieldMode
      ? 'border-cyan-800 bg-nb-black/80'
      : 'border-cyan-200 bg-nb-cream'
  );

  const placeholderIconClass = $derived(
    fieldMode ? 'text-cyan-400/30' : 'text-cyan-600/20'
  );

  const overflowClass = $derived(
    fieldMode ? 'text-cyan-400/40' : 'text-cyan-600/40'
  );
</script>

{#if childIds.length === 0}
  <!-- nothing -->
{:else if collapsed}
  <button
    onclick={(e: MouseEvent) => { e.stopPropagation(); onToggleCollapse(); }}
    class="flex items-center gap-1 text-[10px] px-1 py-0.5 {toggleClass}"
  >
    <span class="material-symbols-outlined text-xs" aria-hidden="true">expand_more</span>
    {childIds.length} canvases
  </button>
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="mt-1" onclick={(e: MouseEvent) => e.stopPropagation()}>
    <button
      onclick={onToggleCollapse}
      class="flex items-center gap-1 text-[10px] px-1 py-0.5 mb-1 {toggleClass}"
    >
      <span class="material-symbols-outlined text-xs" aria-hidden="true">expand_less</span>
      {childIds.length} canvases
    </button>

    <div class="flex gap-1 overflow-x-auto pb-1">
      {#each childIds.slice(0, 8) as id (id)}
        {@const item = root ? findInTree(root, id) : null}
        {@const thumb = item ? resolveHierarchicalThumb(item, 48) : null}
        <div class="flex-shrink-0 w-12 h-9 border overflow-hidden {thumbBorderClass}">
          {#if thumb}
            <img src={thumb} alt="" class="w-full h-full object-cover" loading="lazy" />
          {:else}
            <div class="w-full h-full flex items-center justify-center">
              <span class="material-symbols-outlined text-[10px] {placeholderIconClass}" aria-hidden="true">image</span>
            </div>
          {/if}
        </div>
      {/each}

      {#if childIds.length > 8}
        <div class="flex-shrink-0 w-12 h-9 flex items-center justify-center text-[10px] {overflowClass}">
          +{childIds.length - 8}
        </div>
      {/if}
    </div>
  </div>
{/if}
