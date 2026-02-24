<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '../atoms/Button.svelte';
  import TextArea from '../atoms/TextArea.svelte';

  interface Props {
    name: string;
    description: string;
    onSave: () => void;
    onCancel: () => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    name = $bindable(''),
    description = $bindable(''),
    onSave,
    onCancel,
    cx,
    fieldMode = false
  }: Props = $props();

  let inputRef: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (inputRef) inputRef.focus();
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') onSave();
    if (e.key === 'Escape') onCancel();
  }
</script>

<div class="p-3 flex flex-col gap-2">
  <input
    bind:this={inputRef}
    bind:value={name}
    type="text"
    placeholder="Collection name"
    class={cx.input || 'w-full border-2 border-nb-black px-2 py-1 text-xs font-mono'}
    onkeydown={handleKeydown}
  />
  <TextArea
    bind:value={description}
    placeholder="Description (optional)"
    rows={2}
    class={cx.input || 'w-full border-2 border-nb-black px-2 py-1 text-xs font-mono resize-none'}
  />
  <div class="flex gap-1 justify-end">
    <Button variant="ghost" size="sm" onclick={onCancel}>
      {#snippet children()}<span>Cancel</span>{/snippet}
    </Button>
    <Button variant="primary" size="sm" onclick={onSave}>
      {#snippet children()}<span>Save</span>{/snippet}
    </Button>
  </div>
</div>
