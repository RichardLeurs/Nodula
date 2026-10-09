# Nodula

Nodula is a lightweight JavaScript framework built for simplicity and speed around modular architecture. Build your application from small, focused pieces that work together naturally.

The Nodula framework is in early alpha status, the framework is working (see the demo app) but it is a work in progress and not a user friendly npm install yet.

## Design

Nodula has a small core runtime, with optional add-on modules for extra features. Import only the add-on modules your app needs.

| Module         | Contents                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Framework      | Reactivity, DOM rendering, Helpers                                                                  |
| Router         | Hash or History API navigation, eager or lazy route maps, and lazy file-based pages and layouts       |
| Cookie consent | Versioned, localStorage-backed consent choices with a floating preference banner                    |
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

The demo app's `/data` page also includes an IndexedDB-backed ideas list with local create, complete, and remove actions.

Cookie consent UI copy can be overridden with `labels`; built-in category copy can also be set with `categories` entries using IDs `analytics`, `personalization`, or `marketing`. Hide unused built-in preferences with `showAnalytics`, `showPersonalization`, and `showMarketing`; hidden categories remain denied, including when visitors accept all.

Set `image` in `createCookieConsent` to display an optional decorative image on the left side of the banner. It accepts relative or HTTP(S) URLs.

Set `showSettingsButton: false` in `createCookieConsent` to hide floating settings shortcut after choice. Manage preferences remains available on initial banner; application code can also call `openSettings()`.

Use `setupGoogleAnalytics(consent, measurementId)` from `nodula-framework/cookieconsent` to load Google Analytics only while analytics consent is granted. It queues denied Consent Mode defaults, removes the injected tag on withdrawal, and returns an unsubscribe function. Supply your own GA4 measurement ID.

Dialog buttons accept `btn_cancel` and `btn_ok`; modal and drawer close buttons accept `btn_close`. These are the only supported button-label option names.

The demo's `/democss` page previews components in light and dark themes and demonstrates tabs, switches, progress, and empty/loading states.

The optional router's default `createRouter()` fallback displays “Page not found” centered in the viewport. Pass a custom fallback component to control its content and styling.


## Install and run

This repository contains the code for the Nodula framework and a demo app. This demo app is the website for Nodula, see https://nodula.richardleurs.nl.
To install this repository's dependencies and run the demo locally:

```sh
npm install
npm run dev
```

For a production build, run `npm run build`. This will build the framework to `dist/nodula/` and the demo app to `dist/app/`.
It also builds the npm package to the /dist/npm directory. The demo app loads that file as the framework package.

To compile `.page` (Nodula route pages) and `.comp` (Reusable Nodula components) files in your own Vite app, install Nodula and Vite, then add the package's build-time plugin:

```js
import { defineConfig } from 'vite';
import { nodulaPlugin } from 'nodula-framework/vite';

export default defineConfig({
  plugins: [nodulaPlugin()],
});
```

Vite applications can also import `*.module.css` files from a `.page` or `.comp` script and bind the returned local class map in the template, for example `:class="styles.card"`. This uses Vite's CSS Modules support; Nodula `<style module>` blocks are not supported.

The [Styles and CSS Modules guide](https://nodula-docs.richardleurs.nl/guide/styles) compares global CSS imports, component `<style>` / `<style scoped>` blocks, and Vite CSS Modules.



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