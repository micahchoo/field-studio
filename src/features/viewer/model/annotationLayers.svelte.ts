/**
 * Annotation Layers — State container (Category 2)
 *
 * Replaces useAnnotationLayers React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Manages annotation page visibility, colors, and opacity per layer.
 * Scoped class — each viewer creates its own instance.
 */

export interface AnnotationLayer {
  id: string;      // annotation page ID
  label: string;
  visible: boolean;
  color: string;   // hex color for display
  opacity: number; // 0-1
}

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
] as const;

export class AnnotationLayerStore {
  #layers = $state<AnnotationLayer[]>([]);

  get layers(): readonly AnnotationLayer[] { return this.#layers; }
  get visibleLayerIds(): string[] { return this.#layers.filter(l => l.visible).map(l => l.id); }

  /** Initialize layers from annotation page IDs */
  setLayers(pages: Array<{ id: string; label: string }>): void {
    this.#layers = pages.map((page, i) => ({
      id: page.id,
      label: page.label || `Layer ${i + 1}`,
      visible: true,
      color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      opacity: 1,
    }));
  }

  toggleVisibility(id: string): void {
    this.#layers = this.#layers.map(l =>
      l.id === id ? { ...l, visible: !l.visible } : l
    );
  }

  setColor(id: string, color: string): void {
    this.#layers = this.#layers.map(l =>
      l.id === id ? { ...l, color } : l
    );
  }

  setOpacity(id: string, opacity: number): void {
    this.#layers = this.#layers.map(l =>
      l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
    );
  }

  showAll(): void {
    this.#layers = this.#layers.map(l => ({ ...l, visible: true }));
  }

  hideAll(): void {
    this.#layers = this.#layers.map(l => ({ ...l, visible: false }));
  }

  /** Toggle all: if all visible → hide all, else show all */
  toggleAll(): void {
    const allVisible = this.#layers.every(l => l.visible);
    if (allVisible) this.hideAll();
    else this.showAll();
  }

  reset(): void { this.#layers = []; }
}
