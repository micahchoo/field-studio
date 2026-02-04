# Cloud Gallery Integration Scope

## Executive Summary

This document scopes the integration of Field Studio with cloud gallery services (Immich, Nextcloud, Google Photos) for **read-write** access with IIIF support options.

### Key Findings

| Service | Native IIIF | Read | Write | Dynamic Images | Best Approach |
|---------|-------------|------|-------|----------------|---------------|
| **Immich** | ❌ No | ✅ Full | ✅ Full | Limited (3 sizes) | Proxy via Field Studio IIIF server |
| **Nextcloud** | ❌ No | ✅ Full | ✅ Full | Preview API | Proxy via Field Studio IIIF server |
| **Google Photos** | ❌ No | ✅ Picker API | ✅ Library API | Basic params | Proxy via Field Studio IIIF server |

**None of the services support native IIIF.** All integrations will require Field Studio to either:
1. **Proxy mode**: Cache images locally and serve via the existing Service Worker IIIF server
2. **Hybrid mode**: Use direct URLs for viewing, proxy only for IIIF features

---

## Architecture Overview

### Current Field Studio Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Field Studio App                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React UI  │  │  Vault State│  │    IIIF Builder         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │        Service Worker (sw.js) - IIIF Image API          │    │
│  │              /iiif/image/{id}/info.json                 │    │
│  │       /iiif/image/{id}/{region}/{size}/{rot}/{qual}     │    │
│  └─────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              IndexedDB (idb) Storage                     │    │
│  │  ┌──────────┐ ┌──────────────┐ ┌─────────────────────┐  │    │
│  │  │  files   │ │ derivatives  │ │      project        │  │    │
│  │  │  (Blobs) │ │(thumb/small/)│ │  (IIIF Collection)  │  │    │
│  │  └──────────┘ └──────────────┘ └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Proposed Cloud Integration Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Field Studio App                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │ Cloud Providers │  │ Sync Manager    │  │  IIIF Manifest Builder      │  │
│  │  - Immich       │  │  - Bi-directional│  │  - Virtual manifests        │  │
│  │  - Nextcloud    │  │  - Conflict res │  │  - External references      │  │
│  │  - Google Photos│  │  - Offline queue│  │  - Hybrid local/remote      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     Service Worker (Enhanced)                           │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │ │
│  │  │ Local IIIF      │  │ Cloud Proxy     │  │ Cached Tiles            │ │ │
│  │  │ /iiif/image/    │  │ /iiif/proxy/    │  │ (LRU Cache)             │ │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────┐  ┌─────────────────────────────────────────┐  │
│  │   IndexedDB              │  │   Cloud Connection Store                │  │
│  │  ┌────────────────────┐  │  │  ┌─────────────┐ ┌──────────────────┐  │  │
│  │  │ Local Assets       │  │  │  │Credentials │ │ Sync State        │  │  │
│  │  │ (existing)         │  │  │  │ (encrypted) │ │ (pending/changes) │  │  │
│  │  └────────────────────┘  │  │  └─────────────┘ └──────────────────┘  │  │
│  └──────────────────────────┘  └─────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           Cloud Services                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────────────────────┐ │
│  │   Immich     │    │  Nextcloud   │    │       Google Photos             │ │
│  │  /api/assets │    │/remote.php/dav│   │  photoslibrary.googleapis.com   │ │
│  │  /api/albums │    │   /preview    │    │  photospicker.googleapis.com    │ │
│  └──────────────┘    └──────────────┘    └─────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Service-Specific Implementation

### 1. Immich Integration

#### API Summary
- **Base URL**: `https://immich-instance/api`
- **Auth**: API Key via `x-api-key` header
- **Docs**: OpenAPI spec at `/api/docs`

#### Authentication Flow
```typescript
interface ImmichCredentials {
  instanceUrl: string;  // e.g., "https://photos.example.com"
  apiKey: string;
  // Optional: OAuth token for user accounts
}

// API Key generation in Immich:
// User Settings → API Keys → Create Key
// Granular permissions: asset.read, asset.upload, album.read, etc.
```

#### Key Endpoints
| Operation | Endpoint | Notes |
|-----------|----------|-------|
| List Assets | `POST /api/search/metadata` | Pagination required (max 250/page) |
| Get Asset | `GET /api/assets/{id}` | Metadata only |
| Download | `GET /api/assets/{id}/original` | Binary download |
| Thumbnail | `GET /api/assets/{id}/thumbnail?size={thumbnail\|preview\|fullsize}` | 3 sizes |
| Upload | `POST /api/assets` | multipart/form-data |
| List Albums | `GET /api/albums` | |
| Get Album | `GET /api/albums/{id}` | Includes asset list |

#### IIIF Strategy: Local Proxy
Since Immich has no IIIF support and only 3 fixed sizes:

```typescript
// Option 1: Download & Serve (Full IIIF)
// Download original to IndexedDB, serve via existing SW
class ImmichProxyProvider {
  async getIIIFUrl(assetId: string, region: string, size: string): Promise<string> {
    // Check if asset is cached locally
    const cached = await this.cache.get(assetId);
    if (cached) {
      return `/iiif/image/${assetId}/${region}/${size}/0/default.jpg`;
    }
    // Download on-demand or show placeholder
    await this.downloadAsset(assetId);
    return `/iiif/image/${assetId}/${region}/${size}/0/default.jpg`;
  }
}

// Option 2: Direct URL with Limited Features
// Use Immich's thumbnail for preview, download original only when needed
class ImmichDirectProvider {
  resolveImage(assetId: string, preferredSize: string): string {
    const sizeMap = {
      'thumbnail': 'thumbnail',
      'medium': 'preview', 
      'full': 'fullsize'
    };
    return `${this.baseUrl}/api/assets/${assetId}/thumbnail?size=${sizeMap[preferredSize]}`;
  }
}
```

#### Upload Workflow
```typescript
async uploadToImmich(file: File, albumId?: string): Promise<string> {
  const formData = new FormData();
  formData.append('assetData', file);
  formData.append('deviceAssetId', `${file.name}-${file.size}-${file.lastModified}`);
  formData.append('deviceId', 'field-studio');
  formData.append('fileCreatedAt', new Date().toISOString());
  formData.append('fileModifiedAt', new Date().toISOString());
  
  const response = await fetch(`${this.baseUrl}/api/assets`, {
    method: 'POST',
    headers: { 'x-api-key': this.apiKey },
    body: formData
  });
  
  const result = await response.json();
  // result.id is the new asset ID
  
  if (albumId) {
    await fetch(`${this.baseUrl}/api/albums/${albumId}`, {
      method: 'PUT',
      headers: { 
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: [result.id] })
    });
  }
  
  return result.id;
}
```

#### Pros & Cons
| Pros | Cons |
|------|------|
| Self-hosted (full control) | No IIIF support |
| Fast local network access | No dynamic image transforms |
| Granular API permissions | API still evolving (breaking changes) |
| Built-in deduplication (SHA1) | Limited to 3 image sizes |
| Facial recognition & AI search | |

---

### 2. Nextcloud Integration

#### API Summary
- **WebDAV**: `https://cloud.example.com/remote.php/dav/files/{user}/`
- **Public Shares**: `https://cloud.example.com/public.php/dav/files/{token}/`
- **Auth**: Basic Auth (username:app-password) or session cookies

#### Authentication Flow
```typescript
interface NextcloudCredentials {
  serverUrl: string;     // e.g., "https://cloud.example.com"
  username: string;
  appPassword: string;   // Generated in Personal Settings → Security
}

// App Password generation:
// Settings → Personal → Security → Devices & sessions → Create new app password
```

#### Key Endpoints
| Operation | Endpoint | Notes |
|-----------|----------|-------|
| List Files | `PROPFIND /remote.php/dav/files/{user}/{path}` | WebDAV |
| Download | `GET /remote.php/dav/files/{user}/{path}` | Binary |
| Upload | `PUT /remote.php/dav/files/{user}/{path}` | Binary |
| Preview | `/index.php/core/preview?fileId={id}&x={width}&y={height}` | Dynamic sizing |
| Thumbnail | `/apps/files/api/v1/thumbnail/{x}/{y}/{fileId}` | Fixed sizes |

#### IIIF Strategy: Hybrid Approach
Nextcloud has better image preview support than Immich:

```typescript
class NextcloudImageProvider {
  // For simple viewing - use Nextcloud's preview API
  getPreviewUrl(fileId: string, width: number, height: number): string {
    return `${this.serverUrl}/index.php/core/preview?fileId=${fileId}&x=${width}&y=${height}&a=1`;
  }
  
  // For IIIF deep zoom - download and proxy
  async getIIIFUrl(fileId: string, region: string, size: string): Promise<string> {
    const localId = `nc-${fileId}`;
    const cached = await this.cache.get(localId);
    if (cached) {
      return `/iiif/image/${localId}/${region}/${size}/0/default.jpg`;
    }
    // Trigger background download
    this.downloadInBackground(fileId, localId);
    // Return preview URL as fallback
    return this.getPreviewUrl(fileId, 1200, 1200);
  }
}
```

#### WebDAV Integration
```typescript
import { createClient } from 'webdav';

class NextcloudProvider {
  private client: WebDAVClient;
  
  constructor(creds: NextcloudCredentials) {
    this.client = createClient(
      `${creds.serverUrl}/remote.php/dav`,
      {
        username: creds.username,
        password: creds.appPassword
      }
    );
  }
  
  async listPhotos(path: string = '/'): Promise<PhotoItem[]> {
    const contents = await this.client.getDirectoryContents(
      `/files/${this.username}${path}`,
      { details: true }
    ) as FileStat[];
    
    return contents
      .filter(item => item.type === 'file' && this.isImage(item.mimeType))
      .map(item => ({
        id: item.props?.['oc:fileid'] || item.filename,
        filename: item.basename,
        path: item.filename,
        size: item.size,
        lastModified: item.lastmod,
        mimeType: item.mimeType,
        etag: item.etag
      }));
  }
  
  async download(filePath: string): Promise<Blob> {
    return await this.client.getFileContents(filePath) as Blob;
  }
  
  async upload(filePath: string, blob: Blob): Promise<void> {
    await this.client.putFileContents(filePath, blob, { overwrite: true });
  }
}
```

#### File ID Resolution
Nextcloud uses file IDs internally. To get a file ID from a path:

```typescript
async getFileId(path: string): Promise<string | null> {
  const propfindBody = `<?xml version="1.0"?>
    <d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
      <d:prop>
        <oc:fileid />
        <d:getcontenttype />
        <d:getlastmodified />
      </d:prop>
    </d:propfind>`;
    
  const response = await fetch(`${this.serverUrl}/remote.php/dav/files/${this.username}${path}`, {
    method: 'PROPFIND',
    headers: {
      'Authorization': `Basic ${btoa(`${this.username}:${this.appPassword}`)}`,
      'Content-Type': 'text/xml'
    },
    body: propfindBody
  });
  
  // Parse XML response to extract oc:fileid
  // ...
}
```

#### Pros & Cons
| Pros | Cons |
|------|------|
| Self-hosted | No native IIIF |
| WebDAV standard | Preview API requires fileId (not path) |
| Dynamic preview sizes | Basic auth can be less secure |
| Rich ecosystem of apps | |
| Good sharing capabilities | |

---

### 3. Google Photos Integration

#### API Summary
- **Picker API**: `photospicker.googleapis.com` - User selects photos
- **Library API**: `photoslibrary.googleapis.com` - Manage app-created content
- **Auth**: OAuth 2.0 (no API key alone for user data)

#### Authentication Flow
```typescript
interface GooglePhotosCredentials {
  clientId: string;
  clientSecret?: string; // For server-side only
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Required OAuth Scopes:
// - https://www.googleapis.com/auth/photoslibrary.readonly (limited access)
// - https://www.googleapis.com/auth/photoslibrary.appendonly (upload only)
// - https://www.googleapis.com/auth/photoslibrary (full access, app-created only)

// IMPORTANT: As of April 2025, Library API only provides access to 
// photos CREATED BY YOUR APP, not the full library.
// Use Picker API for user library access.
```

#### Key Endpoints
| Operation | Endpoint | Notes |
|-----------|----------|-------|
| Create Picker Session | `POST /v1/sessions` | Returns pickerUri |
| Get Picker Results | `GET /v1/sessions/{id}` | Poll until complete |
| List Media Items | `GET /v1/mediaItems` | App-created only |
| Get Media Item | `GET /v1/mediaItems/{id}` | |
| Upload Bytes | `POST /v1/uploads` | Step 1 of upload |
| Create Media Item | `POST /v1/mediaItems:batchCreate` | Step 2 of upload |

#### Image URL Parameters
Google Photos supports basic transformations:

```typescript
class GooglePhotosProvider {
  getImageUrl(baseUrl: string, options: {
    width?: number;
    height?: number;
    crop?: boolean;
    download?: boolean;
  }): string {
    let url = baseUrl;
    const params: string[] = [];
    
    if (options.width && options.height) {
      params.push(`=w${options.width}-h${options.height}`);
      if (options.crop) params.push('-c');
    } else if (options.width) {
      params.push(`=w${options.width}`);
    } else if (options.height) {
      params.push(`=h${options.height}`);
    }
    
    if (options.download) params.push('-d');
    
    return url + params.join('');
  }
  
  // Examples:
  // Thumbnail: =w256-h256-c (square crop)
  // Preview: =w1200-h800
  // Full: =d (download original)
}
```

#### Picker API Flow (for reading user photos)
```typescript
class GooglePhotosPicker {
  async createSession(maxItems: number = 100): Promise<PickerSession> {
    const response = await fetch('https://photospicker.googleapis.com/v1/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxItemCount: maxItems
      })
    });
    
    const session = await response.json();
    // session.pickerUri - URL to open in popup/iframe
    // session.id - Session ID for polling
    return session;
  }
  
  async pollForResults(sessionId: string): Promise<MediaItem[] | null> {
    const response = await fetch(
      `https://photospicker.googleapis.com/v1/sessions/${sessionId}`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );
    
    const status = await response.json();
    
    if (status.pickerUri) {
      // Still waiting for user
      return null;
    }
    
    // User completed picking
    // Now fetch the selected items
    const itemsResponse = await fetch(
      `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}`,
      {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      }
    );
    
    const items = await itemsResponse.json();
    return items.mediaItems;
  }
  
  async deleteSession(sessionId: string): Promise<void> {
    // Recommended to clean up sessions
    await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.accessToken}` }
    });
  }
}
```

#### Upload Flow
```typescript
async uploadToGooglePhotos(file: File, albumId?: string): Promise<string> {
  // Step 1: Upload bytes
  const uploadResponse = await fetch('https://photoslibrary.googleapis.com/v1/uploads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/octet-stream',
      'X-Goog-Upload-File-Name': file.name,
      'X-Goog-Upload-Protocol': 'raw'
    },
    body: file
  });
  
  const uploadToken = await uploadResponse.text();
  
  // Step 2: Create media item
  const createResponse = await fetch(
    'https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        albumId: albumId,
        newMediaItems: [{
          description: 'Uploaded from Field Studio',
          simpleMediaItem: {
            uploadToken: uploadToken,
            fileName: file.name
          }
        }]
      })
    }
  );
  
  const result = await createResponse.json();
  return result.newMediaItemResults[0].mediaItem.id;
}
```

#### Pros & Cons
| Pros | Cons |
|------|------|
| Massive storage | OAuth complexity |
| Picker API is user-friendly | Library API limited to app-created content |
| Basic image transformations | URLs expire after 60 minutes |
| Reliable infrastructure | No IIIF support |
| Good for backup/sync | Rate limits apply |

---

## Unified Cloud Provider Interface

### Proposed TypeScript Interface

```typescript
// ============================================================
// Core Types
// ============================================================

interface CloudCredentials {
  provider: 'immich' | 'nextcloud' | 'google-photos';
  // Provider-specific fields
}

interface CloudAsset {
  id: string;
  provider: string;
  filename: string;
  mimeType: string;
  width?: number;
  height?: number;
  size?: number;
  createdAt?: Date;
  modifiedAt?: Date;
  
  // Provider-specific metadata
  metadata: {
    [key: string]: any;
    // Immich: thumbhash, isFavorite, isArchived
    // Nextcloud: etag, fileid
    // Google Photos: baseUrl, mediaMetadata
  };
}

interface CloudAlbum {
  id: string;
  provider: string;
  title: string;
  description?: string;
  itemCount: number;
  coverPhotoId?: string;
  createdAt?: Date;
}

interface IIIFCapabilities {
  level: 0 | 1 | 2;
  supportsRegion: boolean;
  supportsSize: boolean;
  supportsRotation: boolean;
  supportsQuality: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

// ============================================================
// Provider Interface
// ============================================================

interface CloudProvider {
  readonly name: string;
  readonly capabilities: IIIFCapabilities;
  
  // Authentication
  authenticate(credentials: CloudCredentials): Promise<boolean>;
  refreshAuth(): Promise<boolean>;
  isAuthenticated(): boolean;
  
  // Browse
  getAlbums(): Promise<CloudAlbum[]>;
  getAlbumItems(albumId: string): Promise<CloudAsset[]>;
  searchAssets(query: string): Promise<CloudAsset[]>;
  
  // IIIF Image Resolution
  getImageUrl(assetId: string, options: {
    region?: string;
    size?: string;
    rotation?: number;
    quality?: string;
    format?: string;
  }): Promise<string>;
  
  getImageInfo(assetId: string): Promise<{
    width: number;
    height: number;
    sizes: Array<{width: number; height: number}>;
    tiles?: Array<{width: number; scaleFactors: number[]}>;
  }>;
  
  // Download (for local IIIF serving)
  downloadAsset(assetId: string): Promise<Blob>;
  
  // Upload
  uploadAsset(file: File, options?: {
    albumId?: string;
    filename?: string;
    metadata?: Record<string, any>;
  }): Promise<CloudAsset>;
  
  // Sync
  syncToLocal(assetIds: string[]): Promise<SyncResult>;
  syncToRemote(localAssetIds: string[]): Promise<SyncResult>;
}

interface SyncResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
  pending: string[];
}
```

---

## Integration Modes

### Mode 1: Direct Link (Reference Only)
Store external references, load directly from cloud.

```typescript
// Manifest structure
{
  "id": "https://fieldstudio.example.org/manifests/photo-123",
  "type": "Manifest",
  "items": [{
    "id": "...",
    "type": "Canvas",
    "width": 4032,
    "height": 3024,
    "items": [{
      "type": "AnnotationPage",
      "items": [{
        "type": "Annotation",
        "motivation": "painting",
        "body": {
          "type": "Image",
          "format": "image/jpeg",
          // Direct cloud URL (may expire!)
          "id": "https://immich.example.com/api/assets/abc123/original",
          "service": {
            "type": "ExternalService",
            "id": "immich://abc123",
            "profile": "none"
          }
        }
      }]
    }]
  }]
}
```

**Pros**: No local storage, instant access  
**Cons**: URLs may expire, no IIIF deep zoom, dependent on network

---

### Mode 2: Cached Proxy (Full IIIF)
Download assets locally, serve via Service Worker.

```typescript
class CachedProxyProvider implements CloudProvider {
  async getImageUrl(assetId: string, iiifParams: IIIFParams): Promise<string> {
    const localId = `${this.name}-${assetId}`;
    
    // Check local cache
    let cached = await this.localCache.get(localId);
    if (!cached) {
      // Download from cloud
      const blob = await this.downloadAsset(assetId);
      await this.localCache.store(localId, blob);
      cached = blob;
    }
    
    // Serve via local IIIF server
    return `/iiif/image/${localId}/${iiifParams.region}/${iiifParams.size}/0/default.jpg`;
  }
}
```

**Pros**: Full IIIF capabilities, works offline  
**Cons**: Storage usage, initial download delay

---

### Mode 3: Hybrid (Smart Proxy)
Use cloud thumbnails for preview, download originals on demand.

```typescript
class HybridProvider implements CloudProvider {
  async getImageUrl(assetId: string, iiifParams: IIIFParams): Promise<string> {
    const { region, size } = iiifParams;
    const localId = `${this.name}-${assetId}`;
    
    // Check if full resolution is cached
    const isCached = await this.localCache.has(localId);
    
    if (isCached) {
      // Full IIIF from local cache
      return `/iiif/image/${localId}/${region}/${size}/0/default.jpg`;
    }
    
    // Not cached - use cloud preview for small sizes
    if (this.isPreviewSize(size)) {
      return this.getCloudPreviewUrl(assetId, size);
    }
    
    // Large size requested - trigger download and return placeholder
    this.backgroundDownload(assetId, localId);
    return this.getPlaceholderUrl();
  }
}
```

**Pros**: Balanced storage vs capability  
**Cons**: Complexity, potential delay for full resolution

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create `CloudProvider` interface
- [ ] Implement credential storage (encrypted in IndexedDB)
- [ ] Add provider connection UI
- [ ] Build provider factory/registry

### Phase 2: Immich Support (Weeks 3-4)
- [ ] Immich authentication flow
- [ ] Browse albums and assets
- [ ] Download integration
- [ ] Upload integration
- [ ] Virtual manifest generation

### Phase 3: Nextcloud Support (Weeks 5-6)
- [ ] WebDAV client integration
- [ ] Nextcloud authentication
- [ ] Browse files/folders
- [ ] Preview API integration
- [ ] Upload via WebDAV

### Phase 4: Google Photos Support (Weeks 7-8)
- [ ] OAuth flow implementation
- [ ] Picker API integration
- [ ] Library API for uploads
- [ ] URL transformation handling

### Phase 5: IIIF Enhancement (Weeks 9-10)
- [ ] Enhanced Service Worker for cloud proxy
- [ ] LRU cache for cloud assets
- [ ] Background sync queue
- [ ] Offline support

### Phase 6: Polish (Weeks 11-12)
- [ ] Conflict resolution UI
- [ ] Sync status dashboard
- [ ] Bulk operations
- [ ] Documentation

---

## Security Considerations

### Credential Storage
```typescript
// Encrypt credentials before storing in IndexedDB
class SecureCredentialStore {
  private async encrypt(data: string, password: string): Promise<string> {
    // Use Web Crypto API for encryption
    const encoder = new TextEncoder();
    const key = await this.deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(data)
    );
    
    return JSON.stringify({
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    });
  }
}
```

### CORS Proxy
For services that don't support CORS (direct image access):
- Option 1: Require CORS-enabled server configuration
- Option 2: Use a public CORS proxy (limited)
- Option 3: Document how users can set up their own proxy

### OAuth Security
- Store tokens securely
- Implement PKCE for OAuth flows
- Automatic token refresh
- Clear tokens on logout

---

## Open Questions

1. **Storage Management**: How to handle storage quotas when caching cloud assets?
2. **Conflict Resolution**: How to handle simultaneous edits in cloud and local?
3. **Rate Limiting**: How to respect API rate limits across all providers?
4. **Large Libraries**: How to handle libraries with 100k+ photos?
5. **Versioning**: Should we track cloud asset versions?
6. **Sharing**: How to handle IIIF manifests that reference cloud assets?

---

## Appendix: Provider Comparison

| Feature | Immich | Nextcloud | Google Photos |
|---------|--------|-----------|---------------|
| **Hosting** | Self | Self | Cloud |
| **Auth** | API Key | Basic Auth | OAuth 2.0 |
| **Read API** | REST | WebDAV | Picker + REST |
| **Write API** | REST | WebDAV | REST |
| **Image Sizes** | 3 fixed | Dynamic | Dynamic |
| **Max Image Size** | Original | Original | 16,383px |
| **URL Expiry** | No | No | 60 min |
| **Batch Operations** | Yes | Yes | Limited |
| **Deduplication** | SHA1 | No | Yes |
| **AI Features** | Facial rec | Apps | Built-in |
| **CORS** | Configurable | Configurable | Yes |

---

*Document Version: 1.0*  
*Last Updated: 2026-01-28*
