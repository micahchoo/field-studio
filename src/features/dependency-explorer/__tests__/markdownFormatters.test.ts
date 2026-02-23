import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatLayersAsMarkdown,
  formatCrossLayerDepsAsMarkdown,
  formatHealthMetricsAsMarkdown,
  formatHotFilesAsMarkdown,
  formatHeavyFilesAsMarkdown,
  formatStatsAsMarkdown,
  formatCircularDepsAsMarkdown,
  formatOrphansAsMarkdown,
} from '../lib/markdownFormatters';

// ---------------------------------------------------------------------------
// formatBytes
// ---------------------------------------------------------------------------
describe('formatBytes', () => {
  it('formats bytes under 1KB', () => {
    expect(formatBytes(0)).toBe('0B');
    expect(formatBytes(512)).toBe('512B');
    expect(formatBytes(1023)).toBe('1023B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0KB');
    expect(formatBytes(1536)).toBe('1.5KB');
    expect(formatBytes(10240)).toBe('10.0KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0MB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.5MB');
  });

  it('handles exact boundary values', () => {
    // 1024 bytes = exactly 1KB
    expect(formatBytes(1024)).toBe('1.0KB');
    // 1048576 bytes = exactly 1MB
    expect(formatBytes(1048576)).toBe('1.0MB');
  });
});

// ---------------------------------------------------------------------------
// formatLayersAsMarkdown
// ---------------------------------------------------------------------------
describe('formatLayersAsMarkdown', () => {
  const sampleLayers = [
    {
      name: 'Shared',
      files: { length: 42 },
      totalImports: 100,
      totalExports: 80,
      externalDeps: { size: 5 },
      avgLines: 120,
      typeImports: 30,
      valueImports: 70,
    },
    {
      name: 'Features',
      files: { length: 20 },
      totalImports: 50,
      totalExports: 30,
      externalDeps: { size: 2 },
      avgLines: 200,
      typeImports: 10,
      valueImports: 40,
    },
  ];

  it('returns markdown with header and layer sections', () => {
    const result = formatLayersAsMarkdown(sampleLayers);
    expect(result).toContain('# Architecture Layers');
    expect(result).toContain('## Shared');
    expect(result).toContain('## Features');
  });

  it('includes all layer statistics', () => {
    const result = formatLayersAsMarkdown(sampleLayers);
    expect(result).toContain('**Files:** 42');
    expect(result).toContain('**Total Imports:** 100');
    expect(result).toContain('**Total Exports:** 80');
    expect(result).toContain('**External Dependencies:** 5');
    expect(result).toContain('**Average Lines:** 120');
    expect(result).toContain('**Type Imports:** 30');
    expect(result).toContain('**Value Imports:** 70');
  });

  it('handles empty layers array', () => {
    const result = formatLayersAsMarkdown([]);
    expect(result).toContain('# Architecture Layers');
  });
});

// ---------------------------------------------------------------------------
// formatCrossLayerDepsAsMarkdown
// ---------------------------------------------------------------------------
describe('formatCrossLayerDepsAsMarkdown', () => {
  it('formats cross-layer dependencies', () => {
    const layers = [{ name: 'Features' }, { name: 'Shared' }];
    const deps = {
      Features: { Shared: 15 },
      Shared: {},
    };
    const result = formatCrossLayerDepsAsMarkdown(layers, deps);
    expect(result).toContain('# Cross-Layer Dependencies');
    expect(result).toContain('## Features imports from:');
    expect(result).toContain('Shared: 15');
  });

  it('omits layers with no cross-layer deps', () => {
    const layers = [{ name: 'Features' }, { name: 'Shared' }];
    const deps = {
      Features: {},
      Shared: {},
    };
    const result = formatCrossLayerDepsAsMarkdown(layers, deps);
    expect(result).toContain('# Cross-Layer Dependencies');
    expect(result).not.toContain('## Features imports from:');
  });

  it('filters out zero-count dependencies', () => {
    const layers = [{ name: 'App' }];
    const deps = { App: { Shared: 0, Features: 5 } };
    const result = formatCrossLayerDepsAsMarkdown(layers, deps);
    expect(result).not.toContain('Shared: 0');
    expect(result).toContain('Features: 5');
  });
});

// ---------------------------------------------------------------------------
// formatHealthMetricsAsMarkdown
// ---------------------------------------------------------------------------
describe('formatHealthMetricsAsMarkdown', () => {
  it('shows check mark for healthy projects (>80%)', () => {
    const result = formatHealthMetricsAsMarkdown({
      healthyPercentage: 85,
      noExports: 2,
      highImportFiles: 1,
      highFanOut: 3,
      largeFiles: 5,
    });
    expect(result).toContain('✅');
    expect(result).toContain('85%');
  });

  it('shows warning for moderate health (60-80%)', () => {
    const result = formatHealthMetricsAsMarkdown({
      healthyPercentage: 70,
      noExports: 10,
      highImportFiles: 5,
      highFanOut: 8,
      largeFiles: 15,
    });
    expect(result).toContain('⚠️');
    expect(result).toContain('70%');
  });

  it('shows error for unhealthy projects (<60%)', () => {
    const result = formatHealthMetricsAsMarkdown({
      healthyPercentage: 45,
      noExports: 20,
      highImportFiles: 15,
      highFanOut: 12,
      largeFiles: 30,
    });
    expect(result).toContain('❌');
    expect(result).toContain('45%');
  });

  it('includes all metric categories', () => {
    const result = formatHealthMetricsAsMarkdown({
      healthyPercentage: 90,
      noExports: 3,
      highImportFiles: 2,
      highFanOut: 4,
      largeFiles: 6,
    });
    expect(result).toContain('**Files with no exports:** 3');
    expect(result).toContain('**High import count:** 2');
    expect(result).toContain('**High fan-out:** 4');
    expect(result).toContain('**Large files:** 6');
  });
});

// ---------------------------------------------------------------------------
// formatHotFilesAsMarkdown
// ---------------------------------------------------------------------------
describe('formatHotFilesAsMarkdown', () => {
  const files = [
    { fileName: 'types.ts', directory: 'src/shared', dependents: { length: 42 } },
    { fileName: 'utils.ts', directory: 'src/shared/lib', dependents: { length: 15 } },
  ];

  it('uses provided title', () => {
    const result = formatHotFilesAsMarkdown(files, 'Top Referenced');
    expect(result).toContain('# Top Referenced');
  });

  it('includes numbered list with file details', () => {
    const result = formatHotFilesAsMarkdown(files, 'Hot Files');
    expect(result).toContain('1. **types.ts**');
    expect(result).toContain('`src/shared/`');
    expect(result).toContain('Dependents: 42');
    expect(result).toContain('2. **utils.ts**');
  });

  it('handles empty files array', () => {
    const result = formatHotFilesAsMarkdown([], 'Empty');
    expect(result).toContain('# Empty');
  });
});

// ---------------------------------------------------------------------------
// formatHeavyFilesAsMarkdown
// ---------------------------------------------------------------------------
describe('formatHeavyFilesAsMarkdown', () => {
  const files = [
    { fileName: 'App.tsx', directory: 'src/app', imports: { length: 35 } },
    { fileName: 'Inspector.tsx', directory: 'src/features/metadata', imports: { length: 28 } },
  ];

  it('uses provided title', () => {
    const result = formatHeavyFilesAsMarkdown(files, 'Import Heavy');
    expect(result).toContain('# Import Heavy');
  });

  it('includes import counts', () => {
    const result = formatHeavyFilesAsMarkdown(files, 'Heavy');
    expect(result).toContain('Imports: 35');
    expect(result).toContain('Imports: 28');
  });
});

// ---------------------------------------------------------------------------
// formatStatsAsMarkdown
// ---------------------------------------------------------------------------
describe('formatStatsAsMarkdown', () => {
  const data = {
    generatedAt: '2026-02-10T12:00:00Z',
    totalFiles: 250,
    stats: {
      totalImports: 1500,
      totalExports: 800,
      avgImportsPerFile: 6,
      mostImported: [
        { file: 'src/shared/types/index.ts', count: 42 },
        { file: 'src/shared/lib/cn.ts', count: 30 },
      ],
    },
    externalDependencies: ['svelte', 'vitest'],
    internalAliases: ['@/src'],
  };

  it('includes overview stats', () => {
    const result = formatStatsAsMarkdown(data);
    expect(result).toContain('**Total Files:** 250');
    expect(result).toContain('**Total Imports:** 1500');
    expect(result).toContain('**Total Exports:** 800');
    expect(result).toContain('**Average Imports per File:** 6.0');
  });

  it('lists most imported files', () => {
    const result = formatStatsAsMarkdown(data);
    expect(result).toContain('`src/shared/types/index.ts`');
    expect(result).toContain('42 imports');
  });

  it('lists external dependencies', () => {
    const result = formatStatsAsMarkdown(data);
    expect(result).toContain('## External Dependencies (2)');
    expect(result).toContain('- svelte');
    expect(result).toContain('- vitest');
  });

  it('lists internal aliases', () => {
    const result = formatStatsAsMarkdown(data);
    expect(result).toContain('## Internal Aliases (1)');
    expect(result).toContain('- @/src');
  });
});

// ---------------------------------------------------------------------------
// formatCircularDepsAsMarkdown
// ---------------------------------------------------------------------------
describe('formatCircularDepsAsMarkdown', () => {
  it('returns success message when no circular deps', () => {
    const result = formatCircularDepsAsMarkdown([]);
    expect(result).toContain('✅ No circular dependencies found!');
  });

  it('lists circular dependency cycles', () => {
    const cycles = [
      ['src/a.ts', 'src/b.ts', 'src/a.ts'],
      ['src/x.ts', 'src/y.ts', 'src/z.ts', 'src/x.ts'],
    ];
    const result = formatCircularDepsAsMarkdown(cycles);
    expect(result).toContain('# Circular Dependencies (2 found)');
    expect(result).toContain('## Cycle 1');
    expect(result).toContain('`src/a.ts`');
    expect(result).toContain('`src/b.ts`');
    expect(result).toContain('## Cycle 2');
    expect(result).toContain('`src/x.ts`');
    expect(result).toContain('`src/y.ts`');
    expect(result).toContain('`src/z.ts`');
  });
});

// ---------------------------------------------------------------------------
// formatOrphansAsMarkdown
// ---------------------------------------------------------------------------
describe('formatOrphansAsMarkdown', () => {
  it('returns success message when no orphans', () => {
    const result = formatOrphansAsMarkdown([], {});
    expect(result).toContain('✅ No orphan files found!');
  });

  it('lists orphan files with details when available', () => {
    const orphans = ['src/unused.ts', 'src/dead.ts'];
    const files = {
      'src/unused.ts': { fileName: 'unused.ts', directory: 'src' },
      'src/dead.ts': { fileName: 'dead.ts', directory: 'src' },
    };
    const result = formatOrphansAsMarkdown(orphans, files);
    expect(result).toContain('# Orphan Files (2 found)');
    expect(result).toContain('**unused.ts**');
    expect(result).toContain('(`src/`)');
    expect(result).toContain('**dead.ts**');
  });

  it('falls back to raw path when file not in lookup', () => {
    const orphans = ['unknown/path.ts'];
    const result = formatOrphansAsMarkdown(orphans, {});
    expect(result).toContain('`unknown/path.ts`');
  });
});
