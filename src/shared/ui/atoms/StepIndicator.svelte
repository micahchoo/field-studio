<!--
  StepIndicator - Step indicator for wizards/multi-step flows

  ORIGINAL: src/shared/ui/atoms/StepIndicator.tsx (83 lines)
  Two variants: 'numbered' (circle with number) and 'simple' (dot).
  Completed shows checkmark via Icon atom.
  Uses CSS custom properties for full theme support.
-->
<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    step: number;
    label: string;
    active: boolean;
    completed: boolean;
    variant?: 'numbered' | 'simple';
    class?: string;
  }

  let { step, label, active, completed, variant = 'numbered', class: className = '' }: Props = $props();

  let circleStyle = $derived.by(() => {
    if (completed) {
      return 'background-color: var(--theme-success-color, #00CC66); color: white';
    }
    if (active) {
      return 'background-color: var(--theme-accent-primary, #0055FF); color: var(--theme-text-inverse, #FFF)';
    }
    return 'background-color: var(--theme-surface-secondary, #FFF8E7); color: var(--theme-text-muted, rgba(0,0,0,0.5))';
  });

  let labelStyle = $derived.by(() => {
    if (completed) return 'color: var(--theme-success-color, #00CC66)';
    if (active) return 'color: var(--theme-text-primary, #000)';
    return 'color: var(--theme-text-muted, rgba(0,0,0,0.4))';
  });

  let dotStyle = $derived.by(() => {
    if (completed) return 'background-color: var(--theme-success-color, #00CC66)';
    if (active) return 'background-color: var(--theme-accent-primary, #0055FF)';
    return 'background-color: var(--theme-surface-secondary, #FFF8E7)';
  });
</script>

{#if variant === 'simple'}
  <div class="flex items-center gap-2 {className}">
    <div class="w-2 h-2" style={dotStyle}></div>
    <span class="text-sm font-medium" style={labelStyle}>{label}</span>
  </div>
{:else}
  <div class="flex items-center gap-2 {className}">
    <div class="w-8 h-8 flex items-center justify-center font-bold text-sm" style={circleStyle}>
      {#if completed}
        <Icon name="check" class="text-sm" />
      {:else}
        {step}
      {/if}
    </div>
    <span class="text-sm font-medium" style={labelStyle}>{label}</span>
  </div>
{/if}
