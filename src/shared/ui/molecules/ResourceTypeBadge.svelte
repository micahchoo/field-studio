<script module lang="ts">
  export const TYPE_COLORS: Record<string, string> = {
    Collection: 'bg-purple-100 text-purple-800 border-purple-400',
    Manifest: 'bg-blue-100 text-blue-800 border-blue-400',
    Canvas: 'bg-green-100 text-green-800 border-green-400',
    Range: 'bg-orange-100 text-orange-800 border-orange-400',
    AnnotationPage: 'bg-pink-100 text-pink-800 border-pink-400',
    Annotation: 'bg-pink-100 text-pink-800 border-pink-400',
  };
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    type: string;
    class?: string;
  }

  let { type, class: className = '' }: Props = $props();

  const colorClasses = $derived(TYPE_COLORS[type] || 'bg-gray-100 text-gray-800 border-gray-400');
</script>

<span class={cn(
  'inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase font-mono border-2',
  colorClasses,
  className
)}>
  {type}
</span>
