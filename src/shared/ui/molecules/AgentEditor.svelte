<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from './ViewHeader/types';

  export interface AgentItem {
    id: string;
    type: 'Agent';
    label: Record<string, string[]>;
    homepage?: Array<{ id: string; type: 'Text'; label: Record<string, string[]>; format?: string }>;
    logo?: Array<{ id: string; type: 'Image'; format?: string; width?: number; height?: number }>;
  }

  interface Props {
    value: AgentItem[];
    onChange: (value: AgentItem[]) => void;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
    disabled?: boolean;
  }

  let { value, onChange, cx: _cx, fieldMode = false, disabled = false }: Props = $props();

  let editingIndex = $state<number | null>(null);
  let isAdding = $state(false);

  // Form state
  let formName = $state('');
  let formUri = $state('');
  let formHomepage = $state('');
  let formLogoUrl = $state('');
  let formLogoError = $state(false);

  function getAgentName(agent: AgentItem): string {
    return (
      agent.label?.none?.[0] ??
      agent.label?.en?.[0] ??
      Object.values(agent.label ?? {})[0]?.[0] ??
      'Unknown Provider'
    );
  }

  function openAddForm() {
    formName = '';
    formUri = '';
    formHomepage = '';
    formLogoUrl = '';
    formLogoError = false;
    isAdding = true;
  }

  function openEditForm(index: number) {
    const agent = value[index];
    formName = getAgentName(agent);
    formUri = agent.id ?? '';
    formHomepage = agent.homepage?.[0]?.id ?? '';
    formLogoUrl = agent.logo?.[0]?.id ?? '';
    formLogoError = false;
    editingIndex = index;
  }

  function buildAgent(): AgentItem {
    const agent: AgentItem = {
      id: formUri.trim() || `urn:uuid:${crypto.randomUUID()}`,
      type: 'Agent',
      label: { none: [formName.trim()] },
    };
    if (formHomepage.trim()) {
      agent.homepage = [{ id: formHomepage.trim(), type: 'Text', label: { none: [formName.trim()] }, format: 'text/html' }];
    }
    if (formLogoUrl.trim()) {
      agent.logo = [{ id: formLogoUrl.trim(), type: 'Image', format: 'image/png' }];
    }
    return agent;
  }

  function handleAdd() {
    if (!formName.trim()) return;
    onChange([...value, buildAgent()]);
    isAdding = false;
  }

  function handleUpdate() {
    if (editingIndex === null || !formName.trim()) return;
    const next = [...value];
    next[editingIndex] = buildAgent();
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
      <span class={`material-icons text-sm ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>business</span>
      <span class={`text-xs font-semibold uppercase tracking-wider ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'}`}>
        Provider
      </span>
      {#if value.length > 0}
        <span class={`text-xs ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>({value.length})</span>
      {/if}
    </div>
    {#if !disabled && !isAdding}
      <button
        onclick={openAddForm}
        class="flex items-center p-1 hover:opacity-70 transition-opacity"
        aria-label="Add provider"
        title="Add provider"
      >
        <span class="material-icons text-sm">add</span>
      </button>
    {/if}
  </div>

  <!-- Agent list -->
  {#each value as agent, i}
    {#if editingIndex === i}
      <!-- Edit form -->
      <div class={`p-3 border space-y-3 ${formBorder}`}>
        <div class="space-y-1">
          <label class={`block text-xs font-medium ${labelText}`}>Organization Name <span class="text-nb-red">*</span></label>
          <input bind:value={formName} placeholder="Example Museum" class={inputClass} />
        </div>
        <div class="space-y-1">
          <label class={`block text-xs font-medium ${labelText}`}>URI</label>
          <input type="url" bind:value={formUri} placeholder="https://example.org" class={inputClass} />
        </div>
        <div class="space-y-1">
          <label class={`block text-xs font-medium ${labelText}`}>Homepage URL</label>
          <input type="url" bind:value={formHomepage} placeholder="https://example.org/about" class={inputClass} />
        </div>
        <div class="space-y-1">
          <label class={`block text-xs font-medium ${labelText}`}>Logo URL</label>
          <input
            type="url"
            bind:value={formLogoUrl}
            placeholder="https://example.org/logo.png"
            class={inputClass}
            oninput={() => { formLogoError = false; }}
          />
          {#if formLogoUrl.trim() && !formLogoError}
            <div class={`mt-2 inline-block p-2 border ${fieldMode ? 'border-nb-black/80 bg-nb-black' : 'border-nb-black/20 bg-nb-white'}`}>
              <img
                src={formLogoUrl}
                alt="Logo preview"
                class="h-8 max-w-[120px] object-contain"
                onerror={() => { formLogoError = true; }}
              />
            </div>
          {/if}
          {#if formLogoError}
            <div class="mt-1 text-xs text-nb-red">Could not load logo preview</div>
          {/if}
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <button onclick={() => { editingIndex = null; }} class="text-xs px-3 py-1.5 border hover:opacity-70">Cancel</button>
          <button onclick={handleUpdate} disabled={!formName.trim()} class="text-xs px-3 py-1.5 bg-nb-black text-white hover:opacity-80 disabled:opacity-40">Update</button>
        </div>
      </div>
    {:else}
      <!-- Row -->
      <div class={`flex items-center gap-3 px-3 py-2.5 border ${rowBorder}`}>
        <div class={`shrink-0 w-10 h-10 flex items-center justify-center overflow-hidden ${fieldMode ? 'bg-nb-black/80' : 'bg-nb-cream'}`}>
          {#if agent.logo?.[0]?.id}
            <img src={agent.logo[0].id} alt={`${getAgentName(agent)} logo`} class="w-full h-full object-contain" />
          {:else}
            <span class={`material-icons text-lg ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>business</span>
          {/if}
        </div>
        <div class="flex-1 min-w-0">
          <div class={`text-sm font-medium truncate ${fieldMode ? 'text-white' : 'text-nb-black/80'}`}>{getAgentName(agent)}</div>
          <div class={`text-xs truncate ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>{agent.homepage?.[0]?.id ?? agent.id}</div>
        </div>
        {#if !disabled}
          <div class="flex items-center gap-1 shrink-0">
            <button onclick={() => openEditForm(i)} class="p-1 hover:opacity-70" aria-label="Edit provider" title="Edit provider">
              <span class="material-icons text-sm">edit</span>
            </button>
            <button onclick={() => handleRemove(i)} class="p-1 hover:opacity-70" aria-label="Remove provider" title="Remove provider">
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
        <label class={`block text-xs font-medium ${labelText}`}>Organization Name <span class="text-nb-red">*</span></label>
        <input bind:value={formName} placeholder="Example Museum" class={inputClass} />
      </div>
      <div class="space-y-1">
        <label class={`block text-xs font-medium ${labelText}`}>URI</label>
        <input type="url" bind:value={formUri} placeholder="https://example.org" class={inputClass} />
      </div>
      <div class="space-y-1">
        <label class={`block text-xs font-medium ${labelText}`}>Homepage URL</label>
        <input type="url" bind:value={formHomepage} placeholder="https://example.org/about" class={inputClass} />
      </div>
      <div class="space-y-1">
        <label class={`block text-xs font-medium ${labelText}`}>Logo URL</label>
        <input type="url" bind:value={formLogoUrl} placeholder="https://example.org/logo.png" class={inputClass} oninput={() => { formLogoError = false; }} />
      </div>
      <div class="flex justify-end gap-2 pt-1">
        <button onclick={() => { isAdding = false; }} class="text-xs px-3 py-1.5 border hover:opacity-70">Cancel</button>
        <button onclick={handleAdd} disabled={!formName.trim()} class="text-xs px-3 py-1.5 bg-nb-black text-white hover:opacity-80 disabled:opacity-40">Add</button>
      </div>
    </div>
  {/if}

  <!-- Empty state -->
  {#if value.length === 0 && !isAdding}
    <div class={`text-center py-3 text-xs ${fieldMode ? 'text-nb-black/60' : 'text-nb-black/40'}`}>No provider set</div>
  {/if}
</div>
