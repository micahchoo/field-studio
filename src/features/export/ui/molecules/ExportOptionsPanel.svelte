<!--
  ExportOptionsPanel.svelte — Step 2 options dispatcher for export wizard
  ========================================================================
  Delegates to ExportArchivalConfigPanel or ExportCanopyConfigPanel
  depending on the active format/step.

  FSD Layer: features/export/ui/molecules
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { CanopyConfig, ImageApiOptions } from '../../model/exportService';
  import type { ArchivalPackageOptions } from '../../model/archivalPackageService';

  import ExportArchivalConfigPanel from './ExportArchivalConfigPanel.svelte';
  import ExportCanopyConfigPanel from './ExportCanopyConfigPanel.svelte';

  type OptionsStep = 'canopy-config' | 'archival-config';

  interface Props {
    step: OptionsStep;
    format: 'ocfl' | 'bagit' | 'canopy';
    cx: ContextualClassNames;
    fieldMode?: boolean;
    canopyConfig: CanopyConfig;
    imageApiOptions: ImageApiOptions;
    manifestList: { id: string; label: string }[];
    onCanopyConfigChange: (config: CanopyConfig) => void;
    onImageApiOptionsChange: (options: ImageApiOptions) => void;
    archivalConfig: Partial<ArchivalPackageOptions>;
    onArchivalConfigChange: (config: Partial<ArchivalPackageOptions>) => void;
  }

  let {
    step,
    format,
    cx,
    fieldMode = false,
    canopyConfig,
    imageApiOptions,
    manifestList,
    onCanopyConfigChange,
    onImageApiOptionsChange,
    archivalConfig,
    onArchivalConfigChange,
  }: Props = $props();
</script>

{#if step === 'archival-config' && (format === 'ocfl' || format === 'bagit')}
  <ExportArchivalConfigPanel
    {format}
    {archivalConfig}
    {onArchivalConfigChange}
    {cx}
    {fieldMode}
  />
{:else if step === 'canopy-config'}
  <ExportCanopyConfigPanel
    {canopyConfig}
    {imageApiOptions}
    {manifestList}
    {onCanopyConfigChange}
    {onImageApiOptionsChange}
    {cx}
    {fieldMode}
  />
{/if}
