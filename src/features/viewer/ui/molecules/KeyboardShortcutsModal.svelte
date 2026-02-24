<!--
  KeyboardShortcutsModal.svelte -- Modal overlay listing viewer keyboard shortcuts
  React source: src/features/viewer/ui/molecules/KeyboardShortcutsModal.tsx
  Layer: molecule (FSD features/viewer/ui/molecules)

  Displays a modal dialog with all available keyboard shortcuts organized by
  media type. Shortcut data lives in KeyboardShortcutsModal.constants.ts so it
  can be imported by tests without mounting the component.
  Filters groups based on current mediaType prop.
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import ModalDialog from '@/src/shared/ui/molecules/ModalDialog.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import { SHORTCUT_GROUPS } from './KeyboardShortcutsModal.constants';

  interface Props {
    isOpen: boolean;
    onClose: () => void;
    mediaType?: 'image' | 'video' | 'audio' | 'other';
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    isOpen = $bindable(),
    onClose,
    mediaType = 'image',
    cx,
    fieldMode,
  }: Props = $props();

  let visibleGroups = $derived.by(() => {
    const isMedia = mediaType === 'audio' || mediaType === 'video';
    return SHORTCUT_GROUPS.filter(group => {
      if (group.mediaType === 'all') return true;
      if (group.mediaType === 'image') return mediaType === 'image';
      if (group.mediaType === 'media') return isMedia;
      return false;
    });
  });
</script>

<ModalDialog
  bind:open={isOpen}
  title="Keyboard Shortcuts"
  size="md"
  {onClose}
  {cx}
>
  {#snippet children()}
    <div class="space-y-5">
      {#each visibleGroups as group}
        <div>
          <h3 class={cn(
            'text-xs font-mono uppercase tracking-wider font-bold mb-2',
            fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50'
          )}>
            {group.title}
          </h3>

          <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs font-mono">
            {#each group.shortcuts as shortcut}
              <!-- Key badges -->
              <dt class="flex items-center gap-1">
                {#each shortcut.keys as key, keyIdx}
                  {#if keyIdx > 0}
                    <span class={cn('text-xs', fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/40')}>
                      /
                    </span>
                  {/if}
                  <kbd class={cn(
                    'inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5',
                    'rounded border font-bold text-[10px] leading-none',
                    fieldMode
                      ? 'bg-nb-yellow/20 border-nb-yellow/40 text-nb-yellow'
                      : 'bg-nb-cream border-nb-black/20 text-nb-black'
                  )}>
                    {key}
                  </kbd>
                {/each}
              </dt>

              <!-- Description -->
              <dd class="flex items-center opacity-80">
                {shortcut.description}
              </dd>
            {/each}
          </dl>
        </div>
      {/each}
    </div>
  {/snippet}

  {#snippet footer()}
    <div class={cn('text-center text-sm', fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/50')}>
      Press <kbd class={cn(
        'px-1.5 py-0.5 text-xs font-mono',
        fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-white border border-nb-black/20'
      )}>Esc</kbd> or click outside to close
    </div>
  {/snippet}
</ModalDialog>
