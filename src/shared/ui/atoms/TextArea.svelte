<!--
  TextArea - Themed textarea atom
  Matches Input atom API for consistency.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    id?: string;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    rows?: number;
    class?: string;
    cx?: Partial<ContextualClassNames>;
    oninput?: (e: Event) => void;
    onblur?: (e: Event) => void;
  }

  let {
    id,
    value = $bindable(''),
    placeholder,
    disabled = false,
    rows = 3,
    class: className = '',
    cx,
    oninput,
    onblur
  }: Props = $props();

  const inputClass = $derived(cx?.input ?? 'w-full border-2 border-nb-black px-3 py-2 font-mono bg-nb-white');
</script>

<textarea
  {id}
  {placeholder}
  {disabled}
  {rows}
  class="{inputClass} {className}"
  {value}
  {oninput}
  {onblur}
></textarea>
