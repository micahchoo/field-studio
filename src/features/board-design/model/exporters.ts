/**
 * Board Export Functions
 *
 * PNG, SVG, JSON-LD, and Content State URL exporters.
 *
 * Framework-agnostic pure TypeScript — no React/Svelte dependencies.
 * Uses DOM APIs (Canvas 2D, btoa) which are available in browsers.
 *
 * @module features/board-design/model/exporters
 */

import type { BoardState, BoardItem } from './index';
import * as GeoRect from '@/src/shared/lib/geometry/rect';
import * as GeoPoint from '@/src/shared/lib/geometry/point';
import { boardStateToManifest } from './iiif-bridge';

/**
 * Export board as PNG using Canvas 2D API
 */
export async function exportBoardAsPNG(
  state: BoardState,
  title: string,
): Promise<Blob> {
  const bounds = getBounds(state.items);
  const padding = 40;
  const width = bounds.maxX - bounds.minX + padding * 2;
  const height = bounds.maxY - bounds.minY + padding * 2;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#000';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(title, padding, 24);

  const offsetX = -bounds.minX + padding;
  const offsetY = -bounds.minY + padding;

  // Draw connections
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  for (const conn of state.connections) {
    const fromItem = state.items.find(i => i.id === conn.fromId);
    const toItem = state.items.find(i => i.id === conn.toId);
    if (!fromItem || !toItem) continue;

    const fc = GeoRect.center(fromItem);
    const tc = GeoRect.center(toItem);

    ctx.beginPath();
    ctx.moveTo(fc.x + offsetX, fc.y + offsetY);
    ctx.lineTo(tc.x + offsetX, tc.y + offsetY);
    ctx.stroke();

    if (conn.label) {
      const mid = GeoPoint.lerp(fc, tc, 0.5);
      const midX = mid.x + offsetX;
      const midY = mid.y + offsetY;
      ctx.fillStyle = '#666';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(conn.label, midX, midY - 4);
    }
  }

  // Draw items
  for (const item of state.items) {
    const x = item.x + offsetX;
    const y = item.y + offsetY;

    // Card background
    ctx.fillStyle = item.isNote ? '#fef3c7' : '#fff';
    ctx.fillRect(x, y, item.width, item.height);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, item.width, item.height);

    // Shadow
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 3, y + 3, item.width, item.height);
    ctx.fillStyle = item.isNote ? '#fef3c7' : '#fff';
    ctx.fillRect(x, y, item.width, item.height);
    ctx.strokeRect(x, y, item.width, item.height);

    // Load thumbnail if available
    if (item.blobUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, x + 2, y + 2, item.width - 4, item.height - 28);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = item.blobUrl!;
        });
      } catch { /* skip failed images */ }
    }

    // Label
    ctx.fillStyle = '#000';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    const labelY = y + item.height - 8;
    ctx.fillText(item.label.substring(0, 25), x + 4, labelY);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create PNG blob'));
    }, 'image/png');
  });
}

/**
 * Export board as SVG document string
 */
export function exportBoardAsSVG(state: BoardState, title: string): string {
  const bounds = getBounds(state.items);
  const padding = 40;
  const width = bounds.maxX - bounds.minX + padding * 2;
  const height = bounds.maxY - bounds.minY + padding * 2;
  const ox = -bounds.minX + padding;
  const oy = -bounds.minY + padding;

  const lines: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="#f5f5f0"/>`,
    `<text x="${padding}" y="24" font-size="16" font-weight="bold" font-family="sans-serif">${escapeXml(title)}</text>`,
  ];

  // Connections
  for (const conn of state.connections) {
    const from = state.items.find(i => i.id === conn.fromId);
    const to = state.items.find(i => i.id === conn.toId);
    if (!from || !to) continue;
    const fc = GeoRect.center(from);
    const tc = GeoRect.center(to);
    const x1 = fc.x + ox;
    const y1 = fc.y + oy;
    const x2 = tc.x + ox;
    const y2 = tc.y + oy;

    if (conn.style === 'curved') {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = GeoPoint.distance(fc, tc) || 1;
      const offset = Math.min(50, len * 0.3);
      const cx = midX - (dy / len) * offset;
      const cy = midY + (dx / len) * offset;
      lines.push(`<path d="M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}" stroke="${conn.color || '#999'}" stroke-width="2" fill="none"/>`);
    } else if (conn.style === 'elbow') {
      const midX = (x1 + x2) / 2;
      lines.push(`<path d="M ${x1},${y1} H ${midX} V ${y2} H ${x2}" stroke="${conn.color || '#999'}" stroke-width="2" fill="none"/>`);
    } else {
      lines.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${conn.color || '#999'}" stroke-width="2"/>`);
    }

    if (conn.label) {
      const mid = GeoPoint.lerp({ x: x1, y: y1 }, { x: x2, y: y2 }, 0.5);
      lines.push(`<text x="${mid.x}" y="${mid.y - 4}" font-size="10" text-anchor="middle" fill="#666" font-family="sans-serif">${escapeXml(conn.label)}</text>`);
    }
  }

  // Items
  for (const item of state.items) {
    const x = item.x + ox;
    const y = item.y + oy;
    const fill = item.isNote ? '#fef3c7' : '#fff';

    // Shadow
    lines.push(`<rect x="${x + 3}" y="${y + 3}" width="${item.width}" height="${item.height}" fill="#000"/>`);
    // Card
    lines.push(`<rect x="${x}" y="${y}" width="${item.width}" height="${item.height}" fill="${fill}" stroke="#000" stroke-width="2"/>`);
    // Thumbnail
    if (item.blobUrl) {
      lines.push(`<image href="${escapeXml(item.blobUrl)}" x="${x + 2}" y="${y + 2}" width="${item.width - 4}" height="${item.height - 28}" preserveAspectRatio="xMidYMid slice"/>`);
    }
    // Label
    lines.push(`<text x="${x + 4}" y="${y + item.height - 8}" font-size="11" font-family="sans-serif">${escapeXml(item.label.substring(0, 25))}</text>`);
  }

  lines.push('</svg>');
  return lines.join('\n');
}

/**
 * Export board as JSON-LD IIIF Manifest
 */
export function exportBoardAsJSONLD(
  state: BoardState,
  boardId: string,
  title: string,
): string {
  const manifest = boardStateToManifest(state, boardId, title);
  const jsonld = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    ...manifest,
  };
  return JSON.stringify(jsonld, null, 2);
}

/**
 * Generate IIIF Content State URL pointing to the board manifest
 */
export function generateContentStateURL(boardId: string, baseUrl: string): string {
  const contentState = {
    id: boardId,
    type: 'Annotation',
    motivation: 'contentState',
    target: {
      id: boardId,
      type: 'Manifest',
    },
  };
  const encoded = btoa(JSON.stringify(contentState));
  return `${baseUrl}?iiif-content=${encodeURIComponent(encoded)}`;
}

// --- Helpers ---

function getBounds(items: BoardItem[]) {
  if (items.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  const r = GeoRect.union(items);
  return { minX: r.x, minY: r.y, maxX: GeoRect.right(r), maxY: GeoRect.bottom(r) };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
