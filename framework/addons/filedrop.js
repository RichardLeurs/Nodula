// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide an accessible native file picker and file-drop target. */
import { onCleanup } from "nodula-framework";
import { injectAddonStyles } from "./inject-styles.js";
import fileDropStyles from "../assets/css/nodula-filedrop.css?inline";

let nextFileDropId = 0;

/**
 * Throw a TypeError unless `element` is a DOM element.
 *
 * @param {unknown} element
 */
function assertElement(element) {
  if (!element || element.nodeType !== 1 || typeof element.addEventListener !== "function") {
    throw new TypeError("createFileDropZone expects a target element.");
  }
}

/**
 * Register a dispose function with the current owner. Outside an owner the caller must call it.
 *
 * @param {() => void} dispose
 */
function registerCleanup(dispose) {
  try {
    onCleanup(dispose);
  } catch {
    // Call the returned disposer when used outside a Nodula owner.
  }
}

/** Create a native file picker/drop zone. Files remain under application control. */
export function createFileDropZone(
  target,
  {
    label,
    description,
    buttonLabel,
    accept,
    multiple = false,
    onFiles,
    classNames = {},
    onStateChange,
  } = {},
) {
  assertElement(target);
  if (typeof label !== "string" || !label.trim())
    throw new TypeError("createFileDropZone label must be a non-empty string.");
  if (typeof description !== "string")
    throw new TypeError("createFileDropZone description must be a string.");
  if (typeof buttonLabel !== "string" || !buttonLabel.trim())
    throw new TypeError("createFileDropZone buttonLabel must be a non-empty string.");
  if (accept !== undefined && (typeof accept !== "string" || !accept.trim())) {
    throw new TypeError("createFileDropZone accept must be a non-empty string when provided.");
  }
  if (typeof multiple !== "boolean")
    throw new TypeError("createFileDropZone multiple must be a boolean.");
  if (typeof onFiles !== "function")
    throw new TypeError("createFileDropZone onFiles must be a function.");
  if (
    !classNames ||
    typeof classNames !== "object" ||
    Array.isArray(classNames) ||
    ["active", "accepted", "rejected"].some(
      (state) =>
        classNames[state] !== undefined &&
        (typeof classNames[state] !== "string" || !classNames[state].trim()),
    )
  ) {
    throw new TypeError(
      "createFileDropZone classNames must contain non-empty strings for active, accepted, or rejected states.",
    );
  }
  if (onStateChange !== undefined && typeof onStateChange !== "function") {
    throw new TypeError("createFileDropZone onStateChange must be a function.");
  }
  if (typeof document === "undefined")
    throw new Error("createFileDropZone requires a browser document.");

  injectAddonStyles("filedrop", fileDropStyles);

  const id = nextFileDropId++;
  const zone = document.createElement("div");
  zone.className = "ui-filedrop";
  zone.setAttribute("role", "group");

  const title = document.createElement("p");
  title.className = "ui-filedrop__label";
  title.id = `ui-filedrop-label-${id}`;
  title.textContent = label;
  zone.setAttribute("aria-labelledby", title.id);

  const instructions = document.createElement("p");
  instructions.className = "ui-filedrop__description";
  instructions.id = `ui-filedrop-description-${id}`;
  instructions.textContent = description;

  const input = document.createElement("input");
  input.className = "ui-filedrop__input";
  input.type = "file";
  input.setAttribute("aria-label", label);
  input.setAttribute("aria-describedby", instructions.id);
  if (accept !== undefined) input.accept = accept;
  input.multiple = multiple;

  const button = document.createElement("button");
  button.className = "ui-filedrop__button";
  button.type = "button";
  button.textContent = buttonLabel;

  zone.append(title, instructions, input, button);
  target.append(zone);

  let disposed = false;
  let currentState = "idle";
  const stateClasses = {
    active: classNames.active ?? "ui-filedrop--active",
    accepted: classNames.accepted ?? "ui-filedrop--accepted",
    rejected: classNames.rejected ?? "ui-filedrop--rejected",
  };
  /**
   * Set the zone state and its classes, and report the change to `onStateChange`.
   *
   * Every picked or dropped batch is reported, even when the state does not change.
   *
   * @param {"idle" | "active" | "accepted" | "rejected"} state
   * @param {object} [details]
   */
  const setState = (state, details = {}) => {
    // Repeated dragover/leave events are noise, but every picked or dropped batch is reported.
    if (currentState === state && (state === "active" || state === "idle") && !details.accepted)
      return;
    for (const className of Object.values(stateClasses))
      zone.classList.remove(...className.split(/\s+/));
    if (state !== "idle") zone.classList.add(...stateClasses[state].split(/\s+/));
    currentState = state;
    onStateChange?.(state, details);
  };
  /**
   * Return the files to consider: all of them, or only the first when `multiple` is false.
   *
   * @param {FileList | File[] | null | undefined} files
   * @returns {File[]}
   */
  const filesFor = (files) => {
    const selected = Array.from(files ?? []);
    return multiple ? selected : selected.slice(0, 1);
  };
  /**
   * Whether a file matches the `accept` rules: MIME types, `type/*` wildcards, or extensions.
   *
   * @param {File} file
   * @returns {boolean}
   */
  const acceptsFile = (file) => {
    if (accept === undefined) return true;
    return accept
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
      .some((rule) => {
        if (rule.startsWith(".")) return file.name.toLowerCase().endsWith(rule);
        if (rule.endsWith("/*")) return file.type.toLowerCase().startsWith(rule.slice(0, -1));
        return file.type.toLowerCase() === rule;
      });
  };
  /**
   * Split the selected files into accepted and rejected groups.
   *
   * @param {FileList | File[] | null | undefined} files
   * @returns {{ accepted: File[], rejected: File[] }}
   */
  const partitionFiles = (files) => {
    const selected = filesFor(files);
    return {
      accepted: selected.filter(acceptsFile),
      rejected: selected.filter((file) => !acceptsFile(file)),
    };
  };
  /**
   * Handle files chosen in the native picker, then clear the input so the same file can be chosen again.
   */
  const handlePickerChange = () => {
    const { accepted, rejected } = partitionFiles(input.files);
    const state = rejected.length ? "rejected" : accepted.length ? "accepted" : "idle";
    try {
      if (accepted.length) onFiles(accepted, "picker");
    } finally {
      input.value = "";
      setState(state, { accepted, rejected, source: "picker" });
    }
  };
  /**
   * Whether a drag event carries files.
   *
   * @param {DragEvent} event
   * @returns {boolean}
   */
  const hasFiles = (event) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
  /**
   * Show the active state when a file drag enters the zone.
   *
   * @param {DragEvent} event
   */
  const handleDragEnter = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    setState("active", { source: "drop" });
  };
  /**
   * Accept a file drag and show the copy cursor.
   *
   * @param {DragEvent} event
   */
  const handleDragOver = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    setState("active", { source: "drop" });
  };
  /**
   * Return to idle when a drag leaves the zone, unless it moves onto one of its children.
   *
   * @param {DragEvent} event
   */
  const handleDragLeave = (event) => {
    if (event.relatedTarget && zone.contains(event.relatedTarget)) return;
    setState("idle", { source: "drop" });
  };
  /**
   * Handle dropped files: accepted ones go to `onFiles`, and the state reflects the result.
   *
   * @param {DragEvent} event
   */
  const handleDrop = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    const { accepted, rejected } = partitionFiles(event.dataTransfer?.files);
    const state = rejected.length ? "rejected" : accepted.length ? "accepted" : "idle";
    // A throwing onFiles must not leave the zone stuck in the active state.
    try {
      if (accepted.length) onFiles(accepted, "drop");
    } finally {
      setState(state, { accepted, rejected, source: "drop" });
    }
  };
  /**
   * Open the native file picker from the button.
   */
  const handleButtonClick = () => input.click();

  input.addEventListener("change", handlePickerChange);
  button.addEventListener("click", handleButtonClick);
  zone.addEventListener("dragenter", handleDragEnter);
  zone.addEventListener("dragover", handleDragOver);
  zone.addEventListener("dragleave", handleDragLeave);
  zone.addEventListener("drop", handleDrop);

  /**
   * Remove the listeners and the zone element. Safe to call more than once.
   */
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    input.removeEventListener("change", handlePickerChange);
    button.removeEventListener("click", handleButtonClick);
    zone.removeEventListener("dragenter", handleDragEnter);
    zone.removeEventListener("dragover", handleDragOver);
    zone.removeEventListener("dragleave", handleDragLeave);
    zone.removeEventListener("drop", handleDrop);
    for (const className of Object.values(stateClasses))
      zone.classList.remove(...className.split(/\s+/));
    zone.remove();
  };
  registerCleanup(dispose);
  return dispose;
}
