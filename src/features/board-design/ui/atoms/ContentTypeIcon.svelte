<!--
  ContentTypeIcon.svelte — Material Icon per Content Type
  =======================================================
  React source: src/features/board-design/ui/atoms/ContentTypeIcon.tsx (49 lines)

  Purpose: Renders a small icon overlay indicating the content type of a
  board item (Video, Audio, Text, Dataset, Model). Returns nothing for
  Unknown and Image types (Image is the default, no badge needed).

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.D: Static class strings — no Tailwind interpolation
  - Arch 2.F: CONTENT_ICONS map and SIZE_CLASSES in <script module>
  - Composes: Icon atom from shared/ui/atoms

  Svelte 5 patterns:
  - {#if} for early return when contentType is Unknown or Image
  - $derived for resolved icon name and classes
-->
<script module lang="ts">
  import type { IIIFContentType } from '../../model';

  // Arch 2.F: Static icon name map
  const CONTENT_ICONS: Record<IIIFContentType, string> = {
    Image: 'image',
    Video: 'videocam',
    Audio: 'audiotrack',
    Text: 'article',
    Dataset: 'dataset',
    Model: 'view_in_ar',
    Unknown: 'help_outline',
  };

  // Arch 2.D: Static size class strings
  const SIZE_CLASSES = {
    sm: { outer: 'text-sm p-0.5', icon: 'text-xs' },
    md: { outer: 'text-base p-1', icon: 'text-sm' },
  } as const;

  // Arch 2.D: Static bg class strings
  const BG_CLASSES = {
    field: 'bg-nb-black/80 text-nb-yellow',
    default: 'bg-nb-black/70 text-nb-white',
  } as const;
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    contentType: IIIFContentType;
    size?: 'sm' | 'md';
    cx: { surface: string; text: string };
    fieldMode: boolean;
  }

  let {
    contentType,
    size = 'sm',
    cx: _cx,
    fieldMode,
  }: Props = $props();

  const iconName = $derived(CONTENT_ICONS[contentType]);
  const sizeClass = $derived(SIZE_CLASSES[size]);
  const bgClass = $derived(fieldMode ? BG_CLASSES.field : BG_CLASSES.default);
  const shouldRender = $derived(contentType !== 'Unknown' && contentType !== 'Image');
</script>

{#if shouldRender}
  <span
    class={cn('inline-flex items-center justify-center', sizeClass.outer, bgClass)}
    title={contentType}
  >
    <span class="material-symbols-outlined {sizeClass.icon}" aria-hidden="true">
      {iconName}
    </span>
  </span>
{/if}
