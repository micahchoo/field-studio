<!--
  FileTreeNode Atom

  Single row in the staging file tree.
  Shows expand/collapse, icon, name, size/count badge, IIIF indicators,
  confidence badges for analyzer results, and unsupported file warnings.

  Ported from: src/features/staging/ui/atoms/FileTreeNode.tsx (180 lines)
-->
<script module lang="ts">
  import { MIME_TYPE_MAP } from '@/src/shared/constants/image';

  export function getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const entry = MIME_TYPE_MAP[ext];
    if (!entry) return 'insert_drive_file';
    switch (entry.type) {
      case 'Image': return 'image';
      case 'Sound': return 'audiotrack';
      case 'Video': return 'videocam';
      case 'Text': return 'description';
      case 'Dataset': return 'table_chart';
      case 'Model': return 'view_in_ar';
      default: return 'insert_drive_file';
    }
  }

  export function getDirIcon(intent?: string): string {
    switch (intent) {
      case 'Collection': return 'collections_bookmark';
      case 'Manifest': return 'auto_stories';
      case 'Range': return 'segment';
      default: return 'folder';
    }
  }

  export function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const val = bytes / Math.pow(1024, i);
    return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`;
  }

  export function getConfidenceColor(confidence: number): string {
    if (confidence > 0.8) return 'bg-nb-green';
    if (confidence > 0.5) return 'bg-nb-orange';
    return 'bg-nb-red';
  }
</script>

<script lang="ts">
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import ExpandButton from '@/src/features/structure-view/ui/atoms/ExpandButton.svelte';
  import type { FlatFileTreeNode } from '../../model';
  import type { IngestPreviewNode } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    node: FlatFileTreeNode;
    isSelected: boolean;
    onToggleExpand: (path: string) => void;
    onSelect: (path: string, additive: boolean) => void;
    onContextMenu: (e: MouseEvent, path: string, isDirectory: boolean) => void;
    onDragStart: (e: DragEvent, path: string) => void;
    analysisNode?: IngestPreviewNode;
    isUnsupported?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    node,
    isSelected,
    onToggleExpand,
    onSelect,
    onContextMenu,
    onDragStart,
    analysisNode,
    isUnsupported = false,
    cx,
    fieldMode = false,
  }: Props = $props();

  let annotations = $derived(node.annotations);
  let isExcluded = $derived(!!annotations.excluded);
  let hasBehaviors = $derived((annotations.iiifBehavior?.length ?? 0) > 0);
  let hasViewDir = $derived(!!annotations.viewingDirection);
  let hasRights = $derived(!!annotations.rights);
  let hasNavDate = $derived(!!annotations.navDate);
  let isStart = $derived(!!annotations.start);
  let hasIIIFMeta = $derived(
    hasBehaviors || hasViewDir || !!annotations.iiifIntent || hasRights || hasNavDate || isStart
  );

  let icon = $derived(
    node.isDirectory
      ? getDirIcon(annotations.iiifIntent)
      : isUnsupported ? 'block' : getFileIcon(node.name)
  );

  let iconColor = $derived(
    node.isDirectory
      ? annotations.iiifIntent ? 'text-nb-purple' : 'text-nb-blue'
      : isUnsupported ? 'text-nb-orange/60' : 'text-nb-black/50'
  );

  function handleClick(e: MouseEvent) {
    onSelect(node.path, e.metaKey || e.ctrlKey);
  }

  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    onContextMenu(e, node.path, node.isDirectory);
  }

  function handleDragStart(e: DragEvent) {
    onDragStart(e, node.path);
  }

  function handleExpandClick(e: MouseEvent) {
    e.stopPropagation();
    onToggleExpand(node.path);
  }
</script>

<div
  class={`flex items-center gap-1.5 py-1 px-2 cursor-pointer group text-sm select-none ${
    isSelected
      ? (cx?.selected ?? 'bg-nb-blue/15 text-nb-black')
      : `hover:bg-nb-cream/60 ${cx?.text ?? 'text-nb-black/80'}`
  } ${isExcluded ? 'opacity-40 line-through' : ''} ${isUnsupported && !isExcluded ? 'opacity-50' : ''}`}
  style:padding-left="{node.depth * 20 + 4}px"
  onclick={handleClick}
  oncontextmenu={handleContextMenu}
  draggable="true"
  ondragstart={handleDragStart}
  role="treeitem"
  aria-selected={isSelected}
  tabindex="0"
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(node.path, false); } }}
>
  <!-- Expand button -->
  <ExpandButton
    isExpanded={node.isExpanded}
    hasChildren={node.isDirectory && node.childCount > 0}
    onclick={handleExpandClick}
  />

  <!-- Icon -->
  <Icon name={icon} class={`text-base ${iconColor}`} />

  <!-- Name -->
  <span class={`flex-1 truncate text-xs ${isUnsupported ? 'line-through text-nb-black/40' : ''}`}>
    {node.name}
  </span>

  <!-- Confidence badge for directories with analysis -->
  {#if analysisNode && node.isDirectory && !isExcluded}
    <span
      class={`w-2 h-2 rounded-full ${getConfidenceColor(analysisNode.confidence)} flex-shrink-0`}
      title={`${analysisNode.proposedType} (${Math.round(analysisNode.confidence * 100)}%): ${analysisNode.detectionReasons.map(r => r.details).join('; ')}`}
    ></span>
  {/if}

  <!-- Unsupported file warning -->
  {#if isUnsupported && !isExcluded}
    <Icon name="warning" class="text-[10px] text-nb-orange flex-shrink-0" title="Unsupported format — will be skipped" />
  {/if}

  <!-- IIIF indicators -->
  {#if hasIIIFMeta && !isExcluded}
    <span class="flex gap-0.5">
      {#if annotations.iiifIntent}
        <span class="w-1.5 h-1.5 rounded-full bg-nb-purple" title={`Intent: ${annotations.iiifIntent}`}></span>
      {/if}
      {#if hasBehaviors}
        <span class="w-1.5 h-1.5 rounded-full bg-nb-orange" title={`Behaviors: ${annotations.iiifBehavior!.join(', ')}`}></span>
      {/if}
      {#if hasViewDir}
        <span class="w-1.5 h-1.5 rounded-full bg-nb-green" title={`Direction: ${annotations.viewingDirection}`}></span>
      {/if}
      {#if hasRights}
        <span class="w-1.5 h-1.5 rounded-full bg-nb-blue" title={`Rights: ${annotations.rights}`}></span>
      {/if}
      {#if hasNavDate}
        <span class="w-1.5 h-1.5 rounded-full bg-nb-teal" title={`Date: ${annotations.navDate}`}></span>
      {/if}
      {#if isStart}
        <Icon name="star" class="text-[10px] text-nb-yellow" />
      {/if}
    </span>
  {/if}

  <!-- Badge: file count or size -->
  {#if node.isDirectory}
    <span class={`text-[10px] tabular-nums whitespace-nowrap ${cx?.text ?? 'text-nb-black/40'}`}>
      {node.totalFileCount} file{node.totalFileCount !== 1 ? 's' : ''}
    </span>
  {:else}
    <span class={`text-[10px] tabular-nums whitespace-nowrap ${cx?.text ?? 'text-nb-black/40'}`}>
      {formatSize(node.size)}
    </span>
  {/if}
</div>
