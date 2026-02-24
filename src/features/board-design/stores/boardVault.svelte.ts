/**
 * Board Vault -- State container (Category 2)
 *
 * Replaces useBoardVault React hook.
 * Architecture doc S4 Cat 2: Reactive class in .svelte.ts.
 *
 * Bridge between board UI state and IIIF vault with undo/redo,
 * CRUD operations, connections, groups, and debounced auto-save.
 *
 * Scoped class -- each board view creates its own instance.
 *
 * Usage in Svelte component:
 *   let board = new BoardVaultStore({ snapEnabled: true, onSave: persist });
 *   board.loadBoard(savedState);
 *   board.addItem({ resourceId: 'canvas/1', x: 100, y: 200, ... });
 *   board.undo();
 */

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface BoardItem {
  id: string;
  resourceId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'canvas' | 'note' | 'group';
  label?: string;
  color?: string;
  groupId?: string;
}

export interface BoardConnection {
  id: string;
  fromId: string;
  toId: string;
  type: 'sequence' | 'reference' | 'supplement' | 'custom';
  label?: string;
  color?: string;
}

export interface BoardState {
  id: string;
  items: BoardItem[];
  connections: BoardConnection[];
  gridSize: number;
  snapEnabled: boolean;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

let nextId = 0;
function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${(nextId++).toString(36)}`;
}

function emptyState(): BoardState {
  return { id: '', items: [], connections: [], gridSize: 8, snapEnabled: false };
}

// ------------------------------------------------------------------
// Store
// ------------------------------------------------------------------

export class BoardVaultStore {
  // -- Reactive state via $state --
  #state = $state<BoardState>(emptyState());
  #past = $state<BoardState[]>([]);
  #future = $state<BoardState[]>([]);
  #isDirty = $state(false);

  // -- Non-reactive internals --
  #autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  #maxHistory = 50;
  #autoSaveDelay = 2000;
  #onSave?: (state: BoardState) => void;

  // ------------------------------------------------------------------
  // Getters -- reactive reads for templates / $derived
  // ------------------------------------------------------------------

  get state(): BoardState { return this.#state; }
  get items(): BoardItem[] { return this.#state.items; }
  get connections(): BoardConnection[] { return this.#state.connections; }
  get isDirty(): boolean { return this.#isDirty; }
  get canUndo(): boolean { return this.#past.length > 0; }
  get canRedo(): boolean { return this.#future.length > 0; }
  get boardId(): string { return this.#state.id; }

  // ------------------------------------------------------------------
  // Constructor
  // ------------------------------------------------------------------

  constructor(options?: {
    snapEnabled?: boolean;
    gridSize?: number;
    maxHistory?: number;
    autoSaveDelay?: number;
    onSave?: (state: BoardState) => void;
  }) {
    if (options?.snapEnabled != null) {
      this.#state.snapEnabled = options.snapEnabled;
    }
    if (options?.gridSize != null) {
      this.#state.gridSize = options.gridSize;
    }
    if (options?.maxHistory != null) {
      this.#maxHistory = options.maxHistory;
    }
    if (options?.autoSaveDelay != null) {
      this.#autoSaveDelay = options.autoSaveDelay;
    }
    this.#onSave = options?.onSave;
  }

  // ------------------------------------------------------------------
  // Lifecycle -- load or create board
  // ------------------------------------------------------------------

  /** Load an existing board state (replaces current, clears history) */
  loadBoard(state: BoardState): void {
    this.#state = { ...state };
    this.#past = [];
    this.#future = [];
    this.#isDirty = false;
  }

  /** Create a new empty board with the given id */
  createBoard(id: string, _label?: string): void {
    this.#state = {
      id,
      items: [],
      connections: [],
      gridSize: this.#state.gridSize,
      snapEnabled: this.#state.snapEnabled,
    };
    this.#past = [];
    this.#future = [];
    this.#isDirty = false;
  }

  // ------------------------------------------------------------------
  // Items CRUD
  //
  // Pseudocode:
  //   1. Push current state to undo history
  //   2. Clone items array with the modification
  //   3. Replace #state with new state object
  //   4. Mark dirty and schedule auto-save
  // ------------------------------------------------------------------

  /** Add a board item. Returns the generated ID. */
  addItem(item: Omit<BoardItem, 'id'>): string {
    this.#pushHistory();
    const id = generateId('item');
    const newItem: BoardItem = {
      ...item,
      id,
      x: this.#maybeSnap(item.x),
      y: this.#maybeSnap(item.y),
    };
    this.#state = {
      ...this.#state,
      items: [...this.#state.items, newItem],
    };
    this.#markDirty();
    return id;
  }

  /** Move an item to new coordinates */
  moveItem(id: string, x: number, y: number): void {
    this.#pushHistory();
    this.#state = {
      ...this.#state,
      items: this.#state.items.map(item =>
        item.id === id
          ? { ...item, x: this.#maybeSnap(x), y: this.#maybeSnap(y) }
          : item
      ),
    };
    this.#markDirty();
  }

  /** Resize an item */
  resizeItem(id: string, width: number, height: number): void {
    this.#pushHistory();
    this.#state = {
      ...this.#state,
      items: this.#state.items.map(item =>
        item.id === id
          ? { ...item, width: Math.max(1, width), height: Math.max(1, height) }
          : item
      ),
    };
    this.#markDirty();
  }

  /** Remove an item and any connections referencing it */
  removeItem(id: string): void {
    this.#pushHistory();
    this.#state = {
      ...this.#state,
      items: this.#state.items.filter(item => item.id !== id),
      connections: this.#state.connections.filter(
        conn => conn.fromId !== id && conn.toId !== id
      ),
    };
    this.#markDirty();
  }

  /** Update arbitrary fields on an item */
  updateItem(id: string, updates: Partial<BoardItem>): void {
    this.#pushHistory();
    this.#state = {
      ...this.#state,
      items: this.#state.items.map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    };
    this.#markDirty();
  }

  // ------------------------------------------------------------------
  // Connections CRUD
  //
  // Pseudocode:
  //   1. Push history
  //   2. Add/update/remove connection in connections array
  //   3. Replace #state, mark dirty
  // ------------------------------------------------------------------

  /** Add a connection between two items. Returns the generated ID. */
  addConnection(conn: Omit<BoardConnection, 'id'>): string {
    this.#pushHistory();
    const id = generateId('conn');
    const newConn: BoardConnection = { ...conn, id };
    this.#state = {
      ...this.#state,
      connections: [...this.#state.connections, newConn],
    };
    this.#markDirty();
    return id;
  }

  /** Update fields on a connection */
  updateConnection(id: string, updates: Partial<BoardConnection>): void {
    this.#pushHistory();
    this.#state = {
      ...this.#state,
      connections: this.#state.connections.map(conn =>
        conn.id === id ? { ...conn, ...updates } : conn
      ),
    };
    this.#markDirty();
  }

  /** Remove a connection */
  removeConnection(id: string): void {
    this.#pushHistory();
    this.#state = {
      ...this.#state,
      connections: this.#state.connections.filter(conn => conn.id !== id),
    };
    this.#markDirty();
  }

  // ------------------------------------------------------------------
  // Notes -- convenience wrappers over items with type='note'
  // ------------------------------------------------------------------

  /** Add a sticky-note item at the given position. Returns the ID. */
  addNote(x: number, y: number, label?: string): string {
    return this.addItem({
      resourceId: '',
      x,
      y,
      width: 200,
      height: 150,
      type: 'note',
      label: label ?? 'New Note',
      color: '#FFEAA7',
    });
  }

  /** Update a note's label, color, or other fields */
  updateNote(id: string, updates: Partial<BoardItem>): void {
    this.updateItem(id, updates);
  }

  // ------------------------------------------------------------------
  // Groups -- logical grouping of items
  //
  // Pseudocode:
  //   1. Create a group item (type='group') encompassing bounding box of members
  //   2. Set groupId on each member item
  //   3. Removing a group releases its members (unsets groupId)
  // ------------------------------------------------------------------

  /** Create a group from existing items. Returns the group ID. */
  createGroup(label: string, itemIds: string[]): string {
    this.#pushHistory();

    // Calculate bounding box of member items
    const members = this.#state.items.filter(item => itemIds.includes(item.id));
    if (members.length === 0) {
      // Nothing to group -- still generate a minimal group
      return this.addItem({
        resourceId: '',
        x: 0,
        y: 0,
        width: 200,
        height: 200,
        type: 'group',
        label,
      });
    }

    const padding = 20;
    const minX = Math.min(...members.map(m => m.x)) - padding;
    const minY = Math.min(...members.map(m => m.y)) - padding;
    const maxX = Math.max(...members.map(m => m.x + m.width)) + padding;
    const maxY = Math.max(...members.map(m => m.y + m.height)) + padding;

    const groupId = generateId('group');

    const groupItem: BoardItem = {
      id: groupId,
      resourceId: '',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      type: 'group',
      label,
    };

    // Assign groupId to member items, add the group item
    this.#state = {
      ...this.#state,
      items: [
        groupItem,
        ...this.#state.items.map(item =>
          itemIds.includes(item.id)
            ? { ...item, groupId }
            : item
        ),
      ],
    };
    this.#markDirty();
    return groupId;
  }

  /** Remove a group item and unset groupId on its members */
  removeGroup(id: string): void {
    this.#pushHistory();
    this.#state = {
      ...this.#state,
      items: this.#state.items
        .filter(item => item.id !== id)
        .map(item =>
          item.groupId === id ? { ...item, groupId: undefined } : item
        ),
    };
    this.#markDirty();
  }

  /** Add an item to an existing group */
  addItemToGroup(groupId: string, itemId: string): void {
    this.#pushHistory();
    this.#state = {
      ...this.#state,
      items: this.#state.items.map(item =>
        item.id === itemId ? { ...item, groupId } : item
      ),
    };
    this.#markDirty();
  }

  /** Remove an item from its group (unset groupId) */
  removeItemFromGroup(itemId: string): void {
    this.#pushHistory();
    this.#state = {
      ...this.#state,
      items: this.#state.items.map(item =>
        item.id === itemId ? { ...item, groupId: undefined } : item
      ),
    };
    this.#markDirty();
  }

  // ------------------------------------------------------------------
  // History -- undo / redo
  //
  // Pseudocode:
  //   Undo: pop from past, push current to future, set present = popped
  //   Redo: pop from future, push current to past, set present = popped
  // ------------------------------------------------------------------

  /** Undo the last operation */
  undo(): void {
    if (this.#past.length === 0) return;
    const newPast = [...this.#past];
    const previous = newPast.pop()!;
    this.#future = [this.#state, ...this.#future];
    this.#past = newPast;
    this.#state = previous;
    this.#markDirty();
  }

  /** Redo a previously undone operation */
  redo(): void {
    if (this.#future.length === 0) return;
    const newFuture = [...this.#future];
    const next = newFuture.shift()!;
    this.#past = [...this.#past, this.#state];
    this.#future = newFuture;
    this.#state = next;
    this.#markDirty();
  }

  // ------------------------------------------------------------------
  // Grid settings
  // ------------------------------------------------------------------

  /** Update grid size */
  setGridSize(size: number): void {
    this.#state = { ...this.#state, gridSize: Math.max(1, size) };
  }

  /** Toggle snap-to-grid */
  setSnapEnabled(enabled: boolean): void {
    this.#state = { ...this.#state, snapEnabled: enabled };
  }

  // ------------------------------------------------------------------
  // Persistence -- manual and auto-save
  // ------------------------------------------------------------------

  /** Manually trigger save via the onSave callback */
  save(): void {
    this.#onSave?.(this.#state);
    this.#isDirty = false;
  }

  // ------------------------------------------------------------------
  // Query helpers
  // ------------------------------------------------------------------

  /** Find an item by ID */
  findItem(id: string): BoardItem | undefined {
    return this.#state.items.find(item => item.id === id);
  }

  /** Find a connection by ID */
  findConnection(id: string): BoardConnection | undefined {
    return this.#state.connections.find(conn => conn.id === id);
  }

  /** Get all items belonging to a group */
  getGroupMembers(groupId: string): BoardItem[] {
    return this.#state.items.filter(item => item.groupId === groupId);
  }

  /** Get connections attached to an item */
  getItemConnections(itemId: string): BoardConnection[] {
    return this.#state.connections.filter(
      conn => conn.fromId === itemId || conn.toId === itemId
    );
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  /** Snap a coordinate value to the grid if snapping is enabled */
  #maybeSnap(value: number): number {
    if (!this.#state.snapEnabled || this.#state.gridSize <= 1) return value;
    return this.#snapToGrid(value);
  }

  /** Round a value to the nearest grid increment */
  #snapToGrid(value: number): number {
    const grid = this.#state.gridSize;
    return Math.round(value / grid) * grid;
  }

  /**
   * Push current state onto the undo stack, clear redo.
   * Caps history at #maxHistory entries.
   */
  #pushHistory(): void {
    this.#past = [...this.#past.slice(-(this.#maxHistory - 1)), this.#state];
    this.#future = [];
  }

  /** Mark state as dirty and schedule an auto-save */
  #markDirty(): void {
    this.#isDirty = true;
    this.#scheduleSave();
  }

  /** Debounce auto-save: reset timer on each mutation */
  #scheduleSave(): void {
    if (!this.#onSave) return;
    if (this.#autoSaveTimer) clearTimeout(this.#autoSaveTimer);
    this.#autoSaveTimer = setTimeout(() => {
      this.save();
    }, this.#autoSaveDelay);
  }

  /** Cleanup timers on teardown */
  destroy(): void {
    if (this.#autoSaveTimer) {
      clearTimeout(this.#autoSaveTimer);
      this.#autoSaveTimer = null;
    }
  }
}
