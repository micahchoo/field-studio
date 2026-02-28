# Health Rubric Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `scripts/health-rubric.ts` that reads `dependencies.json`, scores 7 dimensions of codebase health, and outputs a scorecard JSON + markdown report.

**Architecture:** Standalone script consuming the existing dependency graph. Each dimension is a pure function `(graph) => DimensionResult`. A composer weights them into a composite. Trend tracking reads the previous scorecard before overwriting.

**Tech Stack:** Node.js, TypeScript (tsx runner), fs/path. No external deps.

**Design doc:** `docs/plans/2026-02-28-health-rubric-design.md`

---

### Task 1: Types & Scaffolding

**Files:**
- Create: `scripts/health-rubric.ts`
- Create: `test/scripts/health-rubric.test.ts`

**Step 1: Write the type definitions and empty main**

```typescript
// scripts/health-rubric.ts
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { DependencyGraph } from './analyze-imports';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// Types
// ============================================================================

export type Grade = 'green' | 'yellow' | 'red';

export interface DimensionResult {
  score: number;       // 0-100
  grade: Grade;
  weight: number;
  metrics: Record<string, unknown>;
  flags: Flag[];
}

export interface Flag {
  severity: Grade;
  dimension: string;
  message: string;
}

export interface Scorecard {
  generatedAt: string;
  composite: number;
  grade: Grade;
  dimensions: Record<string, DimensionResult>;
  flags: Flag[];
  trends: {
    previousComposite: number | null;
    delta: number | null;
  };
}

// ============================================================================
// Scoring Utilities
// ============================================================================

export function grade(score: number): Grade {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

/** Linearly interpolate a value within [worst, best] to a 0-100 score. */
export function linearScore(value: number, best: number, worst: number): number {
  if (best === worst) return value <= best ? 100 : 0;
  const raw = ((value - worst) / (best - worst)) * 100;
  return Math.max(0, Math.min(100, raw));
}

// ============================================================================
// Main (placeholder)
// ============================================================================

function main() {
  console.log('health-rubric: not yet implemented');
}

main();
```

**Step 2: Write initial tests for scoring utilities**

```typescript
// test/scripts/health-rubric.test.ts
import { describe, it, expect } from 'vitest';
import { grade, linearScore } from '../../scripts/health-rubric';

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
```

**Step 3: Run tests to verify they pass**

Run: `npx vitest run test/scripts/health-rubric.test.ts`
Expected: all 8 tests PASS

**Step 4: Commit**

```bash
git add scripts/health-rubric.ts test/scripts/health-rubric.test.ts
git commit -m "feat(scripts): scaffold health-rubric with types and scoring utilities"
```

---

### Task 2: Coupling Dimension

**Files:**
- Modify: `scripts/health-rubric.ts`
- Modify: `test/scripts/health-rubric.test.ts`

**Step 1: Write the failing test**

```typescript
import { scoreCoupling } from '../../scripts/health-rubric';

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
```

A `makeGraph` test helper builds a minimal `DependencyGraph` from adjacency shorthand:

```typescript
// test helper at top of test file
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run test/scripts/health-rubric.test.ts`
Expected: FAIL — `scoreCoupling` not exported

**Step 3: Implement scoreCoupling**

```typescript
// in health-rubric.ts

const UTILITY_PATHS = [
  'src/shared/lib/cn.ts',
  'src/shared/lib/contextual-styles.ts',
  'src/shared/lib/debug.ts',
];

export function scoreCoupling(graph: DependencyGraph): DimensionResult {
  const files = Object.values(graph.files);
  const totalFiles = files.length;
  const flags: Flag[] = [];

  // God modules: >50 dependents, excluding known utilities
  const godModules = files
    .filter(f => f.dependents.length > 50 && !UTILITY_PATHS.includes(f.filePath))
    .map(f => f.filePath);

  for (const gm of godModules) {
    const count = graph.files[gm].dependents.length;
    flags.push({ severity: 'red', dimension: 'coupling', message: `${gm} has ${count} dependents (God module)` });
  }

  // High fan-out: files with >10 dependencies
  const highFanOut = files.filter(f => f.dependencies.length > 10);
  const highFanOutPct = (highFanOut.length / totalFiles) * 100;

  // Top-10 concentration: % of total edges through top 10
  const totalEdges = files.reduce((sum, f) => sum + f.dependents.length, 0);
  const top10Edges = files
    .map(f => f.dependents.length)
    .sort((a, b) => b - a)
    .slice(0, 10)
    .reduce((sum, n) => sum + n, 0);
  const top10Pct = totalEdges > 0 ? (top10Edges / totalEdges) * 100 : 0;

  // Score: penalize god modules heavily, fan-out moderately
  let score = 100;
  score -= godModules.length * 20;              // each god module = -20
  score -= Math.max(0, highFanOutPct - 5) * 3;  // above 5% threshold, -3 per %
  score -= Math.max(0, top10Pct - 40) * 1;      // above 40% concentration, -1 per %

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    grade: grade(score),
    weight: 25,
    metrics: {
      godModules,
      godModuleCount: godModules.length,
      highFanOutFiles: highFanOut.length,
      highFanOutPct: +highFanOutPct.toFixed(1),
      top10ConcentrationPct: +top10Pct.toFixed(1),
      totalEdges,
    },
    flags,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run test/scripts/health-rubric.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/health-rubric.ts test/scripts/health-rubric.test.ts
git commit -m "feat(scripts): coupling dimension scorer"
```

---

### Task 3: Dead Code Dimension

**Files:**
- Modify: `scripts/health-rubric.ts`
- Modify: `test/scripts/health-rubric.test.ts`

**Step 1: Write the failing test**

```typescript
import { scoreDeadCode } from '../../scripts/health-rubric';

describe('scoreDeadCode', () => {
  it('scores green when orphan ratio is below 3%', () => {
    // 100 files, 2 orphans, 1 is an entry point
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
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run test/scripts/health-rubric.test.ts`
Expected: FAIL — `scoreDeadCode` not exported

**Step 3: Implement scoreDeadCode**

```typescript
const KNOWN_ENTRY_POINTS = [
  'src/main.ts',
  'src/test-setup.ts',
  'src/app/ui/App.svelte',
];

export function scoreDeadCode(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];

  const effectiveOrphans = graph.orphans.filter(
    o => !KNOWN_ENTRY_POINTS.includes(o) && !o.includes('Widget') && !o.endsWith('/index.ts')
  );
  const orphanRatio = (effectiveOrphans.length / graph.totalFiles) * 100;

  // Score: <3% green, 3-7% yellow, >7% red
  const score = linearScore(orphanRatio, 0, 15);

  if (effectiveOrphans.length > 0) {
    flags.push({
      severity: orphanRatio > 7 ? 'red' : 'yellow',
      dimension: 'deadCode',
      message: `${effectiveOrphans.length} orphan files (${orphanRatio.toFixed(1)}%)`,
    });
  }

  return {
    score,
    grade: grade(score),
    weight: 25,
    metrics: {
      totalOrphans: graph.orphans.length,
      effectiveOrphans: effectiveOrphans.length,
      orphanRatioPct: +orphanRatio.toFixed(1),
      orphanFiles: effectiveOrphans.slice(0, 15), // cap for readability
    },
    flags,
  };
}
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add scripts/health-rubric.ts test/scripts/health-rubric.test.ts
git commit -m "feat(scripts): dead code dimension scorer"
```

---

### Task 4: Circular Deps Dimension

**Files:**
- Modify: `scripts/health-rubric.ts`
- Modify: `test/scripts/health-rubric.test.ts`

**Step 1: Write the failing test**

```typescript
import { scoreCircularDeps } from '../../scripts/health-rubric';

describe('scoreCircularDeps', () => {
  it('scores green when no real cycles', () => {
    const graph = makeGraph({ 'a.ts': { dependents: [], dependencies: [] } });
    graph.circularDependencies = [['a.ts', 'a.ts']]; // self-ref, filtered
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
    graph.circularDependencies = [['a.ts', 'b.ts', 'c.ts', 'a.ts']]; // depth 3
    const resultDeep = scoreCircularDeps(graph);

    const graph2 = makeGraph({});
    graph2.circularDependencies = [['a.ts', 'b.ts', 'a.ts']]; // depth 2
    const resultShallow = scoreCircularDeps(graph2);

    expect(resultDeep.score).toBeLessThan(resultShallow.score);
  });
});
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement scoreCircularDeps**

```typescript
export function scoreCircularDeps(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];
  const cycles = graph.circularDependencies;

  // A self-ref is [A, A] — length 2 with same start/end
  const selfRefs = cycles.filter(c => c.length === 2 && c[0] === c[1]);
  const realCycles = cycles.filter(c => !(c.length === 2 && c[0] === c[1]));

  // Depth = unique nodes in cycle (length - 1 since last === first)
  const depths = realCycles.map(c => c.length - 1);
  const deepCycles = depths.filter(d => d >= 3).length;
  const shallowCycles = depths.filter(d => d === 2).length;

  // Score: each shallow = -15, each deep = -25
  let score = 100;
  score -= shallowCycles * 15;
  score -= deepCycles * 25;
  score = Math.max(0, Math.min(100, score));

  for (const cycle of realCycles) {
    const depth = cycle.length - 1;
    flags.push({
      severity: depth >= 3 ? 'red' : 'yellow',
      dimension: 'circularDeps',
      message: `Cycle (depth ${depth}): ${cycle.join(' → ')}`,
    });
  }

  return {
    score,
    grade: grade(score),
    weight: 10,
    metrics: {
      totalCycles: cycles.length,
      selfRefCount: selfRefs.length,
      realCycleCount: realCycles.length,
      shallowCycles,
      deepCycles,
    },
    flags,
  };
}
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add scripts/health-rubric.ts test/scripts/health-rubric.test.ts
git commit -m "feat(scripts): circular deps dimension scorer"
```

---

### Task 5: FSD Boundaries Dimension

**Files:**
- Modify: `scripts/health-rubric.ts`
- Modify: `test/scripts/health-rubric.test.ts`

**Step 1: Write the failing test**

```typescript
import { scoreFSDBoundaries } from '../../scripts/health-rubric';

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
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement scoreFSDBoundaries**

```typescript
// Layer rank: lower = more foundational. Higher layers may import lower, not vice versa.
const FSD_LAYERS: Record<string, number> = {
  shared: 0,
  entities: 1,
  features: 2,
  widgets: 3,
  app: 4,
};

function getFSDLayer(filePath: string): { layer: string; rank: number; feature?: string } | null {
  const match = filePath.match(/^src\/(\w+)(?:\/([^/]+))?/);
  if (!match) return null;
  const layer = match[1];
  const rank = FSD_LAYERS[layer];
  if (rank === undefined) return null;
  return { layer, rank, feature: layer === 'features' || layer === 'widgets' ? match[2] : undefined };
}

interface FSDViolation {
  from: string;
  to: string;
  type: 'upward' | 'cross-feature';
}

export function scoreFSDBoundaries(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];
  const violations: FSDViolation[] = [];

  for (const file of Object.values(graph.files)) {
    const fromLayer = getFSDLayer(file.filePath);
    if (!fromLayer) continue;

    for (const dep of file.dependencies) {
      const toLayer = getFSDLayer(dep);
      if (!toLayer) continue;

      // Upward violation: importing from a higher layer
      if (toLayer.rank > fromLayer.rank) {
        violations.push({ from: file.filePath, to: dep, type: 'upward' });
      }

      // Cross-feature: same layer (features), different feature, not via index
      if (
        fromLayer.layer === 'features' &&
        toLayer.layer === 'features' &&
        fromLayer.feature &&
        toLayer.feature &&
        fromLayer.feature !== toLayer.feature
      ) {
        violations.push({ from: file.filePath, to: dep, type: 'cross-feature' });
      }
    }
  }

  // Score: each violation = -10, capped at 0
  const score = Math.max(0, 100 - violations.length * 10);

  for (const v of violations.slice(0, 10)) {
    flags.push({
      severity: v.type === 'upward' ? 'red' : 'yellow',
      dimension: 'fsdBoundaries',
      message: `${v.type}: ${v.from} → ${v.to}`,
    });
  }

  return {
    score,
    grade: grade(score),
    weight: 15,
    metrics: {
      violations: violations.slice(0, 20),
      violationCount: violations.length,
      upwardCount: violations.filter(v => v.type === 'upward').length,
      crossFeatureCount: violations.filter(v => v.type === 'cross-feature').length,
    },
    flags,
  };
}
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add scripts/health-rubric.ts test/scripts/health-rubric.test.ts
git commit -m "feat(scripts): FSD boundaries dimension scorer"
```

---

### Task 6: Import Depth Dimension

**Files:**
- Modify: `scripts/health-rubric.ts`
- Modify: `test/scripts/health-rubric.test.ts`

**Step 1: Write the failing test**

```typescript
import { scoreImportDepth } from '../../scripts/health-rubric';

describe('scoreImportDepth', () => {
  it('scores green for shallow chains', () => {
    // Chain: main → a → b → c (depth 3)
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
    // Chain of 12 hops
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
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement scoreImportDepth**

```typescript
export function scoreImportDepth(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];

  // BFS from src/main.ts
  const depths = new Map<string, number>();
  const queue: [string, number][] = [['src/main.ts', 0]];
  depths.set('src/main.ts', 0);

  while (queue.length > 0) {
    const [node, depth] = queue.shift()!;
    const file = graph.files[node];
    if (!file) continue;

    for (const dep of file.dependencies) {
      if (!depths.has(dep)) {
        depths.set(dep, depth + 1);
        queue.push([dep, depth + 1]);
      }
    }
  }

  const allDepths = [...depths.values()];
  const maxDepth = allDepths.length > 0 ? Math.max(...allDepths) : 0;
  const avgDepth = allDepths.length > 0 ? allDepths.reduce((a, b) => a + b, 0) / allDepths.length : 0;
  const deepFiles = [...depths.entries()].filter(([, d]) => d > 8).map(([f]) => f);

  // Score: max <6 = 100, 6-10 linear, >10 = 0
  const score = linearScore(maxDepth, 5, 12);

  if (maxDepth > 8) {
    flags.push({
      severity: maxDepth > 10 ? 'red' : 'yellow',
      dimension: 'importDepth',
      message: `Max import depth: ${maxDepth} hops`,
    });
  }

  if (deepFiles.length > 0) {
    flags.push({
      severity: 'yellow',
      dimension: 'importDepth',
      message: `${deepFiles.length} files reachable only through >8 hops`,
    });
  }

  return {
    score,
    grade: grade(score),
    weight: 10,
    metrics: {
      maxDepth,
      avgDepth: +avgDepth.toFixed(1),
      deepFiles: deepFiles.slice(0, 10),
      reachableFromMain: depths.size,
      unreachableFromMain: graph.totalFiles - depths.size,
    },
    flags,
  };
}
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add scripts/health-rubric.ts test/scripts/health-rubric.test.ts
git commit -m "feat(scripts): import depth dimension scorer"
```

---

### Task 7: Barrel Health Dimension

**Files:**
- Modify: `scripts/health-rubric.ts`
- Modify: `test/scripts/health-rubric.test.ts`

**Step 1: Write the failing test**

```typescript
import { scoreBarrelHealth } from '../../scripts/health-rubric';

describe('scoreBarrelHealth', () => {
  it('scores green when no barrels use export *', () => {
    const graph = makeGraph({
      'src/shared/types/index.ts': {
        dependents: ['a.ts'],
        dependencies: [],
      },
      'a.ts': { dependents: [], dependencies: ['src/shared/types/index.ts'] },
    });
    // No re-export-all specifiers
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
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement scoreBarrelHealth**

```typescript
export function scoreBarrelHealth(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];
  const barrels = Object.values(graph.files).filter(f => f.fileName === 'index.ts' || f.fileName === 'index.svelte');
  const totalBarrels = barrels.length;

  // Barrels using export *
  const exportStarBarrels = barrels.filter(b =>
    b.imports.some(i => i.specifiers.some(s => s === '[re-export-all]'))
  );

  // Overstuffed: >20 exports
  const overstuffedBarrels = barrels
    .filter(b => b.exports.length > 20)
    .map(b => ({ file: b.filePath, exportCount: b.exports.length }));

  const exportStarRatio = totalBarrels > 0 ? (exportStarBarrels.length / totalBarrels) * 100 : 0;

  // Score
  let score = 100;
  score -= exportStarRatio * 1.5;               // each % of export* barrels = -1.5
  score -= overstuffedBarrels.length * 10;       // each overstuffed = -10
  score = Math.max(0, Math.min(100, score));

  if (exportStarBarrels.length > 0) {
    flags.push({
      severity: exportStarRatio > 30 ? 'red' : 'yellow',
      dimension: 'barrelHealth',
      message: `${exportStarBarrels.length}/${totalBarrels} barrels use export * (${exportStarRatio.toFixed(0)}%)`,
    });
  }

  for (const b of overstuffedBarrels) {
    flags.push({
      severity: b.exportCount > 40 ? 'red' : 'yellow',
      dimension: 'barrelHealth',
      message: `${b.file} re-exports ${b.exportCount} symbols`,
    });
  }

  return {
    score,
    grade: grade(score),
    weight: 10,
    metrics: {
      totalBarrels,
      exportStarBarrels: exportStarBarrels.length,
      exportStarRatioPct: +exportStarRatio.toFixed(1),
      overstuffedBarrels,
    },
    flags,
  };
}
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add scripts/health-rubric.ts test/scripts/health-rubric.test.ts
git commit -m "feat(scripts): barrel health dimension scorer"
```

---

### Task 8: Complexity Dimension

**Files:**
- Modify: `scripts/health-rubric.ts`
- Modify: `test/scripts/health-rubric.test.ts`

**Step 1: Write the failing test**

```typescript
import { scoreComplexity } from '../../scripts/health-rubric';

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
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement scoreComplexity**

```typescript
export function scoreComplexity(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];
  const files = Object.values(graph.files);

  const over500 = files.filter(f => f.lines > 500).map(f => ({ file: f.filePath, lines: f.lines }));
  const over1000 = over500.filter(f => f.lines > 1000);
  const avgLines = files.length > 0 ? files.reduce((sum, f) => sum + f.lines, 0) / files.length : 0;

  // Score: each >500 = -15, each >1000 = additional -10
  let score = 100;
  score -= over500.length * 15;
  score -= over1000.length * 10;
  score = Math.max(0, Math.min(100, score));

  for (const f of over1000) {
    flags.push({ severity: 'red', dimension: 'complexity', message: `${f.file}: ${f.lines} lines` });
  }
  for (const f of over500.filter(x => x.lines <= 1000)) {
    flags.push({ severity: 'yellow', dimension: 'complexity', message: `${f.file}: ${f.lines} lines` });
  }

  return {
    score,
    grade: grade(score),
    weight: 5,
    metrics: {
      over500: over500.sort((a, b) => b.lines - a.lines),
      over500Count: over500.length,
      over1000Count: over1000.length,
      avgLines: +avgLines.toFixed(0),
    },
    flags,
  };
}
```

**Step 4: Run tests, verify pass**

**Step 5: Commit**

```bash
git add scripts/health-rubric.ts test/scripts/health-rubric.test.ts
git commit -m "feat(scripts): complexity dimension scorer"
```

---

### Task 9: Composer, Report Generator, and Main

**Files:**
- Modify: `scripts/health-rubric.ts`
- Modify: `test/scripts/health-rubric.test.ts`

**Step 1: Write the failing test for compose**

```typescript
import { compose, generateReport } from '../../scripts/health-rubric';

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
    // (80*25 + 60*25 + 100*10 + 100*15 + 90*10 + 70*10 + 100*5) / 100 = 81.0
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
```

**Step 2: Run tests — expect FAIL**

**Step 3: Implement compose and generateReport**

```typescript
export function compose(
  dimensions: Record<string, DimensionResult>,
  previous: Scorecard | null,
): Scorecard {
  const totalWeight = Object.values(dimensions).reduce((s, d) => s + d.weight, 0);
  const weightedSum = Object.values(dimensions).reduce((s, d) => s + d.score * d.weight, 0);
  const composite = Math.round(weightedSum / totalWeight);

  const flags = Object.values(dimensions)
    .flatMap(d => d.flags)
    .sort((a, b) => {
      const order: Record<Grade, number> = { red: 0, yellow: 1, green: 2 };
      return order[a.severity] - order[b.severity];
    });

  return {
    generatedAt: new Date().toISOString(),
    composite,
    grade: grade(composite),
    dimensions,
    flags,
    trends: {
      previousComposite: previous?.composite ?? null,
      delta: previous ? composite - previous.composite : null,
    },
  };
}

export function generateReport(scorecard: Scorecard): string {
  const lines: string[] = [];
  const g = scorecard.grade.toUpperCase();
  lines.push(`# Health Report — ${scorecard.generatedAt.split('T')[0]}`);
  lines.push(`**Composite: ${scorecard.composite}/100 (${g})**`);
  lines.push('');

  if (scorecard.trends.delta !== null) {
    const sign = scorecard.trends.delta >= 0 ? '+' : '';
    lines.push(`**Trend:** ${sign}${scorecard.trends.delta} from previous (${scorecard.trends.previousComposite})`);
    lines.push('');
  }

  lines.push('| Dimension | Score | Grade | Weight |');
  lines.push('|-----------|-------|-------|--------|');
  for (const [name, dim] of Object.entries(scorecard.dimensions)) {
    lines.push(`| ${name} | ${dim.score} | ${dim.grade.toUpperCase()} | ${dim.weight}% |`);
  }
  lines.push('');

  if (scorecard.flags.length > 0) {
    lines.push('## Flags');
    lines.push('');
    for (const f of scorecard.flags) {
      lines.push(`- **[${f.severity.toUpperCase()}]** ${f.dimension}: ${f.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
```

**Step 4: Implement main function**

Replace the placeholder `main()` with:

```typescript
function main() {
  const depsPath = path.resolve(__dirname, '../public/dependencies.json');
  const scorecardPath = path.resolve(__dirname, '../public/health-scorecard.json');
  const reportPath = path.resolve(__dirname, '../public/health-report.md');

  // Read dependency graph
  if (!fs.existsSync(depsPath)) {
    console.error('dependencies.json not found. Run analyze-imports.ts first.');
    process.exit(1);
  }
  const graph: DependencyGraph = JSON.parse(fs.readFileSync(depsPath, 'utf-8'));

  // Read previous scorecard for trend tracking
  let previous: Scorecard | null = null;
  if (fs.existsSync(scorecardPath)) {
    try {
      previous = JSON.parse(fs.readFileSync(scorecardPath, 'utf-8'));
    } catch { /* ignore corrupt file */ }
  }

  // Score all dimensions
  const dimensions: Record<string, DimensionResult> = {
    coupling: scoreCoupling(graph),
    deadCode: scoreDeadCode(graph),
    circularDeps: scoreCircularDeps(graph),
    fsdBoundaries: scoreFSDBoundaries(graph),
    importDepth: scoreImportDepth(graph),
    barrelHealth: scoreBarrelHealth(graph),
    complexity: scoreComplexity(graph),
  };

  const scorecard = compose(dimensions, previous);
  const report = generateReport(scorecard);

  // Write outputs
  fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2));
  fs.writeFileSync(reportPath, report);

  // Console summary
  const g = scorecard.grade.toUpperCase();
  console.log(`Health: ${scorecard.composite}/100 (${g})`);
  if (scorecard.trends.delta !== null) {
    const sign = scorecard.trends.delta >= 0 ? '+' : '';
    console.log(`Trend: ${sign}${scorecard.trends.delta}`);
  }
  const redFlags = scorecard.flags.filter(f => f.severity === 'red');
  if (redFlags.length > 0) {
    console.log(`Red flags: ${redFlags.length}`);
  }
}
```

**Step 5: Run full test suite**

Run: `npx vitest run test/scripts/health-rubric.test.ts`
Expected: all tests PASS

**Step 6: Run the script against real data**

Run: `npx tsx scripts/health-rubric.ts`
Expected: outputs composite score, writes `public/health-scorecard.json` and `public/health-report.md`

**Step 7: Commit**

```bash
git add scripts/health-rubric.ts test/scripts/health-rubric.test.ts
git commit -m "feat(scripts): composer, report generator, and main entry point"
```

---

### Task 10: Hook Integration & Cleanup

**Files:**
- Modify: `scripts/postinstall.js:17-20` (hook content)
- Delete: `scripts/audit-props.ts`
- Delete: `scripts/verify-atomic-structure.sh`

**Step 1: Update post-commit hook to run both scripts**

In `scripts/postinstall.js`, change the `hookContent` template:

```javascript
const hookContent = `#!/bin/sh
# Post-commit hook - Updates dependency graph and health scorecard
echo "Updating dependency graph..."
unset LD_LIBRARY_PATH && npx tsx scripts/analyze-imports.ts
echo "Running health rubric..."
unset LD_LIBRARY_PATH && npx tsx scripts/health-rubric.ts`;
```

**Step 2: Delete stale scripts**

```bash
git rm scripts/audit-props.ts scripts/verify-atomic-structure.sh
```

**Step 3: Reinstall hook**

Run: `node scripts/postinstall.js`
Expected: `✓ post-commit hook installed`

**Step 4: Verify end-to-end by making a test commit**

Run: `npx tsx scripts/analyze-imports.ts && npx tsx scripts/health-rubric.ts`
Expected: scorecard JSON and report markdown written, console shows composite score

**Step 5: Commit**

```bash
git add scripts/postinstall.js
git commit -m "chore: integrate health-rubric into post-commit hook, remove stale scripts"
```

---

### Task 11: Add health outputs to .gitignore

**Files:**
- Modify: `.gitignore`

**Step 1: Check if health outputs should be tracked or ignored**

The `public/dependencies.json` is already tracked (committed on every commit). Follow the same pattern for `health-scorecard.json` and `health-report.md` — they are generated artifacts but useful to have in version control for trend diffing.

No `.gitignore` change needed. Skip this task.

---
