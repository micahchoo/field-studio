<!--
  GeoEditorStatusBar -- Feature count + coordinates + cancel draw action.
  Extracted from GeoEditor molecule.
  Architecture: Atom
-->
<script lang="ts">
  import type { DrawMode } from '../../lib/navPlaceService';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    statusText: string;
    drawMode: DrawMode;
    editable: boolean;
    onCancelDraw: () => void;
    fieldMode?: boolean;
  }

  let {
    statusText,
    drawMode,
    editable,
    onCancelDraw,
    fieldMode = false,
  }: Props = $props();
</script>

<div class={cn(
  'absolute bottom-0 left-0 right-0 z-[1000]',
  'bg-white/90 backdrop-blur-sm border-t border-nb-black/10',
  'px-3 py-1 flex items-center justify-between',
  'text-[10px] font-mono opacity-70',
  fieldMode && 'bg-yellow-50/90 border-yellow-700/20'
)}>
  <span>{statusText}</span>
  {#if editable && drawMode !== 'none'}
    <button
      type="button"
      class="text-nb-red hover:underline cursor-pointer"
      onclick={onCancelDraw}
    >
      Cancel draw
    </button>
  {/if}
</div>
