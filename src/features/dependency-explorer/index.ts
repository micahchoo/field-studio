/**
 * Dependency Explorer Feature
 *
 * Admin-only tool for visualizing and analyzing code dependencies.
 *
 * @example
 * ```svelte
 * <script>
 *   import { DependencyExplorer } from '@/src/features/dependency-explorer';
 * </script>
 * <DependencyExplorer />
 * ```
 */

// Main organism
export { default as DependencyExplorer } from './ui/organisms/DependencyExplorer.svelte';

// Molecules (for independent use)
export { default as DependencyGraphView } from './ui/molecules/DependencyGraphView.svelte';

// Store
export { DependencyDataStore } from './stores/dependencyData.svelte';

// Types
export type {
  DependencyGraph,
  FileAnalysis,
  ImportInfo,
  ExportInfo,
  ViewMode,
  FilterType,
  SortBy,
  SortOrder,
} from './types';

// Markdown formatters (pure functions)
export {
  formatLayersAsMarkdown,
  formatCrossLayerDepsAsMarkdown,
  formatHealthMetricsAsMarkdown,
  formatHotFilesAsMarkdown,
  formatHeavyFilesAsMarkdown,
  formatStatsAsMarkdown,
  formatCircularDepsAsMarkdown,
  formatOrphansAsMarkdown,
  formatBytes,
} from './lib/markdownFormatters';
