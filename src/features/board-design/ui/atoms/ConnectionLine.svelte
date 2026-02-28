<!--
  ConnectionLine.svelte — SVG Connection Path
  ============================================
  React source: src/features/board-design/ui/atoms/ConnectionLine.tsx (185 lines)

  Purpose: Renders an SVG connection path between two board items.
  Supports straight, curved (quadratic bezier), and elbow (orthogonal) styles.
  Includes optional arrowhead marker, label with background, and hit area.

  Architecture notes:
  - Arch 5.D: Receives cx and fieldMode props
  - Arch 2.F: buildPath() helper in <script module> (shared across instances)
  - SVG attributes: kebab-case (stroke-width, stroke-dasharray, marker-end, etc.)
  - Exception: viewBox stays camelCase
  - Event handlers: onclick, ondblclick (lowercase)
  - All inside an SVG <g> element (this component is placed inside a parent <svg>)

  Svelte 5 patterns:
  - $derived for computed path data, stroke color, midpoint
  - {#if} for conditional arrowhead, label, selected states
-->
<script module lang="ts">
  // Arch 2.F: Pure helper function shared across all instances
  import * as Point from '@/src/shared/lib/geometry/point';

  /** Build SVG path data for the connection line */
  function buildPath(
    from: { x: number; y: number },
    to: { x: number; y: number },
    style: 'straight' | 'elbow' | 'curved',
  ): string {
    if (style === 'curved') {
      const delta = Point.subtract(to, from);
      const mid = Point.lerp(from, to, 0.5);
      const len = Point.length(delta);
      const offset = Math.min(50, len * 0.3);
      const perp = Point.perpendicular(Point.unit(delta));
      const control = Point.add(mid, Point.scale(perp, offset));
      return `M ${from.x},${from.y} Q ${control.x},${control.y} ${to.x},${to.y}`;
    }

    if (style === 'elbow') {
      const mid = Point.lerp(from, to, 0.5);
      return `M ${from.x},${from.y} H ${mid.x} V ${to.y} H ${to.x}`;
    }

    return `M ${from.x},${from.y} L ${to.x},${to.y}`;
  }
</script>

<script lang="ts">
  import type { ContextualClassNames } from '@/src/shared/lib/contextual-styles';
  import type { ConnectionType } from '../../model';

  interface Props {
    id: string;
    from: { x: number; y: number };
    to: { x: number; y: number };
    type: ConnectionType;
    label?: string;
    selected: boolean;
    style?: 'straight' | 'elbow' | 'curved';
    color?: string;
    showArrow?: boolean;
    onSelect: (id: string) => void;
    onDoubleClick?: (id: string) => void;
    cx: ContextualClassNames;
    fieldMode: boolean;
  }

  let {
    id,
    from,
    to,
    type,
    label,
    selected,
    style = 'straight',
    color,
    showArrow = false,
    onSelect,
    onDoubleClick,
    cx,
    fieldMode,
  }: Props = $props();

  // Derived computations
  const strokeColor = $derived(
    color || (selected ? cx.accent : fieldMode ? '#FFE500' : cx.svgStroke)
  );
  const strokeWidth = $derived(selected ? 3 : 2);
  const pathData = $derived(buildPath(from, to, style));
  const midX = $derived((from.x + to.x) / 2);
  const midY = $derived((from.y + to.y) / 2);
  const markerId = $derived(`arrowhead-${id}`);

  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    onSelect(id);
  }

  function handleDblClick(e: MouseEvent) {
    e.stopPropagation();
    onDoubleClick?.(id);
  }
</script>

<g onclick={handleClick} ondblclick={handleDblClick} onkeydown={(e) => { if (e.key==="Enter"||e.key===" ") { e.preventDefault(); onSelect(id); } }} style="cursor: pointer" role="button" tabindex="0" aria-label="Connection line">
  {#if showArrow}
    <defs>
      <marker
        id={markerId}
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill={strokeColor} />
      </marker>
    </defs>
  {/if}

  <!-- Invisible wider hit area for easier clicking -->
  <path d={pathData} stroke="transparent" stroke-width="12" fill="none" />

  <!-- Visible path -->
  <path
    d={pathData}
    stroke={strokeColor}
    stroke-width={strokeWidth}
    fill="none"
    stroke-dasharray={type === 'references' ? '5,5' : 'none'}
    marker-end={showArrow ? `url(#${markerId})` : undefined}
  />

  <!-- Label with background -->
  {#if label}
    <rect
      x={midX - label.length * 3.5 - 4}
      y={midY - 16}
      width={label.length * 7 + 8}
      height={16}
      fill={fieldMode ? '#1a1a1a' : '#ffffff'}
      opacity={0.85}
      rx={2}
    />
    <text
      x={midX}
      y={midY - 5}
      fill={cx.svgFill}
      font-size={11}
      text-anchor="middle"
      pointer-events="none"
      font-weight={selected ? 600 : 400}
    >
      {label}
    </text>
  {/if}

  <!-- Connection type indicator dot -->
  <circle
    cx={midX}
    cy={midY}
    r={selected ? 6 : 4}
    fill={strokeColor}
    opacity={0.7}
  />
</g>
