<!--
  ValidationBadge — Badge displaying validation status (success/warning/error).
  React source: src/features/metadata-edit/ui/atoms/ValidationBadge.tsx (78 lines)
  Architecture: Atom (zero state, props-only, Rule 2.F: static data in script module)
-->
<script module lang="ts">
  export type ValidationStatus = 'success' | 'warning' | 'error';

  const STATUS_CONFIG = {
    success: { icon: 'check_circle', bgColor: 'bg-nb-green/10', fieldBgColor: 'bg-nb-yellow/20', textColor: 'text-nb-green' },
    warning: { icon: 'warning', bgColor: 'bg-nb-orange/10', fieldBgColor: 'bg-nb-yellow/20', textColor: 'text-nb-orange' },
    error:   { icon: 'error', bgColor: 'bg-nb-red/10', fieldBgColor: 'bg-nb-yellow/20', textColor: 'text-nb-red' },
  } as const;
</script>

<script lang="ts">
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    status: ValidationStatus;
    value?: number;
    label?: string;
    icon?: string;
    fieldMode?: boolean;
  }

  let { status, value, label, icon, fieldMode = false }: Props = $props();

  let config = $derived(STATUS_CONFIG[status]);
  let displayIcon = $derived(icon || config.icon);
  let bg = $derived(fieldMode ? config.fieldBgColor : config.bgColor);
</script>

<div class={cn('p-4', bg, config.textColor)}>
  <Icon name={displayIcon} class="text-2xl mb-2" />
  {#if value !== undefined}
    <div class="text-2xl font-bold">{value}</div>
  {/if}
  {#if label}
    <div class="text-xs opacity-75">{label}</div>
  {/if}
</div>
