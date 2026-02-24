/**
 * Viewer Feature Atoms — Svelte 5 migrations
 *
 * Feature-specific atoms for the IIIF viewer and Image API workbench.
 *
 * Existing atoms (migrated earlier):
 */
export { default as AnnotationColorPicker } from './AnnotationColorPicker.svelte';
export { default as FormatSelector } from './FormatSelector.svelte';
export { default as PlayPauseButton } from './PlayPauseButton.svelte';
export { default as PresetSelector } from './PresetSelector.svelte';
export { default as PreviewHeader } from './PreviewHeader.svelte';
export { default as QualitySelector } from './QualitySelector.svelte';
export { default as StrokeWidthSelect } from './StrokeWidthSelect.svelte';
export { default as UrlSegment } from './UrlSegment.svelte';
export { default as WorkbenchFooter } from './WorkbenchFooter.svelte';

/**
 * New atoms (23 created in this migration pass):
 */
export { default as AutoAdvanceToast } from './AutoAdvanceToast.svelte';
export { default as ChoiceSelector } from './ChoiceSelector.svelte';
export { default as CodePanel } from './CodePanel.svelte';
export { default as CoordinateInput } from './CoordinateInput.svelte';
export { default as FullscreenButton } from './FullscreenButton.svelte';
export { default as ImagePreview } from './ImagePreview.svelte';
export { default as LayerToggle } from './LayerToggle.svelte';
export { default as MediaControlGroup } from './MediaControlGroup.svelte';
export { default as MediaErrorOverlay } from './MediaErrorOverlay.svelte';
export { default as MediaLoadingOverlay } from './MediaLoadingOverlay.svelte';
export { default as PageCounter } from './PageCounter.svelte';
export { default as ParameterSection } from './ParameterSection.svelte';
export { default as PlaybackRateSelect } from './PlaybackRateSelect.svelte';
export { default as ProgressBar } from './ProgressBar.svelte';
export { default as RenderingDownloadMenu } from './RenderingDownloadMenu.svelte';
export { default as RotationDial } from './RotationDial.svelte';
export { default as ScreenshotMenu } from './ScreenshotMenu.svelte';
export { default as Slider } from './Slider.svelte';
export { default as TimeDisplay } from './TimeDisplay.svelte';
export { default as UpscaleToggle } from './UpscaleToggle.svelte';
export { default as UrlBar } from './UrlBar.svelte';
export { default as ViewerModeSwitcher } from './ViewerModeSwitcher.svelte';
export { default as VolumeControl } from './VolumeControl.svelte';

/**
 * Atoms extracted during decomposition pass:
 */
export { default as AudioControls } from './AudioControls.svelte';
export { default as ChapterMarkers } from './ChapterMarkers.svelte';
export { default as ComparisonModeSelector } from './ComparisonModeSelector.svelte';
export { default as MediaControlBar } from './MediaControlBar.svelte';
export { default as MediaProgressBar } from './MediaProgressBar.svelte';
export { default as PlayerControls } from './PlayerControls.svelte';
export { default as SearchResultItem } from './SearchResultItem.svelte';
export { default as SpatialAnnotationOverlay } from './SpatialAnnotationOverlay.svelte';
export { default as ViewerFilmstrip } from './ViewerFilmstrip.svelte';
export { default as ViewerToolbarActions } from './ViewerToolbarActions.svelte';
export { default as WorkbenchParameterControls } from './WorkbenchParameterControls.svelte';
