# KeepAlive

Nodula does not cache inactive component trees with a `KeepAlive` component. Conditional branches are disposed when switched out: effects and event listeners are cleaned up and the branch's nodes are removed (or leave-animated if lifecycle transitions are enabled).

To preserve state across views, keep the state in a signal/store owned by a longer-lived parent or module and render the view from that state. Nodula's lazy router caches successfully imported modules, not mounted page instances.
