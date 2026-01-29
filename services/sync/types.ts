/**
 * Sync Types
 *
 * Type definitions for P2P collaboration and synchronization.
 */

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SyncState {
  status: SyncStatus;
  peerCount: number;
  roomId: string | null;
  error: string | null;
  lastSyncedAt: number | null;
}
