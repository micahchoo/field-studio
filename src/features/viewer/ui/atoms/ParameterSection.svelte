<!--
  ParameterSection — Collapsible section header for IIIF parameter groups

  ORIGINAL: src/features/viewer/ui/atoms/ParameterSection.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Groups related controls with an icon, title, and optional description.
  Supports collapsible mode with chevron indicator.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { Snippet } from 'svelte';

  type SectionColor = 'green' | 'blue' | 'orange' | 'purple' | 'yellow';

  interface Props {
    /** Section title */
    label: string;
    /** Material icon name */
    icon?: string;
    /** Color theme for the section */
    color?: SectionColor;
    /** Description text */
    description?: string;
    /** Whether the section can be collapsed */
    collapsible?: boolean;
    /** Whether the section starts open */
    defaultOpen?: boolean;
    /** Field mode flag */
    fieldMode?: boolean;
    /** Optional control element to show in header */
    control?: Snippet;
    /** Section content */
    children: Snippet;
  }

  let {
    label,
    icon,
    color = 'blue',
    description,
    collapsible = true,
    defaultOpen = true,
    fieldMode = false,
    control,
    children,
  }: Props = $props();

  let isOpen = $state(defaultOpen);

  const colorClasses: Record<SectionColor, { light: string; dark: string }> = {
    green:  { light: 'text-nb-green',   dark: 'text-nb-green' },
    blue:   { light: 'text-nb-blue',    dark: 'text-nb-blue' },
    orange: { light: 'text-nb-orange',  dark: 'text-orange-400' },
    purple: { light: 'text-nb-purple',  dark: 'text-nb-purple/60' },
    yellow: { light: 'text-nb-yellow',  dark: 'text-nb-yellow' },
  };

  let labelClass = $derived(
    fieldMode ? colorClasses[color].dark : colorClasses[color].light
  );
  let textClass = $derived(fieldMode ? 'text-white' : 'text-nb-black');
  let mutedTextClass = $derived(fieldMode ? 'text-nb-black/40' : 'text-nb-black/50');
</script>

<section class="space-y-3">
  <div class="flex items-center justify-between">
    <button
      class={cn(
        'text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5',
        labelClass,
        textClass,
        collapsible ? 'cursor-pointer hover:opacity-80 transition-nb' : 'cursor-default'
      )}
      onclick={() => collapsible && (isOpen = !isOpen)}
      aria-expanded={collapsible ? isOpen : undefined}
      disabled={!collapsible}
      type="button"
    >
      {#if icon}
        <span class="material-icons text-xs">{icon}</span>
      {/if}
      {label}
      {#if collapsible}
        <span
          class={cn('material-icons text-xs transition-transform duration-200', isOpen ? 'rotate-0' : '-rotate-90')}
        >
          expand_more
        </span>
      {/if}
    </button>

    {#if control}
      {@render control()}
    {/if}
  </div>

  {#if description}
    <p class="text-[10px] {mutedTextClass}">{description}</p>
  {/if}

  {#if !collapsible || isOpen}
    {@render children()}
  {/if}
</section>
