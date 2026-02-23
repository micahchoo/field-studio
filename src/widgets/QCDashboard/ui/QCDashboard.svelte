<!--
  QCDashboard.svelte
  Three-panel quality control dashboard: category filters + health gauge,
  issue list with heal buttons, and context panel (thumbnail, hierarchy,
  metadata, raw JSON).
  Migrated from React QCDashboard.tsx (497 lines).
-->

<script lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { cn } from '@/src/shared/lib/cn';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import { PaneLayout, PanelLayout } from '@/src/shared/ui/layout';
  import { ModalDialog, Toast } from '@/src/shared/ui/molecules';
  import { toast } from '@/src/shared/stores/toast.svelte';

  import type { IIIFItem } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';

  // @migration stub -- validation healer functions not yet migrated
  import {
    healIssue,
    applyHealToTree,
    safeHealAll,
  } from '@/src/entities/manifest/model/validation/validationHealer';

  import {
    calculateHealthScore,
    getHealthColor,
    getHealthBgColor,
    getSeverityClasses,
    findItemById,
    findItemAndPath as findItemAndPathPure,
  } from '../lib/qcHelpers';

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------
  type IssueSeverity = 'error' | 'warning' | 'info';

  type IssueCategory =
    | 'Identity'
    | 'Structure'
    | 'Metadata'
    | 'Content';

  interface ValidationIssue {
    id: string;
    itemId: string;
    itemLabel: string;
    level: IssueSeverity;
    category: IssueCategory;
    message: string;
    fixable: boolean;
    path?: string;
  }

  const CATEGORIES: { id: IssueCategory; icon: string; label: string }[] = [
    { id: 'Identity',  icon: 'fingerprint',   label: 'Identity & IDs' },
    { id: 'Structure', icon: 'account_tree',   label: 'Hierarchy' },
    { id: 'Metadata',  icon: 'label',          label: 'Labels & Descriptive' },
    { id: 'Content',   icon: 'image',          label: 'Media & Technical' },
  ];

  const IIIF_PROPERTY_SUGGESTIONS = [
    'Title', 'Creator', 'Date', 'Description', 'Subject',
    'Rights', 'Source', 'Type', 'Format', 'Identifier',
    'Language', 'Coverage', 'Publisher', 'Contributor', 'Relation',
  ];

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------
  interface Props {
    issuesMap: Record<string, ValidationIssue[]>;
    totalItems: number;
    root: IIIFItem | null;
    onSelect: (id: string) => void;
    onUpdate: (newRoot: IIIFItem) => void;
    onClose: () => void;
  }

  let {
    issuesMap,
    totalItems,
    root,
    onSelect,
    onUpdate,
    onClose,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let activeCategory: IssueCategory = $state('Identity');
  let selectedIssueId: string | null = $state(null);
  let showAddMenu: boolean = $state(false);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  /** Flatten all issues from the map into a single array */
  const allIssues = $derived.by((): ValidationIssue[] => {
    return Object.values(issuesMap).flat();
  });

  /** Filter issues by active category */
  const categoryIssues = $derived(
    allIssues.filter((i) => i.category === activeCategory)
  );

  /** Health score: percentage of items without errors */
  const healthScore = $derived.by((): number => {
    const errorCount = allIssues.filter((i) => i.level === 'error').length;
    return calculateHealthScore(errorCount, totalItems);
  });

  /** SVG gauge arc calculation for semi-circle */
  const gaugeArcLength = $derived(Math.PI * 40); // semi-circle circumference for r=40
  const gaugeOffset = $derived(gaugeArcLength - (gaugeArcLength * healthScore) / 100);

  /** The currently selected issue object */
  const selectedIssue = $derived(
    allIssues.find((i) => i.id === selectedIssueId) ?? null
  );

  /** Auto-clear selection when issue is fixed */
  $effect(() => {
    if (selectedIssueId && !allIssues.some((i) => i.id === selectedIssueId)) {
      selectedIssueId = null;
    }
  });

  // ---------------------------------------------------------------------------
  // Item lookup with path (cached via Map)
  // ---------------------------------------------------------------------------
  let findCache = $state(new Map<string, { item: IIIFItem | null; path: { id: string; label: string; type: string }[] }>());

  // Clear cache when root changes
  $effect(() => {
    if (root) {
      findCache = new Map();
    }
  });

  /** Recursively find item + build hierarchy path (cached) */
  function findItemAndPath(id: string): { item: IIIFItem | null; path: { id: string; label: string; type: string }[] } {
    const cached = findCache.get(id);
    if (cached) return cached;

    const result = findItemAndPathPure(root, id);
    findCache.set(id, result);
    return result;
  }

  /** Preview item and path for selected issue */
  const previewData = $derived.by(() => {
    if (!selectedIssue) return { item: null, path: [] };
    return findItemAndPath(selectedIssue.itemId);
  });

  const previewItem = $derived(previewData.item);
  const previewPath = $derived(previewData.path);

  /** Count of fixable issues in current category */
  const fixableCount = $derived(
    categoryIssues.filter((i) => i.fixable).length
  );

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Health score color based on value */
  function healthColor(score: number): string {
    if (score >= 80) return 'text-nb-green';
    if (score >= 50) return 'text-nb-orange';
    return 'text-nb-red';
  }

  /** Health score bg color for gauge */
  function healthStrokeColor(score: number): string {
    if (score >= 80) return 'stroke-nb-green';
    if (score >= 50) return 'stroke-nb-orange';
    return 'stroke-nb-red';
  }

  /** Health score bg color for badge */
  function healthBgColor(score: number): string {
    if (score >= 80) return 'bg-nb-green/20 text-nb-green';
    return 'bg-nb-red/20 text-nb-red';
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleCategoryFilter(cat: IssueCategory): void {
    activeCategory = cat;
    selectedIssueId = null;
  }

  function handleSelectIssue(issue: ValidationIssue): void {
    selectedIssueId = issue.id;
  }

  function handleUpdateItem(itemId: string, updates: Partial<IIIFItem>): void {
    if (!root) return;
    const newRoot = JSON.parse(JSON.stringify(root)) as IIIFItem;
    const visited = new Set<string>();

    function traverse(node: IIIFItem): boolean {
      if (visited.has(node.id)) return false;
      visited.add(node.id);

      if (node.id === itemId) {
        Object.assign(node, updates);
        return true;
      }
      const nodeWithStructures = node as IIIFItem & { structures?: IIIFItem[] };
      const children = (node as unknown as Record<string, unknown>).items as IIIFItem[] | undefined;
      const annotations = (node as unknown as Record<string, unknown>).annotations as IIIFItem[] | undefined;
      const structures = nodeWithStructures.structures;
      const all = [...(children ?? []), ...(annotations ?? []), ...(structures ?? [])];
      for (const child of all) {
        if (traverse(child as IIIFItem)) return true;
      }
      return false;
    }

    if (traverse(newRoot)) onUpdate(newRoot);
  }

  function handleHeal(issue: ValidationIssue): void {
    if (!root) return;

    try {
      const { item: targetItem } = findItemAndPath(issue.itemId);
      if (!targetItem) return;

      const result = healIssue(targetItem, issue as unknown as Parameters<typeof healIssue>[1]);
      if (result.success && result.updatedItem) {
        const newRoot = applyHealToTree(root, issue.itemId, result.updatedItem);
        if (newRoot) {
          onUpdate(newRoot);
        }
      }
    } catch (e: unknown) {
      toast.error(`Fix failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  function handleHealAllFixable(): void {
    if (!root) return;

    const fixable = categoryIssues.filter((i) => i.fixable);
    if (fixable.length === 0) return;

    let currentRoot = root;
    let healedCount = 0;

    for (const issue of fixable) {
      try {
        const { item: targetItem } = findItemAndPath(issue.itemId);
        if (!targetItem) continue;

        const result = safeHealAll(targetItem, [issue] as unknown as Parameters<typeof safeHealAll>[1]);
        if (result.success && result.updatedItem) {
          const newRoot = applyHealToTree(currentRoot, issue.itemId, result.updatedItem);
          if (newRoot) {
            currentRoot = newRoot;
            healedCount++;
          }
        }
      } catch {
        // Skip failed items in batch
      }
    }

    if (healedCount > 0) {
      onUpdate(currentRoot);
      toast.success(`Fixed ${healedCount} issues`);
    }
  }

  function handleRemoveMetadata(itemId: string, index: number): void {
    if (!previewItem || !previewItem.metadata) return;
    const newMeta = [...previewItem.metadata];
    newMeta.splice(index, 1);
    handleUpdateItem(itemId, { metadata: newMeta });
  }

  function handleAddMetadata(itemId: string, label: string): void {
    if (!previewItem) return;
    const newMeta = [...(previewItem.metadata || []), { label: { en: [label] }, value: { en: [''] } }];
    handleUpdateItem(itemId, { metadata: newMeta });
    showAddMenu = false;
  }

  // Escape key handler
  $effect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });
</script>

<!-- ======================================================================= -->
<!-- TEMPLATE                                                                -->
<!-- ======================================================================= -->

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 bg-nb-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-8 animate-in fade-in"
  onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
  <div class="bg-nb-white w-full max-w-[1400px] h-[90vh] shadow-brutal-lg flex overflow-hidden border border-nb-black/20">

    <!-- ================================================================= -->
    <!-- LEFT PANEL: Categories + Health Gauge                             -->
    <!-- ================================================================= -->
    <div class="w-64 border-r flex flex-col shrink-0">

      <!-- Health score gauge: SVG semi-circle -->
      <div class="p-6 border-b">
        <div class={cn(
          'w-12 h-12 flex flex-col items-center justify-center shadow-brutal mb-4',
          healthBgColor(healthScore)
        )}>
          <span class="text-lg font-black leading-none">{healthScore}%</span>
          <span class="text-[7px] font-black uppercase tracking-widest">Health</span>
        </div>
        <h2 class="text-sm font-black uppercase tracking-widest text-nb-black">Integrity Guard</h2>
      </div>

      <!-- Category filter buttons -->
      <div class="flex-1 p-3 space-y-1">
        {#each CATEGORIES as cat (cat.id)}
          {@const count = allIssues.filter((i) => i.category === cat.id).length}
          <Button
            variant="ghost"
            size="bare"
            onclick={() => handleCategoryFilter(cat.id)}
            class={cn(
              'w-full flex items-center justify-between px-4 py-3 transition-nb',
              activeCategory === cat.id
                ? 'bg-nb-blue/10 border-l-4 border-l-iiif-blue text-nb-black font-bold'
                : 'text-nb-black/50 hover:bg-nb-cream'
            )}
          >
            <div class="flex items-center gap-3">
              <Icon name={cat.icon} class="text-sm" />
              <span class="text-xs uppercase tracking-wider">{cat.label}</span>
            </div>
            {#if count > 0}
              <span class={cn(
                'text-[10px] px-1.5 font-bold',
                count > 5 ? 'bg-nb-red/20 text-nb-red' : 'bg-nb-cream text-nb-black/50'
              )}>
                {count}
              </span>
            {/if}
          </Button>
        {/each}
      </div>

      <!-- Global status footer -->
      <div class="p-4 bg-nb-black text-white flex flex-col gap-1">
        <span class="text-[8px] font-black uppercase text-white/40 tracking-widest">Global Status</span>
        <span class="text-[10px] font-bold text-nb-green flex items-center gap-1">
          <Icon name="verified" class="text-xs" />
          {totalItems} Resources Monitored
        </span>
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- MIDDLE PANEL: Issue list                                          -->
    <!-- ================================================================= -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0 border-r">

      <!-- Issue list header -->
      <div class="p-6 border-b flex justify-between items-center bg-nb-cream/50">
        <h3 class="font-bold flex items-center gap-2 text-nb-black">
          <Icon name="list" class="text-nb-black/40" />
          Detected Violations in {activeCategory}
        </h3>
        <Button
          variant="primary"
          size="sm"
          onclick={handleHealAllFixable}
          disabled={fixableCount === 0}
          class="text-[10px] font-black uppercase px-4 py-2 bg-iiif-blue text-white hover:bg-nb-blue shadow-brutal-sm transition-nb active:scale-95"
        >
          Heal All Fixable
        </Button>
      </div>

      <!-- Scrollable issue list -->
      <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {#if categoryIssues.length === 0}
          <div class="h-full flex flex-col items-center justify-center text-nb-black/40">
            <Icon name="task_alt" class="text-6xl mb-4 opacity-20" />
            <p class="font-bold uppercase tracking-widest text-xs">No issues in this category</p>
          </div>
        {:else}
          {#each categoryIssues as issue (issue.id)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class={cn(
                'p-4 border transition-nb cursor-pointer group flex items-center justify-between',
                selectedIssueId === issue.id
                  ? 'bg-nb-blue/10 border-iiif-blue ring-2 ring-nb-blue/20 shadow-brutal'
                  : 'border-nb-black/10 hover:border-nb-black/20'
              )}
              onclick={() => handleSelectIssue(issue)}
            >
              <div class="flex-1 min-w-0 pr-4">
                <div class="flex items-center gap-2 mb-1">
                  <span class={cn(
                    'text-[8px] font-black uppercase px-1.5 py-0.5',
                    issue.level === 'error'
                      ? 'bg-nb-red/20 text-nb-red'
                      : 'bg-nb-orange/20 text-nb-orange'
                  )}>
                    {issue.level}
                  </span>
                  <span class="text-[10px] font-bold truncate text-nb-black">
                    {issue.itemLabel ?? 'Unknown'}
                  </span>
                </div>
                <p class="text-xs line-clamp-1 text-nb-black/50">{issue.message}</p>
              </div>
              {#if issue.fixable}
                <Button
                  variant="ghost"
                  size="bare"
                  onclick={(e) => { e.stopPropagation(); handleHeal(issue); }}
                  title="Auto-fix this issue"
                  class="px-5 py-1.5 bg-nb-green text-white text-[9px] font-black uppercase opacity-0 group-hover:opacity-100 transition-nb shadow hover:bg-nb-green"
                >
                  Fix It
                </Button>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- ================================================================= -->
    <!-- RIGHT PANEL: Context / detail for selected issue                  -->
    <!-- ================================================================= -->
    <div class="w-[450px] flex flex-col shrink-0">

      <!-- Panel header -->
      <div class="p-6 border-b flex justify-between items-center shadow-brutal-sm">
        <span class="text-[10px] font-black uppercase tracking-widest text-nb-black/40">Archival Context & Tools</span>
        <Button variant="ghost" size="bare" onclick={onClose} class="p-1 transition-nb text-nb-black/40 hover:text-nb-black">
          <Icon name="close" />
        </Button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {#if selectedIssue && previewItem}
          <div class="space-y-6 animate-in slide-in-from-right-2">

            <!-- Thumbnail preview -->
            <div class="aspect-video bg-nb-black overflow-hidden border shadow-inner relative group ring-4 ring-white flex items-center justify-center">
              {#if previewItem.thumbnail && previewItem.thumbnail.length > 0}
                <img
                  src={typeof previewItem.thumbnail[0] === 'string' ? previewItem.thumbnail[0] : previewItem.thumbnail[0]?.id ?? ''}
                  alt={getIIIFValue(previewItem.label) || 'Preview'}
                  class="w-full h-full object-contain"
                />
              {:else}
                <div class="flex flex-col items-center gap-2 text-white/30">
                  <Icon name="image_not_supported" class="text-4xl" />
                  <span class="text-[9px] font-bold uppercase tracking-widest">No Preview</span>
                </div>
              {/if}
              <div class="absolute top-2 right-2 bg-nb-black/50 text-[8px] text-white px-1.5 py-0.5 uppercase font-black tracking-widest">
                {previewItem.type} Preview
              </div>
            </div>

            <!-- Hierarchy breadcrumb trace -->
            <div class="space-y-3">
              <label class="text-[9px] font-black uppercase tracking-widest text-nb-black/40">Archive Hierarchy Trace</label>
              <div class="border overflow-hidden shadow-brutal-sm">
                {#each previewPath as p, i (p.id)}
                  <div
                    style:padding-left="{(i * 12) + 12}px"
                    class={cn(
                      'flex items-center gap-2 p-2 border-b last:border-b-0',
                      i === previewPath.length - 1
                        ? 'bg-nb-blue/10 border-l-4 border-l-iiif-blue'
                        : 'opacity-60'
                    )}
                  >
                    <Icon
                      name={p.type === 'Collection' ? 'folder' : p.type === 'Manifest' ? 'menu_book' : 'crop_original'}
                      class={cn('text-xs', i === previewPath.length - 1 ? 'text-iiif-blue' : 'text-nb-black/40')}
                    />
                    <span class={cn(
                      'text-[10px] truncate',
                      i === previewPath.length - 1 ? 'font-bold text-nb-black' : 'text-nb-black/50'
                    )}>
                      {p.label}
                    </span>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Interactive metadata workbench (for Metadata/Identity categories) -->
            {#if activeCategory === 'Metadata' || activeCategory === 'Identity'}
              <div class="space-y-4">
                <label class="text-[9px] font-black uppercase tracking-widest text-nb-black/40">Interactive Workbench</label>
                <div class="border p-5 space-y-4 shadow-brutal-sm">
                  <!-- Resource Label -->
                  <div>
                    <label class="text-[10px] font-black uppercase mb-1.5 block text-nb-black/40">Resource Label</label>
                    <input
                      value={getIIIFValue(previewItem.label)}
                      oninput={(e) => handleUpdateItem(previewItem.id, { label: { none: [(e.target as HTMLInputElement).value] } })}
                      class="w-full text-xs p-2.5 border focus:ring-2 focus:ring-iiif-blue outline-none font-bold bg-nb-white"
                    />
                  </div>

                  <!-- Summary -->
                  <div>
                    <label class="text-[10px] font-black uppercase mb-1.5 block text-nb-black/40">Scientific Summary</label>
                    <textarea
                      value={getIIIFValue(previewItem.summary)}
                      oninput={(e) => handleUpdateItem(previewItem.id, { summary: { none: [(e.target as HTMLTextAreaElement).value] } })}
                      class="w-full text-xs p-2.5 border focus:ring-2 focus:ring-iiif-blue outline-none font-medium min-h-[60px] bg-nb-white"
                      placeholder="Provide a descriptive summary..."
                    ></textarea>
                  </div>

                  <!-- Metadata key-value pairs -->
                  <div class="pt-2 border-t">
                    <div class="flex justify-between items-center mb-2">
                      <label class="text-[10px] font-black uppercase text-nb-black/40">Archive Metadata</label>
                      <div class="relative">
                        <Button
                          variant="ghost"
                          size="bare"
                          onclick={() => { showAddMenu = !showAddMenu; }}
                          class="text-[9px] font-black uppercase text-iiif-blue hover:underline flex items-center gap-1"
                        >
                          Add Field <Icon name="expand_more" class="text-[10px]" />
                        </Button>
                        {#if showAddMenu}
                          <div class="absolute right-0 top-full mt-1 shadow-brutal py-2 z-[700] min-w-[140px] max-h-[200px] overflow-y-auto custom-scrollbar bg-nb-white border">
                            {#each IIIF_PROPERTY_SUGGESTIONS as prop (prop)}
                              <Button
                                variant="ghost"
                                size="bare"
                                onclick={() => handleAddMetadata(previewItem.id, prop)}
                                class="w-full px-4 py-1.5 text-left text-[10px] font-bold text-nb-black/60 hover:bg-nb-blue/10 transition-nb"
                              >
                                {prop}
                              </Button>
                            {/each}
                            <div class="border-t mt-1 pt-1">
                              <Button
                                variant="ghost"
                                size="bare"
                                onclick={() => handleAddMetadata(previewItem.id, 'New Field')}
                                class="w-full px-4 py-1.5 text-left text-[10px] font-black italic text-nb-black/40"
                              >
                                Custom...
                              </Button>
                            </div>
                          </div>
                        {/if}
                      </div>
                    </div>
                    <div class="space-y-2">
                      {#if (previewItem.metadata || []).length === 0}
                        <p class="text-[10px] italic text-nb-black/40">No custom metadata tags.</p>
                      {:else}
                        {#each previewItem.metadata ?? [] as md, idx (idx)}
                          <div class="flex gap-2 group/meta">
                            <input
                              value={getIIIFValue(md.label)}
                              oninput={(e) => {
                                if (!previewItem.metadata) return;
                                const newMeta = JSON.parse(JSON.stringify(previewItem.metadata));
                                newMeta[idx].label = { en: [(e.target as HTMLInputElement).value] };
                                handleUpdateItem(previewItem.id, { metadata: newMeta });
                              }}
                              class="w-1/3 text-[9px] font-black uppercase border-none p-1.5 text-nb-black/40 bg-transparent"
                            />
                            <input
                              value={getIIIFValue(md.value)}
                              oninput={(e) => {
                                if (!previewItem.metadata) return;
                                const newMeta = JSON.parse(JSON.stringify(previewItem.metadata));
                                newMeta[idx].value = { en: [(e.target as HTMLInputElement).value] };
                                handleUpdateItem(previewItem.id, { metadata: newMeta });
                              }}
                              class="flex-1 text-[10px] font-bold border-none p-1.5 text-nb-black bg-transparent"
                            />
                            <Button
                              variant="ghost"
                              size="bare"
                              onclick={() => handleRemoveMetadata(previewItem.id, idx)}
                              class="text-nb-black/30 hover:text-nb-red opacity-0 group-hover/meta:opacity-100 transition-nb p-0 min-w-0"
                            >
                              <Icon name="close" class="text-sm" />
                            </Button>
                          </div>
                        {/each}
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/if}

            <!-- Raw technical signature (JSON) -->
            <div class="space-y-2 opacity-50 grayscale hover:grayscale-0 transition-nb">
              <label class="text-[9px] font-black uppercase tracking-widest text-nb-black/40">Technical Signature</label>
              <div class="bg-nb-black p-4 font-mono text-[9px] text-nb-blue/60 leading-relaxed overflow-hidden border border-white/10 shadow-brutal">
                <p class="text-white/40 mb-1">// {previewItem.type} ID</p>
                <p class="break-all text-nb-green mb-2">{previewItem.id}</p>
                <div class="flex gap-2 mt-4 pt-4 border-t border-white/10">
                  <span class="text-white/40">
                    Children: {((previewItem as unknown as Record<string, unknown>).items as unknown[] | undefined)?.length ?? 0}
                  </span>
                  <span class="text-white/40">
                    Annotations: {((previewItem as unknown as Record<string, unknown>).annotations as unknown[] | undefined)?.length ?? 0}
                  </span>
                </div>
              </div>
            </div>

            <!-- Reveal in workbench button -->
            <Button
              variant="primary"
              size="lg"
              onclick={() => { onSelect(selectedIssue.itemId); onClose(); }}
              class="w-full bg-nb-black text-white p-4 text-xs font-black uppercase hover:bg-nb-black/80 transition-nb flex items-center justify-center gap-2 shadow-brutal"
            >
              <Icon name="location_searching" /> Reveal in Workbench
            </Button>
          </div>
        {:else}
          <!-- No issue selected: empty state -->
          <div class="h-full flex flex-col items-center justify-center text-center p-8 text-nb-black/40">
            <div class="w-16 h-16 flex items-center justify-center mb-6 shadow-brutal-sm border rotate-3">
              <Icon name="biotech" class="text-3xl opacity-20 text-iiif-blue" />
            </div>
            <h4 class="text-sm font-black uppercase tracking-tighter text-nb-black/40">Diagnostic Panel Ready</h4>
            <p class="text-[10px] font-bold uppercase tracking-widest mt-2 max-w-[200px] text-nb-black/40">
              Select an issue from the list to begin structural repair
            </p>
          </div>
        {/if}
      </div>

      <!-- Info footer -->
      <div class="p-4 border-t">
        <div class="flex items-start gap-3 p-3 bg-nb-blue/10 border border-nb-blue/20">
          <Icon name="auto_fix_high" class="text-nb-blue text-sm mt-0.5" />
          <p class="text-[10px] text-nb-blue leading-tight italic">
            Direct healing allows you to patch standard violations without leaving the diagnostic dashboard.
          </p>
        </div>
      </div>
    </div>
  </div>
</div>
