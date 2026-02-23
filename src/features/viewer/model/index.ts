/**
 * Viewer Feature Model -- Barrel re-exports
 *
 * Central export point for the viewer feature's model layer.
 * Organizes exports by category:
 *
 *   1. Pure TS utilities (annotation.ts, viewerCompatibility.ts)
 *   2. Svelte 5 reactive classes (annotation.svelte.ts, viewer.svelte.ts)
 *   3. Types-only modules (composer.ts)
 *   4. Already-migrated stores (annotationLayers, comparison, imageFilters, measurement)
 *   5. Already-migrated stores in /stores (mediaPlayer)
 *   6. Already-migrated actions (annotorious, waveform) -- in /actions
 *   7. Already-migrated lib (viewingBehavior) -- in /lib
 *
 * SOURCE: React codebase src/features/viewer/model/index.ts
 * MIGRATION: All React-specific exports (useAnnotation, useTimeAnnotation,
 *            useViewer, useComposer, useMediaPlayer, etc.) are replaced by
 *            their Svelte 5 class equivalents.
 */

// ============================================================================
// 1. Pure TS utilities from annotation.ts
// ============================================================================

export {
  // SVG utilities
  pointsToSvgPath,
  createSvgSelector,
  parseSvgSelector,
  getBoundingBox,
  simplifyPath,

  // Time fragment utilities (W3C Media Fragments)
  createTimeFragmentSelector,
  parseTimeFragmentSelector,
  formatTimeForDisplay,
  createTimeAnnotation,
  isTimeBasedAnnotation,
  getAnnotationTimeRange,

  // Types
  type Point,
  type DrawingMode,
  type SpatialDrawingMode,
  type TimeDrawingMode,
  type TimeRange,
  type TimeAnnotationState,
  type AnnotationState,
} from './annotation';

// ============================================================================
// 2. Svelte 5 reactive stores from annotation.svelte.ts
// ============================================================================

export {
  AnnotationToolStore,
  TimeAnnotationStore,
} from './annotation.svelte';

// ============================================================================
// 3. Composer types from composer.ts
// (Full ComposerStore deferred -- depends on viewport hooks not yet migrated)
// ============================================================================

export {
  type BackgroundMode,
  type SidebarTab,
  type ComposerDimensions,
  type ComposerState,
  type AlignmentType,
  type PlacedResource,
} from './composer';

// ============================================================================
// 4. Viewer store from viewer.svelte.ts
// ============================================================================

export {
  ViewerStore,
  detectMediaType,
  extractAnnotations,
  type MediaType,
  type ChoiceItem,
  type ScreenshotFormat,
} from './viewer.svelte';

// ============================================================================
// 5. Viewer compatibility service from viewerCompatibility.ts
// ============================================================================

export {
  viewerCompatibility,
  type ViewerName,
  type CompatibilityIssue,
  type CompatibilityReport,
  type ViewerRequirement,
} from './viewerCompatibility';

// ============================================================================
// 6. Already-migrated model stores
// ============================================================================

export {
  AnnotationLayerStore,
  type AnnotationLayer,
} from './annotationLayers.svelte';

export {
  ComparisonStore,
  type ComparisonMode,
} from './comparison.svelte';

export {
  ImageFilterStore,
  type ImageFilterState,
} from './imageFilters.svelte';

export {
  MeasurementStore,
  type MeasurementPoint,
  type Measurement,
} from './measurement.svelte';

// ============================================================================
// 7. Already-migrated stores (in /stores subdirectory)
// ============================================================================

export {
  MediaPlayerStore,
  type MediaState,
  type MediaPlayerOptions,
} from '../stores/mediaPlayer.svelte';

// ============================================================================
// 8. Already-migrated actions (in /actions subdirectory)
// These are Svelte actions (use:action), not stores.
// Re-exported here for convenience.
// ============================================================================

export {
  annotorious,
  iiifToW3C,
  w3cToIIIF,
  makeAnnotoriousStyle,
  filterSpatialAnnotations,
  type AnnotoriousDrawingTool,
  type AnnotationStyleOptions,
  type AnnotoriousParams,
} from '../actions/annotorious';

export {
  waveform,
  getRegionColor,
  REGION_COLORS,
  type WaveformAnnotation,
  type WaveformParams,
} from '../actions/waveform';

// ============================================================================
// 9. Already-migrated lib (in /lib subdirectory)
// ============================================================================

export {
  resolveViewingBehavior,
  getCanvasLayout,
  isFacingPage,
  isNonPaged,
  buildPageSpreads,
  categorizeUnknownBehaviors,
  type ViewingBehavior,
  type ViewingLayout,
  type BehaviorCanvas,
} from '../lib/viewingBehavior';
