<!--
  DragPreview.svelte — Custom drag preview
  React source: DragPreview.tsx (120L)
  Pure presentational: label, type icon, count badge
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    label: string;
    type: string;
    count?: number;
    class?: string;
    fieldMode?: boolean;
  }

  let { label, type, count = 1, class: className = '', fieldMode = false }: Props = $props();

  function getTypeIcon(t: string): string {
    switch (t) {
      case 'Collection': return 'folder';
      case 'Manifest': return 'description';
      case 'Canvas': return 'image';
      case 'Range': return 'format_list_bulleted';
      case 'AnnotationPage': return 'note';
      case 'Annotation': return 'push_pin';
      default: return 'label';
    }
  }

  function getTypeColor(t: string): string {
    switch (t) {
      case 'Collection': return 'text-nb-blue';
      case 'Manifest': return 'text-nb-green';
      case 'Canvas': return 'text-nb-purple';
      case 'Range': return 'text-nb-orange';
      default: return 'text-nb-black/50';
    }
  }

  const iconName = $derived(getTypeIcon(type));
  const iconColor = $derived(getTypeColor(type));
</script>

<div
  class={cn(
    'flex items-center gap-2 px-3 py-2 shadow-brutal min-w-[200px]',
    fieldMode
      ? 'bg-nb-black border border-nb-yellow text-nb-yellow'
      : 'bg-nb-white border border-nb-black/20 text-nb-black',
    className,
  )}
>
  <!-- @migration: Icon atom placeholder — using text for now -->
  <span class={cn('text-lg', iconColor)} aria-hidden="true">{iconName}</span>
  <span class={cn(
    'flex-1 truncate text-sm font-medium',
    fieldMode ? 'text-nb-yellow' : 'text-nb-black/80',
  )}>
    {label}
  </span>
  {#if count > 1}
    <span class={cn(
      'text-xs px-1.5 py-0.5',
      fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-cream/80 text-nb-black/50',
    )}>
      {count}
    </span>
  {/if}
</div>
