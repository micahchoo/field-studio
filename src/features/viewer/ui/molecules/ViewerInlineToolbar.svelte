<!--
  ViewerInlineToolbar -- Inline toolbar with zoom, rotate, flip, annotation, and action buttons

  LAYER: molecule
  FSD: features/viewer/ui/molecules

  Renders the viewer toolbar with media-specific controls: zoom/rotate/flip for images,
  annotation/measurement/filter/comparison toggles, and common actions (screenshot, share, help, fullscreen).
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { MediaType } from '../organisms/viewerViewHelpers';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    label: string;
    mediaType: MediaType;
    zoomLevel: number;
    showAnnotationTool: boolean;
    measurementActive: boolean;
    showFilterPanel: boolean;
    comparisonActive: boolean;
    hasMultipleCanvases: boolean;
    layerCount: number;
    showLayerPanel: boolean;
    showFilmstrip: boolean;
    isFullscreen: boolean;
    hasManifest: boolean;
    hasResolvedUrl: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onRotateCW: () => void;
    onFlipHorizontal: () => void;
    onToggleAnnotationTool: () => void;
    onToggleMeasurement: () => void;
    onToggleFilterPanel: () => void;
    onToggleComparison: () => void;
    onToggleLayerPanel: () => void;
    onScreenshot: () => void;
    onShareLink: () => void;
    onToggleKeyboardHelp: () => void;
    onToggleFullscreen: () => void;
    onToggleFilmstrip: () => void;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    t: (key: string) => string;
  }

  let {
    label, mediaType, zoomLevel,
    showAnnotationTool, measurementActive, showFilterPanel,
    comparisonActive, hasMultipleCanvases, layerCount, showLayerPanel,
    showFilmstrip, isFullscreen, hasManifest, hasResolvedUrl,
    onZoomIn, onZoomOut, onRotateCW, onFlipHorizontal,
    onToggleAnnotationTool, onToggleMeasurement, onToggleFilterPanel,
    onToggleComparison, onToggleLayerPanel,
    onScreenshot, onShareLink, onToggleKeyboardHelp,
    onToggleFullscreen, onToggleFilmstrip,
    cx, fieldMode = false, t,
  }: Props = $props();
</script>

<div
  class={cn(
    'flex items-center gap-2 px-3 h-12 border-b-4 shrink-0 font-mono text-xs uppercase tracking-wider',
    cx.headerBg, cx.text
  )}
  role="toolbar"
  aria-label="Viewer tools"
>
  <span class="truncate font-bold mr-2" title={label}>
    {label || t('Canvas')}
  </span>

  {#if mediaType === 'image'}
    <button class={cn('p-1 rounded', cx.iconButton)} onclick={onZoomOut} title={t('Zoom out') + ' (-)'} aria-label="Zoom out">&#8722;</button>
    <span class="text-xs tabular-nums min-w-[3rem] text-center" aria-live="polite">{zoomLevel}%</span>
    <button class={cn('p-1 rounded', cx.iconButton)} onclick={onZoomIn} title={t('Zoom in') + ' (+)'} aria-label="Zoom in">&#43;</button>

    <span class={cn('w-px h-5 mx-1', cx.separator)} aria-hidden="true"></span>

    <button class={cn('p-1 rounded', cx.iconButton)} onclick={onRotateCW} title={t('Rotate clockwise') + ' (R)'} aria-label="Rotate clockwise">&#8635;</button>
    <button class={cn('p-1 rounded', cx.iconButton)} onclick={onFlipHorizontal} title={t('Flip horizontal') + ' (F)'} aria-label="Flip horizontal">&#8596;</button>

    <span class={cn('w-px h-5 mx-1', cx.separator)} aria-hidden="true"></span>

    <button
      class={cn('p-1 rounded', showAnnotationTool ? cx.active : cx.iconButton)}
      onclick={onToggleAnnotationTool}
      title={t('Annotation tool') + ' (A)'}
      aria-label="Toggle annotation tool"
      aria-pressed={showAnnotationTool}
    >&#9998;</button>

    <button
      class={cn('p-1 rounded', measurementActive ? cx.active : cx.iconButton)}
      onclick={onToggleMeasurement}
      title={t('Measurement tool') + ' (M)'}
      aria-label="Toggle measurement tool"
      aria-pressed={measurementActive}
    >&#128207;</button>

    <button
      class={cn('p-1 rounded', showFilterPanel ? cx.active : cx.iconButton)}
      onclick={onToggleFilterPanel}
      title={t('Image filters')}
      aria-label="Toggle image filters"
      aria-pressed={showFilterPanel}
    >&#9788;</button>

    {#if hasMultipleCanvases}
      <button
        class={cn('p-1 rounded', comparisonActive ? cx.active : cx.iconButton)}
        onclick={onToggleComparison}
        title={t('Compare canvases')}
        aria-label="Toggle comparison mode"
        aria-pressed={comparisonActive}
      >&#9881;</button>
    {/if}

    {#if layerCount > 0}
      <button
        class={cn('p-1 rounded', showLayerPanel ? cx.active : cx.iconButton)}
        onclick={onToggleLayerPanel}
        title={t('Annotation layers') + ` (${layerCount})`}
        aria-label="Toggle annotation layers"
        aria-pressed={showLayerPanel}
      >&#9776;</button>
    {/if}
  {/if}

  <div class="flex-1"></div>

  {#if mediaType === 'image' && hasResolvedUrl}
    <button class={cn('p-1 rounded', cx.iconButton)} onclick={onScreenshot} title={t('Screenshot')} aria-label="Take screenshot">&#128247;</button>
  {/if}

  {#if hasManifest}
    <button class={cn('p-1 rounded', cx.iconButton)} onclick={onShareLink} title={t('Share link')} aria-label="Copy share link">&#128279;</button>
  {/if}

  <button class={cn('p-1 rounded', cx.iconButton)} onclick={onToggleKeyboardHelp} title={t('Keyboard shortcuts') + ' (?)'} aria-label="Show keyboard shortcuts">&#9000;</button>
  <button class={cn('p-1 rounded', cx.iconButton)} onclick={onToggleFullscreen} title={t('Fullscreen')} aria-label="Toggle fullscreen">{isFullscreen ? '\u2716' : '\u26F6'}</button>
  <button class={cn('p-1 rounded', cx.iconButton)} onclick={onToggleFilmstrip} title={t('Toggle filmstrip')} aria-label="Toggle filmstrip navigator" aria-pressed={showFilmstrip}>&#9783;</button>
</div>
