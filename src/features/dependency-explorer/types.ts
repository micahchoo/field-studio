/**
 * Type definitions for Dependency Explorer
 */

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isTypeImport: boolean;
  isRelative: boolean;
  isAbsolute: boolean;
  isExternal: boolean;
  isInternalAlias: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'named' | 'default' | 'namespace' | 're-export';
  isTypeExport: boolean;
}

export interface FileAnalysis {
  filePath: string;
  fileName: string;
  directory: string;
  extension: string;
  imports: ImportInfo[];
  exports: ExportInfo[];
  dependencies: string[];
  dependents: string[];
  size: number;
  lines: number;
}

export interface DependencyGraph {
  generatedAt: string;
  totalFiles: number;
  files: Record<string, FileAnalysis>;
  externalDependencies: string[];
  internalAliases: string[];
  circularDependencies: string[][];
  orphans: string[];
  stats: {
    totalImports: number;
    totalExports: number;
    avgImportsPerFile: number;
    mostImported: { file: string; count: number }[];
  };
}

export type ViewMode = 'list' | 'graph' | 'stats' | 'circular' | 'orphans';
export type FilterType = 'all' | 'components' | 'hooks' | 'utils' | 'services' | 'types';
