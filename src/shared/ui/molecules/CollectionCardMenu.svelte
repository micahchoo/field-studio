<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import ContextMenu from './ContextMenu.svelte';
  import ContextMenuSection from './ContextMenuSection.svelte';
  import ContextMenuItem from './ContextMenuItem.svelte';

  interface Props {
    open?: boolean;
    x: number;
    y: number;
    onRename: () => void;
    onDelete: () => void;
    onDuplicate?: () => void;
    onExport?: () => void;
    cx: ContextualClassNames;
  }

  let {
    open = $bindable(false),
    x,
    y,
    onRename,
    onDelete,
    onDuplicate,
    onExport,
    cx
  }: Props = $props();
</script>

<ContextMenu bind:open {x} {y} {cx}>
  {#snippet children()}
    <ContextMenuSection {cx}>
      {#snippet children()}
        <ContextMenuItem label="Rename" icon="edit" onclick={() => { onRename(); open = false; }} {cx} />
        {#if onDuplicate}
          <ContextMenuItem label="Duplicate" icon="content_copy" onclick={() => { onDuplicate(); open = false; }} {cx} />
        {/if}
        {#if onExport}
          <ContextMenuItem label="Export" icon="download" onclick={() => { onExport(); open = false; }} {cx} />
        {/if}
      {/snippet}
    </ContextMenuSection>
    <ContextMenuSection {cx}>
      {#snippet children()}
        <ContextMenuItem label="Delete" icon="delete" destructive onclick={() => { onDelete(); open = false; }} {cx} />
      {/snippet}
    </ContextMenuSection>
  {/snippet}
</ContextMenu>
