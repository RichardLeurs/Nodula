import { effect, signal } from 'nodula-framework';

const HTTP_PROTOCOLS = new Set(['http:', 'https:']);

function assertRecord(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
}

function readValue(value) {
  return typeof value === 'function' ? value() : value;
}

function normalizePath(path) {
  const pathname = String(path).split(/[?#]/, 1)[0] || '/';
  if (!pathname.startsWith('/')) return `/${pathname}`;
  return pathname.replace(/\/{2,}/g, '/');
}

function compileRoutePattern(pattern) {
  if (typeof pattern !== 'string' || !pattern.startsWith('/')) {
    throw new TypeError(`SEO route patterns must start with '/': ${String(pattern)}`);
  }
  const names = [];
  const segments = normalizePath(pattern).split('/').filter(Boolean);
  const source = segments.map((segment) => {
    const parameter = segment.match(/^:([\w$]+)$|^\[([\w$]+)\]$/);
    if (parameter) {
      names.push(parameter[1] ?? parameter[2]);
      return '([^/]+)';
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return {
    pattern,
    names,
    regex: new RegExp(`^/${source}/?$`),
    staticSegments: segments.length - names.length,
  };
}

function resolveRoute(path, routes) {
  for (const route of routes) {
    const match = route.regex.exec(path);
    if (!match) continue;
    const params = Object.create(null);
    for (let index = 0; index < route.names.length; index += 1) {
      try {
        params[route.names[index]] = decodeURIComponent(match[index + 1]);
      } catch {
        params[route.names[index]] = match[index + 1];
      }
    }
    return { route, params };
  }
  return null;
}

function resolveField(value) {
  return readValue(value);
}

function resolveMetadata(metadata) {
  if (metadata == null) return {};
  if (typeof metadata === 'function') metadata = metadata();
  assertRecord(metadata, 'SEO metadata');
  const resolved = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (key === 'openGraph' && value && typeof value === 'object') {
      resolved.openGraph = Object.fromEntries(Object.entries(value).map(([field, fieldValue]) => [field, resolveField(fieldValue)]));
    } else if (key === 'hreflang' && Array.isArray(value)) {
      resolved.hreflang = value.map((entry) => ({
        lang: resolveField(entry.lang),
        href: resolveField(entry.href),
      }));
    } else {
      resolved[key] = resolveField(value);
    }
  }
  return resolved;
}

function createCanonicalURL(siteUrl, path) {
  const base = new URL(siteUrl ?? window.location.origin, window.location.href);
  if (!HTTP_PROTOCOLS.has(base.protocol)) throw new TypeError('SEO siteUrl must use HTTP or HTTPS.');
  const canonical = new URL(path, base.origin);
  canonical.search = '';
  canonical.hash = '';
  return canonical.href;
}

function makeHeadManager(head) {
  const records = new Map();

  function snapshot(element) {
    return {
      element,
      parent: element.parentNode,
      nextSibling: element.nextSibling,
      attributes: [...element.attributes].map(({ name, value }) => [name, value]),
      text: element.textContent,
    };
  }

  function getRecord(key, tagName, findMatches) {
    if (records.has(key)) return records.get(key);
    const matches = findMatches();
    const originals = matches.map(snapshot);
    const element = matches[0] ?? document.createElement(tagName);
    const record = { element, created: matches.length === 0, originals, managedAttributes: new Set(), active: false };
    if (record.created) head.append(element);
    for (const duplicate of matches.slice(1)) duplicate.remove();
    records.set(key, record);
    return record;
  }

  function set(key, tagName, findMatches, attributes, text) {
    const record = getRecord(key, tagName, findMatches);
    record.active = true;
    if (!record.element.parentNode) head.append(record.element);
    for (const duplicate of record.originals.slice(1)) duplicate.element.remove();
    record.element.setAttribute('data-nodula-seo', key);
    const nextAttributes = new Set([...Object.keys(attributes), 'data-nodula-seo']);
    for (const name of record.managedAttributes) {
      if (!nextAttributes.has(name)) record.element.removeAttribute(name);
    }
    for (const [name, value] of Object.entries(attributes)) {
      record.element.setAttribute(name, String(value));
    }
    record.managedAttributes = nextAttributes;
    if (text !== undefined) record.element.textContent = String(text);
    return record;
  }

  function deactivateExcept(activeKeys) {
    for (const [key, record] of records) {
      if (activeKeys.has(key)) continue;
      record.active = false;
      restoreRecord(record);
    }
  }

  function restoreRecord(record) {
    if (record.created) {
      record.element.remove();
      return;
    }
    for (const original of record.originals) {
      if (original.element !== record.element) continue;
      for (const attribute of [...record.element.attributes]) record.element.removeAttribute(attribute.name);
      for (const [name, value] of original.attributes) record.element.setAttribute(name, value);
      record.element.textContent = original.text;
    }
    for (const original of [...record.originals].reverse()) {
      if (!original.parent) continue;
      const before = original.nextSibling?.parentNode === original.parent ? original.nextSibling : null;
      original.parent.insertBefore(original.element, before);
    }
  }

  function restore() {
    for (const record of [...records.values()].reverse()) restoreRecord(record);
    records.clear();
  }

  return { set, deactivateExcept, restore };
}

function validateMetadata(metadata, name) {
  if (typeof metadata === 'function') return;
  assertRecord(metadata, name);
  if (metadata.openGraph != null) assertRecord(metadata.openGraph, `${name}.openGraph`);
  if (metadata.hreflang != null && !Array.isArray(metadata.hreflang)) {
    throw new TypeError(`${name}.hreflang must be an array.`);
  }
}

/** Keep client-rendered document metadata synchronized with a Nodula router. */
export function createSEO(router, options = {}) {
  if (!router || typeof router.current !== 'function' || typeof router.navigate !== 'function') {
    throw new TypeError('createSEO expects a Nodula router.');
  }
  assertRecord(options, 'createSEO options');
  if (typeof document === 'undefined' || !document.head) {
    throw new Error('createSEO requires a document with a head element.');
  }

  const defaults = options.defaults ?? {};
  validateMetadata(defaults, 'createSEO defaults');
  const routeEntries = options.routes ?? {};
  assertRecord(routeEntries, 'createSEO routes');
  const routes = Object.entries(routeEntries).map(([pattern, metadata]) => {
    if (typeof metadata !== 'function') {
      validateMetadata(metadata, `createSEO routes[${JSON.stringify(pattern)}]`);
    }
    return { ...compileRoutePattern(pattern), metadata };
  }).sort((left, right) => right.staticSegments - left.staticSegments || right.names.length - left.names.length);

  if (options.siteUrl !== undefined) {
    if (typeof options.siteUrl !== 'string') throw new TypeError('createSEO siteUrl must be a URL string.');
    const site = new URL(options.siteUrl);
    if (!HTTP_PROTOCOLS.has(site.protocol)) throw new TypeError('createSEO siteUrl must use HTTP or HTTPS.');
  }

  const manager = makeHeadManager(document.head);
  const [revision, setRevision] = signal(0);
  let pageOverride = null;
  let currentPath;
  let disposed = false;

  function findTag(tagName, attribute, value) {
    return () => [...document.head.querySelectorAll(tagName)].filter((element) => element.getAttribute(attribute) === value);
  }

  function applyMetadata() {
    const path = normalizePath(router.current());
    if (path !== currentPath) {
      currentPath = path;
      pageOverride = null;
    }
    revision();

    const matched = resolveRoute(path, routes);
    const context = { path, params: matched?.params ?? Object.create(null), router };
    const routeMetadata = matched
      ? typeof matched.route.metadata === 'function'
        ? matched.route.metadata(context)
        : matched.route.metadata
      : {};
    const resolvedDefaults = resolveMetadata(typeof defaults === 'function' ? defaults(context) : defaults);
    const resolvedRoute = resolveMetadata(routeMetadata);
    const resolvedOverride = resolveMetadata(pageOverride);
    const metadata = {
      ...resolvedDefaults,
      ...resolvedRoute,
      ...resolvedOverride,
      openGraph: {
        ...resolvedDefaults.openGraph,
        ...resolvedRoute.openGraph,
        ...resolvedOverride.openGraph,
      },
    };
    const canonical = metadata.canonical === undefined
      ? createCanonicalURL(options.siteUrl, path)
      : metadata.canonical;
    const og = metadata.openGraph ?? {};
    const title = metadata.title;
    const description = metadata.description;

    const activeKeys = new Set();
    const set = (key, tagName, finder, attributes, text) => {
      activeKeys.add(key);
      manager.set(key, tagName, finder, attributes, text);
    };

    if (title != null) set('title', 'title', () => [...document.head.querySelectorAll('title')], {}, title);
    if (description != null) set('description', 'meta', findTag('meta', 'name', 'description'), { name: 'description', content: description });

    if (canonical != null) set('canonical', 'link', findTag('link[rel="canonical"]', 'rel', 'canonical'), { rel: 'canonical', href: canonical });
    if (metadata.robots != null) set('robots', 'meta', findTag('meta', 'name', 'robots'), { name: 'robots', content: metadata.robots });

    const openGraphValues = {
      'og:title': og.title ?? title,
      'og:description': og.description ?? description,
      'og:url': og.url ?? canonical,
      'og:type': og.type ?? 'website',
      'og:image': og.image,
      'og:site_name': og.siteName,
      'og:locale': og.locale,
    };
    for (const [property, content] of Object.entries(openGraphValues)) {
      if (content != null) set(property, 'meta', findTag('meta', 'property', property), { property, content });
    }

    const languages = Array.isArray(metadata.hreflang) ? metadata.hreflang : [];
    for (const entry of languages) {
      if (!entry || typeof entry.lang !== 'string' || typeof entry.href !== 'string') continue;
      const key = `hreflang:${entry.lang}`;
      set(key, 'link', () => [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')]
        .filter((element) => element.getAttribute('hreflang') === entry.lang), {
        rel: 'alternate',
        hreflang: entry.lang,
        href: entry.href,
      });
    }

    manager.deactivateExcept(activeKeys);
  }

  const stopEffect = effect(applyMetadata);

  return {
    /** Replace the current route metadata with additional page-local metadata. */
    update(metadata) {
      if (disposed) throw new Error('Cannot update disposed SEO metadata.');
      validateMetadata(metadata, 'SEO update');
      pageOverride = { ...pageOverride, ...metadata };
      setRevision((value) => value + 1);
    },
    /** Remove listeners/effects and restore the head elements as they were. */
    dispose() {
      if (disposed) return;
      disposed = true;
      stopEffect();
      manager.restore();
    },
  };
}