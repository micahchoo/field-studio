<script module lang="ts">
  export const THEME_COLORS = {
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-400', hover: 'hover:bg-yellow-200', selected: 'bg-yellow-300' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-400', hover: 'hover:bg-purple-200', selected: 'bg-purple-300' },
    blue: { bg: 'bg-blue-100', border: 'border-blue-400', hover: 'hover:bg-blue-200', selected: 'bg-blue-300' },
    green: { bg: 'bg-green-100', border: 'border-green-400', hover: 'hover:bg-green-200', selected: 'bg-green-300' },
  } as const;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Icon from '../atoms/Icon.svelte';

  interface Option {
    value: string;
    label: string;
    description?: string;
  }

  type ThemeColor = keyof typeof THEME_COLORS;

  interface Props {
    options: Option[];
    value?: string;
    placeholder?: string;
    themeColor?: ThemeColor;
    showDescriptions?: boolean;
    cx: ContextualClassNames;
    fieldMode?: boolean;
    class?: string;
  }

  let {
    options,
    value = $bindable(''),
    placeholder = 'Select an option',
    themeColor = 'blue',
    showDescriptions = false,
    cx,
    fieldMode = false,
    class: className = ''
  }: Props = $props();

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement | undefined = $state();

  const selectedOption = $derived(options.find(opt => opt.value === value));
  const displayText = $derived(selectedOption?.label || placeholder);
  const theme = $derived(THEME_COLORS[themeColor]);

  function toggleDropdown() { isOpen = !isOpen; }

  function handleSelect(optionValue: string) {
    value = optionValue;
    isOpen = false;
  }

  // Click-outside
  $effect(() => {
    if (!isOpen || !dropdownRef) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef && !dropdownRef.contains(e.target as Node)) isOpen = false;
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') isOpen = false;
    else if ((e.key === 'Enter' || e.key === ' ') && !isOpen) {
      e.preventDefault();
      toggleDropdown();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div bind:this={dropdownRef} class={cn('relative', className)} onkeydown={handleKeydown} role="group">
  <button aria-label={displayText}
    type="button"
    class={cn(
      'w-full px-4 py-2 border-2 flex items-center justify-between cursor-pointer',
      theme.bg, theme.border
    )}
    onclick={toggleDropdown}
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    <span class="truncate">{displayText}</span>
    <Icon name="expand_more" class={cn('text-base transition-transform', isOpen && 'rotate-180')} />
  </button>

  {#if isOpen}
    <div
      class={cn('absolute z-50 w-full mt-1 border-2 shadow-lg max-h-60 overflow-y-auto', theme.bg, theme.border)}
      role="listbox"
    >
      {#each options as option (option.value)}
        <button aria-label={option.label}
          type="button"
          class={cn(
            'w-full px-4 py-2 text-left flex flex-col cursor-pointer border-0 bg-transparent',
            theme.hover,
            option.value === value && theme.selected
          )}
          onclick={() => handleSelect(option.value)}
          role="option"
          aria-selected={option.value === value}
        >
          <span class="font-medium">{option.label}</span>
          {#if showDescriptions && option.description}
            <span class="text-xs text-gray-600 mt-1">{option.description}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
