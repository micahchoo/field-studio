<!--
  MatchHighlight.svelte — Search highlight with <mark> tags
  React source: MatchHighlight.tsx (108L)
  Pure presentational: text segments with highlighted matches
-->
<script lang="ts">
  interface Props {
    text: string;
    query: string;
    class?: string;
    highlightClassName?: string;
    fieldMode?: boolean;
  }

  let { text, query, class: className = '', highlightClassName, fieldMode = false }: Props = $props();

  const resolvedHighlight = $derived(
    highlightClassName ?? (fieldMode ? 'bg-nb-yellow/40 text-nb-black' : 'bg-yellow-200')
  );

  interface Segment { text: string; isMatch: boolean }

  const segments = $derived.by((): Segment[] => {
    if (!query.trim()) {
      return [{ text, isMatch: false }];
    }

    const normalizedQuery = query.toLowerCase();
    const normalizedText = text.toLowerCase();
    const result: Segment[] = [];

    let lastIndex = 0;
    let matchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);

    while (matchIndex !== -1) {
      if (matchIndex > lastIndex) {
        result.push({ text: text.slice(lastIndex, matchIndex), isMatch: false });
      }
      result.push({ text: text.slice(matchIndex, matchIndex + query.length), isMatch: true });
      lastIndex = matchIndex + query.length;
      matchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);
    }

    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), isMatch: false });
    }

    return result;
  });
</script>

<span class={className}>
  {#each segments as segment, i (i)}
    {#if segment.isMatch}
      <mark class="{resolvedHighlight} px-0.5">{segment.text}</mark>
    {:else}
      <span>{segment.text}</span>
    {/if}
  {/each}
</span>
