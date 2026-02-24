<!--
  BoardContextMenu.svelte — Right-click context menu for board items
  ===================================================================
  Extracted from BoardView organism. Displays a positioned context menu
  with actions: open in viewer, duplicate, bring to front, send to back, delete.

  FSD Layer: features/board-design/ui/molecules
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    x: number;
    y: number;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    onAction: (action: 'open-viewer' | 'duplicate' | 'bring-front' | 'send-back' | 'delete') => void;
    onClose: () => void;
  }

  let { x, y, cx, fieldMode = false, onAction, onClose }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="fixed inset-0 z-[100]" onclick={onClose}>
  <div
    class={cn(
      'absolute z-[101] rounded shadow-lg border-2 py-1 min-w-[160px]',
      cx.surface || 'bg-white',
      cx.border || 'border-nb-black',
    )}
    style="left: {x}px; top: {y}px;"
    onclick={(e: MouseEvent) => e.stopPropagation()}
    role="menu"
    tabindex="0"
  >
    <button
      class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
      onclick={() => onAction('open-viewer')}
      role="menuitem"
    >
      Open in Viewer
    </button>
    <button
      class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
      onclick={() => onAction('duplicate')}
      role="menuitem"
    >
      Duplicate
    </button>
    <div class={cn('my-1 mx-2 h-px', cx.divider || 'bg-black/10')}></div>
    <button
      class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
      onclick={() => onAction('bring-front')}
      role="menuitem"
    >
      Bring to Front
    </button>
    <button
      class={cn('block w-full px-3 py-1.5 text-sm text-left hover:bg-black/5', cx.text)}
      onclick={() => onAction('send-back')}
      role="menuitem"
    >
      Send to Back
    </button>
    <div class={cn('my-1 mx-2 h-px', cx.divider || 'bg-black/10')}></div>
    <button
      class={cn('block w-full px-3 py-1.5 text-sm text-left text-red-600 hover:bg-red-50', cx.text)}
      onclick={() => onAction('delete')}
      role="menuitem"
    >
      Delete
    </button>
  </div>
</div>
