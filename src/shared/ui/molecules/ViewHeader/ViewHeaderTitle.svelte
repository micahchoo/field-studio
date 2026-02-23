<script lang="ts">
  import type { ContextualClassNames } from './types';

  interface Props {
    icon?: string;
    title: string;
    badge?: string | number;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    children?: import('svelte').Snippet;
  }

  let { icon, title, badge, cx, fieldMode = false, children }: Props = $props();
</script>

<div class="flex items-center min-w-0 gap-2 flex-shrink">
  {#if icon}
    <span class={`material-icons shrink-0 text-sm ${cx.text ?? ''}`}>{icon}</span>
  {/if}
  <h2 class={`truncate text-xs font-bold uppercase tracking-wider font-mono ${cx.text ?? ''}`}>
    {title}
  </h2>
  {#if badge != null}
    <div class={`h-4 w-px shrink-0 ${cx.divider ?? (fieldMode ? 'bg-nb-yellow/40' : 'bg-nb-black/20')}`}></div>
    <span class={`text-[10px] font-black uppercase shrink-0 font-mono ${cx.textMuted ?? (fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40')}`}>
      {badge}
    </span>
  {/if}
  {#if children}{@render children()}{/if}
</div>
