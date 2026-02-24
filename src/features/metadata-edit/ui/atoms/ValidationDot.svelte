<!--
  ValidationDot — Small 6px colored indicator for field validation status.
  React source: src/features/metadata-edit/ui/atoms/ValidationDot.tsx (46 lines)
  Architecture: Atom (zero state, props-only, Rule 2.F: static config in script module)
-->
<script module lang="ts">
  const COLOR_MAP = { red: 'bg-nb-red', orange: 'bg-nb-orange', yellow: 'bg-nb-yellow' } as const;
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    status: 'pristine' | 'invalid';
    message?: string;
    color?: 'red' | 'orange' | 'yellow';
    class?: string;
    fieldMode?: boolean;
  }

  let { status, message, color = 'red', class: className = '', fieldMode = false }: Props = $props();
</script>

{#if status === 'invalid'}
  <span
    class={cn('inline-block w-1.5 h-1.5 rounded-full shrink-0', COLOR_MAP[color], className)}
    title={message}
    aria-label={message || 'Validation issue'}
  ></span>
{/if}
