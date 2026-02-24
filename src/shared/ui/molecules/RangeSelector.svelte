<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '../atoms/Button.svelte';
  import Icon from '../atoms/Icon.svelte';

  interface Preset {
    label: string;
    start: string;
    end: string;
  }

  interface Props {
    start: string;
    end: string;
    onApply: (range: { start: string; end: string }) => void;
    presets?: Preset[];
    minDate?: string;
    maxDate?: string;
    showPresets?: boolean;
    disabled?: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
  }

  let {
    start = $bindable(''),
    end = $bindable(''),
    onApply,
    presets = [],
    minDate,
    maxDate,
    showPresets = true,
    disabled = false,
    cx,
    fieldMode = false
  }: Props = $props();

  let localStart = $state(start);
  let localEnd = $state(end);
  let showPresetMenu = $state(false);
  let validationError = $state('');
  let presetRef: HTMLDivElement | undefined = $state();

  $effect(() => { if (start !== localStart) localStart = start; });
  $effect(() => { if (end !== localEnd) localEnd = end; });

  // Date API calls (getTime) — not external services, safe for reactive context
   
  function validateRange(s: string, e: string): boolean {
    if (!s || !e) { validationError = 'Both start and end dates are required'; return false; }
    const st = new Date(s).getTime();
    const et = new Date(e).getTime();
    if (st > et) { validationError = 'Start date must be before end date'; return false; }
    if (minDate && st < new Date(minDate).getTime()) { validationError = `Start date cannot be before ${minDate}`; return false; }
    if (maxDate && et > new Date(maxDate).getTime()) { validationError = `End date cannot be after ${maxDate}`; return false; }
    validationError = '';
    return true;
  }
   

  const isValid = $derived(validateRange(localStart, localEnd));

  function handleApply() {
    if (!isValid) return;
    start = localStart;
    end = localEnd;
    onApply({ start: localStart, end: localEnd });
  }

  function handlePresetSelect(preset: Preset) {
    localStart = preset.start;
    localEnd = preset.end;
    showPresetMenu = false;
    if (validateRange(preset.start, preset.end)) {
      start = preset.start;
      end = preset.end;
      onApply({ start: preset.start, end: preset.end });
    }
  }

  function handleReset() {
    localStart = '';
    localEnd = '';
    validationError = '';
  }

  // Click-outside for presets
  $effect(() => {
    if (!showPresetMenu || !presetRef) return;
    function handleClickOutside(e: MouseEvent) {
      if (presetRef && !presetRef.contains(e.target as Node)) showPresetMenu = false;
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

<div class="flex flex-col gap-4">
  <div class="flex gap-4 items-end">
    <div class="flex-1">
      <label for="field-start-date" class={cn(cx.label || 'text-[11px] font-bold uppercase tracking-wider font-mono', 'block mb-2')}>Start Date</label>
      <input id="field-start-date"
        type="date"
        bind:value={localStart}
        min={minDate}
        max={maxDate}
        {disabled}
        class={cx.input || 'w-full border-2 border-nb-black px-3 py-2 font-mono'}
      />
    </div>

    <div class="flex-1">
      <label for="field-end-date" class={cn(cx.label || 'text-[11px] font-bold uppercase tracking-wider font-mono', 'block mb-2')}>End Date</label>
      <input id="field-end-date"
        type="date"
        bind:value={localEnd}
        min={minDate}
        max={maxDate}
        {disabled}
        class={cx.input || 'w-full border-2 border-nb-black px-3 py-2 font-mono'}
      />
    </div>

    {#if showPresets && presets.length > 0}
      <div class="relative" bind:this={presetRef}>
        <Button variant="ghost" onclick={() => showPresetMenu = !showPresetMenu} {disabled}>
          {#snippet children()}
            <Icon name="date_range" class="text-base" />
            <span>Presets</span>
          {/snippet}
        </Button>

        {#if showPresetMenu}
          <div class={cn('absolute right-0 mt-1 w-48 border-2 shadow-lg z-50 py-1', cx.surface || 'bg-nb-white border-nb-black')}>
            {#each presets as preset (preset.label)}
              <button
                type="button"
                class="w-full px-4 py-2 text-left text-sm hover:bg-nb-cream cursor-pointer border-0 bg-transparent"
                onclick={() => handlePresetSelect(preset)}
              >{preset.label}</button>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>

  {#if validationError}
    <div class="text-sm text-red-600 font-mono">{validationError}</div>
  {/if}

  <div class="flex gap-2 justify-end">
    <Button variant="ghost" onclick={handleReset} {disabled}>
      {#snippet children()}<span>Reset</span>{/snippet}
    </Button>
    <Button variant="primary" onclick={handleApply} disabled={disabled || !isValid}>
      {#snippet children()}<span>Apply Range</span>{/snippet}
    </Button>
  </div>
</div>
