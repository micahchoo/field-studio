/**
 * Measurement — State container (Category 2)
 *
 * Replaces useMeasurement React hook.
 * Architecture doc §4 Cat 2: Reactive class in .svelte.ts
 *
 * Distance measurement tool with calibration support.
 * Scoped class — each viewer creates its own instance.
 */

export interface MeasurementPoint {
  x: number;
  y: number;
}

export interface Measurement {
  id: string;
  start: MeasurementPoint;
  end: MeasurementPoint;
  distancePx: number;
  distanceCalibrated: number | null;
  unit: string;
}

export class MeasurementStore {
  #active = $state(false);
  #startPoint = $state<MeasurementPoint | null>(null);
  #endPoint = $state<MeasurementPoint | null>(null);
  #measurements = $state<Measurement[]>([]);
  #calibration = $state<{ pixelsPerUnit: number; unit: string } | null>(null);
  #nextId = 0;

  get active(): boolean { return this.#active; }
  get startPoint(): MeasurementPoint | null { return this.#startPoint; }
  get endPoint(): MeasurementPoint | null { return this.#endPoint; }
  get measurements(): readonly Measurement[] { return this.#measurements; }
  get calibration() { return this.#calibration; }
  get isDrawing(): boolean { return this.#startPoint !== null && this.#endPoint === null; }

  /** Current distance in pixels between start and end */
  get currentDistancePx(): number {
    if (!this.#startPoint || !this.#endPoint) return 0;
    const dx = this.#endPoint.x - this.#startPoint.x;
    const dy = this.#endPoint.y - this.#startPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  activate(): void { this.#active = true; }
  deactivate(): void {
    this.#active = false;
    this.#startPoint = null;
    this.#endPoint = null;
  }

  setStart(point: MeasurementPoint): void {
    this.#startPoint = point;
    this.#endPoint = null;
  }

  setEnd(point: MeasurementPoint): void {
    this.#endPoint = point;
  }

  /** Commit the current measurement to the list */
  commit(): void {
    if (!this.#startPoint || !this.#endPoint) return;
    const distancePx = this.currentDistancePx;
    const distanceCalibrated = this.#calibration
      ? distancePx / this.#calibration.pixelsPerUnit
      : null;

    this.#measurements = [...this.#measurements, {
      id: `m-${++this.#nextId}`,
      start: { ...this.#startPoint },
      end: { ...this.#endPoint },
      distancePx,
      distanceCalibrated,
      unit: this.#calibration?.unit ?? 'px',
    }];

    this.#startPoint = null;
    this.#endPoint = null;
  }

  /** Set calibration (e.g., 100px = 1cm) */
  calibrate(pixelsPerUnit: number, unit: string): void {
    this.#calibration = { pixelsPerUnit, unit };
  }

  removeMeasurement(id: string): void {
    this.#measurements = this.#measurements.filter(m => m.id !== id);
  }

  clearAll(): void {
    this.#measurements = [];
    this.#startPoint = null;
    this.#endPoint = null;
  }

  reset(): void {
    this.deactivate();
    this.clearAll();
    this.#calibration = null;
    this.#nextId = 0;
  }
}
