<!--
  SkipLinks - Container for multiple skip navigation links

  Split from SkipLink.tsx (React exported both from one file).
  Renders nav > ul > li for each link.
-->
<script lang="ts">
  import SkipLink from './SkipLink.svelte';

  interface SkipLinkItem {
    targetId: string;
    label: string;
    shortcut?: string;
  }

  interface Props {
    links: SkipLinkItem[];
  }

  let { links }: Props = $props();
</script>

<nav aria-label="Skip links" class="sr-only focus-within:not-sr-only">
  <ul class="fixed top-4 left-4 z-[9999] space-y-2">
    {#each links as link (link.targetId)}
      <li>
        <SkipLink
          targetId={link.targetId}
          label={link.label}
          shortcut={link.shortcut}
        />
      </li>
    {/each}
  </ul>
</nav>
