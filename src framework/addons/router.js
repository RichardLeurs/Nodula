import { effect, onCleanup, signal } from 'nodula-framework';

export function createRouter(routes, fallback = () => document.createTextNode('Page not found'), { mode = 'hash' } = {}) {
  if (mode !== 'hash' && mode !== 'history') throw new Error(`Unsupported router mode: ${mode}`);
  const readPath = () => mode === 'history' ? window.location.pathname : window.location.hash.slice(1) || '/';
  const [current, setCurrent] = signal(readPath());
  const syncPath = () => setCurrent(readPath());

  const eventName = mode === 'history' ? 'popstate' : 'hashchange';
  window.addEventListener(eventName, syncPath);
  onCleanup(() => window.removeEventListener(eventName, syncPath));

  if (mode === 'history') {
    const interceptLink = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof window.Element ? event.target.closest('a[href]') : null;
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol) || (url.pathname === current() && url.search === window.location.search && url.hash)) return;
      event.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', interceptLink, true);
    onCleanup(() => document.removeEventListener('click', interceptLink, true));
  }

  function navigate(path) {
    if (mode === 'hash') {
      window.location.hash = path;
    } else {
      const url = new URL(path, window.location.href);
      if (url.origin !== window.location.origin || !['http:', 'https:'].includes(url.protocol)) throw new Error(`Cannot navigate outside this origin: ${path}`);
      if (url.href !== window.location.href) window.history.pushState(null, '', url.href);
      syncPath();
    }
  }

  return {
    mode,
    current,
    view: () => (routes[current()] ?? fallback)(),
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
    if (typeof source !== 'function') {
      if (typeof source?.default !== 'function') throw new Error(`Route file must export a component: ${file}`);
      setComponent(() => source.default);
    }
    return {
      component: readComponent,
      error: readError,
      load() {
        if (readComponent() || pending || !active || typeof source !== 'function') return;
        setError(null);
        try {
          pending = Promise.resolve(source()).then((loaded) => {
            if (typeof loaded?.default !== 'function') throw new Error(`Route file must export a component: ${file}`);
            if (active) setComponent(() => loaded.default);
          }).catch((error) => {
            if (active) setError(error);
          }).finally(() => { pending = null; });
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
    const segments = relative.split('/');
    const name = segments.at(-1);
    if (segments.some((part) => part !== 'layout' && part !== 'index' && !/^[\w-]+$|^\[[a-zA-Z_$][\w$]*\]$/.test(part))) {
      throw new Error(`Unsupported route file: ${file}`);
    }
    if (name === 'layout') {
      const directory = segments.slice(0, -1).join('/');
      if (layouts.has(directory)) throw new Error(`Duplicate route layout: ${directory || '/'}`);
      layouts.set(directory, entry(file, module));
      continue;
    }
    if (segments.at(-1) === 'index') segments.pop();
    const path = `/${segments.join('/')}`;
    const pattern = path.replace(/\[[^/]+\]/g, '[]');
    if (patterns.has(pattern)) throw new Error(`Duplicate route path: ${path}`);
    patterns.add(pattern);
    const parts = segments.map((segment) => segment.match(/^\[([a-zA-Z_$][\w$]*)\]$/)?.[1] ?? null);
    const directories = [''];
    const folders = relative.split('/').slice(0, -1);
    for (let index = 0; index < folders.length; index += 1) {
      directories.push(folders.slice(0, index + 1).join('/'));
    }
    pages.push({ segments, parts, directories, page: entry(file, module) });
  }
  pages.sort((left, right) => {
    for (let index = 0; index < Math.min(left.segments.length, right.segments.length); index += 1) {
      if (Boolean(left.parts[index]) !== Boolean(right.parts[index])) return left.parts[index] ? 1 : -1;
    }
    return right.segments.length - left.segments.length;
  });

  function matchRoute(path) {
    if (path !== '/' && (!path.startsWith('/') || path.endsWith('/') || path.includes('//'))) return null;
    const segments = path.split('/').filter(Boolean);
    for (const page of pages) {
      if (page.segments.length !== segments.length) continue;
      const params = Object.create(null);
      let matches = true;
      for (let index = 0; index < segments.length; index += 1) {
        if (page.parts[index]) {
          try { params[page.parts[index]] = decodeURIComponent(segments[index]); }
          catch { matches = false; break; }
        } else if (page.segments[index] !== segments[index]) {
          matches = false;
          break;
        }
      }
      if (matches) return { page, params, chain: page.directories.map((directory) => layouts.get(directory)).filter(Boolean) };
    }
    return null;
  }

  const routeMap = new Proxy({}, { get: (_, path) => {
    if (typeof path !== 'string') return undefined;
    const matched = matchRoute(path);
    if (!matched) return undefined;
    return () => {
      const entries = [matched.page.page, ...matched.chain];
      if (entries.some((item) => item.error())) return document.createTextNode('Could not load this page.');
      if (entries.some((item) => !item.component())) return document.createTextNode('Loading page…');
      let node = matched.page.page.component()({ params: matched.params });
      for (const layout of [...matched.chain].reverse()) node = layout.component()({ params: matched.params, children: node });
      return node;
    };
  } });
  const router = createRouter(routeMap, fallback, options);
  effect(() => {
    const matched = matchRoute(router.current());
    if (matched) for (const item of [matched.page.page, ...matched.chain]) item.load();
  });
  onCleanup(() => { active = false; });
  return router;
}