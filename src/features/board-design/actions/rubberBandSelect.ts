/**
 * Rubber Band Select — DOM behavior action (Category 3)
 *
 * Replaces useRubberBandSelect React hook.
 * Architecture doc §4 Cat 3: Svelte action (use:rubberBandSelect)
 *
 * Marquee/rubber-band selection rectangle for board canvas.
 */

export interface RubberBandRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RubberBandParams {
  /** Called continuously while dragging with the current rectangle */
  onUpdate?: (rect: RubberBandRect) => void;
  /** Called when the drag ends with the final rectangle */
  onComplete?: (rect: RubberBandRect) => void;
  /** Called when drag starts */
  onStart?: () => void;
  /** Only activate when this modifier is held */
  modifier?: 'shift' | 'ctrl' | 'none';
}

export function rubberBandSelect(node: HTMLElement, params: RubberBandParams = {}) {
  let { onUpdate, onComplete, onStart, modifier = 'none' } = params;
  let startX = 0;
  let startY = 0;
  let isDragging = false;

  function getRect(clientX: number, clientY: number): RubberBandRect {
    const nodeRect = node.getBoundingClientRect();
    const currentX = clientX - nodeRect.left;
    const currentY = clientY - nodeRect.top;
    return {
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
    };
  }

  function shouldActivate(e: MouseEvent): boolean {
    if (modifier === 'shift') return e.shiftKey;
    if (modifier === 'ctrl') return e.ctrlKey || e.metaKey;
    return true;
  }

  function handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return; // left click only
    if (!shouldActivate(e)) return;

    const nodeRect = node.getBoundingClientRect();
    startX = e.clientX - nodeRect.left;
    startY = e.clientY - nodeRect.top;
    isDragging = true;
    onStart?.();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isDragging) return;
    e.preventDefault();
    onUpdate?.(getRect(e.clientX, e.clientY));
  }

  function handleMouseUp(e: MouseEvent) {
    if (!isDragging) return;
    isDragging = false;
    onComplete?.(getRect(e.clientX, e.clientY));
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }

  node.addEventListener('mousedown', handleMouseDown);

  return {
    update(newParams: RubberBandParams) {
      onUpdate = newParams.onUpdate;
      onComplete = newParams.onComplete;
      onStart = newParams.onStart;
      modifier = newParams.modifier ?? 'none';
    },
    destroy() {
      node.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    },
  };
}
