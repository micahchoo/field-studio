<!--
  BatchEditor — Bulk metadata editing organism.
  React source: src/features/metadata-edit/ui/organisms/BatchEditor.tsx (349 lines)
  Architecture: Organism (local $state for tabs, rename, metadata, patterns, rollback)

  Tabs:
    - Rename: pattern-based rename with {orig}/{nnn} tokens
    - Metadata: shared summary + custom fields
    - Pattern Detector: regex extractor mapping capture groups to metadata fields

  Rollback: saves a snapshot to localStorage before apply, allowing undo.
-->
<script module lang="ts">
  const BATCH_SNAPSHOT_KEY = 'batch-editor-snapshot';

  const IIIF_PROPERTY_SUGGESTIONS = [
    'Title', 'Creator', 'Date', 'Description', 'Subject',
    'Rights', 'Source', 'Type', 'Format', 'Identifier',
    'Language', 'Coverage', 'Publisher', 'Contributor', 'Relation',
  ] as const;

  interface BatchSnapshot {
    timestamp: number;
    itemCount: number;
    root: import('@/src/shared/types').IIIFItem;
  }

  function saveBatchSnapshot(root: import('@/src/shared/types').IIIFItem, itemCount: number): boolean {
    try {
      const snapshot: BatchSnapshot = {
        timestamp: Date.now(),
        itemCount,
        root: JSON.parse(JSON.stringify(root)) as import('@/src/shared/types').IIIFItem,
      };
      localStorage.setItem(BATCH_SNAPSHOT_KEY, JSON.stringify(snapshot));
      return true;
    } catch {
      return false;
    }
  }

  function loadBatchSnapshot(): BatchSnapshot | null {
    try {
      const data = localStorage.getItem(BATCH_SNAPSHOT_KEY);
      if (!data) return null;
      return JSON.parse(data) as BatchSnapshot;
    } catch {
      return null;
    }
  }

  function clearBatchSnapshot(): void {
    try {
      localStorage.removeItem(BATCH_SNAPSHOT_KEY);
    } catch { /* ignore */ }
  }

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString();
  }
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { getIIIFValue } from '@/src/shared/types';
  import { getChildEntities, type IIIFItem } from '@/src/shared/types';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Select from '@/src/shared/ui/atoms/Select.svelte';
  import TextArea from '@/src/shared/ui/atoms/TextArea.svelte';

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    ids: string[];
    root: IIIFItem;
    onApply: (
      ids: string[],
      updates: Record<string, Partial<IIIFItem>>,
      renamePattern?: string
    ) => void;
    onClose: () => void;
    onRollback?: (root: IIIFItem) => void;
  }

  let { ids, root, onApply, onClose, onRollback }: Props = $props();

  // ---------------------------------------------------------------------------
  // Tab + snapshot state
  // ---------------------------------------------------------------------------

  type TabId = 'rename' | 'metadata' | 'patterns';

  let activeTab = $state<TabId>('rename');
  let existingSnapshot = $state<BatchSnapshot | null>(loadBatchSnapshot());
  let showRollbackConfirm = $state(false);

  // Rename state
  let renamePattern = $state('{orig}');

  // Metadata state
  let sharedSummary = $state('');
  let customFields = $state<{ label: string; value: string }[]>([]);

  // Pattern detector state
  let regexPattern = $state('(\\d{4})_(\\w+)_(.*)');
  let fieldMappings = $state<{ group: number; property: string }[]>([
    { group: 1, property: 'Date' },
    { group: 2, property: 'Subject' },
  ]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcut: Escape to close
  // ---------------------------------------------------------------------------

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  // ---------------------------------------------------------------------------
  // Derived: selected items from tree
  // ---------------------------------------------------------------------------

  function collectSelectedItems(node: IIIFItem, target: string[]): IIIFItem[] {
    const found: IIIFItem[] = [];
    function traverse(n: IIIFItem) {
      if (target.includes(n.id)) found.push(n);
      for (const child of getChildEntities(n)) traverse(child);
    }
    traverse(node);
    return found;
  }

  let selectedItems = $derived(collectSelectedItems(root, ids));

  // ---------------------------------------------------------------------------
  // Pattern results (only computed in patterns tab)
  // ---------------------------------------------------------------------------

  let patternResults = $derived.by(() => {
    if (activeTab !== 'patterns') return [];
    try {
      const re = new RegExp(regexPattern);
      return selectedItems.map(it => {
        const filename = getIIIFValue(it.label) || '';
        const match = filename.match(re);
        const extracted: Record<string, string> = {};
        if (match) {
          fieldMappings.forEach(m => {
            if (match[m.group]) extracted[m.property] = match[m.group] as string;
          });
        }
        return { filename, extracted, success: !!match };
      });
    } catch {
      return [];
    }
  });

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function handleApply() {
    const snapshotSaved = saveBatchSnapshot(root, ids.length);
    if (snapshotSaved) {
      existingSnapshot = loadBatchSnapshot();
    }

    const perItemUpdates: Record<string, Partial<IIIFItem>> = {};

    ids.forEach((id, index) => {
      const updates: Partial<IIIFItem> = {};

      if (activeTab === 'metadata') {
        if (sharedSummary) updates.summary = { en: [sharedSummary] };
        if (customFields.length > 0) {
          updates.metadata = customFields.map(f => ({
            label: { en: [f.label] },
            value: { en: [f.value] },
          }));
        }
      }

      if (activeTab === 'patterns') {
        const res = patternResults[index];
        if (res?.success) {
          updates.metadata = Object.entries(res.extracted).map(([k, v]) => ({
            label: { en: [k] },
            value: { en: [v] },
          }));
        }
      }

      perItemUpdates[id] = updates;
    });

    onApply(ids, perItemUpdates, activeTab === 'rename' ? renamePattern : undefined);
    onClose();
  }

  function handleRollback() {
    if (!existingSnapshot || !onRollback) return;
    onRollback(existingSnapshot.root);
    clearBatchSnapshot();
    existingSnapshot = null;
    showRollbackConfirm = false;
    onClose();
  }

  function addFieldMapping() {
    fieldMappings = [...fieldMappings, { group: fieldMappings.length + 1, property: 'Subject' }];
  }

  function removeFieldMapping(i: number) {
    fieldMappings = fieldMappings.filter((_, idx) => idx !== i);
  }

  function updateMappingGroup(i: number, val: string) {
    fieldMappings = fieldMappings.map((m, idx) =>
      idx === i ? { ...m, group: parseInt(val, 10) || 1 } : m
    );
  }

  function updateMappingProperty(i: number, val: string) {
    fieldMappings = fieldMappings.map((m, idx) =>
      idx === i ? { ...m, property: val } : m
    );
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal backdrop -->
<div
  class="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-8"
  role="dialog"
  aria-modal="true"
  aria-label="Batch Archive Toolkit"
>
  <div class="bg-nb-white w-full max-w-5xl h-[85vh] shadow-brutal-lg flex flex-col overflow-hidden border border-nb-black/20">

    <!-- Header -->
    <div class="p-6 border-b bg-nb-white flex justify-between items-center">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-iiif-blue flex items-center justify-center text-white shadow-brutal">
          <Icon name="auto_fix_high" class="text-2xl" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-nb-black">Batch Archive Toolkit</h2>
          <p class="text-[10px] font-bold text-nb-black/40 uppercase tracking-widest">
            Editing {ids.length} Items
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="bare"
        onclick={onClose}
        aria-label="Close batch editor"
        class="p-2 hover:bg-nb-cream text-nb-black/50 transition-nb"
      >
        <Icon name="close" />
      </Button>
    </div>

    <!-- Tab bar -->
    <div class="flex border-b bg-nb-white shrink-0">
      {#each (['rename', 'metadata', 'patterns'] as TabId[]) as tabId (tabId)}
        <Button
          variant="ghost"
          size="bare"
          onclick={() => { activeTab = tabId; }}
          class={cn(
            'flex-1 py-4 text-xs font-black uppercase tracking-widest transition-nb border-b-2',
            activeTab === tabId
              ? 'border-iiif-blue text-iiif-blue bg-nb-blue/10'
              : 'border-transparent text-nb-black/40 hover:text-nb-black/60'
          )}
        >
          {tabId === 'patterns' ? 'Pattern Detector' : tabId.charAt(0).toUpperCase() + tabId.slice(1)}
        </Button>
      {/each}
    </div>

    <!-- Main content: left panel (edit) + right panel (preview) -->
    <div class="flex-1 flex overflow-hidden">

      <!-- Left: Edit panel -->
      <div class="w-1/2 border-r border-nb-black/10 overflow-y-auto p-8 bg-nb-white custom-scrollbar">

        {#if activeTab === 'rename'}
          <div class="space-y-8">
            <div>
              <label
                for="rename-pattern-input"
                class="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-2"
              >
                Rename Pattern
              </label>
              <input
                id="rename-pattern-input"
                type="text"
                bind:value={renamePattern}
                class="w-full text-lg font-bold p-4 bg-nb-white border-2 border-transparent focus:border-iiif-blue outline-none"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <!-- Token insertion buttons -->
              <Button
                variant="ghost"
                size="bare"
                onclick={() => { renamePattern += '{orig}'; }}
                class="flex flex-col items-start p-2 bg-nb-white border border-nb-black/20 hover:border-iiif-blue transition-nb text-left"
              >
                <span class="text-[8px] font-black text-nb-black/40 uppercase">Original Name</span>
                <code class="text-xs font-mono font-bold text-iiif-blue">{'{orig}'}</code>
              </Button>
              <Button
                variant="ghost"
                size="bare"
                onclick={() => { renamePattern += '{nnn}'; }}
                class="flex flex-col items-start p-2 bg-nb-white border border-nb-black/20 hover:border-iiif-blue transition-nb text-left"
              >
                <span class="text-[8px] font-black text-nb-black/40 uppercase">Index (001...)</span>
                <code class="text-xs font-mono font-bold text-iiif-blue">{'{nnn}'}</code>
              </Button>
            </div>
          </div>

        {:else if activeTab === 'metadata'}
          <div class="space-y-6">
            <div>
              <label
                for="batch-summary-input"
                class="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-2"
              >
                Common Summary
              </label>
              <TextArea
                id="batch-summary-input"
                bind:value={sharedSummary}
                class="p-3 bg-nb-white outline-none text-sm min-h-[100px] border border-nb-black/20 focus:border-iiif-blue"
                placeholder="Common Summary..."
              />
            </div>

            <!-- Custom fields -->
            <div class="space-y-3">
              <p class="text-[10px] font-black text-nb-black/40 uppercase" aria-label="Custom Fields">
                Custom Fields
              </p>
              {#each customFields as field, i (i)}
                <div class="flex gap-2">
                  <input
                    type="text"
                    bind:value={customFields[i].label}
                    placeholder="Label"
                    class="flex-1 p-2 text-xs border border-nb-black/20 outline-none"
                  />
                  <input
                    type="text"
                    bind:value={customFields[i].value}
                    placeholder="Value"
                    class="flex-1 p-2 text-xs border border-nb-black/20 outline-none"
                  />
                  <Button
                    variant="ghost"
                    size="bare"
                    onclick={() => { customFields = customFields.filter((_, idx) => idx !== i); }}
                    class="text-nb-red"
                  >
                    <Icon name="delete" class="text-sm" />
                  </Button>
                </div>
              {/each}
              <Button
                variant="ghost"
                size="bare"
                onclick={() => { customFields = [...customFields, { label: '', value: '' }]; }}
                class="text-[10px] font-bold text-iiif-blue uppercase"
              >
                + Add Field
              </Button>
            </div>
          </div>

        {:else if activeTab === 'patterns'}
          <div class="space-y-6">
            <div class="bg-nb-blue/10 p-4 border border-nb-blue/20 mb-6">
              <h4 class="text-xs font-bold text-nb-blue flex items-center gap-2 mb-2">
                <Icon name="biotech" />
                Regex Extractor
              </h4>
              <p class="text-[10px] text-nb-blue leading-relaxed">
                Extract metadata from filenames. Use capture groups like
                <code>(&#92;d+)</code> to find values.
              </p>
            </div>

            <div>
              <label
                for="regex-pattern-input"
                class="block text-[10px] font-black text-nb-black/40 uppercase mb-2"
              >
                Regex Pattern
              </label>
              <input
                id="regex-pattern-input"
                type="text"
                bind:value={regexPattern}
                class="w-full font-mono text-sm p-3 bg-nb-white border border-nb-black/20 focus:border-iiif-blue outline-none"
                placeholder="e.g. (\d+)_(\w+).jpg"
              />
            </div>

            <div class="space-y-3">
              <p class="text-[10px] font-black text-nb-black/40 uppercase" aria-label="Field Mappings">
                Field Mappings
              </p>
              {#each fieldMappings as mapping, i (i)}
                <div class="flex gap-2">
                  <input
                    type="number"
                    value={mapping.group}
                    oninput={(e) => updateMappingGroup(i, (e.currentTarget as HTMLInputElement).value)}
                    class="w-16 p-2 border border-nb-black/20 text-xs outline-none"
                  />
                  <Select
                    value={mapping.property}
                    onchange={(e) => updateMappingProperty(i, (e.target as HTMLSelectElement).value)}
                    class="flex-1 p-2 border border-nb-black/20 text-xs outline-none"
                  >
                    {#each IIIF_PROPERTY_SUGGESTIONS as prop (prop)}
                      <option value={prop}>{prop}</option>
                    {/each}
                  </Select>
                  <Button
                    variant="ghost"
                    size="bare"
                    onclick={() => removeFieldMapping(i)}
                    class="text-nb-red"
                  >
                    <Icon name="delete" class="text-sm" />
                  </Button>
                </div>
              {/each}
              <Button
                variant="ghost"
                size="bare"
                onclick={addFieldMapping}
                class="text-[10px] font-bold text-iiif-blue uppercase"
              >
                + Add Group Mapping
              </Button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Right: Preview panel -->
      <div class="flex-1 bg-nb-white overflow-y-auto p-8 custom-scrollbar">
        <h3 class="text-xs font-black text-nb-black/40 uppercase tracking-widest mb-4">Preview</h3>
        <div class="space-y-2">
          {#if activeTab === 'patterns'}
            {#each patternResults as result, i (i)}
              <div class={cn(
                'p-3 border bg-nb-white',
                result.success ? 'border-nb-green/30' : 'border-nb-red/20 opacity-50'
              )}>
                <div class="text-[10px] font-mono text-nb-black/40">{result.filename}</div>
                {#if result.success}
                  <div class="mt-1 flex flex-wrap gap-2">
                    {#each Object.entries(result.extracted) as [k, v] (k)}
                      <span class="text-[9px] bg-nb-blue/10 text-nb-blue px-1.5 py-0.5 border border-nb-blue/20">
                        <strong>{k}:</strong> {v}
                      </span>
                    {/each}
                  </div>
                {:else}
                  <div class="text-[9px] text-nb-red mt-1 italic font-bold">No match found</div>
                {/if}
              </div>
            {/each}
          {:else}
            {#each selectedItems as item, i (item.id)}
              <div class="bg-nb-white p-3 border border-nb-black/20 text-sm font-bold truncate">
                {getIIIFValue(item.label)}
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>

    <!-- Footer actions -->
    <div class="p-6 bg-nb-white border-t flex justify-between items-center">
      <div>
        {#if existingSnapshot && onRollback}
          <Button
            variant="secondary"
            size="sm"
            onclick={() => { showRollbackConfirm = true; }}
          >
            <Icon name="history" class="mr-1" />
            Rollback Last Batch
          </Button>
        {/if}
      </div>
      <div class="flex gap-3">
        <Button variant="ghost" size="sm" onclick={onClose}>Cancel</Button>
        <Button variant="primary" size="base" onclick={handleApply}>
          Apply Changes
          <Icon name="play_arrow" class="ml-1" />
        </Button>
      </div>
    </div>
  </div>

  <!-- Rollback confirmation modal -->
  {#if showRollbackConfirm && existingSnapshot}
    <div
      class="fixed inset-0 bg-nb-black/50 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Confirm rollback"
    >
      <div class="bg-nb-white shadow-brutal-lg p-6 max-w-md w-full">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 bg-nb-orange/20 flex items-center justify-center text-nb-orange">
            <Icon name="warning" class="text-2xl" />
          </div>
          <div>
            <h3 class="text-lg font-bold text-nb-black">Confirm Rollback</h3>
            <p class="text-sm text-nb-black/50">This will restore the previous state</p>
          </div>
        </div>

        <div class="bg-nb-white p-4 mb-6 text-sm">
          <p class="text-nb-black/60">
            <strong>{existingSnapshot.itemCount} items</strong> were modified on
            <strong>{formatTimestamp(existingSnapshot.timestamp)}</strong>.
          </p>
          <p class="text-nb-black/50 mt-2">
            Rolling back will restore the archive to its state before that batch operation.
            This action cannot be undone.
          </p>
        </div>

        <div class="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onclick={() => { showRollbackConfirm = false; }}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onclick={handleRollback}>
            <Icon name="history" class="mr-1" />
            Rollback
          </Button>
        </div>
      </div>
    </div>
  {/if}
</div>
