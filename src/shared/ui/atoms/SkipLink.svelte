<!--
  SkipLink - Accessibility skip navigation link

  ORIGINAL: src/shared/ui/atoms/SkipLink.tsx (128 lines)
  Hidden by default, visible on focus (sr-only focus:not-sr-only).
  Click handler: finds target by ID, sets tabindex, focuses, scrolls.
-->
<script lang="ts">
  interface Props {
    targetId: string;
    label?: string;
    shortcut?: string;
    class?: string;
  }

  let { targetId, label = 'Skip to content', shortcut, class: className = '' }: Props = $props();

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus();
      target.scrollIntoView({ block: 'start' });

      // Remove tabindex after focus (for non-interactive elements)
      const interactive = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'];
      if (!interactive.includes(target.tagName)) {
        setTimeout(() => {
          target.removeAttribute('tabindex');
        }, 1000);
      }
    }
  }
</script>

<a
  href="#{targetId}"
  onclick={handleClick}
  class="
    sr-only focus:not-sr-only
    focus:fixed focus:z-[9999] focus:top-2 focus:left-1/2 focus:-translate-x-1/2
    focus:px-4 focus:py-2
    focus:bg-sky-600 focus:text-white
    focus:font-semibold focus:text-sm
    focus:shadow-brutal
    focus:outline-none focus:ring-4 focus:ring-sky-500/50
    focus:flex focus:items-center focus:gap-2
    {className}
  "
>
  <span>{label}</span>
  {#if shortcut}
    <kbd class="px-2 py-0.5 bg-sky-700 text-xs font-mono">
      {shortcut}
    </kbd>
  {/if}
</a>
