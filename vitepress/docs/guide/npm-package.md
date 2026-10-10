# Building the npm Package

The repository can build Nodula into a local npm tarball (`.tgz`) without publishing it to a registry. The package is ESM, includes generated JavaScript and TypeScript declarations, and exposes the core, add-ons, CSS, and Vite integration through explicit package exports. Nodula is early alpha; the repository demo is the supported reference integration while package installation and tooling boundaries continue to evolve.

## Prerequisites

- Node.js and npm installed.
- Repository dependencies installed with `npm install`.
- For app-only builds, framework bundles must already exist. Root workflows such as `npm run build` handle ordering.

## Build and pack

Build and package only the framework:

```sh
npm run package:framework
```

This runs `build:framework`, builds the core and separate add-on entries into `dist/nodula/`, copies declarations/styles, writes `.gz` companions for files outside `dist/nodula/css/`, then creates a tarball in `dist/npm/` using the package name and version from the root `package.json`. The demo build also writes `.gz` companions for JavaScript files directly inside `dist/app/assets/`.

If bundles are already built, create the tarball without rebuilding:

```sh
npm run pack:framework
```

For a full checkout verification—including framework tests/builds, bundle declaration checks, demo tests/build, and docs build—run:

```sh
npm run build
```

`npm pack --dry-run` from the package root can preview which files the current manifest includes.

## Install a local tarball

Use the generated tarball path in another local project:

```sh
npm install /absolute/path/to/nodula/dist/npm/nodula-framework-0.1.0.tgz
```

Or install the latest locally packed framework into this repository's demo app:

```sh
npm run install:framework:package
```

The package filename changes when `name` or `version` in the root manifest changes; use the generated filename rather than assuming the example version stays current.

## Package contents and public entries

The root manifest's `files` allowlist publishes generated `dist/nodula/` content rather than repository source or the demo application. It includes the package metadata/README/license, core and add-on bundles, `.d.ts` declarations, and stylesheets. The `sideEffects` declaration retains explicitly imported CSS during tree shaking.

The package root imports core APIs:

```js
import { computed, effect, h, mount, signal } from 'nodula-framework';
```

## Vite compiler entry and boundary

The package defines `nodula-framework/vite`, which points to the generated `nodula-vite.js` and declaration. Vite is an optional peer dependency for consumers who use that build-time plugin; it is not needed by browser code using only core runtime APIs.

```js
import { defineConfig } from 'vite';
import { nodulaPlugin } from 'nodula-framework/vite';

export default defineConfig({
  plugins: [nodulaPlugin()],
});
```

**Repository boundary:** the current demo config imports `framework/vite-plugin.js` from repository source to compile `.page` and `.comp` files while building this checkout. The compiler implementation is a Node/Vite build-time integration, not browser runtime code. For the supported repository setup and current compiler-install details, see [Tooling](/guide/tooling) and [Installation](/guide/installation).

Add-ons externalize the core runtime so an application uses one shared Nodula runtime instance rather than bundling a separate core copy per add-on.

## Release checklist

Before distributing a tarball:

1. Update the root package version intentionally.
2. Run `npm run package:framework` to rebuild entries and tarball.
3. Inspect package contents with `npm pack --dry-run` or the generated tarball listing.
4. Install the tarball into a clean consumer project and verify core/add-on imports and type declarations.
5. Include compatible peer tooling (such as Vite for `nodula-framework/vite`) in the consumer project.

The repository manifest currently has no registry publication workflow. Do not treat a successful local tarball build as evidence that a public release has been published.

## Troubleshooting and limitations

- **Missing export files:** run `npm run build:framework` or `npm run package:framework` before installing the tarball.
- **App-only build cannot resolve framework entries:** build/install the framework package first; `npm run build:app` alone does not create framework bundles.
- **`.page` or `.comp` import fails:** ensure the Vite compiler plugin is configured. Runtime router exports do not compile files.
- **Peer dependency warning or plugin import failure:** install Vite when using the Vite entry and the relevant optional peer dependency for other build integrations.
- **Unexpected package contents:** check the root manifest's `files`, `exports`, and `sideEffects` fields, then repack.
- Demo files, source compiler files, and development-only demo dependencies are not part of the published file allowlist unless copied into generated output explicitly.

## Related guides

- [Tooling](/guide/tooling) — Vite and compiler setup.
- [Installation](/guide/installation) — repository setup and integration status.
- [Quick Start](/guide/quick-start) — create and mount an app.
- [TypeScript](/guide/typescript) — using emitted declaration files.
- [Production Deployment](/guide/production-deployment) — building and hosting the demo output.