<!--
  ViewerEmptyState.svelte -- Guided empty state for the viewer
  React source: src/features/viewer/ui/molecules/ViewerEmptyState.tsx
  Layer: molecule (FSD features/viewer/ui/molecules)

  Displays when no canvas is selected. Provides workflow guidance based on
  whether the project has content loaded. Uses GuidanceEmptyState pattern.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import GuidanceEmptyState from '@/src/shared/ui/molecules/GuidanceEmptyState.svelte';

  interface Props {
    t: (key: string) => string;
    hasContent?: boolean;
    message?: string;
    onGoToArchive?: () => void;
    onImport?: () => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    t,
    hasContent = false,
    message,
    onGoToArchive,
    onImport,
    cx,
    fieldMode,
  }: Props = $props();

  let canvasTerm = $derived(t('Canvas'));
  let archiveTerm = $derived(t('Archive'));

  let title = $derived(
    message || `Select a ${canvasTerm}`
  );

  let description = $derived(
    hasContent
      ? `Choose a ${canvasTerm.toLowerCase()} from the ${archiveTerm.toLowerCase()} to view it here`
      : `Your ${archiveTerm.toLowerCase()} is empty. Import files to get started.`
  );

  let steps = $derived.by(() => {
    if (hasContent) {
      return [
        { icon: 'folder_open', text: `Go to ${archiveTerm} to see your content` },
        { icon: 'touch_app', text: `Select a ${canvasTerm.toLowerCase()} to view it` },
        { icon: 'visibility', text: 'See the full image and metadata here' },
      ];
    }
    return [
      { icon: 'upload', text: 'Add photos, videos, or documents' },
      { icon: 'folder', text: 'Arrange into albums and groups' },
      { icon: 'visibility', text: 'Open items in the viewer' },
    ];
  });

  let tip = $derived(
    hasContent
      ? `Tip: You can also double-click any ${canvasTerm.toLowerCase()} to open it directly`
      : 'Tip: Drag and drop a folder to quickly import multiple files'
  );
</script>

<GuidanceEmptyState
  icon="image"
  {title}
  {description}
  {steps}
  {cx}
>
  {#snippet action()}
    <div class="flex flex-col items-center gap-3">
      <!-- Action buttons -->
      <div class="flex items-center gap-3">
        {#if !hasContent && onImport}
          <Button variant="primary" onclick={onImport}>
            {#snippet icon()}
              <Icon name="upload" class="text-base" />
            {/snippet}
            {#snippet children()}
              Import Your First Files
            {/snippet}
          </Button>
        {/if}

        {#if onGoToArchive}
          <Button
            variant={hasContent ? 'primary' : 'ghost'}
            onclick={onGoToArchive}
          >
            {#snippet icon()}
              <Icon name="folder_open" class="text-base" />
            {/snippet}
            {#snippet children()}
              {hasContent ? `Browse ${archiveTerm}` : `Go to ${archiveTerm}`}
            {/snippet}
          </Button>
        {/if}

        {#if hasContent && onImport}
          <Button variant="ghost" onclick={onImport}>
            {#snippet icon()}
              <Icon name="add" class="text-base" />
            {/snippet}
            {#snippet children()}
              Import More
            {/snippet}
          </Button>
        {/if}
      </div>

      <!-- Tip -->
      <p class={cn(
        'text-xs font-mono mt-2 max-w-sm text-center',
        fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/40'
      )}>
        {tip}
      </p>
    </div>
  {/snippet}
</GuidanceEmptyState>
