import type { FileDropZoneOptions } from 'nodula-framework/filedrop';

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

export interface FileUploadOptions extends Omit<FileDropZoneOptions, 'onFiles'> {
  /** Upload endpoint URL. Defaults to `/upload/`. */
  url?: string;
  /** Called as request bytes upload; non-computable progress events are ignored. */
  onProgress?: (file: File, progress: FileUploadProgress) => void;
  /** Called with the parsed JSON response after a successful upload. */
  onComplete?: (file: File, response: unknown) => void;
  /** Called for HTTP errors, network errors, and invalid JSON responses. */
  onError?: (file: File, error: Error) => void;
  /** Optional observer called before each selected file starts uploading. */
  onFiles?: FileDropZoneOptions['onFiles'];
}

/** Append a file-drop zone that uploads each accepted file; returns an idempotent disposer. */
export function createFileUploadZone(target: Element, options: FileUploadOptions): () => void;