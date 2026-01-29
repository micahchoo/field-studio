# Cloud Integration Implementation Guide

This document provides detailed implementation guidance for integrating cloud gallery services into Field Studio.

## Table of Contents
1. [Core Architecture](#core-architecture)
2. [Provider Implementation](#provider-implementation)
3. [Service Worker Enhancement](#service-worker-enhancement)
4. [UI Components](#ui-components)
5. [Security](#security)

---

## Core Architecture

### Directory Structure
```
services/
├── cloud/
│   ├── index.ts              # Public API exports
│   ├── types.ts              # Shared types
│   ├── registry.ts           # Provider registry
│   ├── syncManager.ts        # Bidirectional sync
│   ├── credentialStore.ts    # Secure credential storage
│   ├── cacheManager.ts       # Local caching for cloud assets
│   └── providers/
│       ├── baseProvider.ts   # Abstract base class
│       ├── immichProvider.ts # Immich implementation
│       ├── nextcloudProvider.ts # Nextcloud implementation
│       └── googlePhotosProvider.ts # Google Photos implementation
└── ...

components/cloud/
├── CloudConnectDialog.tsx    # Provider connection UI
├── CloudBrowser.tsx          # Browse cloud assets
├── CloudSyncStatus.tsx       # Sync status indicator
└── CloudSettings.tsx         # Provider settings
```

### Provider Base Class

```typescript
// services/cloud/providers/baseProvider.ts

import { CloudCredentials, CloudAsset, CloudAlbum, IIIFCapabilities } from '../types';

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type DownloadProgressCallback = (progress: DownloadProgress) => void;

export abstract class BaseCloudProvider {
  protected credentials: CloudCredentials | null = null;
  protected isConnected: boolean = false;
  
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly icon: string;
  abstract readonly capabilities: IIIFCapabilities;
  
  // Authentication
  abstract authenticate(credentials: CloudCredentials): Promise<boolean>;
  abstract refreshAuth(): Promise<boolean>;
  abstract logout(): Promise<void>;
  
  isAuthenticated(): boolean {
    return this.isConnected && this.credentials !== null;
  }
  
  // Browse operations
  abstract getAlbums(): Promise<CloudAlbum[]>;
  abstract getAlbumItems(albumId: string): Promise<CloudAsset[]>;
  abstract getAsset(assetId: string): Promise<CloudAsset>;
  abstract searchAssets(query: string): Promise<CloudAsset[]>;
  
  // Image resolution - to be implemented by each provider
  abstract resolveImageUrl(
    assetId: string, 
    options: ImageResolveOptions
  ): Promise<string>;
  
  // Download for local caching
  abstract downloadAsset(
    assetId: string, 
    onProgress?: DownloadProgressCallback
  ): Promise<Blob>;
  
  // Upload
  abstract uploadAsset(
    file: File, 
    options?: UploadOptions
  ): Promise<CloudAsset>;
  
  // Check if asset is available offline
  abstract isAvailableOffline(assetId: string): Promise<boolean>;
  
  // Convert cloud asset to IIIF Canvas
  async toCanvas(asset: CloudAsset): Promise<Partial<IIIFCanvas>> {
    return {
      id: `canvas-${this.name}-${asset.id}`,
      type: 'Canvas',
      label: { none: [asset.filename] },
      width: asset.width || 0,
      height: asset.height || 0,
      items: [{
        id: `annotation-page-${asset.id}`,
        type: 'AnnotationPage',
        items: [{
          id: `annotation-${asset.id}`,
          type: 'Annotation',
          motivation: 'painting',
          body: {
            type: 'Image',
            format: asset.mimeType,
            id: await this.resolveImageUrl(asset.id, { size: 'full' }),
            width: asset.width,
            height: asset.height,
            service: [{
              type: 'ImageService3',
              id: `/iiif/proxy/${this.name}/${asset.id}`,
              profile: this.capabilities.level === 2 ? 'level2' : 'level0'
            }]
          },
          target: `canvas-${this.name}-${asset.id}`
        }]
      }]
    };
  }
}

export interface ImageResolveOptions {
  preferredSize?: 'thumbnail' | 'small' | 'medium' | 'full' | 'max';
  width?: number;
  height?: number;
  region?: string;
  quality?: 'color' | 'gray' | 'bitonal' | 'default';
  format?: 'jpg' | 'png' | 'webp';
}

export interface UploadOptions {
  albumId?: string;
  filename?: string;
  description?: string;
  metadata?: Record<string, any>;
}
```

---

## Provider Implementation

### Immich Provider

```typescript
// services/cloud/providers/immichProvider.ts

import { BaseCloudProvider, DownloadProgressCallback, ImageResolveOptions, UploadOptions } from './baseProvider';
import { CloudCredentials, CloudAsset, CloudAlbum, IIIFCapabilities } from '../types';

interface ImmichCredentials extends CloudCredentials {
  provider: 'immich';
  instanceUrl: string;
  apiKey: string;
}

interface ImmichAsset {
  id: string;
  originalFileName: string;
  mimeType: string;
  exifInfo?: {
    imageWidth?: number;
    imageHeight?: number;
    dateTimeOriginal?: string;
  };
  thumbhash?: string;
  isFavorite: boolean;
  isArchived: boolean;
}

interface ImmichAlbum {
  id: string;
  albumName: string;
  description?: string;
  assetCount: number;
  albumThumbnailAssetId?: string;
  createdAt: string;
}

export class ImmichProvider extends BaseCloudProvider {
  readonly name = 'immich';
  readonly displayName = 'Immich';
  readonly icon = 'photo_library';
  readonly capabilities: IIIFCapabilities = {
    level: 0,
    supportsRegion: false,
    supportsSize: false,
    supportsRotation: false,
    supportsQuality: false
  };
  
  private get creds(): ImmichCredentials {
    return this.credentials as ImmichCredentials;
  }
  
  private get baseUrl(): string {
    return this.creds.instanceUrl.replace(/\/$/, '');
  }
  
  private get headers(): HeadersInit {
    return {
      'x-api-key': this.creds.apiKey,
      'Accept': 'application/json'
    };
  }
  
  async authenticate(credentials: CloudCredentials): Promise<boolean> {
    const creds = credentials as ImmichCredentials;
    
    try {
      // Validate by fetching user info
      const response = await fetch(`${creds.instanceUrl}/api/users/me`, {
        headers: { 'x-api-key': creds.apiKey }
      });
      
      if (response.ok) {
        this.credentials = creds;
        this.isConnected = true;
        return true;
      }
      return false;
    } catch (e) {
      console.error('[ImmichProvider] Authentication failed:', e);
      return false;
    }
  }
  
  async refreshAuth(): Promise<boolean> {
    // Immich uses API keys that don't expire
    return this.isConnected;
  }
  
  async logout(): Promise<void> {
    this.credentials = null;
    this.isConnected = false;
  }
  
  // ============================================================================
  // Browse Operations
  // ============================================================================
  
  async getAlbums(): Promise<CloudAlbum[]> {
    const response = await fetch(`${this.baseUrl}/api/albums`, {
      headers: this.headers
    });
    
    if (!response.ok) throw new Error('Failed to fetch albums');
    
    const albums: ImmichAlbum[] = await response.json();
    
    return albums.map(album => ({
      id: album.id,
      provider: this.name,
      title: album.albumName,
      description: album.description,
      itemCount: album.assetCount,
      coverPhotoId: album.albumThumbnailAssetId,
      createdAt: new Date(album.createdAt)
    }));
  }
  
  async getAlbumItems(albumId: string): Promise<CloudAsset[]> {
    const response = await fetch(`${this.baseUrl}/api/albums/${albumId}`, {
      headers: this.headers
    });
    
    if (!response.ok) throw new Error('Failed to fetch album');
    
    const album = await response.json();
    const assets: ImmichAsset[] = album.assets || [];
    
    return assets.map(asset => this.mapAsset(asset));
  }
  
  async getAsset(assetId: string): Promise<CloudAsset> {
    const response = await fetch(`${this.baseUrl}/api/assets/${assetId}`, {
      headers: this.headers
    });
    
    if (!response.ok) throw new Error('Failed to fetch asset');
    
    const asset: ImmichAsset = await response.json();
    return this.mapAsset(asset);
  }
  
  async searchAssets(query: string): Promise<CloudAsset[]> {
    // Use metadata search
    const response = await fetch(`${this.baseUrl}/api/search/metadata`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        page: 1,
        size: 250,
        description: query || undefined
      })
    });
    
    if (!response.ok) throw new Error('Search failed');
    
    const result = await response.json();
    const assets: ImmichAsset[] = result.assets?.items || [];
    
    return assets.map(asset => this.mapAsset(asset));
  }
  
  private mapAsset(asset: ImmichAsset): CloudAsset {
    return {
      id: asset.id,
      provider: this.name,
      filename: asset.originalFileName,
      mimeType: asset.mimeType,
      width: asset.exifInfo?.imageWidth,
      height: asset.exifInfo?.imageHeight,
      metadata: {
        thumbhash: asset.thumbhash,
        isFavorite: asset.isFavorite,
        isArchived: asset.isArchived,
        createdAt: asset.exifInfo?.dateTimeOriginal
      }
    };
  }
  
  // ============================================================================
  // Image Resolution
  // ============================================================================
  
  async resolveImageUrl(assetId: string, options: ImageResolveOptions): Promise<string> {
    const size = options.preferredSize || 'full';
    
    // Map preferred sizes to Immich's size parameter
    const sizeMap: Record<string, string> = {
      'thumbnail': 'thumbnail',
      'small': 'preview',
      'medium': 'preview',
      'full': 'fullsize',
      'max': 'fullsize'
    };
    
    const immichSize = sizeMap[size] || 'fullsize';
    
    return `${this.baseUrl}/api/assets/${assetId}/thumbnail?size=${immichSize}`;
  }
  
  // ============================================================================
  // Download
  // ============================================================================
  
  async downloadAsset(
    assetId: string, 
    onProgress?: DownloadProgressCallback
  ): Promise<Blob> {
    // For progress tracking, we'd need to use XMLHttpRequest
    // Simplified version using fetch:
    const response = await fetch(`${this.baseUrl}/api/assets/${assetId}/original`, {
      headers: this.headers
    });
    
    if (!response.ok) throw new Error('Download failed');
    
    return await response.blob();
  }
  
  // ============================================================================
  // Upload
  // ============================================================================
  
  async uploadAsset(file: File, options?: UploadOptions): Promise<CloudAsset> {
    const formData = new FormData();
    formData.append('assetData', file);
    formData.append('deviceAssetId', `${file.name}-${file.size}-${file.lastModified}`);
    formData.append('deviceId', 'field-studio');
    formData.append('fileCreatedAt', new Date().toISOString());
    formData.append('fileModifiedAt', new Date().toISOString());
    
    if (options?.description) {
      formData.append('description', options.description);
    }
    
    // Calculate checksum if needed for deduplication
    // const checksum = await this.calculateSHA1(file);
    
    const response = await fetch(`${this.baseUrl}/api/assets`, {
      method: 'POST',
      headers: {
        'x-api-key': this.creds.apiKey,
        'Accept': 'application/json'
      },
      body: formData
    });
    
    if (!response.ok) throw new Error('Upload failed');
    
    const result = await response.json();
    
    // If album specified, add to album
    if (options?.albumId) {
      await this.addToAlbum(result.id, options.albumId);
    }
    
    return this.getAsset(result.id);
  }
  
  private async addToAlbum(assetId: string, albumId: string): Promise<void> {
    // Get current album to preserve existing assets
    const albumResponse = await fetch(`${this.baseUrl}/api/albums/${albumId}`, {
      headers: this.headers
    });
    
    if (!albumResponse.ok) return;
    
    const album = await albumResponse.json();
    const existingIds = album.assets?.map((a: ImmichAsset) => a.id) || [];
    
    await fetch(`${this.baseUrl}/api/albums/${albumId}`, {
      method: 'PUT',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ids: [...existingIds, assetId]
      })
    });
  }
  
  // ============================================================================
  // Offline Support
  // ============================================================================
  
  async isAvailableOffline(assetId: string): Promise<boolean> {
    // Check local cache
    const cacheKey = `${this.name}-${assetId}`;
    // Delegate to cache manager
    return false; // Implement with cache manager
  }
  
  private async calculateSHA1(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(String.fromCharCode(...hashArray));
  }
}
```

### Nextcloud Provider

```typescript
// services/cloud/providers/nextcloudProvider.ts

import { BaseCloudProvider, DownloadProgressCallback, ImageResolveOptions, UploadOptions } from './baseProvider';
import { CloudCredentials, CloudAsset, CloudAlbum, IIIFCapabilities } from '../types';

interface NextcloudCredentials extends CloudCredentials {
  provider: 'nextcloud';
  serverUrl: string;
  username: string;
  appPassword: string;
}

interface NextcloudFile {
  filename: string;
  basename: string;
  lastmod: string;
  size: number;
  type: 'file' | 'directory';
  mime?: string;
  props?: {
    'oc:fileid'?: string;
    'oc:size'?: number;
    'oc:permissions'?: string;
  };
}

export class NextcloudProvider extends BaseCloudProvider {
  readonly name = 'nextcloud';
  readonly displayName = 'Nextcloud';
  readonly icon = 'cloud';
  readonly capabilities: IIIFCapabilities = {
    level: 0,
    supportsRegion: false,
    supportsSize: true,  // Via preview API
    supportsRotation: false,
    supportsQuality: false
  };
  
  private davClient: WebDAVClient | null = null;
  
  private get creds(): NextcloudCredentials {
    return this.credentials as NextcloudCredentials;
  }
  
  private get baseUrl(): string {
    return this.creds.serverUrl.replace(/\/$/, '');
  }
  
  private get authHeader(): string {
    return `Basic ${btoa(`${this.creds.username}:${this.creds.appPassword}`)}`;
  }
  
  async authenticate(credentials: CloudCredentials): Promise<boolean> {
    const creds = credentials as NextcloudCredentials;
    
    try {
      // Try to access the user's files endpoint
      const response = await fetch(
        `${creds.serverUrl}/remote.php/dav/files/${creds.username}/`,
        {
          method: 'PROPFIND',
          headers: {
            'Authorization': `Basic ${btoa(`${creds.username}:${creds.appPassword}`)}`,
            'Content-Type': 'text/xml',
            'Depth': '0'
          },
          body: `<?xml version="1.0"?>
            <d:propfind xmlns:d="DAV:">
              <d:prop>
                <d:resourcetype/>
              </d:prop>
            </d:propfind>`
        }
      );
      
      if (response.ok || response.status === 207) {
        this.credentials = creds;
        this.isConnected = true;
        
        // Initialize WebDAV client
        const { createClient } = await import('webdav');
        this.davClient = createClient(
          `${this.baseUrl}/remote.php/dav`,
          {
            username: creds.username,
            password: creds.appPassword
          }
        );
        
        return true;
      }
      return false;
    } catch (e) {
      console.error('[NextcloudProvider] Authentication failed:', e);
      return false;
    }
  }
  
  async refreshAuth(): Promise<boolean> {
    // App passwords don't expire
    return this.isConnected;
  }
  
  async logout(): Promise<void> {
    this.credentials = null;
    this.isConnected = false;
    this.davClient = null;
  }
  
  // ============================================================================
  // Browse Operations
  // ============================================================================
  
  async getAlbums(): Promise<CloudAlbum[]> {
    // In Nextcloud, albums are folders
    const response = await this.davClient?.getDirectoryContents(
      `/files/${this.creds.username}`,
      { 
        details: true,
        glob: '*/'
      }
    ) as NextcloudFile[];
    
    if (!response) return [];
    
    // Filter to only directories that contain images
    const albums: CloudAlbum[] = [];
    
    for (const item of response) {
      if (item.type === 'directory') {
        // Count image files
        const files = await this.listImagesInPath(item.filename);
        
        if (files.length > 0) {
          albums.push({
            id: item.filename,
            provider: this.name,
            title: item.basename,
            itemCount: files.length,
            createdAt: new Date(item.lastmod)
          });
        }
      }
    }
    
    return albums;
  }
  
  private async listImagesInPath(path: string): Promise<NextcloudFile[]> {
    const response = await this.davClient?.getDirectoryContents(
      `/files/${this.creds.username}/${path}`,
      { details: true }
    ) as NextcloudFile[];
    
    if (!response) return [];
    
    return response.filter(item => 
      item.type === 'file' && 
      item.mime?.startsWith('image/')
    );
  }
  
  async getAlbumItems(albumId: string): Promise<CloudAsset[]> {
    // albumId is the folder path
    const files = await this.listImagesInPath(albumId);
    
    return Promise.all(files.map(file => this.mapFileToAsset(file)));
  }
  
  async getAsset(assetId: string): Promise<CloudAsset> {
    // assetId is the file path or fileId
    if (assetId.startsWith('/')) {
      // It's a path
      const file = await this.davClient?.stat(
        `/files/${this.creds.username}${assetId}`,
        { details: true }
      ) as NextcloudFile;
      
      return this.mapFileToAsset(file);
    } else {
      // It's a fileId - need to search
      // This is less efficient
      throw new Error('FileId lookup not implemented');
    }
  }
  
  async searchAssets(query: string): Promise<CloudAsset[]> {
    // Nextcloud doesn't have a great search API for WebDAV
    // We'd need to use the OCS Search API or index locally
    throw new Error('Search not implemented for Nextcloud');
  }
  
  private async mapFileToAsset(file: NextcloudFile): Promise<CloudAsset> {
    const fileId = file.props?.['oc:fileid'] || file.filename;
    
    // Try to get dimensions from preview API
    let width: number | undefined;
    let height: number | undefined;
    
    try {
      const previewInfo = await this.getPreviewInfo(fileId);
      width = previewInfo.width;
      height = previewInfo.height;
    } catch (e) {
      // Ignore
    }
    
    return {
      id: fileId,
      provider: this.name,
      filename: file.basename,
      mimeType: file.mime || 'image/jpeg',
      size: file.size,
      width,
      height,
      modifiedAt: new Date(file.lastmod),
      metadata: {
        path: file.filename,
        etag: file.props?.['oc:permissions'],
        fileid: fileId
      }
    };
  }
  
  private async getPreviewInfo(fileId: string): Promise<{ width?: number; height?: number }> {
    // Try to get image dimensions by requesting a small preview
    const url = `${this.baseUrl}/index.php/core/preview?fileId=${fileId}&x=32&y=32&a=1`;
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'Authorization': this.authHeader }
    });
    
    // Parse from Content-Type or other headers if available
    // Nextcloud doesn't provide dimensions in headers, so we'd need to load the image
    return {};
  }
  
  // ============================================================================
  // Image Resolution
  // ============================================================================
  
  async resolveImageUrl(assetId: string, options: ImageResolveOptions): Promise<string> {
    const { preferredSize, width, height } = options;
    
    // Use Nextcloud's preview API with fileId
    let x = width || 2048;
    let y = height || 2048;
    
    if (preferredSize) {
      const sizeMap: Record<string, number> = {
        'thumbnail': 256,
        'small': 512,
        'medium': 1024,
        'full': 2048,
        'max': 4096
      };
      x = y = sizeMap[preferredSize] || 2048;
    }
    
    return `${this.baseUrl}/index.php/core/preview?fileId=${assetId}&x=${x}&y=${y}&a=1`;
  }
  
  // ============================================================================
  // Download
  // ============================================================================
  
  async downloadAsset(
    assetId: string, 
    onProgress?: DownloadProgressCallback
  ): Promise<Blob> {
    // assetId could be fileId or path
    // If it's a path, download directly
    if (assetId.startsWith('/')) {
      const response = await this.davClient?.getFileContents(
        `/files/${this.creds.username}${assetId}`
      );
      return response as Blob;
    }
    
    // It's a fileId - need to resolve path first
    // For now, throw error
    throw new Error('FileId download not implemented');
  }
  
  // ============================================================================
  // Upload
  // ============================================================================
  
  async uploadAsset(file: File, options?: UploadOptions): Promise<CloudAsset> {
    // Determine path
    const folder = options?.albumId || '/';
    const filename = options?.filename || file.name;
    const path = `${folder}/${filename}`;
    
    // Upload via WebDAV
    await this.davClient?.putFileContents(
      `/files/${this.creds.username}${path}`,
      file,
      { overwrite: true }
    );
    
    // Get the uploaded file info
    return this.getAsset(path);
  }
  
  async isAvailableOffline(assetId: string): Promise<boolean> {
    return false; // Implement with cache manager
  }
}
```

---

## Service Worker Enhancement

To support cloud images through the IIIF API, we need to enhance the Service Worker:

```javascript
// public/sw.js (enhanced section)

// Add new route handler for cloud proxy
const CLOUD_PROXY_PREFIX = '/iiif/proxy/';

async function handleCloudProxyRequest(request) {
  const url = new URL(request.url);
  const pathMatch = url.pathname.match(/\/iiif\/proxy\/([^\/]+)\/(.+)/);
  
  if (!pathMatch) {
    return new Response('Invalid proxy URL', { status: 400 });
  }
  
  const [, provider, assetPath] = pathMatch;
  const infoJson = url.pathname.endsWith('/info.json');
  
  try {
    // Check if we have this asset cached locally
    const localId = `cloud-${provider}-${assetPath}`;
    const cachedBlob = await getFromIDB(FILES_STORE, localId);
    
    if (cachedBlob) {
      // Serve from cache using existing IIIF handler
      return handleLocalImageRequest(localId, url, request);
    }
    
    if (infoJson) {
      // Return info.json with proxy capability
      // Fetch minimal info from cloud provider
      const assetInfo = await fetchCloudAssetInfo(provider, assetPath);
      
      const info = {
        "@context": "http://iiif.io/api/image/3/context.json",
        "id": url.origin + url.pathname.replace('/info.json', ''),
        "type": "ImageService3",
        "protocol": "http://iiif.io/api/image",
        "profile": "level0",
        "width": assetInfo.width,
        "height": assetInfo.height,
        "sizes": [
          { "width": 150, "height": Math.floor(150 * assetInfo.height / assetInfo.width) },
          { "width": 600, "height": Math.floor(600 * assetInfo.height / assetInfo.width) }
        ],
        "extraFeatures": ["cors"],
        "preferredFormats": ["jpg"]
      };
      
      return new Response(JSON.stringify(info), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    // Parse IIIF parameters from URL
    const params = parseIIIFParams(url.pathname);
    
    // Check if we can serve directly from cloud (for simple sizes)
    if (canServeFromCloud(provider, params)) {
      const cloudUrl = await buildCloudImageUrl(provider, assetPath, params);
      
      // Fetch from cloud with CORS
      const response = await fetch(cloudUrl, {
        headers: { 'Accept': 'image/*' }
      });
      
      if (response.ok) {
        return new Response(response.body, {
          headers: {
            'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
    }
    
    // Need to download and process locally
    // Trigger background download
    downloadAndCacheCloudAsset(provider, assetPath);
    
    // Return placeholder
    return new Response(getPlaceholderSVG(), {
      headers: { 'Content-Type': 'image/svg+xml' }
    });
    
  } catch (err) {
    console.error('[SW] Cloud proxy error:', err);
    return new Response('Error', { status: 500 });
  }
}

// Add to fetch event listener
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith(CLOUD_PROXY_PREFIX)) {
    event.respondWith(handleCloudProxyRequest(event.request));
    return;
  }
  
  // Existing IIIF image handler
  const isIIIFImage = /\/(iiif\/)?image\/[^\/]+\/(info\.json|.+?\/default\.(jpg|jpeg|png|webp|gif))$/.test(url.pathname);
  
  if (isIIIFImage) {
    event.respondWith(handleImageRequest(event.request));
  }
});

// Helper functions
async function fetchCloudAssetInfo(provider, assetPath) {
  // This would need to be provided by the main app
  // For now, return default values
  return { width: 2048, height: 1536 };
}

function parseIIIFParams(pathname) {
  // Parse IIIF Image API parameters from URL
  // /iiif/proxy/{provider}/{assetId}/{region}/{size}/{rotation}/{quality}.{format}
  const parts = pathname.split('/');
  return {
    region: parts[5] || 'full',
    size: parts[6] || 'max',
    rotation: parts[7] || '0',
    quality: parts[8]?.split('.')[0] || 'default',
    format: parts[8]?.split('.')[1] || 'jpg'
  };
}

function canServeFromCloud(provider, params) {
  // Check if the provider supports these IIIF params
  // Most cloud providers only support basic resizing
  return params.region === 'full' && 
         params.rotation === '0' &&
         (params.quality === 'default' || params.quality === 'color');
}

async function buildCloudImageUrl(provider, assetPath, params) {
  // This would need to communicate with the main app
  // For now, return a placeholder
  return '';
}

async function downloadAndCacheCloudAsset(provider, assetPath) {
  // Notify main app to download this asset
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      action: 'download-cloud-asset',
      provider,
      assetPath
    });
  });
}

function getPlaceholderSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
    <rect fill="#f0f0f0" width="400" height="300"/>
    <text x="200" y="150" text-anchor="middle" fill="#999">Loading...</text>
  </svg>`;
}
```

---

## UI Components

### Cloud Connect Dialog

```typescript
// components/cloud/CloudConnectDialog.tsx

import React, { useState } from 'react';
import { cloudProviderRegistry } from '../../services/cloud/registry';
import { BaseCloudProvider } from '../../services/cloud/providers/baseProvider';

interface CloudConnectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (provider: BaseCloudProvider) => void;
}

export const CloudConnectDialog: React.FC<CloudConnectDialogProps> = ({
  isOpen,
  onClose,
  onConnect
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<Record<string, string>>({});
  
  const providers = cloudProviderRegistry.getAllProviders();
  
  const handleConnect = async () => {
    if (!selectedProvider) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const ProviderClass = cloudProviderRegistry.getProvider(selectedProvider);
      const provider = new ProviderClass();
      
      const success = await provider.authenticate(formData as any);
      
      if (success) {
        onConnect(provider);
        onClose();
      } else {
        setError('Authentication failed. Please check your credentials.');
      }
    } catch (e: any) {
      setError(e.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };
  
  const renderProviderForm = () => {
    switch (selectedProvider) {
      case 'immich':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Instance URL</label>
              <input
                type="url"
                placeholder="https://photos.example.com"
                value={formData.instanceUrl || ''}
                onChange={(e) => setFormData({ ...formData, instanceUrl: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">API Key</label>
              <input
                type="password"
                placeholder="Your Immich API key"
                value={formData.apiKey || ''}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Generate in Immich: User Settings → API Keys
              </p>
            </div>
          </div>
        );
        
      case 'nextcloud':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Server URL</label>
              <input
                type="url"
                placeholder="https://cloud.example.com"
                value={formData.serverUrl || ''}
                onChange={(e) => setFormData({ ...formData, serverUrl: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">App Password</label>
              <input
                type="password"
                value={formData.appPassword || ''}
                onChange={(e) => setFormData({ ...formData, appPassword: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Generate in Nextcloud: Settings → Security → App Passwords
              </p>
            </div>
          </div>
        );
        
      case 'google-photos':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              You'll be redirected to Google to authorize access to your photos.
            </p>
            <button
              onClick={() => {
                // Initiate OAuth flow
                const oauthUrl = buildGoogleOAuthUrl();
                window.open(oauthUrl, 'google-oauth', 'width=500,height=600');
              }}
              className="w-full bg-blue-500 text-white py-2 rounded"
            >
              Connect with Google
            </button>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Connect Cloud Gallery</h2>
        
        {!selectedProvider ? (
          <div className="space-y-2">
            {providers.map((provider) => (
              <button
                key={provider.name}
                onClick={() => setSelectedProvider(provider.name)}
                className="w-full flex items-center gap-3 p-4 border rounded hover:bg-gray-50"
              >
                <span className="text-2xl">{provider.icon}</span>
                <div className="text-left">
                  <div className="font-medium">{provider.displayName}</div>
                  <div className="text-xs text-gray-500">
                    {provider.capabilities.level === 0 ? 'Basic images' : 'Full IIIF'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <>
            <button
              onClick={() => setSelectedProvider(null)}
              className="text-sm text-blue-500 mb-4"
            >
              ← Back
            </button>
            
            {renderProviderForm()}
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded text-sm">
                {error}
              </div>
            )}
            
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex-1 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

function buildGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: 'YOUR_CLIENT_ID',
    redirect_uri: `${window.location.origin}/oauth/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
    access_type: 'offline',
    prompt: 'consent'
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
```

---

## Security Implementation

### Encrypted Credential Storage

```typescript
// services/cloud/credentialStore.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CloudCredentials } from './types';

const DB_NAME = 'biiif-cloud-credentials';
const STORE_NAME = 'credentials';

interface CredentialsDB extends DBSchema {
  credentials: {
    key: string;
    value: EncryptedCredentials;
  };
}

interface EncryptedCredentials {
  iv: number[];
  data: number[];
  provider: string;
  createdAt: number;
}

export class SecureCredentialStore {
  private db: IDBPDatabase<CredentialsDB> | null = null;
  private masterKey: CryptoKey | null = null;
  
  async initialize(password: string): Promise<void> {
    // Derive key from password
    this.masterKey = await this.deriveKey(password);
    
    // Open database
    this.db = await openDB<CredentialsDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME);
      }
    });
  }
  
  private async deriveKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    // Use a fixed salt (in production, store this separately)
    const salt = encoder.encode('biiif-cloud-store-salt');
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  
  async store(provider: string, credentials: CloudCredentials): Promise<void> {
    if (!this.db || !this.masterKey) {
      throw new Error('Credential store not initialized');
    }
    
    const encrypted = await this.encrypt(credentials);
    
    await this.db.put(STORE_NAME, {
      ...encrypted,
      provider,
      createdAt: Date.now()
    }, provider);
  }
  
  async retrieve(provider: string): Promise<CloudCredentials | null> {
    if (!this.db || !this.masterKey) {
      throw new Error('Credential store not initialized');
    }
    
    const encrypted = await this.db.get(STORE_NAME, provider);
    if (!encrypted) return null;
    
    return this.decrypt(encrypted);
  }
  
  async remove(provider: string): Promise<void> {
    if (!this.db) return;
    await this.db.delete(STORE_NAME, provider);
  }
  
  private async encrypt(data: CloudCredentials): Promise<Omit<EncryptedCredentials, 'provider' | 'createdAt'>> {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.masterKey!,
      encoder.encode(JSON.stringify(data))
    );
    
    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted))
    };
  }
  
  private async decrypt(encrypted: EncryptedCredentials): Promise<CloudCredentials> {
    const decoder = new TextDecoder();
    
    const decrypted = await crypto.subtle.decrypt(
      { 
        name: 'AES-GCM', 
        iv: new Uint8Array(encrypted.iv) 
      },
      this.masterKey!,
      new Uint8Array(encrypted.data)
    );
    
    return JSON.parse(decoder.decode(decrypted));
  }
}

export const credentialStore = new SecureCredentialStore();
```

---

## Next Steps

1. **Implement Provider Registry**: Create the factory pattern for provider registration
2. **Add WebDAV Dependency**: Include webdav npm package for Nextcloud support
3. **Enhance Service Worker**: Add cloud proxy routes
4. **Build UI Components**: Connect dialog, browser, sync status
5. **Test Authentication**: Verify all three provider auth flows
6. **Implement Caching**: Local cache manager for cloud assets

---

*Implementation Guide Version: 1.0*
