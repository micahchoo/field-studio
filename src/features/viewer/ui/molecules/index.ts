/**
 * Viewer Feature Molecules
 *
 * Feature-specific molecules for the viewer feature.
 * These are composed by the ViewerView organism.
 */

// Composer molecules
export { ComposerToolbar } from './ComposerToolbar';
export type { ComposerToolbarProps, BackgroundMode } from './ComposerToolbar';

export { ComposerSidebar } from './ComposerSidebar';
export type { ComposerSidebarProps, SidebarTab } from './ComposerSidebar';

export { ComposerCanvas } from './ComposerCanvas';
export type { ComposerCanvasProps } from './ComposerCanvas';

// Annotation molecules
export { AnnotationToolbar } from './AnnotationToolbar';
export type { AnnotationToolbarProps } from './AnnotationToolbar';

export { AnnotationCanvas } from './AnnotationCanvas';
export type { AnnotationCanvasProps } from './AnnotationCanvas';

export { AnnotationForm } from './AnnotationForm';
export type { AnnotationFormProps } from './AnnotationForm';

// Viewer molecules (migrated from legacy components)
export { MediaPlayer } from './MediaPlayer';
export type { MediaPlayerProps } from './MediaPlayer';

export { ViewerSearchPanel } from './ViewerSearchPanel';
export type { ViewerSearchPanelProps, SearchResult, SearchService } from './ViewerSearchPanel';

export { ViewerWorkbench } from './ViewerWorkbench';
export type { ViewerWorkbenchProps } from './ViewerWorkbench';

// New decomposition molecules (Phase 2)
export { ViewerToolbar } from './ViewerToolbar';
export type { ViewerToolbarProps } from './ViewerToolbar';

export { FilmstripNavigator } from './FilmstripNavigator';
export type { FilmstripNavigatorProps } from './FilmstripNavigator';

export { AnnotationOverlay } from './AnnotationOverlay';
export type { AnnotationOverlayProps, IIIFAnnotation } from './AnnotationOverlay';

export { ViewerPanels } from './ViewerPanels';
export type { ViewerPanelsProps } from './ViewerPanels';

export { ViewerEmptyState } from './ViewerEmptyState';
export type { ViewerEmptyStateProps } from './ViewerEmptyState';

export { ViewerContent } from './ViewerContent';
export type { ViewerContentProps } from './ViewerContent';
