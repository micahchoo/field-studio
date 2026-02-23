<!--
  PageCounter — Page navigation with prev/next + editable page number

  ORIGINAL: src/features/viewer/ui/atoms/PageCounter.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Composes Button atoms with current/total display. Has local state
  for edit mode (direct page entry). Validates 1..total range.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    /** Current page number (1-indexed) */
    current: number;
    /** Total number of pages */
    total: number;
    /** Called when page changes */
    onPageChange: (page: number) => void;
    /** Show first/last buttons */
    showFirstLast?: boolean;
    /** Allow direct page number entry */
    allowDirectEntry?: boolean;
    /** Page label */
    label?: string;
    /** Disabled state */
    disabled?: boolean;
    /** Contextual styles from template */
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    current,
    total,
    onPageChange,
    showFirstLast = false,
    allowDirectEntry = true,
    label = 'Page',
    disabled = false,
    cx,
    fieldMode = false,
  }: Props = $props();

  let isEditing = $state(false);
  let editValue = $state(current.toString());

  // Keep editValue in sync with current prop when not editing.
  // Using $derived avoids the state_referenced_locally warning since we close
  // over the prop reactively.
  $effect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    current; // track the prop
    if (!isEditing) {
      editValue = current.toString();
    }
  });

  let canGoPrev = $derived(current > 1);
  let canGoNext = $derived(current < total);

  function handlePrev() {
    if (current > 1) onPageChange(current - 1);
  }

  function handleNext() {
    if (current < total) onPageChange(current + 1);
  }

  function handleFirst() {
    onPageChange(1);
  }

  function handleLast() {
    onPageChange(total);
  }

  function handleEditSubmit() {
    const page = parseInt(editValue, 10);
    if (!isNaN(page) && page >= 1 && page <= total) {
      onPageChange(page);
    } else {
      editValue = current.toString();
    }
    isEditing = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      editValue = current.toString();
      isEditing = false;
    }
  }
</script>

<div
  class={cn('inline-flex items-center gap-2 border px-2 py-1', cx.border, cx.surface)}
  role="navigation"
  aria-label="Page navigation"
>
  <!-- First button -->
  {#if showFirstLast}
    <button
      class={cn('p-1 transition-nb', cx.text, disabled || !canGoPrev ? 'opacity-40 cursor-not-allowed' : 'hover:bg-nb-black/10')}
      onclick={handleFirst}
      disabled={disabled || !canGoPrev}
      aria-label="Go to first page"
    >
      <span class="material-icons text-sm">first_page</span>
    </button>
  {/if}

  <!-- Previous button -->
  <button
    class={cn('p-1 transition-nb', cx.text, disabled || !canGoPrev ? 'opacity-40 cursor-not-allowed' : 'hover:bg-nb-black/10')}
    onclick={handlePrev}
    disabled={disabled || !canGoPrev}
    aria-label="Previous page"
  >
    <span class="material-icons">chevron_left</span>
  </button>

  <!-- Page display / edit -->
  <div class="flex items-center gap-1 px-2">
    <span class="text-xs {cx.textMuted}">{label}</span>

    {#if isEditing && allowDirectEntry}
      <input
        type="number"
        value={editValue}
        oninput={(e) => { editValue = (e.target as HTMLInputElement).value; }}
        onblur={handleEditSubmit}
        onkeydown={handleKeyDown}
        class={cn('w-12 text-center text-sm font-medium border', cx.border, cx.input)}
        min={1}
        max={total}
        aria-label="Enter page number"
      />
    {:else}
      <button
        onclick={() => allowDirectEntry && (isEditing = true)}
        disabled={disabled || !allowDirectEntry}
        class={cn(
          'text-sm font-medium px-1 transition-nb',
          cx.text,
          allowDirectEntry && !disabled ? 'hover:opacity-70 cursor-pointer' : ''
        )}
        aria-label={allowDirectEntry ? 'Click to edit page number' : undefined}
      >
        {current}
      </button>
    {/if}

    <span class="text-sm {cx.textMuted}">/</span>
    <span class="text-sm {cx.textMuted}">{total}</span>
  </div>

  <!-- Next button -->
  <button
    class={cn('p-1 transition-nb', cx.text, disabled || !canGoNext ? 'opacity-40 cursor-not-allowed' : 'hover:bg-nb-black/10')}
    onclick={handleNext}
    disabled={disabled || !canGoNext}
    aria-label="Next page"
  >
    <span class="material-icons">chevron_right</span>
  </button>

  <!-- Last button -->
  {#if showFirstLast}
    <button
      class={cn('p-1 transition-nb', cx.text, disabled || !canGoNext ? 'opacity-40 cursor-not-allowed' : 'hover:bg-nb-black/10')}
      onclick={handleLast}
      disabled={disabled || !canGoNext}
      aria-label="Go to last page"
    >
      <span class="material-icons text-sm">last_page</span>
    </button>
  {/if}
</div>
