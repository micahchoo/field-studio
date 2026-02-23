<!--
  ConflictPanel Molecule

  Collapsible banner showing conflict summary for pre-ingest scan.
  Lists duplicate filenames with resolve options (Rename, Skip, Keep Both).

  Ported from: src/features/staging/ui/molecules/ConflictPanel.tsx (119 lines)
-->
<script lang="ts">
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { ConflictReport, DuplicateEntry } from '../../model/conflictDetection';

  interface Props {
    conflicts: ConflictReport;
    onExcludePath: (path: string) => void;
    onDismiss: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    conflicts,
    onExcludePath,
    onDismiss,
    cx,
    fieldMode = false,
  }: Props = $props();

  let isExpanded = $state(false);
</script>

{#snippet DuplicateItem(entry: DuplicateEntry)}
  <div class={cn('py-2 px-3 border-b last:border-b-0', cx?.border ?? 'border-nb-black/5')}>
    <div class="flex items-center gap-2 mb-1">
      <Icon name="content_copy" class="text-sm text-nb-orange" />
      <span class={cn('text-xs font-medium', cx?.text ?? 'text-nb-black/70')}>{entry.name}</span>
      <span class={cn('text-[10px]', cx?.textMuted ?? 'text-nb-black/40')}>({entry.paths.length} copies)</span>
    </div>
    <div class="ml-5 space-y-0.5">
      {#each entry.paths as path, i}
        <div class="flex items-center justify-between group text-[11px]">
          <span class={cn('truncate flex-1', cx?.textMuted ?? 'text-nb-black/50')} title={path}>{path}</span>
          {#if i > 0}
            <Button
              variant="ghost"
              size="bare"
              onclick={() => onExcludePath(path)}
              class="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-[10px] text-nb-orange hover:bg-nb-orange/10"
            >
              Skip
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#if conflicts.hasConflicts}
  <div class={cn('flex-shrink-0 border-b border-nb-orange/30', cx?.surface ?? 'bg-nb-orange/5')}>
    <!-- Summary bar -->
    <div class="flex items-center justify-between px-4 py-2">
      <div class="flex items-center gap-2">
        <Icon name="warning" class="text-nb-orange" />
        <span class="text-xs font-medium text-nb-orange">
          {conflicts.duplicateNames.length} duplicate filename{conflicts.duplicateNames.length !== 1 ? 's' : ''} detected
        </span>
        <span class={cn('text-[10px]', cx?.textMuted ?? 'text-nb-black/40')}>
          ({conflicts.totalDuplicates} files total)
        </span>
      </div>
      <div class="flex items-center gap-1">
        <Button
          variant="ghost"
          size="bare"
          onclick={() => isExpanded = !isExpanded}
          class={cn('px-2 py-1 text-[10px]', cx?.textMuted ?? 'text-nb-black/50', 'hover:bg-nb-cream')}
        >
          {isExpanded ? 'Collapse' : 'Details'}
        </Button>
        <Button
          variant="ghost"
          size="bare"
          onclick={onDismiss}
          class={cn('p-1 hover:bg-nb-cream', cx?.textMuted ?? 'text-nb-black/40')}
        >
          <Icon name="close" class="text-sm" />
        </Button>
      </div>
    </div>

    <!-- Expanded list -->
    {#if isExpanded}
      <div class={cn('max-h-40 overflow-y-auto border-t', cx?.border ?? 'border-nb-orange/20')}>
        {#each conflicts.duplicateNames as entry (entry.name)}
          {@render DuplicateItem(entry)}
        {/each}
      </div>
    {/if}
  </div>
{/if}
