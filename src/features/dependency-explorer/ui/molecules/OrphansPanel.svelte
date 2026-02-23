<!--
  OrphansPanel — Identifies unused/unreferenced files
  React source: ui/OrphansPanel.tsx (109 lines)
  Architecture: Molecule (derived grouping, composes CopyableSection atom)
-->
<script lang="ts">
  import type { FileAnalysis } from '../../types';
  import { formatOrphansAsMarkdown } from '../../lib/markdownFormatters';
  import CopyableSection from '../atoms/CopyableSection.svelte';
  import Button from '@/src/shared/ui/atoms/Button.svelte';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    orphans: string[];
    files: Record<string, FileAnalysis>;
    onSelectFile: (file: FileAnalysis) => void;
  }

  let { orphans, files, onSelectFile }: Props = $props();

  let markdown = $derived(formatOrphansAsMarkdown(orphans, files));

  let grouped = $derived.by(() => {
    const groups: Record<string, FileAnalysis[]> = {};
    for (const filePath of orphans) {
      const file = files[filePath];
      if (!file) continue;
      const dir = file.directory || 'unknown';
      if (!groups[dir]) groups[dir] = [];
      groups[dir].push(file);
    }
    return groups;
  });
</script>

{#if orphans.length === 0}
  <div class="flex items-center justify-center h-full">
    <div class="text-center p-8 bg-nb-green/10">
      <Icon name="check_circle" class="text-4xl text-nb-green mb-4" />
      <h2 class="text-xl font-semibold text-nb-green mb-2">
        No Unused Files
      </h2>
      <p class="text-nb-green/60">
        All files in the codebase are being used.
      </p>
    </div>
  </div>
{:else}
  <div class="h-full overflow-auto p-6">
    <div class="max-w-4xl mx-auto">
      <CopyableSection title="Unused Files (Orphans) — {orphans.length} found" getMarkdown={() => markdown}>
        <div class="space-y-6">
          {#each Object.entries(grouped) as [directory, dirFiles] (directory)}
            <div class="bg-nb-white border border-nb-black/20 overflow-hidden">
              <div class="px-4 py-2 bg-nb-cream border-b border-nb-black/20">
                <span class="font-mono text-sm text-nb-black/50">{directory}/</span>
              </div>
              <div class="divide-y divide-nb-black/10">
                {#each dirFiles as file (file.filePath)}
                  <Button
                    variant="ghost"
                    size="bare"
                    onclick={() => onSelectFile(file)}
                    class="w-full flex items-center justify-between px-4 py-3 hover:bg-nb-cream transition-nb text-left"
                  >
                    {#snippet children()}
                      <div class="flex items-center gap-3">
                        <Icon name="description" class="text-nb-black/40" />
                        <div>
                          <div class="font-medium text-nb-black/70">{file.fileName}</div>
                          <div class="text-xs text-nb-black/50">
                            {file.exports.length} exports, {file.lines} lines
                          </div>
                        </div>
                      </div>
                      <Icon name="chevron_right" class="text-nb-black/40" />
                    {/snippet}
                  </Button>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </CopyableSection>

      <!-- Info Box -->
      <div class="mt-6 p-4 bg-nb-blue/10 border border-nb-blue/30">
        <div class="flex items-start gap-3">
          <Icon name="info" class="text-nb-blue" />
          <div>
            <h3 class="font-medium text-nb-blue mb-1">Note</h3>
            <p class="text-sm text-nb-blue/60">
              These files may be entry points (like main.tsx) or might be candidates for deletion.
              Entry points and index files are typically excluded from this list.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
