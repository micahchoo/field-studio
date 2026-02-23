/**
 * Compression Worker
 *
 * Offloads gzip compression/decompression from the main thread.
 * Used by storage.ts for project save/load operations.
 */

self.onmessage = async (e: MessageEvent) => {
  const { type, data, id } = e.data;

  try {
    if (type === 'compress') {
      // data is a JSON string — compress to gzip ArrayBuffer
      const blob = new Blob([data]);
      const stream = blob.stream().pipeThrough(new CompressionStream('gzip'));
      const response = new Response(stream);
      const arrayBuffer = await response.arrayBuffer();
      (self as unknown as Worker).postMessage({ type: 'compressed', data: arrayBuffer, id }, [arrayBuffer]);
    } else if (type === 'decompress') {
      // data is an ArrayBuffer — decompress from gzip to JSON string
      const blob = new Blob([data]);
      const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
      const text = await new Response(stream).text();
      self.postMessage({ type: 'decompressed', data: text, id });
    } else {
      self.postMessage({ type: 'error', error: `Unknown message type: ${type}`, id });
    }
  } catch (err) {
    self.postMessage({
      type: 'error',
      error: err instanceof Error ? err.message : 'Compression worker error',
      id,
    });
  }
};
