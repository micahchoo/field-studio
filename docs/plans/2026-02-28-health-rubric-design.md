# Health Rubric Design

_2026-02-28. Scorecard system for codebase health observability._

## Problem

`analyze-imports.ts` generates a 1.4MB dependency graph on every commit, but the raw data isn't actionable at a glance. Two other scripts (`audit-props.ts`, `verify-atomic-structure.sh`) target stale React/atomic paths. There's no scoring, no trend tracking, and no way to spot drift between sessions.

## Solution

A standalone `scripts/health-rubric.ts` that reads `dependencies.json` + scans source files, then outputs:
- `public/health-scorecard.json` — machine-readable scores per dimension
- `public/health-report.md` — human-scannable markdown summary

Runs in the post-commit hook after `analyze-imports.ts`.

## Consumer

Human (developer) scanning between sessions. Not CI gating.

## Signal Scope

Dependency graph (`dependencies.json`) + static file analysis (line counts, barrel exports). No external tool runs (tsc, eslint, vitest).

## Dimensions (7)

| Dimension | Weight | Green (80-100) | Yellow (50-79) | Red (0-49) |
|-----------|--------|----------------|----------------|------------|
| Coupling | 25% | No file >50 dependents (excl utilities), <5% files with >10 deps | 1-2 God modules, 5-10% high fan-out | 3+ God modules or >10% high fan-out |
| Dead Code | 25% | <3% orphan ratio (after entry point exclusion) | 3-7% orphan ratio | >7% orphan ratio |
| Circular Deps | 10% | 0 real multi-file cycles | 1-3 real cycles, all depth-2 | 4+ cycles or any depth-3+ |
| FSD Boundaries | 15% | 0 cross-layer violations | 1-5 violations | 6+ violations |
| Import Depth | 10% | Max chain <6 hops | Max chain 6-10 hops | Max chain >10 hops |
| Barrel Health | 10% | 0 `export *` barrels, no barrel >20 symbols | <30% barrels use `export *` | >30% `export *` or barrels >40 symbols |
| Complexity | 5% | 0 files >500 lines | 1-5 files >500 lines | 6+ files >500 lines or any >1000 |

### Metric Details

**Coupling (25%)**
- Fan-out concentration: % of files with >10 dependencies
- Fan-in hotspots: files with >50 dependents flagged as God modules
- Top-10 concentration ratio: % of total edges through the 10 most-imported files
- Utility files (`cn.ts`, `contextual-styles.ts`) get a pass — domain files at that level are the smell

**Dead Code (25%)**
- Orphan ratio: `(orphans - knownEntryPoints) / totalFiles`
- Known entry points excluded: `main.ts`, `test-setup.ts`, `App.svelte`, widget roots
- Unused exports: files exporting symbols no other file imports (cross-reference export names vs import specifiers)

**Circular Deps (10%)**
- Filter self-references (A→A) — parser artifacts from `.svelte.ts` files
- Count only real multi-file cycles
- Penalize by count and depth (2-file = minor, 3+ = serious)

**FSD Boundaries (15%)**
- Layer hierarchy: `shared → entities → features → widgets → app`
- Violation = dependency pointing "down" the hierarchy
- Cross-feature imports: `features/X` importing from `features/Y` internals (not via index barrel)

**Import Depth (10%)**
- BFS from `src/main.ts` to compute max and average transitive depth
- Flag files reachable only through chains >8 hops
- Score: max <6 = green, 6-10 = yellow, >10 = red

**Barrel Health (10%)**
- Count index files using `export *` (re-export-all) — prevents tree-shaking, masks circular deps
- Flag barrels re-exporting >20 symbols (overstuffed)
- Score: ratio of `export *` barrels to total barrels (lower = better)

**Complexity (5%)**
- Count files exceeding 500 lines (organism ESLint threshold)
- Flag files >1000 lines individually
- Track average file size as trend baseline

## Output Format

### health-scorecard.json

```json
{
  "generatedAt": "ISO timestamp",
  "composite": 72,
  "grade": "yellow",
  "dimensions": {
    "coupling": {
      "score": 65,
      "grade": "yellow",
      "weight": 25,
      "metrics": {
        "godModules": ["src/shared/lib/cn.ts"],
        "highFanOutFiles": 12,
        "highFanOutPct": 2.0,
        "top10ConcentrationPct": 34.5
      }
    }
  },
  "flags": [
    { "severity": "red", "dimension": "coupling", "message": "cn.ts has 277 dependents" }
  ],
  "trends": {
    "previousComposite": null,
    "delta": null
  }
}
```

### health-report.md

Generated from JSON. Contains:
- Composite score + grade
- Per-dimension table with scores and key findings
- Flags section (red first, then yellow)
- Trend delta from previous run

## Integration

Post-commit hook (`scripts/postinstall.js`) updated to run both:
1. `npx tsx scripts/analyze-imports.ts`
2. `npx tsx scripts/health-rubric.ts`

## Cleanup

Remove stale scripts:
- `scripts/audit-props.ts` — targets old React `components/` dir
- `scripts/verify-atomic-structure.sh` — targets old `utils/atoms/` paths

## Scoring Formula

Per-dimension: linear interpolation between threshold boundaries.
Composite: `sum(dimension.score * dimension.weight) / sum(weights)`
