/**
 * CRDT Adapter
 *
 * Bridges the vault state with Yjs CRDT documents for P2P collaboration.
 * Provides real-time synchronization of IIIF entities with presence awareness.
 */

import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { EntityType, NormalizedState } from '../vault';

// ============================================================================
// Types
// ============================================================================

export interface CrdtAdapterOptions {
  roomId: string;
  userId: string;
  userName?: string;
  userColor?: string;
  password?: string;
  signalingUrls?: string[];
}

export interface PresenceInfo {
  userId: string;
  userName: string;
  userColor: string;
  cursor?: { x: number; y: number };
  lastSeen: number;
}

export type NormalizedEntity = {
  id: string;
  type: EntityType;
  [key: string]: unknown;
};

// ============================================================================
// Vault CRDT Adapter
// ============================================================================

export class VaultCrdtAdapter {
  private doc: Y.Doc;
  private webrtcProvider: WebrtcProvider | null = null;
  private indexeddbProvider: IndexeddbPersistence | null = null;
  private entities: Y.Map<Y.Map<unknown>>;
  private references: Y.Map<Y.Array<string>>;
  private presence: Y.Map<Y.Map<unknown>>;
  private options: CrdtAdapterOptions;
  private localUserId: string;
  private isDestroyed: boolean = false;
  private remoteChangeCallbacks: Set<(entityId: string, changes: unknown) => void> = new Set();
  private presenceChangeCallbacks: Set<(peers: PresenceInfo[]) => void> = new Set();
  private entityObservers: Map<string, () => void> = new Map();

  constructor(options: CrdtAdapterOptions) {
    this.options = options;
    this.localUserId = options.userId;

    // Create Yjs document
    this.doc = new Y.Doc();

    // Initialize shared types
    this.entities = this.doc.getMap('entities');
    this.references = this.doc.getMap('references');
    this.presence = this.doc.getMap('presence');

    // Set up awareness change handler
    this.setupAwarenessHandler();
  }

  /**
   * Initialize the adapter with current vault state
   */
  initialize(vaultState: NormalizedState): void {
    if (this.isDestroyed) {
      throw new Error('Cannot initialize destroyed adapter');
    }

    this.doc.transact(() => {
      // Sync entities from vault state to CRDT
      for (const [entityType, entityMap] of Object.entries(vaultState.entities)) {
        for (const [entityId, entity] of Object.entries(entityMap)) {
          this.syncEntityToCrdt(entityId, entity);
        }
      }

      // Sync references from vault state to CRDT
      for (const [parentId, childIds] of Object.entries(vaultState.references)) {
        const yArray = new Y.Array<string>();
        yArray.push(childIds);
        this.references.set(parentId, yArray);
      }
    });

    // Initialize local presence
    this.updatePresence({
      userId: this.localUserId,
      userName: this.options.userName || 'Anonymous',
      userColor: this.options.userColor || this.generateUserColor(),
      lastSeen: Date.now(),
    });
  }

  /**
   * Connect to collaboration room
   */
  async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Cannot connect destroyed adapter');
    }

    if (this.webrtcProvider) {
      console.warn('Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Set up IndexedDB persistence for offline support
        this.indexeddbProvider = new IndexeddbPersistence(
          `vault-${this.options.roomId}`,
          this.doc
        );

        this.indexeddbProvider.whenSynced.then(() => {
          console.log('IndexedDB persistence synced');
        });

        // Set up WebRTC provider for P2P collaboration
        const signalingUrls = this.options.signalingUrls || [
          'wss://signaling.yjs.dev',
          'wss://y-webrtc-signaling-eu.herokuapp.com',
          'wss://y-webrtc-signaling-us.herokuapp.com',
        ];

        this.webrtcProvider = new WebrtcProvider(
          this.options.roomId,
          this.doc,
          {
            signaling: signalingUrls,
            password: this.options.password,
            maxConns: 20,
            filterBcConns: true,
            peerOpts: {},
          }
        );

        // Wait for connection
        const checkConnected = () => {
          if (this.webrtcProvider?.connected) {
            resolve();
          } else {
            setTimeout(checkConnected, 100);
          }
        };

        // Set a timeout for connection
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);

        this.webrtcProvider.on('status', (event: { connected: boolean }) => {
          if (event.connected) {
            clearTimeout(timeout);
            resolve();
          }
        });

        checkConnected();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from collaboration room
   */
  disconnect(): void {
    if (this.webrtcProvider) {
      this.webrtcProvider.destroy();
      this.webrtcProvider = null;
    }

    if (this.indexeddbProvider) {
      this.indexeddbProvider.destroy();
      this.indexeddbProvider = null;
    }

    // Clear all observers
    this.entityObservers.forEach((unobserve) => unobserve());
    this.entityObservers.clear();
  }

  /**
   * Apply local vault change to CRDT
   */
  applyLocalChange(entityId: string, changes: Partial<NormalizedEntity>): void {
    if (this.isDestroyed) return;

    this.doc.transact(() => {
      this.syncEntityToCrdt(entityId, changes);
    });
  }

  /**
   * Subscribe to remote CRDT changes
   */
  onRemoteChange(callback: (entityId: string, changes: unknown) => void): () => void {
    this.remoteChangeCallbacks.add(callback);

    // Set up observers for all existing entities
    this.setupEntityObservers();

    return () => {
      this.remoteChangeCallbacks.delete(callback);
    };
  }

  /**
   * Get current presence info for all peers
   */
  getPeers(): PresenceInfo[] {
    const peers: PresenceInfo[] = [];

    if (this.webrtcProvider) {
      const states = this.webrtcProvider.awareness.getStates();
      states.forEach((state, clientId) => {
        if (state.presence && state.presence.userId !== this.localUserId) {
          peers.push(state.presence as PresenceInfo);
        }
      });
    }

    return peers;
  }

  /**
   * Update local presence
   */
  updatePresence(presence: Partial<PresenceInfo>): void {
    if (this.isDestroyed || !this.webrtcProvider) return;

    const currentPresence = this.getLocalPresence();
    const newPresence: PresenceInfo = {
      userId: this.localUserId,
      userName: this.options.userName || 'Anonymous',
      userColor: this.options.userColor || this.generateUserColor(),
      ...currentPresence,
      ...presence,
      lastSeen: Date.now(),
    };

    // Update in Yjs presence map for persistence
    const yPresence = new Y.Map<unknown>();
    Object.entries(newPresence).forEach(([key, value]) => {
      yPresence.set(key, value);
    });
    this.presence.set(this.localUserId, yPresence);

    // Update awareness for real-time cursor/selection
    this.webrtcProvider.awareness.setLocalStateField('presence', newPresence);
  }

  /**
   * Subscribe to presence changes
   */
  onPresenceChange(callback: (peers: PresenceInfo[]) => void): () => void {
    this.presenceChangeCallbacks.add(callback);

    // Immediately call with current peers
    callback(this.getPeers());

    return () => {
      this.presenceChangeCallbacks.delete(callback);
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.webrtcProvider?.connected ?? false;
  }

  /**
   * Get peer count
   */
  getPeerCount(): number {
    if (!this.webrtcProvider) return 0;

    const states = this.webrtcProvider.awareness.getStates();
    let count = 0;
    states.forEach((state) => {
      if (state.presence && state.presence.userId !== this.localUserId) {
        count++;
      }
    });
    return count;
  }

  /**
   * Destroy adapter and cleanup
   */
  destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // Disconnect providers
    this.disconnect();

    // Clear callbacks
    this.remoteChangeCallbacks.clear();
    this.presenceChangeCallbacks.clear();

    // Destroy document
    this.doc.destroy();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private syncEntityToCrdt(entityId: string, entity: Partial<NormalizedEntity>): void {
    let yEntity = this.entities.get(entityId);

    if (!yEntity) {
      yEntity = new Y.Map<unknown>();
      this.entities.set(entityId, yEntity);

      // Set up observer for this entity
      this.observeEntity(entityId, yEntity);
    }

    // Sync entity properties
    Object.entries(entity).forEach(([key, value]) => {
      if (value === undefined) {
        yEntity!.delete(key);
      } else if (Array.isArray(value)) {
        // Handle arrays
        const existingYArray = yEntity!.get(key) as Y.Array<unknown> | undefined;
        if (existingYArray) {
          existingYArray.delete(0, existingYArray.length);
          existingYArray.push(value);
        } else {
          const yArray = new Y.Array<unknown>();
          yArray.push(value);
          yEntity!.set(key, yArray);
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects
        const existingYMap = yEntity!.get(key) as Y.Map<unknown> | undefined;
        if (existingYMap) {
          // Clear and repopulate
          for (const k of existingYMap.keys()) {
            existingYMap.delete(k);
          }
          Object.entries(value).forEach(([k, v]) => {
            existingYMap.set(k, v);
          });
        } else {
          const yMap = new Y.Map<unknown>();
          Object.entries(value).forEach(([k, v]) => {
            yMap.set(k, v);
          });
          yEntity!.set(key, yMap);
        }
      } else {
        // Primitive value
        yEntity!.set(key, value);
      }
    });
  }

  private observeEntity(entityId: string, yEntity: Y.Map<unknown>): void {
    const observer = (event: Y.YMapEvent<unknown>) => {
      // Only trigger for remote changes (from other clients)
      if (event.transaction.local) return;

      const changes: Record<string, unknown> = {};

      event.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const value = yEntity.get(key);
          changes[key] = this.convertYjsValue(value);
        } else if (change.action === 'delete') {
          changes[key] = undefined;
        }
      });

      // Notify remote change callbacks
      this.remoteChangeCallbacks.forEach((callback) => {
        callback(entityId, changes);
      });
    };

    yEntity.observe(observer);
    this.entityObservers.set(entityId, () => yEntity.unobserve(observer));
  }

  private setupEntityObservers(): void {
    this.entities.forEach((yEntity, entityId) => {
      if (!this.entityObservers.has(entityId)) {
        this.observeEntity(entityId, yEntity);
      }
    });

    // Also observe the entities map itself for new entities
    this.entities.observe((event) => {
      event.changes.keys.forEach((change, key) => {
        if ((change.action === 'add' || change.action === 'update') && !this.entityObservers.has(key)) {
          const yEntity = this.entities.get(key);
          if (yEntity) {
            this.observeEntity(key, yEntity);
          }
        }
      });
    });
  }

  private setupAwarenessHandler(): void {
    // This will be called after webrtcProvider is created
    const checkAndSetup = () => {
      if (this.webrtcProvider) {
        this.webrtcProvider.awareness.on('change', () => {
          const peers = this.getPeers();
          this.presenceChangeCallbacks.forEach((callback) => {
            callback(peers);
          });
        });
      } else {
        setTimeout(checkAndSetup, 100);
      }
    };
    checkAndSetup();
  }

  private getLocalPresence(): Partial<PresenceInfo> {
    const yPresence = this.presence.get(this.localUserId);
    if (yPresence) {
      const presence: Partial<PresenceInfo> = {};
      yPresence.forEach((value, key) => {
        (presence as Record<string, unknown>)[key] = value;
      });
      return presence;
    }
    return {};
  }

  private convertYjsValue(value: unknown): unknown {
    if (value instanceof Y.Map) {
      const obj: Record<string, unknown> = {};
      value.forEach((v, k) => {
        obj[k] = this.convertYjsValue(v);
      });
      return obj;
    } else if (value instanceof Y.Array) {
      return value.toArray().map((v) => this.convertYjsValue(v));
    }
    return value;
  }

  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCrdtAdapter(options: CrdtAdapterOptions): VaultCrdtAdapter {
  return new VaultCrdtAdapter(options);
}
