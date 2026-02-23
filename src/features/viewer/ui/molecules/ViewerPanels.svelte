<!--
  ViewerPanels.svelte -- Side panel container for IIIF Content Search
  React source: src/features/viewer/ui/molecules/ViewerPanels.tsx
  Layer: molecule (FSD features/viewer/ui/molecules)

  Fixed right-side drawer panel over the viewer canvas area.
  Contains ViewerSearchPanel. Slides in/out with transition.
  Panel DOM is removed when hidden ({#if}), resetting search state on close.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFManifest } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import { slide } from 'svelte/transition';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import ViewerSearchPanel from './ViewerSearchPanel.svelte';
  import type { SearchResult } from './ViewerSearchPanel.svelte';

  interface SearchService {
    id: string;
    type: string;
  }

  interface Props {
    currentCanvasId?: string;
    manifest: IIIFManifest | null;
    searchService: SearchService | null;
    showSearchPanel: boolean;
    onCloseSearchPanel: () => void;
    onSearchResultSelect?: (result: SearchResult) => void;
    onSearchResultsChange?: (results: SearchResult[]) => void;
    onSearch?: (query: string) => Promise<SearchResult[]>;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    currentCanvasId,
    manifest,
    searchService,
    showSearchPanel,
    onCloseSearchPanel,
    onSearchResultSelect,
    onSearchResultsChange,
    onSearch,
    cx,
    fieldMode,
  }: Props = $props();

  function handleClose() {
    onCloseSearchPanel();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      handleClose();
    }
  }

  function handleSearchResultSelect(result: SearchResult) {
    onSearchResultSelect?.(result);
  }

  function handleSearchResultsChange(results: SearchResult[]) {
    onSearchResultsChange?.(results);
  }

  function handleSearch(query: string) {
    return onSearch?.(query) ?? Promise.resolve([]);
  }
</script>

{#if showSearchPanel}
  <div
    class={cn(
      'absolute right-0 top-0 bottom-0 w-96 z-30',
      'border-l shadow-brutal flex flex-col',
      fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black/20'
    )}
    role="complementary"
    aria-label="Search panel"
    onkeydown={handleKeydown}
    transition:slide={{ axis: 'x', duration: 200 }}
  >
    <!-- Panel Header -->
    <div class={cn(
      'flex items-center justify-between px-4 h-12 border-b shrink-0',
      cx.headerBg,
      fieldMode ? 'border-nb-yellow' : 'border-nb-black/20'
    )}>
      <h3 class={cn(
        'text-sm font-mono uppercase tracking-wide font-bold',
        fieldMode ? 'text-nb-yellow' : 'text-nb-black'
      )}>
        Search
      </h3>
      <Button
        variant="ghost"
        size="bare"
        onclick={handleClose}
        aria-label="Close search panel"
      >
        {#snippet children()}
          <Icon name="close" class="text-base" />
        {/snippet}
      </Button>
    </div>

    <!-- Panel Body -->
    <div class="flex-1 overflow-y-auto">
      {#if manifest}
        <ViewerSearchPanel
          {manifest}
          {searchService}
          onResultSelect={handleSearchResultSelect}
          onResultsChange={handleSearchResultsChange}
          {currentCanvasId}
          {cx}
          {fieldMode}
          onSearch={handleSearch}
        />
      {/if}
    </div>
  </div>
{/if}
