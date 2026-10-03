# SEO

Nodula provides two optional SEO integrations from separate package entries:

- `createSEO` from `nodula-framework/seo` manages document metadata as client-side routes change.
- `nodulaSEO` from `nodula-framework/seo-vite` emits a sitemap and robots file during a Vite production build.

They solve different parts of SEO. Use both when your app needs route-aware metadata and static crawler files. The client add-on updates the browser document head; it does not server-render metadata into the initial HTML. For reliable metadata in crawlers that do not execute JavaScript, serve pre-rendered or server-rendered HTML.

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
| `options.siteUrl` | `string` | Optional HTTP(S) site URL used to generate absolute canonical URLs. Defaults to the current page origin. |
| `options.defaults` | `SEOMetadata` or resolver | Metadata applied on every route unless overridden. |
| `options.routes` | `Record<string, SEOMetadata or resolver>` | Route-pattern metadata. Supports `:id` and `[id]` parameter segments. |

A metadata resolver receives `{ path, params, router }`. `path` excludes query and fragment; `params` contains decoded route parameters. Static route patterns take precedence over parameterized patterns.

### `SEOMetadata`

| Field | Type | Behavior |
|---|---|---|
| `title` | string, `null`, `undefined`, or accessor | Sets document `<title>`. |
| `description` | string, `null`, `undefined`, or accessor | Sets `meta[name="description"]`. |
| `keywords` | string, `null`, `undefined`, or accessor | Sets `meta[name="keywords"]`. |
| `author` | string, `null`, `undefined`, or accessor | Sets `meta[name="author"]`. |
| `canonical` | string, `null`, `undefined`, or accessor | Sets `link[rel="canonical"]`. If omitted, URL is generated from `siteUrl` and active route; query and fragment are excluded. |
| `robots` | string, `null`, `undefined`, or accessor | Sets `meta[name="robots"]`. |
| `openGraph` | `SEOOpenGraph` | Sets supported Open Graph tags. Title, description, and URL default to the corresponding resolved metadata; type defaults to `website`. |
| `hreflang` | `{ lang, href }[]` | Adds `link[rel="alternate"]` entries for language variants. |

Metadata fields accept signal accessors as well as static values. Route metadata overrides defaults; `openGraph` fields merge with defaults instead of replacing the entire object. `null` or `undefined` omits an individual tag.

The returned controller exposes:

- `seo.update(metadata)` — merges page-local overrides into metadata for the current route. Overrides reset when the route changes.
- `seo.dispose()` — stops reactive updates and restores head elements to their pre-controller state. Safe to call more than once.

Call `dispose()` when the owning app root is torn down. Calling `update()` after disposal throws.

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
| `routes` | `string[]` or `SEORouteDefinition[]` | Required | Absolute paths to include in sitemap, such as `/` or `/guide`. |
| `robots` | `string` or `false` | `User-agent: *\nAllow: /` | Rules for robots file. Plugin appends a `Sitemap:` directive; `false` omits `robots.txt`. |
| `sitemapFilename` | `string` | `sitemap.xml` | Output filename, without directory separators. |
| `robotsFilename` | `string` | `robots.txt` | Output filename, without directory separators. |

Each route may be a path string or an object with `path` and optional sitemap fields:

| Field | Type | Description |
|---|---|---|
| `path` | `string` | Absolute same-origin path beginning with `/`. |
| `changefreq` | `always`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`, or `never` | Optional sitemap change frequency. |
| `priority` | number from `0` to `1` | Optional sitemap priority. |
| `lastmod` | valid date string or `Date` | Optional last-modified date, emitted in ISO format. |

List concrete public URLs in `routes`; dynamic client route patterns such as `/products/:id` are not expanded automatically. Keep private or authentication-only pages out of the sitemap, and configure robots rules intentionally—robots directives are not access control. Verify the generated files in the production output directory after building.

See [Routing](/guide/routing), [Tooling](/guide/tooling), and [Production Deployment](/guide/production-deployment).