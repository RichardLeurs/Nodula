# TypeScript

TypeScript is optional for Nodula applications. Nodula's runtime and single-file component compiler are JavaScript; declaration files provide types and editor support for the public package entries. TypeScript adds no runtime dependency to an application using Nodula's JavaScript bundles.

## What is typed—and what is not

- Importing `nodula-framework` and its declaration-backed add-on entries provides types for public APIs such as signals, DOM helpers, forms, stores, routing, and animation.
- Core declarations live in `framework/index.d.ts`; add-on declarations live in `framework/addons/*.d.ts` and are emitted beside their package JavaScript entries.
- `.page` and `.comp` files are compiled from JavaScript. Their `<script>` blocks do **not** support TypeScript syntax such as interfaces, annotations, or `lang="ts"`.
- Nodula does not implement Vue's Composition API or Options API. Its own function-based and signal APIs have TypeScript declarations; they are not Vue compatibility layers.

For the repository's current compiler and package boundaries, see [Installation](/guide/installation), [Single-File Components](/guide/templates), and [Building the npm Package](/guide/npm-package).

## Use typed APIs from a TypeScript module

TypeScript can be used in ordinary `.ts` files and can import the same package entries as JavaScript:

```ts
import { computed, h, mount, signal } from 'nodula-framework';
import { createStore } from 'nodula-framework/store';
import { createRouter, type NavigationGuard } from 'nodula-framework/router';

const [count, setCount] = signal(0);
const doubled = computed(() => count() * 2);

setCount((current) => current + 1);
// @ts-expect-error a number signal does not accept a string
setCount('one');

interface AppState {
  profile: { name: string };
  ready: boolean;
}

const state = createStore<AppState>({ profile: { name: 'Ada' }, ready: false });
state.profile.name = 'Grace';

const requireSession: NavigationGuard = ({ to }) => {
  if (to === '/account') return '/login';
  return true;
};

const router = createRouter({ '/': () => h('main', {}, `Count: ${doubled()}`) }, undefined, {
  beforeEach: requireSession,
});
const dispose = mount('#app', () => router.view());
// Call dispose() when the mounted view is removed.
```

These types describe TypeScript callers of the JavaScript runtime. Type checking does not make client-side navigation guards an authorization boundary; enforce access in the server/API too.

## Public package entries

Import from the package entry that owns the API. Core APIs come from `nodula-framework`; optional APIs use separate entries such as `nodula-framework/form`, `nodula-framework/store`, `nodula-framework/router`, and `nodula-framework/animation`. The root package manifest's `exports` map is the authoritative list of entries and matching declaration files.

The Vite plugin has its own `nodula-framework/vite` entry and declaration for Vite configuration code. It is build-time tooling, not a browser runtime API. `.page`/`.comp` compilation and TypeScript support in ordinary `.ts` modules are separate concerns.

## Check types in this repository

From the repository root:

```sh
npm test
npm run typecheck
npm run typecheck:bundle
```

- `npm test` runs source declaration checking first, then framework and demo tests.
- `npm run typecheck` builds framework entries before checking source declarations using `tsconfig.types.json`.
- `npm run typecheck:bundle` checks declarations emitted beside the generated package bundles in `dist/nodula/`; build those entries first with `npm run build:framework` if missing or stale.
- `npm run build` includes emitted-bundle type checks in its full package, test, app, and docs build workflow.

The framework's representative source type usage lives in `framework/vitest/types/framework.typecheck.ts`; generated package-entry checks live in `framework/vitest/types/bundle.typecheck.ts`. These are compile-time checks, not runtime tests.

## TypeScript and templates

Do not put TypeScript syntax in a Nodula single-file component script block. Keep the component logic in the documented JavaScript subset, or move typed logic into a regular `.ts` module and import JavaScript-compatible runtime values from it. A `.ts` helper can provide compile-time types, but it does not add TypeScript parsing to `.page`/`.comp` templates. See [Tooling](/guide/tooling) for compiler setup and [Specifications and Limits](/guide/specifications) for current syntax boundaries.

## Troubleshooting

- **Cannot resolve a package type:** verify the installed Nodula package version exposes that subpath and its declaration target; use the root manifest's `exports` map as reference.
- **Generated declaration is missing:** run `npm run build:framework` or `npm run package:framework`, then rerun `npm run typecheck:bundle`.
- **TypeScript syntax fails in a `.page`/`.comp`:** template script blocks are JavaScript-only. Move the typed code to a regular TypeScript module or use JavaScript syntax there.
- **A type check passes but behavior is unsafe:** declarations do not validate runtime/network data or enforce server permissions. Validate external values and authorization at the appropriate runtime/server boundary.
- **Looking for Vue API types:** Nodula does not implement Vue's Composition API or Options API; use Nodula's declared APIs rather than Vue-specific types.

## Related guides

- [Components In-Depth](/guide/components-in-depth) — component context, props, callbacks, and slots.
- [Reactivity and DOM](/guide/reactivity) — typed signal/accessor usage.
- [Stores](/guide/stores), [Forms](/guide/forms), and [Routing](/guide/routing) — add-on APIs with declarations.
- [Testing](/guide/testing) — repository type-check and test commands.
- [Npm Package](/guide/npm-package) — exports and generated declaration layout.
- Type-check fixtures: `framework/vitest/types/framework.typecheck.ts` and `framework/vitest/types/bundle.typecheck.ts`.