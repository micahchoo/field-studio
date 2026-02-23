<!--
  BlurUpThumbnail.svelte — Two-phase blur-up thumbnail loading
  =============================================================
  Shows a low-res blurred placeholder that crossfades to a high-res image
  once loaded. Falls back to an icon if both sources fail.
  Auth status badge overlay in top-right corner.
  React source: src/features/archive/ui/molecules/BlurUpThumbnail.tsx
-->
<script lang="ts">
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    lowResUrl: string;
    highResUrl: string;
    fallbackIcon?: string;
    cx: { surface?: string; textMuted?: string; [key: string]: string | undefined };
    fieldMode: boolean;
    authStatus?: 'unknown' | 'locked' | 'unlocked';
    class?: string;
  }

  let {
    lowResUrl,
    highResUrl,
    fallbackIcon = 'image',
    cx,
    fieldMode,
    authStatus,
    class: className = '',
  }: Props = $props();

  let highResLoaded = $state(false);
  let lowResFailed = $state(false);
  let highResFailed = $state(false);

  const showFallback = $derived(
    (lowResFailed && highResFailed) || (!lowResUrl && !highResUrl)
  );

  const authIcon = $derived(
    authStatus === 'locked' ? 'lock' :
    authStatus === 'unlocked' ? 'lock_open' :
    null
  );

  const authColor = $derived(
    authStatus === 'locked'
      ? (fieldMode ? 'bg-nb-red/80 text-nb-white' : 'bg-nb-red text-nb-white')
      : authStatus === 'unlocked'
        ? (fieldMode ? 'bg-nb-green/80 text-nb-white' : 'bg-nb-green text-nb-white')
        : ''
  );
</script>

<div class={cn('relative w-full h-full overflow-hidden', cx.surface, className)}>
  {#if showFallback}
    <!-- Fallback: icon placeholder -->
    <div class="w-full h-full flex items-center justify-center">
      <Icon
        name={fallbackIcon}
        class={cn('text-3xl opacity-40', cx.textMuted || 'text-nb-black/30')}
      />
    </div>
  {:else}
    <!-- Low-res blurred placeholder -->
    {#if lowResUrl && !lowResFailed}
      <img
        src={lowResUrl}
        alt=""
        class={cn(
          'absolute inset-0 w-full h-full object-cover blur-sm scale-105 transition-opacity duration-300',
          highResLoaded ? 'opacity-0' : 'opacity-100'
        )}
        loading="eager"
        onerror={() => { lowResFailed = true; }}
      />
    {/if}

    <!-- High-res image (crossfades in) -->
    {#if highResUrl && !highResFailed}
      <img
        src={highResUrl}
        alt=""
        class={cn(
          'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
          highResLoaded ? 'opacity-100' : 'opacity-0'
        )}
        loading="lazy"
        onload={() => { highResLoaded = true; }}
        onerror={() => { highResFailed = true; }}
      />
    {/if}

    <!-- If low-res failed but high-res hasn't loaded yet, show spinner -->
    {#if lowResFailed && !highResLoaded && !highResFailed}
      <div class="absolute inset-0 flex items-center justify-center">
        <Icon
          name={fallbackIcon}
          class={cn('text-2xl opacity-30 animate-pulse', cx.textMuted || 'text-nb-black/30')}
        />
      </div>
    {/if}
  {/if}

  <!-- Auth status badge overlay -->
  {#if authIcon}
    <div class={cn(
      'absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center',
      authColor
    )}>
      <Icon name={authIcon} class="text-xs" />
    </div>
  {/if}
</div>
