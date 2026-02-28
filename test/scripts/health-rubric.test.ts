import { describe, it, expect } from 'vitest';
import type { DependencyGraph, FileAnalysis, ImportInfo, ExportInfo } from '../../scripts/analyze-imports';
import {
  grade,
  linearScore,
  scoreCoupling,
  scoreDeadCode,
  scoreCircularDeps,
  scoreFSDBoundaries,
  scoreImportDepth,
  scoreBarrelHealth,
  scoreComplexity,
  compose,
  generateReport,
  type DimensionResult,
  type Flag,
  type Scorecard,
} from '../../scripts/health-rubric';

// ============================================================================
// Test Helper
// ============================================================================

function makeGraph(
  adj: Record<string, { dependents: string[]; dependencies: string[] }>
): DependencyGraph {
  const files: Record<string, FileAnalysis> = {};
  for (const [fp, { dependents, dependencies }] of Object.entries(adj)) {
    files[fp] = {
      filePath: fp,
      fileName: fp.split('/').pop()!,
      directory: fp.split('/').slice(0, -1).join('/') || '.',
      extension: '.ts',
      imports: [],
      exports: [],
      dependencies,
      dependents,
      size: 100,
      lines: 30,
    };
  }
  return {
    generatedAt: new Date().toISOString(),
    totalFiles: Object.keys(files).length,
    files,
    externalDependencies: [],
    internalAliases: [],
    circularDependencies: [],
    orphans: [],
    stats: { totalImports: 0, totalExports: 0, avgImportsPerFile: 0, mostImported: [] },
  };
}

// ============================================================================
// Scoring Utilities
// ============================================================================

describe('grade', () => {
  it('returns green for scores >= 80', () => {
    expect(grade(80)).toBe('green');
    expect(grade(100)).toBe('green');
  });

  it('returns yellow for scores 50-79', () => {
    expect(grade(50)).toBe('yellow');
    expect(grade(79)).toBe('yellow');
  });

  it('returns red for scores < 50', () => {
    expect(grade(0)).toBe('red');
    expect(grade(49)).toBe('red');
  });
});

describe('linearScore', () => {
  it('maps best value to 100', () => {
    expect(linearScore(0, 0, 10)).toBe(100);
  });

  it('maps worst value to 0', () => {
    expect(linearScore(10, 0, 10)).toBe(0);
  });

  it('maps midpoint to 50', () => {
    expect(linearScore(5, 0, 10)).toBe(50);
  });

  it('clamps above best to 100', () => {
    expect(linearScore(-5, 0, 10)).toBe(100);
  });

  it('clamps below worst to 0', () => {
    expect(linearScore(20, 0, 10)).toBe(0);
  });
});

// ============================================================================
// Coupling
// ============================================================================

describe('scoreCoupling', () => {
  it('scores green when no God modules and low fan-out', () => {
    const graph = makeGraph({
      'a.ts': { dependents: ['b.ts', 'c.ts'], dependencies: ['d.ts'] },
      'b.ts': { dependents: [], dependencies: ['a.ts'] },
      'c.ts': { dependents: [], dependencies: ['a.ts'] },
      'd.ts': { dependents: ['a.ts'], dependencies: [] },
    });
    const result = scoreCoupling(graph);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.grade).toBe('green');
  });

  it('flags God modules with >50 dependents', () => {
    const deps = Array.from({ length: 60 }, (_, i) => `f${i}.ts`);
    const graph = makeGraph({
      'god.ts': { dependents: deps, dependencies: [] },
      ...Object.fromEntries(deps.map(d => [d, { dependents: [], dependencies: ['god.ts'] }])),
    });
    const result = scoreCoupling(graph);
    expect(result.metrics.godModules).toContain('god.ts');
    expect(result.score).toBeLessThan(80);
  });

  it('excludes utility files from God module detection', () => {
    const deps = Array.from({ length: 60 }, (_, i) => `f${i}.ts`);
    const graph = makeGraph({
      'src/shared/lib/cn.ts': { dependents: deps, dependencies: [] },
      ...Object.fromEntries(deps.map(d => [d, { dependents: [], dependencies: ['src/shared/lib/cn.ts'] }])),
    });
    const result = scoreCoupling(graph);
    expect(result.metrics.godModules).not.toContain('src/shared/lib/cn.ts');
  });
});

// ============================================================================
// Dead Code
// ============================================================================

describe('scoreDeadCode', () => {
  it('scores green when orphan ratio is below 3%', () => {
    const graph = makeGraph(
      Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [
          `f${i}.ts`,
          { dependents: i < 2 ? [] : [`f${i - 1}.ts`], dependencies: i < 99 ? [`f${i + 1}.ts`] : [] },
        ])
      )
    );
    graph.orphans = ['src/main.ts', 'f0.ts'];
    const result = scoreDeadCode(graph);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('excludes known entry points from orphan count', () => {
    const graph = makeGraph({
      'src/main.ts': { dependents: [], dependencies: [] },
      'src/test-setup.ts': { dependents: [], dependencies: [] },
      'a.ts': { dependents: ['b.ts'], dependencies: [] },
      'b.ts': { dependents: [], dependencies: ['a.ts'] },
    });
    graph.orphans = ['src/main.ts', 'src/test-setup.ts'];
    const result = scoreDeadCode(graph);
    expect(result.metrics.effectiveOrphans).toBe(0);
  });

  it('penalizes high orphan ratio', () => {
    const graph = makeGraph(
      Object.fromEntries(
        Array.from({ length: 20 }, (_, i) => [`f${i}.ts`, { dependents: [], dependencies: [] }])
      )
    );
    graph.orphans = Array.from({ length: 20 }, (_, i) => `f${i}.ts`);
    const result = scoreDeadCode(graph);
    expect(result.score).toBeLessThan(50);
    expect(result.grade).toBe('red');
  });
});

// ============================================================================
// Circular Deps
// ============================================================================

describe('scoreCircularDeps', () => {
  it('scores green when no real cycles', () => {
    const graph = makeGraph({ 'a.ts': { dependents: [], dependencies: [] } });
    graph.circularDependencies = [['a.ts', 'a.ts']];
    const result = scoreCircularDeps(graph);
    expect(result.score).toBe(100);
  });

  it('filters self-referencing cycles', () => {
    const graph = makeGraph({ 'a.ts': { dependents: [], dependencies: [] } });
    graph.circularDependencies = [['a.ts', 'a.ts'], ['b.ts', 'b.ts']];
    const result = scoreCircularDeps(graph);
    expect(result.metrics.selfRefCount).toBe(2);
    expect(result.metrics.realCycleCount).toBe(0);
  });

  it('penalizes real multi-file cycles', () => {
    const graph = makeGraph({
      'a.ts': { dependents: ['b.ts'], dependencies: ['b.ts'] },
      'b.ts': { dependents: ['a.ts'], dependencies: ['a.ts'] },
    });
    graph.circularDependencies = [['a.ts', 'b.ts', 'a.ts']];
    const result = scoreCircularDeps(graph);
    expect(result.score).toBeLessThan(100);
    expect(result.metrics.realCycleCount).toBe(1);
  });

  it('penalizes deep cycles more than shallow ones', () => {
    const graph = makeGraph({});
    graph.circularDependencies = [['a.ts', 'b.ts', 'c.ts', 'a.ts']];
    const resultDeep = scoreCircularDeps(graph);

    const graph2 = makeGraph({});
    graph2.circularDependencies = [['a.ts', 'b.ts', 'a.ts']];
    const resultShallow = scoreCircularDeps(graph2);

    expect(resultDeep.score).toBeLessThan(resultShallow.score);
  });
});

// ============================================================================
// FSD Boundaries
// ============================================================================

describe('scoreFSDBoundaries', () => {
  it('scores green when all deps respect layer hierarchy', () => {
    const graph = makeGraph({
      'src/features/archive/ui/List.svelte': {
        dependents: [],
        dependencies: ['src/entities/manifest/model.ts', 'src/shared/lib/cn.ts'],
      },
      'src/entities/manifest/model.ts': { dependents: [], dependencies: ['src/shared/types/index.ts'] },
      'src/shared/types/index.ts': { dependents: [], dependencies: [] },
      'src/shared/lib/cn.ts': { dependents: [], dependencies: [] },
    });
    const result = scoreFSDBoundaries(graph);
    expect(result.score).toBe(100);
  });

  it('detects feature-to-feature violations', () => {
    const graph = makeGraph({
      'src/features/archive/ui/List.svelte': {
        dependents: [],
        dependencies: ['src/features/viewer/model/annotation.ts'],
      },
      'src/features/viewer/model/annotation.ts': { dependents: [], dependencies: [] },
    });
    const result = scoreFSDBoundaries(graph);
    expect(result.score).toBeLessThan(100);
    expect(result.metrics.violations).toHaveLength(1);
  });

  it('detects entity importing from feature', () => {
    const graph = makeGraph({
      'src/entities/canvas/model.ts': {
        dependents: [],
        dependencies: ['src/features/viewer/model/viewer.svelte.ts'],
      },
      'src/features/viewer/model/viewer.svelte.ts': { dependents: [], dependencies: [] },
    });
    const result = scoreFSDBoundaries(graph);
    expect(result.metrics.violations).toHaveLength(1);
  });
});

// ============================================================================
// Import Depth
// ============================================================================

describe('scoreImportDepth', () => {
  it('scores green for shallow chains', () => {
    const graph = makeGraph({
      'src/main.ts': { dependents: [], dependencies: ['a.ts'] },
      'a.ts': { dependents: ['src/main.ts'], dependencies: ['b.ts'] },
      'b.ts': { dependents: ['a.ts'], dependencies: ['c.ts'] },
      'c.ts': { dependents: ['b.ts'], dependencies: [] },
    });
    const result = scoreImportDepth(graph);
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.metrics.maxDepth).toBe(3);
  });

  it('penalizes deep chains', () => {
    const adj: Record<string, { dependents: string[]; dependencies: string[] }> = {};
    for (let i = 0; i <= 12; i++) {
      const name = i === 0 ? 'src/main.ts' : `f${i}.ts`;
      const next = i < 12 ? `f${i + 1}.ts` : undefined;
      const prev = i > 0 ? (i === 1 ? 'src/main.ts' : `f${i - 1}.ts`) : undefined;
      adj[name] = {
        dependents: prev ? [prev] : [],
        dependencies: next ? [next] : [],
      };
    }
    const graph = makeGraph(adj);
    const result = scoreImportDepth(graph);
    expect(result.score).toBeLessThan(50);
    expect(result.metrics.maxDepth).toBe(12);
  });
});

// ============================================================================
// Barrel Health
// ============================================================================

describe('scoreBarrelHealth', () => {
  it('scores green when no barrels use export *', () => {
    const graph = makeGraph({
      'src/shared/types/index.ts': {
        dependents: ['a.ts'],
        dependencies: [],
      },
      'a.ts': { dependents: [], dependencies: ['src/shared/types/index.ts'] },
    });
    graph.files['src/shared/types/index.ts'].imports = [];
    graph.files['src/shared/types/index.ts'].exports = [
      { name: 'IIIFItem', type: 'named', isTypeExport: true },
    ];
    const result = scoreBarrelHealth(graph);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it('penalizes barrels with export * re-exports', () => {
    const graph = makeGraph({
      'src/entities/index.ts': { dependents: [], dependencies: ['src/entities/manifest/index.ts'] },
      'src/entities/manifest/index.ts': { dependents: [], dependencies: [] },
    });
    graph.files['src/entities/index.ts'].imports = [
      { source: './manifest', specifiers: ['[re-export-all]'], isTypeImport: false, isRelative: true, isAbsolute: false, isExternal: false, isInternalAlias: false },
    ];
    const result = scoreBarrelHealth(graph);
    expect(result.metrics.exportStarBarrels).toBeGreaterThan(0);
  });

  it('flags overstuffed barrels with >20 exports', () => {
    const graph = makeGraph({
      'src/shared/constants/index.ts': { dependents: [], dependencies: [] },
    });
    graph.files['src/shared/constants/index.ts'].exports = Array.from({ length: 25 }, (_, i) => ({
      name: `CONST_${i}`,
      type: 'named' as const,
      isTypeExport: false,
    }));
    const result = scoreBarrelHealth(graph);
    expect(result.metrics.overstuffedBarrels).toHaveLength(1);
  });
});

// ============================================================================
// Complexity
// ============================================================================

describe('scoreComplexity', () => {
  it('scores green when no files exceed 500 lines', () => {
    const graph = makeGraph({
      'a.ts': { dependents: [], dependencies: [] },
      'b.ts': { dependents: [], dependencies: [] },
    });
    graph.files['a.ts'].lines = 200;
    graph.files['b.ts'].lines = 300;
    const result = scoreComplexity(graph);
    expect(result.score).toBe(100);
  });

  it('penalizes files over 500 lines', () => {
    const graph = makeGraph({
      'big.ts': { dependents: [], dependencies: [] },
      'small.ts': { dependents: [], dependencies: [] },
    });
    graph.files['big.ts'].lines = 800;
    graph.files['small.ts'].lines = 100;
    const result = scoreComplexity(graph);
    expect(result.score).toBeLessThan(100);
    expect(result.metrics.over500).toHaveLength(1);
  });

  it('flags giant files over 1000 lines as red', () => {
    const graph = makeGraph({ 'giant.ts': { dependents: [], dependencies: [] } });
    graph.files['giant.ts'].lines = 1500;
    const result = scoreComplexity(graph);
    expect(result.flags.some(f => f.severity === 'red')).toBe(true);
  });
});

// ============================================================================
// Composer & Report
// ============================================================================

describe('compose', () => {
  it('computes weighted composite score', () => {
    const dimensions: Record<string, DimensionResult> = {
      coupling: { score: 80, grade: 'green', weight: 25, metrics: {}, flags: [] },
      deadCode: { score: 60, grade: 'yellow', weight: 25, metrics: {}, flags: [] },
      circularDeps: { score: 100, grade: 'green', weight: 10, metrics: {}, flags: [] },
      fsdBoundaries: { score: 100, grade: 'green', weight: 15, metrics: {}, flags: [] },
      importDepth: { score: 90, grade: 'green', weight: 10, metrics: {}, flags: [] },
      barrelHealth: { score: 70, grade: 'yellow', weight: 10, metrics: {}, flags: [] },
      complexity: { score: 100, grade: 'green', weight: 5, metrics: {}, flags: [] },
    };
    const scorecard = compose(dimensions, null);
    expect(scorecard.composite).toBe(81);
    expect(scorecard.grade).toBe('green');
  });

  it('collects all flags from dimensions', () => {
    const flag: Flag = { severity: 'red', dimension: 'coupling', message: 'test' };
    const dimensions: Record<string, DimensionResult> = {
      coupling: { score: 50, grade: 'yellow', weight: 100, metrics: {}, flags: [flag] },
    };
    const scorecard = compose(dimensions, null);
    expect(scorecard.flags).toContainEqual(flag);
  });

  it('tracks trend from previous scorecard', () => {
    const dimensions: Record<string, DimensionResult> = {
      coupling: { score: 70, grade: 'yellow', weight: 100, metrics: {}, flags: [] },
    };
    const previous: Scorecard = {
      generatedAt: '',
      composite: 60,
      grade: 'yellow',
      dimensions: {},
      flags: [],
      trends: { previousComposite: null, delta: null },
    };
    const scorecard = compose(dimensions, previous);
    expect(scorecard.trends.previousComposite).toBe(60);
    expect(scorecard.trends.delta).toBe(10);
  });
});

describe('generateReport', () => {
  it('produces markdown with composite score header', () => {
    const scorecard: Scorecard = {
      generatedAt: '2026-02-28T12:00:00Z',
      composite: 75,
      grade: 'yellow',
      dimensions: {
        coupling: { score: 75, grade: 'yellow', weight: 25, metrics: {}, flags: [] },
      },
      flags: [],
      trends: { previousComposite: 70, delta: 5 },
    };
    const md = generateReport(scorecard);
    expect(md).toContain('75/100');
    expect(md).toContain('YELLOW');
    expect(md).toContain('+5');
  });
});
