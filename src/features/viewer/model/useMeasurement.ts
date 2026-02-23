/**
 * useMeasurement Hook
 *
 * Manages measurement tool state for OSD viewer.
 * Click two points to measure distance. Optional calibration
 * converts pixels to real-world units.
 *
 * @module features/viewer/model/useMeasurement
 */

import { useCallback, useState } from 'react';

declare const OpenSeadragon: any;

interface Point {
  x: number;
  y: number;
}

export type MeasureUnit = 'px' | 'cm' | 'in' | 'mm';

export interface MeasurementState {
  active: boolean;
  points: [Point, Point] | null;
  unit: MeasureUnit;
  /** Pixels per unit for calibration */
  scale: number | null;
  /** Whether in calibration mode */
  calibrating: boolean;
  /** Calibration points */
  calibrationPoints: [Point, Point] | null;
}

export interface UseMeasurementReturn extends MeasurementState {
  /** Computed distance in image pixels */
  distancePx: number | null;
  /** Computed distance in selected unit (if calibrated) */
  distanceUnit: number | null;
  /** Toggle measurement mode */
  toggleActive: () => void;
  /** Handle click on OSD viewer (viewport coordinates) */
  handleViewerClick: (viewerRef: React.MutableRefObject<any>, viewportPoint: { x: number; y: number }) => void;
  /** Set measurement unit */
  setUnit: (unit: MeasureUnit) => void;
  /** Enter calibration mode */
  startCalibration: () => void;
  /** Finish calibration with known distance */
  finishCalibration: (knownDistance: number) => void;
  /** Cancel calibration */
  cancelCalibration: () => void;
  /** Clear current measurement */
  clear: () => void;
}

function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function useMeasurement(): UseMeasurementReturn {
  const [active, setActive] = useState(false);
  const [points, setPoints] = useState<[Point, Point] | null>(null);
  const [unit, setUnit] = useState<MeasureUnit>('px');
  const [scale, setScale] = useState<number | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<[Point, Point] | null>(null);
  const [pendingPoint, setPendingPoint] = useState<Point | null>(null);
  const [pendingCalibrationPoint, setPendingCalibrationPoint] = useState<Point | null>(null);

  const distancePx = points ? calculateDistance(points[0], points[1]) : null;
  const distanceUnit = distancePx !== null && scale !== null ? distancePx / scale : null;

  const toggleActive = useCallback(() => {
    setActive(prev => {
      if (prev) {
        // Deactivating
        setPoints(null);
        setPendingPoint(null);
        setCalibrating(false);
      }
      return !prev;
    });
  }, []);

  const handleViewerClick = useCallback((viewerRef: React.MutableRefObject<any>, viewportPoint: { x: number; y: number }) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Convert viewport coordinates to image coordinates
    let imagePoint: Point;
    try {
      const imgCoord = viewer.viewport.viewportToImageCoordinates(
        new OpenSeadragon.Point(viewportPoint.x, viewportPoint.y)
      );
      imagePoint = { x: imgCoord.x, y: imgCoord.y };
    } catch {
      imagePoint = viewportPoint;
    }

    if (calibrating) {
      if (!pendingCalibrationPoint) {
        setPendingCalibrationPoint(imagePoint);
      } else {
        setCalibrationPoints([pendingCalibrationPoint, imagePoint]);
        setPendingCalibrationPoint(null);
      }
    } else {
      if (!pendingPoint) {
        setPendingPoint(imagePoint);
        setPoints(null);
      } else {
        setPoints([pendingPoint, imagePoint]);
        setPendingPoint(null);
      }
    }
  }, [calibrating, pendingPoint, pendingCalibrationPoint]);

  const startCalibration = useCallback(() => {
    setCalibrating(true);
    setCalibrationPoints(null);
    setPendingCalibrationPoint(null);
  }, []);

  const finishCalibration = useCallback((knownDistance: number) => {
    if (!calibrationPoints || knownDistance <= 0) return;
    const pxDist = calculateDistance(calibrationPoints[0], calibrationPoints[1]);
    setScale(pxDist / knownDistance);
    setCalibrating(false);
    setCalibrationPoints(null);
  }, [calibrationPoints]);

  const cancelCalibration = useCallback(() => {
    setCalibrating(false);
    setCalibrationPoints(null);
    setPendingCalibrationPoint(null);
  }, []);

  const clear = useCallback(() => {
    setPoints(null);
    setPendingPoint(null);
  }, []);

  return {
    active,
    points,
    unit,
    scale,
    calibrating,
    calibrationPoints,
    distancePx,
    distanceUnit,
    toggleActive,
    handleViewerClick,
    setUnit,
    startCalibration,
    finishCalibration,
    cancelCalibration,
    clear,
  };
}
