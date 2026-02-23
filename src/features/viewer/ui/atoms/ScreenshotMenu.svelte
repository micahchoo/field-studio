<!--
  ScreenshotMenu — Format menu (PNG/JPEG/WebP) for viewer screenshot

  ORIGINAL: src/features/viewer/ui/atoms/ScreenshotMenu.tsx (in viewer/ui/atoms/)
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Dropdown menu for screenshot format selection and copy/download actions.
  Remembers last-used format via localStorage.
-->

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  type ScreenshotFormat = 'image/png' | 'image/jpeg' | 'image/webp';

  interface Props {
    /** Callback when user requests a screenshot */
    onCapture: (format: ScreenshotFormat) => void;
    /** Whether controls are disabled */
    disabled?: boolean;
    /** Field mode styling */
    fieldMode?: boolean;
    /** Contextual styles */
    cx?: Partial<ContextualClassNames>;
  }

  let {
    onCapture,
    disabled = false,
    fieldMode = false,
    cx,
  }: Props = $props();

  const STORAGE_KEY = 'field-studio:screenshot-format';
  const FORMATS: { value: ScreenshotFormat; label: string }[] = [
    { value: 'image/png',  label: 'PNG' },
    { value: 'image/jpeg', label: 'JPEG' },
    { value: 'image/webp', label: 'WebP' },
  ];

  function loadFormat(): ScreenshotFormat {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'image/png' || stored === 'image/jpeg' || stored === 'image/webp') {
        return stored;
      }
    } catch { /* ignore */ }
    return 'image/png';
  }

  let format = $state<ScreenshotFormat>(loadFormat());
  let open = $state(false);
  let menuEl: HTMLDivElement | undefined = $state(undefined);

  let currentFormat = $derived(FORMATS.find(f => f.value === format) || FORMATS[0]);

  function handleFormatChange(f: ScreenshotFormat) {
    format = f;
    try { localStorage.setItem(STORAGE_KEY, f); } catch { /* ignore */ }
  }

  function handleClickOutside(e: MouseEvent) {
    if (menuEl && !menuEl.contains(e.target as Node)) {
      open = false;
    }
  }

  $effect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

<div bind:this={menuEl} class="relative">
  <div class="flex items-center">
    <!-- Main screenshot button -->
    <button
      class={cn(
        'px-1.5 py-1 transition-nb',
        disabled && 'opacity-50 cursor-not-allowed',
        fieldMode ? 'text-nb-yellow hover:bg-nb-yellow/20' : 'text-nb-black hover:bg-nb-black/10'
      )}
      onclick={() => !disabled && onCapture(format)}
      {disabled}
      title="Screenshot as {currentFormat.label}"
      aria-label="Take screenshot as {currentFormat.label}"
    >
      <span class="material-icons text-base">photo_camera</span>
    </button>

    <!-- Dropdown arrow -->
    <button
      class={cn(
        'px-0.5 py-1 transition-nb',
        disabled && 'opacity-50 cursor-not-allowed',
        fieldMode ? 'text-nb-yellow hover:bg-nb-yellow/20' : 'text-nb-black hover:bg-nb-black/10'
      )}
      onclick={() => !disabled && (open = !open)}
      {disabled}
      aria-label="Screenshot options"
      aria-expanded={open}
      aria-haspopup="menu"
    >
      <span class="material-icons text-sm">arrow_drop_down</span>
    </button>
  </div>

  {#if open}
    <div
      class={cn(
        'absolute top-full right-0 mt-1 z-30 w-44 shadow-brutal border',
        fieldMode
          ? 'bg-nb-black/95 border-nb-yellow/30'
          : cx?.surface ? `${cx.surface} border-nb-black/20` : 'bg-nb-white border-nb-black/20'
      )}
      role="menu"
    >
      <!-- Format selection header -->
      <div class={cn(
        'px-2 py-1.5 border-b text-[10px] font-semibold uppercase tracking-wider',
        fieldMode
          ? 'border-nb-yellow/20 text-nb-yellow/60'
          : `border-nb-black/10 ${cx?.textMuted ?? 'text-nb-black/40'}`
      )}>
        Format
      </div>
      <div class="p-1">
        {#each FORMATS as f}
          <button
            onclick={() => handleFormatChange(f.value)}
            class={cn(
              'w-full text-left px-2 py-1 text-xs flex items-center gap-2',
              f.value === format
                ? fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-blue/10 text-nb-blue'
                : fieldMode
                  ? 'text-nb-yellow/80 hover:bg-nb-yellow/10'
                  : `${cx?.text ?? 'text-nb-black/70'} hover:bg-nb-black/5`
            )}
            role="menuitemradio"
            aria-checked={f.value === format}
          >
            {#if f.value === format}
              <span class="material-icons text-xs">check</span>
            {:else}
              <span class="w-4"></span>
            {/if}
            {f.label}
          </button>
        {/each}
      </div>

      <!-- Actions -->
      <div class={cn('border-t p-1', fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10')}>
        <button
          onclick={() => { onCapture(format); open = false; }}
          class={cn(
            'w-full text-left px-2 py-1.5 text-xs flex items-center gap-2',
            fieldMode ? 'text-nb-yellow/80 hover:bg-nb-yellow/10' : `${cx?.text ?? 'text-nb-black/70'} hover:bg-nb-black/5`
          )}
          role="menuitem"
          aria-label="Download as {currentFormat.label}"
        >
          <span class="material-icons text-sm">download</span>
          Download as {currentFormat.label}
        </button>
      </div>
    </div>
  {/if}
</div>
