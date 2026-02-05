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
