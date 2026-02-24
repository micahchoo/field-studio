# CLAUDE.md — Field Studio

Field Studio is a **local-first, browser-based IIIF archive workbench**. All data lives in the browser's IndexedDB — no server, no uploads.

**Framework:** Svelte 5 + TypeScript + Vite + Tailwind CSS
**Architecture:** Feature Slice Design (FSD)
**Tests:** Vitest + happy-dom (117 files, 4756 passing)

---

## Commands

```bash
npm run dev           # http://localhost:5173
npm run build
npm run preview
npm test              # run all tests once
npm run test:watch    # watch mode
npm run typecheck     # svelte-check (Svelte type errors)
npm run typecheck:ts  # tsc --noEmit
npm run lint          # ESLint (0 errors target)
npm run lint:fix      # auto-fix
```

Run one test file: `npm test vault.test.ts`

---

## Project Structure

```
src/
├── shared/
│   ├── types/index.ts              ← all IIIF types (IIIFItem, IIIFManifest, etc.)
│   ├── stores/vault.svelte.ts      ← reactive vault store (use this for dispatch)
│   ├── stores/appMode.svelte.ts    ← current view (archive | viewer | boards | ...)
│   ├── stores/dialogs.svelte.ts    ← dialog open/close state
│   ├── services/storage.ts         ← IndexedDB (saveProject/loadProject/saveAsset)
│   ├── services/contentState.ts    ← IIIF Content State (URL sharing)
│   └── ui/
│       ├── atoms/                  ← Button, Icon, Input, Select, TextArea, Slider
│       ├── molecules/              ← composite UI (ViewHeader, Toast, etc.)
│       └── layout/                 ← PaneLayout, ScreenLayout, Stack, Row, Split
│
├── entities/
│   └── manifest/model/
│       ├── vault/                  ← normalize, denormalize, queries, updates
│       ├── actions/                ← 26 action creators (addCanvas, updateLabel, etc.)
│       └── builders/iiifBuilder.ts ← ingestTree, buildTree
│
├── features/
│   ├── archive/                    ← grid/list browser
│   ├── viewer/                     ← OpenSeadragon + audio/video + annotations
│   ├── board-design/               ← infinite canvas
│   ├── metadata-edit/              ← spreadsheet editor + BatchEditor
│   ├── search/                     ← FlexSearch
│   ├── map/                        ← Leaflet geographic view
│   ├── timeline/                   ← chronological view
│   ├── ingest/                     ← folder import + external IIIF import
│   └── export/                     ← IIIF bundle, static site, OCFL, BagIt
│
├── widgets/
│   ├── NavigationSidebar/          ← left nav + tree
│   ├── Inspector/                  ← right metadata panel
│   ├── CommandPalette/             ← Cmd+K
│   ├── StatusBar/                  ← bottom bar
│   ├── QCDashboard/               ← validation overview
│   └── ...                        ← 15 widgets total
│
└── app/
    ├── ui/App.svelte               ← root: global keyboard, dialogs, auto-save
    ├── ui/ViewRouter.svelte        ← renders active view
    └── stores/                     ← autoSave, validation
```

**Path alias:** `@` → project root (`.`)
Example: `import { storage } from '@/src/shared/services/storage'`

---

## State Management

### Vault — the only state that matters

The vault holds all IIIF entities (Collections, Manifests, Canvases, Ranges, Annotations) in a normalized flat store.

**Always dispatch actions — never mutate directly.**

```typescript
import { vault } from '@/src/shared/stores/vault.svelte';
import { actions } from '@/src/entities/manifest/model/actions';

// Read
const root = vault.state.root;
const canvas = vault.getEntity(canvasId);

// Write — dispatch an action
vault.dispatch(actions.updateLabel(entityId, { en: ['New title'] }));
vault.dispatch(actions.addCanvas(manifestId, canvasData));

// Undo/redo — wired in App.svelte (Cmd+Z / Cmd+Shift+Z)
```

### Svelte stores

All app-level state lives in `src/shared/stores/*.svelte.ts` as class-based reactive stores:

```typescript
import { appMode } from '@/src/shared/stores/appMode.svelte';
appMode.setMode('archive');  // navigate to Archive view

import { dialogs } from '@/src/shared/stores/dialogs.svelte';
dialogs.exportDialog.open();
```

---

## Svelte 5 Patterns

This project uses Svelte 5 runes exclusively. No Svelte 4 patterns.

```svelte
<script lang="ts">
  // Props
  let { label, onClose }: { label: string; onClose: () => void } = $props();

  // State
  let count = $state(0);

  // Derived
  let doubled = $derived(count * 2);
  let heavy = $derived.by(() => expensiveCalc(count));

  // Effects
  $effect(() => {
    document.title = label;
    return () => { /* cleanup */ };
  });
</script>
```

**Snippet slots** replace React children:
```svelte
<!-- Parent passes snippet -->
<Card>{#snippet header()}Title{/snippet}</Card>

<!-- Child renders it -->
{@render header?.()}
```

**Callback props** replace createEventDispatcher:
```svelte
<!-- Instead of dispatch('close') -->
onClose?.();
```

---

## Critical Gotchas

### Snippet/prop shadow
`{#snippet name()}` in a template shadows any `name` variable from `<script>`, including props.

```svelte
<!-- BROKEN: title inside snippet refers to the snippet function itself -->
<script>
  let { title } = $props();
</script>
{#snippet title()}{title}{/snippet}  <!-- ⚠️ infinite recursion -->

<!-- FIX: alias before template -->
<script>
  let { title } = $props();
  const titleText = $derived(title);  // capture before shadow
</script>
{#snippet title()}{titleText}{/snippet}  <!-- ✅ -->
```

### Effect depth exceeded
A `$effect` that reads and writes the same reactive state loops infinitely.

```typescript
// BROKEN
$effect(() => {
  expandedIds = new Set(expandedIds);  // new Set = new reference = re-trigger
});

// FIX: read with untrack, guard the write
import { untrack } from 'svelte';
$effect(() => {
  const current = untrack(() => expandedIds);
  const next = computeNext(current);
  if (setsEqual(current, next)) return;  // guard
  expandedIds = next;
});
```

### IDB mock in tests
`vi.mock()` is hoisted before variable declarations. Use `vi.hoisted()`:

```typescript
const mockDb = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb', () => ({
  openDB: vi.fn(() => ({ get: (k) => mockDb.get(k), put: (k,v) => mockDb.set(k,v) }))
}));
```

### TYPE_DEBT comments
`// TYPE_DEBT:` marks intentional `any` usages where the fix requires structural changes.
Do not remove them without fixing all callers. Key ones:
- `IIIFItem.service?: any[]` — needs `ServiceDescriptor` union; imageSourceResolver accesses `.type`/`.id`
- `IIIFItem.items?: any[]` — 15+ call sites iterate without narrowing
- `IIIFItem.navPlace?: any` — needs GeoJSON type

---

## ESLint Custom Rules

18 custom rules in `eslint-rules/`. Key ones:

| Rule | What it prevents |
|------|-----------------|
| `max-lines-feature` | molecules > 300 lines, organisms > 500 lines |
| `no-native-html-in-molecules` | `<select>`, `<textarea>`, `<input type="range">` — use atoms instead |
| `no-svelte4-patterns` | legacy Svelte 4 syntax |
| `lifecycle-restrictions` | DOM-init libs must use `$effect` (Annotorious, WaveSurfer) |
| `require-aria-for-icon-buttons` | icon-only buttons need `aria-label` |
| `typed-context-keys` | context keys must be typed symbols |

---

## Adding a Feature

1. Create `src/features/<name>/` with `ui/`, `model/`, `__tests__/`
2. UI components: atoms in `ui/atoms/`, molecules in `ui/molecules/`, organisms in `ui/organisms/`
3. State: add to vault actions if it's IIIF data; use a local `$state()` if it's UI-only
4. Wire into `ViewRouter.svelte` if it's a new view; add to `NAV_ITEMS` in `Sidebar.svelte`
5. Write tests in `__tests__/*.test.ts` — no `.tsx`, no `.test.svelte`

## Adding a Widget

1. Create `src/widgets/<Name>/ui/<Name>.svelte`
2. Import and wire in `App.svelte` (for dialogs) or `ViewRouter.svelte` (for panels)
3. Respect molecule/organism line limits

---

## Storage & Service Worker

**Storage (IndexedDB):**
```typescript
import { storage } from '@/src/shared/services/storage';
await storage.saveProject(iiifTree);
const tree = await storage.loadProject();
const hash = await storage.saveAsset(blob);
const blob = await storage.getAsset(hash);
```

**Service Worker** (`public/sw.js`): IIIF Image API 3.0 Level 2. Serves `/tiles/{assetId}/...`.
Only works in secure context (localhost or HTTPS). Must be registered (done in `main.ts`).

---

## Validation

```typescript
import { validator } from '@/src/entities/manifest/model/validation/validator';
import { validationHealer } from '@/src/entities/manifest/model/validation/validationHealer';

const issues = validator.validateTree(root);
const fixed = validationHealer.healAllIssues(item);
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Images not loading | Check SW registered: DevTools → Application → Service Workers |
| `effect_update_depth_exceeded` | `$effect` reads+writes same state — use `untrack()` |
| `invalid_snippet_arguments` | Snippet name shadows prop — use alias pattern above |
| tsc errors in `.svelte` module exports | Extract to sibling `.ts` file |
| Tests fail with IDB errors | Use `vi.hoisted()` mock pattern |
| `JSON.parse` error on startup | `storage.loadProject()` returned `"undefined"` string — guard before parse |
