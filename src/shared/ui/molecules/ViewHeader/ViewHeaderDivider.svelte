<script lang="ts">
  interface Props {
    class?: string;
    fieldMode?: boolean;
  }

  let { class: className, fieldMode = false }: Props = $props();
</script>

<div class={className ?? `w-px h-6 ${fieldMode ? 'bg-nb-yellow/30' : 'bg-nb-black/20'}`}></div>
