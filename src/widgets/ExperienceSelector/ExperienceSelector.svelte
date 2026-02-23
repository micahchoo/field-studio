<!--
  ExperienceSelector - Three-card experience level picker.
  Cards: Essential (simple), Complete (standard), Expert (advanced).
  Each card: complexity dots, feature list, color-coded selection indicator.
  Optional "Help me choose" preview panel.

  React source: 337 lines -> ~280 lines Svelte
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Button } from '@/src/shared/ui/atoms';
  import type { AbstractionLevel } from '@/src/shared/types';

  // --- Props ---
  interface Props {
    /** Currently selected level */
    selectedLevel: AbstractionLevel;
    /** Callback when selection changes */
    onSelect: (level: AbstractionLevel) => void;
    /** Whether to show the "Skip for now" option */
    showSkipOption?: boolean;
    /** Callback when user skips selection */
    onSkip?: () => void;
    /** Whether to show detailed feature comparison */
    showFeatureComparison?: boolean;
  }

  let {
    selectedLevel,
    onSelect,
    showSkipOption = true,
    onSkip,
    showFeatureComparison = true,
  }: Props = $props();

  // --- Types ---
  interface ExperienceOption {
    level: AbstractionLevel;
    title: string;
    subtitle: string;
    tagline: string;
    description: string;
    features: string[];
    color: { primary: string; light: string; dark: string };
    complexity: number; // 1-3
    icon: string;
  }

  // --- Static Data ---
  const EXPERIENCE_OPTIONS: ExperienceOption[] = [
    {
      level: 'simple',
      title: 'Essential',
      subtitle: 'Quick & Intuitive',
      tagline: 'Clean interface for fast photo organization',
      description: 'Perfect for photographers, archivists, and anyone who wants to organize media without technical complexity.',
      features: [
        'Drag & drop import',
        'Basic metadata editing',
        'Auto-generated galleries',
        'One-click exports',
        'Simplified terminology',
      ],
      color: { primary: '#10b981', light: '#d1fae5', dark: '#059669' },
      complexity: 1,
      icon: '\u{1F3AF}', // target emoji
    },
    {
      level: 'standard',
      title: 'Complete',
      subtitle: 'Full Featured',
      tagline: 'Everything you need for professional archiving',
      description: 'For librarians, curators, and professionals who need full metadata control and IIIF compliance.',
      features: [
        'Everything in Essential',
        'Batch editing & workflows',
        'Full IIIF metadata fields',
        'Advanced search & filtering',
        'Custom field templates',
      ],
      color: { primary: '#3b82f6', light: '#dbeafe', dark: '#1d4ed8' },
      complexity: 2,
      icon: '\u{1F4CB}', // clipboard emoji
    },
    {
      level: 'advanced',
      title: 'Expert',
      subtitle: 'Maximum Control',
      tagline: 'Advanced IIIF control and custom options',
      description: 'For developers, IIIF specialists, and technical users who need JSON editing and custom workflows.',
      features: [
        'Everything in Complete',
        'Raw JSON-LD editing',
        'Custom ID patterns',
        'API & scripting access',
        'Advanced validation',
      ],
      color: { primary: '#8b5cf6', light: '#ede9fe', dark: '#7c3aed' },
      complexity: 3,
      icon: '\u{26A1}', // lightning emoji
    },
  ];

  const ELEVATION_SM = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';

  // --- Local State ---
  let showHelp: boolean = $state(false);
  let helpOption: AbstractionLevel | null = $state(null);

  // --- Derived ---
  let helpOptionData = $derived(
    helpOption ? EXPERIENCE_OPTIONS.find(o => o.level === helpOption) ?? null : null
  );

  // --- Handlers ---
  function handleOptionClick(option: ExperienceOption) {
    onSelect(option.level);
    if (showHelp) {
      helpOption = option.level;
    }
  }

  function handleHelpClick() {
    showHelp = !showHelp;
    if (showHelp) {
      helpOption = selectedLevel;
    }
  }

  // --- Helpers ---
  function complexityLabel(n: number): string {
    return n === 1 ? 'Easy' : n === 2 ? 'Medium' : 'Advanced';
  }
</script>

<!-- Inline sub-components via snippets -->

{#snippet complexityDots(complexity: number, activeColor: string)}
  <div class="flex items-center gap-1">
    {#each [1, 2, 3] as dot}
      <div
        class="w-2 h-2 transition-nb"
        style:background-color={dot <= complexity ? activeColor : '#e5e5e5'}
        style:transform={dot <= complexity ? 'scale(1.1)' : 'scale(0.9)'}
      ></div>
    {/each}
    <span class="text-xs ml-1 text-nb-black/40">{complexityLabel(complexity)}</span>
  </div>
{/snippet}

{#snippet helpPreview(option: ExperienceOption)}
  <div
    class="mt-4 p-4 border"
    style:border-color={option.color.light}
    style:background-color="{option.color.light}20"
  >
    <div class="flex items-center justify-between mb-2">
      <h4 class="font-semibold" style:color={option.color.dark}>Preview: {option.title} Mode</h4>
      <span class="text-sm text-nb-black/50">UI will show:</span>
    </div>
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3" style:background-color={option.color.primary}></div>
        <span class="text-sm">Simplified toolbar with 5-7 main actions</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3" style:background-color={option.color.primary}></div>
        <span class="text-sm">{option.complexity === 1 ? 'Friendly labels' : 'Technical terminology'}</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-3 h-3" style:background-color={option.color.primary}></div>
        <span class="text-sm">{option.complexity === 3 ? 'JSON editor visible' : 'Guided forms'}</span>
      </div>
    </div>
    <div class="mt-3 text-xs text-nb-black/40">
      You can change this anytime in Settings &rarr; Experience Level
    </div>
  </div>
{/snippet}

<!-- Main layout -->
<div class="space-y-6">
  <!-- Header -->
  <div class="text-center">
    <h2 class="text-2xl font-bold text-nb-black">Choose Your Experience Level</h2>
    <p class="mt-2 text-sm text-nb-black/50">
      Tailor the interface to your expertise. This affects which tools and options are visible.
    </p>
    <div class="mt-3 flex items-center justify-center gap-4">
      <Button variant="ghost" size="bare"
        onclick={handleHelpClick}
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-nb hover:bg-nb-white text-nb-blue border-nb-blue/30"
      >
        <span class="text-base">{'\u{1F4A1}'}</span>
        {showHelp ? 'Hide help' : 'Help me choose'}
      </Button>
      {#if showSkipOption && onSkip}
        <Button variant="ghost" size="bare"
          onclick={onSkip}
          class="text-sm px-3 py-1.5 text-nb-black/50 hover:text-nb-black/80 hover:bg-nb-white transition-nb"
        >
          Skip for now (uses Complete)
        </Button>
      {/if}
    </div>
  </div>

  <!-- Options Grid -->
  <div class="grid gap-4 md:grid-cols-3">
    {#each EXPERIENCE_OPTIONS as option (option.level)}
      {@const isSelected = selectedLevel === option.level}
      <button
        type="button"
        class="relative text-left border-2 p-5 transition-nb hover:scale-[1.02] active:scale-[0.99] cursor-pointer"
        style:border-color={isSelected ? option.color.primary : '#e5e5e5'}
        style:background-color={isSelected ? `${option.color.light}30` : '#fafafa'}
        style:box-shadow={isSelected
          ? `0 10px 25px -5px ${option.color.primary}20, 0 4px 6px -4px ${option.color.primary}10`
          : ELEVATION_SM}
        onclick={() => handleOptionClick(option)}
      >
        <!-- Selection radio indicator -->
        <div class="absolute top-4 right-4">
          <div
            class="w-6 h-6 border-2 flex items-center justify-center transition-nb"
            style:border-color={isSelected ? option.color.primary : '#e5e5e5'}
            style:background-color={isSelected ? option.color.primary : 'transparent'}
          >
            {#if isSelected}
              <svg class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
              </svg>
            {/if}
          </div>
        </div>

        <!-- Icon + title row -->
        <div class="flex items-start gap-3 mb-4">
          <div
            class="w-12 h-12 flex items-center justify-center text-2xl"
            style:background-color="{option.color.primary}15"
          >
            {option.icon}
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-lg text-nb-black">{option.title}</h3>
              {@render complexityDots(option.complexity, option.color.primary)}
            </div>
            <p class="text-sm mt-1" style:color={option.color.dark}>{option.subtitle}</p>
          </div>
        </div>

        <!-- Tagline + description -->
        <p class="font-medium mb-2 text-nb-black">{option.tagline}</p>
        <p class="text-sm mb-4 text-nb-black/50">{option.description}</p>

        <!-- Feature list -->
        {#if showFeatureComparison}
          <ul class="space-y-1.5 mb-4">
            {#each option.features as feature}
              <li class="flex items-start gap-2">
                <div
                  class="w-1.5 h-1.5 mt-1.5 flex-shrink-0"
                  style:background-color={option.color.primary}
                ></div>
                <span class="text-sm text-nb-black/50">{feature}</span>
              </li>
            {/each}
          </ul>
        {/if}

        <!-- Selected bottom bar -->
        {#if isSelected}
          <div
            class="absolute bottom-0 left-0 right-0 h-1 transition-nb"
            style:background-color={option.color.primary}
          ></div>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Help preview panel -->
  {#if showHelp && helpOptionData}
    <div class="mt-6 animate-in fade-in">
      {@render helpPreview(helpOptionData)}
    </div>
  {/if}

  <!-- Footer tip -->
  <div class="text-center pt-4 border-t border-nb-black/10">
    <p class="text-xs text-nb-black/40">
      <strong>Tip:</strong> Start with Essential if you're new to IIIF. You can always switch later in Settings.
      All your data and work are preserved when changing levels.
    </p>
  </div>
</div>
