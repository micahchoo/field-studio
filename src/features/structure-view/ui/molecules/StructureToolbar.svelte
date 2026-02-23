<!--
  StructureToolbar.svelte — Expand/collapse toolbar with overflow menu
  React source: StructureToolbar.tsx (150L)
  Local state: showMenu dropdown toggle
-->
<script lang="ts">
  import Button from '@/src/shared/ui/atoms/Button.svelte';

  interface Props {
    totalNodes: number;
    selectedCount: number;
    onExpandAll: () => void;
    onCollapseAll: () => void;
    onClearSelection: () => void;
    abstractionLevel?: 'simple' | 'standard' | 'advanced';
    class?: string;
  }

  let {
    totalNodes,
    selectedCount,
    onExpandAll,
    onCollapseAll,
    onClearSelection,
    abstractionLevel = 'standard',
    class: className = '',
  }: Props = $props();

  let showMenu = $state(false);
  const isSimple = $derived(abstractionLevel === 'simple');
</script>

{#if isSimple}
  <div
    class="flex items-center justify-between px-4 py-3 border-b border-nb-black/20 bg-nb-black/50 {className}"
  >
    <span class="text-sm text-nb-black/50 font-serif">
      {totalNodes} {totalNodes === 1 ? 'item' : 'items'}
    </span>
    {#if selectedCount > 0}
      <Button variant="ghost" size="bare"
        type="button"
        onclick={onClearSelection}
        class="text-sm text-nb-orange hover:text-nb-orange font-medium transition-nb"
      >
        Clear selection
      </Button>
    {/if}
  </div>
{:else}
  <div
    class="flex items-center justify-between px-4 py-3 border-b border-nb-black/20 bg-nb-black/50 {className}"
  >
    <!-- Left: View options in overflow menu -->
    <div class="relative">
      <Button variant="ghost" size="bare"
        type="button"
        onclick={() => { showMenu = !showMenu; }}
        class="flex items-center gap-2 px-3 py-1.5 text-sm text-nb-black/40 hover:bg-nb-cream transition-nb"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>View</span>
      </Button>

      {#if showMenu}
        <!-- Backdrop -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="fixed inset-0 z-10"
          onclick={() => { showMenu = false; }}
          onkeydown={() => {}}
        ></div>
        <div class="absolute top-full left-0 mt-1 w-48 bg-nb-black shadow-brutal border border-nb-black/20 py-1 z-20">
          <Button variant="ghost" size="bare"
            type="button"
            onclick={() => { onExpandAll(); showMenu = false; }}
            class="w-full px-4 py-2 text-left text-sm text-nb-black/20 hover:bg-nb-cream transition-nb"
          >
            Expand all
          </Button>
          <Button variant="ghost" size="bare"
            type="button"
            onclick={() => { onCollapseAll(); showMenu = false; }}
            class="w-full px-4 py-2 text-left text-sm text-nb-black/20 hover:bg-nb-cream transition-nb"
          >
            Collapse all
          </Button>
        </div>
      {/if}
    </div>

    <!-- Right: Selection info -->
    <div class="flex items-center gap-4">
      <span class="text-sm text-nb-black/50 font-serif">
        {totalNodes} {totalNodes === 1 ? 'item' : 'items'}
      </span>
      {#if selectedCount > 0}
        <div class="flex items-center gap-3">
          <span class="px-2.5 py-1 text-sm font-medium text-nb-orange/40 bg-nb-orange/20">
            {selectedCount} selected
          </span>
          <Button variant="ghost" size="bare"
            type="button"
            onclick={onClearSelection}
            class="text-sm text-nb-black/50 hover:text-nb-orange transition-nb"
          >
            Clear
          </Button>
        </div>
      {/if}
    </div>
  </div>
{/if}
