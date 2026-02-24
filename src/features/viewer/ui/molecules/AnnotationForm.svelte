<!--
  AnnotationForm.svelte — Text input + motivation selector for creating annotations

  LAYER: molecule (receives cx + fieldMode props)
  FSD: features/viewer/ui/molecules

  Renders a textarea for annotation text, three motivation selector buttons
  (Comment / Tag / Describe), a point-count indicator, and Save / Undo / Clear
  action buttons.
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import TextArea from '@/src/shared/ui/atoms/TextArea.svelte';

  type Motivation = 'commenting' | 'tagging' | 'describing';

  interface Props {
    text: string;
    motivation: Motivation;
    pointCount: number;
    canSave: boolean;
    onTextChange: (text: string) => void;
    onMotivationChange: (m: Motivation) => void;
    onSave: () => void;
    onUndo: () => void;
    onClear: () => void;
    fieldMode: boolean;
    cx: ContextualClassNames;
  }

  let {
    text,
    motivation,
    pointCount,
    canSave,
    onTextChange,
    onMotivationChange,
    onSave,
    onUndo,
    onClear,
    fieldMode,
    cx,
  }: Props = $props();

  const motivations: Array<{ value: Motivation; label: string; icon: string }> = [
    { value: 'commenting', label: 'Comment', icon: 'chat_bubble_outline' },
    { value: 'tagging', label: 'Tag', icon: 'label_outline' },
    { value: 'describing', label: 'Describe', icon: 'description' },
  ];

  let accentColor = $derived(fieldMode ? 'text-nb-yellow' : 'text-nb-blue');
  let activeBtnClass = $derived(fieldMode
    ? 'bg-nb-yellow text-nb-black border-nb-yellow font-bold'
    : 'bg-nb-black text-nb-white border-nb-black font-bold'
  );
</script>

<div class="flex flex-col gap-3 p-3">
  <!-- Motivation selector -->
  <div class="flex gap-1" role="group" aria-label="Annotation motivation">
    {#each motivations as m}
      <button
        class={cn(
          'flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-mono border-2 transition-nb',
          motivation === m.value ? activeBtnClass : cx.iconButton
        )}
        onclick={() => onMotivationChange(m.value)}
        aria-pressed={motivation === m.value}
        title={m.label}
        aria-label={m.label}
      >
        <span class="material-symbols-outlined text-sm leading-none">{m.icon}</span>
        <span class="hidden sm:inline">{m.label}</span>
      </button>
    {/each}
  </div>

  <!-- Annotation text input -->
  <div class="flex flex-col gap-1">
    <label for="annotation-text-input" class={cn('text-xs font-mono uppercase tracking-wider', cx.textMuted)}>
      Annotation text
    </label>
    <TextArea
      id="annotation-text-input"
      value={text}
      oninput={(e) => onTextChange((e.target as HTMLTextAreaElement).value)}
      rows={3}
      class="resize-none px-2 py-1.5 text-sm font-mono"
      cx={{ input: cx.input }}
      placeholder="Enter annotation text..."
    />
  </div>

  <!-- Point count indicator -->
  {#if pointCount > 0}
    <p class={cn('text-xs font-mono', accentColor)}>
      {pointCount} point{pointCount !== 1 ? 's' : ''} drawn
    </p>
  {/if}

  <!-- Action buttons -->
  <div class="flex gap-2">
    <button
      class={cn(
        'flex-1 px-3 py-1.5 text-xs font-mono uppercase border-2 font-bold transition-nb',
        canSave
          ? fieldMode
            ? 'bg-nb-yellow text-nb-black border-nb-yellow hover:bg-nb-yellow/80'
            : 'bg-nb-black text-nb-white border-nb-black hover:bg-nb-black/80'
          : 'opacity-40 cursor-not-allowed border-current'
      )}
      onclick={onSave}
      disabled={!canSave}
      aria-label="Save annotation"
    >
      Save
    </button>

    <button
      class={cn(
        'px-3 py-1.5 text-xs font-mono uppercase border-2 transition-nb',
        pointCount > 0 ? cx.iconButton : 'opacity-40 cursor-not-allowed border-current'
      )}
      onclick={onUndo}
      disabled={pointCount === 0}
      title="Undo last point (Ctrl+Z)"
      aria-label="Undo last point"
    >
      Undo
    </button>

    <button
      class={cn(
        'px-3 py-1.5 text-xs font-mono uppercase border-2 transition-nb',
        pointCount > 0 || text.length > 0 ? cx.iconButton : 'opacity-40 cursor-not-allowed border-current'
      )}
      onclick={onClear}
      disabled={pointCount === 0 && text.length === 0}
      title="Clear drawing"
      aria-label="Clear annotation"
    >
      Clear
    </button>
  </div>
</div>
