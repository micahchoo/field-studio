/**
 * Sync Provider
 *
 * Integrates the CRDT adapter with vault state management for P2P collaboration.
 * Handles bidirectional sync between local vault changes and remote CRDT updates.
 */

import { NormalizedState, Vault } from '../vault';
import { NormalizedEntity, PresenceInfo, VaultCrdtAdapter } from './crdtAdapter';
import { SyncState, SyncStatus } from './types';

// ============================================================================
// Types
// ============================================================================

export interface SyncProviderOptions {
  vault: Vault;
  userId: string;
  userName?: string;
  userColor?: string;
  signalingUrls?: string[];
  maxPeers?: number;  // Default: 10 (WebRTC mesh limit)
  onStateChange?: (state: SyncState) => void;
  onPeerJoin?: (peer: PresenceInfo) => void;
  onPeerLeave?: (peerId: string) => void;
}

// ============================================================================
// Sync Provider
// ============================================================================

export class SyncProvider {
  private adapter: VaultCrdtAdapter | null = null;
  private vault: Vault;
  private options: SyncProviderOptions;
  private state: SyncState;
  private unsubscribeVault: (() => void) | null = null;
  private unsubscribeRemote: (() => void) | null = null;
  private unsubscribePresence: (() => void) | null = null;
  private knownPeers: Set<string> = new Set();
  private isDestroyed: boolean = false;
  private syncInProgress: boolean = false;

  constructor(options: SyncProviderOptions) {
    this.vault = options.vault;
    this.options = {
      maxPeers: 10,
      ...options,
    };

    this.state = {
      status: 'disconnected',
      peerCount: 0,
      roomId: null,
      error: null,
      lastSyncedAt: null,
    };
  }

  /**
   * Connect to a collaboration room
   */
  async connect(roomId: string, password?: string): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Cannot connect destroyed provider');
    }

    if (this.adapter) {
      throw new Error('Already connected to a room');
    }

    this.updateState({ status: 'connecting', roomId });

    try {
      // Create and initialize the CRDT adapter
      this.adapter = new VaultCrdtAdapter({
        roomId,
        userId: this.options.userId,
        userName: this.options.userName,
        userColor: this.options.userColor,
        password,
        signalingUrls: this.options.signalingUrls,
      });

      // Initialize adapter with current vault state
      const vaultState = this.vault.getState();
      this.adapter.initialize(vaultState);

      // Connect to the collaboration room
      await this.adapter.connect();

      // Set up vault change listener for local changes
      this.setupVaultListener();

      // Set up remote change listener
      this.setupRemoteListener();

      // Set up presence listener
      this.setupPresenceListener();

      // Update state to connected
      this.updateState({
        status: 'connected',
        peerCount: this.adapter.getPeerCount(),
        lastSyncedAt: Date.now(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.updateState({
        status: 'error',
        error: errorMessage,
      });

      // Cleanup on failure
      this.cleanupAdapter();
      throw error;
    }
  }

  /**
   * Disconnect from current room
   */
  disconnect(): void {
    if (!this.adapter) {
      return;
    }

    // Clean up all subscriptions
    this.cleanupSubscriptions();

    // Cleanup adapter
    this.cleanupAdapter();

    // Reset state
    this.knownPeers.clear();
    this.updateState({
      status: 'disconnected',
      peerCount: 0,
      roomId: null,
      error: null,
      lastSyncedAt: null,
    });
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.adapter?.isConnected() ?? false;
  }

  /**
   * Get connected peers
   */
  getPeers(): PresenceInfo[] {
    return this.adapter?.getPeers() ?? [];
  }

  /**
   * Update local presence (cursor position, etc.)
   */
  updatePresence(presence: Partial<PresenceInfo>): void {
    if (!this.adapter) {
      console.warn('Cannot update presence: not connected');
      return;
    }

    this.adapter.updatePresence(presence);
  }

  /**
   * Destroy provider and cleanup
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    this.disconnect();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Set up vault state change listener for local changes
   */
  private setupVaultListener(): void {
    // Subscribe to vault changes to sync to CRDT
    this.unsubscribeVault = this.vault.subscribe((state) => {
      if (!this.adapter || this.syncInProgress) {
        return;
      }

      this.syncVaultToCrdt();
    });
  }

  /**
   * Set up remote CRDT change listener
   */
  private setupRemoteListener(): void {
    if (!this.adapter) return;

    this.unsubscribeRemote = this.adapter.onRemoteChange((entityId, changes) => {
      this.applyCrdtToVault(entityId, changes);
    });
  }

  /**
   * Set up presence change listener
   */
  private setupPresenceListener(): void {
    if (!this.adapter) return;

    this.unsubscribePresence = this.adapter.onPresenceChange((peers) => {
      const currentPeerIds = new Set(peers.map(p => p.userId));
      const previousPeerIds = new Set(this.knownPeers);

      // Detect new peers (joins)
      for (const peer of peers) {
        if (!previousPeerIds.has(peer.userId)) {
          this.options.onPeerJoin?.(peer);
        }
      }

      // Detect departed peers (leaves)
      for (const peerId of previousPeerIds) {
        if (!currentPeerIds.has(peerId)) {
          this.options.onPeerLeave?.(peerId);
        }
      }

      // Update known peers
      this.knownPeers = currentPeerIds;

      // Update peer count in state
      this.updateState({ peerCount: peers.length });
    });
  }

  /**
   * Sync vault state to CRDT (local changes)
   */
  private syncVaultToCrdt(): void {
    if (!this.adapter || this.syncInProgress) return;

    const state = this.vault.getState();

    // Sync all entities to CRDT
    for (const [entityType, entityMap] of Object.entries(state.entities)) {
      for (const [entityId, entity] of Object.entries(entityMap)) {
        this.adapter.applyLocalChange(entityId, {
          ...entity,
          type: entityType as NormalizedEntity['type'],
        });
      }
    }

    // Update last synced timestamp
    this.updateState({ lastSyncedAt: Date.now() });
  }

  /**
   * Apply CRDT changes to vault (remote changes)
   */
  private applyCrdtToVault(entityId: string, changes: unknown): void {
    if (!this.adapter) return;

    // Set flag to prevent echo back to CRDT
    this.syncInProgress = true;

    try {
      const typedChanges = changes as Record<string, unknown>;

      // Get entity type from changes if available
      const entityType = typedChanges.type as string | undefined;

      // Filter out internal/sync-only properties
      const vaultChanges: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(typedChanges)) {
        // Skip the type property (used for CRDT only)
        if (key === 'type') continue;
        vaultChanges[key] = value;
      }

      // Apply update to vault (no history tracking for remote changes)
      if (Object.keys(vaultChanges).length > 0) {
        this.vault.update(entityId, vaultChanges);
      }

      // Update last synced timestamp
      this.updateState({ lastSyncedAt: Date.now() });
    } finally {
      // Always reset the flag
      this.syncInProgress = false;
    }
  }

  /**
   * Update sync state and notify listeners
   */
  private updateState(updates: Partial<SyncState>): void {
    this.state = { ...this.state, ...updates };
    this.options.onStateChange?.(this.state);
  }

  /**
   * Clean up all subscriptions
   */
  private cleanupSubscriptions(): void {
    if (this.unsubscribeVault) {
      this.unsubscribeVault();
      this.unsubscribeVault = null;
    }

    if (this.unsubscribeRemote) {
      this.unsubscribeRemote();
      this.unsubscribeRemote = null;
    }

    if (this.unsubscribePresence) {
      this.unsubscribePresence();
      this.unsubscribePresence = null;
    }
  }

  /**
   * Clean up the adapter
   */
  private cleanupAdapter(): void {
    if (this.adapter) {
      this.adapter.destroy();
      this.adapter = null;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createSyncProvider(options: SyncProviderOptions): SyncProvider {
  return new SyncProvider(options);
}
