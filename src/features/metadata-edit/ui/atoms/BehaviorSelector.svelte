<!--
  BehaviorSelector — Multi-select checkbox list with conflict detection for IIIF behaviors.
  React source: src/features/metadata-edit/ui/atoms/BehaviorSelector.tsx
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { BEHAVIOR_DEFINITIONS } from '@/src/shared/constants/iiif';

  interface Props {
    options: string[];
    selected: string[];
    onchange: (selected: string[]) => void;
    getConflicts?: (behavior: string) => string[];
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
    label?: string;
    showSummary?: boolean;
  }

  let {
    options,
    selected,
    onchange,
    getConflicts,
    cx = {},
    fieldMode = false,
    label = 'Behaviors',
    showSummary = true,
  }: Props = $props();

  function toggle(behavior: string) {
    if (selected.includes(behavior)) {
      onchange(selected.filter(b => b !== behavior));
    } else {
      // Auto-remove conflicts when adding a behavior
      let next = [...selected];
      if (getConflicts) {
        const conflicts = getConflicts(behavior);
        next = next.filter(b => !conflicts.includes(b));
      }
      next.push(behavior);
      onchange(next);
    }
  }

  function getDefinition(behavior: string) {
    return BEHAVIOR_DEFINITIONS[behavior];
  }
</script>

<div class="space-y-2">
  {#if label}
    <p class={cn(
      'text-xs font-bold uppercase tracking-wider font-mono',
      fieldMode ? 'text-nb-yellow/80' : cx.label ?? 'text-nb-black/70'
    )}>
      {label}
    </p>
  {/if}

  {#if showSummary && selected.length > 0}
    <div class={cn(
      'flex flex-wrap gap-1 mb-2'
    )}>
      {#each selected as behavior (behavior)}
        <span class={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border',
          fieldMode
            ? 'bg-nb-yellow/20 border-nb-yellow/30 text-nb-yellow'
            : cx.accentBadge ?? 'bg-nb-black text-nb-white border-nb-black'
        )}>
          {getDefinition(behavior)?.label ?? behavior}
          <button
            type="button"
            class="hover:opacity-70"
            onclick={() => toggle(behavior)}
            aria-label="Remove {behavior}"
          >
            <Icon name="close" class="text-xs" />
          </button>
        </span>
      {/each}
    </div>
  {/if}

  <div class={cn(
    'border divide-y max-h-60 overflow-y-auto',
    fieldMode ? 'border-nb-yellow/20 divide-nb-yellow/10' : 'border-nb-black/10 divide-nb-black/5'
  )}>
    {#each options as behavior (behavior)}
      {@const def = getDefinition(behavior)}
      {@const isSelected = selected.includes(behavior)}
      {@const conflicts = getConflicts ? getConflicts(behavior) : []}
      {@const hasActiveConflict = conflicts.some(c => selected.includes(c))}

      <label class={cn(
        'flex items-start gap-3 px-3 py-2 cursor-pointer transition-colors',
        isSelected && (fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-cream'),
        !isSelected && 'hover:bg-nb-cream/50'
      )}>
        <input
          type="checkbox"
          checked={isSelected}
          onchange={() => toggle(behavior)}
          class="mt-1 w-4 h-4 accent-nb-orange shrink-0"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class={cn(
              'text-sm font-bold',
              fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black'
            )}>
              {def?.label ?? behavior}
            </span>
            {#if hasActiveConflict && !isSelected}
              <Icon name="warning" class="text-xs text-nb-orange" title="Conflicts with selected behavior" />
            {/if}
          </div>
          {#if def?.description}
            <p class={cn(
              'text-xs mt-0.5',
              fieldMode ? 'text-nb-yellow/60' : cx.textMuted ?? 'text-nb-black/50'
            )}>
              {def.description}
            </p>
          {/if}
          {#if def?.category}
            <span class={cn(
              'inline-block text-[10px] font-mono uppercase tracking-wider mt-1',
              fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/30'
            )}>
              {def.category}
            </span>
          {/if}
        </div>
      </label>
    {/each}
  </div>
</div>
