# Tooling

Nodula uses Vite for the development server and production build. The package exports `nodulaPlugin` from `nodula-framework/vite` to compile `.page` and `.comp` files in a consumer Vite app. Separate package entries provide the core runtime and optional add-ons.

The plugin is a build-time Node/Vite integration, not part of the browser runtime. It is independent of `createFileRouter`: the router consumes modules/loaders, while the plugin compiles single-file sources. The demo uses both together. Vite is an optional peer dependency; install Vite in applications that use the compiler plugin. The project test command uses Node's test runner plus Python `unittest`; it does not currently use Vitest. TypeScript declarations and type fixtures are checked by the repository scripts.

See [Routing](/guide/routing), [Testing](/guide/testing), and [TypeScript](/guide/typescript).
