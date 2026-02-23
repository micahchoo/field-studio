<!--
  TemplateItemPicker.svelte -- Two-panel item picker for board templates (Molecule)
  =================================================================================
  React source: src/features/board-design/ui/molecules/TemplateItemPicker.tsx (332L)

  ARCHITECTURE NOTES:
  - Local state: selectedIds ($state<Set<string>>), spotlightId ($state<string | null>)
  - Rule 3.E: $effect() to pre-select first N items when isOpen changes
    (effect lives in THIS component, not in a module singleton)
  - Rule 2.C: availableItems is a large data collection; treat as read-only prop
  - $derived for selectedItems (filtered from availableItems by selectedIds)
  - $derived for spotlightItem (found from availableItems by spotlightId)
  - Two-panel layout: left = scrollable thumbnail grid, right = spotlight preview
  - Composes: ModalDialog wrapper, Button, Icon atoms, EmptyState molecule
  - Rule 2.G: native <button> elements for grid item toggle (complex interaction)
  - Rule 5.A: ModalDialog footer uses {#snippet footer()}
  - No <script module> needed (no static data beyond what template provides)
-->
<script lang="ts">
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import EmptyState from '@/src/shared/ui/molecules/EmptyState.svelte';
  import ModalDialog from '@/src/shared/ui/molecules/ModalDialog.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import type { IIIFItem } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import type { BoardTemplate } from '../organisms/BoardOnboarding.svelte';

  interface Props {
    /** Whether the picker modal is open */
    isOpen: boolean;
    /** Close callback */
    onClose: () => void;
    /** The selected board template */
    template: BoardTemplate;
    /** Available IIIF items from archive */
    availableItems: IIIFItem[];
    /** Confirm callback with template + selected items */
    onConfirm: (template: BoardTemplate, selectedItems: IIIFItem[]) => void;
    /** Contextual styles */
    cx: {
      surface: string;
      text: string;
      textMuted: string;
      accent: string;
      border: string;
      headerBg: string;
    };
    /** Field mode flag */
    fieldMode: boolean;
  }

  let {
    isOpen,
    onClose,
    template,
    availableItems,
    onConfirm,
    cx,
    fieldMode,
  }: Props = $props();

  // ── Local State ──
  let selectedIds = $state<Set<string>>(new Set());
  let spotlightId = $state<string | null>(null);

  // ── Effects ──
  // Rule 3.E: Pre-select first N items when modal opens
  $effect(() => {
    if (isOpen && availableItems.length > 0) {
      const preselect = new Set(
        availableItems.slice(0, template.itemCount).map(item => item.id)
      );
      selectedIds = preselect;
      spotlightId = availableItems[0]?.id || null;
    }
  });

  // ── Derived ──
  let selectedItems = $derived(
    availableItems.filter(item => selectedIds.has(item.id))
  );

  let spotlightItem = $derived(
    spotlightId ? availableItems.find(item => item.id === spotlightId) ?? null : null
  );

  let spotlightIsSelected = $derived(
    spotlightId ? selectedIds.has(spotlightId) : false
  );

  let spotlightLabel = $derived(
    spotlightItem ? (getIIIFValue(spotlightItem.label) || spotlightItem.id) : ''
  );

  let spotlightSummary = $derived(
    spotlightItem ? getIIIFValue(spotlightItem.summary) : ''
  );

  // Compute spotlight metadata pairs
  let spotlightMeta = $derived.by((): Array<{ key: string; value: string }> => {
    if (!spotlightItem) return [];
    const meta: Array<{ key: string; value: string }> = [];
    meta.push({ key: 'Type', value: spotlightItem.type });
    if (spotlightItem.navDate) meta.push({ key: 'Date', value: spotlightItem.navDate.split('T')[0] });
    if (spotlightItem.rights) meta.push({ key: 'Rights', value: spotlightItem.rights });
    if (spotlightItem.metadata) {
      for (const pair of spotlightItem.metadata.slice(0, 4)) {
        const k = getIIIFValue(pair.label);
        const v = getIIIFValue(pair.value);
        if (k && v) meta.push({ key: k, value: v });
      }
    }
    return meta;
  });

  // ── Helpers ──
  function getThumbUrl(item: IIIFItem): string | null {
    const thumb = item.thumbnail;
    if (thumb && Array.isArray(thumb) && thumb.length > 0) {
      return (thumb[0] as { id?: string }).id || null;
    }
    return (item as IIIFItem & { _blobUrl?: string })._blobUrl || null;
  }

  // ── Handlers ──
  function toggleItem(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selectedIds = next;
  }

  function selectAll() {
    selectedIds = new Set(availableItems.map(item => item.id));
  }

  function selectNone() {
    selectedIds = new Set();
  }

  function handleConfirm() {
    onConfirm(template, selectedItems);
  }

  // Static class maps (Rule 2.D)
  const GRID_ITEM = {
    field: {
      base: 'border-nb-yellow/20 bg-nb-black hover:border-nb-yellow/50',
      selected: 'border-nb-yellow bg-nb-yellow/10',
      spotlight: 'ring-2 ring-nb-yellow/50',
    },
    normal: {
      base: 'border-nb-black/10 bg-nb-white hover:border-nb-black/30',
      selected: 'border-nb-blue bg-nb-blue/5',
      spotlight: 'ring-2 ring-nb-blue/50',
    },
  } as const;

  const SPOTLIGHT_BG = {
    field: 'bg-nb-black',
    normal: 'bg-nb-cream/50',
  } as const;
</script>

<ModalDialog open={isOpen} onClose={onClose} title={template.name} size="xl" {cx}>
  {#snippet footer()}
    <div class="flex items-center justify-between">
      <span class="text-sm {cx.textMuted}">
        {selectedIds.size} of {availableItems.length} items selected
      </span>
      <div class="flex gap-3">
        <Button variant="secondary" size="sm" onclick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          onclick={handleConfirm}
          disabled={selectedIds.size === 0}
          class="bg-nb-orange text-white"
        >
          {#snippet icon()}<Icon name="dashboard" />{/snippet}
          Create Board ({selectedIds.size})
        </Button>
      </div>
    </div>
  {/snippet}

  <div class="flex h-full min-h-[400px]">
    <!-- Left: Item grid with bulk actions -->
    <div class="flex-1 overflow-y-auto p-4 border-r border-nb-black/10">
      <!-- Template description + bulk actions -->
      <div class="flex items-center justify-between mb-3">
        <p class="text-xs {cx.textMuted}">
          {template.description} &mdash; Recommended: {template.itemCount} items
        </p>
        <div class="flex items-center gap-2 shrink-0 ml-4">
          <Button variant="ghost" size="sm" onclick={selectAll}>Select All</Button>
          <Button variant="ghost" size="sm" onclick={selectNone}>Select None</Button>
        </div>
      </div>

      {#if availableItems.length === 0}
        <EmptyState
          icon="photo_library"
          title="No Items Available"
          description="Import items into your archive first to use board templates."
          {cx}
        />
      {:else}
        <div class="grid grid-cols-3 md:grid-cols-4 gap-2">
          {#each availableItems as item (item.id)}
            {@const isSelected = selectedIds.has(item.id)}
            {@const isSpotlit = spotlightId === item.id}
            {@const itemLabel = getIIIFValue(item.label) || item.id}
            {@const thumbUrl = getThumbUrl(item)}
            {@const modeClasses = fieldMode ? GRID_ITEM.field : GRID_ITEM.normal}

            <button
              type="button"
              onclick={() => toggleItem(item.id)}
              onmouseenter={() => { spotlightId = item.id; }}
              onfocus={() => { spotlightId = item.id; }}
              class={cn(
                'relative group text-left p-1.5 border cursor-pointer transition-all',
                modeClasses.base,
                isSelected && modeClasses.selected,
                isSpotlit && modeClasses.spotlight
              )}
            >
              <!-- Thumbnail -->
              <div class="aspect-square overflow-hidden mb-1 {fieldMode ? 'bg-nb-black/50' : 'bg-nb-cream'} flex items-center justify-center">
                {#if thumbUrl}
                  <img
                    src={thumbUrl}
                    alt={itemLabel}
                    loading="lazy"
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <Icon name="image" class="text-2xl opacity-30" />
                {/if}
              </div>

              <!-- Label -->
              <p class="text-[10px] truncate {fieldMode ? 'text-nb-black/20' : 'text-nb-black/70'}">
                {itemLabel}
              </p>

              <!-- Selection indicator -->
              {#if isSelected}
                <div class="absolute top-1 right-1 w-5 h-5 rounded-full bg-nb-blue flex items-center justify-center">
                  <Icon name="check" class="text-white text-xs" />
                </div>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Right: Spotlight preview panel (280px fixed width) -->
    <div class={cn('w-[280px] shrink-0 flex flex-col', fieldMode ? SPOTLIGHT_BG.field : SPOTLIGHT_BG.normal)}>
      {#if spotlightItem}
        <!-- Large thumbnail -->
        {@const spotThumbUrl = getThumbUrl(spotlightItem)}
        <div class="aspect-square overflow-hidden {fieldMode ? 'bg-nb-black/50' : 'bg-nb-cream'} flex items-center justify-center">
          {#if spotThumbUrl}
            <img
              src={spotThumbUrl}
              alt={spotlightLabel}
              loading="lazy"
              class="w-full h-full object-cover"
            />
          {:else}
            <Icon name="image" class="text-6xl opacity-20" />
          {/if}
        </div>

        <!-- Details -->
        <div class="p-3 space-y-2 flex-1 overflow-y-auto">
          <!-- Label -->
          <h4 class="text-sm font-bold {cx.text} line-clamp-2">{spotlightLabel}</h4>

          <!-- Summary -->
          {#if spotlightSummary}
            <p class="text-xs {cx.textMuted} line-clamp-3">{spotlightSummary}</p>
          {/if}

          <!-- Metadata preview -->
          {#if spotlightMeta.length > 0}
            <div class="space-y-1 pt-2 border-t border-nb-black/10">
              {#each spotlightMeta as m (m.key)}
                <div class="text-[10px]">
                  <span class="font-bold uppercase tracking-wider {cx.textMuted}">{m.key}:</span>
                  <span class="{cx.text} ml-1">{m.value}</span>
                </div>
              {/each}
            </div>
          {/if}

          <!-- Selection toggle -->
          <div class="pt-2">
            <Button
              variant={spotlightIsSelected ? 'secondary' : 'primary'}
              size="sm"
              fullWidth
              onclick={() => toggleItem(spotlightItem!.id)}
            >
              {#snippet icon()}<Icon name={spotlightIsSelected ? 'remove_circle_outline' : 'add_circle_outline'} />{/snippet}
              {spotlightIsSelected ? 'Deselect' : 'Select'}
            </Button>
          </div>
        </div>
      {:else}
        <!-- Hover prompt -->
        <div class="flex-1 flex items-center justify-center p-6">
          <p class="text-sm text-center {cx.textMuted}">
            Hover an item to preview
          </p>
        </div>
      {/if}
    </div>
  </div>
</ModalDialog>
