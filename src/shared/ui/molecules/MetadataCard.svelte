<script lang="ts">
  import MetadataFieldRenderer, { type MetadataField } from './MetadataFieldRenderer.svelte';
  import type { ContextualClassNames } from './ViewHeader/types';

  interface IIIFItemMinimal {
    id: string;
    type: string;
  }

  interface Props {
    item: IIIFItemMinimal;
    fields: MetadataField[];
    thumbnailUrl?: string | null;
    isEditing?: boolean;
    onFieldChange?: (fieldId: string, value: string) => void;
    onSave?: () => void;
    onCancel?: () => void;
    onEdit?: () => void;
    cx: ContextualClassNames;
    t: (key: string) => string;
    fieldMode?: boolean;
    hasErrors?: boolean;
    errorCount?: number;
  }

  let {
    item,
    fields,
    thumbnailUrl,
    isEditing = false,
    onFieldChange,
    onSave,
    onCancel,
    onEdit,
    cx,
    t,
    fieldMode = false,
    hasErrors = false,
    errorCount = 0,
  }: Props = $props();

  const groupLabels: Record<string, { label: string; icon: string }> = {
    basic: { label: 'Basic Information', icon: 'info' },
    technical: { label: 'Technical Details', icon: 'settings' },
    rights: { label: 'Rights & Licensing', icon: 'shield' },
    relations: { label: 'Related Resources', icon: 'link' },
  };

  let expandedGroups = $state<Record<string, boolean>>({
    basic: true,
    technical: false,
    rights: false,
    relations: false,
  });

  function groupFields(group: string) {
    return fields.filter(f => f.group === group);
  }

  function toggleGroup(group: string) {
    expandedGroups = { ...expandedGroups, [group]: !expandedGroups[group] };
  }

  function formatFieldValue(value: string | string[] | null): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value[0] ?? '';
    return value;
  }

  const titleValue = $derived(formatFieldValue(fields.find(f => f.id === 'label')?.value ?? null) || 'Untitled');
  const summaryField = $derived(fields.find(f => f.id === 'summary'));
</script>

<div class={`overflow-hidden ${fieldMode ? 'bg-nb-black border border-nb-black' : 'bg-nb-white border border-nb-black/20 shadow-brutal'}`}>
  <!-- Header with thumbnail and actions -->
  <div class={`p-6 border-b ${fieldMode ? 'border-nb-black' : 'border-nb-black/10'}`}>
    <div class="flex gap-4">
      <!-- Thumbnail -->
      <div class={`w-24 h-24 overflow-hidden shrink-0 ${fieldMode ? 'bg-nb-black' : 'bg-nb-cream'} ${hasErrors ? 'ring-2 ring-red-500' : ''}`}>
        {#if thumbnailUrl}
          <img src={thumbnailUrl} alt="" class="w-full h-full object-cover" />
        {:else}
          <div class="w-full h-full flex items-center justify-center">
            <span class={`material-icons text-2xl ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>image</span>
          </div>
        {/if}
      </div>

      <!-- Title and type -->
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h2 class={`text-lg font-semibold truncate ${fieldMode ? 'text-white' : 'text-nb-black'}`}>{titleValue}</h2>
            <p class={`text-sm mt-1 ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>{t(item.type)}</p>
          </div>

          <!-- Edit/Save actions -->
          <div class="flex gap-2">
            {#if hasErrors}
              <span class={`px-2 py-1 text-xs font-medium ${fieldMode ? 'bg-nb-red/50 text-nb-red' : 'bg-nb-red/20 text-nb-red'}`}>
                {errorCount} {errorCount === 1 ? 'error' : 'errors'}
              </span>
            {/if}

            {#if isEditing}
              <button aria-label="Cancel editing" onclick={onCancel} class="flex items-center gap-1 text-xs px-2 py-1 border hover:opacity-70">
                <span class="material-icons text-sm">close</span> Cancel
              </button>
              <button aria-label="Save changes" onclick={onSave} class="flex items-center gap-1 text-xs px-2 py-1 bg-nb-black text-white hover:opacity-80">
                <span class="material-icons text-sm">check</span> Save
              </button>
            {:else}
              <button aria-label="Edit metadata" onclick={onEdit} class="flex items-center gap-1 text-xs px-2 py-1 border hover:opacity-70">
                <span class="material-icons text-sm">edit</span> Edit
              </button>
            {/if}
          </div>
        </div>

        <!-- Summary -->
        {#if summaryField?.value}
          <p class={`text-sm mt-2 line-clamp-2 ${fieldMode ? 'text-nb-black/30' : 'text-nb-black/60'}`}>
            {formatFieldValue(summaryField.value)}
          </p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Grouped fields -->
  <div class="p-6 space-y-4">
    {#each Object.keys(groupLabels) as group}
      {@const groupFs = groupFields(group)}
      {#if groupFs.length > 0}
        {@const isExpanded = expandedGroups[group]}
        {@const groupInfo = groupLabels[group]}
        <div class={`border overflow-hidden ${fieldMode ? 'border-nb-black' : 'border-nb-black/20'}`}>
          <!-- Group header -->
          <button aria-label="Toggle group"
            onclick={() => toggleGroup(group)}
            class={`w-full flex items-center justify-between px-4 py-3 transition-nb ${fieldMode ? 'hover:bg-nb-black' : 'hover:bg-nb-white'} ${group === 'basic' ? (fieldMode ? 'bg-nb-black/50' : 'bg-nb-white') : ''}`}
          >
            <div class="flex items-center gap-2">
              <span class={`material-icons text-sm ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>{groupInfo.icon}</span>
              <span class={`font-medium ${fieldMode ? 'text-white' : 'text-nb-black'}`}>{groupInfo.label}</span>
              <span class={`text-xs ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>({groupFs.length} fields)</span>
            </div>
            <span class={`material-icons text-sm ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          <!-- Group content -->
          {#if isExpanded}
            <div class={`p-4 space-y-4 ${fieldMode ? 'bg-nb-black/30' : 'bg-nb-cream'}`}>
              {#each groupFs as field}
                <MetadataFieldRenderer {field} {isEditing} {onFieldChange} {fieldMode} />
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  <!-- Footer -->
  <div class={`px-6 py-3 border-t text-xs font-mono ${fieldMode ? 'border-nb-black text-nb-black/60' : 'border-nb-black/10 text-nb-black/40'}`}>
    ID: {item.id}
  </div>
</div>
