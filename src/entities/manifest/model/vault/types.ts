/**
 * Vault Types - Re-exports from shared types
 *
 * The canonical type definitions live in @/src/shared/types.
 * This file re-exports them so vault modules can import locally.
 */

export type {
  EntityType,
  TrashedEntity,
  NormalizedState,
  VaultSnapshot,
  RemoveOptions,
  RestoreOptions,
  EmptyTrashResult,
} from '@/src/shared/types';
