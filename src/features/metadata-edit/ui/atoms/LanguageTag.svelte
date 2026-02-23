<!--
  LanguageTag — Language code selector for metadata mappings.
  React source: src/features/metadata-edit/ui/atoms/LanguageTag.tsx (65 lines)
  Architecture: Atom (zero state, props-only, Rule 5.D: cx + fieldMode)
-->
<script module lang="ts">
  // Static types
  export interface LanguageOption { code: string; label: string; }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import { cn } from '@/src/shared/lib/cn';

  interface Props {
    languages: LanguageOption[];
    value: string;
    onchange: (code: string) => void;
    disabled?: boolean;
    cx?: Partial<ContextualClassNames>;
    fieldMode?: boolean;
  }

  let { languages, value, onchange, disabled = false, cx = {}, fieldMode = false }: Props = $props();
</script>

<select
  {value}
  onchange={(e) => onchange(e.currentTarget.value)}
  {disabled}
  class={cn(
    'w-full px-2 py-1.5 text-sm border outline-none focus:ring-2 focus:ring-nb-blue focus:border-nb-blue',
    fieldMode
      ? 'bg-nb-black text-nb-yellow border-nb-yellow/30 focus:ring-nb-yellow focus:border-nb-yellow'
      : cx.input ?? 'bg-nb-white text-nb-black/80 border-nb-black/20',
    disabled && 'opacity-50 cursor-not-allowed'
  )}
>
  {#each languages as lang (lang.code)}
    <option value={lang.code}>{lang.label}</option>
  {/each}
</select>
