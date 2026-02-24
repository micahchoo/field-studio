<!--
  ArchiveContextMenu Molecule
  ============================
  Context menu overlay for right-click actions on archive items.
  Extracted from ArchiveView organism.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    x: number;
    y: number;
    isItemSelected: boolean;
    fieldMode: boolean;
    onOpen: () => void;
    onToggleSelect: () => void;
    onGroupIntoManifest: () => void;
    onEditMetadata: () => void;
    onClose: () => void;
    cx?: Partial<ContextualClassNames>;
  }

  let {
    x,
    y,
    isItemSelected,
    fieldMode,
    onOpen,
    onToggleSelect,
    onGroupIntoManifest,
    onEditMetadata,
    onClose,
    cx,
  }: Props = $props();

  const menuItemClass = $derived(cn(
    'w-full text-left px-4 py-2 text-sm flex items-center gap-3 cursor-pointer',
    fieldMode ? 'hover:bg-nb-yellow/20' : 'hover:bg-nb-cream'
  ));
</script>

<div
  class="fixed inset-0 z-[200]"
  onclick={onClose}
  oncontextmenu={(e) => { e.preventDefault(); onClose(); }}
  role="presentation"
>
  <div
    class={cn(
      'absolute z-[201] min-w-[180px] py-1 shadow-brutal-lg border-2',
      fieldMode
        ? 'bg-nb-black border-nb-yellow text-nb-yellow'
        : 'bg-nb-white border-nb-black text-nb-black'
    )}
    style:left="{Math.min(x, window.innerWidth - 204)}px"
    style:top="{Math.min(y, window.innerHeight - 224)}px"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
    role="menu"
    aria-label="Canvas context menu"
    tabindex="0"
  >
    <button type="button" class={menuItemClass} onclick={onOpen} role="menuitem">
      <Icon name="visibility" class="text-base" />
      Open in Viewer
    </button>
    <button type="button" class={menuItemClass} onclick={onToggleSelect} role="menuitem">
      <Icon
        name={isItemSelected ? 'check_box' : 'check_box_outline_blank'}
        class="text-base"
      />
      {isItemSelected ? 'Deselect' : 'Select'}
    </button>

    <hr class={cn('my-1 border-0 border-t', fieldMode ? 'border-nb-yellow/30' : 'border-nb-black/10')} />

    <button
      type="button"
      class={menuItemClass}
      onclick={() => { onGroupIntoManifest(); onClose(); }}
      role="menuitem"
    >
      <Icon name="auto_stories" class="text-base" />
      Group into Manifest
    </button>
    <button
      type="button"
      class={menuItemClass}
      onclick={() => { onEditMetadata(); onClose(); }}
      role="menuitem"
    >
      <Icon name="table_chart" class="text-base" />
      Edit in Catalog
    </button>
  </div>
</div>
