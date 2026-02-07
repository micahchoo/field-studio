/**
 * Vault Collection Membership Functions (Organism Layer)
 *
 * Handles non-hierarchical, many-to-many relationships between
 * Collections and Manifests. Collections reference Manifests rather
 * than owning them, allowing Manifests to exist in multiple Collections.
 */

import type { IIIFManifest, NormalizedState } from '@/src/shared/types';

/**
 * Get all Collections that reference a given resource (Manifest or nested Collection)
 * Supports the IIIF 3.0 model where same Manifest can be in multiple Collections
 */
export function getCollectionsContaining(state: NormalizedState, resourceId: string): string[] {
  return state.memberOfCollections[resourceId] || [];
}

/**
 * Get all members (Manifests/Collections) referenced by a Collection
 */
export function getCollectionMembers(state: NormalizedState, collectionId: string): string[] {
  return state.collectionMembers[collectionId] || [];
}

/**
 * Check if a Manifest is standalone (not in any Collection)
 */
export function isOrphanManifest(state: NormalizedState, manifestId: string): boolean {
  const type = state.typeIndex[manifestId];
  if (type !== 'Manifest') return false;
  const memberships = state.memberOfCollections[manifestId] || [];
  return memberships.length === 0;
}

/**
 * Get all standalone Manifests (not referenced by any Collection)
 */
export function getOrphanManifests(state: NormalizedState): IIIFManifest[] {
  return Object.values(state.entities.Manifest).filter(
    manifest => isOrphanManifest(state, manifest.id)
  );
}

/**
 * Add a resource to a Collection (creates a reference, not ownership)
 */
export function addToCollection(
  state: NormalizedState,
  collectionId: string,
  resourceId: string
): NormalizedState {
  // Verify both entities exist
  if (!state.typeIndex[collectionId] || !state.typeIndex[resourceId]) {
    console.warn('Cannot add to collection: entity not found');
    return state;
  }

  // Update collection members
  const currentMembers = state.collectionMembers[collectionId] || [];
  if (currentMembers.includes(resourceId)) {
    return state; // Already a member
  }

  const newCollectionMembers = {
    ...state.collectionMembers,
    [collectionId]: [...currentMembers, resourceId]
  };

  // Update reverse lookup
  const currentMemberships = state.memberOfCollections[resourceId] || [];
  const newMemberOfCollections = {
    ...state.memberOfCollections,
    [resourceId]: [...currentMemberships, collectionId]
  };

  return {
    ...state,
    collectionMembers: newCollectionMembers,
    memberOfCollections: newMemberOfCollections
  };
}

/**
 * Remove a resource from a Collection (removes reference, not the resource itself)
 */
export function removeFromCollection(
  state: NormalizedState,
  collectionId: string,
  resourceId: string
): NormalizedState {
  // Update collection members
  const currentMembers = state.collectionMembers[collectionId] || [];
  const newMembers = currentMembers.filter(id => id !== resourceId);

  const newCollectionMembers = {
    ...state.collectionMembers,
    [collectionId]: newMembers
  };

  // Update reverse lookup
  const currentMemberships = state.memberOfCollections[resourceId] || [];
  const newMemberships = currentMemberships.filter(id => id !== collectionId);

  const newMemberOfCollections = {
    ...state.memberOfCollections,
    [resourceId]: newMemberships
  };

  return {
    ...state,
    collectionMembers: newCollectionMembers,
    memberOfCollections: newMemberOfCollections
  };
}
