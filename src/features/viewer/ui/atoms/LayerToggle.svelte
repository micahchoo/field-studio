<!--
  LayerToggle — Single annotation layer row with visibility + opacity

  ORIGINAL: src/features/viewer/ui/atoms/LayerToggle.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Shows colored dot, label, count badge, visibility icon button, opacity slider.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    /** Layer identifier */
    id: string;
    /** Display label */
    label: string;
    /** Number of annotations in this layer */
    count?: number;
    /** Assigned color */
    color?: string;
    /** Whether this layer is visible */
    visible?: boolean;
    /** Whether this layer has hidden behavior */
    hidden?: boolean;
    /** Layer opacity 0-1 */
    opacity?: number;
    /** Toggle callback */
    onToggle: (id: string) => void;
    /** Opacity change callback */
    onOpacityChange?: (id: string, opacity: number) => void;
    /** Field mode styling */
    fieldMode?: boolean;
  }

  let {
    id,
    label,
    count = 0,
    color = '#3b82f6',
    visible = true,
    hidden = false,
    opacity = 1,
    onToggle,
    onOpacityChange,
    fieldMode = false,
  }: Props = $props();
</script>

<div class="w-full">
  <button
    onclick={() => onToggle(id)}
    class={cn(
      'w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-nb',
      visible
        ? fieldMode
          ? 'bg-nb-black text-white'
          : 'bg-nb-white text-nb-black/80'
        : fieldMode
          ? 'bg-transparent text-nb-black/50'
          : 'bg-transparent text-nb-black/40',
      fieldMode ? 'hover:bg-nb-black' : 'hover:bg-nb-cream'
    )}
    role="checkbox"
    aria-checked={visible}
    aria-label="Toggle {label} layer"
  >
    <!-- Color dot -->
    <span
      class="w-2.5 h-2.5 shrink-0"
      style:background-color={visible ? color : 'transparent'}
      style:border="2px solid {color}"
      style:opacity={opacity}
    ></span>

    <!-- Label -->
    <span class="flex-1 text-left truncate">{label}</span>

    <!-- Count -->
    <span class={cn('text-xs tabular-nums', fieldMode ? 'text-nb-black/60' : 'text-nb-black/40')}>
      ({count})
    </span>

    <!-- Hidden badge -->
    {#if hidden}
      <span
        class={cn('material-icons text-xs', fieldMode ? 'text-nb-black/60' : 'text-nb-black/40')}
        title="Hidden by default (behavior: hidden)"
      >
        visibility_off
      </span>
    {/if}

    <!-- Visibility icon -->
    <span class={cn(
      'material-icons text-sm',
      visible
        ? fieldMode ? 'text-nb-black/30' : 'text-nb-black/50'
        : fieldMode ? 'text-nb-black/80' : 'text-nb-black/30'
    )}>
      {visible ? 'visibility' : 'visibility_off'}
    </span>
  </button>

  <!-- Opacity slider - only when visible and callback provided -->
  {#if visible && onOpacityChange}
    <div class="flex items-center gap-2 px-3 pb-1">
      <span class={cn('text-[9px]', fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/30')}>
        Opacity
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={opacity}
        oninput={(e) => onOpacityChange(id, parseFloat((e.target as HTMLInputElement).value))}
        onclick={(e) => e.stopPropagation()}
        class="flex-1 h-1 accent-current"
        style:color={color}
        aria-label="{label} opacity"
      />
      <span class={cn('text-[9px] tabular-nums w-6 text-right', fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/30')}>
        {Math.round(opacity * 100)}%
      </span>
    </div>
  {/if}
</div>
