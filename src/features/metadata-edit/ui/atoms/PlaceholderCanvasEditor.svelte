<!--
  PlaceholderCanvasEditor — IIIF placeholderCanvas poster frame editor.
  React source: src/features/metadata-edit/ui/atoms/PlaceholderCanvasEditor.tsx (137 lines)
  Architecture: Atom (local file-input ref state only)
-->
<script module lang="ts">
  export interface PlaceholderCanvasEditorProps {
    /** Current placeholder canvas poster URL */
    posterUrl?: string;
    /** Canvas dimensions for display */
    canvasWidth?: number;
    canvasHeight?: number;
    /** Called when poster image is uploaded */
    onUpload: (file: File) => void;
    /** Called when poster is removed */
    onRemove: () => void;
    /** Field mode styling */
    fieldMode?: boolean;
    /** Whether editing is disabled */
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  let {
    posterUrl,
    canvasWidth,
    canvasHeight,
    onUpload,
    onRemove,
    fieldMode = false,
    disabled = false,
  }: PlaceholderCanvasEditorProps = $props();

  let fileInputEl: HTMLInputElement | undefined = $state();

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      onUpload(file);
      input.value = '';
    }
  }
</script>

<div class="space-y-2">
  <!-- Section header -->
  <div class={cn(
    'flex items-center gap-1.5',
    fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
  )}>
    <Icon name="image" class="text-sm" />
    <span class="text-xs font-semibold uppercase tracking-wider">Poster Image</span>
  </div>

  <div class={cn(
    'flex items-start gap-3 p-3 border',
    fieldMode ? 'border-nb-black/80 bg-nb-black/50' : 'border-nb-black/20 bg-nb-white'
  )}>
    <!-- Poster preview thumbnail -->
    <div class={cn(
      'shrink-0 w-24 h-16 overflow-hidden flex items-center justify-center',
      fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
    )}>
      {#if posterUrl}
        <img
          src={posterUrl}
          alt="Poster preview"
          class="w-full h-full object-cover"
        />
      {:else}
        <Icon
          name="wallpaper"
          class={cn('text-2xl', fieldMode ? 'text-nb-black/80' : 'text-nb-black/30')}
        />
      {/if}
    </div>

    <!-- Info + Actions -->
    <div class="flex-1 min-w-0">
      {#if posterUrl}
        <div class={cn('text-xs truncate mb-2', fieldMode ? 'text-nb-black/30' : 'text-nb-black/60')}>
          {canvasWidth && canvasHeight ? `${canvasWidth} × ${canvasHeight}` : 'Custom poster'}
        </div>
      {:else}
        <div class={cn('text-xs mb-2', fieldMode ? 'text-nb-black/50' : 'text-nb-black/40')}>
          No poster image set
        </div>
      {/if}

      {#if !disabled}
        <div class="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onclick={() => fileInputEl?.click()}
          >
            <Icon name="upload" class="text-sm mr-1" />
            {posterUrl ? 'Replace' : 'Upload'}
          </Button>
          {#if posterUrl}
            <Button
              variant="ghost"
              size="sm"
              onclick={onRemove}
            >
              <Icon name="delete" class="text-sm mr-1 text-nb-red" />
              Remove
            </Button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Hidden file input (inside outer container so layout stays tidy) -->
  <input
    bind:this={fileInputEl}
    type="file"
    accept="image/*"
    onchange={handleFileChange}
    class="hidden"
    aria-label="Upload poster image"
  />
</div>
