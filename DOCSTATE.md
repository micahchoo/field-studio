# DOCSTATE.md — Documentation State Tracker

_Updated: 2026-02-24. Single source of truth for doc health._

---

## Status Summary

| Doc | Audience | Status |
|-----|----------|--------|
| `README.md` | Developers | CURRENT |
| `docs/AGENTS.md` | AI coding agents | CURRENT |
| `docs/CLAUDE.md` | Claude Code | CURRENT |
| `docs/Architecture.md` | Developers | CURRENT — canonical architecture doc |
| `docs/ROADMAP.md` | Developers | CURRENT — phases D through 5 |
| `docs/GUIDE.md` | Users | CURRENT — 7 views, import, export, shortcuts, annotations |
| `docs/ESLINT_ENHANCEMENTS.md` | Developers | CURRENT — 18 custom rules documented |
| `STATE.md` | Developers | CURRENT — trimmed to metrics + decisions |
| `docs/deployment/README.md` | Developers | PLANNING — consolidated single file |
| `docs/feature planning/uiux.md` | Developers | PLANNING — UI audit artifact (bannered) |
| `docs/feature planning/IIIF_VAULT_SCOPE.md` | Developers | REFERENCE — vault design decisions |
| `docs/feature planning/IMAGE_PIPELINE_SCOPE.md` | Developers | REFERENCE — image pipeline architecture |
| `docs/feature planning/P2P_SYNC_SCOPE.md` | Developers | REFERENCE — future sync layer design |
| `docs/feature planning/vocabulary.md` | Developers | REFERENCE — custom vocabulary feature spec |
| `docs/canopy/*.md` | Developers | EXTERNAL — Canopy export reference (read-only) |
| `docs/iiiif apis/*.md` | Developers | EXTERNAL — IIIF spec copies (read-only) |
| `docs/immich-api-docs/*.md` | Developers | EXTERNAL — Immich API reference (read-only) |

---

## Deleted This Round (doc cleanup, 2026-02-24)

### Stale / superseded (17 files removed total across rounds)

| File | Reason |
|------|--------|
| `docs/Architecture/{Utils,UX,Utility,Underneath}.md` | Superseded by `docs/Architecture.md` (prev round) |
| `docs/Atomic System *.md` (2 files) | Pre-migration React atomic design (prev round) |
| `docs/Testing Suite based on Atomic .md` | Pre-migration React testing (prev round) |
| `docs/atomic-design-feature-audit.md` | Pre-migration audit (prev round) |
| `docs/feature planning/CLOUD_GALLERY_INTEGRATION_SCOPE.md` | React refs, not on roadmap |
| `docs/feature planning/CLOUD_INTEGRATION_IMPLEMENTATION.md` | React refs, not on roadmap |
| `docs/feature planning/STATE_MANAGEMENT_SCOPE.md` | Superseded by vault.svelte.ts |
| `docs/feature planning/uiuxstatus.md` | Bare checklist, no context |
| `docs/feature planning/ADVANCED_STORAGE_STRATEGIES.md` | Generic research, covered by deployment docs |
| `docs/feature planning/STORAGE_LIMITS_SOLUTIONS.md` | Generic research, covered by deployment docs |
| `docs/feature planning/large-file-handling-research.md` | Generic research |
| `docs/feature planning/image-processing-large-files.md` | Overlaps with IMAGE_PIPELINE_SCOPE |
| `docs/deployment/DETAILED_IMPLEMENTATION_PLAN.md` | 66KB, fully redundant with other deployment docs |

### Consolidated

| Before | After |
|--------|-------|
| `docs/deployment/docker-vs-tauri-comparison.md` | Merged into `docs/deployment/README.md` |
| `docs/deployment/feature-parity-maintenance.md` | Merged into `docs/deployment/README.md` |
| `docs/deployment/storage-strategy-across-deployments.md` | Merged into `docs/deployment/README.md` |
| `STATE.md` (505 lines) | Trimmed to ~90 lines (metrics + decisions) |

---

## Drift Prevention

**Rule:** `docs/Architecture.md` is the canonical architecture doc. When a ROADMAP phase is completed, update both `docs/ROADMAP.md` tracking table and `STATE.md` phase metrics in the same commit.

**Rule:** Any PR that changes `vite.config.ts` server port, adds/removes package.json scripts, or renames key src/ paths must update README.md and AGENTS.md in the same commit.

---

## Remaining docs inventory

```
docs/
├── AGENTS.md                          ← AI agent context
├── Architecture.md                    ← Canonical architecture
├── CLAUDE.md                          ← Claude Code context
├── ESLINT_ENHANCEMENTS.md             ← 18 custom rules
├── GUIDE.md                           ← User-facing guide
├── ROADMAP.md                         ← Phases D-5
├── canopy/                            ← External: Canopy export reference (6 files)
├── deployment/
│   └── README.md                      ← Consolidated deployment planning
├── feature planning/
│   ├── uiux.md                        ← UI surface audit
│   ├── IIIF_VAULT_SCOPE.md            ← Vault design reference
│   ├── IMAGE_PIPELINE_SCOPE.md        ← Image pipeline reference
│   ├── P2P_SYNC_SCOPE.md             ← Sync layer reference
│   └── vocabulary.md                  ← Custom vocabulary spec
├── iiiif apis/                        ← External: IIIF specs (7 files)
└── immich-api-docs/                   ← External: Immich API (2 files)
```

**Zero stale docs without banners. All remaining docs are current, planning, or external reference.**
