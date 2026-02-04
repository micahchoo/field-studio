# Collection Entity (`src/entities/collection/`)

The Collection entity layer re-exports collection-specific selectors and actions for safe feature access.

## Structure

```
collection/
├── model.ts     ← Selectors for querying collection state
├── actions.ts   ← Action creators for collection mutations
├── index.ts     ← Public API
└── README.md    (this file)
```

## Key Concepts

Collections in IIIF 3.0 have two types of relationships:

1. **Hierarchical** (parent-child): A collection can own nested collections
2. **Membership** (many-to-many): A collection can reference manifests or other collections without owning them

The Collection entity supports both patterns.

## Selectors (model.ts)

### `selectById(state, id): IIIFCollection | null`

Get a collection by ID.

```typescript
import { collection } from '@/src/entities';

const collectionData = collection.model.selectById(state, 'collection-id');
```

### `selectAll(state): IIIFCollection[]`

Get all collections in the vault.

```typescript
const allCollections = collection.model.selectAll(state);
```

### `selectMembers(state, collectionId): string[]`

Get member IDs (manifests or nested collections) of a collection.

```typescript
const memberIds = collection.model.selectMembers(state, collectionId);
```

### `selectParentCollection(state, collectionId): string | null`

Get parent collection ID (hierarchical ownership).

```typescript
const parentId = collection.model.selectParentCollection(state, collectionId);
```

### `selectCollectionMemberships(state, collectionId): string[]`

Get all collections that reference this collection (many-to-many).

```typescript
const memberOfCollections = collection.model.selectCollectionMemberships(state, collectionId);
```

### `selectLabel(state, collectionId): LanguageMap | null`

Get collection label.

```typescript
const label = collection.model.selectLabel(state, collectionId);
console.log(label?.en?.[0]);
```

### `selectSummary(state, collectionId): LanguageMap | null`

Get collection description.

```typescript
const summary = collection.model.selectSummary(state, collectionId);
```

### `selectMetadata(state, collectionId): Metadata[]`

Get collection metadata fields.

```typescript
const metadata = collection.model.selectMetadata(state, collectionId);
```

### `selectAncestors(state, collectionId): string[]`

Get path to root (parent collection → ... → root).

```typescript
const ancestors = collection.model.selectAncestors(state, collectionId);
```

### `selectDescendants(state, collectionId): string[]`

Get all nested items recursively.

```typescript
const descendants = collection.model.selectDescendants(state, collectionId);
```

### `countMembers(state, collectionId): number`

Count direct members.

```typescript
const count = collection.model.countMembers(state, collectionId);
```

### `hasMembers(state, collectionId): boolean`

Check if collection has any members.

```typescript
if (collection.model.hasMembers(state, collectionId)) {
  console.log('Collection has members');
}
```

### `selectOrphanManifests(state): string[]`

Get all manifests not in any collection.

```typescript
const orphans = collection.model.selectOrphanManifests(state);
```

### `isRoot(state, collectionId): boolean`

Check if collection is the root.

```typescript
if (collection.model.isRoot(state, collectionId)) {
  console.log('This is the root collection');
}
```

### `selectTopLevel(state): IIIFCollection[]`

Get top-level collections (those without a parent).

```typescript
const topLevel = collection.model.selectTopLevel(state);
```

## Actions (actions.ts)

All action creators return an `Action` object. Features dispatch these via the Vault singleton's ActionDispatcher.

### `updateLabel(collectionId, label): Action`

Update collection label.

```typescript
const action = collection.actions.updateLabel(id, { en: ['New Label'] });
vault.dispatch(action);
```

### `updateSummary(collectionId, summary): Action`

Update collection description.

```typescript
const action = collection.actions.updateSummary(id, { en: ['Description'] });
```

### `updateMetadata(collectionId, metadata): Action`

Update collection metadata.

```typescript
const action = collection.actions.updateMetadata(id, [
  { label: { en: ['Theme'] }, value: { en: ['Nature'] } }
]);
```

### `updateRights(collectionId, rights): Action`

Update rights URI.

```typescript
const action = collection.actions.updateRights(id, 'https://example.org/rights');
```

### `updateBehavior(collectionId, behavior): Action`

Update viewing behaviors.

```typescript
const action = collection.actions.updateBehavior(id, ['paged']);
```

### `addMember(collectionId, memberId): Action`

Add member (manifest or nested collection) to collection.

This creates a reference, not ownership. The member can be in multiple collections.

```typescript
const action = collection.actions.addMember(collectionId, manifestId);
vault.dispatch(action);
```

### `moveToParentCollection(collectionId, parentCollectionId, index?): Action`

Move nested collection to different parent collection.

```typescript
const action = collection.actions.moveToParentCollection(collectionId, newParentId);
```

### `batchUpdate(collectionId, changes): Action`

Batch update multiple properties.

```typescript
const action = collection.actions.batchUpdate(collectionId, {
  label: { en: ['Updated'] },
  rights: 'https://example.org/rights'
});
```

## Usage in Features

```typescript
import { collection, manifest } from '@/src/entities';
import { getVault } from '@/services';

export const CollectionBrowser = ({ collectionId, state }) => {
  const collectionData = collection.model.selectById(state, collectionId);
  const memberIds = collection.model.selectMembers(state, collectionId);
  const vault = getVault();

  const handleAddManifest = (manifestId) => {
    const action = collection.actions.addMember(collectionId, manifestId);
    vault.dispatch(action);
  };

  return (
    <div>
      <h2>{collectionData?.label?.en?.[0]}</h2>
      <p>{memberIds.length} members</p>
      <MemberList memberIds={memberIds} state={state} />
    </div>
  );
};
```

## Hierarchical vs Many-to-Many

### Hierarchical (Parent-Child)

```
Root Collection
└── Sub-Collection
    └── Sub-Sub-Collection
```

Use `selectParentCollection()` to traverse upward, `selectAncestors()` for full path.

### Many-to-Many (References)

```
Manifest
├── In Collection A
├── In Collection B
└── In Collection C
```

Use `selectCollectionMemberships()` to find all collections that reference a manifest.

## Rules

✅ **Collection entity CAN:**
- Re-export collection-specific selectors
- Re-export collection-specific action creators
- Use vault functions for traversal
- Support both hierarchical and referential relationships

❌ **Collection entity CANNOT:**
- Implement new business logic
- Access other entity models
- Manage global state
- Perform UI operations

## See Also

- `../README.md` — Entity layer philosophy
- `../canvas/README.md` — Canvas entity
- `../manifest/README.md` — Manifest entity
