# Performance

Nodula tracks signal/store reads and updates compatible DOM nodes rather than requiring a full component-tree render. Keyed rows preserve identity through reorder; file-based route modules load on first visit and cache successful imports.

The package declares its JavaScript entries side-effect-free, and production-consumer tests verify that Vite removes unused exports from the core, form, router, and animation entries. This verification covers the tested Vite production configuration; other bundlers and consumer configurations are not exhaustively verified. Recommended runtime-size and broader code-splitting targets remain unverified. Do not infer a measured runtime size from the demo application bundle. For current targets, consult [Specifications and Limits](/guide/specifications).
