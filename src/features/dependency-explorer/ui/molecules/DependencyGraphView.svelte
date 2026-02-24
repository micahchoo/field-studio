<!--
  DependencyGraphView — Tree-like directory visualization
  React source: ui/DependencyGraphView.tsx (172 lines)
  Architecture: Molecule (derived tree data, composes FileIcon atom)
-->
<script module lang="ts">
  /** Color classes by FSD directory type */
  const DIR_COLORS: Record<string, string> = {
    feature: 'border-nb-purple/20 bg-nb-purple/5',
    shared: 'border-nb-blue/30 bg-nb-blue/10',
    entity: 'border-nb-green/30 bg-nb-green/10',
    entities: 'border-nb-green/30 bg-nb-green/10',
    widget: 'border-nb-orange bg-nb-orange/10',
    widgets: 'border-nb-orange bg-nb-orange/10',
    app: 'border-nb-red/30 bg-nb-red/10',
  };

  interface TreeNode {
    key: string;
    fullPath: string;
    files: import('../../types').FileAnalysis[];
    children: TreeNode[];
  }

  function buildTree(
    node: Record<string, unknown>,
    path: string
  ): TreeNode[] {
    const result: TreeNode[] = [];
    for (const [key, value] of Object.entries(node)) {
      if (key === '__files') continue;
      const fullPath = path ? `${path}/${key}` : key;
      const v = value as Record<string, unknown>;
      result.push({
        key,
        fullPath,
        files: (v.__files as import('../../types').FileAnalysis[]) || [],
        children: buildTree(v, fullPath),
      });
    }
    return result;
  }

  function getDirColor(key: string): string {
    for (const [pattern, cls] of Object.entries(DIR_COLORS)) {
      if (key.includes(pattern)) return cls;
    }
    return 'border-nb-black/20 bg-nb-white';
  }
</script>

<script lang="ts">
  import type { FileAnalysis } from '../../types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import FileIcon from '../atoms/FileIcon.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    files: FileAnalysis[];
    selectedFile: FileAnalysis | null;
    onSelectFile: (file: FileAnalysis) => void;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { files, selectedFile, onSelectFile, cx = {} as ContextualClassNames, fieldMode = false }: Props = $props();

  /** Build nested directory tree from flat file list */
  let treeData = $derived.by(() => {
    const root: Record<string, unknown> = {};
    for (const file of files) {
      const parts = file.directory.split('/');
      let current = root as Record<string, Record<string, unknown>>;
      for (const part of parts) {
        if (!current[part]) current[part] = { __files: [] };
        current = current[part] as Record<string, Record<string, unknown>>;
      }
      (current as unknown as { __files: FileAnalysis[] }).__files.push(file);
    }
    return buildTree(root, '');
  });
</script>

{#if files.length === 0}
  <div class="flex items-center justify-center h-full text-nb-black/50">
    No files to display
  </div>
{:else}
  <div class="h-full overflow-auto p-4">
    <div class="max-w-6xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each treeData as node (node.fullPath)}
          {@const colorClass = getDirColor(node.key)}
          <div class={cn('border overflow-hidden', colorClass)}>
            <div class="px-3 py-2 border-b border-inherit bg-nb-cream/20">
              <div class="flex items-center gap-2">
                <Icon name="folder" class="text-sm text-nb-black/50" />
                <span class="font-medium text-nb-black/70 text-sm">{node.key}</span>
                <span class="text-xs text-nb-black/40">({node.files.length} files)</span>
              </div>
            </div>

            {#if node.files.length > 0}
              <div class="divide-y divide-nb-black/10">
                {#each node.files as file (file.filePath)}
                  <button
                    type="button"
                    class={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-left hover:bg-nb-white/80 transition-nb',
                      selectedFile?.filePath === file.filePath ? 'bg-nb-blue/10' : ''
                    )}
                    onclick={() => onSelectFile(file)}
                  >
                    <div class="flex items-center gap-2 min-w-0">
                      <FileIcon extension={file.extension} />
                      <span class="text-sm text-nb-black/70 truncate">{file.fileName}</span>
                    </div>
                    {#if file.dependents.length > 0}
                      <span class="flex items-center gap-0.5 text-xs text-nb-black/40">
                        <Icon name="arrow_back" class="text-xs" />
                        {file.dependents.length}
                      </span>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}

            <!-- Nested directories -->
            {#if node.children.length > 0}
              <div class="px-2 pb-2">
                <div class="border-l-2 border-nb-black/20 pl-2 space-y-2 mt-2">
                  {#each node.children as child (child.fullPath)}
                    {@const childColor = getDirColor(child.key)}
                    <div class={cn('border overflow-hidden', childColor)}>
                      <div class="px-3 py-2 border-b border-inherit bg-nb-cream/20">
                        <div class="flex items-center gap-2">
                          <Icon name="folder" class="text-sm text-nb-black/50" />
                          <span class="font-medium text-nb-black/70 text-sm">{child.key}</span>
                          <span class="text-xs text-nb-black/40">({child.files.length} files)</span>
                        </div>
                      </div>
                      {#if child.files.length > 0}
                        <div class="divide-y divide-nb-black/10">
                          {#each child.files as childFile (childFile.filePath)}
                            <button
                              type="button"
                              class={cn(
                                'w-full flex items-center justify-between px-3 py-2 text-left hover:bg-nb-white/80 transition-nb',
                                selectedFile?.filePath === childFile.filePath ? 'bg-nb-blue/10' : ''
                              )}
                              onclick={() => onSelectFile(childFile)}
                            >
                              <div class="flex items-center gap-2 min-w-0">
                                <FileIcon extension={childFile.extension} />
                                <span class="text-sm text-nb-black/70 truncate">{childFile.fileName}</span>
                              </div>
                              {#if childFile.dependents.length > 0}
                                <span class="flex items-center gap-0.5 text-xs text-nb-black/40">
                                  <Icon name="arrow_back" class="text-xs" />
                                  {childFile.dependents.length}
                                </span>
                              {/if}
                            </button>
                          {/each}
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}
