<!--
  ExportFormatSelector.svelte — Format selection UI for export wizard
  ====================================================================
  Extracted from ExportDialog organism. Renders the Step 1 format
  selection cards (Canopy, Raw IIIF, OCFL, BagIt, Activity Log)
  with include-assets checkbox and info boxes.

  FSD Layer: features/export/ui/molecules
-->
<script module lang="ts">
  export type ExportFormat =
    | 'raw-iiif'
    | 'canopy'
    | 'ocfl'
    | 'bagit'
    | 'activity-log';
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import FirstTimeHint from '@/src/shared/ui/molecules/FirstTimeHint.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    format: ExportFormat;
    includeAssets: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    onFormatChange: (format: ExportFormat) => void;
    onIncludeAssetsChange: (include: boolean) => void;
  }

  let {
    format,
    includeAssets,
    cx,
    fieldMode = false,
    onFormatChange,
    onIncludeAssetsChange,
  }: Props = $props();
</script>

<div class="space-y-8 animate-in slide-in-from-right-4">
  <FirstTimeHint
    id="export-intro"
    message="Choose how to package your archive. Canopy creates a ready-to-deploy website. Raw IIIF gives you just the JSON files."
    {cx}
    class="mb-4"
  />

  <!-- Web Publishing Formats -->
  <div class="grid grid-cols-2 gap-4" role="radiogroup" aria-labelledby="export-format-label">
    <span id="export-format-label" class="sr-only">Choose Export Format</span>

    <Button
      variant="ghost"
      size="bare"
      role="radio"
      aria-checked={format === 'canopy'}
      class={cn('p-5 border-2 text-left transition-nb relative group', format === 'canopy' ? 'border-iiif-blue bg-nb-blue/10' : 'border-nb-black/10 hover:border-nb-black/20')}
      onclick={() => onFormatChange('canopy')}
    >
      <Icon name="public" class={cn('text-2xl mb-3', format === 'canopy' ? 'text-iiif-blue' : 'text-nb-black/40')} />
      <div class="font-bold text-sm text-nb-black mb-1">Canopy IIIF Site</div>
      <p class="text-[10px] text-nb-black/50 leading-tight">Modern Next.js static site with search, mapping, and themes.</p>
      {#if format === 'canopy'}
        <div class="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle" /></div>
      {/if}
    </Button>

    <Button
      variant="ghost"
      size="bare"
      role="radio"
      aria-checked={format === 'raw-iiif'}
      class={cn('p-5 border-2 text-left transition-nb relative group', format === 'raw-iiif' ? 'border-iiif-blue bg-nb-blue/10' : 'border-nb-black/10 hover:border-nb-black/20')}
      onclick={() => onFormatChange('raw-iiif')}
    >
      <Icon name="code" class={cn('text-2xl mb-3', format === 'raw-iiif' ? 'text-iiif-blue' : 'text-nb-black/40')} />
      <div class="font-bold text-sm text-nb-black mb-1">Raw IIIF</div>
      <p class="text-[10px] text-nb-black/50 leading-tight">JSON documents and assets only.</p>
      {#if format === 'raw-iiif'}
        <div class="absolute top-4 right-4 text-iiif-blue"><Icon name="check_circle" /></div>
      {/if}
    </Button>
  </div>

  <!-- Digital Preservation Formats -->
  <div>
    <h3 class="text-xs font-black text-nb-black/50 uppercase tracking-widest mb-3 flex items-center gap-2">
      <Icon name="archive" class="text-sm" /> Digital Preservation
    </h3>
    <div class="grid grid-cols-2 gap-4">
      <Button
        variant="ghost"
        size="bare"
        role="radio"
        aria-checked={format === 'ocfl'}
        class={cn('p-5 border-2 text-left transition-nb relative group', format === 'ocfl' ? 'border-nb-orange bg-nb-orange/10' : 'border-nb-black/10 hover:border-nb-black/20')}
        onclick={() => onFormatChange('ocfl')}
      >
        <Icon name="inventory_2" class={cn('text-2xl mb-3', format === 'ocfl' ? 'text-nb-orange' : 'text-nb-black/40')} />
        <div class="font-bold text-sm text-nb-black mb-1">OCFL Package</div>
        <p class="text-[10px] text-nb-black/50 leading-tight">Oxford Common File Layout 1.1 with versioning.</p>
        {#if format === 'ocfl'}
          <div class="absolute top-4 right-4 text-nb-orange"><Icon name="check_circle" /></div>
        {/if}
      </Button>

      <Button
        variant="ghost"
        size="bare"
        role="radio"
        aria-checked={format === 'bagit'}
        class={cn('p-5 border-2 text-left transition-nb relative group', format === 'bagit' ? 'border-nb-purple bg-nb-purple/5' : 'border-nb-black/10 hover:border-nb-black/20')}
        onclick={() => onFormatChange('bagit')}
      >
        <Icon name="shopping_bag" class={cn('text-2xl mb-3', format === 'bagit' ? 'text-nb-purple' : 'text-nb-black/40')} />
        <div class="font-bold text-sm text-nb-black mb-1">BagIt Bag</div>
        <p class="text-[10px] text-nb-black/50 leading-tight">RFC 8493 compliant with checksums.</p>
        {#if format === 'bagit'}
          <div class="absolute top-4 right-4 text-nb-purple"><Icon name="check_circle" /></div>
        {/if}
      </Button>
    </div>
  </div>

  <!-- Change Tracking Format -->
  <div>
    <h3 class="text-xs font-black text-nb-black/50 uppercase tracking-widest mb-3 flex items-center gap-2">
      <Icon name="history" class="text-sm" /> Change Tracking
    </h3>
    <Button
      variant="ghost"
      size="bare"
      role="radio"
      aria-checked={format === 'activity-log'}
      class={cn('p-5 border-2 text-left transition-nb relative group w-full', format === 'activity-log' ? 'border-cyan-600 bg-nb-blue/10' : 'border-nb-black/10 hover:border-nb-black/20')}
      onclick={() => onFormatChange('activity-log')}
    >
      <Icon name="sync_alt" class={cn('text-2xl mb-3', format === 'activity-log' ? 'text-nb-blue' : 'text-nb-black/40')} />
      <div class="font-bold text-sm text-nb-black mb-1">Activity Log (Change Discovery)</div>
      <p class="text-[10px] text-nb-black/50 leading-tight">IIIF Change Discovery API 1.0 format. Tracks all create/update/delete operations for sync.</p>
      {#if format === 'activity-log'}
        <div class="absolute top-4 right-4 text-nb-blue"><Icon name="check_circle" /></div>
      {/if}
    </Button>
  </div>

  <!-- Canopy info box -->
  {#if format === 'canopy'}
    <div class="p-4 bg-nb-blue/10 border border-nb-blue/30">
      <div class="flex items-center gap-2 text-nb-blue font-bold text-sm mb-2">
        <Icon name="auto_awesome" /> Plug & Play Compatible
      </div>
      <p class="text-xs text-nb-blue">
        Generates a <code>canopy-export</code> package ready to drop into the Canopy IIIF template.
        Includes <code>canopy.yml</code> configuration and correctly structured IIIF data.
      </p>
    </div>
  {/if}

  <!-- Include Assets checkbox (all formats except canopy) -->
  {#if format !== 'canopy'}
    <label class="flex items-center gap-4 p-5 bg-nb-white border border-nb-black/10 cursor-pointer group hover:bg-nb-cream transition-nb">
      <input
        type="checkbox"
        checked={includeAssets}
        onchange={(e) => onIncludeAssetsChange(e.currentTarget.checked)}
        class="w-6 h-6 text-iiif-blue border-nb-black/20 focus:ring-iiif-blue"
      />
      <div>
        <div class="font-bold text-sm text-nb-black/80">Include Physical Assets</div>
        <div class="text-xs text-nb-black/50">Zip images and media files along with metadata.</div>
      </div>
    </label>
  {/if}
</div>
