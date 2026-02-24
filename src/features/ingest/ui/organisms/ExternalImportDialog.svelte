<!--
  ExternalImportDialog - Import external IIIF manifests/collections by URL.

  Validates URL (protocol, private IP blocking), fetches remote IIIF resource
  with timeout + abort, handles auth-required responses, shows preview card
  with thumbnail/type/label/summary before confirming import.

  React source: src/features/ingest/ui/ExternalImportDialog.tsx (~197 lines)
-->
<script module lang="ts">
  const FETCH_TIMEOUT_MS = 30000;
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { IIIFItem } from '@/src/shared/types';
  import type { AuthService } from '@/src/shared/services/remoteLoader';
  import { getIIIFValue, isCollection } from '@/src/shared/types';
  import { fetchRemoteResource, requiresAuth } from '@/src/shared/services/remoteLoader';
  import { Button, Icon } from '@/src/shared/ui/atoms';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    onImport: (item: IIIFItem) => void;
    onClose: () => void;
    onAuthRequired?: (resourceId: string, authServices: AuthService[], retryFn?: () => void) => void;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let { onImport, onClose, onAuthRequired, cx = {}, fieldMode = false }: Props = $props();

  // --- Local state ---
  let url: string = $state('');
  let loading: boolean = $state(false);
  let error: string | null = $state(null);
  let preview: IIIFItem | null = $state(null);

  // Non-reactive ref for abort controller (not rendered, never triggers re-render)
  let abortController: AbortController | null = null;

  // --- Derived ---
  let previewLabel = $derived.by(() => {
    const p = preview as IIIFItem | null;
    return p
      ? getIIIFValue(p.label, 'none') || getIIIFValue(p.label, 'en') || 'Untitled'
      : '';
  });

  let previewSummary = $derived.by(() => {
    const p = preview as IIIFItem | null;
    return p
      ? getIIIFValue(p.summary, 'none') || getIIIFValue(p.summary, 'en') || 'No description available.'
      : '';
  });

  let previewIsCollection = $derived(preview ? isCollection(preview) : false);

  let thumbnailSrc = $derived(
    preview && (preview as Record<string, unknown>).thumbnail
      ? ((preview as Record<string, unknown>).thumbnail as Array<{ id?: string }>)?.[0]?.id ?? null
      : null
  );

  // --- Cleanup abort controller on component destroy ---
  $effect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  });

  // --- Handlers ---
  async function handleFetch(): Promise<void> {
    if (!url) return;

    // Validate URL before fetching
    try {
      const parsed = new URL(url);
      // Block dangerous protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        error = 'Only HTTP and HTTPS URLs are allowed.';
        return;
      }
      // Block private/local IPs
      const hostname = parsed.hostname;
      if (
        hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' ||
        hostname.startsWith('10.') || hostname.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) || hostname === '0.0.0.0'
      ) {
        error = 'Private/local network URLs are not allowed for external imports.';
        return;
      }
    } catch {
      error = 'Please enter a valid URL.';
      return;
    }

    // Abort any previous request
    if (abortController) {
      abortController.abort();
    }

    // Create new abort controller with timeout
    const ac = new AbortController();
    abortController = ac;
    const timeoutId = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

    loading = true;
    error = null;
    preview = null;

    try {
      const result = await fetchRemoteResource(url, { signal: ac.signal });

      // Check if authentication is required
      if (requiresAuth(result)) {
        if (onAuthRequired) {
          onAuthRequired(result.resourceId, result.authServices, () => handleFetch());
        } else {
          error = 'This resource requires authentication, but auth is not configured.';
        }
        return;
      }

      preview = result.item;
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') {
        error = 'Request timed out after 30 seconds. The server may be slow or unavailable.';
      } else {
        error = e instanceof Error ? e.message : 'Failed to load manifest';
      }
    } finally {
      clearTimeout(timeoutId);
      loading = false;
    }
  }

  function handleConfirm(): void {
    if (preview) {
      onImport(preview);
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') handleFetch();
  }
</script>

<!-- Backdrop overlay -->
<div
  class={cn(
    'fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in',
    fieldMode ? 'bg-nb-black/80 backdrop-blur-sm' : 'bg-nb-black/60 backdrop-blur-sm'
  )}
  role="presentation"
>
  <!-- Dialog panel -->
  <div
    class={cn(
      'max-w-lg w-full overflow-hidden flex flex-col',
      fieldMode ? 'bg-nb-black border-2 border-nb-yellow shadow-brutal-field-lg' : 'bg-nb-white shadow-brutal-lg',
      cx.surface
    )}
    role="dialog"
    aria-modal="true"
    aria-labelledby="external-import-title"
  >
    <!-- Header -->
    <div class={cn(
      'p-4 border-b flex justify-between items-center',
      fieldMode ? 'bg-nb-black border-nb-yellow' : 'bg-nb-white border-nb-black/20'
    )}>
      <div class="flex items-center gap-3">
        <div class={cn(
          'w-10 h-10 flex items-center justify-center',
          fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-blue/20 text-nb-blue'
        )}>
          <Icon name="cloud_download" />
        </div>
        <div>
          <h2
            id="external-import-title"
            class={cn('text-lg font-bold', fieldMode ? 'text-nb-yellow' : 'text-nb-black', cx.text)}
          >
            Import External IIIF
          </h2>
          <p class={cn(
            'text-[10px] font-bold uppercase tracking-widest',
            fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/40'
          )}>
            Remote Manifest Import
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="bare"
        onclick={onClose}
        class={cn(fieldMode ? 'text-nb-yellow/40 hover:text-nb-yellow/60' : 'text-nb-black/40 hover:text-nb-black/60')}
      >
        <Icon name="close" />
      </Button>
    </div>

    <!-- Body -->
    <div class="p-6 space-y-4">
      <!-- URL input row -->
      <div>
        <label for="field-import-url"
          class={cn(
            'block text-xs font-bold uppercase mb-1',
            fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/50',
            cx.label
          )}
        >
          Manifest or Collection URL
        </label>
        <div class="flex gap-2">
          <input id="field-import-url"
            type="text"
            bind:value={url}
            onkeydown={handleKeydown}
            placeholder="https://example.org/iiif/manifest.json"
            class={cn(
              'flex-1 px-3 py-2 text-sm outline-none',
              fieldMode
                ? 'border border-nb-yellow/30 bg-nb-black text-nb-yellow placeholder:text-nb-yellow/30 focus:border-nb-yellow focus:ring-1 focus:ring-nb-yellow'
                : 'border border-nb-black/20 bg-nb-white text-nb-black placeholder:text-nb-black/30 focus:border-iiif-blue focus:ring-1 focus:ring-iiif-blue',
              cx.input
            )}
          />
          <Button
            variant="secondary"
            size="sm"
            onclick={handleFetch}
            disabled={loading || !url}
            {loading}
          >
            {#if !loading}Fetch{/if}
          </Button>
        </div>
      </div>

      <!-- Error display -->
      {#if error}
        <div class={cn(
          'p-3 text-sm flex gap-2 items-start',
          fieldMode
            ? 'bg-nb-red/20 border border-nb-red/40 text-nb-red'
            : 'bg-nb-red/10 border border-nb-red/30 text-nb-red'
        )}>
          <Icon name="error" class="mt-0.5 shrink-0" />
          <div>
            <p class="font-bold">Error loading resource</p>
            <p class="text-xs mt-1 opacity-90">{error}</p>
          </div>
        </div>
      {/if}

      <!-- Preview card -->
      {#if preview}
        <div class={cn(
          'p-4 animate-in slide-in-from-bottom-2',
          fieldMode
            ? 'bg-nb-black border border-nb-yellow/30'
            : 'bg-nb-white border border-nb-black/20'
        )}>
          <div class="flex items-start gap-3">
            <!-- Thumbnail / icon -->
            <div class={cn(
              'w-16 h-16 flex items-center justify-center shrink-0 overflow-hidden',
              fieldMode
                ? 'bg-nb-black border border-nb-yellow/30'
                : 'bg-nb-white border border-nb-black/20'
            )}>
              {#if thumbnailSrc}
                <img src={thumbnailSrc} class="w-full h-full object-cover" alt="" />
              {:else}
                <Icon
                  name={previewIsCollection ? 'folder' : 'menu_book'}
                  class={cn('text-3xl', fieldMode ? 'text-nb-yellow/30' : 'text-nb-black/30')}
                />
              {/if}
            </div>
            <!-- Info -->
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class={cn(
                  'text-[10px] uppercase font-bold px-1.5 py-0.5',
                  previewIsCollection
                    ? 'bg-nb-orange/20 text-nb-orange'
                    : 'bg-nb-green/20 text-nb-green'
                )}>
                  {preview.type}
                </span>
              </div>
              <h3 class={cn(
                'font-bold line-clamp-1',
                fieldMode ? 'text-nb-yellow' : 'text-nb-black',
                cx.text
              )}>
                {previewLabel}
              </h3>
              <p class={cn(
                'text-xs mt-1 line-clamp-2',
                fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/50',
                cx.textMuted
              )}>
                {previewSummary}
              </p>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Footer -->
    <div class={cn(
      'p-4 border-t flex justify-end gap-2',
      fieldMode ? 'bg-nb-black border-nb-yellow/30' : 'bg-nb-white border-nb-black/20'
    )}>
      <Button variant="ghost" size="sm" onclick={onClose}>
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        onclick={handleConfirm}
        disabled={!preview}
      >
        {#snippet icon()}
          <Icon name="add" />
        {/snippet}
        Add to Archive
      </Button>
    </div>
  </div>
</div>
