<script module lang="ts">
  export const VARIANT_STYLES = {
    success: 'bg-green-100 text-green-800 border-green-400',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-400',
    error: 'bg-red-100 text-red-800 border-red-400',
    info: 'bg-blue-100 text-blue-800 border-blue-400',
    neutral: 'bg-gray-100 text-gray-800 border-gray-400',
  } as const;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    label: string;
    variant: keyof typeof VARIANT_STYLES;
    icon?: string;
    class?: string;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { label, variant, icon, class: className = '', cx = {} as ContextualClassNames, fieldMode = false }: Props = $props();
</script>

<span class={cn(
  'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono border-2',
  VARIANT_STYLES[variant],
  className
)}>
  {#if icon}<Icon name={icon} class="text-xs" />{/if}
  {label}
</span>
