<!--
  CodePanel — cURL/HTML code display with copy buttons

  ORIGINAL: src/features/viewer/ui/atoms/CodePanel.tsx
  LAYER: atom
  FSD: features/viewer/ui/atoms

  Displays code examples (cURL, HTML) for IIIF Image API requests.
  Used in the workbench code tab.
-->

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  interface Props {
    /** cURL command to display */
    curlCommand?: string;
    /** HTML img tag to display */
    htmlTag?: string;
    /** Contextual styles from parent */
    cx?: Partial<ContextualClassNames>;
    /** Field mode flag */
    fieldMode?: boolean;
  }

  let {
    curlCommand = '',
    htmlTag = '',
    cx: _cx,
    fieldMode = false,
  }: Props = $props();

  let copiedCurl = $state(false);
  let copiedHtml = $state(false);

  const mutedTextClass = $derived(fieldMode ? 'text-nb-black/40' : 'text-nb-black/50');

  async function copyCurl() {
    await navigator.clipboard.writeText(curlCommand);
    copiedCurl = true;
    setTimeout(() => { copiedCurl = false; }, 2000);
  }

  async function copyHtml() {
    await navigator.clipboard.writeText(htmlTag);
    copiedHtml = true;
    setTimeout(() => { copiedHtml = false; }, 2000);
  }
</script>

<div class="p-4 space-y-4">
  {#if curlCommand}
    <div class="space-y-2">
      <p class="text-[10px] font-bold uppercase tracking-wider {mutedTextClass}">cURL</p>
      <pre class="bg-nb-black text-nb-green text-xs p-3 overflow-x-auto font-mono">{curlCommand}</pre>
      <button
        class="text-xs font-mono uppercase tracking-wide px-2 py-1 border border-nb-black/20 hover:border-nb-black transition-nb"
        onclick={copyCurl}
        aria-label="Copy cURL command"
      >
        {copiedCurl ? 'Copied!' : 'Copy cURL'}
      </button>
    </div>
  {/if}

  {#if htmlTag}
    <div class="space-y-2">
      <p class="text-[10px] font-bold uppercase tracking-wider {mutedTextClass}">HTML</p>
      <pre class="bg-nb-black text-nb-blue text-xs p-3 overflow-x-auto font-mono">{htmlTag}</pre>
      <button
        class="text-xs font-mono uppercase tracking-wide px-2 py-1 border border-nb-black/20 hover:border-nb-black transition-nb"
        onclick={copyHtml}
        aria-label="Copy HTML tag"
      >
        {copiedHtml ? 'Copied!' : 'Copy HTML'}
      </button>
    </div>
  {/if}
</div>
