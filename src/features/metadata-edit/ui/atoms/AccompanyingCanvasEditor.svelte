<!--
  AccompanyingCanvasEditor — IIIF accompanyingCanvas selector/editor atom.
  React source: src/features/metadata-edit/ui/atoms/AccompanyingCanvasEditor.tsx (171 lines)
  Architecture: Atom (local UI state only — url input + showUrlInput toggle)
-->
<script module lang="ts">
  export interface AccompanyingCanvasEditorProps {
    /** Current accompanying canvas URL */
    contentUrl?: string;
    /** Type of accompanying content */
    contentType?: 'transcript' | 'image' | 'other';
    /** Called when content file is uploaded */
    onUpload: (file: File) => void;
    /** Called when URL is set manually */
    onSetUrl: (url: string) => void;
    /** Called when content is removed */
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
    contentUrl,
    contentType,
    onUpload,
    onSetUrl,
    onRemove,
    fieldMode = false,
    disabled = false,
  }: AccompanyingCanvasEditorProps = $props();

  let urlInput = $state('');
  let showUrlInput = $state(false);
  let fileInputEl: HTMLInputElement | undefined = $state();

  const typeIcons: Record<string, string> = {
    transcript: 'subtitles',
    image: 'image',
    other: 'attachment',
  };

  function handleFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      onUpload(file);
      input.value = '';
    }
  }

  function handleSetUrl() {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onSetUrl(trimmed);
      urlInput = '';
      showUrlInput = false;
    }
  }

  let labelClass = $derived(
    cn(
      'flex items-center gap-1.5',
      fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
    )
  );
</script>

<div class="space-y-2">
  <!-- Section header -->
  <div class={labelClass}>
    <Icon name="picture_in_picture" class="text-sm" />
    <span class="text-xs font-semibold uppercase tracking-wider">Accompanying Content</span>
  </div>

  {#if contentUrl}
    <!-- Content present: show info row -->
    <div class={cn(
      'flex items-center gap-3 px-3 py-2.5 border',
      fieldMode ? 'border-nb-black/80 bg-nb-black/50' : 'border-nb-black/20 bg-nb-white'
    )}>
      <Icon
        name={typeIcons[contentType ?? 'other']}
        class={cn('text-lg', fieldMode ? 'text-nb-black/40' : 'text-nb-black/50')}
      />
      <div class="flex-1 min-w-0">
        <div class={cn('text-xs font-medium', fieldMode ? 'text-white' : 'text-nb-black/80')}>
          {contentType === 'transcript' ? 'Transcript (VTT)'
            : contentType === 'image' ? 'Accompanying Image'
            : 'Accompanying Content'}
        </div>
        <div class={cn('text-[10px] truncate', fieldMode ? 'text-nb-black/50' : 'text-nb-black/40')}>
          {contentUrl}
        </div>
      </div>
      {#if !disabled}
        <Button
          variant="ghost"
          size="bare"
          onclick={onRemove}
          aria-label="Remove accompanying content"
          class="p-1"
        >
          <Icon name="close" class="text-sm text-nb-red" />
        </Button>
      {/if}
    </div>

  {:else if !disabled}
    <!-- No content: show upload / set-url actions -->
    <div class="space-y-2">
      {#if showUrlInput}
        <div class="flex gap-2">
          <input
            type="url"
            bind:value={urlInput}
            placeholder="https://example.org/transcript.vtt"
            class={cn(
              'flex-1 text-sm border px-2 py-1.5 outline-none',
              fieldMode
                ? 'bg-nb-black border-nb-black/60 text-white placeholder:text-nb-black/40'
                : 'bg-nb-white border-nb-black/20 text-nb-black/80'
            )}
          />
          <Button variant="primary" size="sm" onclick={handleSetUrl} disabled={!urlInput.trim()}>
            Set
          </Button>
          <Button variant="ghost" size="sm" onclick={() => { showUrlInput = false; }}>
            Cancel
          </Button>
        </div>
      {:else}
        <div class="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onclick={() => fileInputEl?.click()}
          >
            <Icon name="upload" class="text-sm mr-1" />
            Upload VTT/File
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onclick={() => { showUrlInput = true; }}
          >
            <Icon name="link" class="text-sm mr-1" />
            Set URL
          </Button>
        </div>
      {/if}
    </div>

  {:else}
    <div class={cn('text-xs', fieldMode ? 'text-nb-black/60' : 'text-nb-black/40')}>
      No accompanying content
    </div>
  {/if}

  <!-- Hidden file input -->
  <input
    bind:this={fileInputEl}
    type="file"
    accept=".vtt,.srt,.txt,image/*"
    onchange={handleFileChange}
    class="hidden"
    aria-label="Upload accompanying content"
  />
</div>
