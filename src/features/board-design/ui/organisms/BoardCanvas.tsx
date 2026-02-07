/**
 * BoardCanvas Organism
 *
 * Main canvas for the board-design feature.
 * Composes atoms and molecules to render items, connections, and handle interactions.
 *
 * IDEAL OUTCOME: Smooth pan/zoom, intuitive item dragging, clear connection lines
 * FAILURE PREVENTED: Lost items off-canvas, unclear drop targets, janky animations
 *
 * ATOMIC DESIGN COMPLIANCE:
 * - Uses BoardNodeLayer, ConnectionLayer, CanvasGrid, BoardControls molecules
 * - No inline rendering of atoms
 * - Under 120 lines
 *
 * @module features/board-design/ui/organisms/BoardCanvas
 */

import React, { forwardRef } from 'react';
import type { IIIFItem } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import {
  type BoardItem,
  type Connection,
  type ConnectionType,
} from '../../model';
import { CanvasGrid } from '../atoms/CanvasGrid';
import { MiniMap } from '../atoms/MiniMap';
import { BoardNodeLayer } from '../molecules/BoardNodeLayer';
import { ConnectionLayer } from '../molecules/ConnectionLayer';
import { BoardControls } from '../molecules/BoardControls';
import { useCanvasDrag } from '../../hooks/useCanvasDrag';

export interface BoardCanvasProps {
  /** Items to render on the canvas */
  items: BoardItem[];
  /** Connections between items */
  connections: Connection[];
  /** Currently selected item ID */
  selectedItemId: string | null;
  /** ID of item being connected from */
  connectingFrom: string | null;
  /** Active tool mode */
  activeTool: 'select' | 'connect' | 'note' | 'text';
  /** Viewport state (pan/zoom) */
  viewport: { x: number; y: number; zoom: number };
  /** Viewport change callback */
  onViewportChange: (viewport: { x: number; y: number; zoom: number }) => void;
  /** Item selection callback */
  onSelectItem: (id: string | null) => void;
  /** Item move callback */
  onMoveItem: (id: string, position: { x: number; y: number }) => void;
  /** Connection start callback */
  onStartConnection: (fromId: string) => void;
  /** Connection complete callback */
  onCompleteConnection: (toId: string, type?: ConnectionType) => void;
  /** Add item callback */
  onAddItem: (resource: IIIFItem, position: { x: number; y: number }) => void;
  /** Root item for drag-drop resources */
  root: IIIFItem | null;
  /** Background mode */
  bgMode?: 'grid' | 'dark' | 'light';
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
}

/**
 * BoardCanvas Organism
 */
export const BoardCanvas = forwardRef<HTMLDivElement, BoardCanvasProps>(
  (
    {
      items,
      connections,
      selectedItemId,
      connectingFrom,
      activeTool,
      viewport,
      onViewportChange,
      onSelectItem,
      onMoveItem,
      onStartConnection,
      onCompleteConnection: _onCompleteConnection,
      onAddItem: _onAddItem,
      root: _root,
      bgMode = 'grid',
      cx,
      fieldMode,
    },
    ref
  ) => {
    const {
      setRefs,
      selectedConnectionId,
      handleCanvasClick,
      handleMouseMove,
      handleMouseUp,
      handleDragStart,
      handleSelectConnection,
    } = useCanvasDrag({
      viewport,
      onSelectItem,
      onMoveItem,
    });

    // Combine forwarded ref with hook's setRefs
    const combinedSetRefs = (el: HTMLDivElement | null) => {
      setRefs(el);
      if (typeof ref === 'function') {
        ref(el);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
      }
    };

    // Background mode classes
    const bgModeClasses = {
      grid: cx.canvasBg,
      dark: 'bg-slate-900',
      light: 'bg-slate-100',
    };

    return (
      <div
        ref={combinedSetRefs}
        className={`
          flex-1 relative overflow-hidden
          ${bgModeClasses[bgMode]}
        `}
        style={{ cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Canvas content with transforms */}
        <div
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0"
        >
          {/* Grid background (only in grid mode) */}
          {bgMode === 'grid' && <CanvasGrid cx={cx} fieldMode={fieldMode} />}

          {/* Connections layer */}
          <ConnectionLayer
            connections={connections}
            items={items}
            selectedConnectionId={selectedConnectionId}
            onSelectConnection={handleSelectConnection}
            cx={cx}
            fieldMode={fieldMode}
          />

          {/* Nodes layer */}
          <BoardNodeLayer
            items={items}
            selectedItemId={selectedItemId}
            connectingFrom={connectingFrom}
            onSelectItem={onSelectItem}
            onDragStart={handleDragStart}
            onConnectStart={onStartConnection}
            cx={cx}
            fieldMode={fieldMode}
          />
        </div>

        {/* MiniMap (optional) */}
        <MiniMap
          items={items}
          cx={cx}
          fieldMode={fieldMode}
        />

        {/* Viewport controls */}
        <BoardControls
          viewport={viewport}
          onViewportChange={onViewportChange}
          cx={cx}
          fieldMode={fieldMode}
        />
      </div>
    );
  }
);

BoardCanvas.displayName = 'BoardCanvas';

export default BoardCanvas;