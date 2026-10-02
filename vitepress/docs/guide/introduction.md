# Introduction

Nodula is a small, client-side JavaScript framework built around signals and direct DOM updates. It offers a compact runtime, `.page` single-file components, and optional form, router, and animation add-ons. Vite compiles `.page` files and builds the app; the browser runtime itself has no framework dependencies.

Nodula is intentionally a focused toolkit, not a Vue-compatible implementation. Its current APIs and limits are described throughout this guide and in [Specifications and Limits](/guide/specifications).

## Choose an authoring style

- Use JavaScript functions and`h()`for direct DOM construction.
- Use`.page`files for a`<script setup>`, a single-root HTML-like`<template>`, and optional styles.
- Add`nodula-framework/form`,`nodula-framework/router`, or`nodula-framework/animation`only when needed.

Continue with [Quick Start](/guide/quick-start) or [Creating an Application](/guide/creating-an-application).
