/**
 * Dependency Explorer Feature
 * 
 * Admin-only tool for visualizing and analyzing code dependencies.
 * Provides searchable, filterable views of imports/exports across the codebase.
 * 
 * @example
 * ```tsx
 * import { DependencyExplorer } from '@/src/features/dependency-explorer';
 * 
 * <DependencyExplorer />
 * ```
 */

export { DependencyExplorer } from './ui/DependencyExplorer';
export { DependencyGraphView } from './ui/DependencyGraphView';
export { useDependencyData } from './model/useDependencyData';
export type { 
  DependencyGraph, 
  FileAnalysis, 
  ImportInfo, 
  ExportInfo 
} from './types';
