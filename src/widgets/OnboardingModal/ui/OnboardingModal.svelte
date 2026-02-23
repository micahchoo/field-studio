<!--
  OnboardingModal - Two-screen wizard for first-time users.
  Screen 1: Welcome with feature highlights + "Get Started" (defaults to 'simple').
  Screen 2: ExperienceSelector widget for customizing experience level.

  React source: 189 lines -> ~160 lines Svelte
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Button } from '@/src/shared/ui/atoms';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import type { AbstractionLevel } from '@/src/shared/types';
  import ExperienceSelector from '@/src/widgets/ExperienceSelector/ExperienceSelector.svelte';

  // --- Props ---
  interface Props {
    onComplete: (level: AbstractionLevel) => void;
  }

  let { onComplete }: Props = $props();

  // --- Local State ---
  let showExpertise: boolean = $state(false);
  let selectedLevel: AbstractionLevel = $state('standard');

  // --- Derived ---
  let selectedLabel = $derived.by(() => {
    const level = selectedLevel as AbstractionLevel;
    return level === 'simple' ? 'Essential' : level === 'standard' ? 'Complete' : 'Expert';
  });

  // --- Handlers ---
  function handleQuickStart() {
    onComplete('simple');
  }

  function handleSelectLevel(level: AbstractionLevel) {
    selectedLevel = level;
  }

  function handleConfirmSelection() {
    onComplete(selectedLevel);
  }

  function handleSkipSelection() {
    onComplete('standard');
  }

  // --- Feature list data (static) ---
  const features = [
    { icon: 'folder', color: 'nb-green', title: 'Drag folders to import', desc: 'Structure is preserved automatically' },
    { icon: 'photo_camera', color: 'nb-blue', title: 'Metadata extracted', desc: 'GPS, dates, and camera info captured' },
    { icon: 'public', color: 'nb-purple', title: 'Export to web', desc: 'One-click shareable websites' },
  ] as const;
</script>

<!-- Fullscreen overlay backdrop -->
<div class="fixed inset-0 bg-nb-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
  <div class="bg-nb-white max-w-4xl w-full shadow-brutal-lg overflow-hidden border border-nb-black/20">

    {#if !showExpertise}
      <!-- SCREEN 1: Welcome -->
      <div class="p-8 animate-in fade-in">
        <!-- Hero icon + heading -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-nb-blue/100 to-nb-blue mb-4 text-white shadow-brutal">
            <Icon name="auto_awesome" class="text-2xl" />
          </div>
          <h1 class="text-2xl font-bold text-nb-black mb-2">Welcome to Field Studio</h1>
          <p class="text-nb-black/50 text-sm leading-relaxed">
            Turn your files into organized, shareable digital archives.
          </p>
        </div>

        <!-- Feature highlights -->
        <div class="space-y-3 mb-8">
          {#each features as feat}
            <div class="flex items-start gap-3 p-3 bg-nb-white">
              <div class={cn('w-8 h-8 flex items-center justify-center shrink-0', `bg-${feat.color}/20`)}>
                <Icon name={feat.icon} class={cn('text-sm', `text-${feat.color}`)} />
              </div>
              <div>
                <p class="text-sm font-medium text-nb-black/80">{feat.title}</p>
                <p class="text-xs text-nb-black/40">{feat.desc}</p>
              </div>
            </div>
          {/each}
        </div>

        <!-- Actions -->
        <div class="space-y-3">
          <Button variant="ghost" size="bare"
            onclick={handleQuickStart}
            class="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-3 font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-nb flex items-center justify-center gap-2 shadow-brutal hover:shadow-brutal"
          >
            Get Started (Essential Mode)
            <Icon name="arrow_forward" />
          </Button>
          <Button variant="ghost" size="bare"
            onclick={() => showExpertise = true}
            class="w-full text-nb-black/60 px-6 py-3 text-sm hover:text-nb-black hover:bg-nb-white transition-nb border border-nb-black/20 hover:border-nb-black/20"
          >
            <div class="flex items-center justify-center gap-2">
              <Icon name="tune" class="text-nb-black/40" />
              Customize my experience level
            </div>
          </Button>
        </div>

        <!-- Help hint -->
        <p class="text-center text-[10px] text-nb-black/40 mt-6">
          Press <kbd class="px-1.5 py-0.5 bg-nb-cream text-[9px] font-mono">?</kbd> anytime for help
        </p>
      </div>

    {:else}
      <!-- SCREEN 2: Experience Selection -->
      <div class="p-8 animate-in slide-in-from-right-4">
        <!-- Back + step indicator -->
        <div class="flex items-center justify-between mb-6">
          <Button variant="ghost" size="bare"
            onclick={() => showExpertise = false}
            class="flex items-center gap-2 text-nb-black/50 hover:text-nb-black/80 text-sm px-3 py-1.5 hover:bg-nb-white transition-nb"
          >
            <Icon name="arrow_back" class="text-sm" />
            Back to welcome
          </Button>
          <div class="text-sm text-nb-black/50">Step 2 of 2</div>
        </div>

        <!-- ExperienceSelector widget -->
        <div class="mb-8">
          <ExperienceSelector
            selectedLevel={selectedLevel}
            onSelect={handleSelectLevel}
            showSkipOption={true}
            onSkip={handleSkipSelection}
            showFeatureComparison={true}
          />
        </div>

        <!-- Confirmation footer -->
        <div class="flex items-center justify-between pt-6 border-t border-nb-black/20">
          <div class="text-sm text-nb-black/50">
            Selected: <span class="font-semibold text-nb-black/80">{selectedLabel}</span>
          </div>
          <div class="flex items-center gap-3">
            <Button variant="ghost" size="bare"
              onclick={handleSkipSelection}
              class="px-4 py-2 text-sm text-nb-black/50 hover:text-nb-black/80 hover:bg-nb-white transition-nb"
            >
              Skip for now
            </Button>
            <Button variant="ghost" size="bare"
              onclick={handleConfirmSelection}
              class="px-6 py-2.5 bg-gradient-to-r from-nb-blue/100 to-nb-blue text-white font-semibold hover:from-nb-blue hover:to-nb-blue transition-nb shadow-brutal-sm hover:shadow-brutal"
            >
              Continue with {selectedLabel}
            </Button>
          </div>
        </div>

        <!-- Guidance box -->
        <div class="mt-6 p-4 bg-nb-blue/10 border border-nb-blue/20">
          <div class="flex items-start gap-3">
            <Icon name="lightbulb" class="text-nb-blue text-lg mt-0.5" />
            <div>
              <p class="text-sm font-medium text-nb-blue mb-1">Not sure which to choose?</p>
              <p class="text-xs text-nb-blue">
                <strong>Essential</strong> is perfect for quick organization.
                <strong>Complete</strong> adds full metadata control.
                <strong>Expert</strong> is for IIIF specialists. You can change this anytime in Settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    {/if}

  </div>
</div>
