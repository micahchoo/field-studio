# Handling Large Files in Browser-Based Applications: Research Report

## Table of Contents
1. [Chunking Strategies](#1-chunking-strategies)
2. [Compression Techniques](#2-compression-techniques)
3. [Streaming Approaches](#3-streaming-approaches)
4. [Lazy Loading & Virtual Scrolling](#4-lazy-loading--virtual-scrolling)
5. [Storage APIs: Cache API vs IndexedDB vs OPFS](#5-storage-apis-comparison)
6. [Memory Management](#6-memory-management)
7. [Pagination & Cursor-Based Access](#7-pagination--cursor-based-access)

---

## 1. Chunking Strategies

### Overview
Chunking is the process of splitting large files into smaller, manageable pieces that can be processed, uploaded, or stored independently. This is essential for:
- Avoiding memory overflow
- Enabling resumable uploads
- Parallel processing
- Bypassing browser/server limits

### File Slicing with File API

```javascript
/**
 * Slice a file into chunks
 * @param {File} file - The file to slice
 * @param {number} chunkSize - Size of each chunk in bytes
 * @returns {Blob[]} Array of file chunks
 */
function sliceFile(file, chunkSize = 1024 * 1024) { // Default 1MB chunks
  const chunks = [];
  let offset = 0;
  
  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    chunks.push(chunk);
    offset += chunkSize;
  }
  
  return chunks;
}

// Usage
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  const chunks = sliceFile(file, 5 * 1024 * 1024); // 5MB chunks
  console.log(`Split ${file.name} into ${chunks.length} chunks`);
});
```

### Chunked Upload with Progress

```javascript
class ChunkedUploader {
  constructor(file, options = {}) {
    this.file = file;
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB default
    this.uploadUrl = options.uploadUrl || '/upload';
    this.concurrent = options.concurrent || 3;
    this.chunks = [];
    this.uploadedChunks = new Set();
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
  }

  createChunks() {
    for (let i = 0; i < this.totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      this.chunks.push({
        index: i,
        blob: this.file.slice(start, end),
        start,
        end
      });
    }
  }

  async uploadChunk(chunk) {
    const formData = new FormData();
    formData.append('chunk', chunk.blob);
    formData.append('index', chunk.index);
    formData.append('total', this.totalChunks);
    formData.append('filename', this.file.name);
    formData.append('fileHash', await this.calculateHash(chunk.blob));

    const response = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Chunk ${chunk.index} upload failed`);
    }

    this.uploadedChunks.add(chunk.index);
    return response.json();
  }

  async calculateHash(blob) {
    const buffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async upload(onProgress) {
    this.createChunks();
    const pendingChunks = [...this.chunks];
    const uploadPromises = [];

    // Process chunks concurrently
    const processNext = async () => {
      while (pendingChunks.length > 0) {
        const chunk = pendingChunks.shift();
        await this.uploadChunk(chunk);
        
        if (onProgress) {
          onProgress({
            loaded: this.uploadedChunks.size,
            total: this.totalChunks,
            percentage: (this.uploadedChunks.size / this.totalChunks) * 100
          });
        }
      }
    };

    // Start concurrent uploads
    for (let i = 0; i < this.concurrent; i++) {
      uploadPromises.push(processNext());
    }

    await Promise.all(uploadPromises);
    
    // Notify server that all chunks are uploaded
    return this.finalizeUpload();
  }

  async finalizeUpload() {
    const response = await fetch(`${this.uploadUrl}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: this.file.name,
        totalChunks: this.totalChunks
      })
    });
    return response.json();
  }
}

// Usage
const uploader = new ChunkedUploader(largeFile, {
  chunkSize: 5 * 1024 * 1024, // 5MB
  concurrent: 3,
  uploadUrl: '/api/upload'
});

uploader.upload((progress) => {
  console.log(`Upload progress: ${progress.percentage.toFixed(2)}%`);
});
```

### Parallel Chunk Downloads

```javascript
/**
 * Download large files in parallel chunks
 * @param {string} url - File URL
 * @param {Object} options - Download options
 */
async function downloadInChunks(url, options = {}) {
  const chunkSize = options.chunkSize || 1024 * 1024; // 1MB
  const maxParallel = options.maxParallel || 6;
  
  // Get file size first
  const headResponse = await fetch(url, { method: 'HEAD' });
  const fileSize = parseInt(headResponse.headers.get('content-length'));
  
  const chunks = [];
  const totalChunks = Math.ceil(fileSize / chunkSize);
  
  // Create chunk ranges
  const ranges = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize - 1, fileSize - 1);
    ranges.push({ start, end, index: i });
  }

  // Download chunks in parallel
  const downloadChunk = async (range) => {
    const response = await fetch(url, {
      headers: { 'Range': `bytes=${range.start}-${range.end}` }
    });
    const blob = await response.blob();
    return { index: range.index, blob };
  };

  // Process with limited concurrency
  const results = new Array(totalChunks);
  const queue = [...ranges];
  
  const workers = Array(maxParallel).fill().map(async () => {
    while (queue.length > 0) {
      const range = queue.shift();
      const result = await downloadChunk(range);
      results[result.index] = result.blob;
      
      if (options.onProgress) {
        options.onProgress({
          loaded: results.filter(Boolean).length,
          total: totalChunks
        });
      }
    }
  });

  await Promise.all(workers);
  
  // Combine chunks
  return new Blob(results);
}
```

---

## 2. Compression Techniques

### Overview
Compression reduces data size before storage or transmission. For browser-based apps, JavaScript compression libraries like pako and fflate are essential.

### Using pako for Gzip Compression

```javascript
import pako from 'pako';

/**
 * Compress data using gzip
 * @param {string|Uint8Array} data - Data to compress
 * @returns {Uint8Array} Compressed data
 */
function compressData(data) {
  const input = typeof data === 'string' 
    ? new TextEncoder().encode(data) 
    : data;
  return pako.gzip(input);
}

/**
 * Decompress gzip data
 * @param {Uint8Array} compressed - Compressed data
 * @returns {string} Decompressed string
 */
function decompressData(compressed) {
  const decompressed = pako.ungzip(compressed);
  return new TextDecoder().decode(decompressed);
}

// Usage with streaming
async function compressAndUpload(file) {
  const reader = file.stream().getReader();
  const chunks = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Compress each chunk
    const compressed = pako.deflate(value);
    chunks.push(compressed);
  }
  
  // Combine and upload
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalSize);
  let offset = 0;
  
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  return combined;
}
```

### Using fflate (Faster Alternative)

```javascript
import { gzip, gunzip, zip, unzip } from 'fflate';

// Compress with fflate (async)
async function compressWithFflate(data) {
  const input = new TextEncoder().encode(JSON.stringify(data));
  
  return new Promise((resolve, reject) => {
    gzip(input, { level: 6 }, (err, compressed) => {
      if (err) reject(err);
      else resolve(compressed);
    });
  });
}

// Decompress with fflate
async function decompressWithFflate(compressed) {
  return new Promise((resolve, reject) => {
    gunzip(compressed, (err, decompressed) => {
      if (err) reject(err);
      else {
        const json = new TextDecoder().decode(decompressed);
        resolve(JSON.parse(json));
      }
    });
  });
}

// Streaming compression for large files
async function* compressStream(source) {
  const compressor = new zip.Deflate({ level: 6 });
  
  for await (const chunk of source) {
    compressor.push(chunk, false);
    while (compressor.result) {
      yield compressor.result;
      compressor.result = null;
    }
  }
  
  compressor.push(new Uint8Array(0), true);
  if (compressor.result) {
    yield compressor.result;
  }
}
```

### Compression with Chunking Strategy

```javascript
class CompressedChunkUploader {
  constructor(file, options = {}) {
    this.file = file;
    this.chunkSize = options.chunkSize || 1024 * 1024;
    this.compressionLevel = options.compressionLevel || 6;
  }

  async compressChunk(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    return new Promise((resolve, reject) => {
      gzip(uint8Array, { 
        level: this.compressionLevel,
        chunkSize: 32 * 1024 // 32KB chunks for compression
      }, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  async uploadWithCompression(onProgress) {
    const totalChunks = Math.ceil(this.file.size / this.chunkSize);
    let originalTotal = 0;
    let compressedTotal = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const chunk = this.file.slice(start, end);
      
      const originalSize = chunk.size;
      const compressed = await this.compressChunk(chunk);
      const compressedSize = compressed.length;
      
      originalTotal += originalSize;
      compressedTotal += compressedSize;
      
      // Upload compressed chunk
      await this.uploadCompressedChunk(i, compressed, totalChunks);
      
      if (onProgress) {
        onProgress({
          chunk: i + 1,
          total: totalChunks,
          compressionRatio: ((1 - compressedSize / originalSize) * 100).toFixed(1)
        });
      }
    }

    console.log(`Total compression: ${((1 - compressedTotal / originalTotal) * 100).toFixed(1)}%`);
  }

  async uploadCompressedChunk(index, data, total) {
    const formData = new FormData();
    formData.append('chunk', new Blob([data]));
    formData.append('index', index);
    formData.append('total', total);
    formData.append('compressed', 'true');
    
    await fetch('/upload', {
      method: 'POST',
      body: formData
    });
  }
}
```

---

## 3. Streaming Approaches

### Overview
Streaming allows processing data piece-by-piece without loading the entire file into memory. The Streams API provides a powerful foundation for this.

### Basic ReadableStream Usage

```javascript
/**
 * Read a file line by line using Streams API
 */
class LineReader {
  constructor(file, encoding = 'utf-8') {
    this.file = file;
    this.encoding = encoding;
    this.newLine = '\n';
  }

  async *lines() {
    const stream = this.file.stream();
    const reader = stream.getReader();
    const decoder = new TextDecoder(this.encoding);
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (buffer) yield buffer;
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Split on newlines
        const lines = buffer.split(this.newLine);
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop();
        
        // Yield complete lines
        for (const line of lines) {
          yield line;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

// Usage
const fileInput = document.querySelector('input[type="file"]');
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const reader = new LineReader(file);
  
  let lineCount = 0;
  for await (const line of reader.lines()) {
    lineCount++;
    if (lineCount % 1000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
      // Yield to event loop to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    // Process line...
  }
});
```

### Processing Large CSV Files

```javascript
class CSVParser {
  constructor(options = {}) {
    this.delimiter = options.delimiter || ',';
    this.hasHeader = options.hasHeader !== false;
    this.batchSize = options.batchSize || 1000;
  }

  async *parse(file) {
    const reader = new LineReader(file);
    let headers = null;
    let batch = [];
    let rowCount = 0;

    for await (const line of reader.lines()) {
      if (!line.trim()) continue;
      
      const values = this.parseLine(line);
      
      if (!headers && this.hasHeader) {
        headers = values;
        continue;
      }

      const row = headers 
        ? Object.fromEntries(headers.map((h, i) => [h, values[i]]))
        : values;

      batch.push(row);
      rowCount++;

      if (batch.length >= this.batchSize) {
        yield { type: 'batch', data: batch, rowCount };
        batch = [];
      }
    }

    if (batch.length > 0) {
      yield { type: 'batch', data: batch, rowCount };
    }

    yield { type: 'complete', totalRows: rowCount };
  }

  parseLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === this.delimiter && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  }
}

// Usage with progress tracking
async function processCSVFile(file, onProgress) {
  const parser = new CSVParser({ batchSize: 500 });
  const allData = [];

  for await (const result of parser.parse(file)) {
    if (result.type === 'batch') {
      allData.push(...result.data);
      
      if (onProgress) {
        onProgress({
          processed: result.rowCount,
          percentage: (result.rowCount / (file.size / 100)) // Rough estimate
        });
      }
      
      // Yield to event loop
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  }

  return allData;
}
```

### Transform Streams

```javascript
/**
 * Create a transform stream for processing data
 */
function createJSONParser() {
  let buffer = '';
  
  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk;
      
      // Try to parse complete JSON objects from buffer
      let boundary = buffer.indexOf('\n');
      while (boundary !== -1) {
        const line = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 1);
        
        if (line) {
          try {
            const obj = JSON.parse(line);
            controller.enqueue(obj);
          } catch (e) {
            controller.error(new Error(`Invalid JSON: ${line}`));
          }
        }
        
        boundary = buffer.indexOf('\n');
      }
    },
    flush(controller) {
      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer.trim());
          controller.enqueue(obj);
        } catch (e) {
          controller.error(new Error(`Invalid JSON at end: ${buffer}`));
        }
      }
    }
  });
}

// Usage
async function streamJSONFile(file) {
  const response = await fetch(URL.createObjectURL(file));
  
  await response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(createJSONParser())
    .pipeTo(new WritableStream({
      write(obj) {
        console.log('Received object:', obj);
      }
    }));
}
```

### Backpressure-Aware Streaming

```javascript
/**
 * Process stream with backpressure handling
 */
async function processWithBackpressure(file, processFn) {
  const stream = file.stream();
  const reader = stream.getReader();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Process chunk
      await processFn(value);
      
      // Yield to event loop for backpressure
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
  } finally {
    reader.releaseLock();
  }
}

// Rate-limited processing
async function* rateLimitedStream(source, maxItemsPerSecond) {
  const interval = 1000 / maxItemsPerSecond;
  let lastYield = 0;
  
  for await (const item of source) {
    const now = Date.now();
    const elapsed = now - lastYield;
    
    if (elapsed < interval) {
      await new Promise(resolve => setTimeout(resolve, interval - elapsed));
    }
    
    lastYield = Date.now();
    yield item;
  }
}
```

---

## 4. Lazy Loading & Virtual Scrolling

### Overview
Virtualization renders only visible items, dramatically reducing DOM nodes and memory usage for large lists.

### Basic Virtual List Implementation

```typescript
interface VirtualListOptions {
  itemHeight: number;
  overscan?: number; // Extra items to render outside viewport
  containerHeight: number;
}

class VirtualList<T> {
  private container: HTMLElement;
  private content: HTMLElement;
  private items: T[] = [];
  private visibleItems: Map<number, HTMLElement> = new Map();
  private scrollTop = 0;
  private options: VirtualListOptions;

  constructor(container: HTMLElement, options: VirtualListOptions) {
    this.container = container;
    this.options = {
      overscan: 5,
      ...options
    };
    
    this.setupContainer();
    this.attachListeners();
  }

  private setupContainer() {
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';
    this.container.style.height = `${this.options.containerHeight}px`;
    
    this.content = document.createElement('div');
    this.content.style.position = 'relative';
    this.container.appendChild(this.content);
  }

  private attachListeners() {
    this.container.addEventListener('scroll', this.handleScroll.bind(this), 
      { passive: true });
  }

  setItems(items: T[]) {
    this.items = items;
    this.updateTotalHeight();
    this.render();
  }

  private updateTotalHeight() {
    const totalHeight = this.items.length * this.options.itemHeight;
    this.content.style.height = `${totalHeight}px`;
  }

  private handleScroll() {
    this.scrollTop = this.container.scrollTop;
    requestAnimationFrame(() => this.render());
  }

  private getVisibleRange(): [number, number] {
    const { itemHeight, overscan, containerHeight } = this.options;
    
    const startIdx = Math.floor(this.scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIdx = startIdx + visibleCount;
    
    return [
      Math.max(0, startIdx - overscan!),
      Math.min(this.items.length, endIdx + overscan!)
    ];
  }

  private render() {
    const [start, end] = this.getVisibleRange();
    const newVisibleItems = new Map<number, HTMLElement>();

    // Render visible items
    for (let i = start; i < end; i++) {
      if (i >= this.items.length) break;

      let element = this.visibleItems.get(i);
      
      if (!element) {
        element = this.createItemElement(this.items[i], i);
      }

      // Position element
      element.style.transform = `translateY(${i * this.options.itemHeight}px)`;
      element.style.position = 'absolute';
      element.style.top = '0';
      element.style.left = '0';
      element.style.right = '0';
      element.style.height = `${this.options.itemHeight}px`;

      newVisibleItems.set(i, element);
      
      if (!this.visibleItems.has(i)) {
        this.content.appendChild(element);
      }
    }

    // Remove items that are no longer visible
    for (const [index, element] of this.visibleItems) {
      if (!newVisibleItems.has(index)) {
        element.remove();
      }
    }

    this.visibleItems = newVisibleItems;
  }

  private createItemElement(item: T, index: number): HTMLElement {
    const div = document.createElement('div');
    div.className = 'virtual-list-item';
    div.textContent = String(item);
    return div;
  }

  // Scroll to specific item
  scrollToIndex(index: number) {
    this.container.scrollTop = index * this.options.itemHeight;
  }

  // Destroy and cleanup
  destroy() {
    this.visibleItems.forEach(el => el.remove());
    this.visibleItems.clear();
    this.content.remove();
  }
}

// Usage
const container = document.getElementById('list-container')!;
const list = new VirtualList<string>(container, {
  itemHeight: 50,
  containerHeight: 400,
  overscan: 3
});

// Set 100,000 items
const items = Array.from({ length: 100000 }, (_, i) => `Item ${i}`);
list.setItems(items);
```

### React Virtual List Component

```tsx
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 5,
  onEndReached,
  endReachedThreshold = 100
}: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const { virtualItems, totalHeight, startIndex } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIdx = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(height / itemHeight);
    const endIdx = Math.min(items.length, startIdx + visibleCount + overscan);
    
    const virtualItems = [];
    for (let i = startIdx; i < endIdx; i++) {
      virtualItems.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: itemHeight,
          transform: `translateY(${i * itemHeight}px)`
        }
      });
    }

    return { virtualItems, totalHeight, startIndex: startIdx };
  }, [items, itemHeight, height, scrollTop, overscan]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    // Check if near end
    if (onEndReached) {
      const scrollBottom = newScrollTop + height;
      const maxScroll = totalHeight - endReachedThreshold;
      
      if (scrollBottom >= maxScroll) {
        onEndReached();
      }
    }
  }, [height, totalHeight, onEndReached, endReachedThreshold]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        height,
        overflow: 'auto',
        position: 'relative'
      }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {virtualItems.map(({ item, index, style }) => (
          <div key={index} style={style}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Usage example with infinite scroll
function App() {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(0);

  const loadMore = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newItems = Array.from({ length: 50 }, (_, i) => 
      `Item ${pageRef.current * 50 + i}`
    );
    
    setItems(prev => [...prev, ...newItems]);
    pageRef.current++;
    setLoading(false);
  }, [loading]);

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <VirtualList
      items={items}
      itemHeight={50}
      height={600}
      onEndReached={loadMore}
      endReachedThreshold={200}
      renderItem={(item, index) => (
        <div style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
          {item}
        </div>
      )}
    />
  );
}
```

### Intersection Observer for Lazy Loading

```javascript
/**
 * Lazy load images or content as they enter viewport
 */
class LazyLoader {
  constructor(options = {}) {
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        root: options.root || null,
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.01
      }
    );
    this.callbacks = new Map();
  }

  observe(element, callback) {
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  unobserve(element) {
    this.callbacks.delete(element);
    this.observer.unobserve(element);
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const callback = this.callbacks.get(entry.target);
        if (callback) {
          callback(entry.target);
          this.unobserve(entry.target);
        }
      }
    });
  }

  disconnect() {
    this.observer.disconnect();
    this.callbacks.clear();
  }
}

// Usage for lazy loading images
const lazyLoader = new LazyLoader({ rootMargin: '100px' });

document.querySelectorAll('img[data-src]').forEach(img => {
  lazyLoader.observe(img, (element) => {
    element.src = element.dataset.src;
    element.removeAttribute('data-src');
  });
});
```

---

## 5. Storage APIs Comparison

### Cache API

**Best for:** Caching HTTP responses, static assets, offline-first apps

```javascript
/**
 * Cache API for storing responses
 */
class CacheStorage {
  constructor(cacheName) {
    this.cacheName = cacheName;
  }

  async open() {
    this.cache = await caches.open(this.cacheName);
  }

  async store(key, response) {
    const request = new Request(key);
    const responseToCache = new Response(response);
    await this.cache.put(request, responseToCache);
  }

  async retrieve(key) {
    const request = new Request(key);
    const response = await this.cache.match(request);
    return response ? response.blob() : null;
  }

  async delete(key) {
    const request = new Request(key);
    return this.cache.delete(request);
  }
}

// Usage for model caching
async function cacheModel(modelBlob, modelName) {
  const cacheStorage = new CacheStorage('ai-models');
  await cacheStorage.open();
  
  const cacheKey = `/models/${modelName}`;
  await cacheStorage.store(cacheKey, modelBlob);
  
  // Verify
  const cached = await cacheStorage.retrieve(cacheKey);
  console.log('Cached model size:', cached?.size);
}
```

### IndexedDB

**Best for:** Structured data, complex queries, large JSON objects

```javascript
/**
 * IndexedDB wrapper for complex data
 */
class IndexedDBStorage {
  constructor(dbName, version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async open(stores) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        stores.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath || 'id',
              autoIncrement: store.autoIncrement
            });
            
            // Create indexes
            store.indexes?.forEach(index => {
              objectStore.createIndex(index.name, index.keyPath, index.options);
            });
          }
        });
      };
    });
  }

  async add(storeName, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.add(data);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName, query, count) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = query ? store.getAll(query, count) : store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Usage
const db = new IndexedDBStorage('MyApp', 1);

await db.open([
  {
    name: 'documents',
    keyPath: 'id',
    indexes: [
      { name: 'byDate', keyPath: 'createdAt' },
      { name: 'byType', keyPath: 'type' }
    ]
  },
  {
    name: 'images',
    keyPath: 'id'
  }
]);

// Store document
await db.add('documents', {
  id: 'doc-1',
  title: 'Large Document',
  content: '...',
  createdAt: new Date(),
  type: 'pdf'
});

// Query by index
const tx = db.db.transaction('documents', 'readonly');
const store = tx.objectStore('documents');
const index = store.index('byDate');
const request = index.getAll(IDBKeyRange.bound(
  new Date('2024-01-01'),
  new Date('2024-12-31')
));
```

### Origin Private File System (OPFS)

**Best for:** Large binary files, file-like operations, highest performance

```javascript
/**
 * OPFS for high-performance file storage
 */
class OPFSStorage {
  constructor() {
    this.root = null;
  }

  async init() {
    this.root = await navigator.storage.getDirectory();
  }

  async writeFile(path, data) {
    const parts = path.split('/').filter(Boolean);
    const filename = parts.pop();
    
    // Navigate/create directories
    let dir = this.root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await dir.getFileHandle(filename, { create: true });
    
    // Write with streaming for large files
    const writable = await fileHandle.createWritable();
    
    if (data instanceof ReadableStream) {
      await data.pipeTo(writable);
    } else if (data instanceof Blob) {
      await data.stream().pipeTo(writable);
    } else {
      await writable.write(data);
      await writable.close();
    }
  }

  async readFile(path) {
    const fileHandle = await this.getFileHandle(path);
    if (!fileHandle) return null;
    
    return await fileHandle.getFile();
  }

  async readFileStream(path) {
    const file = await this.readFile(path);
    if (!file) return null;
    
    return file.stream();
  }

  async getFileHandle(path) {
    try {
      const parts = path.split('/').filter(Boolean);
      const filename = parts.pop();
      
      let dir = this.root;
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part);
      }
      
      return await dir.getFileHandle(filename);
    } catch {
      return null;
    }
  }

  async deleteFile(path) {
    const parts = path.split('/').filter(Boolean);
    const filename = parts.pop();
    
    let dir = this.root;
    for (const part of parts) {
      dir = await dir.getDirectoryHandle(part);
    }
    
    await dir.removeEntry(filename);
  }

  async *listFiles(path = '') {
    let dir = this.root;
    
    if (path) {
      const parts = path.split('/').filter(Boolean);
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part);
      }
    }

    for await (const [name, handle] of dir.entries()) {
      yield {
        name,
        kind: handle.kind,
        handle
      };
    }
  }

  async getUsage() {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage,
      quota: estimate.quota,
      percentUsed: ((estimate.usage || 0) / (estimate.quota || 1) * 100).toFixed(2)
    };
  }
}

// Usage for storing large images
const opfs = new OPFSStorage();
await opfs.init();

// Store large image
async function storeLargeImage(imageFile) {
  const path = `images/${Date.now()}_${imageFile.name}`;
  await opfs.writeFile(path, imageFile);
  return path;
}

// Read as stream for processing
async function processStoredImage(path) {
  const stream = await opfs.readFileStream(path);
  if (!stream) return null;
  
  const reader = stream.getReader();
  const chunks = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  return new Blob(chunks);
}
```

### Storage Comparison Summary

| Feature | Cache API | IndexedDB | OPFS |
|---------|-----------|-----------|------|
| **Best For** | HTTP responses, assets | Structured data, JSON | Binary files, streams |
| **Data Size** | Large (GBs) | Large (GBs) | Largest (disk space) |
| **Speed** | Fast | Medium | Fastest (near-native) |
| **API Complexity** | Simple | Complex | Medium |
| **Index Support** | No | Yes | No |
| **Streaming** | Limited | No | Yes |
| **WebWorker** | Yes | Yes | Yes (sync access in worker) |
| **Use Case** | Offline apps, caching | Complex queries, objects | Large file storage |

---

## 6. Memory Management

### Overview
Managing memory is critical when processing large files. JavaScript uses garbage collection, but developers must help by releasing references and using appropriate data structures.

### WeakMap/WeakSet for Caching

```javascript
/**
 * Memory-efficient cache using WeakMap
 * Keys are garbage collectable when no other references exist
 */
class WeakCache {
  constructor() {
    this.cache = new WeakMap();
    this.registry = new FinalizationRegistry(key => {
      console.log(`Object with key ${key} was garbage collected`);
    });
  }

  set(key, value) {
    this.cache.set(key, value);
    this.registry.register(value, key);
  }

  get(key) {
    return this.cache.get(key);
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }
}

// Usage for image processing cache
const imageCache = new WeakCache();

function processImage(imgElement) {
  // Check if already processed
  if (imageCache.has(imgElement)) {
    return imageCache.get(imgElement);
  }

  // Process image
  const processed = heavyImageProcessing(imgElement);
  imageCache.set(imgElement, processed);
  
  return processed;
}

// When imgElement is removed from DOM and has no other references,
// the cached data is automatically garbage collected
```

### Memory-Efficient Image Processing

```javascript
/**
 * Process images in chunks to avoid memory spikes
 */
class ImageProcessor {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 2;
    this.chunkSize = options.chunkSize || 1024 * 1024; // 1MB
  }

  async processLargeImage(file, operations) {
    // Create blob URL instead of loading into memory
    const blobUrl = URL.createObjectURL(file);
    
    try {
      const img = await this.loadImage(blobUrl);
      
      // Process in tiles for very large images
      if (img.width * img.height > 10000000) { // > 10MP
        return await this.processInTiles(img, operations);
      }
      
      return await this.processFullImage(img, operations);
    } finally {
      // Always revoke blob URL to free memory
      URL.revokeObjectURL(blobUrl);
    }
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async processInTiles(img, operations) {
    const tileSize = 2048;
    const tiles = [];
    
    for (let y = 0; y < img.height; y += tileSize) {
      for (let x = 0; x < img.width; x += tileSize) {
        tiles.push({
          x, y,
          width: Math.min(tileSize, img.width - x),
          height: Math.min(tileSize, img.height - y)
        });
      }
    }

    const processedTiles = [];
    
    // Process tiles with limited concurrency
    const queue = [...tiles];
    const workers = Array(this.maxConcurrent).fill().map(async () => {
      while (queue.length > 0) {
        const tile = queue.shift();
        const processed = await this.processTile(img, tile, operations);
        processedTiles.push({ tile, data: processed });
        
        // Yield to event loop
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    });

    await Promise.all(workers);
    
    // Stitch tiles together
    return this.stitchTiles(processedTiles, img.width, img.height);
  }

  async processTile(img, tile, operations) {
    const canvas = document.createElement('canvas');
    canvas.width = tile.width;
    canvas.height = tile.height;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      tile.x, tile.y, tile.width, tile.height,
      0, 0, tile.width, tile.height
    );

    // Apply operations
    for (const op of operations) {
      await op(ctx, canvas);
    }

    return canvas.toDataURL('image/jpeg', 0.9);
  }

  stitchTiles(tiles, totalWidth, totalHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    
    const ctx = canvas.getContext('2d');
    
    for (const { tile, data } of tiles) {
      const img = new Image();
      img.src = data;
      ctx.drawImage(img, tile.x, tile.y);
    }

    return canvas;
  }
}
```

### Object Pooling

```javascript
/**
 * Object pooling to reduce garbage collection pressure
 */
class ObjectPool {
  constructor(factory, reset, size = 10) {
    this.factory = factory;
    this.reset = reset;
    this.pool = [];
    this.inUse = new Set();
    
    // Pre-populate pool
    for (let i = 0; i < size; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire() {
    let obj;
    
    if (this.pool.length > 0) {
      obj = this.pool.pop();
    } else {
      obj = this.factory();
    }
    
    this.inUse.add(obj);
    return obj;
  }

  release(obj) {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      this.reset(obj);
      this.pool.push(obj);
    }
  }

  clear() {
    this.pool = [];
    this.inUse.clear();
  }
}

// Usage for buffer pooling
const bufferPool = new ObjectPool(
  () => new Uint8Array(1024 * 1024), // 1MB buffer
  (buffer) => buffer.fill(0),
  5 // Pre-allocate 5 buffers
);

async function processWithPool(file) {
  const buffer = bufferPool.acquire();
  
  try {
    const reader = file.stream().getReader();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Process using pooled buffer
      const toCopy = Math.min(value.length, buffer.length);
      buffer.set(value.slice(0, toCopy));
      
      // Process buffer...
    }
  } finally {
    bufferPool.release(buffer);
  }
}
```

### Memory Monitoring

```javascript
/**
 * Monitor memory usage during processing
 */
class MemoryMonitor {
  constructor(options = {}) {
    this.threshold = options.threshold || 100 * 1024 * 1024; // 100MB
    this.interval = options.interval || 1000;
    this.onHighMemory = options.onHighMemory;
    this.timer = null;
  }

  start() {
    if ('memory' in performance) {
      this.timer = setInterval(() => {
        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const totalMB = memory.totalJSHeapSize / 1024 / 1024;
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;

        console.log(`Memory: ${usedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB (limit: ${limitMB.toFixed(1)}MB)`);

        if (memory.usedJSHeapSize > this.threshold && this.onHighMemory) {
          this.onHighMemory({
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          });
        }
      }, this.interval);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

// Usage
const monitor = new MemoryMonitor({
  threshold: 200 * 1024 * 1024, // 200MB
  onHighMemory: (stats) => {
    console.warn('High memory usage detected!');
    // Trigger cleanup
    gc(); // If available (--expose-gc flag)
  }
});

monitor.start();
```

---

## 7. Pagination & Cursor-Based Access

### Overview
For large datasets, pagination is essential. Cursor-based pagination is more efficient than offset-based for deep pagination.

### Offset-Based Pagination

```javascript
/**
 * Traditional offset-based pagination
 * Good for: Small datasets, jump to specific page
 * Bad for: Deep pagination (performance degrades)
 */
class OffsetPagination {
  constructor(options = {}) {
    this.pageSize = options.pageSize || 20;
    this.currentPage = 1;
    this.totalItems = 0;
  }

  getQueryParams() {
    return {
      offset: (this.currentPage - 1) * this.pageSize,
      limit: this.pageSize
    };
  }

  async fetchPage(page, fetchFn) {
    this.currentPage = page;
    const params = this.getQueryParams();
    
    const response = await fetchFn(params);
    this.totalItems = response.total;
    
    return {
      items: response.data,
      page: this.currentPage,
      totalPages: Math.ceil(this.totalItems / this.pageSize),
      hasNext: this.currentPage < Math.ceil(this.totalItems / this.pageSize),
      hasPrev: this.currentPage > 1
    };
  }

  goToPage(page) {
    this.currentPage = Math.max(1, page);
    return this;
  }

  next() {
    this.currentPage++;
    return this;
  }

  prev() {
    this.currentPage = Math.max(1, this.currentPage - 1);
    return this;
  }
}

// Usage
const pagination = new OffsetPagination({ pageSize: 50 });

const result = await pagination.fetchPage(1, async (params) => {
  const response = await fetch(`/api/items?offset=${params.offset}&limit=${params.limit}`);
  return response.json();
});
```

### Cursor-Based Pagination

```javascript
/**
 * Cursor-based pagination for large datasets
 * Good for: Infinite scroll, real-time feeds, large datasets
 * Bad for: Jump to arbitrary page
 */
class CursorPagination {
  constructor(options = {}) {
    this.pageSize = options.pageSize || 20;
    this.cursorField = options.cursorField || 'createdAt';
    this.direction = options.direction || 'desc';
    this.cursors = new Map(); // Cache cursors by page
    this.currentCursor = null;
    this.hasNext = true;
    this.hasPrev = false;
  }

  async fetchNext(fetchFn) {
    if (!this.hasNext) return null;

    const params = {
      limit: this.pageSize + 1, // Fetch one extra to check for next
      cursor: this.currentCursor,
      direction: this.direction
    };

    const response = await fetchFn(params);
    const items = response.data;

    // Check if there's more
    this.hasNext = items.length > this.pageSize;
    if (this.hasNext) {
      items.pop(); // Remove the extra item
    }

    // Store cursor for current items
    if (items.length > 0) {
      this.cursors.set(this.currentCursor, items[0][this.cursorField]);
    }

    // Set next cursor to last item
    if (items.length > 0 && this.hasNext) {
      const lastItem = items[items.length - 1];
      this.currentCursor = lastItem[this.cursorField];
    }

    this.hasPrev = true;

    return {
      items,
      hasNext: this.hasNext,
      hasPrev: this.hasPrev,
      nextCursor: this.currentCursor
    };
  }

  reset() {
    this.currentCursor = null;
    this.hasNext = true;
    this.hasPrev = false;
    this.cursors.clear();
  }
}

// Usage with infinite scroll
class InfiniteScroll {
  constructor(container, options = {}) {
    this.container = container;
    this.pagination = new CursorPagination(options);
    this.loading = false;
    this.items = [];
    
    this.setupObserver();
  }

  setupObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.loading) {
          this.loadMore();
        }
      },
      { rootMargin: '100px' }
    );

    const sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    this.container.appendChild(sentinel);
    this.observer.observe(sentinel);
  }

  async loadMore() {
    if (this.loading) return;
    this.loading = true;

    try {
      const result = await this.pagination.fetchNext(async (params) => {
        const query = new URLSearchParams({
          limit: params.limit,
          ...(params.cursor && { after: params.cursor })
        });
        
        const response = await fetch(`/api/items?${query}`);
        return response.json();
      });

      if (result) {
        this.items.push(...result.items);
        this.renderItems(result.items);
        
        if (!result.hasNext) {
          this.observer.disconnect();
          this.showEndMessage();
        }
      }
    } finally {
      this.loading = false;
    }
  }

  renderItems(newItems) {
    const fragment = document.createDocumentFragment();
    
    for (const item of newItems) {
      const el = document.createElement('div');
      el.className = 'item';
      el.textContent = item.name;
      fragment.appendChild(el);
    }

    const sentinel = this.container.querySelector('.scroll-sentinel');
    this.container.insertBefore(fragment, sentinel);
  }
}
```

### Seek-Based Pagination (Keyset)

```javascript
/**
 * Seek-based pagination using composite keys
 * Most efficient for large datasets with sorting
 */
class SeekPagination {
  constructor(options = {}) {
    this.pageSize = options.pageSize || 20;
    this.sortFields = options.sortFields || [{ field: 'id', direction: 'asc' }];
    this.lastValues = null;
  }

  buildQueryParams() {
    const params = new URLSearchParams();
    params.set('limit', String(this.pageSize));
    
    if (this.lastValues) {
      this.sortFields.forEach((sort, index) => {
        params.set(`after_${sort.field}`, String(this.lastValues[index]));
      });
    }

    // Add sort parameters
    params.set('sort', this.sortFields
      .map(s => `${s.direction === 'desc' ? '-' : ''}${s.field}`)
      .join(','));

    return params;
  }

  processResponse(items) {
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      this.lastValues = this.sortFields.map(s => lastItem[s.field]);
    }

    return {
      items,
      hasMore: items.length === this.pageSize
    };
  }

  reset() {
    this.lastValues = null;
  }
}

// Server-side implementation (Node.js/Express example)
/*
app.get('/api/items', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const sortFields = parseSort(req.query.sort); // e.g., "-createdAt,id"
  
  // Build WHERE clause from cursors
  const where = {};
  const conditions = [];
  
  for (const field of sortFields) {
    const afterValue = req.query[`after_${field.name}`];
    if (afterValue) {
      conditions.push({
        [field.name]: field.direction === 'asc' 
          ? { gt: afterValue }
          : { lt: afterValue }
      });
    }
  }
  
  if (conditions.length > 0) {
    where.AND = conditions;
  }
  
  const items = await db.items.findMany({
    where,
    orderBy: sortFields.map(f => ({ [f.name]: f.direction })),
    take: limit
  });
  
  res.json({ data: items });
});
*/
```

### Hybrid Pagination Approach

```javascript
/**
 * Hybrid approach: Use offset for first few pages, cursor for deep pagination
 */
class HybridPagination {
  constructor(options = {}) {
    this.pageSize = options.pageSize || 20;
    this.offsetThreshold = options.offsetThreshold || 5; // Switch after page 5
    this.mode = 'offset';
    this.offsetPagination = new OffsetPagination({ pageSize: this.pageSize });
    this.cursorPagination = new CursorPagination({ pageSize: this.pageSize });
  }

  async fetchPage(page, fetchFn) {
    if (page <= this.offsetThreshold) {
      this.mode = 'offset';
      return this.offsetPagination.fetchPage(page, fetchFn);
    } else {
      this.mode = 'cursor';
      // Need to seed cursor pagination from offset
      if (page === this.offsetThreshold + 1) {
        // Fetch the last offset page to get cursor
        const seedResult = await this.offsetPagination.fetchPage(
          this.offsetThreshold, 
          fetchFn
        );
        // Set cursor from last item
        if (seedResult.items.length > 0) {
          const lastItem = seedResult.items[seedResult.items.length - 1];
          this.cursorPagination.currentCursor = lastItem.createdAt;
        }
      }
      
      // Adjust page number for cursor pagination
      const cursorPage = page - this.offsetThreshold;
      for (let i = 0; i < cursorPage - 1; i++) {
        await this.cursorPagination.fetchNext(fetchFn);
      }
      
      return this.cursorPagination.fetchNext(fetchFn);
    }
  }
}
```

---

## Best Practices Summary

1. **Chunking**: Split files > 5MB into chunks for upload/processing
2. **Compression**: Use pako/fflate for text/JSON; consider compression for large network transfers
3. **Streaming**: Always use Streams API for files > 10MB
4. **Storage Selection**:
   - Cache API: Static assets, HTTP responses
   - IndexedDB: Structured data needing queries
   - OPFS: Large binary files, file-like operations
5. **Memory Management**:
   - Use WeakMap for caches tied to DOM elements
   - Revoke object URLs promptly
   - Process large images in tiles
   - Use object pooling for frequent allocations
6. **Pagination**:
   - Use offset for small datasets (< 1000 items)
   - Use cursor-based for large/infinite datasets
   - Implement hybrid approach for flexibility

---

## References

- [MDN: Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API)
- [MDN: IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN: OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [MDN: Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [pako: zlib port](https://github.com/nodeca/pako)
- [fflate: fast compression](https://github.com/101arrowz/fflate)
- [Google: Cache models in browser](https://developer.chrome.com/docs/ai/cache-models)
