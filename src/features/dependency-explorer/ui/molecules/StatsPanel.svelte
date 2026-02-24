<!--
  StatsPanel — Overview statistics for dependency graph
  React source: ui/StatsPanel.tsx (199 lines)
  Architecture: Molecule (derived, composes StatCard + CopyableSection atoms)
-->
<script lang="ts">
  import type { DependencyGraph } from '../../types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { formatStatsAsMarkdown } from '../../lib/markdownFormatters';
  import CopyableSection from '../atoms/CopyableSection.svelte';
  import StatCard from '../atoms/StatCard.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    data: DependencyGraph;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { data, cx = {} as ContextualClassNames, fieldMode = false }: Props = $props();

  let markdown = $derived(formatStatsAsMarkdown(data));
</script>

<div class="h-full overflow-auto p-6">
  <div class="max-w-4xl mx-auto space-y-8">
    <!-- Overview Cards -->
    <CopyableSection title="Overview" getMarkdown={() => markdown}>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon="description" label="Total Files" value={data.totalFiles} color="blue" />
        <StatCard icon="arrow_forward" label="Total Imports" value={data.stats.totalImports} color="purple" />
        <StatCard icon="logout" label="Total Exports" value={data.stats.totalExports} color="green" />
        <StatCard icon="calculate" label="Avg Imports/File" value={data.stats.avgImportsPerFile.toFixed(1)} color="orange" />
      </div>
    </CopyableSection>

    <!-- Most Imported Files -->
    <section>
      <h2 class="text-lg font-semibold text-nb-black/70 mb-4">Most Imported Files</h2>
      <div class="bg-nb-white border border-nb-black/20 overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-nb-cream">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-nb-black/50">File</th>
              <th class="px-4 py-3 text-center font-medium text-nb-black/50 w-24">Imports</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-nb-black/10">
            {#each data.stats.mostImported as { file, count } (file)}
              <tr class="hover:bg-nb-cream">
                <td class="px-4 py-2 font-mono text-xs text-nb-black/50">{file}</td>
                <td class="px-4 py-2 text-center">
                  <span class="inline-flex items-center justify-center px-2 py-0.5 text-xs bg-nb-blue/20 text-nb-blue">
                    {count}
                  </span>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>

    <!-- External Dependencies -->
    <section>
      <h2 class="text-lg font-semibold text-nb-black/70 mb-4 flex items-center gap-2">
        <Icon name="language" class="text-nb-orange" />
        External Dependencies ({data.externalDependencies.length})
      </h2>
      <div class="flex flex-wrap gap-2">
        {#each data.externalDependencies as dep (dep)}
          <span class="px-3 py-1.5 bg-nb-orange/20 text-nb-orange text-sm border border-nb-orange">
            {dep}
          </span>
        {/each}
      </div>
    </section>

    <!-- Issues Summary -->
    <section>
      <h2 class="text-lg font-semibold text-nb-black/70 mb-4 flex items-center gap-2">
        <Icon name="warning" class="text-nb-red" />
        Potential Issues
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class={cn(
          'p-4 border',
          data.circularDependencies.length > 0
            ? 'bg-nb-red/10 border-nb-red/30'
            : 'bg-nb-green/10 border-nb-green/30'
        )}>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-2xl font-bold text-nb-black/70">{data.circularDependencies.length}</div>
              <div class="text-sm text-nb-black/50">Circular Dependencies</div>
            </div>
            <Icon
              name={data.circularDependencies.length > 0 ? 'sync_problem' : 'check_circle'}
              class={cn('text-3xl', data.circularDependencies.length > 0 ? 'text-nb-red' : 'text-nb-green')}
            />
          </div>
        </div>
        <div class={cn(
          'p-4 border',
          data.orphans.length > 0
            ? 'bg-nb-yellow/10 border-nb-yellow/30'
            : 'bg-nb-green/10 border-nb-green/30'
        )}>
          <div class="flex items-center justify-between">
            <div>
              <div class="text-2xl font-bold text-nb-black/70">{data.orphans.length}</div>
              <div class="text-sm text-nb-black/50">Unused Files</div>
            </div>
            <Icon
              name={data.orphans.length > 0 ? 'link_off' : 'check_circle'}
              class={cn('text-3xl', data.orphans.length > 0 ? 'text-nb-yellow' : 'text-nb-green')}
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</div>
