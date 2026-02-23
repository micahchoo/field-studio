<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import TabButtonBase from '../atoms/TabButtonBase.svelte';

  interface Tab {
    id: string;
    label: string;
    icon?: string;
  }

  interface Props {
    tabs: Tab[];
    activeTab?: string;
    cx: ContextualClassNames;
    class?: string;
  }

  let {
    tabs,
    activeTab = $bindable(''),
    cx,
    class: className = ''
  }: Props = $props();

  function handleTabClick(tabId: string) {
    activeTab = tabId;
  }
</script>

<div
  class={cn('flex border-b-2', cx.border || 'border-nb-black', className)}
  role="tablist"
>
  {#each tabs as tab (tab.id)}
    <TabButtonBase
      label={tab.label}
      isActive={activeTab === tab.id}
      onclick={() => handleTabClick(tab.id)}
      icon={tab.icon}
      {cx}
      id="{tab.id}-tab"
    />
  {/each}
</div>
