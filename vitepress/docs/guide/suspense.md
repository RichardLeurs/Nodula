# Suspense

Nodula has no `Suspense` component or general async-component boundary. The file-based router supplies loading and error text while a lazy route or layout module is being loaded, and ignores results that arrive after navigation or disposal.

For other asynchronous work, model pending/error/result values with signals and render them with `@if`/`@else`. See [Async Components](/guide/async-components) and [Conditional Rendering](/guide/conditional-rendering).
