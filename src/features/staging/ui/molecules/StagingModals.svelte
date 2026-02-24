<!--
  StagingModals Molecule
  =======================
  Modal overlays for the staging workbench: behavior selector,
  rights statement, and navigation date modals.
  Extracted from StagingWorkbench organism.
-->
<script lang="ts">
  import type { NodeAnnotations } from '../../model';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { BEHAVIOR_OPTIONS } from '@/src/shared/constants/iiif';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';

  interface Props {
    behaviorModal: { path: string; resourceType: string } | null;
    rightsModal: string | null;
    navDateModal: string | null;
    annotationsMap: Map<string, NodeAnnotations>;
    onAnnotationChange: (path: string, ann: NodeAnnotations) => void;
    onCloseBehavior: () => void;
    onCloseRights: () => void;
    onCloseNavDate: () => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let {
    behaviorModal,
    rightsModal,
    navDateModal,
    annotationsMap,
    onAnnotationChange,
    onCloseBehavior,
    onCloseRights,
    onCloseNavDate,
    cx,
    fieldMode,
  }: Props = $props();
</script>

{#if behaviorModal}
  {@const bPath = behaviorModal.path}
  {@const bResourceType = behaviorModal.resourceType}
  {@const currentBehaviors = annotationsMap.get(bPath)?.iiifBehavior ?? []}
  {@const options = [...(BEHAVIOR_OPTIONS[bResourceType.toUpperCase() as keyof typeof BEHAVIOR_OPTIONS] ?? BEHAVIOR_OPTIONS['MANIFEST'])]}
  <div class="fixed inset-0 bg-nb-black/40 z-[600] flex items-center justify-center p-4" role="presentation">
    <div class="bg-nb-white border-2 border-nb-black shadow-brutal w-full max-w-lg">
      <div class="flex items-center justify-between p-4 border-b-2 border-nb-black">
        <h2 class="text-lg font-mono uppercase font-bold">Set Behaviors</h2>
        <button type="button" onclick={onCloseBehavior}
          class="p-1 hover:bg-nb-black/5 cursor-pointer border-0 bg-transparent" aria-label="Close"
        >
          <Icon name="close" />
        </button>
      </div>
      <div class="p-4">
        <p class="text-sm text-nb-black/60 mb-3">
          Set behavior for: <span class="font-mono text-nb-black/80">{bPath.split('/').pop()}</span>
        </p>
        <div class="space-y-2">
          {#each options as option (option)}
            {@const isChecked = currentBehaviors.includes(option)}
            <label class="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-nb-cream transition-nb">
              <input
                type="checkbox"
                checked={isChecked}
                onchange={() => {
                  const existing = annotationsMap.get(bPath) ?? {};
                  const next = isChecked
                    ? currentBehaviors.filter((b: string) => b !== option)
                    : [...currentBehaviors, option];
                  onAnnotationChange(bPath, { ...existing, iiifBehavior: next });
                }}
                class="border-nb-black/20"
              />
              {option}
            </label>
          {/each}
        </div>
        <div class="flex justify-end mt-4">
          <Button variant="ghost" onclick={onCloseBehavior}>Done</Button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if rightsModal}
  {@const rPath = rightsModal}
  <div class="fixed inset-0 bg-nb-black/40 z-[600] flex items-center justify-center p-4" role="presentation">
    <div class="bg-nb-white border-2 border-nb-black shadow-brutal w-full max-w-lg">
      <div class="flex items-center justify-between p-4 border-b-2 border-nb-black">
        <h2 class="text-lg font-mono uppercase font-bold">Set Rights Statement</h2>
        <button type="button" onclick={onCloseRights}
          class="p-1 hover:bg-nb-black/5 cursor-pointer border-0 bg-transparent" aria-label="Close"
        >
          <Icon name="close" />
        </button>
      </div>
      <div class="p-4">
        <label for="field-rights-uri" class="block text-sm font-medium mb-2">Rights URI</label>
        <input id="field-rights-uri"
          type="text"
          class="w-full border rounded px-3 py-2 text-sm"
          value={annotationsMap.get(rPath)?.rights ?? ''}
          onchange={(e: Event) => {
            const value = (e.target as HTMLInputElement).value;
            const existing = annotationsMap.get(rPath) ?? {};
            onAnnotationChange(rPath, { ...existing, rights: value || undefined });
          }}
          placeholder="https://creativecommons.org/licenses/by/4.0/"
        />
        <div class="flex justify-end mt-4">
          <Button variant="ghost" onclick={onCloseRights}>Done</Button>
        </div>
      </div>
    </div>
  </div>
{/if}

{#if navDateModal}
  {@const ndPath = navDateModal}
  <div class="fixed inset-0 bg-nb-black/40 z-[600] flex items-center justify-center p-4" role="presentation">
    <div class="bg-nb-white border-2 border-nb-black shadow-brutal w-full max-w-lg">
      <div class="flex items-center justify-between p-4 border-b-2 border-nb-black">
        <h2 class="text-lg font-mono uppercase font-bold">Set Navigation Date</h2>
        <button type="button" onclick={() => onCloseNavDate()}
          class="p-1 hover:bg-nb-black/5 cursor-pointer border-0 bg-transparent" aria-label="Close"
        >
          <Icon name="close" />
        </button>
      </div>
      <div class="p-4">
        <label for="field-nav-date" class="block text-sm font-medium mb-2">Date (ISO 8601)</label>
        <input id="field-nav-date"
          type="datetime-local"
          class="w-full border rounded px-3 py-2 text-sm"
          value={(annotationsMap.get(ndPath)?.navDate ?? '').replace('Z', '').slice(0, 16)}
          onchange={(e: Event) => {
            const value = (e.target as HTMLInputElement).value;
            const existing = annotationsMap.get(ndPath) ?? {};
            const isoDate = value ? `${value}:00Z` : undefined;
            onAnnotationChange(ndPath, { ...existing, navDate: isoDate });
          }}
        />
        <div class="flex justify-end mt-4">
          <Button variant="ghost" onclick={onCloseNavDate}>Done</Button>
        </div>
      </div>
    </div>
  </div>
{/if}
