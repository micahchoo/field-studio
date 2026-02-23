<!--
  MetadataTextField -- Editable text field with hover/focus states for metadata editing.
  Internal atom extracted from MetadataTabPanel React component's TextField sub-component.
  Architecture: Atom (local hover/focus state only, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  /** Format ISO date string to human-readable locale form */
  export function formatDate(isoString: string): string {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  }

  /** Parse human-readable date string back to ISO */
  export function parseDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toISOString();
    } catch {
      return dateString;
    }
  }
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    label: string;
    value: string;
    onchange: (val: string) => void;
    placeholder?: string;
    type?: 'text' | 'textarea' | 'date';
    fieldMode?: boolean;
    readOnly?: boolean;
    hint?: string;
  }

  let {
    label,
    value,
    onchange,
    placeholder = '',
    type = 'text',
    fieldMode = false,
    readOnly = false,
    hint,
  }: Props = $props();

  let isFocused = $state(false);
  let isHovered = $state(false);

  let baseClass = $derived(
    cn(
      'w-full px-3 py-2.5 border text-sm transition-nb',
      readOnly
        ? (fieldMode
            ? 'bg-nb-black/50 text-nb-black/50 border-transparent'
            : 'bg-nb-cream text-nb-black/50 border-transparent')
        : (fieldMode
            ? 'bg-nb-black text-nb-black/10 border-nb-black/70 focus:border-nb-orange focus:ring-2 focus:ring-nb-orange/20'
            : 'bg-nb-white text-nb-black border-nb-black/20 focus:border-nb-orange focus:ring-2 focus:ring-nb-orange/20')
    )
  );

  let labelClass = $derived(
    cn('text-sm font-medium', fieldMode ? 'text-nb-black/20' : 'text-nb-black/70')
  );

  let readOnlyBadgeClass = $derived(
    cn('text-xs px-2 py-0.5', fieldMode ? 'bg-nb-black text-nb-black/50' : 'bg-nb-cream text-nb-black/50')
  );

  let hintClass = $derived(
    cn('mt-1 text-xs', fieldMode ? 'text-nb-black/50' : 'text-nb-black/50')
  );

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    onchange(target.value);
  }

  function handleDateInput(e: Event) {
    const target = e.target as HTMLInputElement;
    onchange(parseDate(target.value));
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="group"
  onmouseenter={() => { isHovered = true; }}
  onmouseleave={() => { isHovered = false; }}
>
  <div class="flex items-center justify-between mb-1.5">
    <label class={labelClass}>
      {label}
    </label>
    {#if readOnly}
      <span class={readOnlyBadgeClass}>
        Read-only
      </span>
    {:else if isHovered || isFocused}
      <span class="text-xs text-nb-orange opacity-0 group-hover:opacity-100 transition-nb">
        <Icon name="edit" class="text-xs inline mr-1" />
        Click to edit
      </span>
    {/if}
  </div>

  {#if type === 'textarea'}
    <textarea
      {value}
      oninput={handleInput}
      {placeholder}
      readonly={readOnly}
      onfocus={() => { isFocused = true; }}
      onblur={() => { isFocused = false; }}
      class={cn(baseClass, 'resize-none min-h-[100px]')}
      rows={4}
    ></textarea>
  {:else if type === 'date'}
    <div class="relative">
      <input
        type="text"
        value={formatDate(value)}
        oninput={handleDateInput}
        placeholder="Select date..."
        readonly={readOnly}
        onfocus={() => { isFocused = true; }}
        onblur={() => { isFocused = false; }}
        class={cn(baseClass, 'pr-10')}
      />
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <Icon name="calendar_today" class={cn('text-sm', fieldMode ? 'text-nb-black/50' : 'text-nb-black/40')} />
      </div>
    </div>
  {:else}
    <input
      type="text"
      {value}
      oninput={handleInput}
      {placeholder}
      readonly={readOnly}
      onfocus={() => { isFocused = true; }}
      onblur={() => { isFocused = false; }}
      class={baseClass}
    />
  {/if}

  {#if hint}
    <p class={hintClass}>{hint}</p>
  {/if}
</div>
