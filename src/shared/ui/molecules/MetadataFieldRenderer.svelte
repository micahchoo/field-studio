<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import TextArea from '@/src/shared/ui/atoms/TextArea.svelte';
  import Select from '@/src/shared/ui/atoms/Select.svelte';

  export interface MetadataField {
    id: string;
    label: string;
    value: string | string[] | null;
    type?: 'text' | 'textarea' | 'date' | 'url' | 'select' | 'readonly';
    editable?: boolean;
    required?: boolean;
    error?: string;
    helpText?: string;
    group?: string;
    options?: Array<{ value: string; label: string }>;
  }

  interface Props {
    field: MetadataField;
    isEditing: boolean;
    onFieldChange?: (fieldId: string, value: string) => void;
    fieldMode?: boolean;
    cx?: ContextualClassNames;
  }

  let { field, isEditing, onFieldChange, fieldMode = false, cx = {} as ContextualClassNames }: Props = $props();

  function formatValue(value: string | string[] | null, type?: string): string {
    if (value === null || value === undefined) return '\u2014';
    if (Array.isArray(value)) return value.join(', ') || '\u2014';
    if (type === 'date' && value) {
      try {
        const d = new Date(value);
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      } catch {
        return value;
      }
    }
    return value || '\u2014';
  }

  const displayValue = $derived(formatValue(field.value, field.type));
  const hasError = $derived(!!field.error);

  const inputClass = $derived(cn(
    'w-full px-3 py-2 text-sm border transition-nb',
    fieldMode
      ? 'bg-nb-black border-nb-black/80 text-white focus:border-nb-blue'
      : 'bg-nb-white border-nb-black/20 text-nb-black focus:border-nb-blue',
    hasError ? 'border-nb-red' : ''
  ));

  function getStringValue(): string {
    if (Array.isArray(field.value)) return field.value.join(', ');
    return (field.value as string) ?? '';
  }
</script>

{#if isEditing && field.editable}
  {@const fId="field-renderer-"+field.id}
  <div class="space-y-1">
    <label for={fId} class={`text-xs font-medium ${fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'}`}>
      {field.label}
      {#if field.required}<span class="text-nb-red ml-1">*</span>{/if}
    </label>

    {#if field.type === 'textarea'}
      <TextArea id={fId}
        value={getStringValue()}
        oninput={(e) => onFieldChange?.(field.id, (e.target as HTMLTextAreaElement).value)}
        rows={3}
        class="resize-none"
        cx={{ input: inputClass }}
        placeholder={`Enter ${field.label.toLowerCase()}`}
      />
    {:else if field.type === 'select' && field.options}
      <Select id={fId}
        value={getStringValue()}
        onchange={(e) => onFieldChange?.(field.id, (e.target as HTMLSelectElement).value)}
        cx={{ input: inputClass }}
      >
        {#snippet children()}
          <option value="">Select {field.label.toLowerCase()}</option>
          {#each field.options as opt}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        {/snippet}
      </Select>
    {:else}
      <input
        id={fId}
        type={field.type === 'date' ? 'date' : field.type === 'url' ? 'url' : 'text'}
        value={getStringValue()}
        oninput={(e) => onFieldChange?.(field.id, (e.target as HTMLInputElement).value)}
        class={inputClass}
        placeholder={`Enter ${field.label.toLowerCase()}`}
      />
    {/if}

    {#if hasError}
      <p class="text-xs text-nb-red flex items-center gap-1">
        <span class="material-icons text-xs">error</span>
        {field.error}
      </p>
    {/if}

    {#if field.helpText && !hasError}
      <p class={`text-xs ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'}`}>{field.helpText}</p>
    {/if}
  </div>
{:else}
  <!-- Read-only display -->
  <div class="flex flex-col">
    <span class={`text-xs font-medium mb-1 ${fieldMode ? 'text-nb-black/50' : 'text-nb-black/50'}`}>{field.label}</span>
    <span class={`text-sm ${fieldMode ? 'text-white' : 'text-nb-black'}`}>{displayValue}</span>
  </div>
{/if}
