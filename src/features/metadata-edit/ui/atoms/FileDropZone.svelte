<!--
  FileDropZone — Drag-and-drop file upload zone with loading state.
  React source: src/features/metadata-edit/ui/atoms/FileDropZone.tsx
  Architecture: Atom (internal isDragging state, props-driven, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    isLoading?: boolean;
    accept?: string;
    onFileSelect: (file: File) => void;
    buttonLabel?: string;
    loadingLabel?: string;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    isLoading = false,
    accept = '.csv,text/csv',
    onFileSelect,
    buttonLabel = 'Choose File',
    loadingLabel = 'Processing...',
    cx = {},
    fieldMode = false,
  }: Props = $props();

  let isDragging = $state(false);
  let fileInputRef: HTMLInputElement | undefined = $state();

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    isDragging = false;

    const file = e.dataTransfer?.files[0];
    if (file) {
      onFileSelect(file);
    }
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    // Reset input so the same file can be selected again
    target.value = '';
  }

  function handleClick() {
    if (!isLoading) {
      fileInputRef?.click();
    }
  }

  let zoneClass = $derived(
    cn(
      'flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed cursor-pointer transition-colors',
      isDragging && !isLoading && (fieldMode
        ? 'border-nb-yellow bg-nb-yellow/10'
        : 'border-nb-blue bg-nb-blue/5'),
      !isDragging && !isLoading && (fieldMode
        ? 'border-nb-yellow/40 hover:border-nb-yellow hover:bg-nb-yellow/5'
        : cx.border ? `border-${cx.border}/40` : 'border-nb-black/30 hover:border-nb-black hover:bg-nb-cream/50'),
      isLoading && 'cursor-wait opacity-70',
      fieldMode ? 'bg-nb-black' : ''
    )
  );
</script>

<button
  type="button"
  class={zoneClass}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  onclick={handleClick}
>
  {#if isLoading}
    <span class="animate-spin">
      <Icon name="refresh" class={cn('text-3xl', fieldMode ? 'text-nb-yellow' : cx.accent ?? 'text-nb-blue')} />
    </span>
    <p class={cn('text-sm font-mono', fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black')}>
      {loadingLabel}
    </p>
  {:else}
    <Icon
      name={isDragging ? 'file_download' : 'upload_file'}
      class={cn('text-3xl', fieldMode ? 'text-nb-yellow/60' : cx.textMuted ?? 'text-nb-black/40')}
    />
    <p class={cn('text-sm', fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black')}>
      Drag & drop a file here, or
      <span class={cn('font-bold underline', fieldMode ? 'text-nb-yellow' : cx.accent ?? 'text-nb-blue')}>
        {buttonLabel}
      </span>
    </p>
    <p class={cn('text-xs font-mono', fieldMode ? 'text-nb-yellow/50' : cx.textMuted ?? 'text-nb-black/40')}>
      Accepted: {accept}
    </p>
  {/if}
</button>

<input
  bind:this={fileInputRef}
  type="file"
  {accept}
  onchange={handleFileChange}
  class="hidden"
  tabindex="-1"
/>
