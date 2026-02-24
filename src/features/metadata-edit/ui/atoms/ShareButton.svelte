<!--
  ShareButton — IIIF Content State sharing dropdown with clipboard + drag support.
  React source: src/features/metadata-edit/ui/atoms/ShareButton.tsx (439 lines)
  Architecture: Atom (internal menu + clipboard state, Rule 5.D: fieldMode, Rule 2.F: static types)
-->
<script module lang="ts">
  import type { IIIFItem } from '@/src/shared/types';

  export interface ShareButtonProps {
    item: IIIFItem | null;
    manifestId?: string;
    selectedRegion?: { x: number; y: number; w: number; h: number } | null;
    currentTime?: { start?: number; end?: number } | null;
    annotationId?: string | null;
    fieldMode?: boolean;
    size?: 'sm' | 'md' | 'lg';
  }
</script>

<script lang="ts">
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { getIIIFValue } from '@/src/shared/types';
  import { PATTERNS, SPACING, TOUCH_TARGETS } from '@/src/shared/config/design-tokens';
  import { cn } from '@/src/shared/lib/cn';

  let {
    item,
    manifestId,
    selectedRegion = null,
    currentTime = null,
    annotationId = null,
    fieldMode = false,
    size = 'md',
  }: ShareButtonProps = $props();

  // --- Stubs until shared services are migrated ---
  const contentStateService = {
    copyLink: async (_v: unknown) => {
      await navigator.clipboard.writeText(String((_v as Record<string, unknown>).canvasId || ''));
      return true;
    },
    generateEmbedCode: (v: unknown, _opts: unknown) =>
      `<iframe src="${(v as Record<string, unknown>).canvasId}"></iframe>`,
    createContentState: (v: unknown) => v,
    generateLink: (base: string, _v: unknown) => base,
    setDragData: (dt: DataTransfer, v: unknown) => {
      dt.setData('text/plain', JSON.stringify(v));
    },
  };

  function showToast(msg: string, _type: string) {
    console.log(`[toast] ${msg}`);
  }

  // --- State ---
  let showMenu = $state(false);
  let copied = $state<string | null>(null);
  let menuEl: HTMLDivElement | undefined = $state();
  let copiedTimer: ReturnType<typeof setTimeout> | undefined;

  // --- Outside click handler ---
  $effect(() => {
    if (!showMenu) return;

    function handleOutsideClick(e: MouseEvent) {
      if (menuEl && !menuEl.contains(e.target as Node)) {
        showMenu = false;
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  });

  // --- Helpers ---
  function buildContentState() {
    return contentStateService.createContentState({
      canvasId: item?.id,
      manifestId: manifestId ?? item?._parentId,
      region: selectedRegion,
      time: currentTime,
      annotationId,
    });
  }

  function setCopiedFeedback(key: string) {
    copied = key;
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copied = null;
    }, 2000);
  }

  async function handleCopyViewLink() {
    try {
      const state = buildContentState();
      const link = contentStateService.generateLink(window.location.origin, state);
      await navigator.clipboard.writeText(link);
      setCopiedFeedback('view-link');
      showToast('View link copied', 'success');
    } catch {
      showToast('Failed to copy link', 'error');
    }
  }

  async function handleCopyCanvasLink() {
    try {
      const state = buildContentState();
      await contentStateService.copyLink(state);
      setCopiedFeedback('canvas-link');
      showToast('Canvas link copied', 'success');
    } catch {
      showToast('Failed to copy link', 'error');
    }
  }

  async function handleCopyEmbed() {
    try {
      const state = buildContentState();
      const embed = contentStateService.generateEmbedCode(state, { width: 800, height: 600 });
      await navigator.clipboard.writeText(embed);
      setCopiedFeedback('embed');
      showToast('Embed code copied', 'success');
    } catch {
      showToast('Failed to copy embed code', 'error');
    }
  }

  async function handleCopyContentState() {
    try {
      const state = buildContentState();
      await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopiedFeedback('content-state');
      showToast('Content State JSON copied', 'success');
    } catch {
      showToast('Failed to copy JSON', 'error');
    }
  }

  async function handleNativeShare() {
    const itemLabel = getIIIFValue(item?.label) || 'IIIF Resource';
    const state = buildContentState();
    const link = contentStateService.generateLink(window.location.origin, state);

    if (navigator.share) {
      try {
        await navigator.share({ title: itemLabel, url: link });
      } catch {
        // User cancelled or share failed — silently ignore
      }
    } else {
      await navigator.clipboard.writeText(link);
      setCopiedFeedback('share');
      showToast('Link copied (sharing not supported)', 'info');
    }
  }

  function handleDragStart(e: DragEvent) {
    if (!e.dataTransfer || !item) return;
    const state = buildContentState();
    contentStateService.setDragData(e.dataTransfer, state);
    e.dataTransfer.effectAllowed = 'copy';
  }

  // --- Field mode: simple share button (native share or copy) ---
  async function handleFieldShare() {
    await handleNativeShare();
  }

  // --- Derived ---
  let buttonSize = $derived(
    size === 'sm' ? 'sm' as const : size === 'lg' ? 'lg' as const : 'base' as const
  );

  let isDisabled = $derived(!item);

  let menuClasses = $derived(
    cn(
      'absolute right-0 top-full mt-1 z-50 min-w-[220px] py-1 border-2',
      fieldMode
        ? 'bg-nb-black border-nb-yellow text-nb-yellow'
        : 'bg-nb-white border-nb-black text-nb-black',
      'shadow-[4px_4px_0_0_rgba(0,0,0,0.2)]'
    )
  );

  let menuItemBase = $derived(
    cn(
      'flex items-center gap-2 w-full px-3 py-2 text-sm font-mono text-left transition-colors duration-100',
      fieldMode
        ? 'hover:bg-nb-yellow/10'
        : 'hover:bg-nb-cream'
    )
  );

  // Menu item definitions for iteration
  const menuItems = [
    { key: 'view-link',     icon: 'link',         label: 'Copy View Link',         action: handleCopyViewLink },
    { key: 'canvas-link',   icon: 'image',        label: 'Copy Canvas Link',       action: handleCopyCanvasLink },
    { key: 'embed',         icon: 'code',         label: 'Copy Embed Code',        action: handleCopyEmbed },
    { key: 'content-state', icon: 'data_object',  label: 'Copy Content State JSON', action: handleCopyContentState },
    { key: 'share',         icon: 'share',        label: 'Share via...',           action: handleNativeShare },
  ] as const;
</script>

{#if fieldMode}
  <!-- Field mode: single share button -->
  <Button
    variant="ghost"
    size={buttonSize}
    disabled={isDisabled}
    onclick={handleFieldShare}
    aria-label="Share"
    class={cn(
      'font-mono uppercase tracking-wider',
      fieldMode && 'text-nb-yellow'
    )}
    draggable={!isDisabled ? 'true' : undefined}
    ondragstart={handleDragStart}
  >
    {#snippet icon()}
      <Icon name="share" class="text-base" />
    {/snippet}
    {#snippet children()}
      Share
    {/snippet}
  </Button>
{:else}
  <!-- Desktop mode: dropdown menu -->
  <div class="relative inline-block" bind:this={menuEl}>
    <Button
      variant="secondary"
      size={buttonSize}
      disabled={isDisabled}
      onclick={() => showMenu = !showMenu}
      aria-label="Share options"
      aria-expanded={showMenu}
      aria-haspopup="true"
      class="font-mono uppercase tracking-wider"
      draggable={!isDisabled ? 'true' : undefined}
      ondragstart={handleDragStart}
    >
      {#snippet icon()}
        <Icon name="share" class="text-base" />
      {/snippet}
      {#snippet children()}
        Share
      {/snippet}
    </Button>

    {#if showMenu}
      <div
        class={menuClasses}
        role="menu"
        aria-label="Share options"
      >
        {#each menuItems as menuItem (menuItem.key)}
          <button
            type="button"
            class={menuItemBase}
            role="menuitem"
            aria-label={menuItem.label}
            onclick={() => { menuItem.action(); }}
          >
            <Icon
              name={copied === menuItem.key ? 'check' : menuItem.icon}
              class={cn(
                'text-base',
                copied === menuItem.key && 'text-nb-green'
              )}
            />
            <span class="flex-1">
              {copied === menuItem.key ? 'Copied!' : menuItem.label}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
