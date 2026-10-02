# Props

Imported `.comp` components receive a `props` object in their setup context. Call sites can pass static attributes or reactive `:` attributes:

```
<Panel title="Profile" :active="isActive()" />
```

The child reads `props.title` and `props.active`; the runtime updates supplied props reactively. In JavaScript, `component(render, readProps, slots)` describes a component render with a props accessor. Nodula does not implement Vue prop declarations, validators, defaults, or attribute fallthrough; document and validate those conventions in application code.
