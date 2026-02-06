#!/usr/bin/env node
/**
 * Import/Export Analyzer CLI Tool
 * 
 * Analyzes all TypeScript/TSX files in src/ and generates a dependency graph
 * that can be visualized in the Dependency Explorer UI.
 * 
 * Usage:
 *   npx tsx scripts/analyze-imports.ts
 *   npx tsx scripts/analyze-imports.ts --watch
 *   npx tsx scripts/analyze-imports.ts --output ./public/dependencies.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

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
  dependencies: string[]; // resolved file paths
  dependents: string[]; // files that import this file
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

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  srcDir: path.resolve(__dirname, '../src'),
  outputFile: path.resolve(__dirname, '../public/dependencies.json'),
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  excludePatterns: [
    /node_modules/,
    /\.d\.ts$/,
    /\.test\./,
    /\.spec\./,
    /__tests__/,
    /__mocks__/,
  ],
  internalAliases: ['@/', '@/src/', '@/app/', '@/entities/', '@/features/', '@/shared/', '@/widgets/'],
};

// ============================================================================
// Parser
// ============================================================================

class ImportExportParser {
  private importRegex = /import\s+(?:(?:type\s+)?\{([^}]+)\}|(\*\s+as\s+\w+)|(\w+))\s+from\s+['"]([^'"]+)['"];?/g;
  private sideEffectImportRegex = /import\s+['"]([^'"]+)['"];?/g;
  private dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  private exportNamedRegex = /export\s+(?:(?:type\s+)?\{([^}]+)\}|(const|let|var|function|class|interface|type|enum)\s+(\w+))/g;
  private exportDefaultRegex = /export\s+default\s+(?:class|function|interface)?\s*(\w+)?/g;
  private exportAllRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"];?/g;
  private exportNamedFromRegex = /export\s+(?:(?:type\s+)?\{([^}]+)\})\s+from\s+['"]([^'"]+)['"];?/g;

  parseFile(filePath: string, content: string): FileAnalysis {
    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];

    // Parse imports
    let match: RegExpExecArray | null;
    
    // Reset regex
    this.importRegex.lastIndex = 0;
    while ((match = this.importRegex.exec(content)) !== null) {
      const specifiersStr = match[1];
      const namespace = match[2];
      const defaultImport = match[3];
      const source = match[4];
      
      const specifiers: string[] = [];
      if (specifiersStr) {
        specifiers.push(...specifiersStr.split(',').map(s => s.trim().split(' as ')[0].trim()));
      }
      if (namespace) {
        specifiers.push(namespace.replace('* as ', '').trim());
      }
      if (defaultImport) {
        specifiers.push(`default:${defaultImport}`);
      }

      imports.push({
        source,
        specifiers,
        isTypeImport: match[0].includes('type '),
        isRelative: source.startsWith('.'),
        isAbsolute: source.startsWith('/'),
        isExternal: !source.startsWith('.') && !source.startsWith('/') && !this.isInternalAlias(source),
        isInternalAlias: this.isInternalAlias(source),
      });
    }

    // Parse side-effect imports
    this.sideEffectImportRegex.lastIndex = 0;
    while ((match = this.sideEffectImportRegex.exec(content)) !== null) {
      const source = match[1];
      imports.push({
        source,
        specifiers: ['[side-effect]'],
        isTypeImport: false,
        isRelative: source.startsWith('.'),
        isAbsolute: source.startsWith('/'),
        isExternal: !source.startsWith('.') && !source.startsWith('/') && !this.isInternalAlias(source),
        isInternalAlias: this.isInternalAlias(source),
      });
    }

    // Parse dynamic imports
    this.dynamicImportRegex.lastIndex = 0;
    while ((match = this.dynamicImportRegex.exec(content)) !== null) {
      const source = match[1];
      imports.push({
        source,
        specifiers: ['[dynamic]'],
        isTypeImport: false,
        isRelative: source.startsWith('.'),
        isAbsolute: source.startsWith('/'),
        isExternal: !source.startsWith('.') && !source.startsWith('/') && !this.isInternalAlias(source),
        isInternalAlias: this.isInternalAlias(source),
      });
    }

    // Parse named exports
    this.exportNamedRegex.lastIndex = 0;
    while ((match = this.exportNamedRegex.exec(content)) !== null) {
      if (match[1]) {
        // export { a, b, c }
        const names = match[1].split(',').map(s => s.trim().split(' as ')[0].trim());
        for (const name of names) {
          exports.push({
            name,
            type: 'named',
            isTypeExport: match[0].includes('type '),
          });
        }
      } else if (match[3]) {
        // export const/function/class name
        exports.push({
          name: match[3],
          type: 'named',
          isTypeExport: match[0].includes('type ') || match[0].includes('interface '),
        });
      }
    }

    // Parse default exports
    this.exportDefaultRegex.lastIndex = 0;
    while ((match = this.exportDefaultRegex.exec(content)) !== null) {
      exports.push({
        name: match[1] || 'default',
        type: 'default',
        isTypeExport: false,
      });
    }

    // Parse re-exports (export * from ...)
    this.exportAllRegex.lastIndex = 0;
    while ((match = this.exportAllRegex.exec(content)) !== null) {
      const source = match[1];
      imports.push({
        source,
        specifiers: ['[re-export-all]'],
        isTypeImport: false,
        isRelative: source.startsWith('.'),
        isAbsolute: source.startsWith('/'),
        isExternal: !source.startsWith('.') && !source.startsWith('/') && !this.isInternalAlias(source),
        isInternalAlias: this.isInternalAlias(source),
      });
    }

    // Parse named re-exports (export { a, b } from ...)
    this.exportNamedFromRegex.lastIndex = 0;
    while ((match = this.exportNamedFromRegex.exec(content)) !== null) {
      const specifiers = match[1].split(',').map(s => s.trim().split(' as ')[0].trim());
      const source = match[2];
      
      imports.push({
        source,
        specifiers: specifiers.map(s => `[re-export]:${s}`),
        isTypeImport: match[0].includes('type '),
        isRelative: source.startsWith('.'),
        isAbsolute: source.startsWith('/'),
        isExternal: !source.startsWith('.') && !source.startsWith('/') && !this.isInternalAlias(source),
        isInternalAlias: this.isInternalAlias(source),
      });
    }

    const lines = content.split('\n').length;
    const stats = fs.statSync(filePath);

    return {
      filePath: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
      fileName: path.basename(filePath),
      directory: path.dirname(path.relative(process.cwd(), filePath)).replace(/\\/g, '/'),
      extension: path.extname(filePath),
      imports,
      exports,
      dependencies: [],
      dependents: [],
      size: stats.size,
      lines,
    };
  }

  private isInternalAlias(source: string): boolean {
    return CONFIG.internalAliases.some(alias => source.startsWith(alias));
  }
}

// ============================================================================
// Resolver
// ============================================================================

class DependencyResolver {
  private srcDir: string;
  private aliasMap: Map<string, string>;

  constructor(srcDir: string) {
    this.srcDir = srcDir;
    this.aliasMap = this.buildAliasMap();
  }

  private buildAliasMap(): Map<string, string> {
    const map = new Map<string, string>();
    
    // Read tsconfig.json for path mappings
    try {
      const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
      if (fs.existsSync(tsconfigPath)) {
        const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
        const paths = tsconfig.compilerOptions?.paths;
        
        if (paths) {
          for (const [alias, targets] of Object.entries(paths)) {
            const cleanAlias = alias.replace(/\*$/, '');
            const target = (targets as string[])[0]?.replace(/\*$/, '');
            if (target) {
              map.set(cleanAlias, path.resolve(process.cwd(), target));
            }
          }
        }
      }
    } catch {
      // Ignore tsconfig errors
    }

    // Default mappings
    map.set('@/', this.srcDir);
    map.set('@/src', this.srcDir);
    map.set('@/app', path.join(this.srcDir, 'app'));
    map.set('@/entities', path.join(this.srcDir, 'entities'));
    map.set('@/features', path.join(this.srcDir, 'features'));
    map.set('@/shared', path.join(this.srcDir, 'shared'));
    map.set('@/widgets', path.join(this.srcDir, 'widgets'));

    return map;
  }

  resolveImport(fromFile: string, importSource: string): string | null {
    // Handle internal aliases
    for (const [alias, targetDir] of this.aliasMap) {
      if (importSource.startsWith(alias)) {
        const relativePath = importSource.slice(alias.length);
        const resolvedPath = path.join(targetDir, relativePath);
        return this.findExistingFile(resolvedPath);
      }
    }

    // Handle relative imports
    if (importSource.startsWith('.')) {
      const fromDir = path.dirname(fromFile);
      const resolvedPath = path.resolve(fromDir, importSource);
      return this.findExistingFile(resolvedPath);
    }

    // External dependency - return as-is
    return null;
  }

  private findExistingFile(resolvedPath: string): string | null {
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js', '/index.jsx'];
    
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (fs.existsSync(fullPath)) {
        return path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
      }
    }
    
    return null;
  }
}

// ============================================================================
// Analyzer
// ============================================================================

class DependencyAnalyzer {
  private parser = new ImportExportParser();
  private resolver: DependencyResolver;

  constructor(srcDir: string) {
    this.resolver = new DependencyResolver(srcDir);
  }

  analyze(srcDir: string): DependencyGraph {
    const files = this.getAllSourceFiles(srcDir);
    const fileMap: Record<string, FileAnalysis> = {};

    // First pass: parse all files
    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const analysis = this.parser.parseFile(filePath, content);
        const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
        fileMap[relativePath] = analysis;
      } catch (error) {
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    // Second pass: resolve dependencies
    const externalDeps = new Set<string>();
    const internalAliases = new Set<string>();

    for (const analysis of Object.values(fileMap)) {
      for (const imp of analysis.imports) {
        if (imp.isExternal) {
          externalDeps.add(imp.source.split('/')[0]); // Get package name
        } else if (imp.isInternalAlias) {
          internalAliases.add(imp.source);
        }

        const resolved = this.resolver.resolveImport(analysis.filePath, imp.source);
        if (resolved && fileMap[resolved]) {
          analysis.dependencies.push(resolved);
          fileMap[resolved].dependents.push(analysis.filePath);
        }
      }
    }

    // Find circular dependencies
    const circularDeps = this.findCircularDependencies(fileMap);

    // Find orphans (files with no dependents)
    const orphans = Object.values(fileMap)
      .filter(f => f.dependents.length === 0 && !f.filePath.includes('index.'))
      .map(f => f.filePath);

    // Calculate stats
    const totalImports = Object.values(fileMap).reduce((sum, f) => sum + f.imports.length, 0);
    const totalExports = Object.values(fileMap).reduce((sum, f) => sum + f.exports.length, 0);
    
    const importCounts: Record<string, number> = {};
    for (const analysis of Object.values(fileMap)) {
      importCounts[analysis.filePath] = analysis.dependents.length;
    }
    
    const mostImported = Object.entries(importCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, count]) => ({ file, count }));

    return {
      generatedAt: new Date().toISOString(),
      totalFiles: Object.keys(fileMap).length,
      files: fileMap,
      externalDependencies: Array.from(externalDeps).sort(),
      internalAliases: Array.from(internalAliases).sort(),
      circularDependencies: circularDeps,
      orphans,
      stats: {
        totalImports,
        totalExports,
        avgImportsPerFile: totalImports / Object.keys(fileMap).length,
        mostImported,
      },
    };
  }

  private getAllSourceFiles(dir: string): string[] {
    const files: string[] = [];

    const traverse = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!CONFIG.excludePatterns.some(p => p.test(entry.name))) {
            traverse(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (CONFIG.extensions.includes(ext) && !CONFIG.excludePatterns.some(p => p.test(entry.name))) {
            files.push(fullPath);
          }
        }
      }
    };

    traverse(dir);
    return files;
  }

  private findCircularDependencies(fileMap: Record<string, FileAnalysis>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]) => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart).concat([node]));
        }
        return;
      }

      if (visited.has(node)) {
        return;
      }

      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const analysis = fileMap[node];
      if (analysis) {
        for (const dep of analysis.dependencies) {
          dfs(dep, [...path]);
        }
      }

      recursionStack.delete(node);
    };

    for (const filePath of Object.keys(fileMap)) {
      if (!visited.has(filePath)) {
        dfs(filePath, []);
      }
    }

    // Remove duplicate cycles
    const uniqueCycles: string[][] = [];
    const seen = new Set<string>();

    for (const cycle of cycles) {
      const normalized = [...cycle].sort().join('|');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueCycles.push(cycle);
      }
    }

    return uniqueCycles;
  }
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const outputArg = args.find(arg => arg.startsWith('--output='));
  const outputFile = outputArg ? outputArg.split('=')[1] : CONFIG.outputFile;
  const watchMode = args.includes('--watch');

  const analyzer = new DependencyAnalyzer(CONFIG.srcDir);

  const run = () => {
    console.log('🔍 Analyzing imports and exports...');
    const startTime = Date.now();

    const graph = analyzer.analyze(CONFIG.srcDir);

    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(graph, null, 2));

    const duration = Date.now() - startTime;
    console.log(`✅ Analysis complete in ${duration}ms`);
    console.log(`   Files analyzed: ${graph.totalFiles}`);
    console.log(`   External deps: ${graph.externalDependencies.length}`);
    console.log(`   Circular deps: ${graph.circularDependencies.length}`);
    console.log(`   Orphans: ${graph.orphans.length}`);
    console.log(`   Output: ${outputFile}`);
  };

  run();

  if (watchMode) {
    console.log('👀 Watching for changes...');
    const { watch } = fs;
    watch(CONFIG.srcDir, { recursive: true }, (eventType, filename) => {
      if (filename && CONFIG.extensions.some(ext => filename.endsWith(ext))) {
        console.log(`\n📝 ${eventType}: ${filename}`);
        run();
      }
    });
  }
}

main();
