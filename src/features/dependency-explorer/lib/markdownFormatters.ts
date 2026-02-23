/**
 * Markdown Formatters — Pure functions for copy-to-clipboard feature
 * React source: ui/CopyableSection.tsx (lines 56-224)
 * Architecture: Pure functions (Category 1 — zero framework dependency)
 */

/** Format byte values for human display */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function formatLayersAsMarkdown(
  layers: Array<{
    name: string;
    files: { length: number };
    totalImports: number;
    totalExports: number;
    externalDeps: { size: number };
    avgLines: number;
    typeImports: number;
    valueImports: number;
  }>
): string {
  return `# Architecture Layers\n\n${layers.map(layer => `## ${layer.name}\n\n- **Files:** ${layer.files.length}\n- **Total Imports:** ${layer.totalImports}\n- **Total Exports:** ${layer.totalExports}\n- **External Dependencies:** ${layer.externalDeps.size}\n- **Average Lines:** ${layer.avgLines}\n- **Type Imports:** ${layer.typeImports}\n- **Value Imports:** ${layer.valueImports}\n`).join('\n')}`;
}

export function formatCrossLayerDepsAsMarkdown(
  layers: Array<{ name: string }>,
  crossLayerDeps: Record<string, Record<string, number>>
): string {
  const rows: string[] = [];
  layers.forEach(source => {
    const deps = crossLayerDeps[source.name];
    if (deps) {
      const depList = Object.entries(deps)
        .filter(([, count]) => count > 0)
        .map(([target, count]) => ` - ${target}: ${count}`)
        .join('\n');
      if (depList) {
        rows.push(`## ${source.name} imports from:\n${depList}`);
      }
    }
  });
  return `# Cross-Layer Dependencies\n\n${rows.join('\n\n')}`;
}

export function formatHealthMetricsAsMarkdown(metrics: {
  healthyPercentage: number;
  noExports: number;
  highImportFiles: number;
  highFanOut: number;
  largeFiles: number;
}): string {
  const status = metrics.healthyPercentage > 80 ? '✅' : metrics.healthyPercentage > 60 ? '⚠️' : '❌';
  return `# Code Health Metrics\n\n## Overview\n\n- **${status} Healthy Files:** ${metrics.healthyPercentage}%\n\n## Potential Issues\n\n- **Files with no exports:** ${metrics.noExports} (may be entry points)\n- **High import count:** ${metrics.highImportFiles} files (>20 imports)\n- **High fan-out:** ${metrics.highFanOut} files (>10 dependents)\n- **Large files:** ${metrics.largeFiles} files (>500 lines)\n`;
}

export function formatHotFilesAsMarkdown(
  files: Array<{ fileName: string; directory: string; dependents: { length: number } }>,
  title: string
): string {
  return `# ${title}\n\n${files.map((file, idx) => `${idx + 1}. **${file.fileName}**\n   - Location: \`${file.directory}/\`\n   - Dependents: ${file.dependents.length}`).join('\n\n')}`;
}

export function formatHeavyFilesAsMarkdown(
  files: Array<{ fileName: string; directory: string; imports: { length: number } }>,
  title: string
): string {
  return `# ${title}\n\n${files.map((file, idx) => `${idx + 1}. **${file.fileName}**\n   - Location: \`${file.directory}/\`\n   - Imports: ${file.imports.length}`).join('\n\n')}`;
}

export function formatStatsAsMarkdown(data: {
  generatedAt: string;
  totalFiles: number;
  stats: {
    totalImports: number;
    totalExports: number;
    avgImportsPerFile: number;
    mostImported: Array<{ file: string; count: number }>;
  };
  externalDependencies: string[];
  internalAliases: string[];
}): string {
  return `# Dependency Statistics\n\nGenerated: ${new Date(data.generatedAt).toLocaleString()}\n\n## Overview\n\n- **Total Files:** ${data.totalFiles}\n- **Total Imports:** ${data.stats.totalImports}\n- **Total Exports:** ${data.stats.totalExports}\n- **Average Imports per File:** ${data.stats.avgImportsPerFile.toFixed(1)}\n\n## Most Imported Files\n\n${data.stats.mostImported.map((item, idx) => `${idx + 1}. \`${item.file}\` - ${item.count} imports`).join('\n')}\n\n## External Dependencies (${data.externalDependencies.length})\n\n${data.externalDependencies.map(dep => `- ${dep}`).join('\n')}\n\n## Internal Aliases (${data.internalAliases.length})\n\n${data.internalAliases.map(alias => `- ${alias}`).join('\n')}`;
}

export function formatCircularDepsAsMarkdown(circularDeps: string[][]): string {
  if (circularDeps.length === 0) {
    return '# Circular Dependencies\n\n✅ No circular dependencies found!';
  }
  return `# Circular Dependencies (${circularDeps.length} found)\n\n${circularDeps.map((cycle, idx) => `## Cycle ${idx + 1}\n\n${cycle.map(file => `- \`${file}\``).join('\n')}`).join('\n\n')}`;
}

export function formatOrphansAsMarkdown(
  orphans: string[],
  files: Record<string, { fileName: string; directory: string }>
): string {
  if (orphans.length === 0) {
    return '# Orphan Files\n\n✅ No orphan files found!';
  }
  return `# Orphan Files (${orphans.length} found)\n\nFiles with no imports and not imported by any other file:\n\n${orphans.map(path => {
    const file = files[path];
    if (file) return `- **${file.fileName}** (\`${file.directory}/\`)`;
    return `- \`${path}\``;
  }).join('\n')}`;
}
