# Quick Start

This guide takes you from a configured Nodula app to a mounted application. For repository installation, local package setup, and Vite plugin configuration, see [Installation](/guide/installation).

Nodula renders in the browser; Vite handles development serving, `.page`/`.comp` compilation, and production builds.

## 1. Create the HTML mount point

Your HTML page needs an element for the root component:

```html
// index.html
<div id="app"></div>
<script type="module" src="/src/main.js"></script>
```

Vite loads the JavaScript entry, which imports the root component and mounts it into `#app`.

## 2. Create the root component

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

## 3. Use a single-file page as the root

With `nodulaPlugin()` configured, the Vite entry can import and mount a `.page` root:

```js
// src/main.js
import { mount } from 'nodula-framework';
import App from './App.page';

mount('#app', App);
```

Create `src/App.page`:

```html
<script>
import { signal } from 'nodula-framework';
import Counter from './Counter.comp';

const [count, setCount] = signal(0);
</script>

<template>
  <main>
    <h1>My Nodula app</h1>
    <p>Page count: {{ count() }}</p>
    <button type="button" @click="setCount(count() + 1)">Increment</button>
    <Counter />
  </main>
</template>

<style>
button { font: inherit; }
</style>
```

Create reusable component `src/Counter.comp`:

```html
<script>
import { signal } from 'nodula-framework';

const [count, setCount] = signal(0);
</script>

<template>
  <button type="button" @click="setCount(count() + 1)">
    Component count: {{ count() }}
  </button>
</template>
```

Vite compiles both `.page` and `.comp` files with `nodulaPlugin()`. Each file needs exactly one template root; script blocks use JavaScript, not TypeScript. Routing is separate: a `.page` file does not automatically become a route. See [Single-File Components](/guide/templates) for supported bindings, events, loops, slots, component imports, and styles.

## Application instance and root ownership

Core does not expose a `createApp()` instance factory. The application root is the component passed to `mount`; its owner scope manages descendant effects and registered cleanup. Use `onMount`, `onCleanup`, or `onUnmount` inside that root for lifecycle work, and call the disposer returned by `mount` when the application is removed. Optional integrations such as routers or SEO controllers are created separately and should be cleaned up according to their own APIs.

## Add capabilities only when needed

Core imports come from `nodula-framework`. Optional features use separate entries, for example:

```js
import { createRouter } from 'nodula-framework/router';
import { createForm } from 'nodula-framework/form';
import { createStore } from 'nodula-framework/store';
```

