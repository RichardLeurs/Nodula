# Nodula

Nodula is a lightweight JavaScript framework built for simplicity and speed around modular architecture. Build your application from small, focused pieces that work together naturally.

The Nodula framework is in early alpha status, the framework is working (see the demo app) but it is a work in progress and not a user friendly npm install yet.

## Design

Nodula has a small core runtime, with optional add-on modules for extra features. Import only the add-on modules your app needs.

| Module         | Contents                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Framework      | Reactivity, DOM rendering, Helpers                                                                  |
| Router         | Hash or History API navigation, route views, and lazy file-based pages and layouts                  |
| Localstorage   | Persist signals to localStorage or IndexedDB, and read, set, or delete browser cookies              |
| Data           | Fetch data from a server with method helpers, query parameters, and readable HTTP errors            |
| Stores         | Deeply reactive proxies for plain objects and arrays, including nested values                       |
| Web Components | Use framework independ, native Web Components                                                       |
| Animation      | Web Animations helpers and opt-in enter/leave transitions for routes, conditionals, and keyed lists |
| Forms          | Reactive form values, validation, touched and dirty state, async submission, and reset helpers      |
| Dialogs        | Native confirmation dialogs with configurable labels and owner cleanup                              |
| Modals         | Native modal windows with safe content, close controls, and configurable backdrop dismissal         |
| Drawers        | Accessible modal side panels that open from the left or right                                       |
| Navigation     | Accessible router-aware internal links and explicitly external HTTP(S) links                        |
| PWA            | Build installable, offline-capable applications                                                     |
| Auth           | Reactive client authentication state connected to an app-provided auth service                      |
| SEO            | Route-aware title, descriptions, canonical, Open Graph, hreflang, sitemap, and robots metadata      |


## Install and run

This repository contains the code for the Nodula framework and a demo app. This demo app is the website for Nodula, see https://nodula.richardleurs.nl.

To install this repository's dependencies and run the demo locally:

```sh
npm install
npm run dev
```

For a production build, run `npm run build`. This will build the framework to `dist/framework/` and the demo app to `dist/app/`.
It also builds the npm package to the /dist/npm directory. The demo app loads that file as the framework package.

To compile `.page` (Nodula route pages) and `.comp` (Reusable Nodula components) files in your own Vite app, install Nodula and Vite, then add the package's build-time plugin:

```js
import { defineConfig } from 'vite';
import { nodulaPlugin } from 'nodula-framework/vite';

export default defineConfig({
  plugins: [nodulaPlugin()],
});
```
### SEO add-on

Use `createSEO()` with your Nodula router for client-side title, description, canonical, Open Graph, robots, and `hreflang` metadata. Route patterns accept `:param` or `[param]` segments. Dynamic route resolvers receive decoded parameters; metadata fields may also be reactive accessors.

```js
import { createSEO } from 'nodula-framework/seo';

const seo = createSEO(router, {
  siteUrl: 'https://example.com',
  defaults: {
    title: 'Example',
    description: 'A short site description.',
    openGraph: { siteName: 'Example' },
  },
  routes: {
    '/': { title: 'Home' },
    '/articles/:id': ({ params }) => ({
      title: () => `Article ${params.id}`,
      description: 'Read this article.',
      openGraph: { type: 'article', image: 'https://example.com/social/article.png' },
      hreflang: [{ lang: 'en', href: `https://example.com/articles/${params.id}` }],
    }),
  },
});

// Optionally merge page-local metadata, and dispose when the app is torn down.
seo.update({ title: currentTitle() });
seo.dispose();
```

Generate `sitemap.xml` and `robots.txt` in a Vite production build with the separate build-time entry:

```js
import { nodulaSEO } from 'nodula-framework/seo-vite';

export default defineConfig({
  plugins: [nodulaSEO({
    siteUrl: 'https://example.com',
    routes: ['/', '/articles', { path: '/about', priority: 0.8, changefreq: 'monthly' }],
  })],
});
```

The runtime updates `<head>` after client JavaScript starts. Nodula currently has no server rendering or prerendering, so route-specific metadata is not guaranteed in the initial HTML for crawlers that do not execute JavaScript. Add concrete public paths to the sitemap; dynamic router patterns are not expanded automatically.




## VS Code language extension

The extension recognizes:

- `.page` — Nodula route pages
- `.comp` — Reusable Nodula components

It highlights JavaScript inside `<script>` blocks, HTML inside `<template>` blocks, and CSS inside `<style>` blocks. Nodula template directives such as `@if`, `@for`, `@click`, `:value`, and `{{ expressions }}` receive Nodula-specific highlighting. Embedded code uses the colors from the active VS Code theme.

See the README.md file in /vscode-nodula for installation guidelines.

## Nodula Documentation

You can find the documentation at https://nodula-docs.richardleurs.nl.

## License

Nodula is free software licensed under the
[GNU General Public License v3.0 or later](https://www.gnu.org/licenses/gpl-3.0.html).

Copyright © 2026 Richard Leurs