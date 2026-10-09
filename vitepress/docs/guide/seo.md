# SEO

Nodula provides two optional SEO integrations from separate package entries:

- `createSEO` from `nodula-framework/seo` manages document metadata as client-side routes change.
- `nodulaSEO` from `nodula-framework/seo-vite` emits a sitemap and robots file during a Vite production build.

They solve different parts of SEO. Use both when your app needs route-aware metadata and static crawler files. The client add-on updates the browser document head; it does not server-render metadata into the initial HTML. For reliable metadata in crawlers that do not execute JavaScript, serve pre-rendered or server-rendered HTML.

## Install and import

Import each integration only where needed:

```js
import { createSEO } from 'nodula-framework/seo';
import { nodulaSEO } from 'nodula-framework/seo-vite';
```

`createSEO` runs in the browser with a Nodula router. `nodulaSEO` runs in Vite's build pipeline; it requires Vite and does not run in the browser. No SEO-specific stylesheet is required.

## Route-aware metadata

Create the SEO controller once alongside your router, normally in the application root. It follows the router and updates the document title and supported head tags for the active route.

```js
import { createFileRouter } from 'nodula-framework/router';
import { createSEO } from 'nodula-framework/seo';

const router = createFileRouter(import.meta.glob('./routes/**/*.page'), undefined, {
  mode: 'history',
});

const seo = createSEO(router, {
  siteUrl: 'https://example.com',
  defaults: {
    title: 'Example App',
    description: 'A short description of this app.',
    keywords: 'example, nodula',
    author: 'Example team',
    robots: 'index, follow',
    openGraph: {
      siteName: 'Example App',
      type: 'website',
      image: 'https://example.com/social-card.png',
    },
  },
  routes: {
    '/': {
      title: 'Home | Example App',
      description: 'Welcome to Example App.',
    },
    '/products/:id': ({ params }) => ({
      title: `Product ${params.id} | Example App`,
      description: `Details for product ${params.id}.`,
      keywords: `product, ${params.id}`,
      author: 'Example catalog team',
      openGraph: { type: 'product' },
    }),
  },
});

// In the app root's cleanup:
seo.dispose();
```

### `createSEO(router, options?)`

Creates a controller that tracks a Nodula router and manages matching head elements.

| Parameter | Type | Description |
|---|---|---|
| `router` | Nodula router | Router exposing `current()` and `navigate(path)` |
| `options.siteUrl` | `string` | Optional HTTP(S) URL used as the canonical origin. Defaults to the current page origin. |
| `options.defaults` | `SEOMetadata` or resolver | Metadata applied on every route unless overridden. |
| `options.routes` | `Record<string, SEOMetadata or resolver>` | Route-pattern metadata. Supports `:id` and `[id]` parameter segments. |

A metadata resolver receives `{ path, params, router }`. `path` excludes query and fragment; `params` contains decoded route parameters. Static route patterns take precedence over parameterized patterns. Patterns must start with `/`; a trailing slash on the current path is accepted for matching.

### `SEOMetadata`

| Field | Type | Behavior |
|---|---|---|
| `title` | `string \| null \| undefined \| Accessor` | Sets document `<title>`. |
| `description` | `string \| null \| undefined \| Accessor` | Sets `meta[name="description"]`. |
| `keywords` | `string \| null \| undefined \| Accessor` | Sets `meta[name="keywords"]`. |
| `author` | `string \| null \| undefined \| Accessor` | Sets `meta[name="author"]`. |
| `canonical` | `string \| null \| undefined \| Accessor` | Sets `link[rel="canonical"]`. If the field is absent, URL is generated from the active route and `siteUrl`; query and fragment are excluded. Explicit `null` omits the tag. |
| `robots` | `string \| null \| undefined \| Accessor` | Sets `meta[name="robots"]`. |
| `openGraph` | `SEOOpenGraph` | Sets supported Open Graph tags: `title`, `description`, `url`, `type`, `image`, `siteName`, and `locale`. Title/description/URL fall back to corresponding resolved metadata; type defaults to `website`. |
| `hreflang` | `{ lang, href }[]` | Adds `link[rel="alternate"]` entries for language variants. Invalid entries without string language and href are skipped. |

Metadata fields accept signal accessors as well as static values. `defaults` and each route entry may also be resolver functions. Route metadata overrides defaults; `openGraph` fields merge by property with defaults instead of replacing the entire object. `null` or `undefined` omits an individual tag (except an absent canonical, which triggers generated canonical behavior).

The returned controller exposes:

- `seo.update(metadata)` — merges page-local overrides into metadata for the current route. Overrides reset when the route changes.
- `seo.dispose()` — stops reactive updates and restores head elements to their pre-controller state. Safe to call more than once.

Call `dispose()` when the owning app root is torn down. The head manager restores existing matching elements and removes tags it created. Calling `update()` after disposal throws. Invalid router/options, route patterns, metadata container shapes, or a non-HTTP(S) `siteUrl` throw errors during setup; a missing `document.head` also throws.

## Sitemap and robots files

Add `nodulaSEO` to your Vite plugins to generate crawler files at build time:

```js
import { defineConfig } from 'vite';
import { nodulaSEO } from 'nodula-framework/seo-vite';

export default defineConfig({
  plugins: [
    nodulaSEO({
      siteUrl: 'https://example.com',
      routes: [
        '/',
        { path: '/guide', changefreq: 'monthly', priority: 0.8, lastmod: '2026-10-03' },
      ],
      robots: 'User-agent: *\nAllow: /\nDisallow: /private',
    }),
  ],
});
```

### `nodulaSEO(options)`

Returns a Vite build plugin. It emits `sitemap.xml` and, unless disabled, `robots.txt` into the configured build output directory. It does not emit files during Vite dev server runs.

| Option | Type | Default | Description |
|---|---|---|---|
| `siteUrl` | `string` | Required | HTTP(S) origin only; do not include a path, query, or fragment. |
| `routes` | `readonly (string \| SEORouteDefinition)[]` | Required | Absolute same-origin paths to include in sitemap, such as `/` or `/guide`. |
| `robots` | `string \| false` | `User-agent: *\nAllow: /` | Rules for robots file. Plugin removes existing `Sitemap:` lines and appends the configured sitemap URL; `false` omits `robots.txt`. |
| `sitemapFilename` | `string` | `sitemap.xml` | Output filename only; directory separators are rejected. |
| `robotsFilename` | `string` | `robots.txt` | Output filename only; directory separators are rejected. |

Each route may be a path string or an object with `path` and optional sitemap fields:

| Field | Type | Description |
|---|---|---|
| `path` | `string` | Absolute same-origin path beginning with `/`. Query and fragment are omitted from emitted URL. |
| `changefreq` | `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`, or `never` | Optional sitemap change frequency. |
| `priority` | number from `0` to `1` | Optional sitemap priority. |
| `lastmod` | valid date string or `Date` | Optional last-modified date, emitted in ISO format. |

`SEORouteDefinition` is exported from `nodula-framework/seo-vite`. `nodulaSEO` requires an HTTP(S) origin and routes array. It validates same-origin absolute paths, `priority` from 0 to 1, recognized `changefreq` values, valid `lastmod` dates, and simple output filenames. XML values are escaped and `lastmod` is serialized in ISO format. Invalid options throw `TypeError` during Vite config evaluation. The plugin runs only for builds and emits files into Vite's configured output directory.

List concrete public URLs in `routes`; dynamic client route patterns such as `/products/:id` are not expanded automatically. Keep private or authentication-only pages out of the sitemap, and configure robots rules intentionally—robots directives are not access control. A robots exclusion does not make a page private. Verify generated files in the production output directory after building.

## Examples and related resources

- The demo initializes `createSEO` in `demo_app/src/AppShell.page` and emits static crawler files from `demo_app/vite.config.js`.
- SEO behavior tests: `framework/vitest/seo.test.js`.
- See [Routing](/guide/routing), [Tooling](/guide/tooling), [Security](/guide/security), and [Production Deployment](/guide/production-deployment).