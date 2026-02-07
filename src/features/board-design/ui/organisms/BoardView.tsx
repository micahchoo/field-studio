/**
 * BoardView Organism
 *
 * Main organism for the board-design feature.
 * Provides a canvas for arranging IIIF resources and creating connections between them.
 *
 * IDEAL OUTCOME: Users can drag items, create connections, and export as IIIF Manifest
 * FAILURE PREVENTED: Lost work via history/undo, invalid state via validation
 *
 * CHANGES:
 * - Improved empty state with clearer messaging and navigation
 * - Better visual hierarchy for the getting started experience
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { IIIFItem } from '@/src/shared/types';
import type { ContextualClassNames } from '@/src/shared/lib/hooks/useContextualStyles';
import { useHistory } from '@/src/shared/lib/hooks/useHistory';
import { usePipeline } from '@/src/shared/lib/hooks';
import { useToast } from '@/src/shared/ui/molecules/Toast';
import { PipelineBanner } from '@/src/shared/ui/molecules/PipelineBanner';
import {
  type BoardState,
  calculateAnchorPoints,
  type ConnectionType,
  createBoardItem,
  createConnection,
  createInitialBoardState,
  getConnectionLabel,
  selectIsEmpty,
} from '../../model';
import { BoardHeader } from './BoardHeader';
import { BoardCanvas } from './BoardCanvas';
import { BoardOnboarding, type BoardTemplate } from './BoardOnboarding';

export interface BoardViewProps {
  /** Root IIIF item (source for drag-drop resources) */
  root: IIIFItem | null;
  /** Contextual styles from template */
  cx: ContextualClassNames;
  /** Current field mode */
  fieldMode: boolean;
  /** Terminology function from template */
  t: (key: string) => string;
  /** Whether user is in advanced mode */
  isAdvanced: boolean;
  /** Called when board is exported */
  onExport?: (state: BoardState) => void;
  /** Initial board state (for loading saved boards) */
  initialState?: BoardState;
  /** Called to switch to archive view */
  onSwitchView?: (mode: string) => void;
}

/**
 * BoardView Organism
 *
 * @example
 * <FieldModeTemplate>
 *   {({ cx, fieldMode, t, isAdvanced }) => (
 *     <BoardView
 *       root={root}
 *       cx={cx}
 *       fieldMode={fieldMode}
 *       t={t}
 *       isAdvanced={isAdvanced}
 *       onExport={handleExport}
 *     />
 *   )}
 * </FieldModeTemplate>
 */
export const BoardView: React.FC<BoardViewProps> = ({
  root,
  cx,
  fieldMode,
  t,
  isAdvanced,
  onExport,
  initialState,
  onSwitchView,
}) => {
  const { showToast } = useToast();
  const pipeline = usePipeline();

  // History-managed board state
  const { state: board, update: updateBoard, undo, redo, canUndo, canRedo } =
    useHistory<BoardState>(initialState || createInitialBoardState());

  const { items, connections } = board;

  // Tool state
  const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'note' | 'text'>('select');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // Viewport state
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  // Background mode (from CanvasComposer)
  const [bgMode, setBgMode] = useState<'grid' | 'dark' | 'light'>('grid');

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null);

  // Check if board is empty
  const isEmpty = selectIsEmpty(board);
  
  // Check if archive has items to add
  const hasArchiveItems = root && (
    (root as any).items?.length > 0 || 
    (root as any).type === 'Manifest' || 
    (root as any).type === 'Canvas'
  );

  // Handle adding an item from root
  const handleAddItem = useCallback(
    (resource: IIIFItem, position: { x: number; y: number }) => {
      const newItem = createBoardItem(resource, position);
      updateBoard({
        ...board,
        items: [...items, newItem],
      });
      showToast(`Added ${t(resource.type) || resource.type}`, 'success');
    },
    [board, items, updateBoard, showToast, t]
  );

  // Handle item selection
  const handleSelectItem = useCallback(
    (id: string | null) => {
      setSelectedItemId(id);
      setConnectingFrom(null);
    },
    []
  );

  // Handle starting a connection
  const handleStartConnection = useCallback(
    (fromId: string) => {
      if (activeTool === 'connect') {
        setConnectingFrom(fromId);
      }
    },
    [activeTool]
  );

  // Handle completing a connection
  const handleCompleteConnection = useCallback(
    (toId: string, type: ConnectionType = 'associated') => {
      if (connectingFrom && connectingFrom !== toId) {
        // Find items for anchor calculation
        const fromItem = items.find((i) => i.id === connectingFrom);
        const toItem = items.find((i) => i.id === toId);

        if (fromItem && toItem) {
          const anchors = calculateAnchorPoints(fromItem, toItem);
          const newConnection = createConnection(
            connectingFrom,
            toId,
            type,
            {
              fromAnchor: anchors.from,
              toAnchor: anchors.to,
              label: getConnectionLabel(type, isAdvanced),
            }
          );

          updateBoard({
            ...board,
            connections: [...connections, newConnection],
          });

          showToast('Connection created', 'success');
        }

        setConnectingFrom(null);
      }
    },
    [connectingFrom, items, connections, board, updateBoard, showToast, isAdvanced]
  );

  // Handle item move
  const handleMoveItem = useCallback(
    (id: string, newPosition: { x: number; y: number }) => {
      updateBoard({
        ...board,
        items: items.map((item) =>
          item.id === id ? { ...item, x: newPosition.x, y: newPosition.y } : item
        ),
      });
    },
    [board, items, updateBoard]
  );

  // Handle delete selected item
  const handleDeleteSelected = useCallback(() => {
    if (selectedItemId) {
      updateBoard({
        ...board,
        items: items.filter((item) => item.id !== selectedItemId),
        connections: connections.filter(
          (conn) => conn.fromId !== selectedItemId && conn.toId !== selectedItemId
        ),
      });
      setSelectedItemId(null);
      showToast('Item removed', 'info');
    }
  }, [board, items, connections, selectedItemId, updateBoard, showToast]);

  // Handle export
  const handleExport = useCallback(() => {
    onExport?.(board);
    showToast('Board exported', 'success');
  }, [board, onExport, showToast]);

  // Handle navigate to archive
  const handleBrowseArchive = useCallback(() => {
    onSwitchView?.('archive');
  }, [onSwitchView]);

  // Add text layer (from CanvasComposer)
  const handleAddTextLayer = useCallback(() => {
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;

    const textItem = {
      id: `text-${Date.now()}`,
      type: 'Text' as const,
      label: { en: ['Text Layer'] },
      _text: 'Double-click to edit...',
    } as unknown as IIIFItem;

    const newItem = createBoardItem(textItem, {
      x: canvasWidth / 2 - 100,
      y: canvasHeight / 2 - 25,
    }, { w: 200, h: 50 });

    // Mark as a note/text item
    (newItem as any).isNote = true;

    updateBoard({
      ...board,
      items: [...items, newItem],
    });

    setSelectedItemId(newItem.id);
    showToast('Text layer added', 'success');
  }, [board, items, updateBoard, showToast]);

  // Handle alignment (from CanvasComposer)
  const handleAlign = useCallback((type: 'center' | 'left' | 'top' | 'right' | 'bottom') => {
    if (!selectedItemId) return;

    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;

    updateBoard({
      ...board,
      items: items.map((item) => {
        if (item.id !== selectedItemId) return item;

        switch (type) {
          case 'center':
            return { ...item, x: (canvasWidth - item.w) / 2, y: (canvasHeight - item.h) / 2 };
          case 'left':
            return { ...item, x: 20 };
          case 'right':
            return { ...item, x: canvasWidth - item.w - 20 };
          case 'top':
            return { ...item, y: 20 };
          case 'bottom':
            return { ...item, y: canvasHeight - item.h - 20 };
          default:
            return item;
        }
      }),
    });

    showToast(`Aligned ${type}`, 'info');
  }, [board, items, selectedItemId, updateBoard, showToast]);

  // Handle tool change with text layer creation
  const handleToolChange = useCallback((tool: 'select' | 'connect' | 'note' | 'text') => {
    setActiveTool(tool);

    // Auto-create text layer when text tool is selected
    if (tool === 'text') {
      handleAddTextLayer();
      setActiveTool('select'); // Switch back to select after adding
    }
  }, [handleAddTextLayer]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Delete selected item
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItemId) {
        e.preventDefault();
        handleDeleteSelected();
      }
      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // Tool shortcuts (V, C, T, N)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            break;
          case 'c':
            setActiveTool('connect');
            break;
          case 't':
            handleToolChange('text');
            break;
          case 'n':
            setActiveTool('note');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItemId, handleDeleteSelected, undo, redo, handleToolChange]);

  // Track if we've already loaded pipeline items (to prevent double-loading)
  const pipelineLoadedRef = useRef(false);

  // Pipeline: Load selected items from Archive on mount
  useEffect(() => {
    // Check pipeline state first (preferred)
    if (!pipelineLoadedRef.current && root && pipeline.intent === 'compose' && pipeline.selectedIds.length > 0) {
      pipelineLoadedRef.current = true;
      const {selectedIds} = pipeline;

      // Find items in root and add them to board
      const itemsToAdd: IIIFItem[] = [];
      const findItems = (node: any) => {
        if (selectedIds.includes(node.id)) {
          itemsToAdd.push(node);
        }
        const children = node.items || node.annotations || [];
        children.forEach(findItems);
      };

      if ((root as any).items) {
        (root as any).items.forEach(findItems);
      }

      // Add items to board in a grid layout
      itemsToAdd.forEach((item, index) => {
        const x = 100 + (index % 3) * 250;
        const y = 100 + Math.floor(index / 3) * 200;
        handleAddItem(item, { x, y });
      });

      if (itemsToAdd.length > 0) {
        showToast(`Added ${itemsToAdd.length} items from Archive`, 'success');
      }
    }

    // Also check sessionStorage for backwards compatibility
    const pendingSelection = sessionStorage.getItem('board-selected-items');
    if (!pipelineLoadedRef.current && pendingSelection && root) {
      pipelineLoadedRef.current = true;
      try {
        const selectedIds = JSON.parse(pendingSelection) as string[];
        sessionStorage.removeItem('board-selected-items');

        // Find items in root and add them to board
        const itemsToAdd: IIIFItem[] = [];
        const findItems = (node: any) => {
          if (selectedIds.includes(node.id)) {
            itemsToAdd.push(node);
          }
          const children = node.items || node.annotations || [];
          children.forEach(findItems);
        };

        if ((root as any).items) {
          (root as any).items.forEach(findItems);
        }

        // Add items to board in a grid layout
        itemsToAdd.forEach((item, index) => {
          const x = 100 + (index % 3) * 250;
          const y = 100 + Math.floor(index / 3) * 200;
          handleAddItem(item, { x, y });
        });

        if (itemsToAdd.length > 0) {
          showToast(`Added ${itemsToAdd.length} items from Archive`, 'success');
        }
      } catch (e) {
        console.error('Failed to load pending selection:', e);
      }
    }
  }, [root, handleAddItem, showToast, pipeline.intent, pipeline.selectedIds]);

  // Extract all items from root/archive for template usage
  const getAvailableItems = useCallback((): IIIFItem[] => {
    const items: IIIFItem[] = [];
    
    const traverse = (node: any) => {
      if (!node) return;
      
      // Add the node itself if it's a Canvas or Manifest
      if (node.type === 'Canvas' || node.type === 'Manifest') {
        items.push(node);
      }
      
      // Traverse children
      const children = node.items || node.annotations || [];
      children.forEach(traverse);
    };
    
    if (root) {
      traverse(root);
    }
    
    return items;
  }, [root]);

  // Handle template selection - creates items with IIIF-specific structures
  const handleSelectTemplate = useCallback((template: BoardTemplate) => {
    const availableItems = getAvailableItems();
    const targetCount = template.itemCount;

    // Build items list: use real archive items first, then fill with placeholders
    const itemsToAdd: IIIFItem[] = [];

    // Add real items from archive (up to target count)
    const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(shuffled.length, targetCount); i++) {
      itemsToAdd.push(shuffled[i]);
    }

    // Fill remaining slots with placeholder items
    for (let i = itemsToAdd.length; i < targetCount; i++) {
      const placeholderItem: IIIFItem = {
        id: `template-${template.id}-${i}-${Date.now()}`,
        type: 'Canvas',
        label: { en: [`${template.name} ${i + 1}`] },
        thumbnail: [{ id: `https://picsum.photos/200/200?random=${i}-${Date.now()}`, type: 'Image', format: 'image/jpeg' }],
      };

      // Add template-specific IIIF metadata to placeholders
      if (template.previewLayout === 'timeline') {
        // Add navDate for timeline items (spaced by 1 year for demo)
        const baseYear = new Date().getFullYear() - targetCount + i;
        (placeholderItem as any).navDate = `${baseYear}-01-01T00:00:00Z`;
      } else if (template.previewLayout === 'map') {
        // Add navPlace for map items (sample coordinates)
        const sampleCoords = [
          { lat: 40.7128, lng: -74.0060, name: 'New York' },
          { lat: 51.5074, lng: -0.1278, name: 'London' },
          { lat: 35.6762, lng: 139.6503, name: 'Tokyo' },
        ];
        const coord = sampleCoords[i % sampleCoords.length];
        (placeholderItem as any).navPlace = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [coord.lng, coord.lat]
          },
          properties: { name: coord.name }
        };
      }

      itemsToAdd.push(placeholderItem);
    }

    // Calculate canvas center for positioning
    const canvasWidth = canvasRef.current?.clientWidth || 800;
    const canvasHeight = canvasRef.current?.clientHeight || 600;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    // Track added item IDs for creating connections
    const addedItemIds: string[] = [];

    // Add items to board in template-specific layout
    itemsToAdd.forEach((item, index) => {
      let position = { x: centerX, y: centerY };

      switch (template.previewLayout) {
        case 'narrative':
          // 4 items: Horizontal flow (like presentation slides)
          position = {
            x: centerX - 375 + index * 250,
            y: centerY + (index % 2) * 40 - 20
          };
          break;
        case 'comparison':
          // 2 items: Side by side for comparison
          position = {
            x: centerX - 150 + index * 300,
            y: centerY - 100
          };
          break;
        case 'timeline':
          // 5 items: Horizontal timeline
          position = {
            x: centerX - 400 + index * 200,
            y: centerY
          };
          break;
        case 'map':
          // 3 items: Scattered around center (geographic positions)
          const angle = (index / 3) * Math.PI * 2;
          const radius = 180;
          position = {
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius
          };
          break;
      }

      const newItem = createBoardItem(item, position);
      addedItemIds.push(newItem.id);

      updateBoard({
        ...board,
        items: [...items, newItem],
      });
    });

    // Create template-specific connections after items are added
    // We need to use the board state that will exist after all items are added
    setTimeout(() => {
      const currentItems = items;
      const newConnections: typeof connections = [...connections];

      switch (template.previewLayout) {
        case 'narrative':
          // Create sequence connections between consecutive items
          for (let i = 0; i < addedItemIds.length - 1; i++) {
            const conn = createConnection(
              addedItemIds[i],
              addedItemIds[i + 1],
              'sequence',
              {
                label: isAdvanced ? 'Sequence' : 'Next',
                style: 'curved',
              }
            );
            newConnections.push(conn);
          }
          break;

        case 'comparison':
          // Create comparison annotation between items
          if (addedItemIds.length >= 2) {
            const conn = createConnection(
              addedItemIds[0],
              addedItemIds[1],
              'similarTo',
              {
                label: isAdvanced ? 'Comparison' : 'Compare',
                style: 'straight',
              }
            );
            newConnections.push(conn);
          }
          break;

        case 'timeline':
          // Create sequence connections for timeline
          for (let i = 0; i < addedItemIds.length - 1; i++) {
            const conn = createConnection(
              addedItemIds[i],
              addedItemIds[i + 1],
              'sequence',
              {
                label: isAdvanced ? 'Temporal Sequence' : 'Then',
                style: 'straight',
              }
            );
            newConnections.push(conn);
          }
          break;

        case 'map':
          // Map items are connected by geographic proximity (optional)
          // For now, just create reference connections
          if (addedItemIds.length >= 2) {
            const conn = createConnection(
              addedItemIds[0],
              addedItemIds[1],
              'references',
              {
                label: isAdvanced ? 'Geographic Reference' : 'See Also',
                style: 'curved',
              }
            );
            newConnections.push(conn);
          }
          break;
      }

      if (newConnections.length > connections.length) {
        updateBoard({
          ...board,
          items: currentItems,
          connections: newConnections,
        });
      }
    }, 100);

    const templateDescription = {
      narrative: 'as a presentation sequence',
      comparison: 'for comparative analysis',
      timeline: 'with temporal ordering (navDate)',
      map: 'with geographic metadata (navPlace)',
    };

    showToast(
      `Created ${template.name} ${templateDescription[template.previewLayout]}`,
      'success'
    );
  }, [getAvailableItems, board, items, connections, updateBoard, showToast, isAdvanced]);

  // Empty state - use new BoardOnboarding component
  if (isEmpty) {
    return (
      <BoardOnboarding
        onSelectTemplate={handleSelectTemplate}
        onStartBlank={() => {
          // Just start with empty board - no action needed
          showToast('Started with blank canvas', 'info');
        }}
        onBrowseArchive={handleBrowseArchive}
        root={root}
        cx={{
          surface: cx.surface,
          text: cx.text,
          textMuted: cx.textMuted || (fieldMode ? 'text-stone-400' : 'text-stone-500'),
          accent: cx.accent,
          border: cx.border,
          headerBg: cx.subtleBg || (fieldMode ? 'bg-stone-900' : 'bg-stone-50'),
        }}
        fieldMode={fieldMode}
      />
    );
  }

  // Check if we came from Archive with items
  const hasPipelineItems = pipeline.intent === 'compose' && pipeline.selectedIds.length > 0;

  return (
    <div className={`flex flex-col h-full ${cx.surface}`}>
      {/* Pipeline Banner - shows when composing from Archive */}
      {hasPipelineItems && (
        <PipelineBanner
          onBack={(mode) => onSwitchView?.(mode)}
          onClear={() => pipeline.clearPipeline()}
          cx={cx}
          fieldMode={fieldMode}
        />
      )}

      <BoardHeader
        title="Board Design"
        activeTool={activeTool}
        onToolChange={handleToolChange}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onDelete={handleDeleteSelected}
        hasSelection={!!selectedItemId}
        itemCount={items.length}
        connectionCount={connections.length}
        bgMode={bgMode}
        onBgModeChange={setBgMode}
        onAlign={handleAlign}
        cx={cx}
        fieldMode={fieldMode}
      />

      <div className="flex-1 flex overflow-hidden">
        <BoardCanvas
          ref={canvasRef}
          items={items}
          connections={connections}
          selectedItemId={selectedItemId}
          connectingFrom={connectingFrom}
          activeTool={activeTool}
          viewport={viewport}
          onViewportChange={setViewport}
          onSelectItem={handleSelectItem}
          onMoveItem={handleMoveItem}
          onStartConnection={handleStartConnection}
          onCompleteConnection={handleCompleteConnection}
          onAddItem={handleAddItem}
          root={root}
          bgMode={bgMode}
          cx={cx}
          fieldMode={fieldMode}
        />
      </div>
    </div>
  );
};

export default BoardView;
