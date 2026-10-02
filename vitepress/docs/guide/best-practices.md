# Best Practices

- Use`signal`for scalar state; import`createStore`from`nodula-framework/store`when nested plain-object or array reactivity is useful.
- Stop effects or register teardown with`onCleanup`; keep ownership scopes clear.
- Give every`@for`/`each`row a unique, stable key.
- Keep`.page`syntax within the documented subset and use one template root.
- Use the optional router, form, and animation package entries only where needed.
- Respect reduced-motion preferences; the animation add-on does this by default.
- Treat the demo API as local-only, not production infrastructure.

Check [Specifications and Limits](/guide/specifications) before depending on a feature that resembles a Vue API.
