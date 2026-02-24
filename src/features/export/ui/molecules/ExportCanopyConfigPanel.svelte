<!--
  ExportCanopyConfigPanel.svelte — Canopy IIIF site configuration
  =================================================================
  Extracted from ExportOptionsPanel. Renders the form for configuring
  a Canopy static site export: title, URL, port, theme colors,
  toggles (dark mode, search), image processing, and featured items.

  FSD Layer: features/export/ui/molecules
-->
<script module lang="ts">
  export const ACCENT_COLORS = [
    'indigo', 'violet', 'purple', 'plum', 'pink', 'tomato',
    'orange', 'amber', 'lime', 'grass', 'teal', 'cyan',
  ] as const;

  export const GRAY_COLORS = [
    'slate', 'gray', 'zinc', 'neutral', 'stone',
    'sand', 'mauve', 'olive', 'sage',
  ] as const;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { CanopyConfig, ImageApiOptions } from '../../model/exportService';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    canopyConfig: CanopyConfig;
    imageApiOptions: ImageApiOptions;
    manifestList: { id: string; label: string }[];
    onCanopyConfigChange: (config: CanopyConfig) => void;
    onImageApiOptionsChange: (options: ImageApiOptions) => void;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    canopyConfig,
    imageApiOptions,
    manifestList,
    onCanopyConfigChange,
    onImageApiOptionsChange,
    cx,
    fieldMode = false,
  }: Props = $props();

  let isDarkMode = $derived(canopyConfig.theme.appearance === 'dark');

  function setDarkMode(checked: boolean) {
    onCanopyConfigChange({ ...canopyConfig, theme: { ...canopyConfig.theme, appearance: checked ? 'dark' : 'light' } });
  }

  function setSearchEnabled(checked: boolean) {
    onCanopyConfigChange({ ...canopyConfig, search: { ...canopyConfig.search, enabled: checked } });
  }

  function toggleFeaturedItem(manifestId: string) {
    const isSelected = canopyConfig.featured.includes(manifestId);
    if (isSelected) {
      onCanopyConfigChange({ ...canopyConfig, featured: canopyConfig.featured.filter(id => id !== manifestId) });
    } else if (canopyConfig.featured.length < 6) {
      onCanopyConfigChange({ ...canopyConfig, featured: [...canopyConfig.featured, manifestId] });
    }
  }
</script>

<div class="space-y-6 animate-in slide-in-from-right-4">
  <div class="text-center mb-6">
    <Icon name="public" class="text-4xl text-iiif-blue mb-2" />
    <h3 class="text-lg font-bold text-nb-black">Canopy Configuration</h3>
    <p class="text-sm text-nb-black/50">Configure your site settings and visual theme</p>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="field-site-title" class="block text-sm font-bold text-nb-black/80 mb-1">Site Title</label>
      <input id="field-site-title" type="text"
        value={canopyConfig.title}
        oninput={(e) => onCanopyConfigChange({ ...canopyConfig, title: e.currentTarget.value })}
        class="w-full border p-2 text-sm" placeholder="My Collection"
      />
    </div>
    <div>
      <label for="field-base-url" class="block text-sm font-bold text-nb-black/80 mb-1">Base URL</label>
      <input id="field-base-url" type="text"
        value={canopyConfig.baseUrl}
        oninput={(e) => onCanopyConfigChange({ ...canopyConfig, baseUrl: e.currentTarget.value })}
        class="w-full border p-2 text-sm" placeholder="Optional (e.g. https://...)"
      />
    </div>
    <div>
      <label for="field-iiif-port" class="block text-sm font-bold text-nb-black/80 mb-1">IIIF Server Port</label>
      <input id="field-iiif-port" type="number"
        value={canopyConfig.port || 8765}
        oninput={(e) => onCanopyConfigChange({ ...canopyConfig, port: parseInt(e.currentTarget.value) || 8765 })}
        class="w-full border p-2 text-sm" min="1024" max="65535" placeholder="8765"
      />
      <p class="text-xs text-nb-black/40 mt-1">Change if port 8765 is in use</p>
    </div>
  </div>

  <!-- Theme Colors -->
  <div>
    <p class="block text-sm font-bold text-nb-black/80 mb-2">Theme Colors</p>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="field-accent-color" class="text-xs text-nb-black/50 block mb-1">Accent Color</label>
        <select id="field-accent-color"
          value={canopyConfig.theme.accentColor}
          onchange={(e) => onCanopyConfigChange({ ...canopyConfig, theme: { ...canopyConfig.theme, accentColor: e.currentTarget.value } })}
          class="w-full border p-2 text-sm capitalize"
        >
          {#each ACCENT_COLORS as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </div>
      <div>
        <label for="field-bg-tone" class="text-xs text-nb-black/50 block mb-1">Background Tone</label>
        <select id="field-bg-tone"
          value={canopyConfig.theme.grayColor}
          onchange={(e) => onCanopyConfigChange({ ...canopyConfig, theme: { ...canopyConfig.theme, grayColor: e.currentTarget.value } })}
          class="w-full border p-2 text-sm capitalize"
        >
          {#each GRAY_COLORS as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <!-- Dark Mode + Search toggles -->
  <div class="flex gap-4">
    <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20 flex-1">
      <input type="checkbox" checked={isDarkMode} onchange={(e) => setDarkMode(e.currentTarget.checked)} class="text-iiif-blue" />
      <span class="text-sm text-nb-black/80">Dark Mode Default</span>
    </label>
    <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20 flex-1">
      <input type="checkbox" checked={canopyConfig.search.enabled} onchange={(e) => setSearchEnabled(e.currentTarget.checked)} class="text-iiif-blue" />
      <span class="text-sm text-nb-black/80">Enable Search</span>
    </label>
  </div>

  <!-- Image Processing Options -->
  <div>
    <p class="block text-sm font-bold text-nb-black/80 mb-2">Image Processing Options</p>
    <div class="grid grid-cols-2 gap-3">
      <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20">
        <input type="checkbox" checked={imageApiOptions.includeWebP} onchange={(e) => onImageApiOptionsChange({ ...imageApiOptions, includeWebP: e.currentTarget.checked })} class="text-iiif-blue" />
        <div><span class="text-sm text-nb-black/80">WebP Format</span><p class="text-[10px] text-nb-black/40">Smaller file sizes</p></div>
      </label>
      <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20">
        <input type="checkbox" checked={imageApiOptions.includeGrayscale} onchange={(e) => onImageApiOptionsChange({ ...imageApiOptions, includeGrayscale: e.currentTarget.checked })} class="text-iiif-blue" />
        <div><span class="text-sm text-nb-black/80">Grayscale</span><p class="text-[10px] text-nb-black/40">Gray quality option</p></div>
      </label>
      <label class="flex items-center gap-2 cursor-pointer bg-nb-white p-3 border border-nb-black/20">
        <input type="checkbox" checked={imageApiOptions.includeSquare} onchange={(e) => onImageApiOptionsChange({ ...imageApiOptions, includeSquare: e.currentTarget.checked })} class="text-iiif-blue" />
        <div><span class="text-sm text-nb-black/80">Square Crops</span><p class="text-[10px] text-nb-black/40">For thumbnails</p></div>
      </label>
      <div class="flex items-center gap-2 bg-nb-white p-3 border border-nb-black/20">
        <div class="flex-1"><span class="text-sm text-nb-black/80">Tile Size</span><p class="text-[10px] text-nb-black/40">Deep zoom tiles</p></div>
        <select value={imageApiOptions.tileSize || 512} onchange={(e) => onImageApiOptionsChange({ ...imageApiOptions, tileSize: parseInt(e.currentTarget.value) })} class="border p-1 text-sm w-20">
          <option value={256}>256</option><option value={512}>512</option><option value={1024}>1024</option>
        </select>
      </div>
    </div>
  </div>

  <!-- Featured Items Picker -->
  {#if manifestList.length > 0}
    <div>
      <p class="block text-sm font-bold text-nb-black/80 mb-2">
        Featured Items <span class="font-normal text-nb-black/40">({canopyConfig.featured.length}/6 selected)</span>
      </p>
      <p class="text-xs text-nb-black/50 mb-3">Select up to 6 manifests to feature on the homepage.</p>
      <div class="max-h-48 overflow-y-auto border border-nb-black/20 divide-y divide-nb-black/10">
        {#each manifestList as manifest (manifest.id)}
          {@const isSelected = canopyConfig.featured.includes(manifest.id)}
          {@const atMax = !isSelected && canopyConfig.featured.length >= 6}
          <label
            class={cn(
              'flex items-center gap-3 p-3 cursor-pointer hover:bg-nb-white transition-nb',
              isSelected ? 'bg-nb-blue/10' : '',
              atMax ? 'opacity-50 cursor-not-allowed' : ''
            )}
          >
            <input type="checkbox" checked={isSelected} disabled={atMax} onchange={() => toggleFeaturedItem(manifest.id)} class="text-iiif-blue" />
            <span class="text-sm text-nb-black/80 truncate flex-1">{manifest.label}</span>
            {#if isSelected}
              <span class="text-xs text-iiif-blue font-medium">#{canopyConfig.featured.indexOf(manifest.id) + 1}</span>
            {/if}
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>
