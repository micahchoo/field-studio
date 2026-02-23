<!--
  Icon - Material Icons wrapper

  ORIGINAL: src/shared/ui/atoms/Icon.tsx (61 lines)
  Zero business logic. Renders Material Icons font glyph.
  aria-hidden when no label, role="img" when label provided.
-->
<script lang="ts">
  interface Props {
    name: string;
    class?: string;
    onclick?: () => void;
    title?: string;
    label?: string;
    /** Pixel size for the icon (sets font-size inline) */
    size?: number | string;
  }

  let { name, class: className = '', onclick, title, label, size }: Props = $props();
</script>

<span
  class="material-icons select-none {className}"
  {onclick}
  {title}
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
  style:font-size={size ? (typeof size === 'number' ? `${size}px` : size) : 'inherit'}
>{name}</span>
