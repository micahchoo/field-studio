<!--
  ComposerToolbar.svelte — Save / Undo / Redo for board design

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Toolbar with Save (disabled when not dirty), Undo/Redo (disabled when
  !canUndo/!canRedo), unsaved changes indicator, and Close button.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    canUndo: boolean;
    canRedo: boolean;
    isDirty: boolean;
    onSave: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onClose: () => void;
    fieldMode: boolean;
    cx: ContextualClassNames;
  }

  let {
    canUndo,
    canRedo,
    isDirty,
    onSave,
    onUndo,
    onRedo,
    onClose,
    fieldMode,
    cx,
  }: Props = $props();
</script>

<div
  class={cn(
    'flex items-center gap-2 px-3 py-2 border-b shrink-0',
    cx.headerBg,
    cx.text
  )}
  role="toolbar"
  aria-label="Composer tools"
>
  <!-- Save -->
  <button
    class={cn(
      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase border-2 transition-nb',
      isDirty
        ? fieldMode
          ? 'bg-nb-yellow text-nb-black border-nb-yellow hover:bg-nb-yellow/80'
          : 'bg-nb-black text-nb-white border-nb-black hover:bg-nb-black/80'
        : 'opacity-40 cursor-not-allowed border-current',
      cx.text
    )}
    onclick={onSave}
    disabled={!isDirty}
    aria-label="Save composition"
    title="Save (Ctrl+S)"
  >
    <span class="material-symbols-outlined text-sm leading-none">save</span>
    Save
  </button>

  <!-- Unsaved indicator -->
  {#if isDirty}
    <span class={cn(
      'text-xs font-mono animate-pulse',
      fieldMode ? 'text-nb-yellow/70' : 'text-nb-black/50'
    )}>
      Unsaved changes
    </span>
  {/if}

  <!-- Separator -->
  <div class={cn('w-px h-5 mx-1', fieldMode ? 'bg-nb-yellow/30' : 'bg-nb-black/20')} aria-hidden="true"></div>

  <!-- Undo -->
  <button
    class={cn(
      'flex items-center gap-1 px-2 py-1.5 text-xs font-mono border-2 transition-nb',
      canUndo ? cx.iconButton : 'opacity-40 cursor-not-allowed border-current'
    )}
    onclick={onUndo}
    disabled={!canUndo}
    aria-label="Undo"
    title="Undo (Ctrl+Z)"
  >
    <span class="material-symbols-outlined text-sm leading-none">undo</span>
    <span class="hidden sm:inline">Undo</span>
  </button>

  <!-- Redo -->
  <button
    class={cn(
      'flex items-center gap-1 px-2 py-1.5 text-xs font-mono border-2 transition-nb',
      canRedo ? cx.iconButton : 'opacity-40 cursor-not-allowed border-current'
    )}
    onclick={onRedo}
    disabled={!canRedo}
    aria-label="Redo"
    title="Redo (Ctrl+Shift+Z)"
  >
    <span class="material-symbols-outlined text-sm leading-none">redo</span>
    <span class="hidden sm:inline">Redo</span>
  </button>

  <!-- Spacer -->
  <div class="flex-1"></div>

  <!-- Close -->
  <button
    class={cn('flex items-center gap-1 px-2 py-1.5 text-xs font-mono border-2 transition-nb', cx.iconButton)}
    onclick={onClose}
    aria-label="Close composer"
    title="Close"
  >
    <span class="material-symbols-outlined text-sm leading-none">close</span>
    <span class="hidden sm:inline">Close</span>
  </button>
</div>
