<!--
  DependencyExplorer — Main admin tool organism
  React source: ui/DependencyExplorer.tsx (408 lines)
  Architecture: Organism (composes molecules, manages view routing + store)
-->
<script module lang="ts">
  const VIEW_TABS = [
    { id: 'list', label: 'List', icon: 'list' },
    { id: 'graph', label: 'Graph', icon: 'hub' },
    { id: 'architecture', label: 'Architecture', icon: 'architecture' },
    { id: 'stats', label: 'Stats', icon: 'bar_chart' },
    { id: 'circular', label: 'Circular', icon: 'sync_problem' },
    { id: 'orphans', label: 'Orphans', icon: 'link_off' },
  ] as const;
</script>

<script lang="ts">
  import type { FileAnalysis, FilterType, ViewMode } from '../../types';
  import { DependencyDataStore } from '../../stores/dependencyData.svelte';
  import { formatBytes } from '../../lib/markdownFormatters';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  // Molecule panels
  import FileDetailPanel from '../molecules/FileDetailPanel.svelte';
  import DependencyGraphView from '../molecules/DependencyGraphView.svelte';
  import ArchitecturePanel from '../molecules/ArchitecturePanel.svelte';
  import StatsPanel from '../molecules/StatsPanel.svelte';
  import CircularDepsPanel from '../molecules/CircularDepsPanel.svelte';
  import OrphansPanel from '../molecules/OrphansPanel.svelte';

  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  // Store instance
  const store = new DependencyDataStore();

  // Local UI state
  let viewMode = $state<ViewMode>('list');
  let selectedFile = $state<FileAnalysis | null>(null);
  let showExternalDeps = $state(false);

  // Admin access check
  let hasAdminAccess = $derived.by(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('admin') === 'true' || localStorage.getItem('adminMode') === 'true';
  });

  // Persist admin mode if URL param present + load data
  $effect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      localStorage.setItem('adminMode', 'true');
    }
  });

  // Load data on mount and refresh
  $effect(() => {
    const controller = new AbortController();
    store.loadData(controller.signal);
    return () => controller.abort();
  });

  function handleSelectFile(file: FileAnalysis) {
    selectedFile = file;
  }

  function clearSelectedFile() {
    selectedFile = null;
  }
</script>

{#if !hasAdminAccess}
  <!-- Access Denied -->
  <div class={cn('flex items-center justify-center h-full', className)}>
    <div class="text-center p-8 bg-nb-cream">
      <Icon name="lock" class="text-4xl text-nb-black/40 mb-4" />
      <h2 class="text-xl font-semibold text-nb-black/70 mb-2">Admin Access Required</h2>
      <p class="text-nb-black/50 mb-4">
        The Dependency Explorer is only accessible to administrators.
      </p>
      <code class="text-sm bg-nb-cream/80 px-2 py-1">Add ?admin=true to URL</code>
    </div>
  </div>
{:else if store.isLoading}
  <!-- Loading -->
  <div class={cn('flex items-center justify-center h-full', className)}>
    <div class="flex items-center gap-3 text-nb-black/50">
      <div class="w-5 h-5 border-2 border-nb-black/20 border-t-nb-black/60 animate-spin" ></div>
      <span>Loading dependency graph...</span>
    </div>
  </div>
{:else if store.error}
  <!-- Error -->
  <div class={cn('flex items-center justify-center h-full', className)}>
    <div class="text-center p-8 bg-nb-red/10">
      <Icon name="error" class="text-4xl text-nb-red mb-4" />
      <h2 class="text-xl font-semibold text-nb-red mb-2">Failed to Load Data</h2>
      <p class="text-nb-red/60 mb-4">{store.error.message}</p>
      <button
        type="button"
        class="px-4 py-2 bg-nb-red text-white hover:bg-nb-red/90 transition-nb"
        onclick={() => store.refresh()}
      >
        Retry
      </button>
    </div>
  </div>
{:else if !store.data}
  <!-- No Data -->
  <div class={cn('flex items-center justify-center h-full', className)}>
    <div class="text-center p-8">
      <Icon name="analytics" class="text-4xl text-nb-black/30 mb-4" />
      <h2 class="text-lg font-semibold text-nb-black/50 mb-2">No Data Available</h2>
      <p class="text-nb-black/40">
        Run <code class="bg-nb-cream px-1">npm run analyze</code> to generate dependency data.
      </p>
    </div>
  </div>
{:else}
  <!-- Main Content -->
  <div class={cn('flex flex-col h-full bg-nb-white', className)}>
    <!-- Header -->
    <header class="flex flex-wrap items-center gap-4 p-4 border-b border-nb-black/20 bg-nb-white">
      <div class="flex items-center gap-2">
        <Icon name="account_tree" class="text-nb-black/50" />
        <h1 class="text-lg font-semibold text-nb-black/70">Dependency Explorer</h1>
        <span class="text-xs text-nb-black/50">
          Generated: {new Date(store.data.generatedAt).toLocaleString()}
        </span>
      </div>

      <div class="flex-1" ></div>

      <!-- View Mode Tabs -->
      <div class="flex items-center gap-1 bg-nb-cream/80 p-1">
        {#each VIEW_TABS as tab (tab.id)}
          <button
            type="button"
            class={cn(
              'flex items-center gap-1 px-3 py-1.5 text-sm font-medium transition-nb',
              viewMode === tab.id
                ? 'bg-nb-white/60 text-nb-black/70 shadow-sm'
                : 'text-nb-black/50 hover:text-nb-black'
            )}
            aria-label={tab.label}
            onclick={() => { viewMode = tab.id as ViewMode; }}
          >
            <Icon name={tab.icon} class="text-sm" />
            <span class="hidden sm:inline">{tab.label}</span>
          </button>
        {/each}
      </div>

      <button
        type="button"
        class="p-2 text-nb-black/50 hover:text-nb-black/80 hover:bg-nb-cream"
        title="Refresh"
        onclick={() => store.refresh()}
      >
        <Icon name="refresh" class="text-sm" />
      </button>
    </header>

    <!-- Toolbar -->
    <div class="flex flex-wrap items-center gap-3 p-3 border-b border-nb-black/20 bg-nb-white">
      <!-- Search -->
      <div class="relative flex-1 min-w-[200px] max-w-md">
        <Icon name="search" class="absolute left-3 top-1/2 -translate-y-1/2 text-nb-black/40 text-sm" />
        <input
          type="text"
          placeholder="Search files, exports, imports..."
          value={store.searchQuery}
          oninput={(e) => store.setSearch(e.currentTarget.value)}
          class="w-full pl-9 pr-3 py-1.5 text-sm border border-nb-black/20 bg-nb-white text-nb-black focus:ring-2 focus:ring-nb-blue focus:border-transparent"
        />
        {#if store.searchQuery}
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-nb-black/40 hover:text-nb-black/60"
            onclick={() => store.setSearch('')}
          >
            <Icon name="close" class="text-sm" />
          </button>
        {/if}
      </div>

      <!-- Filter Type -->
      <select
        value={store.filterType}
        onchange={(e) => store.setFilter(e.currentTarget.value as FilterType)}
        class="px-3 py-1.5 text-sm border border-nb-black/20 bg-nb-white text-nb-black"
      >
        <option value="all">All Files</option>
        <option value="components">Components</option>
        <option value="hooks">Hooks</option>
        <option value="utils">Utils</option>
        <option value="services">Services</option>
        <option value="types">Types</option>
      </select>

      <!-- External Toggle -->
      <label class="flex items-center gap-2 text-sm text-nb-black/50 cursor-pointer">
        <input type="checkbox" bind:checked={showExternalDeps} class="border-nb-black/20" />
        Show External
      </label>

      <div class="flex-1" ></div>

      <!-- Results Count -->
      <span class="text-sm text-nb-black/50">
        {store.filteredFiles.length} of {store.data.totalFiles} files
      </span>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 min-h-0 overflow-hidden">
      {#if viewMode === 'list'}
        <div class="h-full flex">
          <!-- File Table -->
          <div class="flex-1 overflow-auto">
            <table class="w-full text-sm">
              <thead class="sticky top-0 bg-nb-white z-10">
                <tr class="border-b border-nb-black/20">
                  {#each [
                    { id: 'name', label: 'File', align: 'text-left', width: '' },
                    { id: 'imports', label: 'Imports', align: 'text-center', width: 'w-20' },
                    { id: 'exports', label: 'Exports', align: 'text-center', width: 'w-20' },
                    { id: 'dependents', label: 'Used By', align: 'text-center', width: 'w-24' },
                    { id: 'size', label: 'Size', align: 'text-right', width: 'w-24' },
                  ] as col (col.id)}
                    <th
                      class={cn('px-4 py-2 font-medium text-nb-black/50 cursor-pointer hover:bg-nb-cream', col.align, col.width)}
                      onclick={() => store.setSortBy(col.id as import('../../types').SortBy)}
                    >
                      <div class={cn('flex items-center gap-1', col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : '')}>
                        {col.label}
                        {#if store.sortBy === col.id}
                          <Icon name={store.sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} class="text-xs" />
                        {/if}
                      </div>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody class="divide-y divide-nb-black/10">
                {#each store.filteredFiles as file (file.filePath)}
                  <tr
                    class={cn(
                      'cursor-pointer transition-nb',
                      selectedFile?.filePath === file.filePath ? 'bg-nb-blue/10' : 'hover:bg-nb-cream/50'
                    )}
                    onclick={() => handleSelectFile(file)}
                  >
                    <td class="px-4 py-2">
                      <div class="flex flex-col">
                        <span class="font-mono text-xs text-nb-black/50">{file.directory}/</span>
                        <span class="font-medium text-nb-black/70">{file.fileName}</span>
                      </div>
                    </td>
                    <td class="px-4 py-2 text-center">
                      <span class="inline-flex items-center justify-center px-2 py-0.5 text-xs bg-nb-cream/80 text-nb-black/50">
                        {file.imports.length}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-center">
                      <span class="inline-flex items-center justify-center px-2 py-0.5 text-xs bg-nb-green/20 text-nb-green">
                        {file.exports.length}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-center">
                      <span class={cn(
                        'inline-flex items-center justify-center px-2 py-0.5 text-xs',
                        file.dependents.length > 5 ? 'bg-nb-orange/20 text-nb-orange'
                          : file.dependents.length > 0 ? 'bg-nb-blue/20 text-nb-blue'
                          : 'bg-nb-cream/80 text-nb-black/50'
                      )}>
                        {file.dependents.length}
                      </span>
                    </td>
                    <td class="px-4 py-2 text-right text-nb-black/50">
                      {formatBytes(file.size)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Detail Panel -->
          {#if selectedFile}
            <FileDetailPanel
              file={selectedFile}
              allFiles={store.data.files}
              onClose={clearSelectedFile}
              onSelectFile={handleSelectFile}
            />
          {/if}
        </div>
      {:else if viewMode === 'graph'}
        <DependencyGraphView
          files={store.filteredFiles}
          {selectedFile}
          onSelectFile={handleSelectFile}
        />
      {:else if viewMode === 'architecture'}
        <ArchitecturePanel data={store.data} />
      {:else if viewMode === 'stats'}
        <StatsPanel data={store.data} />
      {:else if viewMode === 'circular'}
        <CircularDepsPanel circularDeps={store.data.circularDependencies} files={store.data.files} />
      {:else if viewMode === 'orphans'}
        <OrphansPanel orphans={store.data.orphans} files={store.data.files} onSelectFile={handleSelectFile} />
      {/if}
    </div>
  </div>
{/if}
