# Building the npm Package

The framework can be packaged locally as an npm tarball without publishing it to the npm registry.

## Build and package

Run the complete production build:

```
npm run build
```

This builds the framework entries and demo app, checks the generated declaration bundles, then writes a versioned `.tgz` framework package into `dist/`. To build and package only the framework, run:

```
npm run package:framework
```

If the framework entries have already been built, `npm run pack:framework` creates the tarball without rebuilding them. `npm pack --dry-run` previews the package contents.

The package allowlist includes the package manifest, README, license, built framework and add-on JavaScript entries, TypeScript declarations, and shared CSS. Vite minifies bundled app CSS with Lightning CSS, and the framework build minifies the copied shared stylesheet before it enters the package. Demo application files and development-only dependencies such as Highlight.js are not part of the package. The package manifest preserves the public `nodula-framework` exports and marks CSS files as side effects so application bundlers retain an explicitly imported framework stylesheet.

To try the tarball in another local project, install it by path:

```
npm install /absolute/path/to/nodula-framework/dist/nodula-framework-0.1.0.tgz
```

The package name and version are read from the root `package.json`; update the version there before producing a release tarball.
