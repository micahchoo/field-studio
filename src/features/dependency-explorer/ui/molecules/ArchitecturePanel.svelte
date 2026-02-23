<!--
  ArchitecturePanel — High-level architectural analysis
  React source: ui/ArchitecturePanel.tsx (353 lines)
  Architecture: Molecule (heavy $derived.by computations, composes CopyableSection)
-->
<script module lang="ts">
  import type { FileAnalysis } from '../../types';

  interface LayerStats {
    name: string;
    color: string;
    files: FileAnalysis[];
    totalImports: number;
    totalExports: number;
    externalDeps: Set<string>;
    avgLines: number;
    typeImports: number;
    valueImports: number;
  }

  const LAYER_CONFIGS = [
    { name: 'App', pattern: /^src\/app\//, color: 'bg-nb-purple' },
    { name: 'Widgets', pattern: /^src\/widgets\//, color: 'bg-nb-blue' },
    { name: 'Features', pattern: /^src\/features\//, color: 'bg-nb-green' },
    { name: 'Entities', pattern: /^src\/entities\//, color: 'bg-nb-orange' },
    { name: 'Shared', pattern: /^src\/shared\//, color: 'bg-rose-500' },
    { name: 'Utils', pattern: /^utils\//, color: 'bg-nb-blue/80' },
    { name: 'UI Primitives', pattern: /^ui\//, color: 'bg-nb-blue/60' },
    { name: 'Other', pattern: /.*/, color: 'bg-nb-black/40' },
  ] as const;
</script>

<script lang="ts">
  import type { DependencyGraph } from '../../types';
  import {
    formatLayersAsMarkdown,
    formatCrossLayerDepsAsMarkdown,
    formatHealthMetricsAsMarkdown,
    formatHotFilesAsMarkdown,
    formatHeavyFilesAsMarkdown,
  } from '../../lib/markdownFormatters';
  import CopyableSection from '../atoms/CopyableSection.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    data: DependencyGraph;
  }

  let { data }: Props = $props();

  /** Group files into architecture layers */
  let layers = $derived.by((): LayerStats[] => {
    const allFiles = Object.values(data.files);
    return LAYER_CONFIGS
      .map(config => {
        const layerFiles = allFiles.filter(f => config.pattern.test(f.filePath));
        let totalLines = 0;
        const stats: LayerStats = {
          name: config.name,
          color: config.color,
          files: layerFiles,
          totalImports: 0,
          totalExports: 0,
          externalDeps: new Set(),
          avgLines: 0,
          typeImports: 0,
          valueImports: 0,
        };
        for (const file of layerFiles) {
          stats.totalImports += file.imports.length;
          stats.totalExports += file.exports.length;
          totalLines += file.lines;
          for (const imp of file.imports) {
            if (imp.isExternal) stats.externalDeps.add(imp.source);
            if (imp.isTypeImport) stats.typeImports++;
            else stats.valueImports++;
          }
        }
        stats.avgLines = layerFiles.length > 0 ? Math.round(totalLines / layerFiles.length) : 0;
        return stats;
      })
      .filter(l => l.files.length > 0);
  });

  /** Cross-layer dependency matrix */
  let crossLayerDeps = $derived.by(() => {
    const deps: Record<string, Record<string, number>> = {};
    for (const sourceLayer of layers) {
      deps[sourceLayer.name] = {};
      for (const file of sourceLayer.files) {
        for (const imp of file.imports) {
          if (imp.isInternalAlias || imp.isExternal) continue;
          const targetLayer = layers.find(
            l => l.name !== sourceLayer.name && imp.source.includes(l.name.toLowerCase())
          );
          if (targetLayer) {
            deps[sourceLayer.name][targetLayer.name] = (deps[sourceLayer.name][targetLayer.name] || 0) + 1;
          }
        }
      }
    }
    return deps;
  });

  /** Top 10 most-referenced files */
  let hotFiles = $derived(
    Object.values(data.files).sort((a, b) => b.dependents.length - a.dependents.length).slice(0, 10)
  );

  /** Top 10 most import-heavy files */
  let heavyFiles = $derived(
    Object.values(data.files).sort((a, b) => b.imports.length - a.imports.length).slice(0, 10)
  );

  /** Code health metrics */
  let healthMetrics = $derived.by(() => {
    const allFiles = Object.values(data.files);
    const total = allFiles.length;
    const noExports = allFiles.filter(f => f.exports.length === 0).length;
    const highImportFiles = allFiles.filter(f => f.imports.length > 20).length;
    const highFanOut = allFiles.filter(f => f.dependents.length > 10).length;
    const largeFiles = allFiles.filter(f => f.lines > 500).length;
    return {
      noExports,
      highImportFiles,
      highFanOut,
      largeFiles,
      healthyPercentage: Math.round(((total - noExports - highImportFiles - largeFiles) / total) * 100),
    };
  });

  // Markdown formatters
  let layersMarkdown = $derived(formatLayersAsMarkdown(layers));
  let crossLayerMarkdown = $derived(formatCrossLayerDepsAsMarkdown(layers, crossLayerDeps));
  let healthMarkdown = $derived(formatHealthMetricsAsMarkdown(healthMetrics));
  let hotFilesMarkdown = $derived(formatHotFilesAsMarkdown(hotFiles, 'Most Referenced Files'));
  let heavyFilesMarkdown = $derived(formatHeavyFilesAsMarkdown(heavyFiles, 'Most Import-Heavy Files'));
</script>

<div class="h-full overflow-auto p-6 space-y-8">
  <!-- Layer Overview -->
  <CopyableSection title="Architecture Layers" getMarkdown={() => layersMarkdown}>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {#each layers as layer (layer.name)}
        <div class="bg-nb-white border border-nb-black/20 p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class={cn('w-3 h-3', layer.color)} />
            <h3 class="font-medium text-nb-black/70">{layer.name}</h3>
            <span class="ml-auto text-xs text-nb-black/50">{layer.files.length} files</span>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between text-nb-black/50"><span>Imports:</span><span class="font-medium">{layer.totalImports}</span></div>
            <div class="flex justify-between text-nb-black/50"><span>Exports:</span><span class="font-medium">{layer.totalExports}</span></div>
            <div class="flex justify-between text-nb-black/50"><span>Avg Lines:</span><span class="font-medium">{layer.avgLines}</span></div>
            <div class="flex justify-between text-nb-black/50"><span>External Deps:</span><span class="font-medium">{layer.externalDeps.size}</span></div>
            <div class="pt-2 mt-2 border-t border-nb-black/10">
              <div class="flex gap-2 text-xs">
                <span class="px-1.5 py-0.5 bg-nb-purple/10 text-nb-purple">{layer.typeImports} types</span>
                <span class="px-1.5 py-0.5 bg-nb-blue/20 text-nb-blue">{layer.valueImports} values</span>
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </CopyableSection>

  <!-- Cross-Layer Dependencies Matrix -->
  <CopyableSection title="Cross-Layer Dependencies" getMarkdown={() => crossLayerMarkdown}>
    <div class="bg-nb-white border border-nb-black/20 overflow-hidden overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-nb-cream">
          <tr>
            <th class="px-4 py-2 text-left font-medium text-nb-black/50">From \ To</th>
            {#each layers as l (l.name)}
              <th class="px-2 py-2 text-center font-medium text-nb-black/50">
                <div class={cn('w-2 h-2 mx-auto mb-1', l.color)} />
                <span class="text-xs">{l.name}</span>
              </th>
            {/each}
          </tr>
        </thead>
        <tbody class="divide-y divide-nb-black/10">
          {#each layers as sourceLayer (sourceLayer.name)}
            <tr>
              <td class="px-4 py-2 font-medium text-nb-black/70">{sourceLayer.name}</td>
              {#each layers as targetLayer (targetLayer.name)}
                {@const count = crossLayerDeps[sourceLayer.name]?.[targetLayer.name] ?? 0}
                {@const intensity = Math.min(count / 10, 1)}
                <td class="px-2 py-2 text-center">
                  {#if count > 0}
                    <span
                      class="inline-flex items-center justify-center w-8 h-6 text-xs font-medium"
                      style:background-color="rgba(59,130,246,{0.1 + intensity * 0.4})"
                      style:color={intensity > 0.5 ? '#1d4ed8' : '#3b82f6'}
                    >
                      {count}
                    </span>
                  {:else}
                    <span class="text-nb-black/30">-</span>
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </CopyableSection>

  <!-- Health Metrics -->
  <CopyableSection title="Code Health Metrics" getMarkdown={() => healthMarkdown}>
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div class="bg-nb-white border border-nb-black/20 p-4 text-center">
        <div class={cn(
          'text-2xl font-bold',
          healthMetrics.healthyPercentage > 80 ? 'text-nb-green' : healthMetrics.healthyPercentage > 60 ? 'text-nb-orange' : 'text-nb-red'
        )}>
          {healthMetrics.healthyPercentage}%
        </div>
        <div class="text-xs text-nb-black/50 mt-1">Healthy Files</div>
      </div>
      <div class="bg-nb-white border border-nb-black/20 p-4 text-center">
        <div class="text-2xl font-bold text-nb-black/70">{healthMetrics.noExports}</div>
        <div class="text-xs text-nb-black/50 mt-1">No Exports</div>
        {#if healthMetrics.noExports > 0}
          <div class="text-xs text-nb-orange mt-1">May be entry points</div>
        {/if}
      </div>
      <div class="bg-nb-white border border-nb-black/20 p-4 text-center">
        <div class={cn('text-2xl font-bold', healthMetrics.highImportFiles < 10 ? 'text-nb-green' : 'text-nb-orange')}>
          {healthMetrics.highImportFiles}
        </div>
        <div class="text-xs text-nb-black/50 mt-1">High Import Count</div>
        <div class="text-xs text-nb-black/40 mt-1">&gt;20 imports</div>
      </div>
      <div class="bg-nb-white border border-nb-black/20 p-4 text-center">
        <div class={cn('text-2xl font-bold', healthMetrics.highFanOut < 20 ? 'text-nb-green' : 'text-nb-orange')}>
          {healthMetrics.highFanOut}
        </div>
        <div class="text-xs text-nb-black/50 mt-1">High Fan-out</div>
        <div class="text-xs text-nb-black/40 mt-1">&gt;10 dependents</div>
      </div>
      <div class="bg-nb-white border border-nb-black/20 p-4 text-center">
        <div class={cn('text-2xl font-bold', healthMetrics.largeFiles < 30 ? 'text-nb-green' : 'text-nb-orange')}>
          {healthMetrics.largeFiles}
        </div>
        <div class="text-xs text-nb-black/50 mt-1">Large Files</div>
        <div class="text-xs text-nb-black/40 mt-1">&gt;500 lines</div>
      </div>
    </div>
  </CopyableSection>

  <!-- Hot Files Grid -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <CopyableSection title="Most Referenced Files" getMarkdown={() => hotFilesMarkdown}>
      <div class="bg-nb-white border border-nb-black/20 divide-y divide-nb-black/10">
        {#each hotFiles as file, idx (file.filePath)}
          <div class="px-4 py-3 flex items-center gap-3">
            <span class="text-sm font-medium text-nb-black/40 w-6">{idx + 1}</span>
            <div class="flex-1 min-w-0">
              <div class="font-mono text-sm text-nb-black/70 truncate">{file.fileName}</div>
              <div class="text-xs text-nb-black/50 truncate">{file.directory}/</div>
            </div>
            <span class="inline-flex items-center px-2 py-1 text-xs bg-nb-orange/20 text-nb-orange">
              {file.dependents.length} refs
            </span>
          </div>
        {/each}
      </div>
    </CopyableSection>

    <CopyableSection title="Most Import-Heavy Files" getMarkdown={() => heavyFilesMarkdown}>
      <div class="bg-nb-white border border-nb-black/20 divide-y divide-nb-black/10">
        {#each heavyFiles as file, idx (file.filePath)}
          <div class="px-4 py-3 flex items-center gap-3">
            <span class="text-sm font-medium text-nb-black/40 w-6">{idx + 1}</span>
            <div class="flex-1 min-w-0">
              <div class="font-mono text-sm text-nb-black/70 truncate">{file.fileName}</div>
              <div class="text-xs text-nb-black/50 truncate">{file.directory}/</div>
            </div>
            <span class="inline-flex items-center px-2 py-1 text-xs bg-nb-purple/10 text-nb-purple">
              {file.imports.length} imports
            </span>
          </div>
        {/each}
      </div>
    </CopyableSection>
  </div>
</div>
