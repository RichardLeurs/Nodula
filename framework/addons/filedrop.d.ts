export type FileDropSource = 'drop' | 'picker';
export type FileDropZoneState = 'idle' | 'active' | 'accepted' | 'rejected';

export interface FileDropStateDetails {
  source?: FileDropSource;
  accepted?: File[];
  rejected?: File[];
}

export interface FileDropZoneOptions {
  /** Required visible heading and accessible group/input name. */
  label?: string;
  /** Instructions shown to users and associated with the file input. */
  description?: string;
  /** Required keyboard-accessible native picker button label. */
  buttonLabel?: string;
  /** File type rules, e.g. "image/*,.pdf". Enforced for both picker and dropped files; still validate file contents server-side. */
  accept?: string;
  /** Allow multiple files. Defaults to false; when false, only first dropped file is reported. */
  multiple?: boolean;
  /** Receives a snapshot of selected files and whether they came from picker or drop. */
  onFiles: (files: File[], source: FileDropSource) => void;
  /** Override the zone's active, accepted, and rejected state classes. */
  classNames?: Partial<Record<Exclude<FileDropZoneState, 'idle'>, string>>;
  /** Called when zone state changes; rejected files are not passed to onFiles. */
  onStateChange?: (state: FileDropZoneState, details: FileDropStateDetails) => void;
}

/** Append an accessible native file picker/drop zone to target. Returns an idempotent disposer. */
export function createFileDropZone(target: Element, options: FileDropZoneOptions): () => void;