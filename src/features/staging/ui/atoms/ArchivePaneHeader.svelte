<!--
  ArchivePaneHeader Atom
  =======================
  Header for the archive pane with title, create collection button,
  and inline new collection name input.
  Extracted from ArchivePane molecule.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { Button, Icon } from '@/src/shared/ui/atoms';

  interface Props {
    showNewCollectionInput: boolean;
    newCollectionName: string;
    onToggleInput: () => void;
    onCreate: () => void;
    onCreateKeyDown: (e: KeyboardEvent) => void;
    onFocus: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    showNewCollectionInput = $bindable(),
    newCollectionName = $bindable(),
    onToggleInput,
    onCreate,
    onCreateKeyDown,
    onFocus,
  }: Props = $props();
</script>

<div
  class="p-3 border-b border-nb-black/20 bg-nb-cream/40"
  onclick={onFocus}
  role="presentation"
>
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-sm font-bold text-nb-black/80">Archive Layout</h3>
    <Button
      variant="ghost"
      size="bare"
      onclick={onToggleInput}
      class="p-1 hover:bg-nb-cream text-nb-black/60 text-sm"
      title="Create new collection"
    >
      <Icon name="add" class="text-base" />
    </Button>
  </div>

  {#if showNewCollectionInput}
    <div class="flex gap-2">
      <!-- svelte-ignore a11y_autofocus -->
      <input
        type="text"
        bind:value={newCollectionName}
        onkeydown={onCreateKeyDown}
        placeholder="Collection name..."
        class="flex-1 px-2 py-1 text-sm border border-nb-black/20 rounded"
        autofocus
      />
      <Button
        variant="ghost"
        size="bare"
        onclick={onCreate}
        class="px-2 py-1 text-sm bg-nb-blue text-white hover:bg-nb-blue"
      >
        Create
      </Button>
    </div>
  {/if}
</div>
