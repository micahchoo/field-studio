<!--
  ContextualHelp.svelte -- Contextual help banner + hover tooltip
  ================================================================
  React source: src/widgets/ContextualHelp/ui/ContextualHelp.tsx (139 lines)

  Architecture:
    - Widget layer: two logical components in the React source:
      1. ContextualHelp (disabled welcome banner -- currently a no-op)
      2. ViewHelp (compact hover-expand help tooltip per view mode)
    - In Svelte, both are combined in this single file using snippets.
    - Reads from WELCOME_MESSAGES constant and guidanceService for seen state.
    - ViewHelp expands on hover/click to show tips for the current mode.

  Props:
    mode            -- Current view mode string (e.g. 'archive', 'viewer', 'boards')
    isInspectorOpen -- Optional flag (unused currently, reserved for layout hints)

  NOTE: The ContextualHelp banner is intentionally DISABLED in the React source.
        Only ViewHelp is active. The banner code is preserved as a commented reference.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import { guidance } from '@/src/shared/services/guidanceService';
  import { WELCOME_MESSAGES } from '@/src/shared/constants/helpContent';

  interface Props {
    mode: string;
    isInspectorOpen?: boolean;
    cx?: ContextualClassNames;
  }

  let {
    mode,
    isInspectorOpen = false,
    cx,
  }: Props = $props();

  // ── Banner state (DISABLED -- same as React source) ──
  // The banner feature was disabled upstream to reduce visual noise.
  // Only shows help if user explicitly asks for it via ? key.
  // Kept here as scaffold for future re-enablement.

  // ── ViewHelp state ──
  let isExpanded = $state(false);

  // Derived: get content for the current mode
  const content = $derived(WELCOME_MESSAGES[mode] ?? null);

  // ── Handlers ──
  function handleToggle() {
    isExpanded = !isExpanded;
  }

  function handleMouseEnter() {
    isExpanded = true;
  }

  function handleMouseLeave() {
    isExpanded = false;
  }
</script>

<!--
  ContextualHelp Banner (DISABLED)
  The banner feature is intentionally disabled in the React source to reduce
  visual noise. It was never enabled for users. The banner would show a brief
  welcome message the first time a user visits each view, but this was deemed
  too intrusive. Only ViewHelp (the compact hover tooltip below) is active.

  To re-enable: wire guidanceService.hasSeen/markSeen, add bannerVisible state,
  and uncomment the banner markup from the React source reference.
-->

<!--
  ViewHelp: Compact help icon that expands to tooltip on hover/click
-->
{#if content}
  <div class="relative">
    <Button
      variant="ghost"
      size="bare"
      onclick={handleToggle}
      class={cn(
        'flex items-center gap-1.5 px-2 py-1 text-xs transition-nb',
        isExpanded
          ? 'bg-nb-blue/20 text-nb-blue'
          : 'text-nb-black/40 hover:text-nb-black/60 hover:bg-nb-cream'
      )}
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
        class="flex items-center gap-1.5"
      >
        <Icon name="help_outline" class="text-sm" />
        {#if isExpanded}
          <span>Help</span>
        {/if}
      </span>
    </Button>

    {#if isExpanded}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class={cn(
          'absolute top-full right-0 mt-1 w-64 shadow-brutal p-3 z-50',
          'animate-in fade-in zoom-in-95',
          cx?.surface || 'bg-nb-white'
        )}
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
      >
        <h4 class={cn('text-xs font-semibold mb-1', cx?.text)}>{content.title}</h4>
        <p class={cn('text-[11px] leading-relaxed mb-2', cx?.textMuted)}>{content.body}</p>
        {#if content.tips && content.tips.length > 0}
          <ul class="space-y-1">
            {#each content.tips as tip (tip)}
              <li class={cn('flex items-start gap-1.5 text-[10px]', cx?.textMuted)}>
                <Icon name="arrow_right" class="text-[10px] text-nb-black/30 mt-0.5" />
                {tip}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
  </div>
{/if}
