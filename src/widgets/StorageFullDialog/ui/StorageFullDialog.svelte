<!--
  StorageFullDialog - Shown when browser storage quota is exceeded.
  Displays usage stats (% bar), offers: export, clear derivatives, full wipe.
  Confirms destructive actions before executing. Loads stats on open.

  React source: 244 lines -> ~230 lines Svelte
-->
<script lang="ts">
  import { cn } from '@/src/shared/lib/cn';
  import { Button } from '@/src/shared/ui/atoms';
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { ModalDialog } from '@/src/shared/ui/molecules';
  // STUB: storage service and logger will be wired during real implementation
  // import { storage } from '@/src/shared/services/storage';
  // import { storageLog } from '@/src/shared/services/logger';

  // --- Props ---
  interface Props {
    isOpen: boolean;
    onClose: () => void;
    onExport: () => void;
  }

  let { isOpen, onClose, onExport }: Props = $props();

  // --- Types ---
  interface StorageStats {
    usage: number;
    quota: number;
    usagePercent: number;
    assetCount: number;
  }

  // --- Local State ---
  let stats: StorageStats | null = $state(null);
  let isClearing: boolean = $state(false);
  let isClearingDerivatives: boolean = $state(false);
  let cleared: boolean = $state(false);

  // --- Derived ---
  let usageBarWidth = $derived.by(() => {
    const s = stats as StorageStats | null;
    return s ? `${Math.min(s.usagePercent, 100)}%` : '0%';
  });

  // --- Effects ---
  // Load stats whenever dialog opens
  $effect(() => {
    if (isOpen) {
      loadStats();
    }
  });

  // --- Service stubs ---
  async function loadStats(): Promise<void> {
    // STUB: Replace with real storage.getEstimate() + storage.getAllAssetIds()
    // const estimate = await storage.getEstimate();
    // const assetIds = await storage.getAllAssetIds();
    // if (estimate) {
    //   stats = {
    //     usage: estimate.usage,
    //     quota: estimate.quota,
    //     usagePercent: estimate.quota > 0 ? (estimate.usage / estimate.quota) * 100 : 0,
    //     assetCount: assetIds.length,
    //   };
    // }
    stats = { usage: 0, quota: 0, usagePercent: 0, assetCount: 0 }; // placeholder
  }

  // --- Helpers ---
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // --- Handlers ---
  async function handleClearDerivatives(): Promise<void> {
    isClearingDerivatives = true;
    try {
      // STUB: const count = await storage.clearDerivatives();
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadStats();
      // STUB: alert(`Cleared ${count} thumbnail images.`);
    } catch (e: unknown) {
      // STUB: storageLog.error('Failed to clear derivatives:', e instanceof Error ? e : undefined);
      console.error('Failed to clear derivatives:', e);
    } finally {
      isClearingDerivatives = false;
    }
  }

  async function handleClearStorage(): Promise<void> {
    if (!confirm('This will delete ALL imported files and derivatives. Your project structure will be preserved. Continue?')) {
      return;
    }

    isClearing = true;
    try {
      // STUB: Clear files/derivatives/tiles/tileManifests from IndexedDB
      // const db = await storage.getDB();
      // await db.clear('files');
      // await db.clear('derivatives');
      // await db.clear('tiles');
      // await db.clear('tileManifests');

      cleared = true;
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e: unknown) {
      console.error('Failed to clear storage:', e);
    } finally {
      isClearing = false;
    }
  }

  // --- Cause explanations (static) ---
  const causes = [
    "You've imported many large images",
    'High-resolution derivatives were generated',
    'Tile pyramids for the viewer consumed space',
  ] as const;
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-nb-black/80 backdrop-blur-sm">
    <div class="w-full max-w-lg bg-nb-black shadow-brutal-lg border border-nb-red/30 overflow-hidden">

      <!-- Header -->
      <div class="bg-nb-red/10 border-b border-nb-red/20 p-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-nb-red/20 flex items-center justify-center">
            <Icon name="storage" class="text-2xl text-nb-red" />
          </div>
          <div>
            <h2 class="text-xl font-bold text-white">Storage Full</h2>
            <p class="text-nb-red/60 text-sm">Browser storage quota exceeded</p>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">

        {#if cleared}
          <!-- Success state: cleared, about to reload -->
          <div class="text-center py-8">
            <div class="w-16 h-16 bg-nb-green/20 flex items-center justify-center mx-auto mb-4">
              <Icon name="check" class="text-3xl text-nb-green" />
            </div>
            <h3 class="text-lg font-semibold text-white mb-2">Storage Cleared</h3>
            <p class="text-nb-black/40">Reloading page...</p>
          </div>

        {:else}
          <!-- Stats bar -->
          {#if stats}
            <div class="bg-nb-black/50 p-4 border border-nb-black/80">
              <div class="flex justify-between items-center mb-3">
                <span class="text-nb-black/40 text-sm">Storage Used</span>
                <span class="text-white font-mono font-bold">
                  {formatBytes(stats.usage)} / {formatBytes(stats.quota)}
                </span>
              </div>

              <!-- Progress bar -->
              <div class="h-3 bg-nb-black/80 overflow-hidden mb-3">
                <div class="h-full bg-nb-red" style:width={usageBarWidth}></div>
              </div>

              <div class="flex justify-between text-xs text-nb-black/50">
                <span>{stats.assetCount} assets stored</span>
                <span>{stats.usagePercent.toFixed(1)}% full</span>
              </div>
            </div>
          {/if}

          <!-- Explanation -->
          <div class="space-y-3">
            <p class="text-nb-black/30 text-sm leading-relaxed">
              Your browser's storage is full. This happens when:
            </p>
            <ul class="text-nb-black/40 text-sm space-y-2 ml-4">
              {#each causes as cause}
                <li class="flex items-start gap-2">
                  <span class="text-nb-red mt-0.5">&bull;</span>
                  {cause}
                </li>
              {/each}
            </ul>
          </div>

          <!-- Action buttons -->
          <div class="space-y-3">
            <Button variant="ghost" size="bare"
              onclick={onExport}
              class="w-full py-3 px-4 bg-nb-blue hover:bg-nb-blue text-white font-semibold flex items-center justify-center gap-2 transition-nb"
            >
              <Icon name="download" />
              Export Archive to File
            </Button>

            <Button variant="ghost" size="bare"
              onclick={handleClearDerivatives}
              disabled={isClearingDerivatives}
              class="w-full py-3 px-4 bg-nb-orange hover:bg-nb-orange text-white font-semibold flex items-center justify-center gap-2 transition-nb disabled:opacity-50"
            >
              {#if isClearingDerivatives}
                <div class="w-5 h-5 border-2 border-white/30 border-t-white animate-spin"></div>
                Clearing Thumbnails...
              {:else}
                <Icon name="image_not_supported" />
                Clear Thumbnails (Free Space)
              {/if}
            </Button>

            <Button variant="ghost" size="bare"
              onclick={handleClearStorage}
              disabled={isClearing}
              class="w-full py-3 px-4 bg-nb-black/80 hover:bg-nb-black/60 text-white font-semibold flex items-center justify-center gap-2 transition-nb disabled:opacity-50"
            >
              {#if isClearing}
                <div class="w-5 h-5 border-2 border-white/30 border-t-white animate-spin"></div>
                Clearing...
              {:else}
                <Icon name="delete_forever" />
                Clear All Files (Keep Structure)
              {/if}
            </Button>

            <Button variant="ghost" size="bare"
              onclick={onClose}
              class="w-full py-3 px-4 text-nb-black/40 hover:text-white text-sm transition-nb"
            >
              I'll manage this later
            </Button>
          </div>

          <!-- Tip box -->
          <div class="bg-nb-blue/10 border border-nb-blue/20 p-3 flex gap-3">
            <Icon name="lightbulb" class="text-nb-blue shrink-0 mt-0.5" />
            <p class="text-nb-blue/60 text-xs">
              <strong>Tip:</strong> After exporting, you can re-import the archive file
              later without hitting storage limits, since the export doesn't store
              derivatives or tiles.
            </p>
          </div>
        {/if}

      </div>
    </div>
  </div>
{/if}
