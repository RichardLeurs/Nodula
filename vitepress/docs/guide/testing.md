# Vitest

Nodula repository tests use Vitest for framework and demo-app behavior, plus TypeScript checks for source and generated declarations. The two Vitest suites run separately so framework behavior can be tested independently from the demo integration. API endpoint tests are part of the demo Vitest suite; there is no separate `test:api` npm script. The Node API port has its own `npm run test:api-node`, which is not part of `npm test`.

## Prerequisites

Install repository dependencies from the root:

```sh
npm install
```

Most tests need Node.js and installed npm dependencies. A small set of PHP-backed API integration tests skip themselves when PHP is unavailable.

## Run tests

From the repository root, run the framework suite, demo suite, or both with the standard checks:

```sh
npm run test:framework
npm run test:demo
npm test
```

| Command | What it runs |
|---|---|
| `npm run test:framework` | Vitest files in `framework/vitest/**/*.test.js`. |
| `npm run test:demo` | Demo Vitest suite in `demo_app/vitest/**/*.test.js`. |
| `npm run test:api-node` | Node API port tests in `api-node/test/*.test.js`, run with `node --test`. Requires Node 24.5 or newer. Not part of `npm test`. |
| `npm test` | Source declaration type-check, then framework and demo Vitest suites. |
| `npm run typecheck` | Builds framework entries and type-checks source declarations. |
| `npm run typecheck:bundle` | Type-checks declarations emitted beside generated package bundles; generated build output must exist. |
| `npm run build` | Runs framework tests, package/build and bundle type checks, demo tests/build, and docs build. |

To rerun a suite while editing, use its watch script:

```sh
npm run test:framework:watch
npm --prefix demo_app run test:watch
```

Run a focused test file through the suite's Vitest executable and config:

```sh
npx vitest run --config framework/vitest.config.js framework/vitest/reactivity.test.js
cd demo_app && npx vitest run --config vitest.config.js vitest/router-demo.test.js
```

The framework config includes files under `framework/vitest/`; the demo config includes `demo_app/vitest/`. Both use Vitest's Node environment with `happy-dom` where a test needs browser-like DOM APIs. They serialize file execution with one worker, disable file parallelism, and set 15-second test and hook timeouts. Framework/demo tests alias package imports to this checkout's framework source. Tests specifically concerned with generated output or package entries may also build or read generated artifacts.

## Test scope

Framework tests cover observable core and add-on behavior, including:

- Signals, effects, computed values, stores, DOM updates, and lifecycle cleanup.
- `.page`/`.comp` compiler output, directive validation, styles, and Vite plugin loading.
- Router, form, animation, dialog, modal, drawer, storage, data, PWA, SEO, and other add-on behavior.
- Package entry/tree-shaking behavior and declarations for generated bundle entries.
- VS Code extension manifest contributions and repository launch configuration.

Demo tests exercise rendered routes and user-facing interactions, theme/styling, add-on examples, service-worker precache verification, and API integrations. API tests use isolated local servers and temporary data/configuration where practical; they do not require public API services. PHP-backed cases are conditionally skipped if the PHP executable is unavailable.

## Type checks are separate from test suites

`npm run test:framework` and `npm run test:demo` run their Vitest suite only. `npm test` additionally runs `npm run typecheck`, which builds the framework before checking source declarations. `npm run typecheck:bundle` checks declaration files copied into `dist/nodula/`, so run `npm run build:framework` first when generated entries are absent or stale. The full root `npm run build` includes these package and bundle checks as part of its sequence.

## What these tests do not establish

The configured Vitest suites use Node and `happy-dom`; they are not real-browser compatibility or end-to-end runs. Passing them does not certify accessibility with assistive technology, visual rendering across browser engines, production hosting, or performance under application workloads. The repository also provides `npm run benchmark:render` as a separate rendering benchmark command; it is not part of `npm test` and is not a substitute for browser performance testing. See [Specifications and Limits](/guide/specifications) for current verification boundaries.

## Troubleshooting

- **Framework package imports fail during a suite:** the test configs normally alias them to local source. Check that the relevant source/add-on file exists and that the test uses the matching suite config.
- **Generated bundle or declaration file is missing:** run `npm run build:framework`; bundle type checks read `dist/nodula/` output.
- **PHP API tests are skipped:** install PHP to run those conditional integration cases. The remaining demo tests can still run without PHP.
- **Full build fails in docs:** separate docs configuration/link failures from framework and test-suite results; `npm run build` includes the VitePress build after tests and app build.

## Related guides

- [Tooling](/guide/tooling) — repository commands and Vite setup.
- [Specifications and Limits](/guide/specifications) — implemented behavior and verification boundaries.
- [Npm Package](/guide/npm-package) — generated package entries and declaration bundles.
- [Production Deployment](/guide/production-deployment) — production build and hosting considerations.