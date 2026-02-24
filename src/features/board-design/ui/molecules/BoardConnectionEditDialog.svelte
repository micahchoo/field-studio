<!--
  BoardConnectionEditDialog.svelte — Modal dialog for editing board connections
  ==============================================================================
  Extracted from BoardView organism. Renders a centered modal dialog to edit
  connection type and label, or delete the connection.

  FSD Layer: features/board-design/ui/molecules
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { BoardConnection } from '@/src/features/board-design/stores/boardVault.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import Select from '@/src/shared/ui/atoms/Select.svelte';

  interface Props {
    connection: BoardConnection;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    onUpdateType: (type: BoardConnection['type']) => void;
    onUpdateLabel: (label: string | undefined) => void;
    onDelete: () => void;
    onClose: () => void;
  }

  let {
    connection,
    cx,
    fieldMode = false,
    onUpdateType,
    onUpdateLabel,
    onDelete,
    onClose,
  }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30" onclick={onClose}>
  <div
    class={cn('rounded-lg shadow-xl border-2 p-4 min-w-[300px]', cx.surface || 'bg-white', cx.border || 'border-nb-black')}
    onclick={(e: MouseEvent) => e.stopPropagation()}
    role="dialog"
    aria-label="Edit connection"
    tabindex="0"
  >
    <h3 class={cn('font-mono uppercase text-sm font-semibold mb-3', cx.text)}>Edit Connection</h3>

    <div class="space-y-3">
      <div>
        <label for="field-conn-type" class={cn('block text-xs font-medium mb-1', cx.textMuted)}>Type</label>
        <Select id="field-conn-type"
          class={cn('px-2 py-1.5 text-sm border-2 rounded', cx.border || 'border-nb-black', cx.surface || 'bg-white')}
          value={connection.type}
          onchange={(e) => {
            const target = e.target as HTMLSelectElement;
            onUpdateType(target.value as BoardConnection['type']);
          }}
        >
          <option value="sequence">Sequence</option>
          <option value="reference">Reference</option>
          <option value="supplement">Supplement</option>
          <option value="custom">Custom</option>
        </Select>
      </div>
      <div>
        <label for="field-conn-label" class={cn('block text-xs font-medium mb-1', cx.textMuted)}>Label</label>
        <input id="field-conn-label"
          class={cn('w-full px-2 py-1.5 text-sm border-2 rounded', cx.border || 'border-nb-black', cx.surface || 'bg-white')}
          type="text"
          value={connection.label ?? ''}
          oninput={(e) => {
            const target = e.target as HTMLInputElement;
            onUpdateLabel(target.value || undefined);
          }}
          placeholder="Optional label..."
        />
      </div>
    </div>

    <div class="flex justify-between mt-4">
      <button
        class="text-sm text-red-600 hover:text-red-700 font-medium"
        onclick={onDelete}
      >
        Delete Connection
      </button>
      <button
        class={cn('text-sm font-medium px-3 py-1 rounded', cx.accent || 'bg-blue-500 text-white')}
        onclick={onClose}
      >
        Done
      </button>
    </div>
  </div>
</div>
