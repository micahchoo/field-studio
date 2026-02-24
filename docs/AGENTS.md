# Field Studio — Agent Guide

> For AI coding agents working on this codebase. Covers navigation, patterns, and pitfalls.
> React source is archived. Root `src/` is Svelte 5.

---

## Overview

Field Studio is a local-first, browser-based workbench for organizing, annotating, and connecting field research media using IIIF standards. All data lives in browser IndexedDB. No server.

**Current state (as of Feb 24, 2026):**
- Svelte 5 + TypeScript — React migration complete, React source archived
- `tsc --noEmit`: 0 errors
- `svelte-check`: 0 errors, 29 warnings
- ESLint: 0 errors, 344 warnings
- Tests: 117 files, 4756 passing

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | Svelte 5 + TypeScript 5.8 |
| Build | Vite (dev default: localhost:5173) |
| Styling | Tailwind CSS |
| State | Custom normalized Vault + Svelte 5 reactive stores |
| Storage | IndexedDB via `idb` v8 |
| Tests | Vitest + happy-dom 20.7 |
| Search | FlexSearch |
| Maps | Leaflet |
| IIIF Viewer | OpenSeadragon |

---

## Project Structure (FSD)

```
src/
├── shared/
│   ├── types/index.ts          — all IIIF + app types
│   ├── stores/                 — reactive stores (*.svelte.ts)
│   │   └── vault.svelte.ts     — main entity store
│   ├── services/
│   │   └── storage.ts          — IndexedDB (saveProject/loadProject/saveAsset/getAsset)
│   ├── ui/
│   │   ├── atoms/              — primitive components
│   │   ├── molecules/          — composed UI, max 300 lines
│   │   ├── organisms/          — complex UI, max 500 lines
│   │   ├── layout/             — Stack, Row, Scroll, Fill, PaneLayout, etc.
│   │   └── providers/          — ThemeRoot, etc.
│   ├── config/
│   │   └── themes/             — token types + built-in themes
│   └── lib/
│       ├── hooks/              — useTheme, useResizablePanel, etc.
│       └── theme-bus.ts
│
├── entities/
│   ├── manifest/model/
│   │   ├── vault/              — pure vault operations (types, queries, updates, trash, movement)
│   │   ├── actions/            — 26 action types
│   │   └── validation/
│   │       └── validator.ts
│   ├── canvas/
│   ├── collection/
│   └── annotation/
│
├── features/
│   ├── archive/
│   ├── board-design/
│   ├── export/
│   ├── ingest/
│   ├── map/
│   ├── metadata-edit/
│   ├── search/
│   ├── staging/
│   ├── timeline/
│   └── viewer/
│
├── widgets/                    — 15 cross-feature components
│   ├── NavigationSidebar/
│   ├── Inspector/
│   ├── CommandPalette/
│   ├── StatusBar/
│   ├── QCDashboard/
│   └── ...
│
└── app/
    ├── ui/
    │   ├── App.svelte           — shell, HistoryStore, undo/redo, auto-save
    │   ├── ViewRouter.svelte    — routes views 1-7
    │   └── BaseTemplate.svelte
    └── stores/
```

**Path alias:** `@` maps to the project root (`.`). Use `@/src/...` for all imports.

---

## The 7 Views

| # | View | Key shortcut |
|---|---|---|
| 1 | Archive | `1` |
| 2 | Viewer | `2` |
| 3 | Boards | `3` |
| 4 | Metadata | `4` |
| 5 | Search | `5` |
| 6 | Map | `6` |
| 7 | Timeline | `7` |

Command palette: `Cmd+K`. Views are routed in `src/app/ui/ViewRouter.svelte`.

---

## State Management

### Vault (entity store)

The vault is a normalized flat store. Entities are keyed by ID for O(1) lookups. Parent-child relationships are tracked as reference lists, not nested objects.

**Reactive store:** `src/shared/stores/vault.svelte.ts`
**Pure operations:** `src/entities/manifest/model/vault/`
**Actions:** `src/entities/manifest/model/actions/` (26 action types)

**Always dispatch actions. Never mutate vault state directly.**

```typescript
import { vault } from '@/src/shared/stores/vault.svelte';
import { actions } from '@/src/entities/manifest/model/actions';

// Correct
vault.dispatch(actions.updateLabel({ id, label }));

// Wrong — will not trigger reactivity and breaks undo history
vault.state.entities.Manifest[id].label = newLabel;
```

### Undo / Redo

`HistoryStore` lives in `App.svelte`. Users trigger it with `Cmd+Z` / `Cmd+Shift+Z`. Do not build your own undo stack.

### Other stores

Svelte 5 class-based reactive stores in `src/shared/stores/*.svelte.ts`. Use `()` and `` inside them.

---

## Svelte 5 Patterns

### Core reactivity

```svelte
<script lang=ts>
  // State
  let count = (0);

  // Derived (simple expression)
  const doubled = (count * 2);

  // Derived (complex / needs block)
  const filtered = .by(() => items.filter(x => x.active));

  // Props
  const { label, onClose }: { label: string; onClose: () => void } = ();

  // Bindable prop
  let { value = () }: { value: string } = ();

  // Side effects
  (() => {
    externalLib.init(container);
    return () => externalLib.destroy();
  });
</script>
```

### Callback props, not event dispatcher

```svelte
<!-- Correct -->
<script lang=ts>
  const { onSelect }: { onSelect: (id: string) => void } = ();
</script>
<button onclick={() => onSelect(item.id)}>Select</button>

<!-- Wrong — createEventDispatcher is Svelte 4 -->
```

### Snippet slots instead of React children

```svelte
<!-- Parent defines content with snippets -->
<MyComponent>
  {#snippet header()}
    <h2>Title</h2>
  {/snippet}
</MyComponent>

<!-- Component receives it -->
<script lang=ts>
  import type { Snippet } from 'svelte';
  const { header, children }: { header?: Snippet; children?: Snippet } = ();
</script>
{@render header?.()}
{@render children?.()}
```

### Effect depth bug (reads + writes same state)

An `` that reads and writes the same reactive variable will loop. Fix with `untrack()`:

```typescript
// Wrong — infinite loop
(() => {
  if (someCondition) expandedIds.add(id); // reads and writes expandedIds
});

// Correct
import { untrack } from 'svelte';
(() => {
  const current = untrack(() => expandedIds);
  if (someCondition && !current.has(id)) expandedIds.add(id);
});
```

### Snippet / prop shadow bug

`{#snippet name()}` in the template shadows any same-named variable from `<script>`, including props.

```svelte
<!-- Wrong — {title} inside the snippet refers to the snippet itself, not the prop -->
<script lang=ts>
  const { title }: { title: string } = ();
</script>
{#snippet title()}<span>{title}</span>{/snippet}

<!-- Correct — alias the prop before the template -->
<script lang=ts>
  const { title }: { title: string } = ();
  const titleText = (title);
</script>
{#snippet title()}<span>{titleText}</span>{/snippet}
```

---

## Layout System

Use layout primitives from `src/shared/ui/layout/`, not raw `div` nesting.

```svelte
import { PaneLayout, Stack, Row, Scroll } from '@/src/shared/ui/layout';

<!-- PaneLayout is the most common view shell -->
<PaneLayout variant=default>
  <PaneLayout.Header>...</PaneLayout.Header>
  <PaneLayout.SubBar>...</PaneLayout.SubBar>
  <PaneLayout.Body>...</PaneLayout.Body>
  <PaneLayout.Footer>...</PaneLayout.Footer>
</PaneLayout>
```

`variant=canvas` makes the body `overflow-hidden` (for Map, Board, Viewer).
`variant=default` makes the body `overflow-y-auto` (for Archive, Search, etc.).

---

## ESLint Custom Rules

18 custom rules live in `eslint-rules/`. Breaking them shows as lint errors.

| Rule | What it enforces |
|---|---|
| `max-lines-feature` | molecules <= 300 lines, organisms <= 500 lines |
| `no-native-html-in-molecules` | use atoms: `Select`, `TextArea`, `Slider` — not `<select>`, `<textarea>`, `<input type=range>` |
| `no-svelte4-patterns` | no legacy Svelte 4 syntax |
| `lifecycle-restrictions` | DOM-init libs (Annotorious, WaveSurfer) must use `` + eslint-disable comment |
| `require-aria-for-icon-buttons` | icon-only buttons need `aria-label` |
| `typed-context-keys` | Svelte context keys must be typed symbols |
| `component-props-validation` | all molecules require optional `cx?` + `fieldMode?` |
| `no-reactive-destructuring` | don't destructure reactive state |
| `no-effect-for-derived` | use `` not `` for computed values |
| `exhaustive-switch` | switch on discriminated unions must be exhaustive |

---

## TypeScript Notes

### TYPE_DEBT comments

Some `any` usages are intentional and annotated with `// TYPE_DEBT:`. Do not remove them without fixing all callers.

| Location | Why it stays `any` |
|---|---|
| `IIIFItem.service?: any[]` | `imageSourceResolver` accesses `.type`/`.id` directly; needs `ServiceDescriptor` union first |
| `IIIFItem.items?: any[]` | 15+ call sites iterate base `IIIFItem.items` without subtype cast |

### `<script module>` exports are invisible to tsc

Named exports from `<script module>` in `.svelte` files are not seen by `tsc --noEmit`. If you need constants or types exported from a Svelte file to be type-checked, extract them to a sibling `.ts` file.

---

## Storage

**DB name:** `biiif-archive-db`

| Store | Contents |
|---|---|
| `files` | Original uploads, SHA-256 keyed |
| `derivatives` | Thumbnails, tile pyramids |
| `project` | IIIF tree JSON |
| `tiles` | Image tile blobs |
| `checkpoints` | Named save states |

Service: `src/shared/services/storage.ts`

---

## Service Worker

`public/sw.js` implements IIIF Image API 3.0 Level 2.

- Tile URL pattern: `/tiles/{assetId}/{level}/{x}_{y}.jpg`
- Only works in secure context (localhost or HTTPS)
- Caching: Cache API -> IndexedDB -> generate on demand

---

## Commands

```bash
# Development
npm run dev              # Vite dev server (localhost:5173)
npm run build            # Production build -> dist/
npm run preview          # Preview production build

# Type checking
npm run typecheck        # svelte-check (Svelte + TS)
npm run typecheck:ts     # tsc --noEmit (TS only)

# Linting
npm run lint             # ESLint — check only
npm run lint:fix         # ESLint — auto-fix

# Tests
npm test                 # Run all tests once
npm run test:watch       # Watch mode
```

Run `typecheck`, `typecheck:ts`, `lint`, and `npm test` before considering any change complete.

---

## Common Tasks

### Add a new view

1. Create `src/features/<name>/ui/<Name>View.svelte`
2. Use `PaneLayout` as the shell
3. Add a route case to `src/app/ui/ViewRouter.svelte`
4. Add a nav item to `src/widgets/NavigationSidebar/`

### Add a new entity action

1. Add action type + creator to `src/entities/manifest/model/actions/`
2. Add reducer case in `src/entities/manifest/model/vault/updates.ts`
3. Call via `vault.dispatch(actions.yourAction(...))`
4. Write a test in the nearest `*.test.ts` file

### Add a new widget

1. Create `src/widgets/<Name>/`
2. Entry point: `src/widgets/<Name>/index.ts`
3. UI in `src/widgets/<Name>/ui/`
4. Max organism size: 500 lines — split into sub-components if larger
5. Expose callback props, not events

### Add a test

Test files: `src/**/*.test.ts` (no `.tsx`, no `.test.svelte`)

```typescript
// src/features/export/model/myService.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('myService', () => {
  it('does the thing', () => {
    expect(myFn(input)).toEqual(expected);
  });
});
```

For IndexedDB: mock with `vi.hoisted()` + an in-memory `Map`. See `src/shared/services/storage.test.ts` for the pattern. Do not use `fake-indexeddb`.

Test setup file: `src/test-setup.ts`

---

## Pitfalls

| Pitfall | What to do instead |
|---|---|
| Mutating vault state directly | Always `vault.dispatch(action)` |
| Using React hooks (`useState`, `useEffect`, etc.) | Use Svelte 5 equivalents (`$state`, `$effect`) |
| Using `createEventDispatcher` | Use callback props (`onClose`, `onSelect`) |
| Writing `$effect` that reads + writes same state | Wrap the read with `untrack()` |
| Naming a snippet the same as a prop | Alias the prop: `const nameText = $derived(name)` |
| Removing a `TYPE_DEBT` `any` without fixing callers | Read the comment; fix callers first or leave it |
| Exporting constants from `<script module>` and expecting tsc to see them | Extract to a sibling `.ts` file |
| Using `<select>`, `<textarea>`, `<input type=range>` in molecules | Use `Select`, `TextArea`, `Slider` atoms |
| Adding a long file to molecules/organisms without splitting | Molecules <= 300 lines, organisms <= 500 lines |
| Building own undo stack | Use the `HistoryStore` in `App.svelte` |

---

## External Standards

- [IIIF Presentation API 3.0](https://iiif.io/api/presentation/3.0/)
- [IIIF Image API 3.0](https://iiif.io/api/image/3.0/)
- [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/)
