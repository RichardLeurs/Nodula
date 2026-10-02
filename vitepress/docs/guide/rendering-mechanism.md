# Rendering Mechanism

The core DOM helper creates native elements directly. Function-valued children and supported function-valued properties run in tracked effects. On update, compatible nodes are reconciled in place; unkeyed descendants match by position and keyed template rows match by key. Incompatible nodes are replaced.

Nodula's renderer is intentionally small and client-side. It does not provide a virtual-DOM compatibility layer, SSR, or hydration. Compiler behavior and reconciliation boundaries are described in [Specifications and Limits](/guide/specifications).
