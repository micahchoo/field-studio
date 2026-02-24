# DOCSTATE.md — Documentation State Tracker

_Updated: 2026-02-24. Single source of truth for doc health._

---

## Status Summary

| Doc | Audience | Status | Action |
|-----|----------|--------|--------|
| `README.md` | Developers | FIXED this round | Port, commands, architecture, framework |
| `docs/AGENTS.md` | AI coding agents | FIXED this round | Full rewrite for Svelte 5 |
| `docs/CLAUDE.md` | Claude Code | FIXED this round | Full rewrite for Svelte 5 |
| `lint.md` | — | ARTIFACT | Should be deleted or gitignored — it's a raw ESLint dump, not a doc |
| `docs/Architecture/*.md` | Developers | STALE | Pre-migration React architecture docs. Marked stale pending removal or replacement |
| `docs/feature planning/*.md` | — | PLANNING | Future planning artifacts — not user docs, leave as-is |
| `docs/deployment/*.md` | Developers | UNVERIFIED | May still be accurate; not reviewed this round |
| `docs/canopy/*.md` | Developers | UNVERIFIED | Canopy export reference; not reviewed this round |
| `docs/iiiif apis/*.md` | Developers | EXTERNAL | IIIF spec copies — read-only references, no drift risk |
| `STATE.md` | Developers | CURRENT | Migration log, accurate |

---

## Gaps (no user-facing doc exists)

| Feature | Gap | Priority |
|---------|-----|----------|
| 7 views (Archive/Viewer/Boards/Metadata/Search/Map/Timeline) | No user walkthrough | High |
| Keyboard shortcuts | Not documented anywhere user-facing | High |
| Import media (folder + external IIIF) | Not documented | High |
| Export formats (IIIF bundle, static site, OCFL, BagIt) | Not documented | Medium |
| Undo/redo | Not documented | Low |
| Local-first / data privacy | Mentioned in README, not explained | Low |

_All gaps are TODO(loop) for next round when user-guide content is prioritized._

---

## What Changed This Round (2026-02-24)

### README.md
- Removed 300-line React architecture ASCII diagram
- Fixed port: 3000 → 5173 (Vite default, no port in vite.config.ts)
- Removed commands that don't exist in package.json: `test:ui`, `test:coverage`, `test:debug`
- Replaced architecture section with accurate FSD overview
- Replaced React references with Svelte 5

### docs/AGENTS.md
- Full rewrite: React 19 → Svelte 5
- Correct FSD paths throughout
- Updated test section: "no automated tests" → 4756 passing
- Correct ESLint rules (18 custom rules, Svelte-specific)
- Added Svelte 5 critical patterns (snippet shadow, effect depth)
- Correct path alias: `@` → project root (not `src/`)

### docs/CLAUDE.md
- Full rewrite: React → Svelte 5
- Correct import paths for all key modules
- Added Svelte 5 patterns and pitfalls
- Removed React hook patterns
- Correct vault usage (vault.dispatch not actions singleton)

### lint.md
- NOT deleted this round (destructive) but flagged here
- Recommendation: add `lint.md` to `.gitignore`

---

## Drift Prevention

**Rule added this round:** Any PR that changes `vite.config.ts` server port, adds/removes package.json scripts, or renames key src/ paths must update README.md and AGENTS.md in the same commit.

**Next round checklist:**
- [ ] Write user guide: "Using Field Studio" (7 views, import, export, keyboard shortcuts)
- [ ] Delete or gitignore `lint.md`
- [ ] Review/archive `docs/Architecture/*.md` (4 pre-migration files, ~2000 lines)
- [ ] Verify `docs/deployment/README.md` accuracy
