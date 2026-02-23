<!--
  PreviewPane Molecule

  Collapsible right panel showing preview of selected file or folder.
  Supports image, audio, video, and directory preview with metadata display.

  Ported from: src/features/staging/ui/molecules/PreviewPane.tsx (286 lines)
-->
<script module lang="ts">
  import { MIME_TYPE_MAP } from '@/src/shared/constants/image';

  export function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, i);
    return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
  }

  export function getFileType(name: string): { type: string; format: string } | null {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const entry = MIME_TYPE_MAP[ext];
    if (!entry) return null;
    return { type: entry.type, format: entry.format };
  }

  export function isSupported(name: string): boolean {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return !!MIME_TYPE_MAP[ext];
  }

  export const SUPPORTED_FORMATS = [
    { category: 'Images', exts: 'jpg, jpeg, png, webp, gif, avif, bmp, tiff, tif, svg' },
    { category: 'Audio', exts: 'mp3, wav, ogg, m4a, aac, flac' },
    { category: 'Video', exts: 'mp4, webm, mov' },
    { category: 'Documents', exts: 'pdf, txt, csv' },
    { category: '3D', exts: 'glb, gltf' },
  ];
</script>

<script lang="ts">
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { FlatFileTreeNode, NodeAnnotations } from '../../model';
  import type { IngestPreviewNode } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';

  interface Props {
    target: FlatFileTreeNode | null;
    annotations: NodeAnnotations;
    analysisNode?: IngestPreviewNode;
    onClose: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    target,
    annotations,
    analysisNode,
    onClose,
    cx,
    fieldMode = false,
  }: Props = $props();

  let objectUrl = $state<string | null>(null);

  let supported = $derived(
    target ? (target.isDirectory || (target.file && isSupported(target.name))) : false
  );

  let fileInfo = $derived(
    target && !target.isDirectory ? getFileType(target.name) : null
  );

  /* eslint-disable @field-studio/lifecycle-restrictions -- createObjectURL/revokeObjectURL is DOM resource lifecycle (acquire/cleanup), not an external service call. Must use $effect for cleanup return. */
  $effect(() => {
    const file = target?.file;

    if (!target || target.isDirectory || !file || !isSupported(target.name)) {
      objectUrl = null;
      return;
    }

    const url = URL.createObjectURL(file);
    objectUrl = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  });
  /* eslint-enable @field-studio/lifecycle-restrictions */
</script>

{#snippet FilePreview(file: File)}
  {#if objectUrl}
    {#if fileInfo?.type === 'Image'}
      <div class="flex items-center justify-center bg-nb-black/5 p-2 min-h-[200px]">
        <img
          src={objectUrl}
          alt={file.name}
          class="max-w-full max-h-[300px] object-contain"
        />
      </div>
    {:else if fileInfo?.type === 'Sound'}
      <div class="p-4 flex flex-col items-center gap-3">
        <Icon name="audiotrack" class="text-4xl text-nb-purple/60" />
        <audio controls src={objectUrl} class="w-full"></audio>
      </div>
    {:else if fileInfo?.type === 'Video'}
      <div class="bg-nb-black/5 p-2">
        <video controls src={objectUrl} class="max-w-full max-h-[300px]"></video>
      </div>
    {/if}
  {/if}
{/snippet}

{#snippet DirectoryPreview(node: FlatFileTreeNode, analysis?: IngestPreviewNode)}
  <div class="p-4 space-y-3">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-12 h-12 bg-nb-blue/10 flex items-center justify-center">
        <Icon name="folder" class="text-2xl text-nb-blue" />
      </div>
      <div>
        <p class="font-medium text-nb-black/80">{node.name}</p>
        <p class="text-xs text-nb-black/50">{node.totalFileCount} files</p>
      </div>
    </div>

    {#if analysis}
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-nb-black/50">Detected as</span>
          <span class="font-medium text-nb-black/80">{analysis.proposedType}</span>
        </div>
        <div class="flex items-center justify-between text-xs">
          <span class="text-nb-black/50">Confidence</span>
          <span class={`font-medium ${
            analysis.confidence > 0.8 ? 'text-nb-green' :
            analysis.confidence > 0.5 ? 'text-nb-orange' : 'text-nb-red'
          }`}>
            {Math.round(analysis.confidence * 100)}%
          </span>
        </div>

        {#if analysis.stats}
          <div class="border-t border-nb-black/10 pt-2 mt-2 space-y-1">
            {#if analysis.stats.imageCount > 0}
              <div class="flex justify-between text-xs">
                <span class="text-nb-black/50">Images</span>
                <span>{analysis.stats.imageCount}</span>
              </div>
            {/if}
            {#if analysis.stats.videoCount > 0}
              <div class="flex justify-between text-xs">
                <span class="text-nb-black/50">Videos</span>
                <span>{analysis.stats.videoCount}</span>
              </div>
            {/if}
            {#if analysis.stats.audioCount > 0}
              <div class="flex justify-between text-xs">
                <span class="text-nb-black/50">Audio</span>
                <span>{analysis.stats.audioCount}</span>
              </div>
            {/if}
            {#if analysis.stats.hasSequencePattern}
              <div class="flex justify-between text-xs">
                <span class="text-nb-black/50">Pattern</span>
                <span class="text-nb-purple">Sequence detected</span>
              </div>
            {/if}
          </div>
        {/if}

        {#if analysis.detectionReasons.length > 0}
          <div class="border-t border-nb-black/10 pt-2 mt-2">
            <p class="text-[10px] text-nb-black/40 uppercase tracking-wider mb-1">Detection Reasons</p>
            {#each analysis.detectionReasons as r}
              <p class="text-xs text-nb-black/60">{r.details}</p>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#snippet UnsupportedPreview(node: FlatFileTreeNode)}
  {@const ext = node.name.split('.').pop()?.toLowerCase() || ''}
  <div class="p-4 space-y-4">
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 bg-nb-orange/10 flex items-center justify-center">
        <Icon name="warning" class="text-2xl text-nb-orange" />
      </div>
      <div>
        <p class="font-medium text-nb-black/80">{node.name}</p>
        <p class="text-xs text-nb-red">Unsupported format (.{ext})</p>
      </div>
    </div>

    <div class="text-xs text-nb-black/50 space-y-1">
      <p>Size: {formatSize(node.size)}</p>
      <p>This file will be skipped during import.</p>
    </div>

    <div class="border-t border-nb-black/10 pt-3">
      <p class="text-[10px] text-nb-black/40 uppercase tracking-wider mb-2">Supported Formats</p>
      {#each SUPPORTED_FORMATS as f}
        <div class="mb-1">
          <span class="text-xs font-medium text-nb-black/60">{f.category}: </span>
          <span class="text-xs text-nb-black/40">{f.exts}</span>
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#if target}
  <div class={cn('h-full flex flex-col border-l overflow-hidden', cx?.surface ?? 'bg-nb-cream/30', cx?.border ?? 'border-nb-black/20')}>
    <!-- Header -->
    <div class={cn('flex-shrink-0 p-3 border-b flex items-center justify-between', cx?.border ?? 'border-nb-black/20', cx?.headerBg ?? 'bg-nb-cream/40')}>
      <div class="flex items-center gap-2 min-w-0">
        <Icon name="preview" class="text-nb-blue text-sm" />
        <span class={cn('text-sm font-medium truncate', cx?.text ?? 'text-nb-black/80')}>{target.name}</span>
      </div>
      <Button
        variant="ghost"
        size="bare"
        onclick={onClose}
        class={cn('p-1 hover:bg-nb-cream', cx?.textMuted ?? 'text-nb-black/40')}
      >
        <Icon name="close" class="text-sm" />
      </Button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      {#if target.isDirectory}
        {@render DirectoryPreview(target, analysisNode)}
      {:else if !supported}
        {@render UnsupportedPreview(target)}
      {:else if target.file}
        <div>
          {@render FilePreview(target.file)}
          <div class={cn('p-3 border-t space-y-1', cx?.divider ?? 'border-nb-black/10')}>
            <div class="flex justify-between text-xs">
              <span class={cx?.textMuted ?? 'text-nb-black/50'}>Size</span>
              <span class={cx?.text ?? 'text-nb-black/70'}>{formatSize(target.size)}</span>
            </div>
            {#if fileInfo}
              <div class="flex justify-between text-xs">
                <span class={cx?.textMuted ?? 'text-nb-black/50'}>Type</span>
                <span class={cx?.text ?? 'text-nb-black/70'}>{fileInfo.type}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class={cx?.textMuted ?? 'text-nb-black/50'}>Format</span>
                <span class={cx?.text ?? 'text-nb-black/70'}>{fileInfo.format}</span>
              </div>
            {/if}
            {#if annotations.rights}
              <div class="flex justify-between text-xs">
                <span class={cx?.textMuted ?? 'text-nb-black/50'}>Rights</span>
                <span class={cn('truncate ml-2', cx?.text ?? 'text-nb-black/70')}>{annotations.rights}</span>
              </div>
            {/if}
            {#if annotations.navDate}
              <div class="flex justify-between text-xs">
                <span class={cx?.textMuted ?? 'text-nb-black/50'}>Date</span>
                <span class={cx?.text ?? 'text-nb-black/70'}>{annotations.navDate}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
