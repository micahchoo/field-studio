/**
 * ViewerWorkbench Molecule
 *
 * Composes: All viewer feature atoms + IconButton, ActionButton molecules
 *
 * IIIF Image API workbench for manipulating image parameters.
 * Refactored from 532 lines using feature-specific atoms.
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Receives cx and fieldMode via props (no hook calls)
 * - Composes atoms from features/viewer/ui/atoms
 * - Local UI state only (useState, useCallback)
 * - No domain logic - pure parameter manipulation
 */

import React, { useCallback, useMemo, useState } from 'react';
import { IconButton, TabBar } from '@/src/shared/ui/molecules';
import {
  ParameterSection, PresetSelector, CoordinateInput, ImagePreview,
  PreviewHeader, UrlBar, RotationDial, UpscaleToggle,
  QualitySelector, FormatSelector, CodePanel, WorkbenchFooter,
} from '@/src/features/viewer/ui/atoms';
import type { ContextualClassNames } from '@/hooks/useContextualStyles';
import type { IIIFCanvas } from '@/types';

export interface ViewerWorkbenchProps {
  canvas: IIIFCanvas;
  onApply: (url: string) => void;
  onClose: () => void;
  cx?: ContextualClassNames | Record<string, string>;
  fieldMode?: boolean;
}

interface ImageApiParams {
  region: string; size: string; rotation: string; quality: string; format: string;
}

type RegionMode = 'full' | 'square' | 'pct' | 'pixel';
type SizeMode = 'max' | 'pct' | 'w' | 'h' | 'wh' | 'bestfit';

const REGION_PRESETS = [
  { label: 'Full', value: 'full' as const, description: 'Entire image' },
  { label: 'Square', value: 'square' as const, description: 'Centered square crop' },
  { label: 'Pixels', value: 'pixel' as const, description: 'x,y,w,h in pixels' },
  { label: 'Percent', value: 'pct' as const, description: 'Percent-based region' },
];

const SIZE_PRESETS = [
  { label: 'Max', value: 'max' as const, description: 'Maximum available size' },
  { label: 'Percent', value: 'pct' as const, description: 'Scale by percentage' },
  { label: 'Width', value: 'w' as const, description: 'Width only, auto height' },
  { label: 'Height', value: 'h' as const, description: 'Height only, auto width' },
  { label: 'Exact', value: 'wh' as const, description: 'Exact width,height' },
  { label: 'Best Fit', value: 'bestfit' as const, description: 'Fit within dimensions' },
];

const QUALITY_OPTIONS = [
  { value: 'default', label: 'Default', description: 'Recommended quality' },
  { value: 'color', label: 'Color', description: 'Full color (if available)' },
  { value: 'gray', label: 'Gray', description: 'Grayscale conversion' },
  { value: 'bitonal', label: 'Bitonal', description: 'Black and white only' },
];

const FORMAT_OPTIONS = [
  { value: 'jpg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'webp', label: 'WebP' },
  { value: 'tif', label: 'TIFF' },
];

export const ViewerWorkbench: React.FC<ViewerWorkbenchProps> = ({
  canvas, onApply, onClose, cx: _cx, fieldMode = false,
}) => {
  const [regionMode, setRegionMode] = useState<RegionMode>('full');
  const [sizeMode, setSizeMode] = useState<SizeMode>('max');
  const [regionCoords, setRegionCoords] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [sizeVal, setSizeVal] = useState({ w: 1000, h: 1000, pct: 100 });
  const [rotationDeg, setRotationDeg] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [upscale, setUpscale] = useState(false);
  const [quality, setQuality] = useState('default');
  const [format, setFormat] = useState('jpg');
  const [activeTab, setActiveTab] = useState<'params' | 'code'>('params');

  const paintingBody = canvas.items?.[0]?.items?.[0]?.body as { id?: string; service?: Array<{ id: string }> } | undefined;
  const service = paintingBody?.service?.[0];
  const rawImageId = service?.id || paintingBody?.id || '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const imageId = useMemo(() => {
    if (!rawImageId) return '';
    if (rawImageId.startsWith('http')) return rawImageId;
    if (rawImageId.startsWith('/')) return `${baseUrl}${rawImageId}`;
    return rawImageId;
  }, [rawImageId, baseUrl]);

  const params = useMemo<ImageApiParams>(() => {
    let r = 'full';
    if (regionMode === 'square') r = 'square';
    else if (regionMode === 'pct') r = `pct:${regionCoords.x},${regionCoords.y},${regionCoords.w},${regionCoords.h}`;
    else if (regionMode === 'pixel') r = `${regionCoords.x},${regionCoords.y},${regionCoords.w},${regionCoords.h}`;

    let s = 'max';
    const up = upscale ? '^' : '';
    if (sizeMode === 'pct') s = `${up}pct:${sizeVal.pct}`;
    else if (sizeMode === 'w') s = `${up}${sizeVal.w},`;
    else if (sizeMode === 'h') s = `${up},${sizeVal.h}`;
    else if (sizeMode === 'wh') s = `${up}${sizeVal.w},${sizeVal.h}`;
    else if (sizeMode === 'bestfit') s = `${up}!${sizeVal.w},${sizeVal.h}`;

    return { region: r, size: s, rotation: mirrored ? `!${rotationDeg}` : rotationDeg.toString(), quality, format };
  }, [regionMode, sizeMode, regionCoords, sizeVal, rotationDeg, mirrored, upscale, quality, format]);

  const url = service ? `${imageId}/${params.region}/${params.size}/${params.rotation}/${params.quality}.${params.format}` : imageId;

  const handleReset = useCallback(() => {
    setRegionMode('full'); setSizeMode('max'); setRegionCoords({ x: 0, y: 0, w: 100, h: 100 });
    setSizeVal({ w: 1000, h: 1000, pct: 100 }); setRotationDeg(0); setMirrored(false);
    setUpscale(false); setQuality('default'); setFormat('jpg');
  }, []);

  const bgClass = fieldMode ? 'bg-slate-950' : 'bg-white';
  const borderClass = fieldMode ? 'border-slate-800' : 'border-slate-200';
  const textClass = fieldMode ? 'text-white' : 'text-slate-900';

  const regionFields = [
    { key: 'x', label: 'X', value: regionCoords.x },
    { key: 'y', label: 'Y', value: regionCoords.y },
    { key: 'w', label: regionMode === 'pct' ? 'W %' : 'Width', value: regionCoords.w },
    { key: 'h', label: regionMode === 'pct' ? 'H %' : 'Height', value: regionCoords.h },
  ];

  const sizeFields: Array<{ key: string; label: string; value: number }> = [];
  if (sizeMode !== 'h' && sizeMode !== 'max' && sizeMode !== 'pct') sizeFields.push({ key: 'w', label: 'Width', value: sizeVal.w });
  if (sizeMode !== 'w' && sizeMode !== 'max' && sizeMode !== 'pct') sizeFields.push({ key: 'h', label: 'Height', value: sizeVal.h });

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm`} onClick={onClose}>
      <div className={`${bgClass} w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl border ${borderClass} flex overflow-hidden`} onClick={e => e.stopPropagation()}>
        {/* Left: Preview */}
        <div className="flex-1 bg-slate-950 relative flex flex-col overflow-hidden">
          <PreviewHeader fieldMode={fieldMode} />
          <ImagePreview src={url} rotation={rotationDeg} mirrored={mirrored} fieldMode={fieldMode} />
          <UrlBar imageId={imageId} {...params} fieldMode={fieldMode} />
        </div>

        {/* Right: Controls */}
        <div className={`w-96 ${bgClass} border-l ${borderClass} flex flex-col`}>
          <TabBar
            tabs={[
              { id: 'params', label: 'Parameters', icon: 'tune' },
              { id: 'code', label: 'Code', icon: 'code' },
            ]}
            activeTabId={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as 'params' | 'code')}
            fieldMode={fieldMode}
          />

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'params' ? (
              <div className="p-4 space-y-6">
                <ParameterSection title="Region" icon="crop" color="green" description={REGION_PRESETS.find(p => p.value === regionMode)?.description} control={<PresetSelector options={REGION_PRESETS} value={regionMode} onChange={v => setRegionMode(v as RegionMode)} fieldMode={fieldMode} />} fieldMode={fieldMode}>
                  {regionMode !== 'full' && regionMode !== 'square' && <CoordinateInput fields={regionFields} onChange={(k, v) => setRegionCoords(p => ({ ...p, [k]: v }))} fieldMode={fieldMode} />}
                </ParameterSection>

                <ParameterSection title="Size" icon="aspect_ratio" color="blue" description={SIZE_PRESETS.find(p => p.value === sizeMode)?.description} control={<div className="flex gap-2 items-center"><UpscaleToggle enabled={upscale} onChange={setUpscale} fieldMode={fieldMode} /><PresetSelector options={SIZE_PRESETS} value={sizeMode} onChange={v => setSizeMode(v as SizeMode)} fieldMode={fieldMode} /></div>} fieldMode={fieldMode}>
                  {sizeMode === 'pct' && <RotationDial value={sizeVal.pct} onChange={v => setSizeVal(p => ({ ...p, pct: v }))} presets={[25, 50, 100, 150, 200]} fieldMode={fieldMode} />}
                  {sizeMode !== 'max' && sizeMode !== 'pct' && <CoordinateInput fields={sizeFields} onChange={(k, v) => setSizeVal(p => ({ ...p, [k]: v }))} columns={sizeFields.length === 1 ? 1 : 2} fieldMode={fieldMode} />}
                </ParameterSection>

                <ParameterSection title="Rotation" icon="rotate_right" color="orange" control={<IconButton icon="flip" ariaLabel="Mirror horizontally" onClick={() => setMirrored(!mirrored)} variant={mirrored ? 'primary' : 'ghost'} size="sm" className={mirrored ? '' : fieldMode ? '!text-slate-400' : ''} />} fieldMode={fieldMode}>
                  <RotationDial value={rotationDeg} onChange={setRotationDeg} fieldMode={fieldMode} />
                </ParameterSection>

                <div className="grid grid-cols-2 gap-4">
                  <ParameterSection title="Quality" icon="high_quality" color="purple" fieldMode={fieldMode}>
                    <QualitySelector options={QUALITY_OPTIONS} value={quality} onChange={setQuality} fieldMode={fieldMode} />
                  </ParameterSection>
                  <ParameterSection title="Format" icon="image" color="yellow" fieldMode={fieldMode}>
                    <FormatSelector options={FORMAT_OPTIONS} value={format} onChange={setFormat} fieldMode={fieldMode} />
                  </ParameterSection>
                </div>
              </div>
            ) : (
              <CodePanel curlCommand={`curl -X GET "${url}"`} htmlTag={`<img src="${url}" alt="IIIF Image" loading="lazy" />`} fieldMode={fieldMode} />
            )}
          </div>

          <WorkbenchFooter onApply={() => { onApply(url); onClose(); }} onReset={handleReset} fieldMode={fieldMode} />
        </div>
      </div>
    </div>
  );
};

export default ViewerWorkbench;
