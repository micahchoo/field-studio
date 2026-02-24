<!--
  ExportArchivalConfigPanel.svelte — OCFL/BagIt package configuration
  =====================================================================
  Extracted from ExportOptionsPanel. Renders the form fields for
  configuring OCFL or BagIt archival preservation packages.

  FSD Layer: features/export/ui/molecules
-->
<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { ArchivalPackageOptions } from '../../model/archivalPackageService';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    format: 'ocfl' | 'bagit';
    archivalConfig: Partial<ArchivalPackageOptions>;
    onArchivalConfigChange: (config: Partial<ArchivalPackageOptions>) => void;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { format, archivalConfig, onArchivalConfigChange, cx, fieldMode = false }: Props = $props();
</script>

<div class="space-y-6 animate-in slide-in-from-right-4">
  <div class="text-center mb-6">
    <Icon name={format === 'ocfl' ? 'inventory_2' : 'shopping_bag'} class={cn('text-4xl mb-2', format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple')} />
    <h3 class="text-lg font-bold text-nb-black">
      {format === 'ocfl' ? 'OCFL Package Settings' : 'BagIt Bag Settings'}
    </h3>
    <p class="text-sm text-nb-black/50">Configure your digital preservation package</p>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="field-digest-algo" class="block text-sm font-bold text-nb-black/80 mb-1">Digest Algorithm</label>
      <select
        id="field-digest-algo"
        value={archivalConfig.digestAlgorithm}
        onchange={(e) => onArchivalConfigChange({ ...archivalConfig, digestAlgorithm: e.currentTarget.value as 'sha256' | 'sha512' })}
        class="w-full border p-2 text-sm"
      >
        <option value="sha256">SHA-256 (Recommended)</option>
        <option value="sha512">SHA-512</option>
      </select>
    </div>
    <div>
      <label for="field-organization" class="block text-sm font-bold text-nb-black/80 mb-1">Organization</label>
      <input id="field-organization" type="text"
        value={archivalConfig.organization ?? ''}
        oninput={(e) => onArchivalConfigChange({ ...archivalConfig, organization: e.currentTarget.value })}
        class="w-full border p-2 text-sm" placeholder="Your Institution"
      />
    </div>
  </div>

  <div>
    <label for="field-description" class="block text-sm font-bold text-nb-black/80 mb-1">Description</label>
    <textarea id="field-description"
      value={archivalConfig.description ?? ''}
      oninput={(e) => onArchivalConfigChange({ ...archivalConfig, description: e.currentTarget.value })}
      class="w-full border p-2 text-sm" rows="2" placeholder="Description of this archival package..."
    ></textarea>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="field-external-id" class="block text-sm font-bold text-nb-black/80 mb-1">External Identifier</label>
      <input id="field-external-id" type="text"
        value={archivalConfig.externalId ?? ''}
        oninput={(e) => onArchivalConfigChange({ ...archivalConfig, externalId: e.currentTarget.value })}
        class="w-full border p-2 text-sm" placeholder="Optional external ID"
      />
    </div>
    <div>
      <label for="field-version-msg" class="block text-sm font-bold text-nb-black/80 mb-1">Version Message</label>
      <input id="field-version-msg" type="text"
        value={archivalConfig.versionMessage ?? ''}
        oninput={(e) => onArchivalConfigChange({ ...archivalConfig, versionMessage: e.currentTarget.value })}
        class="w-full border p-2 text-sm" placeholder="Initial version"
      />
    </div>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <label for="field-user-name" class="block text-sm font-bold text-nb-black/80 mb-1">User Name</label>
      <input id="field-user-name" type="text"
        value={archivalConfig.user?.name || ''}
        oninput={(e) => onArchivalConfigChange({ ...archivalConfig, user: { ...archivalConfig.user, name: e.currentTarget.value } })}
        class="w-full border p-2 text-sm" placeholder="Your name"
      />
    </div>
    <div>
      <label for="field-user-email" class="block text-sm font-bold text-nb-black/80 mb-1">User Email</label>
      <input id="field-user-email" type="email"
        value={archivalConfig.user?.email || ''}
        oninput={(e) => onArchivalConfigChange({ ...archivalConfig, user: { name: archivalConfig.user?.name ?? '', ...archivalConfig.user, email: e.currentTarget.value } })}
        class="w-full border p-2 text-sm" placeholder="your@email.com"
      />
    </div>
  </div>

  <label class="flex items-center gap-3 cursor-pointer p-4 bg-nb-white border">
    <input type="checkbox"
      checked={archivalConfig.includeMedia ?? true}
      onchange={(e) => onArchivalConfigChange({ ...archivalConfig, includeMedia: e.currentTarget.checked })}
      class={format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple'}
    />
    <div>
      <span class="text-sm font-bold text-nb-black/80">Include Media Files</span>
      <p class="text-xs text-nb-black/50">Bundle original images/audio/video with the package</p>
    </div>
  </label>

  <div class={cn('p-4 border', format === 'ocfl' ? 'bg-nb-orange/10 border-nb-orange/20' : 'bg-nb-purple/5 border-nb-purple/20')}>
    <div class={cn('flex items-center gap-2 font-bold text-sm mb-2', format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple')}>
      <Icon name="info" /> About {format === 'ocfl' ? 'OCFL' : 'BagIt'}
    </div>
    <p class={cn('text-xs', format === 'ocfl' ? 'text-nb-orange' : 'text-nb-purple')}>
      {#if format === 'ocfl'}
        OCFL (Oxford Common File Layout) is a specification for storing digital objects in repositories with versioning, fixity, and long-term preservation in mind.
      {:else}
        BagIt is a hierarchical file packaging format for storage and transfer of arbitrary digital content. It includes manifest files with checksums for integrity verification.
      {/if}
    </p>
  </div>
</div>
