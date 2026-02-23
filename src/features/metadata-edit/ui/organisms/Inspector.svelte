<!--
  Inspector.svelte — Resource Inspector Panel (Svelte 5)
  ======================================================
  Migrated from: src/features/metadata-edit/ui/organisms/Inspector.tsx (427 lines)

  Side panel for inspecting and editing a single IIIF resource.
  Tabs: metadata, annotations, structure, learn, design.
  Includes resizable panel handle, tab persistence, and validation badges.

  Key Svelte 5 migration decisions:
  - React.memo eliminated (Svelte fine-grained reactivity handles this)
  - useResizablePanel -> resizable Svelte action from layout system
  - usePersistedTab -> $state + $effect with localStorage
  - useInspectorValidation -> pure validateResource() with $derived
  - useState/useCallback/useMemo -> $state/$derived/plain functions
  - useEffect for forceTab sync -> $effect
  - useEffect for annotation selection sync -> $effect
-->
<script module lang="ts">
  /** Allowed inspector tabs (Rule 2.F: static data in script module) */
  export const ALLOWED_TABS = ['metadata', 'annotations', 'structure', 'learn', 'design'] as const;
  export type InspectorTab = typeof ALLOWED_TABS[number];

  /** localStorage key for persisted tab selection */
  const TAB_STORAGE_KEY = 'inspector-tab';

  /** Time range for audio/video annotations */
  export interface TimeRange {
    start: number;
    end?: number;
  }

  /** Resource type visual config (inlined from RESOURCE_TYPE_CONFIG) */
  const RESOURCE_TYPE_CONFIG: Record<string, {
    icon: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
  }> = {
    'Collection': { icon: 'folder', colorClass: 'text-amber-600', bgClass: 'bg-amber-100', borderClass: 'border-amber-200' },
    'Manifest':   { icon: 'menu_book', colorClass: 'text-emerald-600', bgClass: 'bg-emerald-100', borderClass: 'border-emerald-200' },
    'Canvas':     { icon: 'crop_original', colorClass: 'text-blue-500', bgClass: 'bg-blue-100', borderClass: 'border-blue-200' },
    'Range':      { icon: 'segment', colorClass: 'text-indigo-500', bgClass: 'bg-indigo-100', borderClass: 'border-indigo-200' },
    'AnnotationPage': { icon: 'layers', colorClass: 'text-purple-500', bgClass: 'bg-purple-100', borderClass: 'border-purple-200' },
    'Annotation': { icon: 'chat_bubble', colorClass: 'text-teal-500', bgClass: 'bg-teal-100', borderClass: 'border-teal-200' },
    'Content':    { icon: 'image', colorClass: 'text-slate-500', bgClass: 'bg-slate-100', borderClass: 'border-slate-200' },
  };

  /** IIIF specification descriptions per resource type */
  const IIIF_SPECS: Record<string, { desc: string; implication: string }> = {
    'Collection': {
      desc: 'The master container for multiple research units. It groups Manifests into a cohesive archive.',
      implication: 'Treats nested items as part of a curated series. This level cannot have its own visual pixels, only child links.',
    },
    'Manifest': {
      desc: 'The primary unit of description. Represents a single physical artifact, document, or field notebook.',
      implication: 'The "Atomic" unit of research. All internal views are considered parts of ONE cohesive physical object.',
    },
    'Canvas': {
      desc: 'A virtual workspace where media is pinned. It defines the coordinates for all your scholarly notes.',
      implication: 'Pins media to a specific coordinate grid. Annotations created here are forever linked to these pixel addresses.',
    },
    'Range': {
      desc: 'A structural division within a manifest, like a chapter or section.',
      implication: 'Provides navigation structure for long or complex objects.',
    },
  };
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { getIIIFValue, isManifest } from '@/src/shared/types';
  import type { IIIFItem, IIIFAnnotation, IIIFCanvas, IIIFManifest } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { PanelLayout } from '@/src/shared/ui/layout';
  import { resizable } from '@/src/shared/ui/layout';
  import type { ResizableParams } from '@/src/shared/ui/layout';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import MuseumLabel from '@/src/shared/ui/molecules/MuseumLabel.svelte';
  import { validateResource, fixIssue, fixAll } from '../../lib/inspectorValidation';
  import type { ValidationIssue } from '../../lib/inspectorValidation';

  // Sub-components: MetadataFieldsPanel exists as stub; others are TODO placeholders
  // <!-- @migration: not yet migrated -->
  // import MetadataFieldsPanel from '../molecules/MetadataFieldsPanel.svelte';
  // import AnnotationCreateForm from '../atoms/AnnotationCreateForm.svelte';
  // import AnnotationsTabPanel from '../molecules/AnnotationsTabPanel.svelte';
  // import StructureTabPanel from '../molecules/StructureTabPanel.svelte';
  // import ShareButton from '../atoms/ShareButton.svelte';

  // ---------------------------------------------------------------------------
  // Props
  // ---------------------------------------------------------------------------

  interface Props {
    resource: IIIFItem | null;
    onUpdateResource: (r: Partial<IIIFItem>) => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
    language?: string;
    abstractionLevel?: 'simple' | 'standard' | 'advanced';
    visible: boolean;
    onClose: () => void;
    isMobile?: boolean;
    /** Optional custom design tab content snippet */
    designTab?: import('svelte').Snippet;
    annotations?: IIIFAnnotation[];
    canvases?: IIIFCanvas[];
    annotationModeActive?: boolean;
    annotationDrawingState?: {
      pointCount: number;
      isDrawing: boolean;
      canSave: boolean;
    };
    annotationText?: string;
    onAnnotationTextChange?: (text: string) => void;
    annotationMotivation?: 'commenting' | 'tagging' | 'describing';
    onAnnotationMotivationChange?: (motivation: 'commenting' | 'tagging' | 'describing') => void;
    onSaveAnnotation?: () => void;
    onClearAnnotation?: () => void;
    mediaType?: 'image' | 'video' | 'audio' | 'other';
    timeRange?: TimeRange | null;
    currentPlaybackTime?: number;
    forceTab?: InspectorTab;
    onDeleteAnnotation?: (annotationId: string) => void;
    onEditAnnotation?: (annotationId: string, newText: string) => void;
    onStartAnnotation?: () => void;
    selectedAnnotationId?: string | null;
  }

  let {
    resource,
    onUpdateResource,
    cx,
    fieldMode,
    language = 'en',
    abstractionLevel = 'standard',
    visible,
    onClose,
    isMobile = false,
    designTab,
    annotations = [],
    canvases = [],
    annotationModeActive = false,
    annotationDrawingState,
    annotationText = '',
    onAnnotationTextChange,
    annotationMotivation = 'commenting',
    onAnnotationMotivationChange,
    onSaveAnnotation,
    onClearAnnotation,
    mediaType,
    timeRange,
    currentPlaybackTime,
    forceTab,
    onDeleteAnnotation,
    onEditAnnotation,
    onStartAnnotation,
    selectedAnnotationId: selectedAnnotationIdProp,
  }: Props = $props();

  // ---------------------------------------------------------------------------
  // Tab persistence (localStorage + $state)
  // ---------------------------------------------------------------------------

  function loadPersistedTab(): InspectorTab {
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY);
      if (stored && ALLOWED_TABS.includes(stored as InspectorTab)) {
        return stored as InspectorTab;
      }
    } catch { /* localStorage unavailable */ }
    return 'metadata';
  }

  let tab = $state<InspectorTab>(loadPersistedTab());

  // Persist tab selection
  $effect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch { /* ignore */ }
  });

  // Force tab when annotation mode is activated (or external forceTab changes)
  $effect(() => {
    if (forceTab && ALLOWED_TABS.includes(forceTab)) {
      tab = forceTab;
    }
  });

  // ---------------------------------------------------------------------------
  // Internal annotation selection state
  // ---------------------------------------------------------------------------

  let selectedAnnotationId = $state<string | null>(null);

  // Sync external annotation selection (from viewer click) to internal state
  $effect(() => {
    if (selectedAnnotationIdProp !== undefined) {
      selectedAnnotationId = selectedAnnotationIdProp;
    }
  });

  function toggleAnnotationSelection(annotationId: string) {
    selectedAnnotationId = selectedAnnotationId === annotationId ? null : annotationId;
  }

  // ---------------------------------------------------------------------------
  // Validation (pure computation via $derived)
  // ---------------------------------------------------------------------------

  let validationResult = $derived(
    resource ? validateResource(resource, resource.type) : { issues: [], errorCount: 0, warningCount: 0, infoCount: 0, autoFixableIssues: [], isValid: true }
  );

  let validationIssues = $derived(validationResult.issues);

  function getFieldValidation(fieldName: string) {
    const fieldIssues = validationIssues.filter(i => i.field === fieldName);
    if (fieldIssues.length === 0) return { status: 'pristine' as const };
    const firstIssue = fieldIssues[0];
    return {
      status: 'invalid' as const,
      message: firstIssue.title,
      fix: firstIssue.autoFixable ? () => {
        const fixed = fixIssue(resource!, firstIssue);
        if (fixed) onUpdateResource(fixed);
      } : undefined,
    };
  }

  let labelValidation = $derived(getFieldValidation('label'));
  let summaryValidation = $derived(getFieldValidation('summary'));

  function handleFixIssue(issue: ValidationIssue) {
    if (!resource) return;
    const fixed = fixIssue(resource, issue);
    if (fixed) onUpdateResource(fixed);
  }

  function handleFixAll() {
    if (!resource) return;
    const fixed = fixAll(resource, validationResult.autoFixableIssues);
    if (fixed) onUpdateResource(fixed);
  }

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------

  let config = $derived(
    resource ? (RESOURCE_TYPE_CONFIG[resource.type] || RESOURCE_TYPE_CONFIG['Content']) : RESOURCE_TYPE_CONFIG['Content']
  );

  let spec = $derived(resource ? IIIF_SPECS[resource.type] : undefined);

  let label = $derived(
    resource ? getIIIFValue(resource.label, language) || '' : ''
  );

  let summary = $derived(
    resource ? getIIIFValue(resource.summary, language) || '' : ''
  );

  // Determine available tabs
  let availableTabs = $derived.by((): InspectorTab[] => {
    const tabs: InspectorTab[] = ['metadata', 'annotations'];
    if (resource && isManifest(resource)) tabs.push('structure');
    tabs.push('learn');
    if (designTab) tabs.push('design');
    return tabs;
  });

  // Tab badge computation
  function getTabBadge(tabName: string): { count?: number; dotColor?: string } {
    switch (tabName) {
      case 'metadata': {
        const errorCount = validationIssues.filter(i => i.severity === 'error').length;
        if (errorCount > 0) return { count: errorCount, dotColor: 'bg-nb-red' };
        if (validationIssues.length > 0) return { count: validationIssues.length };
        return {};
      }
      case 'annotations':
        return annotations.length > 0 ? { count: annotations.length } : {};
      case 'structure': {
        const rangeCount = resource && isManifest(resource)
          ? (resource as IIIFManifest).structures?.length || 0
          : 0;
        return rangeCount > 0 ? { count: rangeCount } : {};
      }
      default:
        return {};
    }
  }

  // ---------------------------------------------------------------------------
  // Resizable panel config
  // ---------------------------------------------------------------------------

  let resizableParams: ResizableParams = {
    id: 'inspector',
    size: 320,
    min: 280,
    max: 480,
    direction: 'horizontal',
  };

  // Track resize state for visual indicator
  let isResizing = $state(false);

  // ---------------------------------------------------------------------------
  // Styling
  // ---------------------------------------------------------------------------

  let inspectorStyles = $derived(
    isMobile
      ? cn(
          'fixed inset-0 z-[1100] flex flex-col animate-slide-in-right',
          fieldMode ? 'bg-nb-black' : 'bg-nb-white'
        )
      : cn(
          'border-l-2 flex flex-col h-full z-30 animate-slide-in-right shrink-0 relative panel-fixed inspector-panel',
          fieldMode ? 'bg-nb-black border-l-nb-yellow/30' : 'bg-nb-white border-l-nb-black/20'
        )
  );
</script>

{#if visible && resource}
  <aside
    class={inspectorStyles}
    use:resizable={isMobile ? undefined : resizableParams}
    aria-label="Resource Inspector"
  >
    <PanelLayout bodyClass={cn('p-4 space-y-4 custom-scrollbar', cx.pageBg)}>
      {#snippet header()}
        <!-- Title bar -- unified StatusBar style -->
        <div class={cn(
          'h-header-compact flex items-center justify-between px-3',
          fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
        )}>
          <div class="flex items-center gap-2">
            <Icon name={config.icon} class={cn('text-sm', fieldMode ? 'text-nb-yellow' : 'text-nb-black')} />
            <span class={cn(
              'text-xs font-bold uppercase tracking-wider font-mono',
              fieldMode ? 'text-nb-yellow' : 'text-nb-black'
            )}>
              Inspector
            </span>
          </div>
          <div class="flex items-center gap-2">
            <!-- TODO: migrate ShareButton -->
            <!-- <ShareButton item={resource} fieldMode={fieldMode} /> -->
            <Button variant="ghost" size="bare"
              aria-label="Close Inspector"
              onclick={onClose}
              class={cn('p-2', fieldMode ? 'text-nb-yellow/60 hover:text-nb-yellow' : 'text-nb-black/40 hover:text-nb-black')}
            >
              <Icon name="close" />
            </Button>
          </div>
        </div>

        <!-- Tabs -- sub-header style -->
        <div
          role="tablist"
          aria-label="Inspector tabs"
          class={cn(
            'flex px-2 gap-1 border-b-2 shrink-0',
            fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black/20'
          )}
        >
          {#each availableTabs as tabName (tabName)}
            {@const badge = getTabBadge(tabName)}
            <Button variant="ghost" size="bare"
              class={cn(
                'py-2.5 px-3 text-nb-caption font-bold uppercase tracking-wider font-mono transition-nb border-b-2',
                tab === tabName ? cx.active : cx.inactive
              )}
              onclick={() => { tab = tabName; }}
              aria-selected={tab === tabName}
              role="tab"
            >
              <span class="flex items-center justify-center gap-1">
                {tabName}
                {#if badge.count !== undefined && badge.count > 0}
                  <span class={cn(
                    'text-[8px] px-1.5 py-0.5',
                    fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
                  )}>
                    {badge.count}
                  </span>
                {/if}
                {#if badge.dotColor}
                  <span class={cn('w-1.5 h-1.5 rounded-full shrink-0', badge.dotColor)} />
                {/if}
                {#if tabName === 'annotations' && annotationModeActive}
                  <span class={cn(
                    'w-1.5 h-1.5 animate-pulse ml-1',
                    fieldMode ? 'bg-nb-yellow' : 'bg-nb-blue'
                  )} />
                {/if}
              </span>
            </Button>
          {/each}
        </div>
      {/snippet}

      {#snippet body()}
        <!-- Metadata Tab -->
        {#if tab === 'metadata'}
          <!-- TODO: migrate MetadataFieldsPanel -->
          <div role="tabpanel" class="space-y-4">
            <div class={cn('p-3 border text-xs', fieldMode ? 'border-nb-yellow/30 text-nb-yellow/60' : 'border-nb-black/10 text-nb-black/50')}>
              MetadataFieldsPanel placeholder -- pending migration.
              Resource: {resource.type} "{label}"
              {#if validationIssues.length > 0}
                <div class="mt-2">
                  {validationIssues.length} validation issue{validationIssues.length === 1 ? '' : 's'}
                  {#if validationResult.autoFixableIssues.length > 0}
                    ({validationResult.autoFixableIssues.length} auto-fixable)
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Annotations Tab -->
        {#if tab === 'annotations'}
          <div role="tabpanel" class="space-y-4">
            {#if annotationModeActive}
              <!-- TODO: migrate AnnotationCreateForm -->
              <div class={cn('p-3 border text-xs', fieldMode ? 'border-nb-yellow/30 text-nb-yellow/60' : 'border-nb-black/10 text-nb-black/50')}>
                AnnotationCreateForm placeholder -- pending migration.
                {#if mediaType}Media type: {mediaType}{/if}
                {#if annotationDrawingState?.canSave}
                  <div class="mt-1">Ready to save annotation.</div>
                {/if}
              </div>
            {/if}

            <!-- TODO: migrate AnnotationsTabPanel -->
            <div class={cn('p-3 border text-xs', fieldMode ? 'border-nb-yellow/30 text-nb-yellow/60' : 'border-nb-black/10 text-nb-black/50')}>
              AnnotationsTabPanel placeholder -- pending migration.
              {annotations.length} annotation{annotations.length === 1 ? '' : 's'}
              {#if onStartAnnotation}
                <div class="mt-2">
                  <Button variant="ghost" size="bare"
                    onclick={onStartAnnotation}
                    class={cn('text-xs underline', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')}
                  >
                    + Add annotation
                  </Button>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Structure Tab -->
        {#if tab === 'structure' && resource && isManifest(resource)}
          <div role="tabpanel">
            <!-- TODO: migrate StructureTabPanel -->
            <div class={cn('p-3 border text-xs', fieldMode ? 'border-nb-yellow/30 text-nb-yellow/60' : 'border-nb-black/10 text-nb-black/50')}>
              StructureTabPanel placeholder -- pending migration.
              {(resource as IIIFManifest).structures?.length || 0} range{((resource as IIIFManifest).structures?.length || 0) === 1 ? '' : 's'}
            </div>
          </div>
        {/if}

        <!-- Learn Tab -->
        {#if tab === 'learn' && spec}
          <div role="tabpanel" class="space-y-4">
            <div class={cn(
              'border p-4',
              fieldMode ? 'bg-nb-black border-nb-black' : cn(config.bgClass, config.borderClass)
            )}>
              <h3 class={cn(
                'text-sm font-bold uppercase mb-2 flex items-center gap-2',
                fieldMode ? 'text-nb-yellow' : config.colorClass
              )}>
                <Icon name={config.icon} class="text-xs" />
                {resource.type} Model
              </h3>
              <p class={cn(
                'text-xs leading-relaxed font-medium mb-3',
                fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/60'
              )}>
                {spec.desc}
              </p>
            </div>
            <MuseumLabel title="Archival Implication" type={fieldMode ? 'spec' : 'exhibit'}>
              {spec.implication}
            </MuseumLabel>
          </div>
        {/if}

        <!-- Design Tab -->
        {#if tab === 'design' && designTab}
          <div role="tabpanel">
            {@render designTab()}
          </div>
        {/if}
      {/snippet}
    </PanelLayout>

    <!-- Resize Handle - Desktop Only -->
    {#if !isMobile}
      <div
        data-resize-handle
        class={cn(
          'absolute left-0 top-0 bottom-0 w-1 z-30 group',
          'cursor-col-resize',
          'transition-nb',
          'hover:bg-nb-black/20',
          isResizing && (fieldMode ? 'bg-nb-yellow/30' : 'bg-iiif-blue/30')
        )}
        onpointerdown={() => { isResizing = true; }}
        onpointerup={() => { isResizing = false; }}
      >
        <div
          class={cn(
            'absolute left-0 top-1/2 -translate-y-1/2',
            'w-1 h-12',
            'transition-nb',
            'opacity-0 group-hover:opacity-100 group-focus:opacity-100',
            isResizing
              ? (fieldMode ? 'bg-nb-yellow opacity-100' : 'bg-iiif-blue opacity-100')
              : (fieldMode ? 'bg-nb-yellow/60 group-hover:bg-nb-yellow' : 'bg-nb-black/40 group-hover:bg-iiif-blue')
          )}
        />
      </div>
    {/if}
  </aside>
{/if}
