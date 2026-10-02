# Scaling Up

Scale a Nodula app by separating `.page` route pages, reusable `.comp` components, state modules, and optional add-ons. This repository keeps the demo app in `demo_app/src/` and framework source in `framework/`; the demo uses `demo_app/src/routes/` for pages and colocates app-specific components outside that route directory. File routes are lazy-loaded, while shared runtime APIs come from the core package entry.

Build with `npm run build`, test with `npm test`, and type-check the published API declarations with the existing type-check scripts. Consider Nodula's current boundaries—client rendering, focused templates, and no built-in HTTP or DI layer—when deciding whether it fits a larger app.
