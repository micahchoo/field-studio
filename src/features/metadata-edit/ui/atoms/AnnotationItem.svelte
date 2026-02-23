<!--
  AnnotationItem — Annotation list item with inline edit capability.
  React source: src/features/metadata-edit/ui/atoms/AnnotationItem.tsx
  Architecture: Atom (internal editText state, props-driven, Rule 5.D: cx + fieldMode)
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFAnnotation } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import { cn } from '@/src/shared/lib/cn';
  import ListItemBase from '@/src/shared/ui/molecules/ListItemBase.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    annotation: IIIFAnnotation;
    language?: string;
    selected?: boolean;
    onclick?: () => void;
    onDelete?: (id: string) => void;
    onEdit?: (id: string, text: string) => void;
    expanded?: boolean;
    cx: ContextualClassNames;
    fieldMode: boolean;
    class?: string;
    showCheckbox?: boolean;
    checked?: boolean;
    onCheckChange?: (checked: boolean) => void;
  }

  let {
    annotation,
    language = 'en',
    selected = false,
    onclick,
    onDelete,
    onEdit,
    expanded = false,
    cx,
    fieldMode,
    class: className = '',
    showCheckbox = false,
    checked = false,
    onCheckChange,
  }: Props = $props();

  let isEditing = $state(false);
  let editText = $state('');

  let bodyText = $derived.by(() => {
    const body = Array.isArray(annotation.body) ? annotation.body[0] : annotation.body;
    if (!body) return '';
    if ('value' in body) return body.value;
    if ('label' in body && body.label) return getIIIFValue(body.label, language);
    return '';
  });

  let motivation = $derived(
    Array.isArray(annotation.motivation) ? annotation.motivation[0] : annotation.motivation
  );

  function startEdit() {
    editText = bodyText;
    isEditing = true;
  }

  function cancelEdit() {
    isEditing = false;
    editText = '';
  }

  function saveEdit() {
    if (onEdit && editText.trim()) {
      onEdit(annotation.id, editText.trim());
    }
    isEditing = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }
</script>

<div class={cn('group', className)}>
  <ListItemBase {selected} {onclick} {cx}>
    {#snippet leading()}
      {#if showCheckbox}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div onclick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            {checked}
            onchange={(e) => onCheckChange?.(e.currentTarget.checked)}
            class="w-4 h-4 accent-nb-orange"
          />
        </div>
      {/if}
      <Icon
        name={motivation === 'commenting' ? 'comment' : motivation === 'tagging' ? 'label' : 'description'}
        class={cn('text-lg', fieldMode ? 'text-nb-yellow/60' : cx.textMuted ?? 'text-nb-black/40')}
      />
    {/snippet}

    {#snippet children()}
      {#if isEditing}
        <div class="flex items-center gap-2" onclick={(e) => e.stopPropagation()} role="presentation">
          <input
            type="text"
            bind:value={editText}
            onkeydown={handleKeydown}
            class={cn(
              'flex-1 px-2 py-1 text-sm border outline-none focus:ring-1',
              fieldMode
                ? 'bg-nb-black text-nb-yellow border-nb-yellow/30 focus:ring-nb-yellow'
                : cx.input ?? 'bg-nb-white text-nb-black border-nb-black/20 focus:ring-nb-blue'
            )}
          />
          <Button variant="ghost" size="bare" onclick={saveEdit} class="p-1">
            {#snippet children()}<Icon name="check" class="text-nb-green text-base" />{/snippet}
          </Button>
          <Button variant="ghost" size="bare" onclick={cancelEdit} class="p-1">
            {#snippet children()}<Icon name="close" class="text-nb-red text-base" />{/snippet}
          </Button>
        </div>
      {:else}
        <div class="flex flex-col gap-0.5">
          <span class={cn(
            'text-sm truncate',
            fieldMode ? 'text-nb-yellow' : cx.text ?? 'text-nb-black'
          )}>
            {bodyText || '(empty annotation)'}
          </span>
          {#if expanded}
            <span class={cn(
              'text-xs font-mono',
              fieldMode ? 'text-nb-yellow/50' : cx.textMuted ?? 'text-nb-black/40'
            )}>
              {motivation} &middot; {annotation.id.split('/').pop()}
            </span>
          {/if}
        </div>
      {/if}
    {/snippet}

    {#snippet trailing()}
      {#if !isEditing}
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {#if onEdit}
            <Button
              variant="ghost"
              size="bare"
              onclick={(e) => { e.stopPropagation(); startEdit(); }}
              title="Edit annotation"
              class="p-1"
            >
              {#snippet children()}<Icon name="edit" class="text-base" />{/snippet}
            </Button>
          {/if}
          {#if onDelete}
            <Button
              variant="ghost"
              size="bare"
              onclick={(e) => { e.stopPropagation(); onDelete(annotation.id); }}
              title="Delete annotation"
              class="p-1"
            >
              {#snippet children()}<Icon name="delete" class={cn('text-base', cx.danger ?? 'text-nb-red')} />{/snippet}
            </Button>
          {/if}
        </div>
      {/if}
    {/snippet}
  </ListItemBase>
</div>
