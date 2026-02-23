/**
 * MeasurementOverlay Molecule
 *
 * SVG overlay on OSD viewer showing measurement lines, distance labels,
 * and a persistent scale bar when calibrated.
 *
 * @module features/viewer/ui/molecules/MeasurementOverlay
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Icon } from '@/src/shared/ui/atoms';
import type { MeasureUnit, UseMeasurementReturn } from '../../model/useMeasurement';

export interface MeasurementOverlayProps {
  measurement: UseMeasurementReturn;
  viewerRef: React.MutableRefObject<any>;
  osdContainerRef: React.RefObject<HTMLDivElement>;
  fieldMode?: boolean;
}

declare const OpenSeadragon: any;

function imageToViewport(viewer: any, point: { x: number; y: number }): { x: number; y: number } | null {
  if (!viewer?.viewport) return null;
  try {
    const vp = viewer.viewport.imageToViewportCoordinates(
      new OpenSeadragon.Point(point.x, point.y)
    );
    const web = viewer.viewport.viewportToWindowCoordinates(vp);
    return { x: web.x, y: web.y };
  } catch {
    return null;
  }
}

export const MeasurementOverlay: React.FC<MeasurementOverlayProps> = ({
  measurement,
  viewerRef,
  osdContainerRef,
  fieldMode = false,
}) => {
  const {
    active,
    points,
    unit,
    scale,
    calibrating,
    calibrationPoints,
    distancePx,
    distanceUnit,
    handleViewerClick,
    setUnit,
    startCalibration,
    finishCalibration,
    cancelCalibration,
    clear,
  } = measurement;

  const [calibrationInput, setCalibrationInput] = useState('');
  const [viewportPoints, setViewportPoints] = useState<[{ x: number; y: number }, { x: number; y: number }] | null>(null);

  // Update viewport points when OSD viewport changes
  useEffect(() => {
    if (!active || !points) {
      setViewportPoints(null);
      return;
    }

    const viewer = viewerRef.current;
    if (!viewer) return;

    const update = () => {
      const container = osdContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const p1 = imageToViewport(viewer, points[0]);
      const p2 = imageToViewport(viewer, points[1]);
      if (p1 && p2) {
        setViewportPoints([
          { x: p1.x - rect.left, y: p1.y - rect.top },
          { x: p2.x - rect.left, y: p2.y - rect.top },
        ]);
      }
    };

    update();
    viewer.addHandler('animation', update);
    viewer.addHandler('zoom', update);
    return () => {
      viewer.removeHandler('animation', update);
      viewer.removeHandler('zoom', update);
    };
  }, [active, points, viewerRef, osdContainerRef]);

  // Register OSD click handler
  useEffect(() => {
    if (!active) return;
    const viewer = viewerRef.current;
    if (!viewer) return;

    const handler = (e: { position: { x: number; y: number }; quick: boolean }) => {
      if (!e.quick) return;
      const viewportPoint = viewer.viewport.pointFromPixel(e.position);
      handleViewerClick(viewerRef, { x: viewportPoint.x, y: viewportPoint.y });
    };

    viewer.addHandler('canvas-click', handler);
    return () => viewer.removeHandler('canvas-click', handler);
  }, [active, viewerRef, handleViewerClick]);

  if (!active) return null;

  const formatDistance = () => {
    if (distanceUnit !== null && scale !== null) {
      return `${distanceUnit.toFixed(2)} ${unit}`;
    }
    if (distancePx !== null) {
      return `${Math.round(distancePx)} px`;
    }
    return '';
  };

  const accentColor = fieldMode ? '#eab308' : '#3b82f6';

  return (
    <>
      {/* SVG overlay for measurement line */}
      {viewportPoints && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {/* Line */}
          <line
            x1={viewportPoints[0].x}
            y1={viewportPoints[0].y}
            x2={viewportPoints[1].x}
            y2={viewportPoints[1].y}
            stroke={accentColor}
            strokeWidth={2}
            strokeDasharray="6,3"
          />
          {/* Endpoints */}
          <circle cx={viewportPoints[0].x} cy={viewportPoints[0].y} r={4} fill={accentColor} />
          <circle cx={viewportPoints[1].x} cy={viewportPoints[1].y} r={4} fill={accentColor} />
          {/* Distance label */}
          <text
            x={(viewportPoints[0].x + viewportPoints[1].x) / 2}
            y={(viewportPoints[0].y + viewportPoints[1].y) / 2 - 10}
            textAnchor="middle"
            fill={accentColor}
            fontSize={12}
            fontWeight="bold"
            fontFamily="monospace"
          >
            <tspan
              style={{ background: 'black' }}
              dy={-2}
            >
              {formatDistance()}
            </tspan>
          </text>
        </svg>
      )}

      {/* Control panel */}
      <div className={`absolute bottom-4 right-4 z-20 w-48 shadow-brutal backdrop-blur-sm border ${
        fieldMode
          ? 'bg-nb-black/95 border-nb-yellow/30'
          : 'bg-nb-white border-nb-black/20'
      }`}>
        <div className={`flex items-center justify-between px-3 py-2 border-b ${
          fieldMode ? 'border-nb-yellow/20' : 'border-nb-black/10'
        }`}>
          <span className={`text-xs font-semibold flex items-center gap-1 ${
            fieldMode ? 'text-nb-yellow/70' : 'text-nb-black/50'
          }`}>
            <Icon name="straighten" className="text-sm" />
            Measure
          </span>
          {points && (
            <Button variant="ghost" size="bare" onClick={clear}>
              <span className={`text-[10px] ${fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/40'}`}>Clear</span>
            </Button>
          )}
        </div>

        <div className="p-2 space-y-2">
          {/* Distance display */}
          {distancePx !== null ? (
            <div className={`text-center py-1 text-sm font-mono font-bold ${
              fieldMode ? 'text-nb-yellow' : 'text-nb-blue'
            }`}>
              {formatDistance()}
            </div>
          ) : (
            <div className={`text-center py-1 text-xs ${
              fieldMode ? 'text-nb-yellow/50' : 'text-nb-black/40'
            }`}>
              {calibrating ? 'Click two points of known distance' : 'Click two points to measure'}
            </div>
          )}

          {/* Unit selector */}
          <div className="flex gap-1">
            {(['px', 'cm', 'in', 'mm'] as MeasureUnit[]).map(u => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`flex-1 text-[10px] py-1 font-bold uppercase ${
                  u === unit
                    ? fieldMode ? 'bg-nb-yellow/20 text-nb-yellow' : 'bg-nb-blue/10 text-nb-blue'
                    : fieldMode ? 'text-nb-yellow/40' : 'text-nb-black/30'
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Calibration */}
          {calibrating ? (
            <div className="space-y-1">
              {calibrationPoints && (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={calibrationInput}
                    onChange={(e) => setCalibrationInput(e.target.value)}
                    placeholder={`Distance in ${unit}`}
                    className={`flex-1 text-xs px-2 py-1 border ${
                      fieldMode ? 'bg-nb-black border-nb-yellow/30 text-nb-yellow' : 'border-nb-black/20'
                    }`}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      finishCalibration(parseFloat(calibrationInput));
                      setCalibrationInput('');
                    }}
                    className="text-[10px]"
                  >
                    Set
                  </Button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={cancelCalibration} className="w-full text-[10px]">
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={startCalibration}
              className={`w-full text-[10px] ${scale ? '' : 'opacity-70'}`}
            >
              {scale ? `Calibrated (${scale.toFixed(1)} px/${unit})` : 'Calibrate Scale'}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default MeasurementOverlay;
