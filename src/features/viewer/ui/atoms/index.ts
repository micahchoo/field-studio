/**
 * Viewer Feature Atoms
 *
 * Feature-specific atoms for the IIIF Image API workbench and viewer components.
 * These atoms decompose complex viewer molecules into composable, testable units.
 *
 * ATOMIC DESIGN PRINCIPLES:
 * - Feature-specific (not shared across features)
 * - Minimal or zero local state
 * - Props-only API
 * - No domain logic
 */

// ============================================================================
// Workbench Atoms - IIIF Image API workbench components
// ============================================================================

export { ParameterSection } from './ParameterSection';
export type { ParameterSectionProps } from './ParameterSection';

export { PresetSelector } from './PresetSelector';
export type { PresetSelectorProps, PresetOption } from './PresetSelector';

export { CoordinateInput } from './CoordinateInput';
export type { CoordinateInputProps, CoordinateField } from './CoordinateInput';

export { UrlSegment } from './UrlSegment';
export type { UrlSegmentProps, SegmentColor } from './UrlSegment';

export { UrlBar } from './UrlBar';
export type { UrlBarProps } from './UrlBar';

export { ImagePreview } from './ImagePreview';
export type { ImagePreviewProps } from './ImagePreview';

export { PreviewHeader } from './PreviewHeader';
export type { PreviewHeaderProps } from './PreviewHeader';

export { TabButton } from './TabButton';
export type { TabButtonProps } from './TabButton';

export { RotationDial } from './RotationDial';
export type { RotationDialProps } from './RotationDial';

export { UpscaleToggle } from './UpscaleToggle';
export type { UpscaleToggleProps } from './UpscaleToggle';

export { QualitySelector } from './QualitySelector';
export type { QualitySelectorProps, QualityOption } from './QualitySelector';

export { FormatSelector } from './FormatSelector';
export type { FormatSelectorProps, FormatOption } from './FormatSelector';

export { CodePanel } from './CodePanel';
export type { CodePanelProps } from './CodePanel';

export { WorkbenchFooter } from './WorkbenchFooter';
export type { WorkbenchFooterProps } from './WorkbenchFooter';

export { Slider } from './Slider';
export type { SliderProps } from './Slider';

// ============================================================================
// Media Player Atoms - AV playback control components
// ============================================================================

export { PlayPauseButton } from './PlayPauseButton';
export type { PlayPauseButtonProps } from './PlayPauseButton';

export { VolumeControl } from './VolumeControl';
export type { VolumeControlProps } from './VolumeControl';

export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps } from './ProgressBar';

export { TimeDisplay } from './TimeDisplay';
export type { TimeDisplayProps } from './TimeDisplay';

export { PlaybackRateSelect } from './PlaybackRateSelect';
export type { PlaybackRateSelectProps, PlaybackRate } from './PlaybackRateSelect';

export { FullscreenButton } from './FullscreenButton';
export type { FullscreenButtonProps } from './FullscreenButton';

export { MediaControlGroup } from './MediaControlGroup';
export type { MediaControlGroupProps } from './MediaControlGroup';

export { MediaErrorOverlay } from './MediaErrorOverlay';
export type { MediaErrorOverlayProps, MediaErrorType } from './MediaErrorOverlay';

export { MediaLoadingOverlay } from './MediaLoadingOverlay';
export type { MediaLoadingOverlayProps } from './MediaLoadingOverlay';
