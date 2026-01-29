/**
 * Lazy-loaded Components
 * 
 * Code-split heavy components to reduce initial bundle size.
 * Components are loaded on-demand when first rendered.
 * 
 * Usage:
 * ```tsx
 * import { SuspendedExportDialog } from './LazyComponents';
 * 
 * <SuspendedExportDialog {...props} />
 * ```
 */

import React, { Suspense, ComponentType } from 'react';

// Loading fallback for lazy components
const ComponentFallback: React.FC<{ name: string }> = ({ name }) => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-pulse flex flex-col items-center gap-3">
      <div className="w-8 h-8 bg-slate-200 rounded-full" />
      <div className="text-sm text-slate-400">Loading {name}...</div>
    </div>
  </div>
);

// Lazy load heavy modal components
const LazyBoardExportDialog = React.lazy(() => 
  import('./BoardExportDialog').then(m => ({ default: m.BoardExportDialog }))
);

const LazyImageRequestWorkbench = React.lazy(() => 
  import('./ImageRequestWorkbench').then(m => ({ default: m.ImageRequestWorkbench }))
);

const LazyPolygonAnnotationTool = React.lazy(() => 
  import('./PolygonAnnotationTool').then(m => ({ default: m.PolygonAnnotationTool }))
);

const LazyCanvasComposer = React.lazy(() => 
  import('./CanvasComposer').then(m => ({ default: m.CanvasComposer }))
);

const LazyExportDialog = React.lazy(() => 
  import('./ExportDialog').then(m => ({ default: m.ExportDialog }))
);

const LazyBatchEditor = React.lazy(() => 
  import('./BatchEditor').then(m => ({ default: m.BatchEditor }))
);

const LazyQCDashboard = React.lazy(() => 
  import('./QCDashboard').then(m => ({ default: m.QCDashboard }))
);

// Wrapper components with Suspense boundaries - use any for props to avoid type issues
export const SuspendedBoardExportDialog: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentFallback name="Export Dialog" />}>
    <LazyBoardExportDialog {...props} />
  </Suspense>
);

export const SuspendedImageRequestWorkbench: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentFallback name="Image Workbench" />}>
    <LazyImageRequestWorkbench {...props} />
  </Suspense>
);

export const SuspendedPolygonAnnotationTool: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentFallback name="Annotation Tool" />}>
    <LazyPolygonAnnotationTool {...props} />
  </Suspense>
);

export const SuspendedCanvasComposer: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentFallback name="Canvas Composer" />}>
    <LazyCanvasComposer {...props} />
  </Suspense>
);

export const SuspendedExportDialog: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentFallback name="Export Dialog" />}>
    <LazyExportDialog {...props} />
  </Suspense>
);

export const SuspendedBatchEditor: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentFallback name="Batch Editor" />}>
    <LazyBatchEditor {...props} />
  </Suspense>
);

export const SuspendedQCDashboard: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentFallback name="QC Dashboard" />}>
    <LazyQCDashboard {...props} />
  </Suspense>
);
