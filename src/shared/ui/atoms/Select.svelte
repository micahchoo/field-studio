<!--
  Select - Themed native select atom
  Wraps native <select> with neobrutalist styling.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    id?: string;
    value?: string;
    disabled?: boolean;
    required?: boolean;
    class?: string;
    cx?: Partial<ContextualClassNames>;
    onchange?: (e: Event) => void;
    children: Snippet;
  }

  let {
    id,
    value = $bindable(''),
    disabled = false,
    required = false,
    class: className = '',
    cx,
    onchange,
    children
  }: Props = $props();

  const selectClass = $derived(cx?.input ?? 'w-full border-2 border-nb-black px-3 py-2 font-mono bg-nb-white');
</script>

<select
  {id}
  bind:value
  {disabled}
  {required}
  class="{selectClass} {className}"
  {onchange}
>
  {@render children()}
</select>
