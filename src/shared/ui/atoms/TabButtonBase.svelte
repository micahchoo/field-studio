<!--
  TabButtonBase - Universal tab button for panel/tab switching

  ORIGINAL: src/shared/ui/atoms/TabButtonBase.tsx (79 lines)
  Composes Icon atom. Keyboard nav (Enter/Space). role="tab".
  Theme-aware via cx prop — active/inactive styles from theme tokens.
-->
<script lang="ts">
  import Icon from './Icon.svelte';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    label: string;
    isActive: boolean;
    onclick: () => void;
    id?: string;
    icon?: string;
    cx?: Partial<ContextualClassNames>;
    class?: string;
  }

  let { label, isActive, onclick, id, icon, cx, class: className = '' }: Props = $props();

  let activeClass = $derived(
    cx?.active ?? 'text-nb-blue border-b-2 border-nb-blue bg-nb-blue/10'
  );

  let inactiveClass = $derived(
    cx?.inactive ?? 'text-nb-black/50 hover:bg-nb-white'
  );


</script>

<button
  type="button"
  {id}
  {onclick}
  class="flex-1 py-3 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-0 bg-transparent {isActive ? activeClass : inactiveClass} {className}"
  role="tab"
  aria-selected={isActive}
>
  {#if icon}
    <Icon name={icon} class="text-xs" />
  {/if}
  {label}
</button>
