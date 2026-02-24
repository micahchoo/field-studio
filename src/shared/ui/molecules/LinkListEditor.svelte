<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Select from '@/src/shared/ui/atoms/Select.svelte';

  export type LinkResourceType = 'rendering' | 'seeAlso' | 'homepage';

  export interface LinkItem {
    id: string;
    type: string;
    label?: Record<string, string[]>;
    format?: string;
  }

  interface Props {
    value: LinkItem[];
    onChange: (value: LinkItem[]) => void;
    resourceType: LinkResourceType;
    fieldMode?: boolean;
    disabled?: boolean;
    cx?: ContextualClassNames;
  }

  let { value, onChange, resourceType, fieldMode = false, disabled = false, cx = {} as ContextualClassNames }: Props = $props();

  const RESOURCE_CONFIG: Record<LinkResourceType, { title: string; icon: string; defaultType: string; placeholder: string }> = {
    rendering: { title: 'Downloads', icon: 'download', defaultType: 'Text', placeholder: 'https://example.org/resource.pdf' },
    seeAlso: { title: 'See Also', icon: 'open_in_new', defaultType: 'Dataset', placeholder: 'https://example.org/metadata.json' },
    homepage: { title: 'Homepage', icon: 'home', defaultType: 'Text', placeholder: 'https://example.org/about' },
  };

  const FORMAT_PRESETS = [
    { label: 'PDF', value: 'application/pdf' },
    { label: 'HTML', value: 'text/html' },
    { label: 'EPUB', value: 'application/epub+zip' },
    { label: 'JSON', value: 'application/json' },
    { label: 'JSON-LD', value: 'application/ld+json' },
    { label: 'XML', value: 'application/xml' },
    { label: 'CSV', value: 'text/csv' },
    { label: 'Plain Text', value: 'text/plain' },
  ];

  const FORMAT_ICONS: Record<string, string> = {
    'application/pdf': 'picture_as_pdf',
    'text/html': 'language',
    'application/epub+zip': 'menu_book',
    'application/json': 'data_object',
    'application/ld+json': 'data_object',
    'application/xml': 'code',
    'text/csv': 'table_chart',
  };

  const config = $derived(RESOURCE_CONFIG[resourceType]);

  let editingIndex = $state<number | null>(null);
  let isAdding = $state(false);

  // Form state
  let formUrl = $state('');
  let formLabel = $state('');
  let formFormat = $state('');
  let formType = $state('');

  function getLinkLabel(item: LinkItem): string {
    return (
      item.label?.none?.[0] ??
      item.label?.en?.[0] ??
      Object.values(item.label ?? {})[0]?.[0] ??
      'Untitled'
    );
  }

  function getFormatIcon(item: LinkItem): string {
    return FORMAT_ICONS[item.format ?? ''] ?? 'link';
  }

  function openAddForm() {
    formUrl = '';
    formLabel = '';
    formFormat = '';
    formType = config.defaultType;
    isAdding = true;
  }

  function openEditForm(index: number) {
    const item = value[index];
    formUrl = item.id;
    formLabel = getLinkLabel(item);
    formFormat = item.format ?? '';
    formType = item.type;
    editingIndex = index;
  }

  function buildItem(): LinkItem {
    return {
      id: formUrl.trim(),
      type: formType,
      label: formLabel.trim() ? { none: [formLabel.trim()] } : undefined,
      format: formFormat || undefined,
    };
  }

  function handleAdd() {
    if (!formUrl.trim()) return;
    onChange([...value, buildItem()]);
    isAdding = false;
  }

  function handleUpdate() {
    if (editingIndex === null || !formUrl.trim()) return;
    const next = [...value];
    next[editingIndex] = buildItem();
    onChange(next);
    editingIndex = null;
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  const rowBorder = $derived(fieldMode ? 'border-nb-black/80 bg-nb-black/50' : 'border-nb-black/20 bg-nb-white');
  const formBorder = $derived(fieldMode ? 'border-nb-black/60 bg-nb-black' : 'border-nb-black/20 bg-nb-white');
  const labelText = $derived(fieldMode ? 'text-nb-black/40' : 'text-nb-black/60');
  const inputClass = $derived(cn(
    'w-full text-sm border px-2 py-1.5',
    fieldMode ? 'bg-nb-black border-nb-black/60 text-white' : 'bg-nb-white border-nb-black/20 text-nb-black/80'
  ));
</script>

<div class="space-y-2">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-1.5">
      <span class={`material-icons text-sm ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>{config.icon}</span>
      <span class={`text-xs font-semibold uppercase tracking-wider ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>
        {config.title}
      </span>
      {#if value.length > 0}
        <span class={`text-xs ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>({value.length})</span>
      {/if}
    </div>
    {#if !disabled && !isAdding && editingIndex === null}
      <button onclick={openAddForm} class="flex items-center p-1 hover:opacity-70" aria-label={`Add ${config.title.toLowerCase()}`}>
        <span class="material-icons text-sm">add</span>
      </button>
    {/if}
  </div>

  <!-- Link list -->
  {#each value as item, i}
    {#if editingIndex === i}
      <div class={`p-3 border space-y-3 ${formBorder}`}>
        <div class="space-y-1">
          <label for="field-edit-url-{i}" class={`block text-xs font-medium ${labelText}`}>URL <span class="text-nb-red">*</span></label>
          <input id="field-edit-url-{i}" type="url" bind:value={formUrl} placeholder={config.placeholder} class={inputClass} />
        </div>
        <div class="space-y-1">
          <label for="field-edit-label-{i}" class={`block text-xs font-medium ${labelText}`}>Label</label>
          <input id="field-edit-label-{i}" bind:value={formLabel} placeholder="Display name" class={inputClass} />
        </div>
        <div class="flex gap-2">
          <div class="flex-1 space-y-1">
            <label for="field-edit-format-{i}" class={`block text-xs font-medium ${labelText}`}>Format</label>
            <Select id="field-edit-format-{i}" bind:value={formFormat} cx={{ input: inputClass }}>
              {#snippet children()}
                <option value="">Select format...</option>
                {#each FORMAT_PRESETS as p}
                  <option value={p.value}>{p.label}</option>
                {/each}
              {/snippet}
            </Select>
          </div>
          <div class="flex-1 space-y-1">
            <label for="field-edit-type-{i}" class={`block text-xs font-medium ${labelText}`}>Type</label>
            <input id="field-edit-type-{i}" bind:value={formType} placeholder="Text" class={inputClass} />
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button onclick={() => { editingIndex = null; }} class="text-xs px-3 py-1.5 border hover:opacity-70">Cancel</button>
          <button onclick={handleUpdate} disabled={!formUrl.trim()} class="text-xs px-3 py-1.5 bg-nb-black text-white hover:opacity-80 disabled:opacity-40">Update</button>
        </div>
      </div>
    {:else}
      <div class={`flex items-center gap-2 px-3 py-2 border ${rowBorder}`}>
        <span class={`material-icons text-base shrink-0 ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>{getFormatIcon(item)}</span>
        <div class="flex-1 min-w-0">
          <div class={`text-sm font-medium truncate ${fieldMode ? 'text-white' : 'text-nb-black/80'}`}>{getLinkLabel(item)}</div>
          <div class={`text-xs truncate ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>{item.format ?? item.type} — {item.id}</div>
        </div>
        {#if !disabled}
          <div class="flex items-center gap-1 shrink-0">
            <button onclick={() => openEditForm(i)} class="p-1 hover:opacity-70" aria-label="Edit link" title="Edit">
              <span class="material-icons text-sm">edit</span>
            </button>
            <button onclick={() => handleRemove(i)} class="p-1 hover:opacity-70" aria-label="Remove link" title="Remove">
              <span class="material-icons text-sm text-nb-red">close</span>
            </button>
          </div>
        {/if}
      </div>
    {/if}
  {/each}

  <!-- Add form -->
  {#if isAdding}
    <div class={`p-3 border space-y-3 ${formBorder}`}>
      <div class="space-y-1">
        <label for="field-add-url" class={`block text-xs font-medium ${labelText}`}>URL <span class="text-nb-red">*</span></label>
        <input id="field-add-url" type="url" bind:value={formUrl} placeholder={config.placeholder} class={inputClass} />
      </div>
      <div class="space-y-1">
        <label for="field-add-label" class={`block text-xs font-medium ${labelText}`}>Label</label>
        <input id="field-add-label" bind:value={formLabel} placeholder="Display name" class={inputClass} />
      </div>
      <div class="flex gap-2">
        <div class="flex-1 space-y-1">
          <label for="field-add-format" class={`block text-xs font-medium ${labelText}`}>Format</label>
          <Select id="field-add-format" bind:value={formFormat} cx={{ input: inputClass }}>
            {#snippet children()}
              <option value="">Select format...</option>
              {#each FORMAT_PRESETS as p}
                <option value={p.value}>{p.label}</option>
              {/each}
            {/snippet}
          </Select>
        </div>
        <div class="flex-1 space-y-1">
          <label for="field-add-type" class={`block text-xs font-medium ${labelText}`}>Type</label>
          <input id="field-add-type" bind:value={formType} placeholder="Text" class={inputClass} />
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button onclick={() => { isAdding = false; }} class="text-xs px-3 py-1.5 border hover:opacity-70">Cancel</button>
        <button onclick={handleAdd} disabled={!formUrl.trim()} class="text-xs px-3 py-1.5 bg-nb-black text-white hover:opacity-80 disabled:opacity-40">Add</button>
      </div>
    </div>
  {/if}

  <!-- Empty state -->
  {#if value.length === 0 && !isAdding}
    <div class={`text-center py-3 text-xs ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>
      No {config.title.toLowerCase()} links
    </div>
  {/if}
</div>
