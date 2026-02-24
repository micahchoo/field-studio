<!--
  ViewerToolbar — Viewer header bar with tools in SubBar
  React source: src/features/viewer/ui/molecules/ViewerToolbar.tsx (377 lines)
  Layer: molecule (FSD features/viewer/ui/molecules)

  Uses ViewHeader shell with named snippet slots. SubBar adapts
  tool groups based on media type. Annotation drawing mode expands
  inline color/stroke pickers.
-->

<script module lang="ts">
  export type AnnotationDrawingMode = 'polygon' | 'rectangle' | 'freehand' | 'select';

  export interface AnnotationStyleOptions {
    color: string;
    strokeWidth: number;
    fillOpacity?: number;
  }

  export type ScreenshotFormat = 'png' | 'jpeg' | 'webp';
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import { cn } from '@/src/shared/lib/cn';
  import { ViewHeader } from '@/src/shared/ui/molecules/ViewHeader';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import Divider from '@/src/shared/ui/atoms/Divider.svelte';
  import ZoomControl from '@/src/shared/ui/atoms/ZoomControl.svelte';
  import AnnotationColorPicker from '../atoms/AnnotationColorPicker.svelte';
  import StrokeWidthSelect from '../atoms/StrokeWidthSelect.svelte';

  interface Props {
    label: string;
    mediaType: 'image' | 'video' | 'audio' | 'other';
    zoomLevel: number;
    rotation?: number;
    isFlipped?: boolean;
    showNavigator?: boolean;
    annotationCount: number;
    hasSearchService: boolean;
    canDownload: boolean;
    isFullscreen: boolean;
    showSearchPanel: boolean;
    showWorkbench: boolean;
    showComposer: boolean;
    showAnnotationTool: boolean;
    annotationDrawingMode?: AnnotationDrawingMode;
    hasMultipleCanvases: boolean;
    showFilmstrip: boolean;
    viewerReady: boolean;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetView: () => void;
    onRotateCW?: () => void;
    onRotateCCW?: () => void;
    onFlipHorizontal?: () => void;
    onTakeScreenshot?: (format: ScreenshotFormat, action: 'download' | 'clipboard') => void;
    onToggleNavigator?: () => void;
    onToggleKeyboardHelp?: () => void;
    onToggleSearch: () => void;
    onToggleWorkbench: () => void;
    onToggleComposer: () => void;
    onToggleAnnotationTool: () => void;
    onAnnotationModeChange?: (mode: AnnotationDrawingMode) => void;
    onAnnotationUndo?: () => void;
    onAnnotationRedo?: () => void;
    onAnnotationClear?: () => void;
    annotationStyle?: AnnotationStyleOptions;
    onAnnotationStyleChange?: (style: AnnotationStyleOptions) => void;
    onToggleMetadata: () => void;
    onDownload?: () => void;
    onToggleFullscreen: () => void;
    onToggleFilmstrip: () => void;
    showFilterPanel?: boolean;
    filtersActive?: boolean;
    onToggleFilterPanel?: () => void;
    showMeasurement?: boolean;
    onToggleMeasurement?: () => void;
    showComparison?: boolean;
    onToggleComparison?: () => void;
    showLayers?: boolean;
    onToggleLayers?: () => void;
    layerCount?: number;
    onShareLink?: () => void;
    onSwitchView?: (mode: string) => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    label,
    mediaType,
    zoomLevel,
    rotation = 0,
    isFlipped = false,
    showNavigator = true,
    annotationCount,
    hasSearchService,
    canDownload,
    isFullscreen,
    showSearchPanel,
    showWorkbench,
    showComposer,
    showAnnotationTool,
    hasMultipleCanvases,
    showFilmstrip,
    viewerReady,
    onZoomIn,
    onZoomOut,
    onResetView,
    onRotateCW,
    onRotateCCW,
    onFlipHorizontal,
    onTakeScreenshot,
    onToggleNavigator,
    onToggleKeyboardHelp,
    onToggleSearch,
    onToggleWorkbench,
    onToggleComposer,
    onToggleAnnotationTool,
    onAnnotationModeChange,
    onAnnotationUndo,
    onAnnotationRedo,
    onAnnotationClear,
    onToggleMetadata,
    onDownload,
    onToggleFullscreen,
    onToggleFilmstrip,
    cx,
    fieldMode,
    annotationDrawingMode,
    annotationStyle,
    onAnnotationStyleChange,
    showFilterPanel,
    filtersActive,
    onToggleFilterPanel,
    showMeasurement,
    onToggleMeasurement,
    showComparison,
    onToggleComparison,
    showLayers,
    onToggleLayers,
    layerCount,
    onShareLink,
    onSwitchView,
  }: Props = $props();

  let iconName = $derived(
    mediaType === 'video' ? 'movie' : mediaType === 'audio' ? 'audiotrack' : 'image'
  );
  let isAV = $derived(mediaType === 'audio' || mediaType === 'video');
  let hasTools = $derived(mediaType === 'image' || showAnnotationTool);

  /** Icon button helper for consistent toolbar buttons */
  function ibClass(active: boolean): string {
    return cn(
      'p-1.5 transition-nb',
      active
        ? fieldMode ? 'bg-nb-yellow text-black' : 'bg-nb-blue text-white'
        : fieldMode ? 'text-nb-yellow/70 hover:bg-nb-yellow/10' : 'text-nb-black/60 hover:bg-nb-black/5'
    );
  }
</script>

{#snippet iconBtn(icon: string, ariaLabel: string, onclick: (() => void) | undefined, active: boolean, disabled?: boolean, title?: string)}
  <button
    type="button"
    class={ibClass(active)}
    {onclick}
    disabled={disabled ?? false}
    aria-label={ariaLabel}
    aria-pressed={active || undefined}
    title={title ?? ariaLabel}
  >
    <Icon name={icon} class="text-base" />
  </button>
{/snippet}

<ViewHeader {cx} zIndex="z-20" class="viewer-chrome">
  {#snippet title()}
    <Icon name={iconName} class={cn('text-base', fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/50')} />
    <span class={cn('text-xs font-bold font-mono uppercase tracking-wider truncate', cx.text)}>
      {label}
    </span>
    {#if annotationCount > 0}
      <div class={cn('h-4 w-px', fieldMode ? 'bg-nb-yellow/40' : 'bg-nb-black/20')}></div>
      <span class={cn('text-[10px] font-bold font-mono', fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40')}>
        {annotationCount} annotation{annotationCount !== 1 ? 's' : ''}
      </span>
    {/if}
  {/snippet}

  {#snippet actions()}
    <div class="flex items-center gap-0.5">
      {#if onSwitchView}
        {@render iconBtn('inventory_2', 'Open in Archive', () => onSwitchView('archive'), false)}
        {@render iconBtn('table_chart', 'Open in Metadata', () => onSwitchView('metadata'), false)}
        <div class={cn('w-px h-6 mx-1', cx.divider)}></div>
      {/if}
      {@render iconBtn(
        isFullscreen ? 'fullscreen_exit' : 'fullscreen',
        'Fullscreen',
        onToggleFullscreen,
        false,
        false,
        'Toggle fullscreen (Esc to exit)'
      )}
      {#if hasMultipleCanvases}
        {@render iconBtn('view_carousel', 'Filmstrip', onToggleFilmstrip, showFilmstrip)}
      {/if}
    </div>
  {/snippet}

  {#snippet subbar()}
    <!-- Zoom and rotation - images only -->
    {#if mediaType === 'image'}
      <div class="flex items-center gap-0.5" role="group" aria-label="Zoom controls">
        <ZoomControl
          zoom={zoomLevel / 100}
          onZoomChange={(z) => {
            const pct = Math.round(z * 100);
            if (pct > zoomLevel) onZoomIn();
            else if (pct < zoomLevel) onZoomOut();
          }}
          onReset={onResetView}
          disabled={!viewerReady}
          {cx}
        />
      </div>

      <Divider direction="vertical" cx={cx} class="h-6 mx-1" />

      <div class="flex items-center gap-0.5" role="group" aria-label="Orientation">
        {#if onRotateCCW}
          {@render iconBtn('rotate_left', 'Rotate left', onRotateCCW, false, !viewerReady, 'Rotate counter-clockwise (Shift+R)')}
        {/if}
        {#if rotation !== 0}
          <span class={cn('text-[10px] font-mono px-1', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')}>
            {rotation}&deg;
          </span>
        {/if}
        {#if onRotateCW}
          {@render iconBtn('rotate_right', 'Rotate right', onRotateCW, false, !viewerReady, 'Rotate clockwise (R)')}
        {/if}
        {#if onFlipHorizontal}
          {@render iconBtn('flip', 'Flip', onFlipHorizontal, isFlipped, !viewerReady, 'Flip horizontally (F)')}
        {/if}
      </div>

      <Divider direction="vertical" cx={cx} class="h-6 mx-1" />
    {/if}

    <!-- Annotate button -->
    <button
      aria-label="Toggle annotation tool"
      type="button"
      onclick={onToggleAnnotationTool}
      title="Toggle annotation tool (A)"
      class={cn(
        'flex items-center gap-1.5 text-xs font-semibold px-3 py-1 transition-nb',
        showAnnotationTool
          ? fieldMode ? 'bg-nb-yellow text-black' : 'bg-nb-green text-white'
          : fieldMode ? 'bg-nb-yellow/20 text-nb-yellow hover:bg-nb-yellow/30' : 'bg-nb-black/80 text-nb-black/20 hover:bg-nb-black/60'
      )}
    >
      <Icon name={isAV ? 'timer' : 'gesture'} class="text-base" />
      <span>Annotate</span>
    </button>

    <!-- Layers toggle -->
    {#if layerCount != null && layerCount > 0 && onToggleLayers}
      {@render iconBtn('layers', 'Annotation layers', onToggleLayers, showLayers ?? false, false, `Annotation layers (${layerCount})`)}
    {/if}

    <!-- Drawing mode buttons - images only when annotation active -->
    {#if showAnnotationTool && mediaType === 'image' && onAnnotationModeChange}
      <Divider direction="vertical" cx={cx} class="h-6 mx-1" />
      <div class="flex items-center gap-0.5" role="group" aria-label="Drawing mode">
        {@render iconBtn('pentagon', 'Polygon', () => onAnnotationModeChange('polygon'), annotationDrawingMode === 'polygon')}
        {@render iconBtn('crop_square', 'Rectangle', () => onAnnotationModeChange('rectangle'), annotationDrawingMode === 'rectangle')}
        {@render iconBtn('draw', 'Freehand', () => onAnnotationModeChange('freehand'), annotationDrawingMode === 'freehand')}
      </div>
      {#if onAnnotationStyleChange && annotationStyle}
        <Divider direction="vertical" cx={cx} class="h-6 mx-1" />
        <AnnotationColorPicker
          value={annotationStyle.color || '#22c55e'}
          onChange={(color) => onAnnotationStyleChange({ ...annotationStyle, color })}
          {fieldMode}
        />
        <StrokeWidthSelect
          value={annotationStyle.strokeWidth ?? 2}
          onChange={(strokeWidth) => onAnnotationStyleChange({ ...annotationStyle, strokeWidth })}
          color={annotationStyle.color || '#22c55e'}
          {fieldMode}
        />
      {/if}
      <div class="flex items-center gap-0.5" role="group" aria-label="Annotation actions">
        {#if onAnnotationUndo}
          {@render iconBtn('undo', 'Undo', onAnnotationUndo, false, false, 'Undo (Ctrl+Z)')}
        {/if}
        {#if onAnnotationRedo}
          {@render iconBtn('redo', 'Redo', onAnnotationRedo, false, false, 'Redo (Ctrl+Shift+Z)')}
        {/if}
        {#if onAnnotationClear}
          {@render iconBtn('delete_outline', 'Clear', onAnnotationClear, false)}
        {/if}
      </div>
    {/if}

    <!-- Image tools: filter, measurement, comparison, screenshot -->
    {#if mediaType === 'image' && onToggleFilterPanel}
      {@render iconBtn('tune', 'Image filters', onToggleFilterPanel, (showFilterPanel ?? false) || (filtersActive ?? false), false, 'Image filters')}
    {/if}
    {#if mediaType === 'image' && onToggleMeasurement}
      {@render iconBtn('straighten', 'Measure', onToggleMeasurement, showMeasurement ?? false, false, 'Measurement tool (M)')}
    {/if}
    {#if mediaType === 'image' && hasMultipleCanvases && onToggleComparison}
      {@render iconBtn('compare', 'Compare', onToggleComparison, showComparison ?? false, false, 'Compare canvases')}
    {/if}
    {#if mediaType === 'image' && onTakeScreenshot}
      <Divider direction="vertical" cx={cx} class="h-6 mx-1" />
      <!-- Screenshot button - simplified from ScreenshotMenu -->
      {@render iconBtn('photo_camera', 'Screenshot', () => onTakeScreenshot('png', 'download'), false, !viewerReady, 'Take screenshot')}
    {/if}

    <div class="flex-1"></div>

    <!-- Secondary actions -->
    <div class="flex items-center gap-0.5">
      {#if hasSearchService}
        {@render iconBtn('search', 'Search', onToggleSearch, showSearchPanel)}
      {/if}
      {#if mediaType === 'image' && onToggleNavigator}
        {@render iconBtn('picture_in_picture', 'Navigator', onToggleNavigator, showNavigator, false, 'Toggle navigator (N)')}
      {/if}
      {#if onShareLink}
        {@render iconBtn('share', 'Share link', onShareLink, false, false, 'Copy shareable link')}
      {/if}
    </div>
  {/snippet}
</ViewHeader>
