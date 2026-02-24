<!--
  GeoEditorToolbar -- Search bar, draw tool buttons, and search results dropdown.
  Extracted from GeoEditor molecule.
  Architecture: Atom (composes Button + Icon)
-->
<script lang="ts">
  import type { DrawMode, GeocodedLocation } from '../../lib/navPlaceService';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    searchQuery: string;
    isSearching: boolean;
    showSearchResults: boolean;
    searchResults: GeocodedLocation[];
    drawMode: DrawMode;
    featureCount: number;
    onSearchInput: (value: string) => void;
    onSearchKeydown: (e: KeyboardEvent) => void;
    onSearchBlur: () => void;
    onSelectResult: (result: GeocodedLocation) => void;
    onToggleDrawMode: (mode: DrawMode) => void;
    onClearFeatures: () => void;
    formatCoordinates: (lat: number, lng: number) => string;
    fieldMode?: boolean;
  }

  let {
    searchQuery,
    isSearching,
    showSearchResults,
    searchResults,
    drawMode,
    featureCount,
    onSearchInput,
    onSearchKeydown,
    onSearchBlur,
    onSelectResult,
    onToggleDrawMode,
    onClearFeatures,
    formatCoordinates,
    fieldMode = false,
  }: Props = $props();
</script>

<div class="absolute top-2 left-2 right-2 z-[1000] flex items-start gap-2">
  <!-- Search -->
  <div class="relative flex-1">
    <div class={cn(
      'flex items-center bg-white/95 border-2 border-nb-black/30',
      'backdrop-blur-sm shadow-sm',
      fieldMode && 'border-yellow-700/40 bg-yellow-50/95'
    )}>
      <Icon name="search" class="text-base ml-2 opacity-50" />
      <input
        type="text"
        value={searchQuery}
        oninput={(e) => onSearchInput(e.currentTarget.value)}
        onkeydown={onSearchKeydown}
        onblur={onSearchBlur}
        placeholder="Search location..."
        class={cn(
          'flex-1 px-2 py-1.5 text-xs bg-transparent border-none outline-none',
          'font-mono placeholder:opacity-40'
        )}
      />
      {#if isSearching}
        <span class="mr-2 text-xs opacity-50 animate-pulse">...</span>
      {/if}
    </div>

    <!-- Search Results Dropdown -->
    {#if showSearchResults && searchResults.length > 0}
      <div class={cn(
        'absolute top-full left-0 right-0 mt-0.5 bg-white/95 border-2 border-nb-black/20',
        'max-h-48 overflow-y-auto shadow-md backdrop-blur-sm z-[1001]',
        fieldMode && 'bg-yellow-50/95 border-yellow-700/30'
      )}>
        {#each searchResults as result (result.name + result.lat + result.lng)}
          <button
            type="button"
            class={cn(
              'w-full text-left px-3 py-2 text-xs font-mono',
              'hover:bg-nb-black/5 transition-colors border-b border-nb-black/10 last:border-b-0',
              fieldMode && 'hover:bg-yellow-100/50'
            )}
            aria-label={result.name}
            onclick={() => onSelectResult(result)}
          >
            <span class="block font-semibold truncate">{result.name}</span>
            <span class="block text-[10px] opacity-50 mt-0.5">
              {formatCoordinates(result.lat, result.lng)}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Tool Buttons -->
  <div class={cn(
    'flex gap-1 bg-white/95 border-2 border-nb-black/30 p-0.5',
    'backdrop-blur-sm shadow-sm',
    fieldMode && 'border-yellow-700/40 bg-yellow-50/95'
  )}>
    <Button
      variant="ghost"
      size="bare"
      onclick={() => onToggleDrawMode('marker')}
      title="Place marker"
      aria-label="Place marker"
      class={cn('p-1.5 text-xs', drawMode === 'marker' && 'bg-nb-blue/20 text-nb-blue')}
    >
      {#snippet icon()}
        <Icon name="place" class="text-sm" />
      {/snippet}
    </Button>
    <Button
      variant="ghost"
      size="bare"
      onclick={() => onToggleDrawMode('bounds')}
      title="Capture viewport bounds"
      aria-label="Capture viewport bounds"
      class={cn('p-1.5 text-xs', drawMode === 'bounds' && 'bg-nb-blue/20 text-nb-blue')}
    >
      {#snippet icon()}
        <Icon name="crop_free" class="text-sm" />
      {/snippet}
    </Button>

    <div class="w-px bg-nb-black/20 my-0.5"></div>

    <Button
      variant="ghost"
      size="bare"
      onclick={onClearFeatures}
      title="Clear all features"
      aria-label="Clear all features"
      class="p-1.5 text-xs hover:text-nb-red"
      disabled={featureCount === 0}
    >
      {#snippet icon()}
        <Icon name="delete_outline" class="text-sm" />
      {/snippet}
    </Button>
  </div>
</div>
