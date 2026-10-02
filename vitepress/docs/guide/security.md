# Security

Nodula's browser runtime is a UI layer, not an API security boundary. Validate and authorize requests on the server; never trust client-side route guards, form validation, or hidden controls as access control.

The Auth add-on's `hasRole()` and `hasPermission()` helpers are likewise for client-side UI decisions only. Enforce roles and permissions on the server for every protected operation.

The example Python API is local-only, uses `http.server`, and has no authentication or per-user authorization. Do not expose it publicly. A hosted application needs a production-grade server, appropriate authorization, HTTPS, persistent storage where needed, and a same-origin API configuration. See the security boundary notes in `/README.md` and `/SPECS.md` in the repository.
