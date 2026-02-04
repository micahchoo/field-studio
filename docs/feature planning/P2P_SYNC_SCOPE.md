# P2P Sync Layer for Field Studio - Scoping Document

## Overview

This document scopes out a **peer-to-peer (P2P) sync layer using CRDTs** for small teams (2-10 users) collaborating on IIIF archives in Field Studio. The goal is to enable real-time collaboration while maintaining the local-first, browser-based architecture.

---

## Current Architecture Analysis

### Existing Data Layer
| Component | Purpose | Relevance to Sync |
|-----------|---------|-------------------|
| `storage.ts` | IndexedDB persistence (files, derivatives, project) | Can be extended for sync metadata |
| `vault.ts` | Normalized IIIF state with O(1) lookups | Perfect for CRDT mapping |
| `actions.ts` | Action-driven mutations with undo/redo | Can become sync-aware operations |
| `types.ts` | IIIF-compliant data structures | CRDT schemas map directly |

### Key Data Types to Sync
1. **IIIF Entities**: Collections, Manifests, Canvases, Ranges, Annotations
2. **Metadata**: Labels, summaries, metadata pairs, rights, navDate
3. **Structural**: Parent-child references, collection membership
4. **Annotations**: W3C Web Annotations with targets and bodies
5. **Files**: Binary assets (images, audio, video) - **out of scope for v1** (see below)

---

## Recommended Approach: Yjs + y-webrtc

### Why Yjs?

| Criteria | Yjs | Automerge |
|----------|-----|-----------|
| Bundle Size | ~20KB gzipped | ~100KB+ gzipped |
| WebRTC Support | Native (y-webrtc) | Requires custom adapter |
| Maturity | Battle-tested (Figma, Notion patterns) | Excellent but more complex |
| Learning Curve | Low | Medium |
| Team Size Scaling | Optimized for small groups | Better for larger teams |
| React Integration | y-react | @automerge/react |

**Decision**: Yjs is ideal for Field Studio's use case:
- Small teams (2-10 users)
- Browser-only, no server infrastructure
- Need simple, drop-in P2P sync

---

## Architecture Design

### 1. Sync Layer Structure

```
services/sync/
├── crdtAdapter.ts      # Yjs ↔ Vault bridge
├── peerManager.ts      # WebRTC peer discovery & management  
├── syncProvider.ts     # High-level sync coordination
├── awareness.ts        # Presence, cursors, user info
├── crypto.ts           # End-to-end encryption (optional v2)
└── types.ts            # Sync-specific types
```

### 2. CRDT Schema Mapping

```typescript
// Yjs document structure mirroring Vault state
interface SyncDocument {
  // Entities stored as Y.Map for fine-grained updates
  entities: Y.Map<Y.Map<IIIFEntity>>  // type -> id -> entity
  
  // References as Y.Array for ordered lists
  references: Y.Map<Y.Array<string>>  // parentId -> [childIds]
  
  // Collection membership (many-to-many)
  collectionMembers: Y.Map<Y.Array<string>>
  memberOfCollections: Y.Map<Y.Array<string>>
  
  // Type index for O(1) lookups
  typeIndex: Y.Map<string>  // id -> entityType
  
  // Sync metadata
  syncMeta: Y.Map<{
    lastModified: number
    modifiedBy: string
    version: number
  }>
}
```

### 3. Integration Points

```typescript
// services/sync/crdtAdapter.ts
export class VaultCrdtAdapter {
  private ydoc: Y.Doc
  private provider: WebrtcProvider
  private persistence: IndexeddbPersistence
  
  constructor(
    private vault: Vault,
    private roomId: string,
    private userId: string
  ) {
    // Initialize Yjs document
    this.ydoc = new Y.Doc()
    
    // Local persistence (syncs with existing IDB)
    this.persistence = new IndexeddbPersistence(
      `field-studio-sync-${roomId}`, 
      this.ydoc
    )
    
    // P2P network sync
    this.provider = new WebrtcProvider(
      `field-studio-${roomId}`,
      this.ydoc,
      {
        signaling: ['wss://signaling.yjs.dev'], // or self-hosted
        password: roomPassword, // Optional encryption
        maxConns: 10, // Small team limit
      }
    )
    
    // Bidirectional sync: Vault → CRDT
    this.setupVaultListener()
    
    // Bidirectional sync: CRDT → Vault  
    this.setupCrdtListener()
  }
}
```

### 4. Action Integration

```typescript
// services/sync/syncProvider.ts
export class SyncProvider {
  private adapter: VaultCrdtAdapter
  private awareness: awarenessProtocol.Awareness
  
  // Wrap existing actions with sync
  dispatch(action: Action): boolean {
    // 1. Apply locally through existing reducer
    const result = this.dispatcher.dispatch(action)
    
    // 2. Sync to CRDT (will propagate to peers)
    if (result.success) {
      this.adapter.syncAction(action)
    }
    
    return result.success
  }
  
  // Handle incoming remote changes
  onRemoteChange(action: Action) {
    // Apply without adding to history (remote changes aren't undoable)
    this.dispatcher.applyRemote(action)
  }
}
```

---

## Implementation Phases

### Phase 1: Foundation (1-2 weeks)
**Goal**: Basic P2P sync for metadata only

```typescript
// New dependencies
{
  "yjs": "^13.6.0",
  "y-webrtc": "^10.3.0",
  "y-indexeddb": "^9.0.0",
  "lib0": "^0.2.0"  // Yjs utilities
}
```

**Tasks**:
1. Create `services/sync/crdtAdapter.ts` - Yjs ↔ Vault bridge
2. Extend `ActionDispatcher` to broadcast actions
3. Add sync initialization UI (room ID input, connect button)
4. Implement basic presence awareness (who's online)

**Data synced**: Labels, summaries, metadata, rights, navDate

---

### Phase 2: Structural Sync (1 week)
**Goal**: Sync IIIF hierarchy changes

**Tasks**:
1. Sync entity CRUD operations (add/remove canvases, manifests)
2. Sync structural changes (reorder, move items between parents)
3. Handle collection membership changes
4. Add conflict resolution UI (when same field edited concurrently)

---

### Phase 3: Annotations (1 week)
**Goal**: Sync W3C Web Annotations

**Tasks**:
1. Sync annotation creation/deletion
2. Sync annotation body changes (transcriptions, comments)
3. Sync spatial annotations (SVG selectors on canvas)
4. Real-time annotation cursors (show where others are annotating)

---

### Phase 4: File Sync (Future / Complex)
**Goal**: Optional file asset synchronization

**Challenge**: Binary files don't fit CRDT model well

**Approaches**:
1. **Out-of-band**: Files stay local, only sync metadata + file hashes
   - Peers request files separately via WebRTC data channels
   - Show "file unavailable" if peer offline

2. **Hybrid**: Small files (<1MB) via CRDT, large files via WebTorrent/IPFS
   - Adds significant complexity

3. **Server fallback**: Use simple file hosting for shared assets
   - Compromises pure P2P but practical

**Recommendation**: Start with approach #1 (metadata + hash sync)

---

## UI/UX Design

### Sync Panel (New Component)

```
┌─────────────────────────────────────┐
│  🔗 Collaboration                   │
├─────────────────────────────────────┤
│  Room: [field-expedition-2024   ]   │
│  [ Connect to Room ]                │
├─────────────────────────────────────┤
│  Online (3):                        │
│  ● Alice (editing Manifest A)       │
│  ● Bob (viewing Canvas 3)           │
│  ○ You                              │
├─────────────────────────────────────┤
│  Sync Status: ✅ In Sync            │
│  Last sync: 2 seconds ago           │
└─────────────────────────────────────┘
```

### Conflict Resolution UI

```typescript
// When concurrent edits detected
interface ConflictDialogProps {
  field: string
  localValue: unknown
  remoteValue: unknown
  remoteUser: string
  onResolve: (value: unknown, strategy: 'local' | 'remote' | 'merge') => void
}
```

### Presence Indicators

- **Cursor positions**: Show where other users are on canvas
- **Selection highlights**: Show what others have selected
- **Edit badges**: "Alice is editing this manifest"

---

## Security Considerations

### Phase 1: Basic Security
```typescript
// Room-level password protection
const provider = new WebrtcProvider(roomId, ydoc, {
  password: 'shared-team-password', // Encrypts signaling + data
  maxConns: 10,
})
```

### Phase 2: Enhanced Security (Optional)
- **End-to-end encryption**: Encrypt CRDT updates with team key
- **Identity verification**: Simple public key pinning
- **Read-only mode**: Allow viewers who can't edit

---

## Network Resilience

### Offline Support
```typescript
// y-indexeddb automatically handles:
// - Queue updates while offline
// - Sync when connection restored
// - Merge divergent histories

// Custom offline indicator
provider.on('status', ({ status }) => {
  // 'connected' | 'disconnected'
  showOfflineBanner(status === 'disconnected')
})
```

### Reconnection Strategy
- Exponential backoff for WebRTC reconnection
- Persistent room state in IndexedDB
- Automatic re-sync on page reload

---

## Testing Strategy

### Unit Tests
```typescript
// Test CRDT ↔ Vault conversion
describe('CrdtAdapter', () => {
  it('should sync label updates bidirectionally', () => {
    // Simulate local update
    vault.updateLabel(id, { en: ['New Title'] })
    
    // Verify Yjs document updated
    expect(yMap.get('label')).toEqual({ en: ['New Title'] })
    
    // Simulate remote update
    remoteYMap.set('label', { en: ['Remote Title'] })
    
    // Verify vault updated
    expect(vault.getEntity(id).label).toEqual({ en: ['Remote Title'] })
  })
})
```

### Integration Tests
- Multi-tab testing ( BroadcastChannel)
- Multi-device testing (actual WebRTC)
- Offline/online transitions
- Conflict scenario simulation

---

## Performance Considerations

### Document Size Limits
| Metric | Limit | Notes |
|--------|-------|-------|
| Max entities | 10,000 | Yjs handles this fine |
| Max concurrent users | 10 | WebRTC mesh limitation |
| Initial sync time | <5s | For typical field archive |
| Update latency | <100ms | Local network |

### Optimizations
1. **Lazy loading**: Don't sync entities not in current view
2. **Delta updates**: Yjs only sends changed bytes
3. **Compression**: Use Yjs's built-in compression
4. **Debouncing**: Batch rapid edits (e.g., typing in metadata field)

---

## Alternative: Automerge Path

If requirements change (larger teams, server component):

```typescript
// Automerge alternative structure
import { Repo } from "@automerge/automerge-repo"
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb"
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel"

const repo = new Repo({
  network: [
    new BroadcastChannelNetworkAdapter(), // Same-tab sync
    // Would need custom WebRTC adapter for true P2P
  ],
  storage: new IndexedDBStorageAdapter("field-studio"),
})

// Documents map to Vault entities
const handle = repo.create<IIIFManifest>()
```

**When to switch to Automerge**:
- Team size grows >10 users
- Need server-side persistence
- More complex conflict resolution requirements

---

## Summary

### Recommended Tech Stack
- **CRDT Library**: Yjs + y-webrtc
- **Signaling**: Public yjs.dev servers (or self-hosted)
- **Persistence**: y-indexeddb (integrates with existing IDB)
- **Encryption**: Room passwords (Yjs built-in)

### Effort Estimate
| Phase | Duration | Complexity |
|-------|----------|------------|
| Phase 1: Foundation | 1-2 weeks | Medium |
| Phase 2: Structural | 1 week | Medium |
| Phase 3: Annotations | 1 week | Medium |
| Phase 4: Files | 2-3 weeks | High |
| **Total (v1)** | **3-4 weeks** | - |

### Success Criteria
- [ ] Two users can edit same manifest metadata simultaneously
- [ ] Changes sync in <1 second on same network
- [ ] Offline edits sync correctly when reconnected
- [ ] Undo/redo still works for local changes
- [ ] No data loss in conflict scenarios

---

## Open Questions

1. **Signaling servers**: Use public yjs.dev or self-host?
2. **File strategy**: Metadata-only sync, or invest in P2P file transfer?
3. **User identity**: Anonymous (random color) or simple name entry?
4. **Version compatibility**: How to handle different app versions syncing?
5. **Archive size limits**: What's the practical limit for P2P sync?
