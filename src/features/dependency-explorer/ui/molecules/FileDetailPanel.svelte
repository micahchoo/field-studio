<!--
  FileDetailPanel — Right sidebar showing detailed file information
  React source: ui/FileDetailPanel.tsx (243 lines)
  Architecture: Molecule (derived state from props)
-->
<script lang="ts">
  import type { FileAnalysis } from '../../types';
  import { formatBytes } from '../../lib/markdownFormatters';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    file: FileAnalysis;
    allFiles: Record<string, FileAnalysis>;
    onClose: () => void;
    onSelectFile: (file: FileAnalysis) => void;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { file, allFiles, onClose, onSelectFile, cx = {} as ContextualClassNames, fieldMode = false }: Props = $props();

  let externalImports = $derived(file.imports.filter(i => i.isExternal));
  let internalImports = $derived(file.imports.filter(i => !i.isExternal && !i.isInternalAlias));
  let aliasImports = $derived(file.imports.filter(i => i.isInternalAlias));

  function handleFileClick(filePath: string) {
    const targetFile = allFiles[filePath];
    if (targetFile) onSelectFile(targetFile);
  }
</script>

<div class="w-96 border-l border-nb-black/20 bg-nb-cream overflow-auto">
  <!-- Sticky Header -->
  <div class="sticky top-0 bg-nb-white backdrop-blur border-b border-nb-black/20 p-4">
    <div class="flex items-start justify-between gap-2">
      <div>
        <h2 class="font-semibold text-nb-black/70 break-all">{file.fileName}</h2>
        <p class="text-xs text-nb-black/50 font-mono mt-1">{file.directory}/</p>
      </div>
      <Button variant="ghost" size="bare" onclick={onClose} class="p-1 text-nb-black/40 hover:text-nb-black/60">
        {#snippet children()}<Icon name="close" class="text-sm" />{/snippet}
      </Button>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-3 gap-2 mt-4">
      {#each [
        { value: file.imports.length, label: 'Imports' },
        { value: file.exports.length, label: 'Exports' },
        { value: file.dependents.length, label: 'Used By' },
      ] as stat (stat.label)}
        <div class="text-center p-2 bg-nb-white/80">
          <div class="text-lg font-semibold text-nb-black/70">{stat.value}</div>
          <div class="text-xs text-nb-black/50">{stat.label}</div>
        </div>
      {/each}
    </div>
  </div>

  <div class="p-4 space-y-6">
    <!-- Exports -->
    {#if file.exports.length > 0}
      <section>
        <h3 class="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
          <Icon name="logout" class="text-sm text-nb-green" />
          Exports ({file.exports.length})
        </h3>
        <div class="space-y-1">
          {#each file.exports as exp, idx (idx)}
            <div class="flex items-center gap-2 px-2 py-1.5 bg-nb-white/80 text-sm">
              <span class={cn(
                'text-xs px-1.5 py-0.5',
                exp.type === 'default' ? 'bg-nb-blue/20 text-nb-blue' : 'bg-nb-cream text-nb-black/50'
              )}>
                {exp.type}
              </span>
              <span class="font-mono text-nb-black/70">{exp.name}</span>
              {#if exp.isTypeExport}
                <span class="text-xs text-nb-purple">type</span>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Alias Imports -->
    {#if aliasImports.length > 0}
      <section>
        <h3 class="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
          <Icon name="shortcut" class="text-sm text-nb-purple" />
          Alias Imports ({aliasImports.length})
        </h3>
        <div class="space-y-1">
          {#each aliasImports as imp, idx (idx)}
            <div class="px-2 py-1.5 bg-nb-white/80 text-sm">
              <div class="font-mono text-xs text-nb-purple">{imp.source}</div>
              {#if imp.specifiers.length > 0 && !imp.specifiers[0].startsWith('[')}
                <div class="text-xs text-nb-black/50 mt-1">
                  {imp.specifiers.slice(0, 5).join(', ')}
                  {#if imp.specifiers.length > 5}
                    +{imp.specifiers.length - 5} more
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Internal Imports -->
    {#if internalImports.length > 0}
      <section>
        <h3 class="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
          <Icon name="arrow_forward" class="text-sm text-nb-blue" />
          Internal Imports ({internalImports.length})
        </h3>
        <div class="space-y-1">
          {#each internalImports as imp, idx (idx)}
            {@const resolvedFile = file.dependencies[idx]}
            <div class="px-2 py-1.5 bg-nb-white/80 text-sm">
              <div class="font-mono text-xs text-nb-blue">{imp.source}</div>
              {#if resolvedFile}
                <button
                  type="button"
                  class="text-xs text-nb-black/50 hover:text-nb-blue mt-1 flex items-center gap-1"
                  onclick={() => handleFileClick(resolvedFile)}
                >
                  <Icon name="open_in_new" class="text-xs" />
                  {resolvedFile.split('/').pop()}
                </button>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- External Dependencies -->
    {#if externalImports.length > 0}
      <section>
        <h3 class="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
          <Icon name="language" class="text-sm text-nb-orange" />
          External Dependencies ({externalImports.length})
        </h3>
        <div class="flex flex-wrap gap-1">
          {#each externalImports as imp, idx (idx)}
            <span class="px-2 py-1 bg-nb-orange/20 text-nb-orange text-xs border border-nb-orange">
              {imp.source}
            </span>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Dependents -->
    {#if file.dependents.length > 0}
      <section>
        <h3 class="text-sm font-medium text-nb-black/70 mb-2 flex items-center gap-2">
          <Icon name="arrow_back" class="text-sm text-nb-green" />
          Used By ({file.dependents.length})
        </h3>
        <div class="space-y-1 max-h-48 overflow-auto">
          {#each file.dependents as depPath, idx (idx)}
            <button
              type="button"
              class="w-full text-left px-2 py-1.5 bg-nb-white/80 text-sm hover:bg-nb-cream transition-nb"
              onclick={() => handleFileClick(depPath)}
            >
              <div class="font-mono text-xs text-nb-black/50 truncate">{depPath}</div>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <!-- File Info -->
    <section class="pt-4 border-t border-nb-black/20">
      <h3 class="text-sm font-medium text-nb-black/70 mb-2">File Info</h3>
      <div class="space-y-1 text-sm text-nb-black/50">
        <div class="flex justify-between"><span>Lines:</span><span>{file.lines}</span></div>
        <div class="flex justify-between"><span>Size:</span><span>{formatBytes(file.size)}</span></div>
        <div class="flex justify-between"><span>Extension:</span><span>{file.extension}</span></div>
      </div>
    </section>
  </div>
</div>
