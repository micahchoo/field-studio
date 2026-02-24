<!--
  PersonaSettings - Settings modal with persona/workbench configuration.
  Sections: affordance overrides (autoSave, baseUrl), metadata complexity slider (3 levels),
  technical transparency toggles (IDs, field contrast), admin mode toggle (localStorage),
  help reset section.

  React source: 276 lines -> ~310 lines Svelte (includes inline HelpResetSection)
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Button } from '@/src/shared/ui/atoms';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { ModalDialog } from '@/src/shared/ui/molecules';
  import type { AppSettings } from '@/src/shared/stores';
  import type { AbstractionLevel as MetadataComplexity } from '@/src/shared/types';
  // STUB: These will be real imports in final implementation
  // import { getVisibleFields, type MetadataComplexity } from '@/src/shared/constants';
  // import { guidance } from '@/src/shared/services/guidanceService';

  // --- Props ---
  interface Props {
    settings: AppSettings;
    onUpdate: (s: Partial<AppSettings>) => void;
    onClose: () => void;
  }

  let { settings, onUpdate, onClose }: Props = $props();

  // --- Types ---
  interface ComplexityLevel {
    level: MetadataComplexity;
    label: string;
    desc: string;
  }

  // --- Static Data ---
  const complexityLevels: ComplexityLevel[] = [
    { level: 'simple', label: 'Essential', desc: 'Label, summary, thumbnail only' },
    { level: 'standard', label: 'Standard', desc: '+ metadata, rights, navDate' },
    { level: 'advanced', label: 'Full Spec', desc: '+ behaviors, services, structures' },
  ];

  // --- Local State ---
  let adminMode: boolean = $state(
    typeof window !== 'undefined'
      ? localStorage.getItem('adminMode') === 'true'
      : false
  );

  // Help reset section state
  let resetConfirm: boolean = $state(false);
  let tipCount: number = $state(0); // STUB: guidance.getSeenCount()

  // --- Derived ---
  let currentComplexityIndex = $derived(
    complexityLevels.findIndex(c => c.level === settings.abstractionLevel)
  );

  // STUB: Replace with real getVisibleFields() call
  let visibleFieldCount = $derived(
    settings.abstractionLevel === 'simple' ? 3 :
    settings.abstractionLevel === 'standard' ? 8 : 15
  );

  // STUB: Replace with real getVisibleFields() call
  let visibleFieldsPreview = $derived<{ key: string; label: string }[]>(
    settings.abstractionLevel === 'simple'
      ? [{ key: 'label', label: 'Label' }, { key: 'summary', label: 'Summary' }, { key: 'thumbnail', label: 'Thumbnail' }]
      : settings.abstractionLevel === 'standard'
        ? [{ key: 'label', label: 'Label' }, { key: 'summary', label: 'Summary' }, { key: 'thumbnail', label: 'Thumbnail' }, { key: 'metadata', label: 'Metadata' }, { key: 'rights', label: 'Rights' }, { key: 'navDate', label: 'NavDate' }, { key: 'requiredStatement', label: 'Required Statement' }, { key: 'provider', label: 'Provider' }]
        : [{ key: 'label', label: 'Label' }, { key: 'summary', label: 'Summary' }, { key: 'thumbnail', label: 'Thumbnail' }, { key: 'metadata', label: 'Metadata' }, { key: 'rights', label: 'Rights' }, { key: 'navDate', label: 'NavDate' }, { key: 'requiredStatement', label: 'Required Statement' }, { key: 'provider', label: 'Provider' }, { key: 'behavior', label: 'Behavior' }]
  );

  let sliderFillWidth = $derived(
    `${((currentComplexityIndex + 1) / complexityLevels.length) * 100}%`
  );

  let sliderThumbLeft = $derived(
    `calc(${(currentComplexityIndex / 2) * 100}% - 8px)`
  );

  // --- Effects ---
  // Escape key to close
  $effect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  // --- Handlers ---
  function toggleAdminMode() {
    adminMode = !adminMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminMode', adminMode ? 'true' : 'false');
    }
  }

  function handleComplexitySlider(e: Event) {
    const target = e.target as HTMLInputElement;
    const idx = parseInt(target.value);
    onUpdate({ abstractionLevel: complexityLevels[idx].level });
  }

  function handleHelpReset() {
    if (resetConfirm) {
      // STUB: guidance.reset();
      tipCount = 0;
      resetConfirm = false;
    } else {
      resetConfirm = true;
      setTimeout(() => { resetConfirm = false; }, 3000);
    }
  }

  function handleResetTooltips() {
    // STUB: guidance.resetTooltips();
    // tipCount = guidance.getSeenCount();
    tipCount = 0;
  }
</script>

<!-- Fullscreen modal overlay -->
<div class="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-nb-black/60 backdrop-blur-md">
  <div class="bg-nb-white w-full max-w-xl shadow-brutal-lg overflow-hidden border border-nb-black/20 animate-in zoom-in-95">

    <!-- Header -->
    <div class="p-6 border-b flex justify-between items-center bg-nb-white">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-nb-black flex items-center justify-center text-white shadow-brutal">
          <Icon name="psychology" />
        </div>
        <div>
          <h2 class="text-lg font-black text-nb-black uppercase tracking-tighter">Studio Persona</h2>
          <p class="text-[10px] font-bold text-nb-black/40 uppercase tracking-widest">Global Workbench Configuration</p>
        </div>
      </div>
      <Button variant="ghost" size="bare" onclick={onClose} class="p-2 hover:bg-nb-cream text-nb-black/40">
        <Icon name="close" />
      </Button>
    </div>

    <!-- Scrollable body -->
    <div class="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">

      <!-- Section: Affordance Overrides -->
      <section>
        <p class="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-4">Affordance Overrides</p>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <span class="text-[9px] font-bold text-nb-black/50 uppercase">Auto-Save Frequency</span>
            <select
              value={settings.autoSaveInterval}
              onchange={(e) => onUpdate({ autoSaveInterval: parseInt((e.target as HTMLSelectElement).value) })}
              class="w-full text-xs font-bold p-2 bg-nb-white border"
            >
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every minute</option>
              <option value={300}>Every 5 minutes</option>
            </select>
          </div>
          <div class="space-y-1">
            <span class="text-[9px] font-bold text-nb-black/50 uppercase">Base Hosting URL</span>
            <input
              value={settings.defaultBaseUrl}
              oninput={(e) => onUpdate({ defaultBaseUrl: (e.target as HTMLInputElement).value })}
              class="w-full text-xs font-bold p-2 bg-nb-white border font-mono"
              placeholder="http://localhost"
            />
          </div>
        </div>
      </section>

      <!-- Section: Metadata Complexity -->
      <section class="pt-6 border-t border-nb-black/10">
        <p class="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-4">Metadata Complexity</p>
        <div class="bg-nb-white border p-4 space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-nb-black/80">Field Visibility Level</span>
            <span class="text-[9px] font-mono bg-iiif-blue/10 text-iiif-blue px-2 py-0.5">{visibleFieldCount} fields</span>
          </div>

          <!-- Slider track -->
          <div class="relative pt-2">
            <!-- Level labels -->
            <div class="flex justify-between mb-2">
              {#each complexityLevels as c}
                <Button variant="ghost" size="bare"
                  onclick={() => onUpdate({ abstractionLevel: c.level })}
                  class={cn(
                    'text-[9px] font-black uppercase tracking-tight transition-nb',
                    settings.abstractionLevel === c.level
                      ? 'text-iiif-blue'
                      : 'text-nb-black/40 hover:text-nb-black/60'
                  )}
                >
                  {c.label}
                </Button>
              {/each}
            </div>

            <!-- Custom slider visual -->
            <div class="relative h-2 bg-nb-cream">
              <div
                class="absolute h-2 bg-gradient-to-r from-iiif-blue to-blue-400 transition-nb"
                style:width={sliderFillWidth}
              ></div>
              <input
                type="range"
                min="0"
                max="2"
                value={currentComplexityIndex}
                oninput={handleComplexitySlider}
                class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Metadata complexity level"
              />
              <!-- Thumb indicator -->
              <div
                class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-nb-white border-2 border-iiif-blue shadow-brutal-sm transition-nb pointer-events-none"
                style:left={sliderThumbLeft}
              ></div>
            </div>

            <!-- Level description -->
            <p class="text-[10px] text-nb-black/50 mt-3 text-center">
              {complexityLevels[currentComplexityIndex]?.desc}
            </p>
          </div>

          <!-- Field preview tags -->
          <div class="pt-3 border-t border-nb-black/20">
            <span class="text-[9px] font-black text-nb-black/40 uppercase block mb-2">Visible Fields Preview</span>
            <div class="flex flex-wrap gap-1">
              {#each visibleFieldsPreview.slice(0, 8) as field (field.key)}
                <span class="text-[8px] font-bold bg-nb-white border px-1.5 py-0.5 text-nb-black/60">
                  {field.label}
                </span>
              {/each}
              {#if visibleFieldCount > 8}
                <span class="text-[8px] font-bold text-nb-black/40">+{visibleFieldCount - 8} more</span>
              {/if}
            </div>
          </div>
        </div>
      </section>

      <!-- Section: Technical Transparency Toggles -->
      <section class="pt-6 border-t border-nb-black/10 space-y-3">
        <div class="flex items-center justify-between p-3 bg-nb-white border">
          <div>
            <span class="text-xs font-bold text-nb-black/80 block">Technical Transparency</span>
            <span class="text-[9px] text-nb-black/40 uppercase font-black">IDs & JSON-LD Visible</span>
          </div>
          <input
            type="checkbox"
            checked={settings.showTechnicalIds}
            onchange={(e) => onUpdate({ showTechnicalIds: (e.target as HTMLInputElement).checked })}
            class="text-iiif-blue w-5 h-5"
          />
        </div>
        <div class="flex items-center justify-between p-3 bg-nb-white border">
          <div>
            <span class="text-xs font-bold text-nb-black/80 block">Field Contrast Mode</span>
            <span class="text-[9px] text-nb-black/40 uppercase font-black">Optimized for outdoor use</span>
          </div>
          <input
            type="checkbox"
            checked={settings.fieldMode}
            onchange={(e) => onUpdate({ fieldMode: (e.target as HTMLInputElement).checked })}
            class="text-iiif-blue w-5 h-5"
          />
        </div>
      </section>

      <!-- Section: Developer Tools / Admin Mode -->
      <section class="pt-6 border-t border-nb-black/10 space-y-3">
        <p class="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-4">Developer Tools</p>
        <div class={cn(
          'flex items-center justify-between p-3 border transition-nb',
          adminMode ? 'bg-nb-purple/5 border-nb-purple/20' : 'bg-nb-white border-nb-black/20'
        )}>
          <div class="flex items-center gap-3">
            <div class={cn('p-2', adminMode ? 'bg-nb-purple text-white' : 'bg-nb-cream text-nb-black/50')}>
              <Icon name="admin_panel_settings" />
            </div>
            <div>
              <span class={cn('text-xs font-bold block', adminMode ? 'text-nb-purple' : 'text-nb-black/80')}>Admin Mode</span>
              <span class="text-[9px] text-nb-black/40 uppercase font-black">Access dependency explorer & tools</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={adminMode}
            onchange={toggleAdminMode}
            class="text-nb-purple w-5 h-5"
          />
        </div>
        {#if adminMode}
          <div class="p-3 bg-nb-purple/5 border border-nb-purple/10">
            <p class="text-[10px] text-nb-purple mb-2">Admin mode is enabled. You can now access:</p>
            <ul class="text-[10px] text-nb-purple space-y-1">
              <li class="flex items-center gap-1">
                <Icon name="account_tree" class="text-xs" />
                Dependency Explorer (Cmd+K &rarr; "Dependency Explorer")
              </li>
            </ul>
          </div>
        {/if}
      </section>

      <!-- Section: Help & Tooltips (inline, was HelpResetSection sub-component) -->
      <section class="pt-6 border-t border-nb-black/10">
        <p class="block text-[10px] font-black text-nb-black/40 uppercase tracking-widest mb-4">Help & Tooltips</p>
        <div class="bg-nb-white border p-4 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-nb-black/80 block">Contextual Help</span>
              <span class="text-[9px] text-nb-black/40">{tipCount} tips dismissed</span>
            </div>
            <div class="flex gap-2">
              <Button variant="ghost" size="bare"
                onclick={handleResetTooltips}
                class="text-[10px] font-bold text-nb-black/50 hover:text-nb-black/80 px-3 py-1.5 hover:bg-nb-cream transition-nb"
              >
                Reset Tooltips
              </Button>
              <Button variant="ghost" size="bare"
                onclick={handleHelpReset}
                class={cn(
                  'text-[10px] font-bold px-3 py-1.5 transition-nb',
                  resetConfirm
                    ? 'bg-nb-red text-white'
                    : 'text-nb-black/50 hover:text-nb-black/80 hover:bg-nb-cream'
                )}
              >
                {resetConfirm ? 'Click to Confirm' : 'Reset All Help'}
              </Button>
            </div>
          </div>
          <p class="text-[10px] text-nb-black/40 leading-relaxed">
            Show all help tooltips and welcome messages again. Useful if you want a refresher on features.
          </p>
        </div>
      </section>
    </div>

    <!-- Footer -->
    <div class="p-6 bg-nb-white border-t flex justify-end">
      <Button variant="ghost" size="bare"
        onclick={onClose}
        class="bg-nb-black text-white px-10 py-3 font-black uppercase tracking-widest text-xs hover:bg-nb-black transition-nb shadow-brutal"
      >
        Commit Environment Profile
      </Button>
    </div>
  </div>
</div>
