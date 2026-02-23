<!--
  MetadataEditorPanel — Metadata editing side panel organism.
  React source: src/features/metadata-edit/ui/organisms/MetadataEditorPanel.tsx (287 lines)
  Architecture: Organism (tab persistence, validation, responsive sizing)

  Shows:
  - Validation summary at top when issues exist
  - Tab bar: metadata | technical | annotations | validation
  - Per-tab panels
  - Location picker modal (conditional)
  - Mobile: full-screen modal
  - Tablet: 40% width
  - Desktop: fixed 320px
-->
<script module lang="ts">
  type TabId = 'metadata' | 'technical' | 'annotations' | 'validation';
  const ALLOWED_TABS: TabId[] = ['metadata', 'technical', 'annotations', 'validation'];
  const TAB_STORAGE_PREFIX = 'inspector-tab';
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { getIIIFValue } from '@/src/shared/types';
  import type { IIIFItem } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { validateResource, fixIssue, fixAll } from '../../lib/inspectorValidation';
  import type { ValidationIssue } from '../../lib/inspectorValidation';
  import { DUBLIN_CORE_MAP } from '@/src/shared/constants';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  // Molecules (imported only if they exist; gracefully fallback to stubs otherwise)
  import MetadataTabPanel from '../molecules/MetadataTabPanel.svelte';
  import TechnicalTabPanel from '../molecules/TechnicalTabPanel.svelte';
  import AnnotationsTabPanel from '../molecules/AnnotationsTabPanel.svelte';
  import ValidationTabPanel from '../molecules/ValidationTabPanel.svelte';
  import ValidationSummary from '../molecules/ValidationSummary.svelte';

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    /** Resource being edited */
    resource: IIIFItem | null;
    /** Called when resource is updated */
    onUpdateResource: (r: Partial<IIIFItem>) => void;
    /** Current language for metadata values */
    language?: string;
    /** Contextual styles from template */
    cx: ContextualClassNames;
    /** Current field mode */
    fieldMode: boolean;
    /** Optional close handler */
    onClose?: () => void;
    /** Whether the panel is open (for mobile modal) */
    isOpen?: boolean;
    /** Whether displayed on mobile */
    isMobile?: boolean;
    /** Whether displayed on tablet */
    isTablet?: boolean;
  }

  let {
    resource,
    onUpdateResource,
    language = 'en',
    cx,
    fieldMode,
    onClose,
    isOpen = true,
    isMobile = false,
    isTablet = false,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // Tab persistence
  // ---------------------------------------------------------------------------

  function loadPersistedTab(resourceType: string): TabId {
    try {
      const stored = localStorage.getItem(`${TAB_STORAGE_PREFIX}-${resourceType}`);
      if (stored && ALLOWED_TABS.includes(stored as TabId)) {
        return stored as TabId;
      }
    } catch { /* localStorage unavailable */ }
    return 'metadata';
  }

  let tab = $state<TabId>('metadata');

  // Re-initialise tab when resource type changes
  $effect(() => {
    if (resource?.type) {
      tab = loadPersistedTab(resource.type);
    }
  });

  // Persist tab selection
  $effect(() => {
    if (resource?.type) {
      try {
        localStorage.setItem(`${TAB_STORAGE_PREFIX}-${resource.type}`, tab);
      } catch { /* ignore */ }
    }
  });

  // ---------------------------------------------------------------------------
  // Location picker state (for geo fields in MetadataTabPanel)
  // ---------------------------------------------------------------------------

  let showLocationPicker = $state<{ index: number; value: string } | null>(null);

  // ---------------------------------------------------------------------------
  // Validation (pure computation via $derived)
  // ---------------------------------------------------------------------------

  let validationResult = $derived(
    resource
      ? validateResource(resource, resource.type)
      : { issues: [], errorCount: 0, warningCount: 0, infoCount: 0, autoFixableIssues: [], isValid: true }
  );

  let validationIssues = $derived(validationResult.issues);

  function handleFixIssue(issue: ValidationIssue) {
    if (!resource) return;
    const fixed = fixIssue(resource, issue);
    if (fixed) onUpdateResource(fixed);
  }

  /** Get Dublin Core hint for a metadata label */
  function getDCHint(lbl: string): string | null {
    const lower = lbl.toLowerCase();
    const match = Object.keys(DUBLIN_CORE_MAP).find(k => k.toLowerCase() === lower);
    return match ? (DUBLIN_CORE_MAP as Record<string, string>)[match] ?? null : null;
  }

  /** Whether a metadata label refers to a geographic location field */
  function isLocationField(lbl: string): boolean {
    const lower = lbl.toLowerCase();
    return lower === 'location' || lower === 'gps' || lower === 'coverage' || lower === 'coordinates';
  }

  function handleFixAll() {
    if (!resource) return;
    const fixed = fixAll(resource, validationResult.autoFixableIssues);
    if (fixed) onUpdateResource(fixed);
  }

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  let label = $derived(
    resource ? (getIIIFValue(resource.label, language) || getIIIFValue(resource.label, 'none') || '') : ''
  );

  let summary = $derived(
    resource ? (getIIIFValue(resource.summary, language) || '') : ''
  );

  let allAnnotations = $derived(
    resource?.annotations?.flatMap((page) => page.items || []) ?? []
  );

  // ---------------------------------------------------------------------------
  // Tab definitions (with validation badge)
  // ---------------------------------------------------------------------------

  interface TabDef {
    id: TabId;
    label: string;
    badge?: number;
    badgeColor?: string;
  }

  let tabs = $derived<TabDef[]>([
    { id: 'metadata', label: 'Metadata' },
    { id: 'technical', label: 'Technical' },
    { id: 'annotations', label: 'Annotations' },
    {
      id: 'validation',
      label: 'Validation',
      badge: validationIssues.length > 0 ? validationIssues.length : undefined,
      badgeColor: validationResult.errorCount > 0
        ? 'text-nb-red'
        : validationResult.warningCount > 0
          ? 'text-nb-orange'
          : 'text-nb-blue',
    },
  ]);

  // ---------------------------------------------------------------------------
  // Responsive sizing
  // ---------------------------------------------------------------------------

  let panelClass = $derived(
    isMobile
      ? 'fixed inset-0 z-[1100] flex flex-col'
      : cn(
          'border-l flex flex-col h-full shadow-brutal z-30',
          isTablet ? 'w-2/5' : 'w-80',
          fieldMode ? 'bg-nb-black border-nb-black' : 'bg-nb-white border-nb-black/20'
        )
  );
</script>

{#if !resource}
  <!-- Empty state when no resource selected -->
  <div class={cn(
    'flex flex-col items-center justify-center h-full p-8 text-center',
    fieldMode ? 'text-nb-black/30' : 'text-nb-black/40'
  )}>
    <Icon name="info" class="text-3xl mb-3 opacity-30" />
    <p class="text-sm">Select an item to edit its properties</p>
  </div>

{:else}
  <!-- ARIA live region for validation updates -->
  <div role="status" aria-live="polite" aria-atomic="true" class="sr-only">
    {validationIssues.length > 0
      ? `${validationResult.errorCount} errors, ${validationResult.warningCount} warnings found`
      : 'No validation issues'}
  </div>

  <div class={panelClass}>
    <!-- Validation summary (always visible at top when issues exist) -->
    {#if validationIssues.length > 0}
      <div class="px-5 pt-4">
        <ValidationSummary
          issues={validationIssues}
          errorCount={validationResult.errorCount}
          warningCount={validationResult.warningCount}
          infoCount={validationResult.infoCount}
          autoFixableCount={validationResult.autoFixableIssues.length}
          onFixAll={handleFixAll}
          onViewDetails={() => { tab = 'validation'; }}
          {cx}
          {fieldMode}
        />
      </div>
    {/if}

    <!-- Tab bar -->
    <div class={cn(
      'flex px-2 gap-1 border-b-2 shrink-0',
      fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black/20'
    )} role="tablist">
      {#each tabs as tabDef (tabDef.id)}
        <Button
          variant="ghost"
          size="bare"
          onclick={() => { tab = tabDef.id; }}
          class={cn(
            'py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider font-mono transition-nb border-b-2',
            tab === tabDef.id ? cx.active : cx.inactive
          )}
          aria-selected={tab === tabDef.id}
          role="tab"
        >
          <span class="flex items-center gap-1">
            {tabDef.label}
            {#if tabDef.badge !== undefined && tabDef.badge > 0}
              <span class={cn(
                'text-[8px] px-1.5 py-0.5 font-bold',
                tabDef.badgeColor ?? 'text-nb-blue',
                fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
              )}>
                {tabDef.badge}
              </span>
            {/if}
          </span>
        </Button>
      {/each}
    </div>

    <!-- Tab panels -->
    <div class="flex-1 overflow-y-auto p-5 space-y-6">
      {#if tab === 'metadata'}
        <MetadataTabPanel
          {resource}
          {label}
          {summary}
          {language}
          {cx}
          {fieldMode}
          onUpdateResource={onUpdateResource}
          {getDCHint}
          {isLocationField}
          onShowLocationPicker={(picker) => { showLocationPicker = picker; }}
        />
      {/if}

      {#if tab === 'technical'}
        <TechnicalTabPanel
          {resource}
          {cx}
          {fieldMode}
          onUpdateResource={onUpdateResource}
        />
      {/if}

      {#if tab === 'annotations'}
        <AnnotationsTabPanel
          annotations={allAnnotations}
          {language}
          {cx}
          {fieldMode}
          onAddAnnotation={() => {}}
        />
      {/if}

      {#if tab === 'validation'}
        <ValidationTabPanel
          issues={validationIssues}
          onFixIssue={handleFixIssue}
          onFixAll={handleFixAll}
          {cx}
          {fieldMode}
        />
      {/if}
    </div>

    <!-- Close button (mobile only) -->
    {#if isMobile && onClose}
      <div class="p-4 border-t shrink-0">
        <Button variant="ghost" size="sm" onclick={onClose} class="w-full">
          <Icon name="close" class="mr-2" />
          Close
        </Button>
      </div>
    {/if}
  </div>
{/if}
