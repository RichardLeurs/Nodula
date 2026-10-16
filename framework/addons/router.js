/* Provide History/Hash routing and optional Vite-discovered file routes. */
import { effect, onCleanup, signal } from "nodula-framework";

function createCenteredStatus(message) {
  const element = document.createElement("div");
  element.textContent = message;
  Object.assign(element.style, {
    display: "grid",
    minHeight: "100vh",
    placeItems: "center",
    textAlign: "center",
  });
  return element;
}

function createDefaultFallback() {
  return createCenteredStatus("Page not found");
}

export function createRouter(routes, fallback = createDefaultFallback, options = {}) {
  const { mode = "hash", beforeEach } = options;
  if (mode !== "hash" && mode !== "history") throw new Error(`Unsupported router mode: ${mode}`);
  if (beforeEach !== undefined && typeof beforeEach !== "function")
    throw new TypeError("Router beforeEach must be a function.");

  const readPath = () =>
    mode === "history" ? window.location.pathname : window.location.hash.slice(1) || "/";
  const initialPath = readPath();
  const [current, setCurrent] = signal(initialPath);
  const [navigationPending, setNavigationPending] = signal(Boolean(beforeEach));
  const [canRender, setCanRender] = signal(!beforeEach);
  let active = true;
  let navigationId = 0;
  let acceptedLocation = window.location.href;
  const routeStates = new Map();

  function routeStateFor(path) {
    let routeState = routeStates.get(path);
    if (!routeState) {
      routeState = signal({ status: "idle", component: null });
      routeStates.set(path, routeState);
    }
    return routeState;
  }

  effect(() => {
    if (!canRender()) return;
    const path = current();
    const route = routes[path];
    if (!route || typeof route === "function") return;
    if (typeof route.load !== "function") {
      throw new TypeError(
        `Router route "${path}" must be a component or a lazy route with a load function.`,
      );
    }

    const [readState, writeState] = routeStateFor(path);
    if (readState().status !== "idle") return;
    writeState({ status: "loading", component: null });
    Promise.resolve()
      .then(() => route.load())
      .then((loaded) => {
        const component = typeof loaded === "function" ? loaded : loaded?.default;
        if (typeof component !== "function") {
          throw new TypeError(
            `Lazy route "${path}" must resolve to a component or a module with a default component export.`,
          );
        }
        if (active) writeState({ status: "loaded", component });
      })
      .catch((error) => {
        if (!active) return;
        console.error(`Router: failed to load route "${path}".`, error);
        writeState({ status: "error", component: null });
      });
  });

  function renderRoute(path) {
    const route = routes[path];
    if (!route) return fallback();
    if (typeof route === "function") return route();
    if (typeof route.load !== "function") {
      throw new TypeError(
        `Router route "${path}" must be a component or a lazy route with a load function.`,
      );
    }

    const [readState] = routeStateFor(path);
    const state = readState();
    if (state.status === "loaded") return state.component(route.context);
    if (state.status === "error") return createCenteredStatus("Could not load this page.");
    return document.createTextNode("");
  }

  function parseTarget(path) {
    if (typeof path !== "string" || !path.trim())
      throw new TypeError("Router paths must be non-empty strings.");
    const url = new URL(path, window.location.href);
    if (url.origin !== window.location.origin || !["http:", "https:"].includes(url.protocol)) {
      throw new Error(`Cannot navigate outside this origin: ${path}`);
    }
    if (mode === "hash") {
      if (path.startsWith("#")) url.hash = path;
      else if (path.startsWith("/")) url.hash = path;
      return { path: url.hash.slice(1) || "/", href: url.href };
    }
    return { path: url.pathname, href: url.href };
  }

  function syncPath() {
    const path = readPath();
    if (!beforeEach) {
      setCurrent(path);
      return;
    }
    const target = parseTarget(window.location.href);
    if (target.href === acceptedLocation) return;
    requestGuard(target, { fromBrowser: true });
  }

  function commit(target, { fromBrowser = false, replace = false } = {}) {
    setCurrent(target.path);
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

  function requestGuard(target, optionsForNavigation = {}) {
    const id = ++navigationId;
    void runGuards(target, current(), id, optionsForNavigation);
  }

  function navigate(path) {
    const target = parseTarget(path);
    if (!beforeEach) {
      if (mode === "hash") window.location.hash = path;
      else {
        if (window.location.href !== target.href) window.history.pushState(null, "", target.href);
        setCurrent(target.path);
      }
      return;
    }
    if (target.href === acceptedLocation && canRender() && !navigationPending()) return;
    requestGuard(target);
  }

  const eventName = mode === "history" ? "popstate" : "hashchange";
  window.addEventListener(eventName, syncPath);

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
      (url.pathname === current() && url.search === window.location.search && url.hash)
    )
      return;
    event.preventDefault();
    navigate(url.pathname + url.search + url.hash);
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
    current,
    navigationPending,
    canRender,
    view: () => {
      if (!canRender())
        return document.createTextNode(
          navigationPending() ? "Checking route…" : "Navigation blocked.",
        );
      return renderRoute(current());
    },
    navigate,
  };
}

// Accept eager modules or lazy import functions from a Vite import.meta.glob map.
export function createFileRouter(files, fallback, options) {
  const pages = [];
  const layouts = new Map();
  const patterns = new Set();
  let active = true;

  function entry(file, source) {
    const [readComponent, setComponent] = signal(null);
    const [readError, setError] = signal(null);
    let pending = null;
    if (typeof source !== "function") {
      if (typeof source?.default !== "function")
        throw new Error(`Route file must export a component: ${file}`);
      setComponent(() => source.default);
    }
    return {
      component: readComponent,
      error: readError,
      load() {
        if (readComponent() || pending || !active || typeof source !== "function") return;
        setError(null);
        try {
          pending = Promise.resolve(source())
            .then((loaded) => {
              if (typeof loaded?.default !== "function")
                throw new Error(`Route file must export a component: ${file}`);
              if (active) setComponent(() => loaded.default);
            })
            .catch((error) => {
              if (active) setError(error);
            })
            .finally(() => {
              pending = null;
            });
        } catch (error) {
          setError(error);
        }
      },
    };
  }

  for (const [file, module] of Object.entries(files)) {
    const match = file.match(/(?:^|\/)routes\/(.+)\.page$/);
    const relative = match?.[1];
    if (!relative) throw new Error(`Unsupported route file: ${file}`);
    const segments = relative.split("/");
    const name = segments.at(-1);
    if (
      segments.some(
        (part) =>
          part !== "layout" && part !== "index" && !/^[\w-]+$|^\[[a-zA-Z_$][\w$]*\]$/.test(part),
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
    const path = `/${segments.join("/")}`;
    const pattern = path.replace(/\[[^/]+\]/g, "[]");
    if (patterns.has(pattern)) throw new Error(`Duplicate route path: ${path}`);
    patterns.add(pattern);
    const parts = segments.map((segment) => segment.match(/^\[([a-zA-Z_$][\w$]*)\]$/)?.[1] ?? null);
    const directories = [""];
    const folders = relative.split("/").slice(0, -1);
    for (let index = 0; index < folders.length; index += 1) {
      directories.push(folders.slice(0, index + 1).join("/"));
    }
    pages.push({ segments, parts, directories, page: entry(file, module) });
  }
  pages.sort((left, right) => {
    for (let index = 0; index < Math.min(left.segments.length, right.segments.length); index += 1) {
      if (Boolean(left.parts[index]) !== Boolean(right.parts[index]))
        return left.parts[index] ? 1 : -1;
    }
    return right.segments.length - left.segments.length;
  });

  function matchRoute(path) {
    if (path !== "/" && (!path.startsWith("/") || path.endsWith("/") || path.includes("//")))
      return null;
    const segments = path.split("/").filter(Boolean);
    for (const page of pages) {
      if (page.segments.length !== segments.length) continue;
      const params = Object.create(null);
      let matches = true;
      for (let index = 0; index < segments.length; index += 1) {
        if (page.parts[index]) {
          try {
            params[page.parts[index]] = decodeURIComponent(segments[index]);
          } catch {
            matches = false;
            break;
          }
        } else if (page.segments[index] !== segments[index]) {
          matches = false;
          break;
        }
      }
      if (matches)
        return {
          page,
          params,
          chain: page.directories.map((directory) => layouts.get(directory)).filter(Boolean),
        };
    }
    return null;
  }

  const routeMap = new Proxy(
    {},
    {
      get: (_, path) => {
        if (typeof path !== "string") return undefined;
        const matched = matchRoute(path);
        if (!matched) return undefined;
        return () => {
          const entries = [matched.page.page, ...matched.chain];
          if (entries.some((item) => item.error()))
            return createCenteredStatus("Could not load this page.");
          if (entries.some((item) => !item.component())) return document.createTextNode(" ");
          let node = matched.page.page.component()({ params: matched.params });
          for (const layout of [...matched.chain].reverse())
            node = layout.component()({ params: matched.params, children: node });
          return node;
        };
      },
    },
  );
  const router = createRouter(routeMap, fallback, options);
  effect(() => {
    if (!router.canRender()) return;
    const path = router.current();
    const matched = matchRoute(path);
    if (!matched && path !== "/") {
      router.navigate("/");
      return;
    }
    if (matched) for (const item of [matched.page.page, ...matched.chain]) item.load();
  });
  onCleanup(() => {
    active = false;
  });
  return router;
}
