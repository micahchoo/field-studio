<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Props {
    label: string;
    onRemove: () => void;
    cx: ContextualClassNames;
    class?: string;
  }

  let { label, onRemove, cx, class: className = '' }: Props = $props();
</script>

<span class={cn(
  'inline-flex items-center gap-1 px-2 py-0.5 border-2 text-xs font-mono',
  cx.accentBadge || 'bg-nb-cream border-nb-black',
  className
)}>
  <span>{label}</span>
  <button
    type="button"
    class="p-0 border-0 bg-transparent cursor-pointer opacity-60 hover:opacity-100 leading-none"
    onclick={onRemove}
    aria-label="Remove {label}"
  >
    <Icon name="close" class="text-xs" />
  </button>
</span>
