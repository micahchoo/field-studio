<!--
  StartPropertyEditor — IIIF `start` property editor.
  React source: src/features/metadata-edit/ui/atoms/StartPropertyEditor.tsx (170 lines)
  Architecture: Atom (local state: showTimePicker + timeValue input)
  Spec: https://iiif.io/api/presentation/3.0/#start
-->
<script module lang="ts">
  export interface StartValue {
    id: string;
    type: 'Canvas' | 'SpecificResource';
    source?: string;
    selector?: { type: 'PointSelector'; t?: number };
  }

  export interface StartPropertyEditorProps {
    /** Current start value */
    value?: StartValue;
    /** Available canvases to select from */
    canvases: import('@/src/shared/types').IIIFCanvas[];
    /** Called when start changes */
    onChange: (start: StartValue | undefined) => void;
    /** Field mode styling */
    fieldMode?: boolean;
    /** Whether editing is disabled */
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { getIIIFValue } from '@/src/shared/types';
  import type { IIIFCanvas } from '@/src/shared/types';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  let {
    value,
    canvases,
    onChange,
    fieldMode = false,
    disabled = false,
  }: StartPropertyEditorProps = $props();

  let showTimePicker = $state(false);
  let timeValue = $state('');

  // Sync timeValue from incoming value prop (e.g. when resource changes)
  $effect(() => {
    if (value?.type === 'SpecificResource' && value.selector?.t !== undefined) {
      timeValue = value.selector.t.toString();
    } else {
      timeValue = '';
    }
  });

  let selectedCanvas = $derived(
    canvases.find(c =>
      c.id === (value?.type === 'Canvas' ? value.id : value?.source)
    )
  );

  let hasTimeSupport = $derived(
    selectedCanvas ? ((selectedCanvas as IIIFCanvas & { duration?: number }).duration ?? 0) > 0 : false
  );

  let canvasDuration = $derived(
    (selectedCanvas as (IIIFCanvas & { duration?: number }) | undefined)?.duration ?? 0
  );

  function handleCanvasSelect(e: Event) {
    const select = e.currentTarget as HTMLSelectElement;
    const canvasId = select.value;
    if (!canvasId) {
      onChange(undefined);
      return;
    }
    onChange({ id: canvasId, type: 'Canvas' });
  }

  function handleTimeSet() {
    if (!selectedCanvas || !timeValue.trim()) return;
    const t = parseFloat(timeValue);
    if (isNaN(t)) return;

    onChange({
      id: `${selectedCanvas.id}#t=${t}`,
      type: 'SpecificResource',
      source: selectedCanvas.id,
      selector: { type: 'PointSelector', t },
    });
  }

  let selectClass = $derived(cn(
    'flex-1 text-sm border px-2 py-1.5 outline-none',
    fieldMode
      ? 'bg-nb-black border-nb-black/60 text-white'
      : 'bg-nb-white border-nb-black/20 text-nb-black/80',
    disabled && 'opacity-50 cursor-not-allowed'
  ));

  let currentCanvasId = $derived(
    value?.type === 'Canvas' ? value.id : (value?.source ?? '')
  );
</script>

<div class="space-y-2">
  <!-- Section header -->
  <div class={cn(
    'flex items-center gap-1.5',
    fieldMode ? 'text-nb-black/40' : 'text-nb-black/50'
  )}>
    <Icon name="start" class="text-sm" />
    <span class="text-xs font-semibold uppercase tracking-wider">Start Canvas</span>
  </div>

  <!-- Canvas dropdown -->
  <div class="flex gap-2">
    <select
      value={currentCanvasId}
      onchange={handleCanvasSelect}
      {disabled}
      class={selectClass}
    >
      <option value="">No start canvas</option>
      {#each canvases as canvas, i (canvas.id)}
        <option value={canvas.id}>
          {i + 1}. {getIIIFValue(canvas.label) || 'Untitled'}
        </option>
      {/each}
    </select>

    {#if value && !disabled}
      <Button
        variant="ghost"
        size="bare"
        onclick={() => onChange(undefined)}
        title="Clear start"
        aria-label="Clear start canvas"
        class="p-1"
      >
        <Icon name="close" class="text-sm text-nb-red" />
      </Button>
    {/if}
  </div>

  <!-- Time offset picker (only for AV canvases with duration) -->
  {#if selectedCanvas && hasTimeSupport && !disabled}
    <div class="pl-2">
      {#if showTimePicker}
        <div class="flex gap-2 items-end">
          <div class="flex-1">
            <label
              for="start-time-input"
              class={cn(
                'block text-[10px] font-bold mb-1 uppercase tracking-wider',
                fieldMode ? 'text-nb-yellow/60' : 'text-nb-black/40'
              )}
            >
              Start time (0–{canvasDuration}s)
            </label>
            <input
              id="start-time-input"
              type="number"
              bind:value={timeValue}
              min={0}
              max={canvasDuration}
              step={0.1}
              class={cn(
                'w-full text-sm border px-2 py-1.5 outline-none',
                fieldMode
                  ? 'bg-nb-black border-nb-black/60 text-white'
                  : 'bg-nb-white border-nb-black/20 text-nb-black/80'
              )}
            />
          </div>
          <Button variant="primary" size="sm" onclick={handleTimeSet}>Set</Button>
          <Button variant="ghost" size="sm" onclick={() => { showTimePicker = false; }}>
            Cancel
          </Button>
        </div>
      {:else}
        <Button
          variant="ghost"
          size="sm"
          onclick={() => { showTimePicker = true; }}
        >
          <Icon name="schedule" class="text-sm mr-1" />
          Set start time
          {#if value?.type === 'SpecificResource' && value.selector?.t !== undefined}
            <span class={cn('ml-1', fieldMode ? 'text-nb-yellow' : 'text-nb-blue')}>
              (t={value.selector.t}s)
            </span>
          {/if}
        </Button>
      {/if}
    </div>
  {/if}
</div>
