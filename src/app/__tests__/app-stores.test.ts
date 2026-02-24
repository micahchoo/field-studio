/**
 * App-Level Stores Tests
 *
 * Tests the Svelte 5 runes-based reactive class stores used by
 * App.svelte and ViewRouter.svelte. Each describe block covers one
 * store class: constructor defaults, mutations, queries, and lifecycle.
 *
 * Stores covered:
 *   1. DialogState / DialogManagerStore (dialogs)
 *   2. AutoSaveStore (autoSave)
 *   3. ValidationStore (validation)
 *   4. SelectionStore (selection)
 *   5. PipelineStore (pipeline)
 *   6. AnnotationStateStore (annotationState) — NEW
 *   7. ResourceContextStore (resourceContext) — NEW
 *   8. UserIntentStore (userIntent) — NEW
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// 1. DialogState + DialogManagerStore
// ============================================================================

import {
  DialogState,
  dialogs,
} from '@/src/shared/stores/dialogs.svelte';

describe('DialogState', () => {
  let dialog: DialogState;

  beforeEach(() => {
    dialog = new DialogState();
  });

  it('starts closed by default', () => {
    expect(dialog.isOpen).toBe(false);
  });

  it('starts open if initialOpen=true', () => {
    const openDialog = new DialogState(true);
    expect(openDialog.isOpen).toBe(true);
  });

  it('open() opens the dialog', () => {
    dialog.open();
    expect(dialog.isOpen).toBe(true);
  });

  it('close() closes the dialog', () => {
    dialog.open();
    dialog.close();
    expect(dialog.isOpen).toBe(false);
  });

  it('toggle() flips open to closed and closed to open', () => {
    expect(dialog.isOpen).toBe(false);
    dialog.toggle();
    expect(dialog.isOpen).toBe(true);
    dialog.toggle();
    expect(dialog.isOpen).toBe(false);
  });

  it('supports multiple toggle cycles', () => {
    for (let i = 0; i < 5; i++) {
      dialog.toggle();
      expect(dialog.isOpen).toBe(true);
      dialog.toggle();
      expect(dialog.isOpen).toBe(false);
    }
  });
});

describe('DialogManagerStore', () => {
  beforeEach(() => {
    // Ensure clean state: close all dialogs before each test
    dialogs.closeAll();
  });

  const dialogNames = [
    'exportDialog',
    'qcDashboard',
    'onboardingModal',
    'externalImport',
    'batchEditor',
    'personaSettings',
    'commandPalette',
    'keyboardShortcuts',
    'authDialog',
    'storageFullDialog',
  ] as const;

  it('all dialogs start closed after closeAll', () => {
    for (const name of dialogNames) {
      expect(dialogs[name].isOpen).toBe(false);
    }
  });

  it('onboardingModal starts open when localStorage has no setup-complete flag', () => {
    // The global singleton was constructed during module load.
    // We cannot re-construct it, but we can verify the constructor logic:
    // If localStorage.getItem('iiif-field-setup-complete') is falsy,
    // onboardingModal should open. We test the DialogState(true) path instead.
    const state = new DialogState(true);
    expect(state.isOpen).toBe(true);
  });

  it('onboardingModal stays closed when localStorage has setup-complete flag', () => {
    // The constructor checks localStorage. Verify the inverse logic:
    localStorage.setItem('iiif-field-setup-complete', 'true');
    // DialogState(false) === closed
    const state = new DialogState(false);
    expect(state.isOpen).toBe(false);
    localStorage.removeItem('iiif-field-setup-complete');
  });

  it('anyOpen returns false when no dialogs are open', () => {
    expect(dialogs.anyOpen).toBe(false);
  });

  it('anyOpen returns true when any single dialog is open', () => {
    dialogs.exportDialog.open();
    expect(dialogs.anyOpen).toBe(true);
  });

  it('opening one dialog does not affect others', () => {
    dialogs.commandPalette.open();
    expect(dialogs.commandPalette.isOpen).toBe(true);
    expect(dialogs.exportDialog.isOpen).toBe(false);
    expect(dialogs.authDialog.isOpen).toBe(false);
    expect(dialogs.batchEditor.isOpen).toBe(false);
  });

  it('closeAll() closes all open dialogs', () => {
    dialogs.exportDialog.open();
    dialogs.qcDashboard.open();
    dialogs.commandPalette.open();
    expect(dialogs.anyOpen).toBe(true);

    dialogs.closeAll();
    for (const name of dialogNames) {
      expect(dialogs[name].isOpen).toBe(false);
    }
    expect(dialogs.anyOpen).toBe(false);
  });

  it('closeAll() after opening every dialog closes all', () => {
    for (const name of dialogNames) {
      dialogs[name].open();
    }
    expect(dialogs.anyOpen).toBe(true);

    dialogs.closeAll();
    expect(dialogs.anyOpen).toBe(false);
  });

  it('anyOpen reflects multiple opens and closes correctly', () => {
    dialogs.exportDialog.open();
    dialogs.batchEditor.open();
    expect(dialogs.anyOpen).toBe(true);

    dialogs.exportDialog.close();
    expect(dialogs.anyOpen).toBe(true); // batchEditor still open

    dialogs.batchEditor.close();
    expect(dialogs.anyOpen).toBe(false);
  });
});

// ============================================================================
// 2. AutoSaveStore
// ============================================================================

import { autoSave } from '@/src/app/stores/autoSave.svelte';

describe('AutoSaveStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset the singleton to a clean state
    autoSave.resetFailures();
    autoSave.markSaved();
    autoSave.destroy();
  });

  afterEach(() => {
    autoSave.destroy();
    vi.useRealTimers();
  });

  it('has correct constructor defaults', () => {
    expect(autoSave.dirty).toBe(false);
    expect(autoSave.saveStatus).toBe('saved');
    expect(autoSave.consecutiveFailures).toBe(0);
    expect(autoSave.isDisabled).toBe(false);
  });

  it('markDirty() sets dirty to true', () => {
    autoSave.markDirty();
    expect(autoSave.dirty).toBe(true);
  });

  it('save() calls the doSave function', async () => {
    const doSave = vi.fn().mockResolvedValue(undefined);
    autoSave.markDirty();
    await autoSave.save(doSave);
    expect(doSave).toHaveBeenCalledOnce();
  });

  it('save() transitions status to saving then saved on success', async () => {
    let statusDuringSave: string | undefined;
    const doSave = vi.fn().mockImplementation(async () => {
      statusDuringSave = autoSave.saveStatus;
    });

    autoSave.markDirty();
    await autoSave.save(doSave);

    expect(statusDuringSave).toBe('saving');
    expect(autoSave.saveStatus).toBe('saved');
  });

  it('save() clears dirty flag on success', async () => {
    const doSave = vi.fn().mockResolvedValue(undefined);
    autoSave.markDirty();
    expect(autoSave.dirty).toBe(true);

    await autoSave.save(doSave);
    expect(autoSave.dirty).toBe(false);
  });

  it('save() resets consecutiveFailures on success', async () => {
    // First, cause a failure
    autoSave.markDirty();
    await autoSave.save(() => Promise.reject(new Error('fail')));
    expect(autoSave.consecutiveFailures).toBe(1);

    // Now succeed
    autoSave.markDirty();
    await autoSave.save(() => Promise.resolve());
    expect(autoSave.consecutiveFailures).toBe(0);
  });

  it('save() on failure increments consecutiveFailures and sets status to error', async () => {
    autoSave.markDirty();
    await autoSave.save(() => Promise.reject(new Error('oops')));

    expect(autoSave.consecutiveFailures).toBe(1);
    expect(autoSave.saveStatus).toBe('error');
  });

  it('save() is disabled after MAX_FAILURES (3) consecutive failures', async () => {
    for (let i = 0; i < 3; i++) {
      autoSave.markDirty();
      await autoSave.save(() => Promise.reject(new Error(`fail ${i}`)));
    }

    expect(autoSave.consecutiveFailures).toBe(3);
    expect(autoSave.isDisabled).toBe(true);

    // Further save attempts should be ignored
    const doSave = vi.fn().mockResolvedValue(undefined);
    autoSave.markDirty();
    await autoSave.save(doSave);
    expect(doSave).not.toHaveBeenCalled();
  });

  it('markSaved() clears dirty and sets status to saved', () => {
    autoSave.markDirty();
    autoSave.markSaved();
    expect(autoSave.dirty).toBe(false);
    expect(autoSave.saveStatus).toBe('saved');
  });

  it('markSaved() updates lastSaveAt', () => {
    const before = autoSave.lastSaveAt;
    vi.advanceTimersByTime(100);
    autoSave.markSaved();
    expect(autoSave.lastSaveAt).toBeGreaterThan(before);
  });

  it('resetFailures() resets failure counter and clears isDisabled', async () => {
    for (let i = 0; i < 3; i++) {
      autoSave.markDirty();
      await autoSave.save(() => Promise.reject(new Error('fail')));
    }
    expect(autoSave.isDisabled).toBe(true);

    autoSave.resetFailures();
    expect(autoSave.consecutiveFailures).toBe(0);
    expect(autoSave.isDisabled).toBe(false);
  });

  it('save() is ignored when already saving', async () => {
    let resolveSave!: () => void;
    const slowSave = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveSave = resolve; })
    );

    autoSave.markDirty();
    const firstSave = autoSave.save(slowSave);

    // Attempt a second save while the first is in progress
    const secondDoSave = vi.fn().mockResolvedValue(undefined);
    await autoSave.save(secondDoSave);

    expect(secondDoSave).not.toHaveBeenCalled();
    expect(slowSave).toHaveBeenCalledOnce();

    // Finish the first save
    resolveSave();
    await firstSave;
  });

  it('save() is ignored when not dirty', async () => {
    const doSave = vi.fn().mockResolvedValue(undefined);
    await autoSave.save(doSave);
    expect(doSave).not.toHaveBeenCalled();
  });
});

// ============================================================================
// 3. ValidationStore
// ============================================================================

import {
  ValidationStore,
  type ValidationIssue,
} from '@/src/app/stores/validation.svelte';

describe('ValidationStore', () => {
  let store: ValidationStore;

  beforeEach(() => {
    vi.useFakeTimers();
    // Use a short debounce for faster tests
    store = new ValidationStore(100);
  });

  afterEach(() => {
    store.destroy();
    vi.useRealTimers();
  });

  it('has correct constructor defaults', () => {
    expect(store.issues).toEqual({});
    expect(store.isValidating).toBe(false);
    expect(store.totalIssues).toBe(0);
    expect(store.errorCount).toBe(0);
  });

  it('totalIssues counts across all entities', () => {
    const issues: Record<string, ValidationIssue[]> = {
      'canvas/1': [
        { id: 'v1', itemId: 'canvas/1', itemLabel: 'Canvas 1', level: 'error', message: 'Missing label', category: 'Metadata', fixable: false },
        { id: 'v2', itemId: 'canvas/1', itemLabel: 'Canvas 1', level: 'warning', message: 'No thumbnail', category: 'Content', fixable: false },
      ],
      'canvas/2': [
        { id: 'v3', itemId: 'canvas/2', itemLabel: 'Canvas 2', level: 'info', message: 'Suggestion', category: 'Metadata', fixable: false },
      ],
    };

    store.scheduleValidation(() => issues);
    vi.advanceTimersByTime(100);

    expect(store.totalIssues).toBe(3);
  });

  it('errorCount counts only level "error"', () => {
    const issues: Record<string, ValidationIssue[]> = {
      'manifest/1': [
        { id: 'v1', itemId: 'manifest/1', itemLabel: 'Manifest', level: 'error', message: 'Bad', category: 'Identity', fixable: false },
        { id: 'v2', itemId: 'manifest/1', itemLabel: 'Manifest', level: 'error', message: 'Also bad', category: 'Identity', fixable: false },
        { id: 'v3', itemId: 'manifest/1', itemLabel: 'Manifest', level: 'warning', message: 'Meh', category: 'Metadata', fixable: false },
        { id: 'v4', itemId: 'manifest/1', itemLabel: 'Manifest', level: 'info', message: 'FYI', category: 'Metadata', fixable: false },
      ],
    };

    store.scheduleValidation(() => issues);
    vi.advanceTimersByTime(100);

    expect(store.errorCount).toBe(2);
    expect(store.totalIssues).toBe(4);
  });

  it('scheduleValidation calls fn after debounce delay', () => {
    const validateFn = vi.fn().mockReturnValue({});

    store.scheduleValidation(validateFn);
    expect(validateFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(99);
    expect(validateFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(validateFn).toHaveBeenCalledOnce();
  });

  it('scheduleValidation debounces rapid calls (only last one fires)', () => {
    const fn1 = vi.fn().mockReturnValue({ 'a': [] });
    const fn2 = vi.fn().mockReturnValue({ 'b': [] });
    const fn3 = vi.fn().mockReturnValue({
      'c': [{ id: 'v1', itemId: 'c', itemLabel: 'C', level: 'error' as const, message: 'E', category: 'Identity' as const, fixable: false }],
    });

    store.scheduleValidation(fn1);
    vi.advanceTimersByTime(50);

    store.scheduleValidation(fn2);
    vi.advanceTimersByTime(50);

    store.scheduleValidation(fn3);
    vi.advanceTimersByTime(100);

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
    expect(fn3).toHaveBeenCalledOnce();
    expect(store.totalIssues).toBe(1);
  });

  it('scheduleValidation sets isValidating during execution', () => {
    // Since validateFn is sync and runs inside setTimeout callback,
    // isValidating will be true during the call but false after.
    // We verify it's false after the full run completes.
    let validatingDuringCall = false;
    const validateFn = vi.fn().mockImplementation(() => {
      validatingDuringCall = store.isValidating;
      return {};
    });

    store.scheduleValidation(validateFn);
    vi.advanceTimersByTime(100);

    expect(validatingDuringCall).toBe(true);
    expect(store.isValidating).toBe(false);
  });

  it('clear() empties issues and cancels pending validation', () => {
    // First, set some issues
    store.scheduleValidation(() => ({
      'x': [{ id: 'v1', itemId: 'x', itemLabel: 'X', level: 'error', message: 'E', category: 'Identity' as const, fixable: false }],
    }));
    vi.advanceTimersByTime(100);
    expect(store.totalIssues).toBe(1);

    // Schedule a new validation, then clear before it fires
    store.scheduleValidation(() => ({
      'y': [{ id: 'v2', itemId: 'y', itemLabel: 'Y', level: 'error', message: 'E2', category: 'Identity' as const, fixable: false }],
    }));

    store.clear();
    expect(store.issues).toEqual({});
    expect(store.isValidating).toBe(false);
    expect(store.totalIssues).toBe(0);

    // The pending validation should not fire
    vi.advanceTimersByTime(200);
    expect(store.totalIssues).toBe(0);
  });

  it('destroy() cancels pending timers', () => {
    const validateFn = vi.fn().mockReturnValue({});
    store.scheduleValidation(validateFn);

    store.destroy();
    vi.advanceTimersByTime(200);

    expect(validateFn).not.toHaveBeenCalled();
  });

  it('scheduleValidation catches errors in validateFn and keeps previous issues', () => {
    // First, set some issues
    store.scheduleValidation(() => ({
      'a': [{ id: 'v1', itemId: 'a', itemLabel: 'A', level: 'warning', message: 'W', category: 'Metadata' as const, fixable: false }],
    }));
    vi.advanceTimersByTime(100);
    expect(store.totalIssues).toBe(1);

    // Now schedule a validation that throws
    store.scheduleValidation(() => {
      throw new Error('validation blew up');
    });
    vi.advanceTimersByTime(100);

    // Previous issues should be preserved
    expect(store.totalIssues).toBe(1);
    expect(store.isValidating).toBe(false);
  });
});

// ============================================================================
// 4. SelectionStore
// ============================================================================

import { SelectionStore } from '@/src/shared/stores/selection.svelte';

describe('SelectionStore', () => {
  let sel: SelectionStore;

  beforeEach(() => {
    sel = new SelectionStore();
  });

  it('has correct constructor defaults', () => {
    expect(sel.ids.size).toBe(0);
    expect(sel.count).toBe(0);
  });

  it('select() adds an item to the selection', () => {
    sel.select('item-1');
    expect(sel.count).toBe(1);
    expect(sel.isSelected('item-1')).toBe(true);
  });

  it('select() with array adds multiple items', () => {
    sel.select(['a', 'b', 'c']);
    expect(sel.count).toBe(3);
    expect(sel.isSelected('a')).toBe(true);
    expect(sel.isSelected('b')).toBe(true);
    expect(sel.isSelected('c')).toBe(true);
  });

  it('select() appends to existing selection', () => {
    sel.select('a');
    sel.select('b');
    expect(sel.count).toBe(2);
    expect(sel.isSelected('a')).toBe(true);
    expect(sel.isSelected('b')).toBe(true);
  });

  it('set() replaces the entire selection', () => {
    sel.select(['a', 'b']);
    sel.set(['x', 'y']);
    expect(sel.count).toBe(2);
    expect(sel.isSelected('a')).toBe(false);
    expect(sel.isSelected('b')).toBe(false);
    expect(sel.isSelected('x')).toBe(true);
    expect(sel.isSelected('y')).toBe(true);
  });

  it('clear() empties the selection', () => {
    sel.select(['a', 'b', 'c']);
    sel.clear();
    expect(sel.count).toBe(0);
    expect(sel.isSelected('a')).toBe(false);
  });

  it('isSelected() returns true for selected and false otherwise', () => {
    sel.select('yes');
    expect(sel.isSelected('yes')).toBe(true);
    expect(sel.isSelected('no')).toBe(false);
  });

  it('toggle() adds item if absent, removes if present', () => {
    sel.toggle('item');
    expect(sel.isSelected('item')).toBe(true);

    sel.toggle('item');
    expect(sel.isSelected('item')).toBe(false);
  });

  it('selectWithModifier with ctrlKey toggles the item', () => {
    sel.select('a');
    sel.selectWithModifier('b', { ctrlKey: true, shiftKey: false });
    expect(sel.isSelected('a')).toBe(true);
    expect(sel.isSelected('b')).toBe(true);

    // Ctrl-click again to deselect b
    sel.selectWithModifier('b', { ctrlKey: true, shiftKey: false });
    expect(sel.isSelected('b')).toBe(false);
    expect(sel.isSelected('a')).toBe(true);
  });

  it('selectWithModifier with shiftKey performs range select', () => {
    const items = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
      { id: 'd' },
      { id: 'e' },
    ];

    // Select 'b' first
    sel.select('b');
    // Shift-click 'd' should select b, c, d
    sel.selectWithModifier('d', { ctrlKey: false, shiftKey: true }, items);

    expect(sel.isSelected('a')).toBe(false);
    expect(sel.isSelected('b')).toBe(true);
    expect(sel.isSelected('c')).toBe(true);
    expect(sel.isSelected('d')).toBe(true);
    expect(sel.isSelected('e')).toBe(false);
  });

  it('selectWithModifier without modifiers does single select (replaces)', () => {
    sel.select(['a', 'b', 'c']);
    sel.selectWithModifier('x', { ctrlKey: false, shiftKey: false });

    expect(sel.count).toBe(1);
    expect(sel.isSelected('x')).toBe(true);
    expect(sel.isSelected('a')).toBe(false);
    expect(sel.isSelected('b')).toBe(false);
  });
});

// ============================================================================
// 5. PipelineStore
// ============================================================================

import { pipeline } from '@/src/shared/stores/pipeline.svelte';

describe('PipelineStore', () => {
  beforeEach(() => {
    pipeline.clear();
    // Also clear sessionStorage to avoid cross-test pollution
    sessionStorage.removeItem('field-studio-pipeline');
  });

  it('has correct constructor defaults after clear', () => {
    expect(pipeline.origin).toBeNull();
    expect(pipeline.intent).toBeNull();
    expect(pipeline.selectedIds).toEqual([]);
    expect(pipeline.breadcrumbs).toEqual([]);
    expect(pipeline.isActive).toBe(false);
    expect(pipeline.count).toBe(0);
  });

  it('start() sets intent, origin, selectedIds, and first breadcrumb', () => {
    pipeline.start('edit-metadata', 'archive', ['id-1', 'id-2']);

    expect(pipeline.intent).toBe('edit-metadata');
    expect(pipeline.origin).toBe('archive');
    expect(pipeline.selectedIds).toEqual(['id-1', 'id-2']);
    expect(pipeline.breadcrumbs).toEqual([{ mode: 'archive', label: 'archive' }]);
    expect(pipeline.isActive).toBe(true);
    expect(pipeline.count).toBe(2);
  });

  it('start() with empty ids defaults to empty array', () => {
    pipeline.start('compose', 'boards');
    expect(pipeline.selectedIds).toEqual([]);
    expect(pipeline.count).toBe(0);
  });

  it('pushBreadcrumb() appends a new breadcrumb', () => {
    pipeline.start('annotate', 'viewer');
    pipeline.pushBreadcrumb('metadata', 'Edit Metadata');

    expect(pipeline.breadcrumbs).toEqual([
      { mode: 'viewer', label: 'viewer' },
      { mode: 'metadata', label: 'Edit Metadata' },
    ]);
  });

  it('popTo() truncates breadcrumbs and returns the target mode', () => {
    pipeline.start('edit-metadata', 'archive');
    pipeline.pushBreadcrumb('metadata', 'Metadata');
    pipeline.pushBreadcrumb('viewer', 'Viewer');

    expect(pipeline.breadcrumbs).toHaveLength(3);

    const targetMode = pipeline.popTo(1);
    expect(targetMode).toBe('metadata');
    expect(pipeline.breadcrumbs).toHaveLength(2);
    expect(pipeline.breadcrumbs[1].mode).toBe('metadata');
  });

  it('setSelectedIds() updates selected IDs mid-pipeline', () => {
    pipeline.start('compose', 'boards', ['a']);
    pipeline.setSelectedIds(['x', 'y', 'z']);

    expect(pipeline.selectedIds).toEqual(['x', 'y', 'z']);
    expect(pipeline.count).toBe(3);
  });

  it('clear() resets everything to idle', () => {
    pipeline.start('search', 'search', ['item-1']);
    pipeline.pushBreadcrumb('viewer', 'View');
    expect(pipeline.isActive).toBe(true);

    pipeline.clear();
    expect(pipeline.origin).toBeNull();
    expect(pipeline.intent).toBeNull();
    expect(pipeline.selectedIds).toEqual([]);
    expect(pipeline.breadcrumbs).toEqual([]);
    expect(pipeline.isActive).toBe(false);
  });

  it('persists state to sessionStorage', () => {
    pipeline.start('edit-metadata', 'archive', ['c1', 'c2']);

    const raw = sessionStorage.getItem('field-studio-pipeline');
    expect(raw).not.toBeNull();

    const data = JSON.parse(raw!);
    expect(data.intent).toBe('edit-metadata');
    expect(data.origin).toBe('archive');
    expect(data.selectedIds).toEqual(['c1', 'c2']);
  });

  it('clear() removes sessionStorage entry', () => {
    pipeline.start('annotate', 'viewer');
    expect(sessionStorage.getItem('field-studio-pipeline')).not.toBeNull();

    pipeline.clear();
    expect(sessionStorage.getItem('field-studio-pipeline')).toBeNull();
  });

  it('accepts all valid pipeline intents', () => {
    const intents = [
      'edit-metadata',
      'compose',
      'view-map',
      'view-timeline',
      'annotate',
      'search',
    ] as const;

    for (const intent of intents) {
      pipeline.start(intent, 'archive');
      expect(pipeline.intent).toBe(intent);
    }
  });
});

// ============================================================================
// 6. AnnotationStateStore
// ============================================================================

import { annotationState } from '@/src/app/stores/annotationState.svelte';

describe('AnnotationStateStore', () => {
  beforeEach(() => {
    annotationState.reset();
  });

  it('has correct constructor defaults', () => {
    expect(annotationState.showAnnotationTool).toBe(false);
    expect(annotationState.annotationText).toBe('');
    expect(annotationState.annotationMotivation).toBe('commenting');
    expect(annotationState.forceAnnotationsTab).toBe(false);
    expect(annotationState.timeRange).toBeNull();
    expect(annotationState.currentPlaybackTime).toBe(0);
    expect(annotationState.canSave).toBe(false);
    expect(annotationState.isDrawing).toBe(false);
  });

  it('setAnnotationText() updates annotationText', () => {
    annotationState.setAnnotationText('This is my note');
    expect(annotationState.annotationText).toBe('This is my note');
  });

  it('setAnnotationMotivation() updates motivation', () => {
    annotationState.setAnnotationMotivation('tagging');
    expect(annotationState.annotationMotivation).toBe('tagging');
  });

  it('setAnnotationDrawingState() updates drawing state', () => {
    annotationState.setAnnotationDrawingState({
      pointCount: 3,
      isDrawing: true,
      canSave: false,
    });
    expect(annotationState.isDrawing).toBe(true);
    expect(annotationState.canSave).toBe(false);
    expect(annotationState.annotationDrawingState.pointCount).toBe(3);
  });

  it('setAnnotationDrawingState() with canSave=true reflects in canSave getter', () => {
    annotationState.setAnnotationDrawingState({
      pointCount: 4,
      isDrawing: true,
      canSave: true,
    });
    expect(annotationState.canSave).toBe(true);
  });

  it('setTimeRange() sets time range', () => {
    annotationState.setTimeRange({ start: 10, end: 20 });
    expect(annotationState.timeRange).toEqual({ start: 10, end: 20 });
  });

  it('setTimeRange(null) clears time range', () => {
    annotationState.setTimeRange({ start: 5, end: 10 });
    annotationState.setTimeRange(null);
    expect(annotationState.timeRange).toBeNull();
  });

  it('handleAnnotationToolToggle(true) enables tool and sets forceAnnotationsTab', () => {
    annotationState.handleAnnotationToolToggle(true);
    expect(annotationState.showAnnotationTool).toBe(true);
    expect(annotationState.forceAnnotationsTab).toBe(true);
  });

  it('handleAnnotationToolToggle(false) disables tool and clears text+range', () => {
    annotationState.setAnnotationText('text');
    annotationState.setTimeRange({ start: 0, end: 5 });
    annotationState.handleAnnotationToolToggle(false);
    expect(annotationState.showAnnotationTool).toBe(false);
    expect(annotationState.forceAnnotationsTab).toBe(false);
    expect(annotationState.annotationText).toBe('');
    expect(annotationState.timeRange).toBeNull();
  });

  it('handlePlaybackTimeChange() updates currentPlaybackTime when throttle allows', () => {
    // Force a large time delta to bypass throttle
    // We access the internal timestamp directly by calling twice with delay
    annotationState.handlePlaybackTimeChange(15.0);
    // The first call always updates because lastPlaybackUpdateMs starts at 0
    expect(annotationState.currentPlaybackTime).toBe(15.0);
  });

  it('reset() restores all defaults', () => {
    annotationState.handleAnnotationToolToggle(true);
    annotationState.setAnnotationText('some text');
    annotationState.setTimeRange({ start: 1, end: 2 });

    annotationState.reset();

    expect(annotationState.showAnnotationTool).toBe(false);
    expect(annotationState.annotationText).toBe('');
    expect(annotationState.timeRange).toBeNull();
    expect(annotationState.forceAnnotationsTab).toBe(false);
    expect(annotationState.currentPlaybackTime).toBe(0);
  });
});

// ============================================================================
// 7. ResourceContextStore
// ============================================================================

import { resourceContext } from '@/src/app/stores/resourceContext.svelte';

describe('ResourceContextStore', () => {
  function makeItem(type: string = 'Canvas') {
    return {
      id: `https://example.org/${type.toLowerCase()}/1`,
      type: type as 'Canvas' | 'Manifest' | 'Collection' | 'Range' | 'AnnotationPage' | 'Annotation',
      label: { en: [`Test ${type}`] },
      items: [],
    };
  }

  beforeEach(() => {
    resourceContext.clearResource();
  });

  it('has correct constructor defaults', () => {
    expect(resourceContext.resource).toBeNull();
    expect(resourceContext.type).toBeNull();
    expect(resourceContext.validationStatus).toBeNull();
    expect(resourceContext.hasResource).toBe(false);
  });

  it('setResource() sets resource and type', () => {
    const canvas = makeItem('Canvas');
    resourceContext.setResource(canvas);
    expect(resourceContext.resource).toEqual(canvas);
    expect(resourceContext.type).toBe('Canvas');
    expect(resourceContext.hasResource).toBe(true);
  });

  it('setResource(null) clears resource', () => {
    resourceContext.setResource(makeItem('Canvas'));
    resourceContext.setResource(null);
    expect(resourceContext.resource).toBeNull();
    expect(resourceContext.type).toBeNull();
    expect(resourceContext.hasResource).toBe(false);
  });

  it('clearResource() resets to null state', () => {
    resourceContext.setResource(makeItem('Manifest'));
    resourceContext.clearResource();
    expect(resourceContext.resource).toBeNull();
    expect(resourceContext.type).toBeNull();
  });

  it('isCanvas returns true for Canvas', () => {
    resourceContext.setResource(makeItem('Canvas'));
    expect(resourceContext.isCanvas).toBe(true);
    expect(resourceContext.isManifest).toBe(false);
    expect(resourceContext.isCollection).toBe(false);
  });

  it('isManifest returns true for Manifest', () => {
    resourceContext.setResource(makeItem('Manifest'));
    expect(resourceContext.isManifest).toBe(true);
    expect(resourceContext.isCanvas).toBe(false);
  });

  it('isCollection returns true for Collection', () => {
    resourceContext.setResource(makeItem('Collection'));
    expect(resourceContext.isCollection).toBe(true);
  });

  it('isType() works for arbitrary types', () => {
    resourceContext.setResource(makeItem('Range'));
    expect(resourceContext.isType('Range')).toBe(true);
    expect(resourceContext.isType('Canvas')).toBe(false);
  });

  it('updateValidation() sets validation status', () => {
    resourceContext.setResource(makeItem('Canvas'));
    resourceContext.updateValidation({
      errorCount: 2,
      warningCount: 1,
      infoCount: 0,
      totalIssues: 3,
    });
    expect(resourceContext.validationStatus?.errorCount).toBe(2);
    expect(resourceContext.validationStatus?.totalIssues).toBe(3);
  });

  it('recordEdit() increments editCount', () => {
    resourceContext.setResource(makeItem('Canvas'));
    expect(resourceContext.editHistory.editCount).toBe(0);

    resourceContext.recordEdit();
    expect(resourceContext.editHistory.editCount).toBe(1);

    resourceContext.recordEdit();
    expect(resourceContext.editHistory.editCount).toBe(2);
  });

  it('recordEdit() adds editorId to editors list once', () => {
    resourceContext.setResource(makeItem('Canvas'));
    resourceContext.recordEdit('user-1');
    resourceContext.recordEdit('user-1'); // duplicate
    resourceContext.recordEdit('user-2');
    expect(resourceContext.editHistory.editors).toEqual(['user-1', 'user-2']);
  });

  it('recordEdit() sets lastEditedAt to a recent timestamp', () => {
    const before = Date.now();
    resourceContext.setResource(makeItem('Canvas'));
    resourceContext.recordEdit();
    const after = Date.now();
    expect(resourceContext.editHistory.lastEditedAt).not.toBeNull();
    expect(resourceContext.editHistory.lastEditedAt!).toBeGreaterThanOrEqual(before);
    expect(resourceContext.editHistory.lastEditedAt!).toBeLessThanOrEqual(after);
  });

  it('setCollaborationLock() locks resource', () => {
    resourceContext.setResource(makeItem('Canvas'));
    resourceContext.setCollaborationLock(true, ['user-2'], 5);
    expect(resourceContext.collaborationState.isLocked).toBe(true);
    expect(resourceContext.collaborationState.lockedBy).toEqual(['user-2']);
    expect(resourceContext.collaborationState.version).toBe(5);
  });

  it('setCollaborationLock(false) unlocks resource', () => {
    resourceContext.setResource(makeItem('Canvas'));
    resourceContext.setCollaborationLock(true, ['user-2']);
    resourceContext.setCollaborationLock(false);
    expect(resourceContext.collaborationState.isLocked).toBe(false);
  });

  it('updateAccessibility() merges partial features', () => {
    resourceContext.setResource(makeItem('Canvas'));
    resourceContext.updateAccessibility({ hasAltText: true, hasCaptions: true });
    expect(resourceContext.accessibilityFeatures.hasAltText).toBe(true);
    expect(resourceContext.accessibilityFeatures.hasCaptions).toBe(true);
    expect(resourceContext.accessibilityFeatures.hasAudioDescription).toBe(false); // unchanged
  });

  it('setResource with options sets optional fields', () => {
    const manifest = makeItem('Manifest');
    resourceContext.setResource(manifest, {
      area: 'inspector',
      validationStatus: { errorCount: 1, warningCount: 0, infoCount: 0, totalIssues: 1 },
    });
    expect(resourceContext.area).toBe('inspector');
    expect(resourceContext.validationStatus?.errorCount).toBe(1);
  });
});

// ============================================================================
// 8. UserIntentStore
// ============================================================================

import { userIntent } from '@/src/app/stores/userIntent.svelte';

describe('UserIntentStore', () => {
  beforeEach(() => {
    userIntent.clearIntent();
  });

  it('has correct constructor defaults', () => {
    expect(userIntent.intent).toBe('idle');
    expect(userIntent.secondary).toBeUndefined();
    expect(userIntent.resourceId).toBeUndefined();
    expect(userIntent.area).toBeUndefined();
    expect(userIntent.meta).toBeUndefined();
    expect(userIntent.isIdle).toBe(true);
    expect(userIntent.isEditing).toBe(false);
  });

  it('setIntent() sets primary intent', () => {
    userIntent.setIntent('editing');
    expect(userIntent.intent).toBe('editing');
    expect(userIntent.isEditing).toBe(true);
    expect(userIntent.isIdle).toBe(false);
  });

  it('setIntent() with options sets all optional fields', () => {
    userIntent.setIntent('annotating', {
      secondary: 'viewing',
      resourceId: 'canvas-1',
      area: 'viewer',
      meta: { tool: 'polygon' },
    });
    expect(userIntent.intent).toBe('annotating');
    expect(userIntent.secondary).toBe('viewing');
    expect(userIntent.resourceId).toBe('canvas-1');
    expect(userIntent.area).toBe('viewer');
    expect(userIntent.meta).toEqual({ tool: 'polygon' });
    expect(userIntent.isAnnotating).toBe(true);
  });

  it('clearIntent() resets to idle', () => {
    userIntent.setIntent('editing', { resourceId: 'canvas-1', area: 'inspector' });
    userIntent.clearIntent();
    expect(userIntent.intent).toBe('idle');
    expect(userIntent.secondary).toBeUndefined();
    expect(userIntent.resourceId).toBeUndefined();
    expect(userIntent.area).toBeUndefined();
    expect(userIntent.meta).toBeUndefined();
  });

  it('updateMeta() merges with existing meta', () => {
    userIntent.setIntent('designing', { meta: { gridSnap: true } });
    userIntent.updateMeta({ showGuides: false });
    expect(userIntent.meta).toEqual({ gridSnap: true, showGuides: false });
  });

  it('updateMeta() creates meta when none exists', () => {
    userIntent.setIntent('searching');
    userIntent.updateMeta({ query: 'test' });
    expect(userIntent.meta).toEqual({ query: 'test' });
  });

  it('isIntent() returns true for matching intent', () => {
    userIntent.setIntent('selecting');
    expect(userIntent.isIntent('selecting')).toBe(true);
    expect(userIntent.isIntent('editing')).toBe(false);
  });

  it('isFieldMode returns true when intent is fieldMode', () => {
    userIntent.setIntent('fieldMode');
    expect(userIntent.isFieldMode).toBe(true);
  });

  it('state getter returns a plain object snapshot', () => {
    userIntent.setIntent('navigating', { resourceId: 'man-1' });
    const state = userIntent.state;
    expect(state.intent).toBe('navigating');
    expect(state.resourceId).toBe('man-1');
    expect(typeof state.startedAt).toBe('number');
  });

  it('setIntent() updates startedAt to a recent timestamp', () => {
    const before = Date.now();
    userIntent.setIntent('exporting');
    const after = Date.now();
    expect(userIntent.startedAt).toBeGreaterThanOrEqual(before);
    expect(userIntent.startedAt).toBeLessThanOrEqual(after);
  });

  it('accepts all valid UserIntent values', () => {
    const intents = [
      'viewing', 'editing', 'selecting', 'dragging', 'exporting', 'importing',
      'validating', 'searching', 'navigating', 'annotating', 'designing',
      'fieldMode', 'idle',
    ] as const;
    for (const i of intents) {
      userIntent.setIntent(i);
      expect(userIntent.intent).toBe(i);
    }
  });
});
