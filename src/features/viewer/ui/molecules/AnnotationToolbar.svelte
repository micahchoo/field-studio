<!--
  AnnotationToolbar.svelte — Drawing mode selector for spatial annotations

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Button group for polygon / rectangle / freehand / select drawing modes.
  Keyboard shortcuts: P=polygon, R=rectangle, F=freehand, S=select.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { onMount, onDestroy } from 'svelte';

  type DrawingMode = 'polygon' | 'rectangle' | 'freehand' | 'select';

  interface Props {
    activeMode: DrawingMode;
    onModeChange: (mode: DrawingMode) => void;
    disabled?: boolean;
    fieldMode: boolean;
    cx: ContextualClassNames;
  }

  let {
    activeMode,
    onModeChange,
    disabled = false,
    fieldMode,
    cx,
  }: Props = $props();

  const modes: Array<{ value: DrawingMode; label: string; shortcut: string; icon: string }> = [
    { value: 'polygon', label: 'Polygon', shortcut: 'P', icon: 'pentagon' },
    { value: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: 'crop_square' },
    { value: 'freehand', label: 'Freehand', shortcut: 'F', icon: 'gesture' },
    { value: 'select', label: 'Select', shortcut: 'S', icon: 'near_me' },
  ];

  let activeBtnClass = $derived(fieldMode
    ? 'bg-nb-yellow text-nb-black border-nb-yellow font-bold'
    : 'bg-nb-black text-nb-white border-nb-black font-bold'
  );

  function handleKeyDown(e: KeyboardEvent) {
    if (disabled) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    switch (e.key.toUpperCase()) {
      case 'P': onModeChange('polygon'); break;
      case 'R': onModeChange('rectangle'); break;
      case 'F': onModeChange('freehand'); break;
      case 'S': onModeChange('select'); break;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });
</script>

<div
  class="flex gap-1"
  role="toolbar"
  aria-label="Drawing tools"
>
  {#each modes as mode}
    <button
      class={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono border-2 transition-nb',
        activeMode === mode.value ? activeBtnClass : cx.iconButton,
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none'
      )}
      onclick={() => !disabled && onModeChange(mode.value)}
      aria-pressed={activeMode === mode.value}
      aria-label="{mode.label} ({mode.shortcut})"
      title="{mode.label} ({mode.shortcut})"
      {disabled}
    >
      <span class="material-symbols-outlined text-sm leading-none">{mode.icon}</span>
      <span class="hidden md:inline">{mode.label}</span>
      <span class={cn(
        'text-[10px] font-bold hidden md:inline',
        activeMode === mode.value ? 'opacity-60' : 'opacity-40'
      )}>{mode.shortcut}</span>
    </button>
  {/each}
</div>
