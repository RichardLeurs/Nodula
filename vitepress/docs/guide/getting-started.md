# Getting Started

Nodula is a small, client-side JavaScript UI framework. It combines fine-grained signals, direct DOM helpers, `.page` single-file components, and an optional router. Vite compiles the components and builds the app; it is not a dependency of Nodula's browser runtime.

## Installation status

The repository package is named `nodula-framework` and its manifest defines the core, form, and router package entries. To try the implementation maintained in this checkout, use the repository demo:

Run these commands from the repository root:

```
npm install
npm run dev
```


## Build and test the checkout

```
npm run build
npm run preview
npm test
```

`npm run dev` builds the core runtime and separate form and router add-ons before starting Vite. The production build does the same before building the demo app and checking emitted declarations. TypeScript is optional for app authors; JavaScript is the framework's implementation language.

## Using Nodula in an application

The checkout's demo is the supported, working integration example. Its Vite config loads the `.page` compiler plugin from the repository source, and app code imports the public runtime entries:

```
import { computed, effect, h, mount, signal } from 'nodula-framework';
```

The optional form helpers use a separate entry:

```
import { createForm } from 'nodula-framework/form';
```

The router is also an optional add-on with a separate entry:

```
import { createRouter } from 'nodula-framework/router';

const router = createRouter({
  '/': HomePage,
  '/about': { load: () => import('./routes/about.page') },
});
```

Lazy route loaders run on first visit and resolve to a component or a module with a default component export. The router displays loading/error text while loading and caches successful results.

The demo app uses an explicit route map in `demo_app/src/routes.js`. For Vite-discovered `.page` routes and layouts, `createFileRouter` is also available; see the [routing guide](/guide/routing).

For optional Web Animations API helpers, import `animate` or `createTransition` from `nodula-framework/animation`. See the [animations guide](/guide/animations) for lifecycle and reduced-motion behavior.

For an accessible Cancel/OK prompt, import `showDialog` from `nodula-framework/dialog`; see the [dialogs guide](/guide/dialogs).

For a simple confirmation prompt, import `showDialog` from `nodula-framework/dialog`; see the [dialogs guide](/guide/dialogs).

The package exports resolve to generated files under `dist/nodula/`, including `nodula-core.js`, `nodula-core.d.ts`, `nodula-form.js`, `nodula-router.js`, `nodula-animation.js`, `nodula-dialog.js`, and `nodula-data.js`. Build the framework before building only the app (`npm run build:framework` before `npm run build:app`); `npm run dev` and `npm run build` already handle the order. Add-ons import the core package externally so they share its reactive runtime. This repository keeps app source in `demo_app/src/` and framework source in `framework/`; `vite.config.js` imports the `.page` plugin from `framework/vite-plugin.js`. That plugin is currently an internal source module, not a separately published package entry, so a fresh external Vite project cannot follow a public-package-only setup yet.

Loading the core framework entry logs `This app os built with nodulaJS` to the console once per module instance.

Start with the [reactivity and DOM guide](/guide/reactivity), then explore [single-file components](/guide/templates), [routing](/guide/routing), and [forms](/guide/forms). The [specifications and limits](/guide/specifications) page distinguishes implemented behavior from future targets.

## Production notes

Nodula currently renders in the browser; it does not provide server-side rendering or hydration. If you use history-mode routing, configure your production host to serve `index.html` for unknown app paths so direct visits and refreshes work. A real hosted app that needs the demo API must provide its own production-grade API, authorization, HTTPS, persistent storage, and same-origin `/api` routing. Vite's local proxy is not a production reverse proxy.
