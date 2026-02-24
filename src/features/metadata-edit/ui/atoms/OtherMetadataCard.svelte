<!--
  OtherMetadataCard -- Editable metadata field card with label, value, DC hint, and remove button.
  Extracted from MetadataTabPanel molecule.
  Architecture: Atom (composes Button + Icon)
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    label: string;
    value: string;
    dcHint: string | null;
    onLabelChange: (newLabel: string) => void;
    onValueChange: (newValue: string) => void;
    onRemove: () => void;
    fieldMode?: boolean;
  }

  let {
    label, value, dcHint,
    onLabelChange, onValueChange, onRemove,
    fieldMode = false,
  }: Props = $props();
</script>

<div
  class={cn(
    'p-3 border group transition-nb',
    fieldMode
      ? 'bg-nb-black/50 border-nb-black/70 hover:border-nb-black/60'
      : 'bg-nb-cream border-nb-black/10 hover:border-nb-black/20'
  )}
>
  <!-- Editable label row -->
  <div class="flex items-center gap-2 mb-2">
    <input
      type="text"
      value={label}
      oninput={(e) => onLabelChange((e.target as HTMLInputElement).value)}
      class={cn(
        'text-sm font-medium bg-transparent border-b border-transparent',
        'hover:border-nb-black/40 focus:border-nb-orange focus:outline-none flex-1',
        fieldMode ? 'text-nb-black/20' : 'text-nb-black/70'
      )}
      placeholder="Field name"
    />
    {#if dcHint}
      <span class={cn(
        'text-[10px] px-1.5 py-0.5',
        fieldMode ? 'bg-nb-black/70 text-nb-black/40' : 'bg-nb-black/10 text-nb-black/60'
      )}>
        {dcHint}
      </span>
    {/if}
    <Button
      variant="ghost"
      size="bare"
      onclick={onRemove}
      class={cn(
        'opacity-0 group-hover:opacity-100 transition-nb p-1 hover:bg-nb-red/20 hover:text-nb-red',
        fieldMode ? 'text-nb-black/50' : 'text-nb-black/40'
      )}
      title="Remove field"
    >
      {#snippet children()}
        <Icon name="close" class="text-xs" />
      {/snippet}
    </Button>
  </div>

  <!-- Editable value row -->
  <input
    type="text"
    value={value}
    oninput={(e) => onValueChange((e.target as HTMLInputElement).value)}
    class={cn(
      'w-full text-sm bg-transparent border-b border-transparent',
      'hover:border-nb-black/20 focus:border-nb-orange focus:outline-none',
      fieldMode ? 'text-nb-black/40' : 'text-nb-black/60'
    )}
    placeholder="Enter value..."
  />
</div>
