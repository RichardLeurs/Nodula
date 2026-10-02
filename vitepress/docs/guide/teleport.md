# Teleport

Nodula does not provide a `Teleport` component. `mount(target, component)` mounts into a chosen selector or element, but it replaces that target's children and returns a disposer; it is not a declarative portal.

For overlay UI, create or select a dedicated DOM mount target and mount a separately owned component there. Ensure its disposer runs when the overlay closes so event listeners and reactive ownership are cleaned up.
