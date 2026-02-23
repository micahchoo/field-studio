<!--
  BoardToolbar.svelte -- Vertical sidebar toolbar for board tools (Organism)
  ==========================================================================
  React source: src/features/board-design/ui/organisms/BoardToolbar.tsx (122L)

  PURPOSE:
  Vertical sidebar showing tool selection (select/connect/note) and
  item actions (group/delete). Each tool has a keyboard shortcut.

  ARCHITECTURE NOTES:
  - Rule 2.F: tools constant array in <script module> (static data)
  - Stateless organism: all state controlled via props
  - Rule 5.D: receives cx + fieldMode from parent
  - Composes: inline buttons with Material Symbols icons, ToolDivider atom
  - Keyboard shortcuts (V, C, N, G, Delete) handled at BoardView level,
    not here -- this component only renders the visual representation

  STATE MAPPING:
  - No local state -- fully controlled via activeTool, selectedItemId, canGroup props
-->
<script module lang="ts">
  // Rule 2.F: static tool definitions in module scope
  export const TOOLS = [
    {
      id: 'select' as const,
      icon: 'mouse',
      label: 'Select',
      shortcut: 'V',
    },
    {
      id: 'connect' as const,
      icon: 'timeline',
      label: 'Connect',
      shortcut: 'C',
    },
    {
      id: 'note' as const,
      icon: 'sticky_note_2',
      label: 'Note',
      shortcut: 'N',
    },
  ] as const;
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  type ToolId = 'select' | 'connect' | 'note';

  interface Props {
    /** Currently active tool */
    activeTool: ToolId;
    /** Called when tool changes */
    onToolChange: (tool: ToolId) => void;
    /** Currently selected item ID */
    selectedItemId: string | null;
    /** Delete callback */
    onDelete: () => void;
    /** Group callback -- creates a group from currently selected items */
    onGroup?: () => void;
    /** Whether grouping is available (needs selection > 1) */
    canGroup?: boolean;
    /** Contextual styles from template */
    cx: {
      surface: string;
      text: string;
      accent: string;
    };
    /** Current field mode */
    fieldMode: boolean;
  }

  let {
    activeTool,
    onToolChange,
    selectedItemId,
    onDelete,
    onGroup,
    canGroup = false,
    cx,
    fieldMode,
  }: Props = $props();

  // Static class map for field/normal toolbar background (Rule 2.D)
  const TOOLBAR_BG = {
    field: 'bg-nb-black border-nb-black/80',
    normal: 'bg-nb-white border-nb-black/20',
  } as const;

  const DIVIDER_BG = {
    field: 'bg-nb-black/80',
    normal: 'bg-nb-cream',
  } as const;
</script>

<div
  class={cn(
    'w-16 flex flex-col items-center py-4 gap-2 border-r',
    fieldMode ? TOOLBAR_BG.field : TOOLBAR_BG.normal,
  )}
>
  <!-- Tool buttons -->
  {#each TOOLS as tool (tool.id)}
    {@const isActive = activeTool === tool.id}
    <button
      type="button"
      onclick={() => onToolChange(tool.id)}
      class={cn(
        'w-10 h-10 flex items-center justify-center rounded transition-colors relative group',
        isActive && fieldMode && 'bg-nb-yellow text-nb-black',
        isActive && !fieldMode && 'bg-nb-orange/15 text-nb-orange',
        !isActive && fieldMode && 'text-nb-white/60 hover:text-nb-yellow hover:bg-nb-white/5',
        !isActive && !fieldMode && 'text-nb-black/50 hover:text-nb-black hover:bg-nb-black/5',
      )}
      title="{tool.label} ({tool.shortcut})"
      aria-label={tool.label}
      aria-pressed={isActive}
    >
      <span class="material-symbols-outlined text-xl">{tool.icon}</span>

      <!-- Shortcut hint tooltip -->
      <span
        class={cn(
          'absolute left-full ml-2 px-1.5 py-0.5 text-[10px] font-mono rounded',
          'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap',
          fieldMode ? 'bg-nb-yellow text-nb-black' : 'bg-nb-black text-nb-white',
        )}
      >
        {tool.shortcut}
      </span>
    </button>
  {/each}

  <!-- Divider -->
  <div
    class={cn('w-8 h-px my-2', fieldMode ? DIVIDER_BG.field : DIVIDER_BG.normal)}
    aria-hidden="true"
  ></div>

  <!-- Group button (disabled unless canGroup) -->
  <button
    type="button"
    onclick={() => { if (canGroup && onGroup) onGroup(); }}
    disabled={!canGroup}
    class={cn(
      'w-10 h-10 flex items-center justify-center rounded transition-colors',
      !canGroup && 'opacity-30 cursor-not-allowed',
      canGroup && fieldMode && 'text-nb-white/60 hover:text-nb-yellow hover:bg-nb-white/5',
      canGroup && !fieldMode && 'text-nb-black/50 hover:text-nb-black hover:bg-nb-black/5',
    )}
    title="Group selected items (G)"
    aria-label="Group selected items"
  >
    <span class="material-symbols-outlined text-xl">group_work</span>
  </button>

  <!-- Delete button (disabled unless selectedItemId) -->
  <button
    type="button"
    onclick={() => { if (selectedItemId) onDelete(); }}
    disabled={!selectedItemId}
    class={cn(
      'w-10 h-10 flex items-center justify-center rounded transition-colors',
      !selectedItemId && 'opacity-30 cursor-not-allowed',
      selectedItemId && fieldMode && 'text-nb-white/60 hover:text-nb-red hover:bg-nb-red/10',
      selectedItemId && !fieldMode && 'text-nb-black/50 hover:text-nb-red hover:bg-nb-red/5',
    )}
    title="Delete selected (Del)"
    aria-label="Delete selected"
  >
    <span class="material-symbols-outlined text-xl">delete</span>
  </button>
</div>
