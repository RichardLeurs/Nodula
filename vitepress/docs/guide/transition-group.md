# TransitionGroup

There is no `TransitionGroup` component in Nodula. The optional animation add-on can animate insertion and removal of keyed `@for`/`each` rows after `enableLifecycleTransitions()` is called. Stable unique keys remain required for keyed lists.

Rows that are removed stop participating in reactive updates while their leave animation runs, then are removed from the DOM. Reordering keyed rows preserves their node identity; it is not animated as a layout-move transition. See [List Rendering](/guide/list-rendering) and [Animations](/guide/animations).
