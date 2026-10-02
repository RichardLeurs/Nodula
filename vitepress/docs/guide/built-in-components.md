# Built-in Components

Nodula does not ship a Vue-style set of built-in component tags. Its core offers DOM helpers such as `h`, `fragment`, `when`, `each`, `slot`, `component`, `mount`, and `visibleIsland`. The router provides the `<outlet :view="…" />` placeholder used by layouts.

`Transition`, `TransitionGroup`, `KeepAlive`, `Teleport`, and `Suspense` are not built-in Nodula components. The optional animation add-on supplies explicit and opt-in lifecycle transition helpers; it does not add those Vue components. See [Animations](/guide/animations).
