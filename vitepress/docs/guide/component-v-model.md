# Component `v-model`

Nodula does not implement Vue's component `v-model` directive or model event convention. For native `value` and `checked` inputs, use an explicit signal getter/setter pair with `@bind:value` or `@bind:checked`.

For a reusable `.comp` component, pass the getter's current value as a prop and pass the setter as a callback prop. This keeps data flow explicit and works with the supported component prop/event-callback model. See [Form Input Bindings](/guide/form-input-bindings).
