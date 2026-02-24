<!--
  RangeInput - Themed range input atom
  Thin wrapper for native <input type="range">.
  Atoms are the correct FSD layer for native HTML elements.
-->
<script lang="ts">
  interface Props {
    min?: number;
    max?: number;
    value?: number;
    step?: number;
    disabled?: boolean;
    class?: string;
    oninput?: (e: Event) => void;
    'aria-label'?: string;
  }

  let {
    min = 0,
    max = 100,
    value = $bindable(50),
    step = 1,
    disabled = false,
    class: className = '',
    oninput,
    ...rest
  }: Props = $props();
</script>

<input
  type="range"
  {min}
  {max}
  bind:value
  {step}
  {disabled}
  class={className}
  {oninput}
  {...rest}
/>
