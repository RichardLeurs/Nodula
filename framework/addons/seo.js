// Nodula javascript framework, see https://nodula.richardleurs.nl/  | Copyright © Richard Leurs 2026 | GNU General Public License v3

/* Manage accessible, route-aware document metadata in the browser. */
import { effect, signal } from "nodula-framework";

const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Throw a TypeError unless `value` is a plain object.
 *
 * @param {unknown} value
 * @param {string} name Option name, used in the message.
 */
function assertRecord(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
}

/**
 * Return a metadata value, calling it first when it is a function or accessor.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function readValue(value) {
  return typeof value === "function" ? value() : value;
}

/**
 * Normalize a route path: drop the query and hash, add a leading `/`, and collapse repeated slashes.
 *
 * @param {string} path
 * @returns {string}
 */
function normalizePath(path) {
  const pathname = String(path).split(/[?#]/, 1)[0] || "/";
  if (!pathname.startsWith("/")) return `/${pathname}`;
  return pathname.replace(/\/{2,}/g, "/");
}

/**
 * Compile a route pattern, such as `/docs/:id` or `/docs/*path`, to a regular expression.
 *
 * @param {string} pattern
 * @returns {{ pattern: string, names: string[], ranks: number[], regex: RegExp }}
 * @throws {TypeError} If the pattern does not start with `/`.
 */
function compileRoutePattern(pattern) {
  if (typeof pattern !== "string" || !pattern.startsWith("/")) {
    throw new TypeError(`SEO route patterns must start with '/': ${String(pattern)}`);
  }
  const names = [];
  const segments = normalizePath(pattern).split("/").filter(Boolean);
  // 0 static, 1 parameter, 2 catch-all; used to rank patterns like the router does.
  const ranks = [];
  let restName = null;
  const source = segments
    .map((segment, index) => {
      const catchAll = segment.match(/^\*([\w$]+)$|^\[\.\.\.([\w$]+)\]$/);
      if (catchAll) {
        if (index !== segments.length - 1)
          throw new TypeError(`SEO route catch-all segment must be last: ${pattern}`);
        restName = catchAll[1] ?? catchAll[2];
        names.push(restName);
        ranks.push(2);
        // Lazy, so an optional trailing slash is not captured into the value.
        return "(.+?)";
      }
      const parameter = segment.match(/^:([\w$]+)$|^\[([\w$]+)\]$/);
      ranks.push(parameter ? 1 : 0);
      if (parameter) {
        names.push(parameter[1] ?? parameter[2]);
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return { pattern, names, restName, ranks, regex: new RegExp(`^/${source}/?$`) };
}

/** Static beats parameter beats catch-all, compared left to right, so `/a/:b` wins over `/:a/b`. */
function compareRoutes(left, right) {
  const length = Math.min(left.ranks.length, right.ranks.length);
  for (let index = 0; index < length; index += 1) {
    const difference = left.ranks[index] - right.ranks[index];
    if (difference) return difference;
  }
  return right.ranks.length - left.ranks.length;
}

/**
 * Find the first route pattern that matches a path, and its decoded parameters.
 *
 * @param {string} path
 * @param {object[]} routes Compiled and ranked route patterns.
 * @returns {{ route: object, params: Record<string, string> } | null}
 */
function resolveRoute(path, routes) {
  for (const route of routes) {
    const match = route.regex.exec(path);
    if (!match) continue;
    const params = Object.create(null);
    /**
     * Decode a URI component, keeping the raw text if it is malformed.
     */
    const decode = (value) => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };
    for (let index = 0; index < route.names.length; index += 1) {
      const name = route.names[index];
      const value = match[index + 1];
      // Catch-all segments are decoded one by one, so an encoded `%2F` is not confused with a separator.
      params[name] =
        name === route.restName ? value.split("/").map(decode).join("/") : decode(value);
    }
    return { route, params };
  }
  return null;
}

/**
 * Resolve every field of a metadata object, calling accessors and functions.
 *
 * @param {object | Function | null | undefined} metadata
 * @returns {object}
 */
function resolveMetadata(metadata) {
  if (metadata == null) return {};
  if (typeof metadata === "function") metadata = metadata();
  assertRecord(metadata, "SEO metadata");
  const resolved = {};
  for (const [key, value] of Object.entries(metadata)) {
    if ((key === "openGraph" || key === "twitter") && value && typeof value === "object") {
      resolved[key] = Object.fromEntries(
        Object.entries(value).map(([field, fieldValue]) => [field, readValue(fieldValue)]),
      );
    } else if (key === "hreflang" && Array.isArray(value)) {
      resolved.hreflang = value.map((entry) => ({
        lang: readValue(entry.lang),
        href: readValue(entry.href),
      }));
    } else {
      resolved[key] = readValue(value);
    }
  }
  return resolved;
}

/**
 * Build the canonical URL for a path on the site origin, without query or fragment.
 *
 * @param {string | undefined} siteUrl Defaults to the current origin.
 * @param {string} path
 * @returns {string}
 * @throws {TypeError} If the site is not HTTP or HTTPS.
 */
function createCanonicalURL(siteUrl, path) {
  const base = new URL(siteUrl ?? window.location.origin, window.location.href);
  if (!HTTP_PROTOCOLS.has(base.protocol))
    throw new TypeError("SEO siteUrl must use HTTP or HTTPS.");
  const canonical = new URL(path, base.origin);
  canonical.search = "";
  canonical.hash = "";
  return canonical.href;
}

/**
 * Create the manager that writes SEO tags into `<head>` and restores what it changed.
 *
 * It reuses matching existing tags, removes duplicates, and returns the original elements when it is disposed.
 *
 * @param {HTMLHeadElement} head
 * @returns {{ set: Function, deactivateExcept: Function, restore: Function }}
 */
function makeHeadManager(head) {
  const records = new Map();

  /**
   * Record an element’s parent, position, attributes and text so it can be restored.
   *
   * @param {Element} element
   * @returns {object}
   */
  function snapshot(element) {
    return {
      element,
      parent: element.parentNode,
      nextSibling: element.nextSibling,
      attributes: [...element.attributes].map(({ name, value }) => [name, value]),
      text: element.textContent,
    };
  }

  /**
   * Get the record for a managed tag, creating the tag if no match exists.
   *
   * Duplicate matches are removed.
   *
   * @param {string} key
   * @param {string} tagName
   * @param {() => Element[]} findMatches
   * @returns {object}
   */
  function getRecord(key, tagName, findMatches) {
    if (records.has(key)) return records.get(key);
    const matches = findMatches();
    const originals = matches.map(snapshot);
    const element = matches[0] ?? document.createElement(tagName);
    const record = {
      element,
      created: matches.length === 0,
      originals,
      managedAttributes: new Set(),
      active: false,
    };
    if (record.created) head.append(element);
    for (const duplicate of matches.slice(1)) duplicate.remove();
    records.set(key, record);
    return record;
  }

  /**
   * Create or update a managed tag and mark it active.
   *
   * @param {string} key
   * @param {string} tagName
   * @param {() => Element[]} findMatches
   * @param {Record<string, string>} attributes
   * @param {string} [text]
   * @returns {object}
   */
  function set(key, tagName, findMatches, attributes, text) {
    const record = getRecord(key, tagName, findMatches);
    record.active = true;
    if (!record.element.parentNode) head.append(record.element);
    for (const duplicate of record.originals.slice(1)) duplicate.element.remove();
    record.element.setAttribute("data-nodula-seo", key);
    const nextAttributes = new Set([...Object.keys(attributes), "data-nodula-seo"]);
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

  /**
   * Restore every managed tag whose key is not in `activeKeys`.
   *
   * @param {Set<string>} activeKeys
   */
  function deactivateExcept(activeKeys) {
    for (const [key, record] of records) {
      if (activeKeys.has(key)) continue;
      record.active = false;
      restoreRecord(record);
    }
  }

  /**
   * Restore one managed tag to the state it had before this manager touched it.
   *
   * @param {object} record
   */
  function restoreRecord(record) {
    if (record.created) {
      record.element.remove();
      return;
    }
    for (const original of record.originals) {
      if (original.element !== record.element) continue;
      for (const attribute of Array.from(record.element.attributes))
        record.element.removeAttribute(attribute.name);
      for (const [name, value] of original.attributes) record.element.setAttribute(name, value);
      record.element.textContent = original.text;
    }
    for (const original of [...record.originals].reverse()) {
      if (!original.parent) continue;
      const before =
        original.nextSibling?.parentNode === original.parent ? original.nextSibling : null;
      original.parent.insertBefore(original.element, before);
    }
  }

  /**
   * Restore every managed tag, newest first.
   */
  function restore() {
    for (const record of [...records.values()].reverse()) restoreRecord(record);
    records.clear();
  }

  return { set, deactivateExcept, restore };
}

/**
 * Check that a metadata object or resolver has the expected shape.
 *
 * @param {unknown} metadata
 * @param {string} name Option name, used in the message.
 * @throws {TypeError}
 */
function validateMetadata(metadata, name) {
  if (typeof metadata === "function") return;
  assertRecord(metadata, name);
  if (metadata.openGraph != null) assertRecord(metadata.openGraph, `${name}.openGraph`);
  if (metadata.hreflang != null && !Array.isArray(metadata.hreflang)) {
    throw new TypeError(`${name}.hreflang must be an array.`);
  }
}

/** Keep client-rendered document metadata synchronized with a Nodula router. */
export function createSEO(router, options = {}) {
  if (!router || typeof router.current !== "function" || typeof router.navigate !== "function") {
    throw new TypeError("createSEO expects a Nodula router.");
  }
  assertRecord(options, "createSEO options");
  if (typeof document === "undefined" || !document.head) {
    throw new Error("createSEO requires a document with a head element.");
  }

  const defaults = options.defaults ?? {};
  validateMetadata(defaults, "createSEO defaults");
  const routeEntries = options.routes ?? {};
  assertRecord(routeEntries, "createSEO routes");
  const routes = Object.entries(routeEntries)
    .map(([pattern, metadata]) => {
      if (typeof metadata !== "function") {
        validateMetadata(metadata, `createSEO routes[${JSON.stringify(pattern)}]`);
      }
      return { ...compileRoutePattern(pattern), metadata };
    })
    .sort(compareRoutes);

  if (options.siteUrl !== undefined) {
    if (typeof options.siteUrl !== "string")
      throw new TypeError("createSEO siteUrl must be a URL string.");
    const site = new URL(options.siteUrl);
    if (!HTTP_PROTOCOLS.has(site.protocol))
      throw new TypeError("createSEO siteUrl must use HTTP or HTTPS.");
  }

  const manager = makeHeadManager(document.head);
  const [revision, setRevision] = signal(0);
  // Page-local overrides in call order; functions are re-read on every apply.
  let pageOverrides = [];
  let currentPath;
  let disposed = false;

  /**
   * Return a finder for the elements of `tagName` whose `attribute` equals `value`.
   *
   * @param {string} tagName
   * @param {string} attribute
   * @param {string} value
   * @returns {() => Element[]}
   */
  function findTag(tagName, attribute, value) {
    return () =>
      [...document.head.querySelectorAll(tagName)].filter(
        (element) => element.getAttribute(attribute) === value,
      );
  }

  /**
   * Resolve the metadata for the current route and write its tags. Runs whenever the route or metadata changes.
   */
  function applyMetadata() {
    const path = normalizePath(router.current());
    if (path !== currentPath) {
      currentPath = path;
      pageOverrides = [];
    }
    revision();

    const matched = resolveRoute(path, routes);
    const context = { path, params: matched?.params ?? Object.create(null), router };
    const routeMetadata = matched
      ? typeof matched.route.metadata === "function"
        ? matched.route.metadata(context)
        : matched.route.metadata
      : {};
    const resolvedDefaults = resolveMetadata(
      typeof defaults === "function" ? defaults(context) : defaults,
    );
    const resolvedRoute = resolveMetadata(routeMetadata);
    const resolvedOverride = { openGraph: {} };
    for (const override of pageOverrides) {
      const { openGraph, ...fields } = resolveMetadata(override);
      Object.assign(resolvedOverride, fields);
      Object.assign(resolvedOverride.openGraph, openGraph);
    }
    const metadata = {
      ...resolvedDefaults,
      ...resolvedRoute,
      ...resolvedOverride,
      openGraph: {
        ...resolvedDefaults.openGraph,
        ...resolvedRoute.openGraph,
        ...resolvedOverride.openGraph,
      },
      twitter:
        resolvedDefaults.twitter || resolvedRoute.twitter || resolvedOverride.twitter
          ? {
              ...resolvedDefaults.twitter,
              ...resolvedRoute.twitter,
              ...resolvedOverride.twitter,
            }
          : undefined,
    };
    const canonical =
      metadata.canonical === undefined
        ? createCanonicalURL(options.siteUrl, `${router.base ?? ""}${path}`)
        : metadata.canonical;
    const og = metadata.openGraph ?? {};
    const title = metadata.title;
    const description = metadata.description;

    const activeKeys = new Set();
    /**
     * Write one managed tag and record that it is active for this route.
     */
    const set = (key, tagName, finder, attributes, text) => {
      activeKeys.add(key);
      manager.set(key, tagName, finder, attributes, text);
    };

    if (title != null)
      set("title", "title", () => [...document.head.querySelectorAll("title")], {}, title);
    if (description != null)
      set("description", "meta", findTag("meta", "name", "description"), {
        name: "description",
        content: description,
      });
    if (metadata.keywords != null)
      set("keywords", "meta", findTag("meta", "name", "keywords"), {
        name: "keywords",
        content: metadata.keywords,
      });
    if (metadata.author != null)
      set("author", "meta", findTag("meta", "name", "author"), {
        name: "author",
        content: metadata.author,
      });

    if (canonical != null)
      set("canonical", "link", findTag('link[rel="canonical"]', "rel", "canonical"), {
        rel: "canonical",
        href: canonical,
      });
    if (metadata.robots != null)
      set("robots", "meta", findTag("meta", "name", "robots"), {
        name: "robots",
        content: metadata.robots,
      });

    const openGraphValues = {
      "og:title": og.title ?? title,
      "og:description": og.description ?? description,
      "og:url": og.url ?? canonical,
      "og:type": og.type ?? "website",
      "og:image": og.image,
      "og:site_name": og.siteName,
      "og:locale": og.locale,
    };
    for (const [property, content] of Object.entries(openGraphValues)) {
      if (content != null)
        set(property, "meta", findTag("meta", "property", property), { property, content });
    }

    // Twitter cards are opt-in: no twitter:* tags unless metadata supplies a twitter object.
    if (metadata.twitter) {
      const twitter = metadata.twitter;
      const twitterValues = {
        "twitter:card":
          twitter.card ?? (twitter.image ?? og.image ? "summary_large_image" : "summary"),
        "twitter:site": twitter.site,
        "twitter:title": twitter.title ?? og.title ?? title,
        "twitter:description": twitter.description ?? og.description ?? description,
        "twitter:image": twitter.image ?? og.image,
      };
      for (const [name, content] of Object.entries(twitterValues)) {
        if (content != null) set(name, "meta", findTag("meta", "name", name), { name, content });
      }
    }

    const languages = Array.isArray(metadata.hreflang) ? metadata.hreflang : [];
    for (const entry of languages) {
      if (!entry || typeof entry.lang !== "string" || typeof entry.href !== "string") continue;
      const key = `hreflang:${entry.lang}`;
      set(
        key,
        "link",
        () =>
          [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].filter(
            (element) => element.getAttribute("hreflang") === entry.lang,
          ),
        {
          rel: "alternate",
          hreflang: entry.lang,
          href: entry.href,
        },
      );
    }

    manager.deactivateExcept(activeKeys);
  }

  const stopEffect = effect(applyMetadata);

  return {
    /** Merge page-local metadata over the current route's metadata until the route changes. */
    update(metadata) {
      if (disposed) throw new Error("Cannot update disposed SEO metadata.");
      validateMetadata(metadata, "SEO update");
      pageOverrides = [...pageOverrides, metadata];
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
