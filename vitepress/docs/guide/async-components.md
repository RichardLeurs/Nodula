# Async Components

Nodula's file-based router supports lazy page and layout modules through Vite's `import.meta.glob`. It loads the matched page/layout chain on demand, shows loading or failure content, caches successful modules, and ignores stale results after navigation or disposal.

For non-route content, `visibleIsland(loader, placeholder)` defers calling a dynamic-import loader until its placeholder intersects the viewport (or loads immediately if `IntersectionObserver` is unavailable). Nodula does not provide a general `defineAsyncComponent` API or Vue's Suspense integration.
