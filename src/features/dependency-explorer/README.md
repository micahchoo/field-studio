# Dependency Explorer

An admin-only tool for visualizing and analyzing code dependencies across the Field Studio codebase.

## Features

- **List View**: Searchable, sortable table of all source files with import/export counts
- **Graph View**: Visual tree representation of the codebase structure
- **Stats View**: Overview statistics including most imported files, external dependencies
- **Circular Dependencies**: Detection and visualization of circular import chains
- **Orphans**: Files that aren't imported by any other file (potential dead code)

## Access

The Dependency Explorer is restricted to admin users only. To access:

1. Add `?admin=true` to the URL (e.g., `http://localhost:3000?admin=true`)
2. Or run in terminal: `localStorage.setItem('adminMode', 'true')`
3. Or use Command Palette (⌘K) → "Dependency Explorer (Admin)"

Once enabled, the admin mode persists in localStorage.

## Usage

### Command Line

```bash
# Generate dependency graph once
npm run analyze

# Watch mode - auto-update on file changes
npm run analyze:watch
```

### Git Hook

A post-commit hook is automatically installed that updates the dependency graph after each commit. This ensures the data in `public/dependencies.json` is always current.

To manually install the hook:

```bash
cat > .git/hooks/post-commit << 'EOF'
#!/bin/sh
echo "🔍 Updating dependency graph..."
unset LD_LIBRARY_PATH && npx tsx scripts/analyze-imports.ts
EOF
chmod +x .git/hooks/post-commit
```

## Data Format

The analyzer generates `public/dependencies.json` with the following structure:

```typescript
interface DependencyGraph {
  generatedAt: string;           // ISO timestamp
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
```

## Architecture

- **Analyzer** (`scripts/analyze-imports.ts`): Node.js CLI that parses TypeScript/TSX files using regex
- **Data Hook** (`model/useDependencyData.ts`): React hook for loading and filtering dependency data
- **UI Components** (`ui/`):
  - `DependencyExplorer.tsx`: Main container with view switcher
  - `FileDetailPanel.tsx`: Side panel showing file details
  - `StatsPanel.tsx`: Statistics overview
  - `CircularDepsPanel.tsx`: Circular dependency visualization
  - `OrphansPanel.tsx`: Unused files list
  - `DependencyGraphView.tsx`: Tree/graph visualization

## Notes

- The analyzer uses regex parsing (not full AST) for speed and simplicity
- Path aliases (e.g., `@/src/features`) are resolved via tsconfig.json
- Circular dependency detection uses DFS with cycle detection
- Orphans exclude `index.*` files as they're typically entry points
