<!--
  AnnotationToolbar.svelte -- Annotation + Metadata editing composition widget
  =============================================================================
  React source: src/widgets/AnnotationToolbar/AnnotationToolbar.tsx (147 lines)

  Architecture:
    - Widget layer: PURE COMPOSITION only, zero business logic
    - Stacks two feature organisms vertically:
      1. AnnotationToolPanel (from features/viewer) -- annotation drawing/creation
      2. MetadataEditorPanel (from features/metadata-edit) -- resource metadata editing
    - MetadataEditorPanel is wired; AnnotationToolPanel placeholder pending drawing-state wiring.
    - Receives cx and fieldMode via props from parent template.
    - Widget exists strictly between Organisms and Pages per FSD rules.

  Props:
    canvas                -- IIIFCanvas to annotate
    imageUrl              -- Image URL for the canvas
    existingAnnotations   -- Existing IIIFAnnotation[] on the canvas
    onCreateAnnotation    -- Callback for annotation creation
    onClose               -- Callback when panel closes
    resource              -- IIIFItem for metadata editing (nullable)
    onUpdateResource      -- Callback for resource updates
    language              -- Current language code for metadata values
    cx                    -- ContextualClassNames for theming
    fieldMode             -- Field mode toggle
    t                     -- Terminology function from template
-->
<script lang="ts">
  import type { IIIFAnnotation, IIIFCanvas, IIIFItem } from '@/src/shared/types';
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';
  import MetadataEditorPanel from '@/src/features/metadata-edit/ui/organisms/MetadataEditorPanel.svelte';

  interface Props {
    canvas: IIIFCanvas;
    imageUrl: string;
    existingAnnotations?: IIIFAnnotation[];
    onCreateAnnotation: (annotation: IIIFAnnotation) => void;
    onClose: () => void;
    resource: IIIFItem | null;
    onUpdateResource: (r: Partial<IIIFItem>) => void;
    language: string;
    cx: ContextualClassNames;
    fieldMode: boolean;
    t: (key: string) => string;
  }

  let {
    canvas,
    imageUrl,
    existingAnnotations = [],
    onCreateAnnotation,
    onClose,
    resource,
    onUpdateResource,
    language,
    cx,
    fieldMode,
    t,
  }: Props = $props();
</script>

<div class="flex flex-col h-full">
  <!-- Annotation Tool Panel from viewer feature (flex-1 for primary content)
       Wire: AnnotationToolPanel needs drawing-state props (drawingMode, isDrawing, pointCount,
       canSave, text, motivation) and callbacks (onModeChange, onTextChange, onMotivationChange,
       onSave, onUndo, onClear) that this widget does not manage. The widget's interface provides
       high-level canvas/imageUrl/onCreateAnnotation but the panel expects low-level drawing state.
       Wire when parent context provides drawing state, or add local state management here. -->
  <div class="flex-1 min-h-0">
    <div
      class={cn(
        'flex flex-col items-center justify-center h-full gap-2 border-2 border-dashed rounded',
        'text-xs',
        cx.border || 'border-nb-black/15',
        cx.textMuted || 'text-nb-black/40'
      )}
      data-placeholder="AnnotationToolPanel"
    >
      <Icon name="draw" class="text-2xl opacity-40" />
      <span class="font-mono uppercase tracking-wide">AnnotationToolPanel</span>
      <span class="text-[10px] opacity-60">Needs drawing state wiring from parent context</span>
    </div>
  </div>

  <!-- Metadata Editor Panel from metadata-edit feature (conditional, scrollable) -->
  {#if resource}
    <div class={cn('border-t max-h-80 overflow-auto', cx.border || 'border-nb-black/20')}>
      <MetadataEditorPanel
        {resource}
        onUpdateResource={onUpdateResource}
        {language}
        {cx}
        {fieldMode}
        onClose={onClose}
      />
    </div>
  {/if}
</div>
