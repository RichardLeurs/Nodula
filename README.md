# Nodula

Nodula is a lightweight JavaScript framework built for simplicity and speed around modular architecture. Build your application from small, focused pieces that work together naturally.

The Nodula framework is in beta status, the framework is working (see the demo app) but it is a work in progress and not a user friendly npm install yet.

## Design

Nodula has a small core runtime, with optional add-on modules for extra features. Import only the add-on modules your app needs.

### Core

Reactivity, DOM rendering, Helpers    

### State & Data

| <div style="width: 100px; ">Module</div>        | Contents                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Localstorage   | Persist signals to localStorage or IndexedDB, and read, set, or delete browser cookies              |
| Store          | Deeply reactive proxies for plain objects and arrays, including nested values                       |
| Data           | Fetch data from a server with method helpers, query parameters, and readable HTTP errors            |
| Auth           | Reactive client authentication state connected to an app-provided auth service                      |

### UI & Interaction

| <div style="width: 100px; ">Module</div>          | Contents                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| File drop | Accessible native file picker and drop zone with caller-supplied labels and owner cleanup |
| Drag & drop | A small wrapper around native DragEvent and DataTransfer with owner cleanup; your app controls the actual data move |
| Sortable list | Reorder vertical lists with native drag and drop, visible insertion feedback, and accessible Move Up/Down controls |
| Notification   | Show accessible, transient status messages for success, error, warning, and info                  |
| Navigation     | Accessible router-aware internal links and explicitly external HTTP(S) links                        |
| Dropdown   | A keyboard-operable disclosure that composes with router-aware navigation links                |
| Form          | Reactive form values, validation, touched and dirty state, async submission, and reset helpers      |
| Dialog         | Native confirmation dialogs with configurable labels and owner cleanup                              |
| Modal          | Native modal windows with safe content, close controls, and configurable backdrop dismissal         |
| Drawer         | Accessible modal side panels that open from the left or right                                       |
| Cookie Consent | Manage versioned privacy choices with a floating, expandable consent notice (EU GDPR/ePrivacy)      |



### Runtime behavior


| <div style="width: 100px; ">Module</div>          | Contents                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Router         | Hash or History API navigation, route views, and lazy file-based pages and layouts                  |
| Animation      | Web Animations helpers and opt-in enter/leave transitions for routes, conditionals, and keyed lists |

### Build & Integration


| <div style="width: 100px; ">Module</div>          | Contents                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------- |
| SEO            | Route-aware title, descriptions, canonical, Open Graph, hreflang, sitemap, and robots metadata      |
| Auth           | Reactive client authentication state connected to an app-provided auth service                      |


## Install and run

This repository contains the code for the Nodula framework and a demo app. This demo app is the website for Nodula, see https://nodula.richardleurs.nl.

To install this repository's dependencies and run the demo locally:

```sh
npm install
npm run nodula
```
`npm run nodula` shows a menu with all options for testing, running and building the framework and demo.

Choose Start the dev server in the menu to run the demo. That entry runs`npm run dev`.

For a production build, run `npm run build`. This will build the framework to `dist/nodula/` and the demo app to `dist/app/`.
It also builds the npm package to the `/dist/npm` directory. The demo app loads that file as the framework package.


## VS Code language extension

The framework comes with a VS Code language extension. The extension recognizes:

- `.page` — Nodula route pages
- `.comp` — Reusable Nodula components

It highlights JavaScript inside `<script>` blocks, HTML inside `<template>` blocks, and CSS inside `<style>` blocks. Nodula template directives such as `@if`, `@for`, `@click`, `:value`, and `{{ expressions }}` receive Nodula-specific highlighting. Embedded code uses the colors from the active VS Code theme.

See the README.md file in /vscode-nodula for installation guidelines.

## Nodula Documentation

You can find the documentation at https://nodula-docs.richardleurs.nl.

## License

Nodula is free software licensed under the
[GNU General Public License v3.0 or later](https://www.gnu.org/licenses/gpl-3.0.html).

Copyright © 2026 Richard Leurs