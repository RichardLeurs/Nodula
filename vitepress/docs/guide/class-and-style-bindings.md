# Class and Style Bindings

Nodula supports ordinary HTML `class` attributes and reactive property bindings such as `:class` and `:style` in `.page` and `.comp` templates:

```
<template>
  <button :class="active() ? 'button button--active' : 'button'"
          :title="active() ? 'Active' : 'Inactive'">
    Toggle state
  </button>
</template>
```

Function-valued properties are tracked and updated by the DOM helper. Stylesheets can be global with `<style>` or component-scoped with `<style scoped>`. CSS Modules are not implemented; use native CSS classes. See [Template Syntax](/guide/templates).
