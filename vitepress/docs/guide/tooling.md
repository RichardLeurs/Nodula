# Vite Support

Nodula uses Vite for development serving, compiling `.page`/`.comp` single-file components, and production builds. The Vite plugin runs in Node during development/build; it is not included in the browser runtime. Other optional build integrations, such as PWA and static SEO generation, are separate add-ons.

## Repository prerequisites

The repository demo is the runnable reference application. From the repository root:

```sh
npm install
npm run dev
```

The root development script builds Nodula core and add-on bundles before starting Vite for the demo. For available workflows see the root `package.json` scripts; key commands include:

| Command                   | Purpose                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run dev`             | Build framework packages, then start demo Vite server.                                                   |
| `npm run build:framework` | Build core, compiler package entry, and add-on bundles.                                                  |
| `npm run build:app`       | Build demo app only; framework bundles must already exist.                                               |
| `npm run build:docs`      | Build VitePress documentation.                                                                           |
| `npm test`                | Run type checks and framework/demo tests through repository scripts.                                     |
| `npm run build`           | Run framework builds, type checks, demo build, and docs build.                                           |
| `npm run lint`            | Run Oxlint across repository JavaScript/TypeScript.                                                      |
| `npm run format`          | Format supported source, Vite config, guide, and package files with Oxfmt.                               |
| `npm run format:check`    | Check those files without writing changes.                                                               |

`build:framework`, `pack:framework`, `build:app` and `build:docs` run through `framework/mjs/run-steps.mjs`. Each empties its `dist/` folder first, then prints one line per step with a counter and its duration, green on success. A failed step is shown in red with its full output, and the build stops. Set `NODULA_STEPS_VERBOSE=1` to stream every step's output instead.


Builds clear their destination before writing fresh output: framework builds clear `dist/nodula/` once before the sequence of core and add-on builds, demo builds clear `dist/app/`, and docs builds clear `dist/vitepress/`. This prevents files left by earlier builds from being included in the next output.

## Use Nodula's Vite plugin

The published package exposes `nodulaPlugin` from `nodula-framework/vite`. Install Vite and Nodula in an application, then add the plugin to the Vite config:

```js
import { defineConfig } from "vite";
import { nodulaPlugin } from "nodula-framework/vite";

export default defineConfig({
  plugins: [nodulaPlugin()],
});
```

The plugin handles `.page` and `.comp` modules. It compiles their templates and style blocks into JavaScript/CSS that Vite bundles. The repository implementation lives at `framework/vite-plugin.js`; its `load()` hook reads those files and calls the component/style compiler. See [Single-File Components](/guide/templates) for supported syntax.

Compile errors are rethrown with the full file path (`/path/to/Card.comp: …`) and the `id` set, so the Vite error overlay points at the right file. Only a trailing Nodula query (`?nodula-style`, `?nodula-style-scoped`, `?nodula-style-module`) is parsed from module ids; a `?` in a directory or file name is part of the path. Generated style modules register their component as a watch dependency with `this.addWatchFile()`, so editing a `.comp` file also refreshes its extracted CSS.

### Package and peer dependency boundary

The package exports the plugin at `nodula-framework/vite` and declares Vite as an optional peer dependency. Install a compatible Vite version in the consuming project when using this plugin. Applications using only browser runtime APIs do not need to import the Vite entry at runtime.

The demo config imports `nodulaPlugin` directly from repository source so it can build the checkout while creating its own package tarball. It also aliases package entries to local build output. A normal package consumer should use the public `nodula-framework/vite` entry shown above rather than copy the demo's repository-relative imports and aliases.

## Compiler and router are separate

The Vite plugin compiles `.page` and `.comp` source modules. It does not register routes. The optional router consumes components, route maps, or Vite-discovered module loaders; see [Routing](/guide/routing). A `.page` module is not automatically a URL merely because Vite compiled it.

## Testing and type checks

The framework uses Vitest. Run its suite with:

```sh
npm run test:framework
```

The suite covers core runtime behavior, compiler output, Vite plugin loading, add-ons, and declarations. `npm run test:demo` runs demo integration tests. The root `npm test` also includes type-checking; `npm run typecheck:bundle` validates declarations against built package entries.

The focused Vite plugin test is `framework/vitest/vite-plugin.test.js`; compiler behavior is covered by `framework/vitest/compiler.test.js`.

## Optional build integrations

Other build-time tools are imported separately and are not required for basic `.page` compilation:

- [PWA](/guide/pwa): `nodula-framework/pwa` configures `vite-plugin-pwa`.
- [SEO](/guide/seo): `nodula-framework/seo-vite` emits sitemap and robots assets during builds; `nodula-framework/seo` manages client-side route metadata.

Only add integrations your app needs. Their peer dependencies and deployment boundaries are documented in their respective guides.

## Limitations and troubleshooting

- If Vite treats `.page` or `.comp` as an unknown extension, confirm `nodulaPlugin()` is in the active Vite config and the file uses one of the supported extensions.
- The Vite plugin is build-time code and must not be imported by browser modules.
- This compiler supports a focused template subset, not full Vue/Svelte syntax or TypeScript inside `<script setup>`; see [Specifications and Limits](/guide/specifications).
- Build the framework before running an app-only build. Root `npm run dev` and `npm run build` arrange this automatically; the demo's direct `npm run build` expects packages produced by the framework build first.
- The demo's `/api` proxy is development tooling, not a production reverse proxy. Production apps need their own API and hosting configuration.

## Related guides

- [Quick Start](/guide/quick-start) — run and mount an application.
- [Installation](/guide/installation) — repository and package setup boundaries.
- [Single-File Components](/guide/templates) — `.page`/`.comp` syntax.
- [Testing](/guide/testing) — testing practices and framework test setup.
- [TypeScript](/guide/typescript) — declarations and typed app code.
- [Production Deployment](/guide/production-deployment) — build output and hosting.
