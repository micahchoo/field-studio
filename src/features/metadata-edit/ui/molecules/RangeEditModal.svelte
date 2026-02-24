<!--
  RangeEditModal -- Modal dialog for creating/editing IIIF Ranges.
  React source: src/features/metadata-edit/ui/molecules/StructureTabPanel.tsx (lines 226-414)
  Architecture: Molecule (internal state for label + selectedCanvasIds, composes Button, Icon, EmptyState)
-->
<script module lang="ts">
  import type { IIIFCanvas } from '@/src/shared/types';

  export interface RangeEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (label: string, selectedCanvasIds: string[]) => void;
    initialLabel?: string;
    initialCanvasIds?: string[];
    availableCanvases: IIIFCanvas[];
    isEditing: boolean;
    fieldMode: boolean;
    language: string;
    cx?: import('@/src/shared/lib/contextual-styles').ContextualClassNames;
  }
</script>

<script lang="ts">
  import { getIIIFValue } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import EmptyState from '@/src/shared/ui/molecules/EmptyState.svelte';

  let {
    isOpen,
    onClose,
    onSave,
    initialLabel = '',
    initialCanvasIds = [],
    availableCanvases,
    isEditing,
    fieldMode,
    language,
    cx = {} as ContextualClassNames,
  }: RangeEditModalProps = $props();

  // svelte-ignore state_referenced_locally -- intentional: initial-value capture, reset via $effect when modal opens
  let label = $state(initialLabel);
  // svelte-ignore state_referenced_locally -- intentional: initial-value capture, reset via $effect when modal opens
  let selectedCanvasIds = $state(new Set<string>(initialCanvasIds));

  // Reset internal state when modal opens with new initial values
  $effect(() => {
    if (isOpen) {
      label = initialLabel;
      selectedCanvasIds = new Set(initialCanvasIds);
    }
  });

  function toggleCanvas(id: string) {
    const next = new Set(selectedCanvasIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedCanvasIds = next;
  }

  function handleSave() {
    if (!label.trim()) return;
    onSave(label.trim(), Array.from(selectedCanvasIds));
    onClose();
  }

  function handleLabelInput(e: Event) {
    const target = e.target as HTMLInputElement;
    label = target.value;
  }

  /** Minimal cx for EmptyState — only textMuted needed */
  let emptyCx: ContextualClassNames = $derived({
    surface: '',
    border: '',
    text: '',
    accent: '',
    textMuted: fieldMode ? 'text-nb-black/40' : 'text-nb-black/50',
    headerBg: '',
    divider: '',
  });
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="fixed inset-0 z-[1200] flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-nb-black/50"
      onclick={onClose}
    ></div>

    <!-- Modal -->
    <div class={cn(
      'relative w-full max-w-lg max-h-[80vh] overflow-hidden shadow-brutal-lg',
      fieldMode ? 'bg-nb-black border border-nb-black/80' : 'bg-nb-white'
    )}>
      <!-- Header -->
      <div class={cn(
        'flex items-center justify-between px-4 py-3 border-b',
        fieldMode ? 'border-nb-black/80' : 'border-nb-black/20'
      )}>
        <h3 class={cn('font-bold', fieldMode ? 'text-white' : 'text-nb-black')}>
          {isEditing ? 'Edit Range' : 'Create New Range'}
        </h3>
        <Button
          variant="ghost"
          size="bare"
          onclick={onClose}
          class={cn('p-1', fieldMode ? 'hover:bg-nb-black' : 'hover:bg-nb-cream')}
        >
          {#snippet children()}
            <Icon name="close" class={fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'} />
          {/snippet}
        </Button>
      </div>

      <!-- Content -->
      <div class="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
        <!-- Label input -->
        <div>
          <label for="field-range-label" class={cn(
            'block text-[10px] font-bold uppercase tracking-wider mb-1.5',
            fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
          )}>
            Range Label
          </label>
          <!-- svelte-ignore a11y_autofocus -->
          <input id="field-range-label"
            type="text"
            value={label}
            oninput={handleLabelInput}
            placeholder="e.g., Chapter 1, Introduction, etc."
            autofocus
            class={cn(
              'w-full px-3 py-2 text-sm outline-none border',
              fieldMode
                ? 'bg-nb-black text-white border-nb-black/80 focus:border-nb-yellow'
                : 'bg-nb-white border-nb-black/20 focus:border-nb-blue focus:ring-2 focus:ring-nb-blue/20'
            )}
          />
        </div>

        <!-- Canvas selection -->
        <div>
          <p class={cn(
            'block text-[10px] font-bold uppercase tracking-wider mb-1.5',
            fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
          )}>
            Select Pages/Canvases ({selectedCanvasIds.size} selected)
          </p>
          <div class={cn(
            'border max-h-48 overflow-y-auto',
            fieldMode ? 'border-nb-black/80' : 'border-nb-black/20'
          )}>
            {#each availableCanvases as canvas (canvas.id)}
              {@const canvasLabel = getIIIFValue(canvas.label, language) || 'Untitled'}
              {@const isCanvasSelected = selectedCanvasIds.has(canvas.id)}
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <div
                onclick={() => toggleCanvas(canvas.id)}
                class={cn(
                  'flex items-center gap-2 px-3 py-2 cursor-pointer transition-nb border-b last:border-b-0',
                  fieldMode
                    ? cn('border-nb-black', isCanvasSelected ? 'bg-nb-yellow/20' : 'hover:bg-nb-black')
                    : cn('border-nb-black/10', isCanvasSelected ? 'bg-nb-blue/10' : 'hover:bg-nb-white')
                )}
              >
                <Icon
                  name={isCanvasSelected ? 'check_box' : 'check_box_outline_blank'}
                  class={cn(
                    'text-sm',
                    isCanvasSelected
                      ? (fieldMode ? 'text-nb-yellow' : 'text-nb-blue')
                      : (fieldMode ? 'text-nb-black/60' : 'text-nb-black/40')
                  )}
                />
                <Icon name="image" class={cn('text-xs', fieldMode ? 'text-nb-black/50' : 'text-nb-black/40')} />
                <span class={cn('text-xs truncate', fieldMode ? 'text-white' : 'text-nb-black/80')}>
                  {canvasLabel}
                </span>
              </div>
            {/each}
            {#if availableCanvases.length === 0}
              <EmptyState
                icon="photo_library"
                title="No Canvases"
                description="No canvases are available in this manifest."
                cx={emptyCx}
              />
            {/if}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class={cn(
        'flex items-center justify-end gap-2 px-4 py-3 border-t',
        fieldMode ? 'border-nb-black/80' : 'border-nb-black/20'
      )}>
        <Button
          variant="ghost"
          size="bare"
          onclick={onClose}
          class={cn(
            'px-4 py-2 text-sm font-medium transition-nb',
            fieldMode
              ? 'bg-nb-black text-nb-black/30 hover:bg-nb-black/80'
              : 'bg-nb-cream text-nb-black/80 hover:bg-nb-cream'
          )}
        >
          {#snippet children()}Cancel{/snippet}
        </Button>
        <Button
          variant="ghost"
          size="bare"
          onclick={handleSave}
          disabled={!label.trim()}
          class={cn(
            'px-4 py-2 text-sm font-medium transition-nb disabled:opacity-50',
            fieldMode
              ? 'bg-nb-yellow text-white hover:bg-nb-yellow'
              : 'bg-nb-blue text-white hover:bg-nb-blue'
          )}
        >
          {#snippet children()}{isEditing ? 'Save Changes' : 'Create Range'}{/snippet}
        </Button>
      </div>
    </div>
  </div>
{/if}
