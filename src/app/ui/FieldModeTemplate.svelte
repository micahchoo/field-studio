<!--
  FieldModeTemplate — Field mode variant of BaseTemplate.
  React source: src/app/templates/FieldModeTemplate.tsx (82 lines)
  Architecture: Template (injects cx, fieldMode, terminology into child organisms via snippet)

  Philosophy:
  - Organisms are context-agnostic; templates provide context.
  - No fieldMode prop-drilling. Children receive props via snippet parameters.
  - cx (contextual styles) is always available, never undefined.
  - Terminology is resolved at template level.

  Usage:
    <FieldModeTemplate>
      {#snippet children({ cx, fieldMode, t, isAdvanced })}
        <ArchiveView {cx} {fieldMode} {t} {isAdvanced} />
      {/snippet}
    </FieldModeTemplate>
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { appSettings } from '@/src/shared/stores/appSettings.svelte';
  import { terminology } from '@/src/shared/stores/terminology.svelte';
  import { getContextualClasses } from '@/src/shared/lib/contextual-styles';
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';

  // ---------------------------------------------------------------------------
  // Types
  // ---------------------------------------------------------------------------

  export interface FieldModeTemplateRenderProps {
    /** Contextual class names for current fieldMode (light/field/dark/custom) */
    cx: ContextualClassNames;
    /** Current field mode state (true = high-contrast dark mode) */
    fieldMode: boolean;
    /** Terminology function for IIIF resource labels */
    t: (key: string) => string;
    /** Whether user is in advanced mode (shows technical details) */
    isAdvanced: boolean;
  }

  interface Props {
    /** Render snippet receives cx, fieldMode, t, isAdvanced */
    children: Snippet<[FieldModeTemplateRenderProps]>;
  }

  let { children }: Props = $props();

  // ---------------------------------------------------------------------------
  // Reactive derived values
  // ---------------------------------------------------------------------------

  /** Current field mode from app settings */
  let fieldMode = $derived(appSettings.fieldMode);

  /** Contextual class names derived from current theme name */
  let cx = $derived(getContextualClasses(appSettings.themeName));

  /** Terminology translation function + isAdvanced flag */
  let t = $derived((key: string) => terminology.t(key));
  let isAdvanced = $derived(terminology.isAdvanced);

  /** Combined props to pass to children snippet */
  let renderProps = $derived<FieldModeTemplateRenderProps>({
    cx,
    fieldMode,
    t,
    isAdvanced,
  });
</script>

{@render children(renderProps)}
