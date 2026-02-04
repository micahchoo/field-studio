import React, { useState } from 'react';
import { Icon } from './Icon';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { getIIIFValue, IIIFAnnotation, IIIFAnnotationPage, IIIFCanvas, IIIFItem, IIIFManifest } from '../types';
import { DEFAULT_INGEST_PREFS, IIIF_CONFIG, IIIF_SPEC } from '../constants';
import { useToast } from './Toast';

interface BoardItem {
  id: string;
  resourceId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  resourceType: string;
  label: string;
  blobUrl?: string;
  annotation?: string;
  isNote?: boolean;
  metadata?: IIIFItem['metadata'];
  summary?: IIIFItem['summary'];
  requiredStatement?: IIIFItem['requiredStatement'];
  rights?: IIIFItem['rights'];
  provider?: IIIFItem['provider'];
  behavior?: IIIFItem['behavior'];
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  label?: string;
  fromAnchor?: string;
  toAnchor?: string;
  waypoints?: { x: number, y: number }[];
  style?: 'straight' | 'elbow' | 'curved';
  color?: string;
}

interface BoardExportDialogProps {
  items: BoardItem[];
  connections: Connection[];
  onClose: () => void;
  onSaveToCollection?: (manifest: IIIFManifest) => void;
  fieldMode?: boolean;
}

type ExportFormat = 'iiif' | 'svg' | 'png';

interface ExportOptions {
  format: ExportFormat;
  // IIIF options
  includeMetadata: boolean;
  includeConnections: boolean;
  // SVG options
  embedImages: boolean;
  linkImages: boolean; // Export as ZIP with linked images
  backgroundColor: string;
  includeLabels: boolean;
  // PNG options
  scale: number;
}

const BACKGROUND_COLORS = [
  { value: 'transparent', label: 'Transparent' },
  { value: '#ffffff', label: 'White' },
  { value: '#f8fafc', label: 'Slate 50' },
  { value: '#1e293b', label: 'Slate 800' },
  { value: '#0f172a', label: 'Slate 900' },
];

export const BoardExportDialog: React.FC<BoardExportDialogProps> = ({
  items,
  connections,
  onClose,
  onSaveToCollection,
  fieldMode = false,
}) => {
  const { showToast } = useToast();
  const [options, setOptions] = useState<ExportOptions>({
    format: 'iiif',
    includeMetadata: true,
    includeConnections: true,
    embedImages: false,
    linkImages: false,
    backgroundColor: '#ffffff',
    includeLabels: true,
    scale: 2,
  });
  const [exporting, setExporting] = useState(false);

  const bgClass = fieldMode ? 'bg-slate-900' : 'bg-white';
  const textClass = fieldMode ? 'text-white' : 'text-slate-800';
  const labelClass = fieldMode ? 'text-slate-400' : 'text-slate-500';
  const borderClass = fieldMode ? 'border-slate-700' : 'border-slate-200';
  const btnClass = fieldMode
    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700'
    : 'bg-slate-50 hover:bg-slate-100 border-slate-200';

  const generateIIIFManifest = (): IIIFManifest => {
    const padding = 100;
    const minX = Math.min(...items.map(i => i.x)) - padding;
    const minY = Math.min(...items.map(i => i.y)) - padding;
    const maxX = Math.max(...items.map(i => i.x + i.w)) + padding;
    const maxY = Math.max(...items.map(i => i.y + i.h)) + padding;
    const boardWidth = Math.max(maxX - minX, DEFAULT_INGEST_PREFS.defaultCanvasWidth);
    const boardHeight = Math.max(maxY - minY, DEFAULT_INGEST_PREFS.defaultCanvasHeight);

    const baseUrl = IIIF_CONFIG.BASE_URL.DEFAULT;
    const boardId = IIIF_CONFIG.ID_PATTERNS.MANIFEST(baseUrl, `board-${crypto.randomUUID()}`);
    const canvasId = `${boardId}/canvas/1`;

    const paintingAnnotations: IIIFAnnotation[] = items.map((item, idx) => {
      const normX = item.x - minX;
      const normY = item.y - minY;

      const body = item.isNote ? {
        type: "TextualBody",
        value: item.annotation || item.label,
        format: "text/plain"
      } : (item.blobUrl ? {
        id: item.blobUrl,
        type: "Image",
        format: "image/jpeg",
        width: item.w,
        height: item.h
      } : {
        type: "TextualBody",
        value: item.label,
        format: "text/plain"
      });

      const anno: any = {
        id: `${canvasId}/annotation/item-${idx}`,
        type: "Annotation",
        motivation: "painting",
        label: { none: [item.label] },
        body: body as any,
        target: `${canvasId}#xywh=${Math.round(normX)},${Math.round(normY)},${Math.round(item.w)},${Math.round(item.h)}`,
      };

      if (options.includeMetadata) {
        if (item.metadata) anno.metadata = item.metadata;
        if (item.summary) anno.summary = item.summary;
        if (item.requiredStatement) anno.requiredStatement = item.requiredStatement;
        if (item.rights) anno.rights = item.rights;
        if (item.provider) anno.provider = item.provider;
        if (item.behavior) anno.behavior = item.behavior;
      }

      return anno;
    });

    const linkingAnnotations: IIIFAnnotation[] = options.includeConnections
      ? connections.map((conn, idx) => {
          const fromItem = items.find(i => i.id === conn.fromId);
          const toItem = items.find(i => i.id === conn.toId);
          if (!fromItem || !toItem) return null;

          const fromCenter = { x: fromItem.x + fromItem.w / 2 - minX, y: fromItem.y + fromItem.h / 2 - minY };

          return {
            id: `${canvasId}/annotation/link-${idx}`,
            type: "Annotation",
            motivation: "linking",
            label: { none: [conn.label || conn.type] },
            body: {
              type: "TextualBody",
              value: JSON.stringify({
                relationshipType: conn.type,
                label: conn.label,
                fromAnchor: conn.fromAnchor,
                toAnchor: conn.toAnchor,
                waypoints: conn.waypoints,
                style: conn.style,
                color: conn.color
              }),
              format: "application/json"
            },
            target: `${canvasId}#xywh=${Math.round(fromCenter.x)},${Math.round(fromCenter.y)},1,1`,
          } as IIIFAnnotation;
        }).filter(Boolean) as IIIFAnnotation[]
      : [];

    const paintingPage: IIIFAnnotationPage = {
      id: `${canvasId}/page/painting`,
      type: "AnnotationPage",
      items: paintingAnnotations
    };

    const linkingPage: IIIFAnnotationPage | null = linkingAnnotations.length > 0 ? {
      id: `${canvasId}/page/linking`,
      type: "AnnotationPage",
      items: linkingAnnotations
    } : null;

    const boardCanvas: IIIFCanvas = {
      id: canvasId,
      type: "Canvas",
      label: { none: ["Research Board"] },
      width: boardWidth,
      height: boardHeight,
      items: [paintingPage],
      annotations: linkingPage ? [linkingPage] : undefined
    };

    return {
      "@context": IIIF_SPEC.PRESENTATION_3.CONTEXT,
      id: boardId,
      type: "Manifest",
      label: { none: [`Research Board - ${new Date().toLocaleDateString()}`] },
      items: [boardCanvas]
    };
  };

  // Return { svg, imageUrls } for linked images export
  const generateSVG = async (useLinkedImages = false): Promise<{ svg: string; imageUrls: { url: string; filename: string }[] }> => {
    const padding = 50;
    const minX = Math.min(...items.map(i => i.x)) - padding;
    const minY = Math.min(...items.map(i => i.y)) - padding;
    const maxX = Math.max(...items.map(i => i.x + i.w)) + padding;
    const maxY = Math.max(...items.map(i => i.y + i.h)) + padding;
    const width = maxX - minX;
    const height = maxY - minY;

    const imageUrls: { url: string; filename: string }[] = [];
    let imageIndex = 0;

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .board-label { font-family: system-ui, sans-serif; font-size: 12px; font-weight: bold; }
      .board-note { font-family: 'Comic Sans MS', cursive; font-size: 14px; }
    </style>
  </defs>
  ${options.backgroundColor !== 'transparent' ? `<rect width="100%" height="100%" fill="${options.backgroundColor}"/>` : ''}
`;

    // Draw connections first (behind items)
    for (const conn of connections) {
      const fromItem = items.find(i => i.id === conn.fromId);
      const toItem = items.find(i => i.id === conn.toId);
      if (!fromItem || !toItem) continue;

      const fromX = fromItem.x + fromItem.w / 2 - minX;
      const fromY = fromItem.y + fromItem.h - minY;
      const toX = toItem.x + toItem.w / 2 - minX;
      const toY = toItem.y - minY;

      const strokeColor = conn.color || '#3b82f6';

      if (conn.style === 'elbow') {
        const midY = (fromY + toY) / 2;
        svgContent += `  <path d="M${fromX},${fromY} L${fromX},${midY} L${toX},${midY} L${toX},${toY}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>\n`;
      } else if (conn.style === 'curved') {
        const ctrlY = (fromY + toY) / 2;
        svgContent += `  <path d="M${fromX},${fromY} Q${fromX},${ctrlY} ${(fromX+toX)/2},${ctrlY} T${toX},${toY}" fill="none" stroke="${strokeColor}" stroke-width="2.5"/>\n`;
      } else {
        svgContent += `  <line x1="${fromX}" y1="${fromY}" x2="${toX}" y2="${toY}" stroke="${strokeColor}" stroke-width="2.5"/>\n`;
      }
      // Arrow marker at end
      svgContent += `  <circle cx="${toX}" cy="${toY}" r="4" fill="${strokeColor}"/>\n`;
    }

    // Draw items
    for (const item of items) {
      const x = item.x - minX;
      const y = item.y - minY;

      if (item.isNote) {
        svgContent += `  <rect x="${x}" y="${y}" width="${item.w}" height="${item.h}" fill="#fef9c3" stroke="#fbbf24" stroke-width="2" rx="8"/>\n`;
        if (options.includeLabels && item.annotation) {
          svgContent += `  <text x="${x + 16}" y="${y + 30}" class="board-note" fill="#78350f">${escapeXml(item.annotation.slice(0, 50))}${item.annotation.length > 50 ? '...' : ''}</text>\n`;
        }
      } else {
        svgContent += `  <rect x="${x}" y="${y}" width="${item.w}" height="${item.h}" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" rx="12"/>\n`;

        if (item.blobUrl) {
          if (useLinkedImages) {
            // Use relative path for linked images
            const ext = item.blobUrl.includes('.png') ? 'png' : 'jpg';
            const filename = `image-${imageIndex}.${ext}`;
            imageUrls.push({ url: item.blobUrl, filename });
            svgContent += `  <image x="${x + 4}" y="${y + 4}" width="${item.w - 8}" height="${item.h - 40}" href="images/${filename}" preserveAspectRatio="xMidYMid meet"/>\n`;
            imageIndex++;
          } else if (options.embedImages) {
            // Embed image as data URL (reference external URL)
            svgContent += `  <image x="${x + 4}" y="${y + 4}" width="${item.w - 8}" height="${item.h - 40}" href="${escapeXml(item.blobUrl)}" preserveAspectRatio="xMidYMid meet"/>\n`;
          } else {
            svgContent += `  <image x="${x + 4}" y="${y + 4}" width="${item.w - 8}" height="${item.h - 40}" href="${escapeXml(item.blobUrl)}" preserveAspectRatio="xMidYMid meet"/>\n`;
          }
        }

        if (options.includeLabels) {
          svgContent += `  <rect x="${x}" y="${y + item.h - 32}" width="${item.w}" height="32" fill="#f8fafc" rx="0 0 12 12"/>\n`;
          svgContent += `  <text x="${x + 12}" y="${y + item.h - 12}" class="board-label" fill="#1e293b">${escapeXml(item.label.slice(0, 25))}${item.label.length > 25 ? '...' : ''}</text>\n`;
        }
      }
    }

    svgContent += '</svg>';
    return { svg: svgContent, imageUrls };
  };

  const escapeXml = (str: string): string => {
    return str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const handleExport = async () => {
    if (items.length === 0) {
      showToast('No items on board to export', 'warning');
      return;
    }

    setExporting(true);

    try {
      if (options.format === 'iiif') {
        const manifest = generateIIIFManifest();
        const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/ld+json' });
        saveAs(blob, `board-export-${new Date().toISOString().split('T')[0]}.json`);
        showToast('Board exported as IIIF Manifest', 'success');
      } else if (options.format === 'svg') {
        if (options.linkImages) {
          // Export as ZIP with linked images
          const { svg, imageUrls } = await generateSVG(true);
          const zip = new JSZip();
          zip.file('board.svg', svg);

          // Create images folder and fetch images
          const imagesFolder = zip.folder('images');
          if (imagesFolder && imageUrls.length > 0) {
            showToast('Fetching images...', 'info');
            for (const { url, filename } of imageUrls) {
              try {
                // Try to fetch the image
                const response = await fetch(url);
                if (response.ok) {
                  const imageBlob = await response.blob();
                  imagesFolder.file(filename, imageBlob);
                }
              } catch (e) {
                console.warn(`Could not fetch image: ${url}`, e);
              }
            }
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          saveAs(zipBlob, `board-export-${new Date().toISOString().split('T')[0]}.zip`);
          showToast('Board exported as SVG with linked images', 'success');
        } else {
          const { svg } = await generateSVG(false);
          const blob = new Blob([svg], { type: 'image/svg+xml' });
          saveAs(blob, `board-export-${new Date().toISOString().split('T')[0]}.svg`);
          showToast('Board exported as SVG', 'success');
        }
      } else if (options.format === 'png') {
        // For PNG, we'd need to render SVG to canvas and export
        const { svg } = await generateSVG(false);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width * options.scale;
          canvas.height = img.height * options.scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(options.scale, options.scale);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((pngBlob) => {
              if (pngBlob) {
                saveAs(pngBlob, `board-export-${new Date().toISOString().split('T')[0]}.png`);
                showToast('Board exported as PNG', 'success');
              }
              URL.revokeObjectURL(url);
            }, 'image/png');
          }
        };
        img.src = url;
      }

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveToCollection = () => {
    if (!onSaveToCollection) return;
    const manifest = generateIIIFManifest();
    onSaveToCollection(manifest);
    showToast('Board saved to collection', 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl shadow-2xl ${bgClass} animate-in zoom-in-95`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${borderClass} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${fieldMode ? 'bg-yellow-400/20 text-yellow-400' : 'bg-iiif-blue/10 text-iiif-blue'}`}>
              <Icon name="file_download" className="text-xl" />
            </div>
            <div>
              <h2 className={`font-bold ${textClass}`}>Export Board</h2>
              <p className={`text-xs ${labelClass}`}>{items.length} items, {connections.length} connections</p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${btnClass}`}>
            <Icon name="close" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-3 block`}>
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'iiif', label: 'IIIF', icon: 'data_object', desc: 'Manifest JSON' },
                { value: 'svg', label: 'SVG', icon: 'image', desc: 'Vector graphic' },
                { value: 'png', label: 'PNG', icon: 'photo_camera', desc: 'Raster image' },
              ] as const).map(fmt => (
                <button
                  key={fmt.value}
                  onClick={() => setOptions({ ...options, format: fmt.value })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    options.format === fmt.value
                      ? (fieldMode ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'bg-blue-50 border-blue-500 text-blue-600')
                      : `${btnClass} border`
                  }`}
                >
                  <Icon name={fmt.icon} className="text-2xl mb-1" />
                  <div className="text-xs font-bold">{fmt.label}</div>
                  <div className={`text-[9px] ${labelClass}`}>{fmt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Format-specific options */}
          {options.format === 'iiif' && (
            <div className="space-y-3">
              <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${btnClass}`}>
                <input
                  type="checkbox"
                  checked={options.includeMetadata}
                  onChange={(e) => setOptions({ ...options, includeMetadata: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <div className={`text-sm font-medium ${textClass}`}>Include Metadata</div>
                  <div className={`text-xs ${labelClass}`}>Embed item metadata in annotations</div>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${btnClass}`}>
                <input
                  type="checkbox"
                  checked={options.includeConnections}
                  onChange={(e) => setOptions({ ...options, includeConnections: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <div className={`text-sm font-medium ${textClass}`}>Include Connections</div>
                  <div className={`text-xs ${labelClass}`}>Export linking annotations</div>
                </div>
              </label>
            </div>
          )}

          {options.format === 'svg' && (
            <div className="space-y-3">
              <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${btnClass}`}>
                <input
                  type="checkbox"
                  checked={options.linkImages}
                  onChange={(e) => setOptions({ ...options, linkImages: e.target.checked, embedImages: false })}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <div className={`text-sm font-medium ${textClass}`}>Export as ZIP with Linked Images</div>
                  <div className={`text-xs ${labelClass}`}>SVG + images folder (recommended)</div>
                </div>
              </label>
              {!options.linkImages && (
                <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${btnClass}`}>
                  <input
                    type="checkbox"
                    checked={options.embedImages}
                    onChange={(e) => setOptions({ ...options, embedImages: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <div>
                    <div className={`text-sm font-medium ${textClass}`}>Embed Images in SVG</div>
                    <div className={`text-xs ${labelClass}`}>References external URLs (may not work offline)</div>
                  </div>
                </label>
              )}
              <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer ${btnClass}`}>
                <input
                  type="checkbox"
                  checked={options.includeLabels}
                  onChange={(e) => setOptions({ ...options, includeLabels: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <div className={`text-sm font-medium ${textClass}`}>Include Labels</div>
                  <div className={`text-xs ${labelClass}`}>Show item labels in export</div>
                </div>
              </label>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-2 block`}>
                  Background Color
                </label>
                <div className="flex gap-2">
                  {BACKGROUND_COLORS.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setOptions({ ...options, backgroundColor: color.value })}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                        options.backgroundColor === color.value ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                      }`}
                      style={{
                        backgroundColor: color.value === 'transparent' ? '#fff' : color.value,
                        backgroundImage: color.value === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                      }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {options.format === 'png' && (
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest ${labelClass} mb-2 block`}>
                Scale Factor
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(scale => (
                  <button
                    key={scale}
                    onClick={() => setOptions({ ...options, scale })}
                    className={`flex-1 p-2 rounded-lg border text-sm font-bold transition-all ${
                      options.scale === scale
                        ? (fieldMode ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'bg-blue-50 border-blue-500 text-blue-600')
                        : `${btnClass} border`
                    }`}
                  >
                    {scale}x
                  </button>
                ))}
              </div>
              <p className={`text-xs mt-2 ${labelClass}`}>Higher scale = larger, sharper image</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 border-t ${borderClass} flex gap-3`}>
          {onSaveToCollection && options.format === 'iiif' && (
            <button
              onClick={handleSaveToCollection}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${btnClass} border`}
            >
              <Icon name="add_to_photos" className="mr-2" />
              Save to Collection
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              fieldMode
                ? 'bg-yellow-400 text-black hover:bg-yellow-300'
                : 'bg-iiif-blue text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {exporting ? (
              <>
                <Icon name="hourglass_empty" className="mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Icon name="file_download" className="mr-2" />
                Export {options.format.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BoardExportDialog;
