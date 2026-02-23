/**
 * Image Filters — State container (Category 2)
 *
 * Replaces useImageFilters React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Manages brightness/contrast/saturation/invert/grayscale filters.
 * Scoped class — each viewer creates its own instance.
 */

export interface ImageFilterState {
  brightness: number;  // 0-200, default 100
  contrast: number;    // 0-200, default 100
  saturation: number;  // 0-200, default 100
  invert: boolean;
  grayscale: boolean;
}

const DEFAULT_FILTERS: ImageFilterState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  invert: false,
  grayscale: false,
};

export class ImageFilterStore {
  #filters = $state<ImageFilterState>({ ...DEFAULT_FILTERS });

  get filters(): Readonly<ImageFilterState> { return this.#filters; }
  get brightness(): number { return this.#filters.brightness; }
  get contrast(): number { return this.#filters.contrast; }
  get saturation(): number { return this.#filters.saturation; }
  get invert(): boolean { return this.#filters.invert; }
  get grayscale(): boolean { return this.#filters.grayscale; }

  get isDefault(): boolean {
    return (
      this.#filters.brightness === 100 &&
      this.#filters.contrast === 100 &&
      this.#filters.saturation === 100 &&
      !this.#filters.invert &&
      !this.#filters.grayscale
    );
  }

  /** CSS filter string for applying to the image element */
  get cssFilter(): string {
    if (this.isDefault) return 'none';
    const parts: string[] = [];
    if (this.#filters.brightness !== 100) parts.push(`brightness(${this.#filters.brightness}%)`);
    if (this.#filters.contrast !== 100) parts.push(`contrast(${this.#filters.contrast}%)`);
    if (this.#filters.saturation !== 100) parts.push(`saturate(${this.#filters.saturation}%)`);
    if (this.#filters.invert) parts.push('invert(1)');
    if (this.#filters.grayscale) parts.push('grayscale(1)');
    return parts.join(' ');
  }

  setBrightness(v: number): void { this.#filters = { ...this.#filters, brightness: clamp(v, 0, 200) }; }
  setContrast(v: number): void { this.#filters = { ...this.#filters, contrast: clamp(v, 0, 200) }; }
  setSaturation(v: number): void { this.#filters = { ...this.#filters, saturation: clamp(v, 0, 200) }; }
  toggleInvert(): void { this.#filters = { ...this.#filters, invert: !this.#filters.invert }; }
  toggleGrayscale(): void { this.#filters = { ...this.#filters, grayscale: !this.#filters.grayscale }; }

  reset(): void { this.#filters = { ...DEFAULT_FILTERS }; }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
