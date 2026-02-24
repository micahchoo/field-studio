<!--
  PresentationOverlay.svelte -- Fullscreen slideshow overlay (Organism)
  =====================================================================
  React source: src/features/board-design/ui/organisms/PresentationOverlay.tsx (127L)

  PURPOSE:
  Fixed fullscreen overlay for board presentation/slideshow mode.
  Shows the current slide item (image, note, or placeholder) with
  navigation controls and auto-advance toggle.

  ARCHITECTURE NOTES:
  - NO cx/fieldMode props -- fixed dark theme (always dark overlay)
  - Returns nothing when currentItem is null (use {#if currentItem} guard)
  - Stateless organism: all state managed by PresentationModeStore in BoardView
  - Composes: inline buttons with Material Symbols icons
  - formatDuration imported from ../../model for AV metadata display
  - Rule 2.G: native <button> for prev/next/auto-advance (simple controls)

  STATE MAPPING:
  - No local state -- fully controlled via props from PresentationModeStore
  - Keyboard handling done at BoardView level via presentation.handleKeyboard()
-->
<script lang="ts">
  import type { SlideItem } from '../../stores/presentationMode.svelte';
  import type { BoardItem as StoreBoardItem } from '../../stores/boardVault.svelte';
  import type { BoardItem as ModelBoardItem } from '../../model';
  import { formatDuration } from '../../model';

  /** Union of store + model BoardItem fields that PresentationOverlay may display.
   *  At runtime, findItem returns the store's BoardItem. The model's extended fields
   *  (blobUrl, meta, isNote, annotation) will be present once the model layer is
   *  integrated with the store; until then they are safely undefined-guarded. */
  type ResolvedItem = StoreBoardItem & Partial<Pick<ModelBoardItem, 'blobUrl' | 'isNote' | 'annotation' | 'meta'>>;

  interface Props {
    /** Current slide item (null = not in presentation mode) */
    currentItem: SlideItem | null;
    /** Lookup function to resolve full board item details for display */
    findItem?: (id: string) => ResolvedItem | undefined;
    /** Zero-based index of current slide */
    currentIndex: number;
    /** Total number of slides */
    totalSlides: number;
    /** Whether auto-advancing is active */
    isAutoAdvancing: boolean;
    /** Navigate to next slide */
    onNext: () => void;
    /** Navigate to previous slide */
    onPrev: () => void;
    /** Exit presentation mode */
    onExit: () => void;
    /** Toggle auto-advance on/off */
    onToggleAutoAdvance: () => void;
    /** Jump to specific slide by index */
    onGoTo: (index: number) => void;
  }

  let {
    currentItem,
    findItem,
    currentIndex,
    totalSlides,
    isAutoAdvancing,
    onNext,
    onPrev,
    onExit,
    onToggleAutoAdvance,
    onGoTo,
  }: Props = $props();

  // ── Derived ──
  // Resolve the full BoardItem (with blobUrl, meta, etc.) from the slide's id
  let resolved = $derived(currentItem && findItem ? findItem(currentItem.id) : undefined);
  let meta = $derived(resolved?.meta);
</script>

{#if currentItem}
  <div class="fixed inset-0 z-50 bg-nb-black flex flex-col">

    <!-- Close button (top-right) -->
    <div class="absolute top-4 right-4 z-10">
      <button
        type="button"
        onclick={onExit}
        class="p-2 text-nb-white/60 hover:text-nb-white transition-colors"
        aria-label="Exit presentation"
      >
        <span class="material-symbols-outlined text-2xl">close</span>
      </button>
    </div>

    <!-- Main content area (centered) -->
    <div class="flex-1 flex items-center justify-center p-12">
      <div class="max-w-4xl w-full flex flex-col items-center gap-6">

        <!-- Thumbnail or placeholder -->
        {#if resolved?.blobUrl}
          <img
            src={resolved.blobUrl}
            alt={currentItem.label ?? currentItem.id}
            class="max-h-[60vh] max-w-full object-contain shadow-brutal border-2 border-nb-white/20"
          />
        {:else}
          <div class="w-64 h-48 bg-nb-black/80 border-2 border-nb-white/10 flex items-center justify-center">
            <span class="material-symbols-outlined text-5xl text-nb-white/20">
              {resolved?.isNote ? 'sticky_note_2' : 'image'}
            </span>
          </div>
        {/if}

        <!-- Label -->
        <h2 class="text-2xl font-bold text-nb-white text-center">{currentItem.label ?? currentItem.id}</h2>

        <!-- Metadata line -->
        <div class="flex items-center gap-4 text-sm text-nb-white/50">
          {#if meta?.summary}
            <p class="max-w-lg text-center text-nb-white/40">{meta.summary}</p>
          {/if}
          {#if meta?.navDate}
            <span>{new Date(meta.navDate).toLocaleDateString()}</span>
          {/if}
          {#if meta?.duration != null}
            <span>{formatDuration(meta.duration)}</span>
          {/if}
          {#if meta?.canvasCount != null}
            <span>{meta.canvasCount} canvases</span>
          {/if}
        </div>

        <!-- Note content (if this slide is a note) -->
        {#if resolved?.isNote && resolved.annotation}
          <p class="text-lg text-nb-white/70 max-w-2xl text-center leading-relaxed">
            {resolved.annotation}
          </p>
        {/if}
      </div>
    </div>

    <!-- Bottom navigation bar -->
    <div class="flex items-center justify-center gap-4 p-4 bg-nb-black/80 border-t border-nb-white/10">
      <!-- Previous -->
      <button
        type="button"
        onclick={onPrev}
        disabled={currentIndex === 0}
        class="p-2 text-nb-white/60 hover:text-nb-white disabled:opacity-30 transition-colors"
        aria-label="Previous slide"
      >
        <span class="material-symbols-outlined text-2xl">chevron_left</span>
      </button>

      <!-- Slide counter -->
      <span class="text-sm text-nb-white/60 font-medium min-w-[80px] text-center">
        {currentIndex + 1} of {totalSlides}
      </span>

      <!-- Next -->
      <button
        type="button"
        onclick={onNext}
        disabled={currentIndex >= totalSlides - 1}
        class="p-2 text-nb-white/60 hover:text-nb-white disabled:opacity-30 transition-colors"
        aria-label="Next slide"
      >
        <span class="material-symbols-outlined text-2xl">chevron_right</span>
      </button>

      <!-- Divider -->
      <div class="w-px h-6 bg-nb-white/20 mx-2" aria-hidden="true"></div>

      <!-- Auto-advance toggle -->
      <button
        type="button"
        onclick={onToggleAutoAdvance}
        class="p-2 transition-colors {isAutoAdvancing ? 'text-nb-orange' : 'text-nb-white/60 hover:text-nb-white'}"
        title={isAutoAdvancing ? 'Stop auto-advance' : 'Auto-advance (5s)'}
        aria-label={isAutoAdvancing ? 'Stop auto-advance' : 'Start auto-advance'}
      >
        <span class="material-symbols-outlined text-xl">
          {isAutoAdvancing ? 'pause' : 'play_arrow'}
        </span>
      </button>
    </div>
  </div>
{/if}
