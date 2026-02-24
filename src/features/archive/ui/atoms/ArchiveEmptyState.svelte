<!--
  ArchiveEmptyState Atom
  =======================
  Empty state with onboarding guidance for the archive view.
  Extracted from ArchiveView organism.
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/ui/molecules/ViewHeader/types';
  import GuidanceEmptyState from '@/src/shared/ui/molecules/GuidanceEmptyState.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    cx: ContextualClassNames;
    fieldMode?: boolean;
    t: (key: string) => string;
    onOpenImport: () => void;
    onOpenExternalImport: () => void;
  }

  let {
    cx,
    t,
    onOpenImport,
    onOpenExternalImport,
  }: Props = $props();

  const steps = $derived([
    { icon: 'upload', text: `Add photos, videos, or documents to your ${t('Archive').toLowerCase()}` },
    { icon: 'folder', text: `Structure items into ${t('Collection')}s and ${t('Manifest')}s` },
    { icon: 'download', text: `Share your archive as IIIF or publish online` },
  ]);
</script>

<GuidanceEmptyState
  icon="inventory_2"
  title="Welcome to Field Studio"
  description={`Create, organize, and publish ${t('Archive').toLowerCase()}s. Start by importing your media files.`}
  {steps}
  {cx}
>
  {#snippet action()}
    <div class="flex items-center gap-3">
      <Button variant="primary" size="base" onclick={onOpenImport}>
        {#snippet icon()}
          <Icon name="folder_open" class="text-lg" />
        {/snippet}
        {t('Ingest')} Folder
      </Button>
      <Button variant="secondary" size="base" onclick={onOpenExternalImport}>
        {#snippet icon()}
          <Icon name="link" class="text-lg" />
        {/snippet}
        {t('Ingest')} from URL
      </Button>
    </div>
  {/snippet}
</GuidanceEmptyState>
