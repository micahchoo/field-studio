<!--
  KeyboardShortcutsModal.svelte -- Modal overlay listing viewer keyboard shortcuts
  React source: src/features/viewer/ui/molecules/KeyboardShortcutsModal.tsx
  Layer: molecule (FSD features/viewer/ui/molecules)

  Displays a modal dialog with all available keyboard shortcuts organized by
  media type. Static SHORTCUT_GROUPS in script module per Rule 2.F.
  Filters groups based on current mediaType prop.
-->
<script module lang="ts">
  interface ShortcutEntry {
    keys: string[];
    description: string;
  }

  interface ShortcutGroup {
    title: string;
    mediaType: 'image' | 'media' | 'all';
    shortcuts: ShortcutEntry[];
  }

  export const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
      title: 'Navigation',
      mediaType: 'image',
      shortcuts: [
        { keys: ['W', '\u2191'], description: 'Pan up' },
        { keys: ['S', '\u2193'], description: 'Pan down' },
        { keys: ['A', '\u2190'], description: 'Pan left' },
        { keys: ['D', '\u2192'], description: 'Pan right' },
        { keys: ['0'], description: 'Reset view (home)' },
      ],
    },
    {
      title: 'Zoom',
      mediaType: 'image',
      shortcuts: [
        { keys: ['+', '='], description: 'Zoom in' },
        { keys: ['-', '_'], description: 'Zoom out' },
        { keys: ['Double-click'], description: 'Zoom to point' },
        { keys: ['Scroll'], description: 'Zoom in/out' },
      ],
    },
    {
      title: 'Rotation & Flip',
      mediaType: 'image',
      shortcuts: [
        { keys: ['R'], description: 'Rotate clockwise 90\u00B0' },
        { keys: ['Shift', 'R'], description: 'Rotate counter-clockwise 90\u00B0' },
        { keys: ['F'], description: 'Flip horizontally' },
      ],
    },
    {
      title: 'Tools',
      mediaType: 'image',
      shortcuts: [
        { keys: ['A'], description: 'Toggle annotation tool' },
        { keys: ['M'], description: 'Toggle measurement tool' },
        { keys: ['Esc'], description: 'Exit fullscreen / cancel drawing' },
        { keys: ['Ctrl', 'Z'], description: 'Undo last annotation point' },
        { keys: ['Enter'], description: 'Close polygon (when drawing)' },
      ],
    },
    {
      title: 'Playback',
      mediaType: 'media',
      shortcuts: [
        { keys: ['Space', 'K'], description: 'Play / Pause' },
        { keys: ['J'], description: 'Seek backward 5 seconds' },
        { keys: ['L'], description: 'Seek forward 5 seconds' },
        { keys: ['Home'], description: 'Seek to beginning' },
        { keys: ['End'], description: 'Seek to end' },
        { keys: ['0-9'], description: 'Seek to 0%-90%' },
      ],
    },
    {
      title: 'Volume & Speed',
      mediaType: 'media',
      shortcuts: [
        { keys: ['\u2191'], description: 'Volume up' },
        { keys: ['\u2193'], description: 'Volume down' },
        { keys: ['M'], description: 'Toggle mute' },
        { keys: ['<'], description: 'Decrease playback speed' },
        { keys: ['>'], description: 'Increase playback speed' },
      ],
    },
    {
      title: 'General',
      mediaType: 'all',
      shortcuts: [
        { keys: ['?'], description: 'Show / hide this help' },
        { keys: ['Esc'], description: 'Exit fullscreen' },
      ],
    },
  ];
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import ModalDialog from '@/src/shared/ui/molecules/ModalDialog.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';

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
