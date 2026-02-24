<!--
  ViewerModals -- Modal dialogs for workbench, search, and keyboard shortcuts

  LAYER: molecule
  FSD: features/viewer/ui/molecules

  Renders three modal overlays used by the viewer:
  - Workbench modal (IIIF URL configuration)
  - Search panel modal
  - Keyboard shortcuts help modal with media-type-specific shortcuts
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { MediaType } from '../organisms/viewerViewHelpers';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    showWorkbench: boolean;
    showSearchPanel: boolean;
    showKeyboardHelp: boolean;
    mediaType: MediaType;
    onCloseWorkbench: () => void;
    onCloseSearchPanel: () => void;
    onCloseKeyboardHelp: () => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    t: (key: string) => string;
  }

  let {
    showWorkbench, showSearchPanel, showKeyboardHelp, mediaType,
    onCloseWorkbench, onCloseSearchPanel, onCloseKeyboardHelp,
    cx, fieldMode = false, t,
  }: Props = $props();

  let modalBg = $derived(cn(
    'rounded-lg border-4 p-4',
    fieldMode ? 'bg-nb-black border-nb-yellow text-nb-yellow' : 'bg-nb-white border-nb-black text-nb-black'
  ));
  let closeClass = $derived(cn(
    'mt-4 px-3 py-1 rounded border-2 text-xs font-mono uppercase',
    cx.iconButton, fieldMode ? 'border-nb-yellow' : 'border-nb-black'
  ));
</script>

{#if showWorkbench}
  <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-label="Viewer workbench">
    <div class={cn(modalBg, 'w-96 max-h-[80vh] overflow-y-auto')}>
      <h2 class="font-mono text-sm uppercase tracking-wider font-bold mb-4">{t('Workbench')}</h2>
      <p class="text-xs font-mono opacity-60">{t('IIIF URL configuration panel')}</p>
      <button class={closeClass} onclick={onCloseWorkbench}>{t('Close')}</button>
    </div>
  </div>
{/if}

{#if showSearchPanel}
  <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-label="Search panel">
    <div class={cn(modalBg, 'w-96 max-h-[80vh] overflow-y-auto')}>
      <h2 class="font-mono text-sm uppercase tracking-wider font-bold mb-4">{t('Search')}</h2>
      <p class="text-xs font-mono opacity-60">{t('Content search panel')}</p>
      <button class={closeClass} onclick={onCloseSearchPanel}>{t('Close')}</button>
    </div>
  </div>
{/if}

{#if showKeyboardHelp}
  <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-label="Keyboard shortcuts" aria-modal="true">
    <div class={cn(modalBg, 'w-80')}>
      <h2 class="font-mono text-sm uppercase tracking-wider font-bold mb-4">{t('Keyboard Shortcuts')}</h2>

      {#if mediaType === 'image'}
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-mono">
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>+/-</dt><dd>{t('Zoom in/out')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>0</dt><dd>{t('Reset view')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>R</dt><dd>{t('Rotate CW (Shift+R CCW)')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>F</dt><dd>{t('Flip horizontal')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>N</dt><dd>{t('Toggle navigator')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>A</dt><dd>{t('Toggle annotation tool')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>M</dt><dd>{t('Toggle measurement')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>?</dt><dd>{t('This help')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>Esc</dt><dd>{t('Exit fullscreen')}</dd>
        </dl>
      {:else}
        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-mono">
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>Space/K</dt><dd>{t('Play/Pause')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>J/L</dt><dd>{t('Seek -/+ 5s')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>&#8593;/&#8595;</dt><dd>{t('Volume up/down')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>M</dt><dd>{t('Toggle mute')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>0-9</dt><dd>{t('Seek to %')}</dd>
          <dt class={cn('font-bold px-1 rounded', cx.kbd)}>&#60;/&#62;</dt><dd>{t('Speed -/+')}</dd>
        </dl>
      {/if}

      <button class={cn(closeClass, 'w-full')} onclick={onCloseKeyboardHelp}>{t('Close')}</button>
    </div>
  </div>
{/if}
