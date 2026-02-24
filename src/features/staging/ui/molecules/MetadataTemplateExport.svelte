<!--
  MetadataTemplateExport Molecule

  CSV template export dialog for offline metadata editing.

  Ported from: src/features/staging/ui/molecules/MetadataTemplateExport.tsx (268 lines)

  Architecture:
  - Modal overlay (hand-rolled fixed div)
  - $state for vocabulary, language, includeInstructions
  - $derived for preview (first 5 rows) and totalFiles
  - Uses metadataTemplateService for generation
  - bind:group for radio buttons, bind:value for select, bind:checked for checkbox
  - cx/fieldMode theming
-->
<script lang="ts">
  import type { SourceManifests } from '@/src/entities/collection/model/stagingService';
  import { SUPPORTED_LANGUAGES } from '@/src/shared/constants';
  import {
    downloadMetadataTemplate,
    getVocabularyOptions,
    type MetadataTemplateOptions,
    previewMetadataTemplate,
    type VocabularyOption,
  } from '@/src/shared/services/metadataTemplateService';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Select from '@/src/shared/ui/atoms/Select.svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    /** Manifests to generate template for */
    sourceManifests: SourceManifests;
    /** Close the modal dialog */
    onClose: () => void;
    /** Contextual styles */
    cx?: Partial<ContextualClassNames>;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    sourceManifests,
    onClose,
    cx: cxStyles,
    fieldMode = false,
  }: Props = $props();

  // -- Internal State --
  let vocabulary = $state<VocabularyOption>('both');
  let language = $state('en');
  let includeInstructions = $state(true);

  // -- Constants --
  const vocabularyOptions = getVocabularyOptions();

  // -- Derived --
  let preview = $derived.by(() => {
    const options: MetadataTemplateOptions = {
      vocabulary,
      language,
      includeInstructions,
    };
    return previewMetadataTemplate(sourceManifests, options, 5);
  });

  let totalFiles = $derived(
    sourceManifests.manifests.reduce((sum, m) => sum + m.files.length, 0)
  );

  // -- Handlers --
  function handleDownload() {
    const options: MetadataTemplateOptions = {
      vocabulary,
      language,
      includeInstructions,
    };
    const baseName = `${sourceManifests.rootPath.replace(/[^a-zA-Z0-9-_]/g, '-')}-metadata`;
    downloadMetadataTemplate(sourceManifests, options, baseName);
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    // Only close if clicking directly on the backdrop, not on dialog content
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="fixed inset-0 z-[600] flex items-center justify-center bg-nb-black/60 backdrop-blur-sm p-4"
  onclick={handleBackdropClick}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="bg-nb-white shadow-brutal-lg w-full max-w-3xl max-h-[90vh] flex flex-col"
    onclick={(e) => e.stopPropagation()}
    role="dialog"
    aria-labelledby="template-export-title"
    tabindex="0"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-nb-black/20">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-nb-blue/20 flex items-center justify-center text-nb-blue">
          <Icon name="table_chart" />
        </div>
        <div>
          <h3 id="template-export-title" class="text-lg font-bold text-nb-black">Export Metadata Template</h3>
          <p class="text-[10px] font-bold text-nb-black/40 uppercase tracking-widest">CSV Template for Offline Editing</p>
        </div>
      </div>
      <Button variant="ghost" size="bare"
        onclick={onClose}
        class="p-2 hover:bg-nb-cream text-nb-black/40 hover:text-nb-black/60"
      >
        <Icon name="close" />
      </Button>
    </div>

    <!-- Options -->
    <div class="p-4 border-b border-nb-black/20 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <!-- Vocabulary selection -->
        <div>
          <p class="block text-[10px] font-bold text-nb-black/50 uppercase tracking-wider mb-2">
            Vocabulary
          </p>
          <div class="space-y-2">
            {#each vocabularyOptions as opt (opt.value)}
              <label
                class={cn(
                  'flex items-start gap-3 p-3 border-2 cursor-pointer transition-nb',
                  vocabulary === opt.value
                    ? 'border-nb-blue bg-nb-blue/10'
                    : 'border-nb-black/20 hover:border-nb-black/20'
                )}
              >
                <input
                  type="radio"
                  name="vocabulary"
                  value={opt.value}
                  bind:group={vocabulary}
                  class="mt-0.5"
                />
                <div class="flex-1">
                  <div class="font-medium text-sm text-nb-black/80">
                    {opt.label}
                  </div>
                  <div class="text-[11px] text-nb-black/50 mt-0.5">
                    {opt.description}
                  </div>
                </div>
              </label>
            {/each}
          </div>
        </div>

        <!-- Other options -->
        <div class="space-y-4">
          <!-- Language -->
          <div>
            <label for="field-export-language" class="block text-[10px] font-bold text-nb-black/50 uppercase tracking-wider mb-2">
              Default Language
            </label>
            <Select id="field-export-language"
              bind:value={language}
              class="px-3 py-2 text-sm bg-nb-white border border-nb-black/20 outline-none focus:border-nb-blue"
            >
              {#each SUPPORTED_LANGUAGES as lang (lang.code)}
                <option value={lang.code}>
                  {lang.label} ({lang.code})
                </option>
              {/each}
            </Select>
          </div>

          <!-- Include instructions -->
          <div>
            <label class="flex items-center gap-3 p-3 border border-nb-black/20 cursor-pointer hover:bg-nb-white">
              <input
                type="checkbox"
                bind:checked={includeInstructions}
              />
              <div>
                <div class="font-medium text-sm text-nb-black/80">
                  Include Instructions File
                </div>
                <div class="text-[11px] text-nb-black/50">
                  Download a .txt file explaining each column
                </div>
              </div>
            </label>
          </div>

          <!-- Stats -->
          <div class="p-3 bg-nb-cream">
            <div class="text-[10px] font-bold text-nb-black/50 uppercase tracking-wider mb-2">
              Export Summary
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span class="text-nb-black/50">Manifests:</span>{' '}
                <span class="font-medium text-nb-black/80">
                  {sourceManifests.manifests.length}
                </span>
              </div>
              <div>
                <span class="text-nb-black/50">Files:</span>{' '}
                <span class="font-medium text-nb-black/80">{totalFiles}</span>
              </div>
              <div>
                <span class="text-nb-black/50">CSV rows:</span>{' '}
                <span class="font-medium text-nb-black/80">
                  {totalFiles + 1}
                </span>
              </div>
              <div>
                <span class="text-nb-black/50">Columns:</span>{' '}
                <span class="font-medium text-nb-black/80">
                  {preview[0]?.length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Preview -->
    <div class="flex-1 overflow-hidden p-4">
      <div class="text-[10px] font-bold text-nb-black/50 uppercase tracking-wider mb-2 flex items-center gap-2">
        <Icon name="preview" class="text-sm" />
        Preview (first 5 rows)
      </div>
      <div class="border border-nb-black/20 overflow-auto h-48">
        <table class="w-full text-[11px] border-collapse">
          <thead>
            <tr class="bg-nb-cream sticky top-0">
              {#each (preview[0] ?? []) as header, i (i)}
                <th
                  class="px-3 py-2 text-left font-bold text-nb-black/60 border-b border-nb-black/20 whitespace-nowrap"
                >
                  {header}
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each preview.slice(1) as row, rowIdx (rowIdx)}
              <tr>
                {#each row as cell, cellIdx (cellIdx)}
                  <td
                    class="px-3 py-2 text-nb-black/80 border-b border-nb-black/10 truncate max-w-[150px]"
                    title={cell}
                  >
                    {#if cell}
                      {cell}
                    {:else}
                      <span class="text-nb-black/30 italic">(empty)</span>
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      {#if totalFiles > 5}
        <div class="text-[10px] text-nb-black/40 mt-2 text-center">
          ...and {totalFiles - 5} more rows
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between p-4 border-t border-nb-black/20 bg-nb-white">
      <div class="text-[11px] text-nb-black/50 flex items-center gap-2">
        <Icon name="info" class="text-nb-black/40" />
        Fill in the template and re-import to apply metadata
      </div>
      <div class="flex gap-2">
        <Button variant="ghost" size="sm"
          onclick={onClose}
        >
          Cancel
        </Button>
        <Button variant="primary" size="sm"
          onclick={handleDownload}
        >
          {#snippet icon()}<Icon name="download" />{/snippet}
          Download Template
        </Button>
      </div>
    </div>
  </div>
</div>
