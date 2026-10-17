// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Provide History/Hash routing and optional Vite-discovered file routes. */
import { effect, onCleanup, signal } from "nodula-framework";

// `code` marks the text as a framework message, so apps can swap in their own translation (framework/i18n/en.json).
/**
 * Create a centred status element. Its text is replaceable by the app, and `code` marks it for translation.
 *
 * @param {string} message English text.
 * @param {string} [code] `nodula-` code, stored as `data-nodula-code`.
 * @returns {HTMLDivElement}
 */
function createCenteredStatus(message, code) {
  const element = document.createElement("div");
  element.textContent = message;
  if (code) element.dataset.nodulaCode = code;
  Object.assign(element.style, {
    display: "grid",
    minHeight: "100vh",
    placeItems: "center",
    textAlign: "center",
  });
  return element;
}

// English defaults for the framework's own router text. Apps replace them with `labels`.
const defaultLabels = {
  checking: "Checking route…",
  navigationBlocked: "Navigation blocked.",
  loadFailed: "Could not load this page.",
  notFound: "Page not found",
};

/**
 * Merge app label overrides with the English defaults, validating each key and value.
 *
 * @param {object | undefined} labels
 * @returns {Record<string, string>}
 * @throws {TypeError} For unknown keys or empty values.
 */
function resolveLabels(labels) {
  if (labels === undefined) return defaultLabels;
  if (!labels || typeof labels !== "object" || Array.isArray(labels))
    throw new TypeError("Router labels must be an object.");
  for (const [key, text] of Object.entries(labels)) {
    if (!Object.hasOwn(defaultLabels, key)) throw new TypeError(`Unknown router label "${key}".`);
    if (typeof text !== "string" || !text.trim())
      throw new TypeError(`Router label "${key}" must be a non-empty string.`);
  }
  return { ...defaultLabels, ...labels };
}

const SEGMENT_RANK = { static: 0, param: 1, rest: 2 };

/** Split a path into raw segments, normalizing one trailing slash; null for malformed paths. */
function splitPath(path) {
  const normalized = path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;
  if (!normalized.startsWith("/") || normalized.includes("//")) return null;
  return normalized === "/" ? [] : normalized.slice(1).split("/");
}

/** Return decoded params when the raw path segments fit the route pattern, otherwise null. */
function matchSegments(segments, parts) {
  const params = Object.create(null);
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    try {
      if (segment.type === "rest") {
        const rest = parts.slice(index);
        if (!rest.length) return null;
        params[segment.name] = rest.map((part) => decodeURIComponent(part)).join("/");
        return params;
      }
      const part = parts[index];
      if (part === undefined) return null;
      if (segment.type === "static") {
        if (part !== segment.value) return null;
      } else {
        params[segment.name] = decodeURIComponent(part);
      }
    } catch {
      // Malformed percent-encoding does not match.
      return null;
    }
  }
  return segments.length === parts.length ? params : null;
}

/** Reject duplicate patterns and order static before parameter before catch-all, segment by segment. */
function sortRoutes(routes) {
  const shapes = new Set();
  for (const route of routes) {
    const shape = route.segments
      .map((segment) => (segment.type === "static" ? segment.value : `[${segment.type}]`))
      .join("/");
    if (shapes.has(shape)) throw new Error(`Duplicate route path: ${route.path}`);
    shapes.add(shape);
  }
  return routes.sort((left, right) => {
    const length = Math.min(left.segments.length, right.segments.length);
    for (let index = 0; index < length; index += 1) {
      const difference =
        SEGMENT_RANK[left.segments[index].type] - SEGMENT_RANK[right.segments[index].type];
      if (difference) return difference;
    }
    return right.segments.length - left.segments.length;
  });
}

/**
 * Hold one route component, loading it on demand. `loaded` and `failed` mirror the signals
 * so the router can decide what to load without subscribing to load state.
 */
function createEntry({ component = null, load = null, label, file }) {
  const [readComponent, setComponent] = signal(component);
  const [readError, setError] = signal(null);
  const entry = {
    file,
    loaded: Boolean(component),
    failed: false,
    pending: false,
    component: readComponent,
    error: readError,
    /**
     * Load the route module once and cache it. A failure is reported through `onFailure`.
     *
     * @param {(error: unknown, entry: object) => void} onFailure
     */
    load(onFailure) {
      if (entry.loaded || entry.pending || !load) return;
      entry.pending = true;
      entry.failed = false;
      setError(null);
      let loading;
      try {
        loading = Promise.resolve(load());
      } catch (error) {
        loading = Promise.reject(error);
      }
      loading
        .then((loaded) => {
          const resolved = typeof loaded === "function" ? loaded : loaded?.default;
          if (typeof resolved !== "function") {
            throw new TypeError(
              `${label} must resolve to a component or a module with a default component export.`,
            );
          }
          entry.loaded = true;
          setComponent(() => resolved);
        })
        .catch((error) => {
          entry.failed = true;
          // Report first so a restore or error node is in place before the view re-renders.
          onFailure(error, entry);
          setError(error);
        })
        .finally(() => {
          entry.pending = false;
        });
    },
  };
  return entry;
}

/**
 * Compile one explicit route, such as `/docs/:id`, into its segments and render function.
 *
 * @param {string} path Route pattern that starts with `/`.
 * @param {object | Function} route A component, or a lazy route with `load` and optional `context`.
 * @returns {object} The compiled route.
 * @throws {TypeError} For an invalid pattern or route.
 */
function compileExplicitRoute(path, route) {
  const parts = typeof path === "string" && path.startsWith("/") ? splitPath(path) : null;
  if (!parts) throw new TypeError(`Unsupported router route pattern: ${path}`);
  const segments = parts.map((part, index) => {
    const named = part.match(/^([:*])([a-zA-Z_$][\w$]*)$/);
    if (!named) {
      if (part.startsWith(":") || part.startsWith("*"))
        throw new TypeError(`Unsupported router route pattern: ${path}`);
      return { type: "static", value: part };
    }
    if (named[1] === "*" && index !== parts.length - 1)
      throw new TypeError(`Router catch-all segment must be last: ${path}`);
    return { type: named[1] === ":" ? "param" : "rest", name: named[2] };
  });

  if (typeof route === "function") {
    const entry = createEntry({ component: route });
    return { path, segments, entries: [entry], render: (params) => route({ params }) };
  }
  if (typeof route?.load !== "function") {
    throw new TypeError(
      `Router route "${path}" must be a component or a lazy route with a load function.`,
    );
  }
  const entry = createEntry({ load: route.load, label: `Lazy route "${path}"` });
  return {
    path,
    segments,
    entries: [entry],
    render: (params) => entry.component()({ ...route.context, params }),
  };
}

/**
 * Create a router from explicit routes.
 *
 * Routes are ranked static, then parameter, then catch-all, so declaration order does not matter.
 *
 * @param {Record<string, object | Function>} routes Route patterns and their components or lazy loaders.
 * @param {(() => Node) | undefined} [fallback] Renders unmatched paths. Defaults to the English not-found view.
 * @param {object} [options] `mode`, `base`, `beforeEach`, `onError` and `labels`.
 * @returns {object} The router: `current`, `view`, `navigate`, `loadError`, `canRender` and `navigationPending`.
 * @throws {TypeError} For invalid routes, options or labels.
 */
export function createRouter(routes, fallback, options = {}) {
  const compiled = Object.entries(routes).map(([path, route]) => compileExplicitRoute(path, route));
  return createRouterCore(sortRoutes(compiled), fallback, options);
}

/**
 * Build the router state and navigation for a compiled route table. Shared by `createRouter` and `createFileRouter`.
 *
 * @param {object[]} routeTable Ranked compiled routes.
 * @param {(() => Node) | undefined} fallback
 * @param {object} options
 * @returns {object}
 */
function createRouterCore(routeTable, fallback, options = {}) {
  const { mode = "hash", beforeEach, onError, base: baseOption, labels: labelOptions } = options;
  const labels = resolveLabels(labelOptions);
  // The default not-found view takes its text from `labels`; a custom fallback replaces it entirely.
  const renderFallback =
    fallback ?? (() => createCenteredStatus(labels.notFound, "nodula-router-not-found"));
  if (mode !== "hash" && mode !== "history") throw new Error(`Unsupported router mode: ${mode}`);
  if (beforeEach !== undefined && typeof beforeEach !== "function")
    throw new TypeError("Router beforeEach must be a function.");
  if (onError !== undefined && typeof onError !== "function")
    throw new TypeError("Router onError must be a function.");
  if (baseOption !== undefined) {
    if (mode !== "history") throw new TypeError("Router base is only supported in history mode.");
    if (typeof baseOption !== "string" || !baseOption.startsWith("/"))
      throw new TypeError('Router base must be a path starting with "/".');
  }
  // "/app/" and "/app" both serve the app under /app; "/" means no base.
  const base = baseOption?.replace(/\/+$/, "") ?? "";
  /**
   * Whether a pathname is inside the router base path.
   *
   * @param {string} pathname
   * @returns {boolean}
   */
  const isUnderBase = (pathname) =>
    !base || pathname === base || pathname.startsWith(`${base}/`);
  // Paths outside the base are left as-is; the host should only serve the app under its base.
  /**
   * Remove the base path from a pathname, so routes match app-relative paths.
   *
   * @param {string} pathname
   * @returns {string}
   */
  const stripBase = (pathname) =>
    base && isUnderBase(pathname) ? pathname.slice(base.length) || "/" : pathname;
  // A hash route may carry its own query string (#/a?x=1); it is not part of the route path.
  /**
   * The route path from a hash, without its query string.
   *
   * @param {string} hash Including the leading `#`.
   * @returns {string}
   */
  const hashPath = (hash) => hash.slice(1).split("?")[0] || "/";

  /**
   * The current route path, from the pathname (history) or the hash.
   *
   * @returns {string}
   */
  const readPath = () =>
    mode === "history" ? stripBase(window.location.pathname) : hashPath(window.location.hash);
  const initialPath = readPath();
  const [current, setCurrent] = signal(initialPath);
  const [navigationPending, setNavigationPending] = signal(Boolean(beforeEach));
  const [canRender, setCanRender] = signal(!beforeEach);
  const [loadError, writeLoadError] = signal(null);
  // Plain mirror so the route effect can clear a failure without subscribing to it.
  let hasLoadError = false;
  /**
   * Store the current lazy-load failure, or clear it with null.
   *
   * @param {{ error: unknown, context: object } | null} value
   */
  const setLoadError = (value) => {
    hasLoadError = value !== null;
    writeLoadError(value);
  };
  let active = true;
  let navigationId = 0;
  let acceptedLocation = window.location.href;
  let currentHref = window.location.href;
  // The last route that rendered completely; a later load failure restores it.
  let lastLoaded = null;
  let restoring = false;
  let errorView = null;

  /**
   * Record the current route path and URL.
   *
   * @param {string} path
   * @param {string} href
   */
  function setLocation(path, href) {
    currentHref = href;
    setCurrent(path);
  }

  /**
   * Find the route that matches a path.
   *
   * @param {string} path
   * @returns {{ route: object, params: Record<string, string> } | null}
   */
  function resolve(path) {
    const parts = splitPath(path);
    if (!parts) return null;
    for (const route of routeTable) {
      const params = matchSegments(route.segments, parts);
      if (params) return { route, params };
    }
    return null;
  }

  /**
   * Record a lazy-load failure and show the result. After a successful route, the previous route is restored.
   *
   * @param {string} path Route being loaded.
   * @param {unknown} error
   * @param {object} entry The failed route entry.
   */
  function handleLoadFailure(path, error, entry) {
    if (!active || current() !== path) return;
    const context = { to: path };
    if (lastLoaded) context.from = lastLoaded.path;
    if (entry.file) context.file = entry.file;
    setLoadError({ error, context });
    const node = onError ? onError(error, context) : undefined;
    if (!onError) console.error(`Router: failed to load route "${path}".`, error);

    if (lastLoaded && lastLoaded.path !== path) {
      restoring = true;
      acceptedLocation = lastLoaded.href;
      if (window.location.href !== lastLoaded.href)
        window.history.replaceState(null, "", lastLoaded.href);
      setLocation(lastLoaded.path, lastLoaded.href);
      return;
    }
    errorView = node instanceof Node ? { path, node } : null;
  }

  effect(() => {
    if (!canRender()) return;
    const path = current();
    // Keep the failure visible after restoring; any other navigation clears it.
    if (restoring) restoring = false;
    else if (hasLoadError) setLoadError(null);
    const matched = resolve(path);
    if (!matched) return;
    // A failed entry is not cached, so visiting its route again retries the load.
    for (const entry of matched.route.entries)
      entry.load((error) => handleLoadFailure(path, error, entry));
  });

  /**
   * Render the view for a path: the route, its loading state, its error view, or the fallback.
   *
   * @param {string} path
   * @returns {Node}
   */
  function renderRoute(path) {
    const matched = resolve(path);
    if (!matched) return renderFallback();
    const { entries } = matched.route;
    if (entries.some((entry) => entry.error()))
      return errorView?.path === path
        ? errorView.node
        : createCenteredStatus(labels.loadFailed, "nodula-router-load-failed");
    if (entries.some((entry) => !entry.component())) return document.createTextNode("");
    lastLoaded = { path, href: currentHref };
    return matched.route.render(matched.params);
  }

  /**
   * Resolve a navigation target to a route path and absolute URL.
   *
   * @param {string} path Same-origin path, or an absolute URL on this origin.
   * @returns {{ path: string, href: string }}
   * @throws {TypeError} For an empty or non-string path.
   * @throws {Error} For a cross-origin path.
   */
  function parseTarget(path) {
    if (typeof path !== "string" || !path.trim())
      throw new TypeError("Router paths must be non-empty strings.");
    // App paths ("/about") are relative to the base; full URLs already include it.
    const isAppPath = path.startsWith("/") && !path.startsWith("//");
    const url = new URL(base && isAppPath ? base + path : path, window.location.href);
    if (url.origin !== window.location.origin || !["http:", "https:"].includes(url.protocol)) {
      throw new Error(`Cannot navigate outside this origin: ${path}`);
    }
    if (mode === "hash") {
      if (path.startsWith("#")) url.hash = path;
      else if (path.startsWith("/")) url.hash = path;
      return { path: hashPath(url.hash), href: url.href };
    }
    return { path: stripBase(url.pathname), href: url.href };
  }

  /**
   * Handle a browser back, forward or hash change by running the guards for the new location.
   */
  function syncPath() {
    const path = readPath();
    if (!beforeEach) {
      setLocation(path, window.location.href);
      return;
    }
    const target = parseTarget(window.location.href);
    if (target.href === acceptedLocation) return;
    requestGuard(target, { fromBrowser: true });
  }

  /**
   * Make a target the current route and update the browser URL.
   *
   * @param {{ path: string, href: string }} target
   * @param {{ fromBrowser?: boolean, replace?: boolean }} [options]
   */
  function commit(target, { fromBrowser = false, replace = false } = {}) {
    setLocation(target.path, target.href);
    setCanRender(true);
    setNavigationPending(false);
    acceptedLocation = target.href;

    if (fromBrowser) {
      if (window.location.href !== target.href) window.history.replaceState(null, "", target.href);
      return;
    }
    if (window.location.href === target.href) return;
    if (replace) window.history.replaceState(null, "", target.href);
    else if (mode === "history") window.history.pushState(null, "", target.href);
    else window.location.hash = new URL(target.href).hash;
  }

  /**
   * Run `beforeEach` for a target, following redirects, until it is allowed, cancelled, or superseded.
   *
   * A redirect loop and an invalid guard result are reported as guard failures.
   *
   * @param {{ path: string, href: string }} initialTarget
   * @param {string} from Current route path.
   * @param {number} id Navigation id; a newer navigation cancels this one.
   * @param {object} [optionsForNavigation]
   */
  async function runGuards(initialTarget, from, id, optionsForNavigation = {}) {
    let target = initialTarget;
    const visited = new Set();
    setNavigationPending(true);

    try {
      while (active && id === navigationId) {
        if (visited.has(target.href))
          throw new Error(`Router guard redirect loop at ${target.path}.`);
        visited.add(target.href);
        const result = await beforeEach({ to: target.path, from });
        if (!active || id !== navigationId) return;

        if (result === false) {
          setNavigationPending(false);
          if (optionsForNavigation.fromBrowser && canRender()) {
            window.history.replaceState(null, "", acceptedLocation);
          }
          return;
        }
        if (typeof result === "string") {
          const redirect = parseTarget(result);
          if (redirect.path === target.path) {
            commit(target, optionsForNavigation);
            return;
          }
          target = redirect;
          continue;
        }
        if (result !== undefined && result !== true) {
          throw new TypeError(
            "Router beforeEach must return true, false, a redirect path, or void.",
          );
        }

        commit(target, optionsForNavigation);
        return;
      }
    } catch (error) {
      if (active && id === navigationId) {
        setNavigationPending(false);
        if (optionsForNavigation.fromBrowser && canRender()) {
          window.history.replaceState(null, "", acceptedLocation);
        }
        console.error("Router navigation guard failed:", error);
      }
    }
  }

  /**
   * Start a guarded navigation, superseding any that is still running.
   *
   * @param {{ path: string, href: string }} target
   * @param {object} [optionsForNavigation]
   */
  function requestGuard(target, optionsForNavigation = {}) {
    const id = ++navigationId;
    void runGuards(target, current(), id, optionsForNavigation);
  }

  /**
   * Navigate to a same-origin path.
   *
   * @param {string} path
   * @throws {TypeError} For an empty or non-string path.
   * @throws {Error} For a cross-origin path.
   */
  function navigate(path) {
    const target = parseTarget(path);
    if (!beforeEach) {
      if (mode === "hash") window.location.hash = path;
      else {
        if (window.location.href !== target.href) window.history.pushState(null, "", target.href);
        setLocation(target.path, target.href);
      }
      return;
    }
    if (target.href === acceptedLocation && canRender() && !navigationPending()) return;
    requestGuard(target);
  }

  const eventName = mode === "history" ? "popstate" : "hashchange";
  window.addEventListener(eventName, syncPath);

  /**
   * In history mode, handle an ordinary click on a same-origin link through the router instead of a page load.
   *
   * @param {MouseEvent} event
   */
  function interceptLink(event) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = event.target instanceof window.Element ? event.target.closest("a[href]") : null;
    if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
    const url = new URL(link.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      !["http:", "https:"].includes(url.protocol) ||
      !isUnderBase(url.pathname) ||
      (stripBase(url.pathname) === current() && url.search === window.location.search && url.hash)
    )
      return;
    event.preventDefault();
    navigate(url.href);
  }

  if (mode === "history") document.addEventListener("click", interceptLink, true);
  onCleanup(() => {
    active = false;
    navigationId += 1;
    window.removeEventListener(eventName, syncPath);
    if (mode === "history") document.removeEventListener("click", interceptLink, true);
  });

  if (beforeEach) requestGuard(parseTarget(window.location.href), { fromBrowser: true });

  return {
    mode,
    base,
    current,
    navigationPending,
    canRender,
    loadError,
    view: () => {
      if (!canRender()) {
        return document.createTextNode(
          navigationPending() ? labels.checking : labels.navigationBlocked,
        );
      }
      return renderRoute(current());
    },
    navigate,
  };
}

// Accept eager modules or lazy import functions from a Vite import.meta.glob map.
export function createFileRouter(files, fallback, options) {
  const routes = [];
  const layouts = new Map();

  /**
   * Create a route entry from a file module or a lazy loader.
   *
   * @param {string} file Module path, used in error messages.
   * @param {unknown} source Module object, or a function that loads it.
   * @returns {object}
   * @throws {Error} If an eager module has no default component.
   */
  function entry(file, source) {
    if (typeof source === "function")
      return createEntry({ load: source, label: `Route file ${file}`, file });
    if (typeof source?.default !== "function")
      throw new Error(`Route file must export a component: ${file}`);
    return createEntry({ component: source.default, file });
  }

  for (const [file, module] of Object.entries(files)) {
    const match = file.match(/(?:^|\/)routes\/(.+)\.page$/);
    const relative = match?.[1];
    if (!relative) throw new Error(`Unsupported route file: ${file}`);
    const segments = relative.split("/");
    const name = segments.at(-1);
    /**
     * Whether a file-route path part is a static or one-segment parameter name.
     *
     * @param {string} part
     * @returns {boolean}
     */
    const isSegment = (part) => /^[\w-]+$|^\[[a-zA-Z_$][\w$]*\]$/.test(part);
    /**
     * Whether a file-route path part is a terminal `[...name]` catch-all.
     *
     * @param {string} part
     * @returns {boolean}
     */
    const isCatchAll = (part) => /^\[\.\.\.[a-zA-Z_$][\w$]*\]$/.test(part);
    if (
      segments.some(
        (part, index) =>
          part !== "layout" &&
          part !== "index" &&
          !isSegment(part) &&
          !(isCatchAll(part) && index === segments.length - 1),
      )
    ) {
      throw new Error(`Unsupported route file: ${file}`);
    }
    if (name === "layout") {
      const directory = segments.slice(0, -1).join("/");
      if (layouts.has(directory)) throw new Error(`Duplicate route layout: ${directory || "/"}`);
      layouts.set(directory, entry(file, module));
      continue;
    }
    if (segments.at(-1) === "index") segments.pop();
    const directories = [""];
    const folders = relative.split("/").slice(0, -1);
    for (let index = 0; index < folders.length; index += 1) {
      directories.push(folders.slice(0, index + 1).join("/"));
    }
    routes.push({
      path: `/${segments.join("/")}`,
      segments: segments.map((segment) => {
        const named = segment.match(/^\[(\.\.\.)?([a-zA-Z_$][\w$]*)\]$/);
        if (!named) return { type: "static", value: segment };
        return { type: named[1] ? "rest" : "param", name: named[2] };
      }),
      directories,
      page: entry(file, module),
    });
  }

  // Layouts are resolved after discovery, so file order in the glob map does not matter.
  for (const route of routes) {
    const chain = route.directories.map((directory) => layouts.get(directory)).filter(Boolean);
    route.entries = [route.page, ...chain];
    route.render = (params) => {
      let node = route.page.component()({ params });
      for (const layout of [...chain].reverse())
        node = layout.component()({ params, children: node });
      return node;
    };
  }

  return createRouterCore(sortRoutes(routes), fallback, options);
}
