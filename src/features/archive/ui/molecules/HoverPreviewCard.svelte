<!--
  HoverPreviewCard.svelte — Rich preview card on hover
  =====================================================
  Fixed-positioned preview card that appears when hovering over
  an archive item. Shows thumbnail, metadata preview, type info,
  DNA badges, and validation counts. Positioned relative to the
  anchor rect, clamped to viewport bounds.
  React source: src/features/archive/ui/molecules/HoverPreviewCard.tsx
-->
<script lang="ts">
  import type { IIIFCanvas } from '@/src/shared/types';
  import { getIIIFValue } from '@/src/shared/types';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface AnchorRect {
    top: number;
    left: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  }

  interface Props {
    canvas: IIIFCanvas | null;
    visible: boolean;
    anchorRect: AnchorRect | null;
    validationIssues?: unknown[];
    cx: { surface?: string; text?: string; textMuted?: string; divider?: string; border?: string; [key: string]: string | undefined };
    fieldMode: boolean;
    class?: string;
  }

  let {
    canvas,
    visible,
    anchorRect,
    validationIssues,
    cx,
    fieldMode,
    class: className = '',
  }: Props = $props();

  /** Card dimensions */
  const CARD_WIDTH = 280;
  const CARD_HEIGHT_ESTIMATE = 360;
  const GAP = 12;

  /** Compute position clamped to viewport */
  const position = $derived.by(() => {
    if (!anchorRect) return { top: 0, left: 0 };

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    // Prefer placing card to the right of the anchor
    let left = anchorRect.right + GAP;
    let top = anchorRect.top;

    // If card overflows right edge, place to the left
    if (left + CARD_WIDTH > vw - GAP) {
      left = anchorRect.left - CARD_WIDTH - GAP;
    }

    // If card overflows left edge, center horizontally
    if (left < GAP) {
      left = Math.max(GAP, (vw - CARD_WIDTH) / 2);
    }

    // Clamp vertically
    if (top + CARD_HEIGHT_ESTIMATE > vh - GAP) {
      top = vh - CARD_HEIGHT_ESTIMATE - GAP;
    }
    if (top < GAP) {
      top = GAP;
    }

    return { top, left };
  });

  /** Get thumbnail URL */
  const thumbnailUrl = $derived(canvas?.thumbnail?.[0]?.id || '');

  /** Get label */
  const label = $derived(
    canvas ? (getIIIFValue(canvas.label) || canvas._filename || 'Untitled') : ''
  );

  /** Content type + icon */
  const contentType = $derived.by(() => {
    if (!canvas) return { type: 'Unknown', icon: 'help_outline' };
    const body = canvas.items?.[0]?.items?.[0]?.body;
    const bodyItem = Array.isArray(body) ? body[0] : body;
    const type = bodyItem && 'type' in bodyItem ? bodyItem.type : 'Image';
    const iconMap: Record<string, string> = {
      Image: 'image',
      Video: 'videocam',
      Sound: 'audiotrack',
      Text: 'description',
      Dataset: 'table_chart',
      Model: 'view_in_ar',
    };
    return { type, icon: iconMap[type] || 'help_outline' };
  });

  /** Dimensions string */
  const dimensions = $derived.by(() => {
    if (!canvas) return '';
    const parts: string[] = [];
    if (canvas.width && canvas.height) {
      parts.push(`${canvas.width} x ${canvas.height}`);
    }
    if (canvas.duration) {
      const mins = Math.floor(canvas.duration / 60);
      const secs = Math.floor(canvas.duration % 60);
      parts.push(`${mins}:${secs.toString().padStart(2, '0')}`);
    }
    return parts.join(' / ');
  });

  /** DNA badges: Time, GPS, Device indicators */
  const dnaBadges = $derived.by(() => {
    if (!canvas?.metadata) return [];
    const badges: Array<{ label: string; icon: string; color: string }> = [];

    for (const entry of canvas.metadata) {
      const key = getIIIFValue(entry.label).toLowerCase();
      if (key.includes('date') || key.includes('time') || key === 'navdate') {
        if (!badges.some(b => b.label === 'Time')) {
          badges.push({ label: 'Time', icon: 'schedule', color: fieldMode ? 'text-nb-yellow' : 'text-nb-blue' });
        }
      }
      if (key.includes('gps') || key.includes('latitude') || key.includes('longitude') || key.includes('coordinates')) {
        if (!badges.some(b => b.label === 'GPS')) {
          badges.push({ label: 'GPS', icon: 'explore', color: fieldMode ? 'text-nb-yellow' : 'text-nb-green' });
        }
      }
      if (key.includes('camera') || key.includes('device') || key.includes('make') || key.includes('model')) {
        if (!badges.some(b => b.label === 'Device')) {
          badges.push({ label: 'Device', icon: 'photo_camera', color: fieldMode ? 'text-nb-yellow' : 'text-nb-orange' });
        }
      }
    }

    return badges;
  });

  /** Metadata preview: first 3 key-value pairs */
  const metadataPreview = $derived.by(() => {
    if (!canvas?.metadata) return [];
    return canvas.metadata.slice(0, 3).map(entry => ({
      key: getIIIFValue(entry.label),
      value: getIIIFValue(entry.value),
    }));
  });

  /** Validation issue counts */
  const validationCounts = $derived.by(() => {
    if (!canvas || !validationIssues) return { errors: 0, warnings: 0 };
    let errors = 0;
    let warnings = 0;
    for (const issue of validationIssues) {
      const severity = (issue as { severity?: string }).severity;
      if (severity === 'error') errors++;
      else warnings++;
    }
    return { errors, warnings };
  });
</script>

{#if visible && canvas && anchorRect}
  <div
    class={cn(
      'fixed z-[300] pointer-events-none',
      'shadow-brutal-lg border-2 overflow-hidden',
      fieldMode
        ? 'bg-nb-black border-nb-yellow'
        : 'bg-nb-white border-nb-black',
      className
    )}
    style:left="{position.left}px"
    style:top="{position.top}px"
    style:width="{CARD_WIDTH}px"
    role="tooltip"
    aria-label="Preview: {label}"
  >
    <!-- Thumbnail section -->
    <div class={cn(
      'h-40 w-full overflow-hidden relative',
      fieldMode ? 'bg-nb-black' : 'bg-nb-cream'
    )}>
      {#if thumbnailUrl}
        <img
          src={thumbnailUrl}
          alt=""
          class="w-full h-full object-cover"
          loading="eager"
        />
      {:else}
        <div class="w-full h-full flex items-center justify-center">
          <Icon
            name="image"
            class={cn('text-4xl opacity-30', cx.textMuted || 'text-nb-black/30')}
          />
        </div>
      {/if}
    </div>

    <!-- Content section -->
    <div class="p-3 space-y-2">
      <!-- Label -->
      <h4 class={cn(
        'text-sm font-semibold font-mono truncate',
        cx.text || (fieldMode ? 'text-nb-yellow' : 'text-nb-black')
      )}>
        {label}
      </h4>

      <!-- Type + dimensions row -->
      <div class="flex items-center gap-2">
        <div class={cn(
          'flex items-center gap-1 px-1.5 py-0.5 text-xs font-mono uppercase tracking-wider',
          fieldMode
            ? 'bg-nb-yellow/20 text-nb-yellow'
            : 'bg-nb-cream text-nb-black/70'
        )}>
          <Icon name={contentType.icon} class="text-xs" />
          {contentType.type}
        </div>
        {#if dimensions}
          <span class={cn('text-xs tabular-nums', cx.textMuted || 'text-nb-black/40')}>
            {dimensions}
          </span>
        {/if}
      </div>

      <!-- NavDate -->
      {#if canvas.navDate}
        <div class="flex items-center gap-1.5">
          <Icon
            name="schedule"
            class={cn('text-xs', cx.textMuted || 'text-nb-black/40')}
          />
          <span class={cn('text-xs', cx.textMuted || 'text-nb-black/50')}>
            {canvas.navDate}
          </span>
        </div>
      {/if}

      <!-- DNA badges -->
      {#if dnaBadges.length > 0}
        <div class="flex items-center gap-1.5 flex-wrap">
          {#each dnaBadges as badge (badge.label)}
            <span class={cn(
              'flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-mono',
              fieldMode ? 'bg-nb-yellow/10' : 'bg-nb-cream'
            )}>
              <Icon name={badge.icon} class={cn('text-xs', badge.color)} />
              <span class={cn(badge.color)}>{badge.label}</span>
            </span>
          {/each}
        </div>
      {/if}

      <!-- Metadata preview -->
      {#if metadataPreview.length > 0}
        <div class={cn(
          'pt-2 space-y-1',
          cx.divider ? `border-t ${cx.divider}` : 'border-t border-nb-black/10'
        )}>
          {#each metadataPreview as entry (entry.key)}
            <div class="flex items-baseline gap-2 text-xs">
              <span class={cn(
                'font-mono uppercase tracking-wider font-bold shrink-0 max-w-[80px] truncate',
                cx.textMuted || 'text-nb-black/40'
              )}>
                {entry.key}
              </span>
              <span class={cn('truncate', cx.text || (fieldMode ? 'text-nb-yellow/80' : 'text-nb-black/70'))}>
                {entry.value}
              </span>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Validation issues -->
      {#if validationCounts.errors > 0 || validationCounts.warnings > 0}
        <div class={cn(
          'flex items-center gap-3 pt-2',
          cx.divider ? `border-t ${cx.divider}` : 'border-t border-nb-black/10'
        )}>
          {#if validationCounts.errors > 0}
            <span class="flex items-center gap-1 text-xs text-nb-red">
              <Icon name="error" class="text-xs" />
              {validationCounts.errors} error{validationCounts.errors !== 1 ? 's' : ''}
            </span>
          {/if}
          {#if validationCounts.warnings > 0}
            <span class={cn(
              'flex items-center gap-1 text-xs',
              fieldMode ? 'text-nb-yellow/70' : 'text-nb-orange'
            )}>
              <Icon name="warning" class="text-xs" />
              {validationCounts.warnings} warning{validationCounts.warnings !== 1 ? 's' : ''}
            </span>
          {/if}
        </div>
      {/if}
    </div>
  </div>
{/if}
