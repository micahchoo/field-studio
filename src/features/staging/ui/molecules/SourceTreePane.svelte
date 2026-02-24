<!--
  SourceTreePane Molecule

  FileTree-based left pane for the staging workbench.
  Renders a nested folder/file tree with filtering, selection, drag-drop.

  Ported from: src/features/staging/ui/molecules/SourceTreePane.tsx (344 lines)
-->
<script module lang="ts">
  import type { FileTree } from '@/src/shared/types';
  import type { IngestPreviewNode } from '@/src/entities/manifest/model/ingest/ingestAnalyzer';

  /** Collect all directory paths at depth 0 (root-level dirs) */
  export function getRootDirPaths(tree: FileTree): string[] {
    const paths: string[] = [];
    for (const dir of tree.directories.values()) {
      paths.push(dir.path);
    }
    return paths;
  }

  /** Count all files recursively */
  export function countAllFiles(tree: FileTree): number {
    let count = tree.files.size;
    for (const dir of tree.directories.values()) {
      count += countAllFiles(dir);
    }
    return count;
  }

  /** Collect all ancestor paths for matching nodes (for filter auto-expand) */
  export function collectAncestorPaths(matchingPaths: Set<string>): Set<string> {
    const ancestors = new Set<string>();
    for (const p of matchingPaths) {
      const parts = p.split('/');
      let current = '';
      for (let i = 0; i < parts.length - 1; i++) {
        current = current ? `${current}/${parts[i]}` : parts[i];
        ancestors.add(current);
      }
    }
    return ancestors;
  }

  /** Collect all paths (dirs + files) that match filter text */
  export function collectMatchingPaths(tree: FileTree, filterLower: string, parentPath: string): Set<string> {
    const matches = new Set<string>();

    for (const [, dir] of tree.directories) {
      if (dir.name.toLowerCase().includes(filterLower)) {
        matches.add(dir.path);
      }
      const childMatches = collectMatchingPaths(dir, filterLower, dir.path);
      for (const m of childMatches) matches.add(m);
    }

    for (const [fileName] of tree.files) {
      if (fileName.toLowerCase().includes(filterLower)) {
        const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
        matches.add(filePath);
      }
    }

    return matches;
  }

  /** Find an IngestPreviewNode by path */
  export function findAnalysisNode(root: IngestPreviewNode | undefined, path: string): IngestPreviewNode | undefined {
    if (!root) return undefined;
    if (root.path === path) return root;
    for (const child of root.children) {
      const found = findAnalysisNode(child, path);
      if (found) return found;
    }
    return undefined;
  }
</script>

<script lang="ts">
  import type { SourceManifests } from '@/src/entities/collection/model/stagingService';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { NodeAnnotations, FlatFileTreeNode } from '../../model';
  import { flattenFileTree } from '../../model';
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import FileTreeNode from '../atoms/FileTreeNode.svelte';

  interface SourceTreePaneProps {
    fileTree: FileTree;
    sourceManifests: SourceManifests;
    annotationsMap: Map<string, NodeAnnotations>;
    onAnnotationChange: (path: string, ann: NodeAnnotations) => void;
    selectedPaths: string[];
    onSelect: (path: string, additive: boolean) => void;
    onPreviewSelect?: (node: FlatFileTreeNode) => void;
    onClearSelection: () => void;
    filterText: string;
    onFilterChange: (text: string) => void;
    onContextMenu: (e: MouseEvent, path: string, isDirectory: boolean) => void;
    onDragStart: (e: DragEvent, paths: string[]) => void;
    isFocused: boolean;
    onFocus: () => void;
    analysisRoot?: IngestPreviewNode;
    unsupportedPaths?: Set<string>;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    fileTree,
    sourceManifests,
    annotationsMap,
    selectedPaths,
    onSelect,
    onPreviewSelect,
    onClearSelection,
    filterText,
    onFilterChange,
    onContextMenu,
    onDragStart,
    isFocused,
    onFocus,
    analysisRoot,
    unsupportedPaths,
    cx,
    fieldMode,
  }: SourceTreePaneProps = $props();

  // --- Internal State ---
  // svelte-ignore state_referenced_locally -- intentional: initial computation from fileTree prop to seed expanded paths
  let expandedPaths = $state(new Set<string>(getRootDirPaths(fileTree)));

  // --- Derived Values ---
  let totalFiles = $derived(countAllFiles(fileTree));

  let pathToManifestIds = $derived.by(() => {
    const map = new Map<string, string[]>();
    for (const m of sourceManifests.manifests) {
      const dirPath = m.breadcrumbs.join('/');
      if (dirPath) {
        const existing = map.get(dirPath) || [];
        existing.push(m.id);
        map.set(dirPath, existing);
      }
      for (const f of m.files) {
        const filePath = dirPath ? `${dirPath}/${f.name}` : f.name;
        const existing = map.get(filePath) || [];
        existing.push(m.id);
        map.set(filePath, existing);
      }
    }
    return map;
  });

  let filterMatchPaths = $derived.by(() => {
    if (!filterText.trim()) return null;
    const lower = filterText.toLowerCase();
    return collectMatchingPaths(fileTree, lower, fileTree.path);
  });

  let filterExpandPaths = $derived.by(() => {
    if (!filterMatchPaths) return null;
    return collectAncestorPaths(filterMatchPaths);
  });

  let effectiveExpanded = $derived.by(() => {
    if (!filterExpandPaths) return expandedPaths;
    const merged = new Set(expandedPaths);
    for (const p of filterExpandPaths) merged.add(p);
    return merged;
  });

  let flatNodes = $derived(flattenFileTree(fileTree, effectiveExpanded, annotationsMap));

  let visibleNodes = $derived.by(() => {
    if (!filterMatchPaths) return flatNodes;
    return flatNodes.filter(n =>
      filterMatchPaths!.has(n.path) ||
      (filterExpandPaths && filterExpandPaths.has(n.path))
    );
  });

  // --- Handlers ---

  function handleToggleExpand(path: string) {
    const next = new Set(expandedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    expandedPaths = next;
  }

  function handleDragStart(e: DragEvent, path: string) {
    const paths = selectedPaths.includes(path) ? selectedPaths : [path];

    // Resolve file tree paths to SourceManifest IDs for ArchivePane drop compat
    const manifestIdSet = new Set<string>();
    for (const p of paths) {
      const ids = pathToManifestIds.get(p);
      if (ids) {
        ids.forEach(id => manifestIdSet.add(id));
      } else {
        // For directories that don't directly match, find manifests under this path
        for (const [key, keyIds] of pathToManifestIds) {
          if (key.startsWith(p + '/') || key === p) {
            keyIds.forEach(id => manifestIdSet.add(id));
          }
        }
      }
    }

    const manifestIds = [...manifestIdSet];
    e.dataTransfer!.setData('application/iiif-manifest-ids', JSON.stringify(manifestIds));
    e.dataTransfer!.effectAllowed = 'copyMove';

    // Custom drag ghost for multi-select
    if (paths.length > 1) {
      const ghost = document.createElement('div');
      ghost.className = 'fixed pointer-events-none bg-nb-blue text-white text-xs px-2 py-1 rounded shadow-lg z-[9999]';
      ghost.textContent = `${paths.length} files`;
      ghost.style.position = 'absolute';
      ghost.style.top = '-1000px';
      document.body.appendChild(ghost);
      e.dataTransfer!.setDragImage(ghost, 0, 0);
      requestAnimationFrame(() => document.body.removeChild(ghost));
    }

    onDragStart(e, paths);
  }

  function handleNodeClick(node: FlatFileTreeNode) {
    onPreviewSelect?.(node);
  }

  function handleBodyClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClearSelection();
  }
</script>

<div
  class={cn(
    'h-full flex flex-col border-r transition-nb',
    isFocused ? 'border-nb-blue/30' : (cx?.border ?? 'border-nb-black/20'),
    cx?.surface ?? 'bg-nb-cream/30',
  )}
  onclick={onFocus}
  role="presentation"
>
  <!-- Header -->
  <div class={cn('flex-shrink-0 p-3 border-b', cx?.border ?? 'border-nb-black/20', cx?.headerBg ?? 'bg-nb-cream/40')}>
    <div class="flex items-center justify-between mb-2">
      <h3 class={cn('font-bold flex items-center gap-2 text-sm', cx?.text ?? 'text-nb-black')}>
        <Icon name="source" class="text-nb-blue" />
        Source Files
      </h3>
      <div class="text-right">
        <span class={cn('text-xs', cx?.textMuted ?? 'text-nb-black/50')}>{totalFiles} files</span>
      </div>
    </div>

    <!-- Filter -->
    <div class="relative">
      <Icon
        name="search"
        class={cn('absolute left-2.5 top-1/2 -translate-y-1/2 text-sm', cx?.textMuted ?? 'text-nb-black/40')}
      />
      <input
        type="text"
        value={filterText}
        oninput={(e) => onFilterChange(e.currentTarget.value)}
        placeholder="Filter files..."
        class={cn('w-full pl-8 pr-3 py-1.5 text-xs border focus:ring-2 focus:ring-nb-blue focus:border-nb-blue outline-none', cx?.input ?? 'border-nb-black/20')}
      />
      {#if filterText}
        <Button
          onclick={() => onFilterChange('')}
          variant="ghost"
          size="sm"
          aria-label="Clear filter"
          class="absolute right-2 top-1/2 -translate-y-1/2"
        >
          <Icon name="close" class="text-sm" />
        </Button>
      {/if}
    </div>

    {#if filterText}
      <div class={cn('mt-1.5 text-[10px]', cx?.textMuted ?? 'text-nb-black/50')}>
        {visibleNodes.length} of {flatNodes.length} nodes
      </div>
    {/if}
  </div>

  <!-- Tree -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="flex-1 overflow-y-auto"
    onclick={handleBodyClick}
    role="tree"
    tabindex="0"
  >
    {#if visibleNodes.length === 0}
      <div class={cn('p-6 text-center', cx?.textMuted ?? 'text-nb-black/40')}>
        <Icon name="folder_open" class="text-3xl mb-2 opacity-50" />
        <p class="text-xs">{filterText ? 'No files match your filter' : 'No files'}</p>
      </div>
    {:else}
      {#each visibleNodes as node (node.path)}
        <FileTreeNode
          {node}
          isSelected={selectedPaths.includes(node.path)}
          onToggleExpand={handleToggleExpand}
          onSelect={(path, additive) => {
            onSelect(path, additive);
            handleNodeClick(node);
          }}
          {onContextMenu}
          onDragStart={handleDragStart}
          analysisNode={node.isDirectory ? findAnalysisNode(analysisRoot, node.path) : undefined}
          isUnsupported={!node.isDirectory && unsupportedPaths?.has(node.path)}
        />
      {/each}
    {/if}
  </div>

  <!-- Footer -->
  {#if selectedPaths.length > 0}
    <div class={cn('flex-shrink-0 p-2 border-t', cx?.border ?? 'border-nb-black/20', cx?.headerBg ?? 'bg-nb-cream/40')}>
      <div class="flex items-center justify-between">
        <span class={cn('text-xs', cx?.textMuted ?? 'text-nb-black/60')}>{selectedPaths.length} selected</span>
        <button
          onclick={onClearSelection}
          class="text-xs text-nb-blue hover:text-nb-blue font-medium"
        >
          Clear
        </button>
      </div>
    </div>
  {/if}
</div>
