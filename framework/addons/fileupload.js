/* Compose the accessible file-drop zone with XMLHttpRequest upload progress. */
import { onCleanup } from 'nodula-framework';
import { createFileDropZone } from 'nodula-framework/filedrop';

/** Create a file-drop zone that uploads each accepted file and reports progress. */
export function createFileUploadZone(target, {
  url = '/api/upload/',
  maxFileSize,
  onProgress,
  onComplete,
  onError,
  ...fileDropOptions
} = {}) {
  if (typeof url !== 'string' || !url.trim()) throw new TypeError('createFileUploadZone url must be a non-empty string.');
  if (maxFileSize !== undefined && (!Number.isFinite(maxFileSize) || maxFileSize < 0)) {
    throw new TypeError('createFileUploadZone maxFileSize must be a non-negative finite number of bytes.');
  }
  for (const [name, callback] of Object.entries({ onProgress, onComplete, onError })) {
    if (callback !== undefined && typeof callback !== 'function') {
      throw new TypeError(`createFileUploadZone ${name} must be a function.`);
    }
  }

  const requests = new Set();
  let disposed = false;

  const disposeDropZone = createFileDropZone(target, {
    ...fileDropOptions,
    onFiles(files, source) {
      fileDropOptions.onFiles?.(files, source);
      for (const file of files) {
        if (maxFileSize !== undefined && file.size > maxFileSize) {
          onError?.(file, new Error(`File exceeds the maximum size of ${maxFileSize} bytes.`));
          continue;
        }

        const request = new XMLHttpRequest();
        const body = new FormData();
        body.append('file', file, file.name);
        requests.add(request);

        request.upload.addEventListener('progress', (event) => {
          if (disposed || !event.lengthComputable || event.total === 0) return;
          onProgress?.(file, {
            loaded: event.loaded,
            total: event.total,
            percent: Math.round((event.loaded / event.total) * 100),
          });
        });
        request.addEventListener('load', () => {
          requests.delete(request);
          if (disposed) return;
          let response;
          try {
            response = request.responseText ? JSON.parse(request.responseText) : null;
          } catch {
            onError?.(file, new Error('Upload server returned invalid JSON.'));
            return;
          }
          if (request.status < 200 || request.status >= 300) {
            onError?.(file, new Error(response?.error ?? `Upload failed with HTTP ${request.status}.`));
            return;
          }
          onComplete?.(file, response);
        });
        request.addEventListener('error', () => {
          requests.delete(request);
          if (!disposed) onError?.(file, new Error('Upload failed because of a network error.'));
        });
        request.addEventListener('abort', () => requests.delete(request));
        request.open('POST', url);
        request.send(body);
      }
    },
  });

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    disposeDropZone();
    for (const request of requests) request.abort();
    requests.clear();
  };

  try {
    onCleanup(dispose);
  } catch {
    // Call the returned disposer when used outside a Nodula owner.
  }
  return dispose;
}