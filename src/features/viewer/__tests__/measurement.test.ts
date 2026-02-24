/**
 * MeasurementStore — Unit Tests
 *
 * Tests the Svelte 5 runes-based reactive class store for viewer distance
 * measurement with calibration support.
 *
 * Source: src/features/viewer/model/measurement.svelte.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MeasurementStore,
  type MeasurementPoint,
  type Measurement,
} from '@/src/features/viewer/model/measurement.svelte';

// ============================================================================
// Constructor defaults
// ============================================================================

describe('MeasurementStore — defaults', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('active is false by default', () => {
    expect(store.active).toBe(false);
  });

  it('startPoint is null by default', () => {
    expect(store.startPoint).toBeNull();
  });

  it('endPoint is null by default', () => {
    expect(store.endPoint).toBeNull();
  });

  it('measurements is an empty array by default', () => {
    expect(store.measurements).toEqual([]);
  });

  it('calibration is null by default', () => {
    expect(store.calibration).toBeNull();
  });

  it('isDrawing is false when no points set', () => {
    expect(store.isDrawing).toBe(false);
  });

  it('currentDistancePx is 0 when no points set', () => {
    expect(store.currentDistancePx).toBe(0);
  });
});

// ============================================================================
// activate / deactivate
// ============================================================================

describe('MeasurementStore — activate / deactivate', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('activate sets active to true', () => {
    store.activate();
    expect(store.active).toBe(true);
  });

  it('deactivate sets active to false', () => {
    store.activate();
    store.deactivate();
    expect(store.active).toBe(false);
  });

  it('deactivate clears startPoint', () => {
    store.activate();
    store.setStart({ x: 10, y: 20 });
    store.deactivate();
    expect(store.startPoint).toBeNull();
  });

  it('deactivate clears endPoint', () => {
    store.activate();
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 30, y: 40 });
    store.deactivate();
    expect(store.endPoint).toBeNull();
  });

  it('deactivate does not affect existing committed measurements', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 3, y: 4 });
    store.commit();
    store.activate();
    store.deactivate();
    expect(store.measurements).toHaveLength(1);
  });
});

// ============================================================================
// setStart / setEnd
// ============================================================================

describe('MeasurementStore — setStart / setEnd', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('setStart stores the provided point', () => {
    store.setStart({ x: 5, y: 10 });
    expect(store.startPoint).toEqual({ x: 5, y: 10 });
  });

  it('setStart clears any existing endPoint', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 10 });
    expect(store.endPoint).toEqual({ x: 10, y: 10 });

    store.setStart({ x: 5, y: 5 });
    expect(store.endPoint).toBeNull();
  });

  it('setEnd stores the provided point without affecting startPoint', () => {
    store.setStart({ x: 1, y: 2 });
    store.setEnd({ x: 7, y: 8 });
    expect(store.endPoint).toEqual({ x: 7, y: 8 });
    expect(store.startPoint).toEqual({ x: 1, y: 2 });
  });

  it('setting start with fractional coordinates stores them as-is', () => {
    store.setStart({ x: 3.14, y: 2.71 });
    expect(store.startPoint?.x).toBeCloseTo(3.14);
    expect(store.startPoint?.y).toBeCloseTo(2.71);
  });
});

// ============================================================================
// isDrawing derived
// ============================================================================

describe('MeasurementStore — isDrawing', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('isDrawing is false when no points are set', () => {
    expect(store.isDrawing).toBe(false);
  });

  it('isDrawing is true when only startPoint is set', () => {
    store.setStart({ x: 0, y: 0 });
    expect(store.isDrawing).toBe(true);
  });

  it('isDrawing is false when both points are set', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 10 });
    expect(store.isDrawing).toBe(false);
  });

  it('isDrawing returns to true when setStart is called again (clears end)', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 10 });
    store.setStart({ x: 5, y: 5 });
    expect(store.isDrawing).toBe(true);
  });
});

// ============================================================================
// currentDistancePx derived
// ============================================================================

describe('MeasurementStore — currentDistancePx', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('returns 0 when no start point', () => {
    expect(store.currentDistancePx).toBe(0);
  });

  it('returns 0 when only start point is set', () => {
    store.setStart({ x: 5, y: 5 });
    expect(store.currentDistancePx).toBe(0);
  });

  it('calculates Euclidean distance (3-4-5 triangle)', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 3, y: 4 });
    expect(store.currentDistancePx).toBe(5);
  });

  it('calculates horizontal distance correctly', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 0 });
    expect(store.currentDistancePx).toBe(10);
  });

  it('calculates vertical distance correctly', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 0, y: 7 });
    expect(store.currentDistancePx).toBe(7);
  });

  it('calculates distance regardless of point order', () => {
    store.setStart({ x: 6, y: 8 });
    store.setEnd({ x: 0, y: 0 });
    expect(store.currentDistancePx).toBe(10);
  });

  it('returns 0 for coincident points', () => {
    store.setStart({ x: 5, y: 5 });
    store.setEnd({ x: 5, y: 5 });
    expect(store.currentDistancePx).toBe(0);
  });
});

// ============================================================================
// commit
// ============================================================================

describe('MeasurementStore — commit', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('does nothing when neither point is set', () => {
    store.commit();
    expect(store.measurements).toHaveLength(0);
  });

  it('does nothing when only startPoint is set', () => {
    store.setStart({ x: 0, y: 0 });
    store.commit();
    expect(store.measurements).toHaveLength(0);
  });

  it('adds a measurement when both points are set', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 3, y: 4 });
    store.commit();
    expect(store.measurements).toHaveLength(1);
  });

  it('committed measurement has correct start, end, and distancePx', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 3, y: 4 });
    store.commit();
    const m = store.measurements[0];
    expect(m.start).toEqual({ x: 0, y: 0 });
    expect(m.end).toEqual({ x: 3, y: 4 });
    expect(m.distancePx).toBe(5);
  });

  it('committed measurement has id prefixed with "m-"', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 1, y: 0 });
    store.commit();
    expect(store.measurements[0].id).toMatch(/^m-\d+$/);
  });

  it('each commit produces a unique id', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 1, y: 0 });
    store.commit();

    store.setStart({ x: 5, y: 5 });
    store.setEnd({ x: 6, y: 5 });
    store.commit();

    const ids = store.measurements.map(m => m.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('commit clears startPoint and endPoint', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 0 });
    store.commit();
    expect(store.startPoint).toBeNull();
    expect(store.endPoint).toBeNull();
  });

  it('without calibration distanceCalibrated is null and unit is "px"', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 0 });
    store.commit();
    const m = store.measurements[0];
    expect(m.distanceCalibrated).toBeNull();
    expect(m.unit).toBe('px');
  });

  it('with calibration computes distanceCalibrated and sets unit', () => {
    store.calibrate(100, 'cm');
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 300, y: 400 }); // distancePx = 500
    store.commit();
    const m = store.measurements[0];
    expect(m.distancePx).toBe(500);
    expect(m.distanceCalibrated).toBe(5); // 500 / 100
    expect(m.unit).toBe('cm');
  });

  it('multiple commits accumulate measurements', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 1, y: 0 });
    store.commit();

    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 0, y: 1 });
    store.commit();

    expect(store.measurements).toHaveLength(2);
  });
});

// ============================================================================
// calibrate
// ============================================================================

describe('MeasurementStore — calibrate', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('stores pixelsPerUnit and unit', () => {
    store.calibrate(72, 'in');
    expect(store.calibration).toEqual({ pixelsPerUnit: 72, unit: 'in' });
  });

  it('updating calibration replaces existing calibration', () => {
    store.calibrate(100, 'cm');
    store.calibrate(25.4, 'mm');
    expect(store.calibration?.unit).toBe('mm');
    expect(store.calibration?.pixelsPerUnit).toBe(25.4);
  });
});

// ============================================================================
// removeMeasurement
// ============================================================================

describe('MeasurementStore — removeMeasurement', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('removes the measurement with the given id', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 10, y: 0 });
    store.commit();

    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 0, y: 20 });
    store.commit();

    const idToRemove = store.measurements[0].id;
    store.removeMeasurement(idToRemove);

    expect(store.measurements).toHaveLength(1);
    expect(store.measurements[0].id).not.toBe(idToRemove);
  });

  it('is a no-op for an unknown id', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 5, y: 0 });
    store.commit();

    store.removeMeasurement('nonexistent');
    expect(store.measurements).toHaveLength(1);
  });

  it('leaves measurements array empty after removing the last entry', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 5, y: 0 });
    store.commit();

    const id = store.measurements[0].id;
    store.removeMeasurement(id);
    expect(store.measurements).toHaveLength(0);
  });
});

// ============================================================================
// clearAll
// ============================================================================

describe('MeasurementStore — clearAll', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('clears the measurements array', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 5, y: 0 });
    store.commit();

    store.clearAll();
    expect(store.measurements).toHaveLength(0);
  });

  it('clears startPoint', () => {
    store.setStart({ x: 10, y: 10 });
    store.clearAll();
    expect(store.startPoint).toBeNull();
  });

  it('clears endPoint', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 5, y: 5 });
    store.clearAll();
    expect(store.endPoint).toBeNull();
  });

  it('does not affect calibration', () => {
    store.calibrate(50, 'mm');
    store.clearAll();
    expect(store.calibration).not.toBeNull();
    expect(store.calibration?.unit).toBe('mm');
  });
});

// ============================================================================
// reset
// ============================================================================

describe('MeasurementStore — reset', () => {
  let store: MeasurementStore;

  beforeEach(() => {
    store = new MeasurementStore();
  });

  it('sets active to false', () => {
    store.activate();
    store.reset();
    expect(store.active).toBe(false);
  });

  it('clears startPoint', () => {
    store.setStart({ x: 1, y: 2 });
    store.reset();
    expect(store.startPoint).toBeNull();
  });

  it('clears endPoint', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 5, y: 5 });
    store.reset();
    expect(store.endPoint).toBeNull();
  });

  it('clears all committed measurements', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 1, y: 0 });
    store.commit();
    store.reset();
    expect(store.measurements).toHaveLength(0);
  });

  it('clears calibration', () => {
    store.calibrate(100, 'cm');
    store.reset();
    expect(store.calibration).toBeNull();
  });

  it('resets the internal id counter so next commit starts from m-1 again', () => {
    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 1, y: 0 });
    store.commit();
    store.reset();

    store.setStart({ x: 0, y: 0 });
    store.setEnd({ x: 1, y: 0 });
    store.commit();
    expect(store.measurements[0].id).toBe('m-1');
  });
});
