# Quick Start

This guide takes you from repository checkout to a mounted Nodula application. It covers package installation, the application entry/root, mounting, and a first single-file page. 

Nodula renders in the browser; Vite handles development serving, `.page`/`.comp` compilation, and production builds.

## 1. Install and run the supported demo

From the repository root, install dependencies and start the demo:

```sh
npm install
npm run dev
```

The repository scripts build Nodula core and add-on bundles before starting the demo. To build and test the checkout, run:

```sh
npm run build
npm test
```

The demo is the runnable reference integration for this checkout. The `.page`/`.comp` compiler is provided in this repository as `framework/vite-plugin.js`; it is not currently a public standalone package entry. See [Getting Started](/guide/getting-started) for that package boundary and build workflow.

## 2. Create the HTML mount point

Your HTML page needs an element for the root component:

```html
// index.html
<div id="app"></div>
<script type="module" src="/src/main.js"></script>
```

Vite loads the JavaScript entry, which imports the root component and mounts it into `#app`.

## 3. Create the root component

For a plain JavaScript component, core `mount(target, component)` creates an ownership root, renders the component's returned DOM node, and returns a disposer:

```js
// src/main.js
import { mount } from 'nodula-framework';
import AppShell from './AppShell.page';
import './style.css';

const unmount = mount('#app', AppShell);

```

The component can use core signals and DOM helpers:

```js
// src/AppShell.page
import { h, signal } from 'nodula-framework';

export default function App() {
  const [count, setCount] = signal(0);

  return h('main', {},
    h('h1', {}, 'My Nodula app'),
    h('button', {
      type: 'button',
      onClick: () => setCount((value) => value + 1),
    }, () => `Count: ${count()}`),
  );
}
```

This direct-DOM setup uses the published core entry. `mount` accepts a selector or an element, replaces its children, and throws if a selector matches no element. Call its returned function to dispose effects/listeners and remove the mounted node.

## 4. Use a single-file page as the root

In the repository demo, the Vite compiler lets the entry import a `.page` root instead:

```js
// /src/main.js
import AppShell from './AppShell.page';
import { mount } from 'nodula-framework';
import './assets/app.css';

mount('#app', AppShell);
```

A `.page` or reusable `.comp` file places JavaScript, template, and optional styles together:

```html
<script>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
</script>

<template>
  <main>
    <h1>My Nodula app</h1>
    <button type="button" @click="setCount(count() + 1)">
      Count: {{ count() }}
    </button>
  </main>
</template>

<style>
button { font: inherit; }
</style>
```

The template compiler supports a focused syntax, requires one template root, and uses JavaScript in `<script>` (not TypeScript). See [Single-File Components](/guide/templates) for supported bindings, events, loops, slots, and imports.

## Application instance and root ownership

Core does not expose a `createApp()` instance factory. The application root is the component passed to `mount`; its owner scope manages descendant effects and registered cleanup. Use `onMount`, `onCleanup`, or `onUnmount` inside that root for lifecycle work, and call the disposer returned by `mount` when the application is removed. Optional integrations such as routers or SEO controllers are created separately and should be cleaned up according to their own APIs.

## Add capabilities only when needed

Core imports come from `nodula-framework`. Optional features use separate entries, for example:

```js
import { createRouter } from 'nodula-framework/router';
import { createForm } from 'nodula-framework/form';
import { createStore } from 'nodula-framework/store';
```

