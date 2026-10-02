# TypeScript

TypeScript is optional for Nodula applications. JavaScript is the implementation language, while declaration files provide public API types and editor hints for the core, form, router, and animation package entries.

`.page` and `.comp` `<script setup>` blocks remain JavaScript-only. The repository checks source declarations with `npm test`/`npm run typecheck` and checks emitted bundle declarations during `npm run build`. See [TypeScript Overview](/guide/typescript-overview), [Composition API-style TypeScript](/guide/typescript-composition-api), and [Options API TypeScript](/guide/typescript-options-api) for Nodula-specific guidance (the latter is explicitly not supported as an API).
