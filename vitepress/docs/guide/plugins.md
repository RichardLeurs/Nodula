# Plugins

Vite plugins and Nodula add-ons serve different roles. The repository's internal Nodula Vite plugin compiles `.page` files at build time. Optional runtime add-ons are separate package entries: `nodula-framework/form`, `nodula-framework/router`, and `nodula-framework/animation`.

There is no general `app.use()` plugin API. Add-ons are imported explicitly and externalize the core package so they share its reactive runtime. A fresh external Vite project still needs access to the `.page` compiler plugin; it is not currently a public package entry.
