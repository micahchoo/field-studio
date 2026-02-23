<!--
  FileIcon — Extension-based file type icon
  React source: ui/DependencyGraphView.tsx (lines 149-169)
  Architecture: Atom (zero state, props-only)
-->
<script module lang="ts">
  const ICON_MAP: Record<string, string> = {
    '.tsx': 'code',
    '.jsx': 'code',
    '.svelte': 'code',
    '.ts': 'terminal',
    '.css': 'style',
    '.scss': 'style',
  };

  const COLOR_MAP: Record<string, string> = {
    '.tsx': 'text-nb-blue',
    '.jsx': 'text-nb-blue',
    '.svelte': 'text-nb-orange',
    '.ts': 'text-nb-blue',
    '.css': 'text-nb-pink',
    '.scss': 'text-nb-pink',
  };
</script>

<script lang="ts">
  import Icon from '@/src/shared/ui/atoms/Icon.svelte';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    extension: string;
  }

  let { extension }: Props = $props();

  let iconName = $derived(ICON_MAP[extension] ?? 'description');
  let colorClass = $derived(COLOR_MAP[extension] ?? 'text-nb-black/40');
</script>

<Icon name={iconName} class={cn('text-sm', colorClass)} />
