<!--
  CircularDepsPanel — Circular dependency chain visualization
  React source: ui/CircularDepsPanel.tsx (92 lines)
  Architecture: Molecule (derived markdown, composes CopyableSection atom)
-->
<script lang="ts">
  import type { FileAnalysis } from '../../types';
  import { formatCircularDepsAsMarkdown } from '../../lib/markdownFormatters';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import CopyableSection from '../atoms/CopyableSection.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    circularDeps: string[][];
    files: Record<string, FileAnalysis>;
    cx?: ContextualClassNames;
    fieldMode?: boolean;
  }

  let { circularDeps, files, cx = {} as ContextualClassNames, fieldMode = false }: Props = $props();

  let markdown = $derived(formatCircularDepsAsMarkdown(circularDeps));
</script>

{#if circularDeps.length === 0}
  <div class="flex items-center justify-center h-full">
    <div class="text-center p-8 bg-nb-green/10">
      <Icon name="check_circle" class="text-4xl text-nb-green mb-4" />
      <h2 class="text-xl font-semibold text-nb-green mb-2">
        No Circular Dependencies
      </h2>
      <p class="text-nb-green/60">
        Your codebase is free of circular dependency chains.
      </p>
    </div>
  </div>
{:else}
  <div class="h-full overflow-auto p-6">
    <div class="max-w-4xl mx-auto">
      <CopyableSection title="Circular Dependencies ({circularDeps.length} found)" getMarkdown={() => markdown}>
        <div class="space-y-4">
          {#each circularDeps as cycle, idx (idx)}
            <div class="bg-nb-white border border-nb-red/30 overflow-hidden">
              <div class="px-4 py-2 bg-nb-red/10 border-b border-nb-red/30">
                <span class="text-sm font-medium text-nb-red">
                  Chain #{idx + 1} ({cycle.length - 1} files)
                </span>
              </div>
              <div class="p-4">
                <div class="flex flex-wrap items-center gap-2">
                  {#each cycle as filePath, fileIdx (fileIdx)}
                    {@const isLast = fileIdx === cycle.length - 1}
                    {@const file = files[filePath]}
                    <div class="flex items-center gap-2 px-3 py-2 bg-nb-cream/80">
                      <Icon name="description" class="text-sm text-nb-black/40" />
                      <div>
                        <div class="font-mono text-xs text-nb-black/70">
                          {file?.fileName ?? filePath.split('/').pop()}
                        </div>
                        {#if file?.directory}
                          <div class="text-xs text-nb-black/50">{file.directory}</div>
                        {/if}
                      </div>
                    </div>
                    {#if !isLast}
                      <Icon name="arrow_forward" class="text-nb-black/40" />
                    {/if}
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </CopyableSection>
    </div>
  </div>
{/if}
