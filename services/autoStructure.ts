
import { getIIIFValue, IIIFCanvas, IIIFManifest, IIIFRange } from '../types';

export const autoStructureService = {
  /**
   * Automatically groups canvases in a manifest into Ranges based on filename numeric breaks.
   * e.g. [p001.jpg, p002.jpg, p010.jpg] -> Range 1 (p001-002), Range 2 (p010)
   */
  generateRangesFromPatterns: (manifest: IIIFManifest): IIIFManifest => {
    if (!manifest.items || manifest.items.length < 2) return manifest;

    const canvases = manifest.items;
    const ranges: IIIFRange[] = [];
    let currentRange: IIIFRange | null = null;
    let lastNum: number | null = null;

    canvases.forEach((canvas, idx) => {
        const label = getIIIFValue(canvas.label);
        const numMatch = label.match(/(\d+)/);
        const currentNum = numMatch ? parseInt(numMatch[1], 10) : null;

        // Start new range if: first item, no number detected, or numeric gap > 1
        const shouldBreak = currentRange === null || 
                            currentNum === null || 
                            lastNum === null || 
                            Math.abs(currentNum - lastNum) > 1;

        if (shouldBreak) {
            currentRange = {
                id: `${manifest.id}/range/auto-${crypto.randomUUID().slice(0, 8)}`,
                type: "Range",
                label: { none: [`Section starting at ${label}`] },
                items: []
            };
            ranges.push(currentRange);
        }

        currentRange!.items.push({ id: canvas.id, type: "Canvas" });
        lastNum = currentNum;
    });

    return { ...manifest, structures: ranges };
  }
};
