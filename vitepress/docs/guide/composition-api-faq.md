# Function-Based API FAQ

### Is Nodula's API the Vue Composition API?

No. Nodula has `signal`, `computed`, `effect`, `createRoot`, and `onCleanup`, but does not implement Vue's Composition API or its lifecycle hooks.

### Is there a `watch()` function?

No separate watcher API is provided. Use `effect()` to track values read during execution; it runs immediately and returns a stop function.

### Can TypeScript be used?

JavaScript remains the supported script language in `.page` and `.comp` files. TypeScript consumers can use the package's public declaration files in their surrounding application code.
