/**
 * Copyable Section - Wrapper that adds copy-to-markdown functionality
 * 
 * Makes any section of the dependency explorer copyable as non-table markdown.
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/ui/primitives';

interface CopyableSectionProps {
  title: string;
  children: React.ReactNode;
  getMarkdown: () => string;
  className?: string;
}

export const CopyableSection: React.FC<CopyableSectionProps> = ({
  title,
  children,
  getMarkdown,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [getMarkdown]);

  return (
    <section className={`relative group ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          {title}
        </h2>
        <Button
          onClick={handleCopy}
          variant={copied ? 'success' : 'secondary'}
          size="sm"
          title="Copy as markdown"
        >
          {copied ? '✓ Copied!' : '⧉ Copy'}
        </Button>
      </div>
      {children}
    </section>
  );
};

// Helper function to format architecture layers as markdown
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
  return `# Architecture Layers

${layers.map(layer => `## ${layer.name}

- **Files:** ${layer.files.length}
- **Total Imports:** ${layer.totalImports}
- **Total Exports:** ${layer.totalExports}
- **External Dependencies:** ${layer.externalDeps.size}
- **Average Lines:** ${layer.avgLines}
- **Type Imports:** ${layer.typeImports}
- **Value Imports:** ${layer.valueImports}
`).join('\n')}`;
}

// Helper function to format cross-layer dependencies as markdown
export function formatCrossLayerDepsAsMarkdown(
  layers: Array<{ name: string }>,
  crossLayerDeps: Record<string, Record<string, number>>
): string {
  const rows: string[] = [];
  
  layers.forEach(source => {
    const deps = crossLayerDeps[source.name];
    if (deps) {
      const depList = Object.entries(deps)
        .filter(([_, count]) => count > 0)
        .map(([target, count]) => `  - ${target}: ${count}`)
        .join('\n');
      
      if (depList) {
        rows.push(`## ${source.name} imports from:\n${depList}`);
      }
    }
  });

  return `# Cross-Layer Dependencies

${rows.join('\n\n')}`;
}

// Helper function to format health metrics as markdown
export function formatHealthMetricsAsMarkdown(metrics: {
  healthyPercentage: number;
  noExports: number;
  highImportFiles: number;
  highFanOut: number;
  largeFiles: number;
}): string {
  const status = metrics.healthyPercentage > 80 ? '✅' : metrics.healthyPercentage > 60 ? '⚠️' : '❌';
  
  return `# Code Health Metrics

## Overview

- **${status} Healthy Files:** ${metrics.healthyPercentage}%

## Potential Issues

- **Files with no exports:** ${metrics.noExports} (may be entry points)
- **High import count:** ${metrics.highImportFiles} files (>20 imports)
- **High fan-out:** ${metrics.highFanOut} files (>10 dependents)
- **Large files:** ${metrics.largeFiles} files (>500 lines)
`;
}

// Helper function to format hot files as markdown
export function formatHotFilesAsMarkdown(
  files: Array<{ fileName: string; directory: string; dependents: { length: number } }>,
  title: string
): string {
  return `# ${title}

${files.map((file, idx) => `${idx + 1}. **${file.fileName}**\n   - Location: \`${file.directory}/\`\n   - Dependents: ${file.dependents.length}`).join('\n\n')}`;
}

// Helper function to format heavy files as markdown
export function formatHeavyFilesAsMarkdown(
  files: Array<{ fileName: string; directory: string; imports: { length: number } }>,
  title: string
): string {
  return `# ${title}

${files.map((file, idx) => `${idx + 1}. **${file.fileName}**\n   - Location: \`${file.directory}/\`\n   - Imports: ${file.imports.length}`).join('\n\n')}`;
}

// Helper function to format stats as markdown
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
  return `# Dependency Statistics

Generated: ${new Date(data.generatedAt).toLocaleString()}

## Overview

- **Total Files:** ${data.totalFiles}
- **Total Imports:** ${data.stats.totalImports}
- **Total Exports:** ${data.stats.totalExports}
- **Average Imports per File:** ${data.stats.avgImportsPerFile.toFixed(1)}

## Most Imported Files

${data.stats.mostImported.map((item, idx) => `${idx + 1}. \`${item.file}\` - ${item.count} imports`).join('\n')}

## External Dependencies (${data.externalDependencies.length})

${data.externalDependencies.map(dep => `- ${dep}`).join('\n')}

## Internal Aliases (${data.internalAliases.length})

${data.internalAliases.map(alias => `- ${alias}`).join('\n')}`;
}

// Helper function to format circular dependencies as markdown
export function formatCircularDepsAsMarkdown(
  circularDeps: string[][]
): string {
  if (circularDeps.length === 0) {
    return '# Circular Dependencies\n\n✅ No circular dependencies found!';
  }

  return `# Circular Dependencies (${circularDeps.length} found)

${circularDeps.map((cycle, idx) => `## Cycle ${idx + 1}\n\n${cycle.map(file => `- \`${file}\``).join('\n')}`).join('\n\n')}`;
}

// Helper function to format orphans as markdown
export function formatOrphansAsMarkdown(
  orphans: string[],
  files: Record<string, { fileName: string; directory: string }>
): string {
  if (orphans.length === 0) {
    return '# Orphan Files\n\n✅ No orphan files found!';
  }

  return `# Orphan Files (${orphans.length} found)

Files with no imports and not imported by any other file:

${orphans.map(path => {
    const file = files[path];
    if (file) {
      return `- **${file.fileName}** (\`${file.directory}/\`)`;
    }
    return `- \`${path}\``;
  }).join('\n')}`;
}

export default CopyableSection;