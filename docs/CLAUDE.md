# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Field Studio is a **local-first, browser-based IIIF (International Image Interoperability Framework) archive workbench** for organizing, annotating, and connecting field research media. All data is stored in the browser's IndexedDB with no server uploads.

**Important:** This is a vibe-coded experimental POC with non-standard architecture patterns.

## Common Commands

### Development
```bash
npm run dev              # Start dev server on http://localhost:3000
npm run build            # Production build
npm run preview          # Preview production build
```

### Testing
```bash
npm test                 # Run all tests once
npm run test:watch       # Watch mode (best for development)
npm run test:ui          # Interactive UI for tests
npm run test:coverage    # Generate coverage report
npm run test:debug       # Debug tests with inspector
```

Run a specific test file:
```bash
npm test vault.test.ts
```

### Linting
```bash
npm run lint             # Check for linting errors
npm run lint:fix         # Auto-fix linting errors
```

## Architecture Overview

### Core State Management: Vault Pattern

The app uses a **normalized state management pattern** (inspired by Digirati Manifest Editor) called the "Vault":

- **Location:** `services/vault.ts` (1,309 lines)
- **Pattern:** Flat entity storage with relationship indexes (not nested trees)
- **Entities:** Collections, Manifests, Canvases, Ranges, AnnotationPages, Annotations
- **Key Operations:**
  - `normalize(tree)` - Convert IIIF tree to flat entities
  - `denormalize(state)` - Reconstruct tree for export
  - `updateEntity(id, updates)` - O(1) immutable updates via Immer
  - `getEntity(id)` - O(1) lookup via typeIndex

**Critical:** Never manually manipulate vault state. Always use the action system.

### Action System

- **Location:** `services/actions.ts` (783 lines)
- **Pattern:** Dispatcher validates → executes → updates vault → notifies subscribers
- **17 Action Types:** UPDATE_LABEL, ADD_CANVAS, REORDER_CANVASES, BATCH_UPDATE, etc.
- **History:** 100-entry undo/redo stack with automatic pruning

**Usage:**
```typescript
import { actions } from './services/actions';

// Update an entity
actions.updateLabel(entityId, { en: ['New Label'] });

// Batch update multiple entities
actions.batchUpdate([
  { type: 'UPDATE_LABEL', id: 'entity1', label: {...} },
  { type: 'ADD_CANVAS', manifestId: 'manifest1', canvas: {...} }
]);

// Undo/redo
actions.undo();
actions.redo();
```

### Storage Layer (IndexedDB)

**Database:** `biiif-archive-db`

**Stores:**
- `files` - Original uploads (SHA-256 content-addressed, auto-deduplication)
- `derivatives` - Tile pyramids (v2, v3, static variants)
- `project` - IIIF tree as JSON (key: 'current')
- `checkpoints` - Named save states for rollback
- `tiles` - Image tile blobs (500MB LRU cache)
- `tileManifests` - Tile pyramid metadata

**Key Features:**
- SHA-256 deduplication (identical files stored once)
- Quota monitoring (90% warning, 95% critical)
- Checkpoint rollback system
- Background cleanup of orphaned tiles

### Service Worker (IIIF Image API)

- **Location:** `public/sw.js` (701 lines)
- **Implementation:** IIIF Image API 3.0 Level 2 server
- **Capabilities:**
  - Tile serving: `/tiles/{assetId}/{level}/{x}_{y}.jpg`
  - Info.json generation: `/tiles/{assetId}/info.json`
  - Dynamic image processing via OffscreenCanvas
  - Region extraction, size transformation, rotation support

**Caching Strategy:**
1. Check Cache API first
2. Fall back to IndexedDB
3. Generate from source if needed
4. Populate cache (500MB LRU eviction)

**Important:** Service workers only work in secure contexts (localhost or HTTPS).

### Component Architecture

**68 Components** organized by feature:
- **Views:** Archive, Structure, Catalog, Boards, Viewer
- **Staging:** Two-pane source/archive workbench with drag-drop
- **Shared:** Sidebar, Inspector, CommandPalette (Cmd+K), Toast, Modal

**27 Custom Hooks** for state/UI:
- State: `useIIIFEntity`, `useVaultState`, `useHistory`
- UI: `useDialogState`, `useResponsivePanel`, `useFocusTrap`
- IIIF: `useIIIFTraversal`, `useBreadcrumb`
- Performance: `useVirtualization`, `useDebouncedCallback`

### Key Services (42 total)

**IIIF Core:**
- `iiifBuilder.ts` - Manifest/Collection/Annotation construction
- `iiifParser.ts` - v2/v3 parsing and spec bridging
- `validator.ts` - Tree-aware validation with fix suggestions
- `validationHealer.ts` - Auto-fix common issues

**Image Processing:**
- `imagePipeline/` - Canvas pipeline, tile calculator
- `imageSourceResolver.ts` - URL fallback, service info resolution
- `tileWorker.ts` - Web Worker for tile pyramid generation

**Search:**
- `searchService.ts` - FlexSearch with Web Worker
- `contentSearchService.ts` - OCR/text annotation indexing

**Export:**
- `exportService.ts` - IIIF Bundle, static site generation
- `archivalPackageService.ts` - OCFL, BagIt exports
- `staticSiteExporter.ts` - WAX/Canopy generation

**Metadata:**
- `metadataHarvester.ts` - EXIF/GPS extraction
- `metadataTemplate.ts` - CSV templates, smart detection

**Structure:**
- `autoStructure.ts` - Pattern matching, auto-grouping
- `stagingService.ts` - Layout organization
- `virtualManifestFactory.ts` - Raw file → Manifest conversion

**Auth/Sync:**
- `authService.ts` - IIIF Auth 2.0 with token flow
- `sync/crdtAdapter.ts` - Yjs CRDT bridge (experimental)

## Configuration Files

### Vite (`vite.config.ts`)
- Base path: `/field-studio/` (for GitHub Pages)
- Dev server: `http://localhost:3000` (host: 0.0.0.0)
- Path alias: `@` → project root
- Workers: ES format, separate chunks for caching

### Vitest (`vitest.config.ts`)
- Environment: happy-dom (lightweight DOM)
- Setup: `src/test/setup.ts`
- Path alias: `@` → `./src` (note: different from Vite!)
- Coverage: v8 provider with text/html/lcov reports

### TypeScript (`tsconfig.json`)
- Target: ESNext
- Module: ESNext
- JSX: react-jsx
- No path aliases defined (uses Vite's resolver)

### ESLint (`eslint.config.js`)
**Custom Rules:**
- Prop naming convention: `onChange`, `onAction`, `onUpdate`, `onExecute`
- Restricted syntax: Event handlers must follow naming standards
- TypeScript: warn on `any`, unused vars, non-null assertions
- React: enforce hooks rules, exhaustive-deps warnings

## Development Patterns

### Testing Patterns

**Test Structure:**
```typescript
import { describe, it, expect } from 'vitest';

describe('ComponentName', () => {
  it('should do specific thing', () => {
    // Arrange
    const input = setupInput();

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

**Component Testing:**
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should handle user interaction', async () => {
  const user = userEvent.setup();
  render(<Component />);

  await user.click(screen.getByRole('button'));

  expect(screen.getByText(/success/i)).toBeInTheDocument();
});
```

**Mocking IndexedDB:**
```typescript
// Tests use fake-indexeddb for storage operations
import 'fake-indexeddb/auto';
```

**Test Files:** Located in `src/test/__tests__/`
- 15 test files covering ~3,800 lines
- See `src/test/README.md` for detailed patterns

### Feature Flags (`constants.ts`)

```typescript
export const FEATURE_FLAGS = {
  USE_IMMER_CLONING: true,          // Use Immer for vault cloning (faster)
  USE_WORKER_SEARCH: true,          // Web Worker for search (non-blocking)
  ENABLE_EXPERIMENTAL_SYNC: false,  // Yjs collaborative editing
  ENABLE_CANOPY_EXPORT: false,      // Static site generation
};
```

### Abstraction Levels (Progressive Disclosure)

The UI supports 3 complexity levels:
- **Simple:** Basic labels, minimal technical IDs, essential actions
- **Standard:** Full labels, some technical info, common workflows
- **Advanced:** Raw IIIF JSON, all actions, technical details

Controlled via `useAbstractionLevel()` hook and `AbstractionLevelToggle` component.

### Event Handler Naming

**Enforced by ESLint:**
- Use `onChange` for state changes
- Use `onAction` for user actions (clicks, submits)
- Use `onUpdate` for entity updates
- Use `onExecute` for command execution
- Standard DOM handlers: `onClick`, `onSubmit`, `onKeyDown`, etc.

## Critical Patterns

### Vault Updates (DO)
```typescript
// ✅ CORRECT: Use action system
import { actions } from './services/actions';
actions.updateLabel(id, { en: ['New Label'] });
```

### Vault Updates (DON'T)
```typescript
// ❌ WRONG: Direct state mutation
state.manifests.set(id, { ...manifest, label: newLabel });
```

### Storage Access
```typescript
// Always use storage service
import { storage } from './services/storage';

// Save project state
await storage.saveProject(iiifTree);

// Load project state
const tree = await storage.loadProject();

// File operations (content-addressed)
const hash = await storage.saveFile(blob);
const blob = await storage.getFile(hash);
```

### IIIF Construction
```typescript
import { buildTree, ingestTree } from './services/iiifBuilder';

// Build from file tree
const { root, report } = await buildTree(fileTree, options);

// Ingest into vault
await ingestTree(root);
```

### Validation
```typescript
import { validator } from './services/validator';

// Validate entire tree
const issues = validator.validateTree(root);

// Auto-heal common issues
import { validationHealer } from './services/validationHealer';
const fixed = validationHealer.healTree(root);
```

## Web Workers

**Workers:** `workers/ingest.worker.ts`, `workers/validation.worker.ts`, `workers/searchIndexer.ts`

**Build Config:** Workers bundled as separate ES modules with hash-based naming for caching.

**Usage Pattern:**
```typescript
const worker = new Worker(new URL('./workers/example.worker.ts', import.meta.url), {
  type: 'module'
});

worker.postMessage({ type: 'START', payload: data });
worker.onmessage = (e) => {
  if (e.data.type === 'COMPLETE') {
    console.log('Result:', e.data.result);
  }
};
```

## Deployment

**Target:** GitHub Pages (static hosting)

**Build Output:**
- Base path: `/field-studio/`
- Service worker registered at root
- IIIF manifests served from `/tiles/` route

**Important:** Service workers require HTTPS in production (localhost works for dev).

## Troubleshooting

### Service Worker Not Loading
1. Check browser DevTools → Application → Service Workers
2. Ensure running on localhost or HTTPS
3. Clear cache and hard reload
4. Re-register service worker

### IndexedDB Quota Exceeded
- Check `storage.estimateQuota()` for usage
- Cleanup orphaned tiles with `storage.cleanupOrphanedTiles()`
- Delete old checkpoints with `storage.deleteCheckpoint(name)`

### Vault State Corruption
- Load last checkpoint: `storage.loadCheckpoint(name)`
- Export current state: `exportRoot()`
- Validate tree: `validator.validateTree(root)`

### Test Path Resolution Issues
- Vitest uses `@` → `./src`
- Vite uses `@` → `.` (project root)
- Use relative paths in tests when importing from project root

### Worker Build Failures
- Ensure workers use `import.meta.url` for dynamic imports
- Check `vite.config.ts` worker rollup config
- Workers must be ES modules (`type: 'module'`)

## Additional Documentation

- **Testing Guide:** `src/test/README.md`
- **Architecture Details:** See ASCII diagram in `README.md` (lines 56-295)
- **IIIF Specs:**
  - Presentation API 3.0: https://iiif.io/api/presentation/3.0/
  - Image API 3.0: https://iiif.io/api/image/3.0/
  - Web Annotation: https://www.w3.org/TR/annotation-model/
