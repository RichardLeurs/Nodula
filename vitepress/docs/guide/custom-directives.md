# Custom Directives

Nodula does not offer a general user-defined directive registration API. Its compiler has a fixed set of supported directives, including `@if`, `@else`, `@for`, `@show`, `@ref`, event syntax, input bindings, and `use:visibleIsland`.

For one-off DOM behavior, use a `ref` callback in JavaScript or `@ref` in a template and register teardown with the owner. For reusable behavior, prefer a JavaScript helper or component. Unsupported directive-like attributes are not automatically converted to behavior.
