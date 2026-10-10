# Nodula

Nodula is a lightweight JavaScript framework built for simplicity and speed around modular architecture. Build your application from small, focused pieces that work together naturally.

The Nodula framework is in alpha status, the framework is working (see the demo app) but it is a work in progress and not a user friendly npm install yet.

## Design

Nodula has a small core runtime, with optional add-on modules for extra features. Import only the add-on modules your app needs.

| Module         | Contents                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Core           | Reactivity, DOM rendering, Helpers                                                                  |
| Router         | Hash or History API navigation, route views, and lazy file-based pages and layouts                  |
| Localstorage   | Persist signals to localStorage or IndexedDB, and read, set, or delete browser cookies              |
| Data           | Fetch data from a server with method helpers, query parameters, and readable HTTP errors            |
| Store          | Deeply reactive proxies for plain objects and arrays, including nested values                       |
| Animation      | Web Animations helpers and opt-in enter/leave transitions for routes, conditionals, and keyed lists |
| Forms          | Reactive form values, validation, touched and dirty state, async submission, and reset helpers      |
| Dialog         | Native confirmation dialogs with configurable labels and owner cleanup                              |
| Modal          | Native modal windows with safe content, close controls, and configurable backdrop dismissal         |
| Drawer         | Accessible modal side panels that open from the left or right                                       |
| Navigation     | Accessible router-aware internal links and explicitly external HTTP(S) links                        |
| PWA            | Build installable, offline-capable applications                                                     |
| Auth           | Reactive client authentication state connected to an app-provided auth service                      |
| SEO            | Route-aware title, descriptions, canonical, Open Graph, hreflang, sitemap, and robots metadata      |
| Cookie Consent | Manage versioned privacy choices with a floating, expandable consent notice (EU GDPR/ePrivacy)      |



## Install and run

This repository contains the code for the Nodula framework and a demo app. This demo app is the website for Nodula, see https://nodula.richardleurs.nl.

To install this repository's dependencies and run the demo locally:

```sh
npm install
npm run dev
```

For a production build, run `npm run build`. This will build the framework to `dist/nodula/` and the demo app to `dist/app/`.
It also builds the npm package to the /dist/npm directory. The demo app loads that file as the framework package.

### Compile `.page` and `.comp` files in a Vite app

`.page` and `.comp` files are compiled by Nodula's Vite plugin during development and production builds. The plugin runs in Node; it is not part of the browser runtime. `.page` files export components but do not automatically become routes—you mount a page directly or register it with the optional router. `.comp` files are reusable components imported by pages or other components.

This repository is in alpha status, so for a local consumer first build Nodula's package tarball from the checkout, then install it in your Vite project:

```sh
# From the Nodula repository root
npm install
npm run package:framework

# From your Vite app directory; use the generated tarball filename
npm install /dist/npm/nodula-framework-0.1.0.tgz
npm install -D vite@^8.3.1
```

Alternatively, add the local tarball as a file dependency in your app's `package.json` (the relative path is resolved from that file), then run `npm install`:

```json
{
  "dependencies": {
    "nodula-framework": "file:../dist/npm/nodula-framework-0.1.0.tgz"
  }
}
```

The tarball version is controlled by the Nodula package version and may differ from this example. `npm run package:framework` builds the core, compiler entry, add-ons, and declarations before packing them.

Add the Nodula plugin to your app's `vite.config.js`:

```js
import { defineConfig } from 'vite';
import { nodulaPlugin } from 'nodula-framework/vite';

export default defineConfig({
  plugins: [nodulaPlugin()],
});
```

Create a page and a reusable component:

```html
<!-- src/Counter.comp -->
<script setup>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
</script>

<template>
  <button type="button" @click="setCount(count() + 1)">
    Count: {{ count() }}
  </button>
</template>
```

```html
<!-- src/Home.page -->
<script setup>
import Counter from './Counter.comp';
</script>

<template>
  <main>
    <h1>My Nodula app</h1>
    <Counter />
  </main>
</template>
```

Import and mount the page from your Vite entry, such as `src/main.js`:

```js
import { mount } from 'nodula-framework';
import Home from './Home.page';

mount('#app', Home);
```

Then run Vite with your app's scripts (commonly `vite` for development and `vite build` for production). For the full supported template syntax, compiler limits, and current package boundary, see the [Single-File Components guide](https://nodula-docs.richardleurs.nl/guide/templates), [Vite guide](https://nodula-docs.richardleurs.nl/guide/tooling), and [Building the npm Package guide](https://nodula-docs.richardleurs.nl/guide/npm-package).



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