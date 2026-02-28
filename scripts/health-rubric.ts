#!/usr/bin/env node
/**
 * Health Rubric Scorer
 *
 * Reads dependencies.json and scores codebase health across 7 dimensions.
 * Outputs health-scorecard.json and health-report.md.
 *
 * Usage: npx tsx scripts/health-rubric.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import type { DependencyGraph, ImportInfo, ExportInfo, FileAnalysis } from './analyze-imports';

// ============================================================================
// Types
// ============================================================================

export type Grade = 'green' | 'yellow' | 'red';

export interface DimensionResult {
  score: number;
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
// Dimension: Coupling (25%)
// ============================================================================

const UTILITY_PATHS = [
  'src/shared/lib/cn.ts',
  'src/shared/lib/contextual-styles.ts',
  'src/shared/lib/debug.ts',
];

export function scoreCoupling(graph: DependencyGraph): DimensionResult {
  const files = Object.values(graph.files);
  const totalFiles = files.length;
  const flags: Flag[] = [];

  const godModules = files
    .filter(f => f.dependents.length > 50 && !UTILITY_PATHS.includes(f.filePath))
    .map(f => f.filePath);

  for (const gm of godModules) {
    const count = graph.files[gm].dependents.length;
    flags.push({ severity: 'red', dimension: 'coupling', message: `${gm} has ${count} dependents (God module)` });
  }

  const highFanOut = files.filter(f => f.dependencies.length > 10);
  const highFanOutPct = (highFanOut.length / totalFiles) * 100;

  const totalEdges = files.reduce((sum, f) => sum + f.dependents.length, 0);
  const top10Edges = files
    .map(f => f.dependents.length)
    .sort((a, b) => b - a)
    .slice(0, 10)
    .reduce((sum, n) => sum + n, 0);
  const top10Pct = totalEdges > 0 ? (top10Edges / totalEdges) * 100 : 0;

  let score = 100;
  score -= godModules.length * 20;
  score -= Math.max(0, highFanOutPct - 5) * 3;
  // Only penalize top-10 concentration when there are enough files for it to be meaningful
  if (totalFiles > 10) {
    score -= Math.max(0, top10Pct - 40) * 1;
  }
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

// ============================================================================
// Dimension: Dead Code (25%)
// ============================================================================

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
      orphanFiles: effectiveOrphans.slice(0, 15),
    },
    flags,
  };
}

// ============================================================================
// Dimension: Circular Deps (10%)
// ============================================================================

export function scoreCircularDeps(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];
  const cycles = graph.circularDependencies;

  const selfRefs = cycles.filter(c => c.length === 2 && c[0] === c[1]);
  const realCycles = cycles.filter(c => !(c.length === 2 && c[0] === c[1]));

  const depths = realCycles.map(c => c.length - 1);
  const deepCycles = depths.filter(d => d >= 3).length;
  const shallowCycles = depths.filter(d => d === 2).length;

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

// ============================================================================
// Dimension: FSD Boundaries (15%)
// ============================================================================

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

      if (toLayer.rank > fromLayer.rank) {
        violations.push({ from: file.filePath, to: dep, type: 'upward' });
      }

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

// ============================================================================
// Dimension: Import Depth (10%)
// ============================================================================

export function scoreImportDepth(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];

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

// ============================================================================
// Dimension: Barrel Health (10%)
// ============================================================================

export function scoreBarrelHealth(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];
  const barrels = Object.values(graph.files).filter(f => f.fileName === 'index.ts' || f.fileName === 'index.svelte');
  const totalBarrels = barrels.length;

  const exportStarBarrels = barrels.filter(b =>
    b.imports.some(i => i.specifiers.some(s => s === '[re-export-all]'))
  );

  const overstuffedBarrels = barrels
    .filter(b => b.exports.length > 20)
    .map(b => ({ file: b.filePath, exportCount: b.exports.length }));

  const exportStarRatio = totalBarrels > 0 ? (exportStarBarrels.length / totalBarrels) * 100 : 0;

  let score = 100;
  score -= exportStarRatio * 1.5;
  score -= overstuffedBarrels.length * 10;
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

// ============================================================================
// Dimension: Complexity (5%)
// ============================================================================

export function scoreComplexity(graph: DependencyGraph): DimensionResult {
  const flags: Flag[] = [];
  const files = Object.values(graph.files);

  const over500 = files.filter(f => f.lines > 500).map(f => ({ file: f.filePath, lines: f.lines }));
  const over1000 = over500.filter(f => f.lines > 1000);
  const avgLines = files.length > 0 ? files.reduce((sum, f) => sum + f.lines, 0) / files.length : 0;

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

// ============================================================================
// Composer & Report
// ============================================================================

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
    lines.push(`| ${name} | ${Math.round(dim.score)} | ${dim.grade.toUpperCase()} | ${dim.weight}% |`);
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

// ============================================================================
// Main
// ============================================================================

async function main() {
  const { fileURLToPath } = await import('url');
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const depsPath = path.resolve(__dirname, '../public/dependencies.json');
  const scorecardPath = path.resolve(__dirname, '../public/health-scorecard.json');
  const reportPath = path.resolve(__dirname, '../public/health-report.md');

  if (!fs.existsSync(depsPath)) {
    console.error('dependencies.json not found. Run analyze-imports.ts first.');
    process.exit(1);
  }
  const graph: DependencyGraph = JSON.parse(fs.readFileSync(depsPath, 'utf-8'));

  let previous: Scorecard | null = null;
  if (fs.existsSync(scorecardPath)) {
    try {
      previous = JSON.parse(fs.readFileSync(scorecardPath, 'utf-8'));
    } catch { /* ignore corrupt file */ }
  }

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

  fs.writeFileSync(scorecardPath, JSON.stringify(scorecard, null, 2));
  fs.writeFileSync(reportPath, report);

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

// Only run when executed directly (not when imported by tests)
const isCLI = process.argv[1]?.includes('health-rubric');
if (isCLI) {
  main();
}
