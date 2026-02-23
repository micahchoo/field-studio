<!--
  StatCard — Metric display card with icon and color
  React source: ui/StatsPanel.tsx (lines 161-196)
  Architecture: Atom (zero state, props-only)
-->
<script module lang="ts">
  const CARD_CLASSES: Record<string, string> = {
    blue: 'bg-nb-blue/10 border-nb-blue/30',
    purple: 'bg-nb-purple/10 border-nb-purple/20',
    green: 'bg-nb-green/10 border-nb-green/30',
    orange: 'bg-nb-orange/20 border-nb-orange',
    red: 'bg-nb-red/10 border-nb-red/30',
  };

  const ICON_CLASSES: Record<string, string> = {
    blue: 'text-nb-blue',
    purple: 'text-nb-purple',
    green: 'text-nb-green',
    orange: 'text-nb-orange',
    red: 'text-nb-red',
  };
</script>

<script lang="ts">
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    icon: string;
    label: string;
    value: string | number;
    color: 'blue' | 'purple' | 'green' | 'orange' | 'red';
  }

  let { icon, label, value, color }: Props = $props();
</script>

<div class={cn('p-4 border', CARD_CLASSES[color] ?? CARD_CLASSES.blue)}>
  <div class="flex items-center gap-3">
    <Icon name={icon} class={cn('text-xl', ICON_CLASSES[color] ?? ICON_CLASSES.blue)} />
    <div>
      <div class="text-2xl font-bold text-nb-black/70">{value}</div>
      <div class="text-xs text-nb-black/50">{label}</div>
    </div>
  </div>
</div>
