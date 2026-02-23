<!--
  BoardOnboarding.svelte -- Template gallery + onboarding for new boards (Organism)
  ==================================================================================
  React source: src/features/board-design/ui/organisms/BoardOnboarding.tsx (474L)

  PURPOSE:
  Addresses "blank canvas syndrome" by presenting a template gallery,
  demo prompt, and quick-start actions. Users either pick a template
  (optionally with item selection via TemplateItemPicker), start blank,
  or browse the archive.

  ARCHITECTURE NOTES:
  - Rule 2.F: TEMPLATES constant array + BoardTemplate/BoardLayoutType types
    exported from <script module> (shared across instances, importable)
  - Local state: hoveredTemplate ($state), showDemoPrompt ($state), pendingTemplate ($state)
  - TemplatePreview is an internal sub-section (inline {#if} blocks)
  - Composes: TemplateItemPicker molecule, inline SVG previews
  - Rule 5.D: receives cx + fieldMode from parent
-->
<script module lang="ts">
  // Rule 2.F: static data + exported types in module scope

  export type BoardLayoutType =
    | 'narrative'
    | 'comparison'
    | 'map'
    | 'timeline'
    | 'storyboard'
    | 'choice-comparison'
    | 'annotation-review'
    | 'book-spread'
    | 'provenance-map'
    | 'scroll-layout';

  export interface BoardTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    previewLayout: BoardLayoutType;
    itemCount: number;
    suggestedItems?: string[];
    /** IIIF behavior to set on export */
    defaultBehavior?: string[];
    /** IIIF viewingDirection to set on export */
    defaultViewingDirection?: string;
    /** Connection type used between items */
    connectionType?: string;
  }

  export const TEMPLATES: BoardTemplate[] = [
    {
      id: 'narrative',
      name: 'Narrative Sequence',
      description: 'Create a presentation-like sequence. Each canvas becomes a slide, exported as an ordered IIIF Manifest.',
      icon: 'auto_stories',
      previewLayout: 'narrative',
      itemCount: 4,
      defaultBehavior: ['individuals'],
      connectionType: 'sequence',
    },
    {
      id: 'comparison',
      name: 'Comparative Analysis',
      description: 'Link items with IIIF comparison annotations. Perfect for before/after, versions, or scholarly analysis.',
      icon: 'compare',
      previewLayout: 'comparison',
      itemCount: 2,
      defaultBehavior: ['individuals'],
      connectionType: 'similarTo',
    },
    {
      id: 'timeline',
      name: 'Timeline',
      description: 'Arrange items chronologically using IIIF navDate. Viewers can navigate by date automatically.',
      icon: 'view_timeline',
      previewLayout: 'timeline',
      itemCount: 5,
      connectionType: 'sequence',
    },
    {
      id: 'map',
      name: 'Geographic Collection',
      description: 'Position items on a map using IIIF navPlace (GeoJSON). Enable geographic browsing of your collection.',
      icon: 'map',
      previewLayout: 'map',
      itemCount: 3,
      connectionType: 'associated',
    },
    {
      id: 'storyboard',
      name: 'Storyboard',
      description: 'Horizontal filmstrip with sequence connections + notes below each frame. Ideal for AV scenes.',
      icon: 'view_carousel',
      previewLayout: 'storyboard',
      itemCount: 4,
      defaultBehavior: ['individuals'],
      connectionType: 'sequence',
    },
    {
      id: 'choice-comparison',
      name: 'Choice Comparison',
      description: 'Side-by-side layout for multispectral/RTI imaging. Shows Choice body alternatives together.',
      icon: 'layers',
      previewLayout: 'choice-comparison',
      itemCount: 3,
      connectionType: 'similarTo',
    },
    {
      id: 'annotation-review',
      name: 'Annotation Review',
      description: 'Canvas in center with annotation layers fanned around it. For specialist review workflows.',
      icon: 'hub',
      previewLayout: 'annotation-review',
      itemCount: 5,
      connectionType: 'references',
    },
    {
      id: 'book-spread',
      name: 'Book Spread',
      description: 'Paired 2-up rows representing page openings. Ideal for paged manuscripts.',
      icon: 'menu_book',
      previewLayout: 'book-spread',
      itemCount: 6,
      defaultBehavior: ['paged'],
      connectionType: 'sequence',
    },
    {
      id: 'provenance-map',
      name: 'Provenance Map',
      description: 'Star layout: manifest center with provider, homepage, seeAlso, rendering fanned around.',
      icon: 'account_tree',
      previewLayout: 'provenance-map',
      itemCount: 5,
      connectionType: 'references',
    },
    {
      id: 'scroll-layout',
      name: 'Scroll Layout',
      description: 'Vertical strip with sequence connections. Mirrors IIIF continuous behavior for scroll objects.',
      icon: 'view_day',
      previewLayout: 'scroll-layout',
      itemCount: 4,
      defaultBehavior: ['continuous'],
      defaultViewingDirection: 'top-to-bottom',
      connectionType: 'sequence',
    },
  ];
</script>

<script lang="ts">
  import type { IIIFItem } from '@/src/shared/types';
  import TemplateItemPicker from '../molecules/TemplateItemPicker.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    /** Called when user selects a template (demo flow) */
    onSelectTemplate: (template: BoardTemplate) => void;
    /** Called when user picks template + items via the picker */
    onSelectTemplateWithItems?: (template: BoardTemplate, items: IIIFItem[]) => void;
    /** Called when user wants to start from scratch */
    onStartBlank: () => void;
    /** Called when user wants to browse archive */
    onBrowseArchive: () => void;
    /** Root item for getting sample items */
    root: IIIFItem | null;
    /** Available archive items for the template item picker */
    availableItems?: IIIFItem[];
    /** Contextual styles */
    cx: {
      surface: string;
      text: string;
      textMuted: string;
      accent: string;
      border: string;
      headerBg: string;
    };
    /** Field mode flag */
    fieldMode: boolean;
  }

  let {
    onSelectTemplate,
    onSelectTemplateWithItems,
    onStartBlank,
    onBrowseArchive,
    root,
    availableItems = [],
    cx,
    fieldMode,
  }: Props = $props();

  // ── Local State ──
  let hoveredTemplate = $state<string | null>(null);
  let showDemoPrompt = $state(false);
  let pendingTemplate = $state<BoardTemplate | null>(null);

  // ── Handlers ──
  function handleTemplateClick(template: BoardTemplate) {
    if (onSelectTemplateWithItems && availableItems.length > 0) {
      pendingTemplate = template;
    } else {
      onSelectTemplate(template);
    }
  }

  function handleDemoConfirm() {
    showDemoPrompt = false;
    onSelectTemplate({ ...TEMPLATES[0], id: 'narrative-demo' });
  }

  function handlePickerConfirm(template: BoardTemplate, items: IIIFItem[]) {
    pendingTemplate = null;
    onSelectTemplateWithItems?.(template, items);
  }
</script>

<div class={cn('h-full flex flex-col', cx.surface)}>

  <!-- Hero Section -->
  <div class="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
    <!-- Board icon -->
    <div class={cn(
      'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
      fieldMode ? 'bg-nb-yellow/20' : 'bg-nb-orange/10',
    )}>
      <span class={cn(
        'material-symbols-outlined text-4xl',
        fieldMode ? 'text-nb-yellow' : 'text-nb-orange',
      )}>dashboard</span>
    </div>

    <!-- Headline -->
    <h1 class={cn('text-3xl font-bold mb-3', cx.text)}>
      Create Visual Stories
    </h1>

    <!-- Value proposition -->
    <p class={cn('text-base max-w-lg mb-8', cx.textMuted)}>
      Arrange IIIF resources on a canvas, draw connections between them,
      and export as standards-compliant IIIF Manifests with linking annotations.
    </p>

    <!-- Primary CTAs -->
    <div class="flex items-center gap-4 mb-4">
      <button
        type="button"
        onclick={() => { showDemoPrompt = true; }}
        class={cn(
          'px-6 py-2.5 font-semibold text-sm rounded transition-colors',
          fieldMode
            ? 'bg-nb-yellow text-nb-black hover:bg-nb-yellow/90'
            : 'bg-nb-orange text-nb-white hover:bg-nb-orange/90',
        )}
      >
        <span class="material-symbols-outlined text-lg align-middle mr-1.5">auto_stories</span>
        Start with Demo
      </button>

      <button
        type="button"
        onclick={onBrowseArchive}
        class={cn(
          'px-6 py-2.5 font-semibold text-sm rounded border-2 transition-colors',
          fieldMode
            ? 'border-nb-yellow text-nb-yellow hover:bg-nb-yellow/10'
            : 'border-nb-black/30 text-nb-black hover:bg-nb-black/5',
        )}
      >
        <span class="material-symbols-outlined text-lg align-middle mr-1.5">collections</span>
        Browse Archive
      </button>
    </div>

    <!-- Blank canvas link -->
    <button
      type="button"
      onclick={onStartBlank}
      class={cn(
        'text-sm underline underline-offset-2 transition-colors',
        fieldMode ? 'text-nb-white/40 hover:text-nb-yellow' : 'text-nb-black/40 hover:text-nb-black',
      )}
    >
      Or start with a blank canvas &rarr;
    </button>
  </div>

  <!-- Template Gallery -->
  <div class={cn('border-t-2 px-8 py-6', cx.border)}>
    <h2 class={cn('text-sm font-semibold uppercase tracking-wider mb-4', cx.textMuted)}>
      Choose a Template
    </h2>

    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {#each TEMPLATES as template (template.id)}
        {@const isHovered = hoveredTemplate === template.id}
        <button
          type="button"
          onclick={() => handleTemplateClick(template)}
          onmouseenter={() => { hoveredTemplate = template.id; }}
          onmouseleave={() => { hoveredTemplate = null; }}
          class={cn(
            'text-left p-4 border-2 rounded transition-all group',
            fieldMode
              ? cn(
                  'border-nb-white/10 bg-nb-black/50',
                  isHovered && 'border-nb-yellow bg-nb-yellow/5',
                )
              : cn(
                  'border-nb-black/10 bg-nb-white',
                  isHovered && 'border-nb-orange/40 shadow-brutal',
                ),
          )}
        >
          <!-- Preview thumbnail -->
          <div class={cn(
            'h-16 mb-3 rounded overflow-hidden flex items-center justify-center',
            fieldMode ? 'bg-nb-white/5' : 'bg-nb-cream/50',
          )}>
            <!-- Inline SVG preview for each layout type -->
            {#if template.previewLayout === 'narrative'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                {#each [0, 1, 2, 3] as i}
                  <rect
                    x={4 + i * 29}
                    y="8"
                    width="24"
                    height="32"
                    rx="2"
                    fill={fieldMode ? '#facc15' : '#f97316'}
                    opacity={0.3 + i * 0.15}
                  />
                  {#if i < 3}
                    <line
                      x1={28 + i * 29}
                      y1="24"
                      x2={33 + i * 29}
                      y2="24"
                      stroke={fieldMode ? '#facc15' : '#f97316'}
                      stroke-width="1.5"
                      opacity="0.5"
                    />
                  {/if}
                {/each}
              </svg>
            {:else if template.previewLayout === 'comparison'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                <rect x="10" y="6" width="42" height="36" rx="2" fill={fieldMode ? '#facc15' : '#3b82f6'} opacity="0.3" />
                <rect x="68" y="6" width="42" height="36" rx="2" fill={fieldMode ? '#facc15' : '#ef4444'} opacity="0.3" />
                <line x1="52" y1="24" x2="68" y2="24" stroke={fieldMode ? '#facc15' : '#a855f7'} stroke-width="2" stroke-dasharray="3,2" />
              </svg>
            {:else if template.previewLayout === 'timeline'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                <line x1="8" y1="24" x2="112" y2="24" stroke={fieldMode ? '#facc15' : '#6b7280'} stroke-width="1" opacity="0.3" />
                {#each [0, 1, 2, 3, 4] as i}
                  <rect
                    x={8 + i * 22}
                    y={i % 2 === 0 ? 8 : 28}
                    width="18"
                    height="12"
                    rx="2"
                    fill={fieldMode ? '#facc15' : '#f97316'}
                    opacity={0.3 + i * 0.1}
                  />
                  <line
                    x1={17 + i * 22}
                    y1={i % 2 === 0 ? 20 : 28}
                    x2={17 + i * 22}
                    y2="24"
                    stroke={fieldMode ? '#facc15' : '#6b7280'}
                    stroke-width="1"
                    opacity="0.5"
                  />
                {/each}
              </svg>
            {:else if template.previewLayout === 'map'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                {#each [{x:25,y:15}, {x:60,y:30}, {x:90,y:12}] as pt, i}
                  <circle cx={pt.x} cy={pt.y} r="8" fill={fieldMode ? '#facc15' : '#22c55e'} opacity={0.3 + i * 0.15} />
                  <circle cx={pt.x} cy={pt.y} r="3" fill={fieldMode ? '#facc15' : '#22c55e'} opacity="0.7" />
                {/each}
                <line x1="25" y1="15" x2="60" y2="30" stroke={fieldMode ? '#facc15' : '#6b7280'} stroke-width="1" stroke-dasharray="2,2" opacity="0.3" />
                <line x1="60" y1="30" x2="90" y2="12" stroke={fieldMode ? '#facc15' : '#6b7280'} stroke-width="1" stroke-dasharray="2,2" opacity="0.3" />
              </svg>
            {:else if template.previewLayout === 'storyboard'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                {#each [0, 1, 2, 3] as i}
                  <rect x={4 + i * 29} y="4" width="24" height="20" rx="2" fill={fieldMode ? '#facc15' : '#f97316'} opacity={0.3 + i * 0.12} />
                  <rect x={6 + i * 29} y="28" width="20" height="6" rx="1" fill={fieldMode ? '#facc15' : '#6b7280'} opacity="0.15" />
                  {#if i < 3}
                    <line x1={28 + i * 29} y1="14" x2={33 + i * 29} y2="14" stroke={fieldMode ? '#facc15' : '#f97316'} stroke-width="1" opacity="0.4" />
                  {/if}
                {/each}
              </svg>
            {:else if template.previewLayout === 'choice-comparison'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                <rect x="8" y="6" width="30" height="36" rx="2" fill={fieldMode ? '#facc15' : '#8b5cf6'} opacity="0.3" />
                <rect x="45" y="6" width="30" height="36" rx="2" fill={fieldMode ? '#facc15' : '#06b6d4'} opacity="0.3" />
                <rect x="82" y="6" width="30" height="36" rx="2" fill={fieldMode ? '#facc15' : '#ec4899'} opacity="0.3" />
                <text x="60" y="46" text-anchor="middle" font-size="6" fill={fieldMode ? '#facc15' : '#6b7280'} opacity="0.5">layers</text>
              </svg>
            {:else if template.previewLayout === 'annotation-review'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                <rect x="40" y="12" width="40" height="24" rx="2" fill={fieldMode ? '#facc15' : '#f97316'} opacity="0.4" />
                {#each [0, 1, 2, 3] as i}
                  {@const angle = (i / 4) * Math.PI * 2 - Math.PI / 2}
                  {@const ox = 60 + Math.cos(angle) * 40}
                  {@const oy = 24 + Math.sin(angle) * 18}
                  <rect x={ox - 8} y={oy - 5} width="16" height="10" rx="1" fill={fieldMode ? '#facc15' : '#a855f7'} opacity="0.3" />
                  <line x1="60" y1="24" x2={ox} y2={oy} stroke={fieldMode ? '#facc15' : '#a855f7'} stroke-width="0.8" opacity="0.3" />
                {/each}
              </svg>
            {:else if template.previewLayout === 'book-spread'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                {#each [0, 1, 2] as row}
                  <rect x="22" y={4 + row * 15} width="34" height="12" rx="1" fill={fieldMode ? '#facc15' : '#f97316'} opacity={0.25 + row * 0.1} />
                  <rect x="64" y={4 + row * 15} width="34" height="12" rx="1" fill={fieldMode ? '#facc15' : '#f97316'} opacity={0.3 + row * 0.1} />
                  <line x1="60" y1={4 + row * 15} x2="60" y2={16 + row * 15} stroke={fieldMode ? '#facc15' : '#6b7280'} stroke-width="0.5" opacity="0.3" />
                {/each}
              </svg>
            {:else if template.previewLayout === 'provenance-map'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                <rect x="44" y="14" width="32" height="20" rx="2" fill={fieldMode ? '#facc15' : '#f97316'} opacity="0.4" />
                {#each [{x:15,y:10}, {x:15,y:34}, {x:105,y:10}, {x:105,y:34}] as pt, i}
                  <rect x={pt.x - 8} y={pt.y - 5} width="16" height="10" rx="1" fill={fieldMode ? '#facc15' : '#22c55e'} opacity="0.3" />
                  <line x1="60" y1="24" x2={pt.x} y2={pt.y} stroke={fieldMode ? '#facc15' : '#6b7280'} stroke-width="0.8" opacity="0.3" />
                {/each}
              </svg>
            {:else if template.previewLayout === 'scroll-layout'}
              <svg viewBox="0 0 120 48" class="w-full h-full p-2">
                {#each [0, 1, 2, 3] as i}
                  <rect x="40" y={2 + i * 11} width="40" height="9" rx="1" fill={fieldMode ? '#facc15' : '#f97316'} opacity={0.25 + i * 0.1} />
                  {#if i < 3}
                    <line x1="60" y1={11 + i * 11} x2="60" y2={13 + i * 11} stroke={fieldMode ? '#facc15' : '#f97316'} stroke-width="1" opacity="0.4" />
                  {/if}
                {/each}
              </svg>
            {/if}
          </div>

          <!-- Template name -->
          <div class={cn('flex items-center gap-2 mb-1', cx.text)}>
            <span class="material-symbols-outlined text-base opacity-60">{template.icon}</span>
            <span class="text-sm font-semibold truncate">{template.name}</span>
          </div>

          <!-- Description -->
          <p class={cn('text-xs line-clamp-2 leading-relaxed', cx.textMuted)}>
            {template.description}
          </p>

          <!-- Hover hint -->
          <div class={cn(
            'mt-2 text-[10px] font-medium uppercase tracking-wider transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0',
            fieldMode ? 'text-nb-yellow' : 'text-nb-orange',
          )}>
            {availableItems.length > 0 && onSelectTemplateWithItems
              ? `Choose items (${template.itemCount})`
              : 'Click to use'}
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Demo Prompt Modal -->
  {#if showDemoPrompt}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nb-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Start with demo"
    >
      <!-- Backdrop click to close -->
      <button
        type="button"
        class="absolute inset-0"
        onclick={() => { showDemoPrompt = false; }}
        aria-label="Close dialog"
        tabindex="-1"
      ></button>

      <div class={cn(
        'max-w-md w-full p-6 relative z-10 border-2',
        fieldMode ? 'bg-nb-black border-nb-white/20' : 'bg-nb-white shadow-brutal border-nb-black/10',
      )}>
        <h3 class={cn('text-lg font-bold mb-2', cx.text)}>Start with Demo</h3>
        <p class={cn('text-sm mb-6', cx.textMuted)}>
          This will create a narrative board with sample content so you can explore
          how connections, templates, and IIIF export work. You can modify or delete
          it at any time.
        </p>
        <div class="flex gap-3 justify-end">
          <button
            type="button"
            onclick={() => { showDemoPrompt = false; }}
            class={cn(
              'px-4 py-2 text-sm font-medium rounded border transition-colors',
              fieldMode
                ? 'border-nb-white/20 text-nb-white/60 hover:text-nb-white'
                : 'border-nb-black/20 text-nb-black/60 hover:text-nb-black',
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onclick={handleDemoConfirm}
            class={cn(
              'px-4 py-2 text-sm font-semibold rounded transition-colors',
              fieldMode
                ? 'bg-nb-yellow text-nb-black hover:bg-nb-yellow/90'
                : 'bg-nb-orange text-nb-white hover:bg-nb-orange/90',
            )}
          >
            Create Demo Board
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Template Item Picker -->
  {#if pendingTemplate && onSelectTemplateWithItems}
    <TemplateItemPicker
      isOpen={!!pendingTemplate}
      onClose={() => { pendingTemplate = null; }}
      template={pendingTemplate}
      {availableItems}
      onConfirm={handlePickerConfirm}
      {cx}
      {fieldMode}
    />
  {/if}
</div>
