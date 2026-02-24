<!--
  CommandPalette.svelte
  Fuzzy-searchable command palette with keyboard navigation,
  section grouping, command history (recent + frequent), and
  rich match highlighting.
  Migrated from React CommandPalette.tsx (502 lines).
-->

<script lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon, Input } from '@/src/shared/ui/atoms';
  import { ModalDialog } from '@/src/shared/ui/molecules';
  import { escapeHtml, fuzzyScore, fuzzyHighlightRanges, renderHighlighted } from '../lib/fuzzyMatch';

  import { commandHistory } from '@/src/shared/lib/hooks/commandHistory.svelte';

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------
  interface Command {
    id: string;
    label: string;
    section: string;
    icon?: string;
    shortcut?: string;
    description?: string;
    onExecute: () => void;
    isAvailable?: () => boolean;
  }

  interface MatchResult {
    command: Command;
    score: number;
    labelHighlightRanges: [number, number][];
    descriptionHighlightRanges: [number, number][];
    isRecent?: boolean;
    isFrequent?: boolean;
  }

  interface GroupedCommands {
    section: string;
    items: MatchResult[];
  }

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  interface Props {
    isOpen: boolean;
    onClose: () => void;
    commands: Command[];
    maxHistoryEntries?: number;
  }

  let {
    isOpen,
    onClose,
    commands,
    maxHistoryEntries = 5,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let query: string = $state('');
  let selectedIndex: number = $state(0);
  let inputRef: HTMLInputElement | undefined = $state(undefined);
  let listRef: HTMLDivElement | undefined = $state(undefined);

  // Debounced query for fuzzy matching (avoid re-computing on every keystroke)
  let debouncedQuery: string = $state('');
  let debounceTimer: ReturnType<typeof setTimeout> | undefined = $state(undefined);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  /** Filter commands to only those currently available */
  const availableCommands = $derived(
    commands.filter((cmd) => !cmd.isAvailable || cmd.isAvailable())
  );

  /** Recent + frequent commands from history store */
  const historyItems = $derived.by((): Command[] => {
    const recentEntries = commandHistory.recentCommands.slice(0, maxHistoryEntries);
    return recentEntries
      .map((entry) => availableCommands.find((c: Command) => c.id === entry.id))
      .filter((c): c is Command => c !== undefined);
  });

  /** Fuzzy match results against debounced query */
  const matches = $derived.by((): MatchResult[] => {
    if (!debouncedQuery.trim()) return [];

    const q = debouncedQuery.toLowerCase();
    const results: MatchResult[] = [];

    for (const cmd of availableCommands) {
      const labelScore = fuzzyScore(cmd.label, q);
      const descScore = cmd.description ? fuzzyScore(cmd.description, q) * 0.6 : 0;
      const totalScore = Math.max(labelScore, descScore);

      if (totalScore > 0) {
        results.push({
          command: cmd,
          score: totalScore,
          labelHighlightRanges: fuzzyHighlightRanges(cmd.label, q),
          descriptionHighlightRanges: cmd.description
            ? fuzzyHighlightRanges(cmd.description, q)
            : [],
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  });

  /** Group matches by section for display */
  const groupedMatches = $derived.by((): GroupedCommands[] => {
    // If no query, show history + all commands grouped by section
    if (!debouncedQuery.trim()) {
      const groups = new Map<string, MatchResult[]>();

      // Add history section if present
      if (historyItems.length > 0) {
        groups.set('Recent', historyItems.map((cmd) => ({
          command: cmd,
          score: 1,
          labelHighlightRanges: [],
          descriptionHighlightRanges: [],
          isRecent: true,
        })));
      }

      // Group remaining by section
      for (const cmd of availableCommands) {
        if (!groups.has(cmd.section)) groups.set(cmd.section, []);
        groups.get(cmd.section)!.push({
          command: cmd,
          score: 0,
          labelHighlightRanges: [],
          descriptionHighlightRanges: [],
        });
      }

      return [...groups].map(([section, items]) => ({ section, items }));
    }

    // Group matches by section
    const groups = new Map<string, MatchResult[]>();
    for (const match of matches) {
      const section = match.command.section;
      if (!groups.has(section)) groups.set(section, []);
      groups.get(section)!.push(match);
    }

    return [...groups].map(([section, items]) => ({ section, items }));
  });

  /** Flat list of all visible items for keyboard navigation indexing */
  const flatItems = $derived(
    groupedMatches.flatMap((g) => g.items)
  );

  const totalItems = $derived(flatItems.length);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleQueryChange(value: string): void {
    query = value;
    selectedIndex = 0;

    // Debounce fuzzy matching by 150ms
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedQuery = value;
    }, 150);
  }

  function handleExecute(cmd: Command): void {
    // Record in history
    commandHistory.record(cmd.id, cmd.label);

    // Execute
    cmd.onExecute();

    // Close palette
    onClose();
  }

  function handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % Math.max(1, totalItems);
        scrollSelectedIntoView();
        break;

      case 'ArrowUp':
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + totalItems) % Math.max(1, totalItems);
        scrollSelectedIntoView();
        break;

      case 'Enter':
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          handleExecute(flatItems[selectedIndex].command);
        }
        break;

      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }

  function scrollSelectedIntoView(): void {
    if (!listRef) return;
    const selected = listRef.querySelector(`[data-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: 'nearest' });
  }

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  // Focus input when palette opens
  $effect(() => {
    if (isOpen && inputRef) {
      const timer = setTimeout(() => inputRef?.focus(), 50);
      return () => clearTimeout(timer);
    }
  });

  // Reset state on close/open
  $effect(() => {
    if (isOpen) {
      query = '';
      debouncedQuery = '';
      selectedIndex = 0;
    }
  });

  // Cleanup debounce timer
  $effect(() => {
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  });
</script>

<!-- ======================================================================= -->
<!-- TEMPLATE                                                                -->
<!-- ======================================================================= -->

<ModalDialog
  open={isOpen}
  onClose={onClose}
  size="md"
>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class={cn('flex flex-col max-h-[60vh]')}
    onkeydown={handleKeydown}
    role="combobox"
    aria-expanded={isOpen}
    aria-haspopup="listbox"
    aria-controls="command-list"
    aria-label="Command palette"
    tabindex="0"
  >

    <!-- ================================================================= -->
    <!-- Search input                                                      -->
    <!-- ================================================================= -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-theme-border">
      <Icon name="search" size={18} class="text-theme-text-muted shrink-0" />
      <input
        bind:this={inputRef}
        type="text"
        value={query}
        oninput={(e) => handleQueryChange(e.currentTarget.value)}
        placeholder="Type a command..."
        class={cn(
          'flex-1 bg-transparent text-sm text-theme-text',
          'placeholder:text-theme-text-muted',
          'outline-none border-none'
        )}
        aria-autocomplete="list"
        aria-controls="command-list"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
      />
      {#if query}
        <Button
          variant="ghost"
          size="bare"
          onclick={() => handleQueryChange('')}
          title="Clear"
        >
          <Icon name="x" size={14} />
        </Button>
      {:else}
        <kbd class={cn(
          'px-2 py-1 text-xs font-mono',
          'bg-theme-surface-raised border border-theme-border rounded text-theme-text-muted'
        )}>
          ESC
        </kbd>
      {/if}
    </div>

    <!-- ================================================================= -->
    <!-- Command list                                                      -->
    <!-- ================================================================= -->
    <div
      bind:this={listRef}
      class="flex-1 overflow-y-auto py-2"
      role="listbox"
      id="command-list"
    >
      {#if groupedMatches.length === 0}
        <div class="px-4 py-8 text-center text-sm text-theme-text-muted">
          <Icon name="search-x" size={32} class="mx-auto mb-2 opacity-50" />
          <p>No commands found</p>
        </div>
      {:else}
        {#each groupedMatches as group}
          <!-- Section header -->
          <div class="px-4 pt-3 pb-1">
            <span class="text-[10px] font-semibold uppercase tracking-wider text-theme-text-muted">
              {group.section}
            </span>
          </div>

          <!-- Command items -->
          {#each group.items as match, itemIdx}
            {@const globalIdx = flatItems.indexOf(match)}
            {@const isSelected = globalIdx === selectedIndex}

            <button
              data-index={globalIdx}
              class={cn(
                'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                isSelected
                  ? 'bg-theme-primary/10 text-theme-text'
                  : 'text-theme-text hover:bg-theme-surface-hover'
              )}
              onclick={() => handleExecute(match.command)}
              onmouseenter={() => { selectedIndex = globalIdx; }}
              role="option"
              aria-selected={isSelected}
            >
              <!-- Command icon -->
              {#if match.command.icon}
                <Icon
                  name={match.command.icon}
                  size={16}
                  class={cn(
                    'shrink-0',
                    isSelected ? 'text-theme-primary' : 'text-theme-text-muted'
                  )}
                />
              {:else}
                <div class="w-4 shrink-0"></div>
              {/if}

              <!-- Label + description with fuzzy match highlighting -->
              <div class="flex-1 min-w-0">
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                <span class="text-sm font-medium truncate block">
                  {@html renderHighlighted(match.command.label, match.labelHighlightRanges)}
                </span>

                {#if match.command.description}
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  <span class="block text-xs text-theme-text-muted truncate">
                    {@html renderHighlighted(match.command.description, match.descriptionHighlightRanges)}
                  </span>
                {/if}
              </div>

              <!-- Badges + shortcut -->
              <div class="flex items-center gap-2 shrink-0">
                {#if match.isRecent}
                  <span class="text-[10px] bg-theme-primary/20 text-theme-primary px-1.5 py-0.5 rounded font-medium">
                    recent
                  </span>
                {/if}
                {#if match.isFrequent}
                  <span class="text-[10px] bg-theme-surface-raised text-theme-text-muted px-1.5 py-0.5 rounded font-medium">
                    frequent
                  </span>
                {/if}

                {#if match.command.shortcut}
                  <kbd class={cn(
                    'text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0',
                    'bg-theme-surface-raised border border-theme-border text-theme-text-muted'
                  )}>
                    {match.command.shortcut}
                  </kbd>
                {/if}
              </div>
            </button>
          {/each}
        {/each}
      {/if}
    </div>

    <!-- ================================================================= -->
    <!-- Footer: hint                                                      -->
    <!-- ================================================================= -->
    <div class="flex items-center justify-between px-4 py-2 border-t border-theme-border text-[10px] text-theme-text-muted">
      <div class="flex items-center gap-3">
        <span class="flex items-center gap-1">
          <kbd class="font-mono px-1.5 py-0.5 bg-theme-surface-raised border border-theme-border rounded">
            &uarr;&darr;
          </kbd>
          <span>navigate</span>
        </span>
        <span class="flex items-center gap-1">
          <kbd class="font-mono px-1.5 py-0.5 bg-theme-surface-raised border border-theme-border rounded">
            &crarr;
          </kbd>
          <span>execute</span>
        </span>
        <span class="flex items-center gap-1">
          <kbd class="font-mono px-1.5 py-0.5 bg-theme-surface-raised border border-theme-border rounded">
            esc
          </kbd>
          <span>close</span>
        </span>
      </div>
      <span>{totalItems} command{totalItems !== 1 ? 's' : ''}</span>
    </div>
  </div>
</ModalDialog>
