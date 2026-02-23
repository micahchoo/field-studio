<!--
  StepConnector - Visual connector line between wizard steps

  ORIGINAL: src/shared/ui/atoms/StepConnector.tsx (46 lines)
  Completed: success color. Incomplete: surface secondary.
  Uses CSS custom properties for full theme support (not hardcoded to 2 themes).
-->
<script lang="ts">
  interface Props {
    completed: boolean;
    width?: string;
    class?: string;
  }

  let { completed, width = 'w-16', class: className = '' }: Props = $props();
</script>

<div
  class="h-0.5 mx-2 {width} {className}"
  style:background-color={completed
    ? 'var(--theme-success-color, #00CC66)'
    : 'var(--theme-surface-secondary, #FFF8E7)'}
></div>
