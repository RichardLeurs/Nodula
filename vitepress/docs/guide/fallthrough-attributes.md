# Fallthrough Attributes

Nodula does not automatically forward undeclared attributes from a component invocation to a rendered root element. Imported `.comp` components receive the attributes passed by the caller in their `props` context; the component decides which values to apply to its elements.

Forward a desired attribute explicitly, for example with `:class="props.class"` or `:title="props.title"`. This avoids implicit inheritance rules. The template requires a single root element and its compiler supports only the documented template syntax; see [Template Syntax](/guide/templates).
