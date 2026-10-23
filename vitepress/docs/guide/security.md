# Security

Nodula runs in the browser and renders application UI. It is not an authentication server, authorization layer, input-validation boundary, or secure storage system. Treat every browser value and client-side decision as untrusted; enforce access and validate data in the server/API that owns the protected operation.

## Trust the server, not the UI

Client-side route guards, hidden buttons, form validation, and `hasRole()`/`hasPermission()` checks help shape user experience only. A user can modify browser state, call an endpoint directly, or run a different client. Authenticate the requester and authorize each protected API operation on the server using trusted session/identity data.

```js
// Client-side guard can improve navigation UX; it does not secure the API.
const requireSession = ({ to }) => auth.isAuthenticated() ? true : '/login';
```

The protected server endpoint must independently verify the session and permission before returning data or applying a change. See [Authentication](/guide/auth) and [Routing](/guide/routing).

## Validate input at the trusted boundary

Validate request bodies, query parameters, identifiers, file uploads, and state transitions on the server. Client-side validation is useful feedback, not a substitute for server checks. Apply output encoding appropriate to the destination context when rendering data in HTML, attributes, URLs, CSS, or scripts.

Nodula's template interpolation and common content add-ons render text as text; for example, dialog/modal/notification string content uses `textContent`. This behavior helps avoid interpreting those strings as markup, but it does not sanitize arbitrary HTML your app inserts by other means or secure server-side output. Avoid assigning untrusted strings to `innerHTML`; if rich HTML is required, use a vetted sanitization policy and restrict allowed elements/attributes.

## Keep secrets out of browser code

Anything shipped to a browser—including bundled environment values, source maps, request headers, and client storage—is visible to the user. Do not embed API keys, database credentials, private signing keys, or server-only tokens in Nodula source or build-time client constants. Put privileged upstream access behind a server endpoint.

The Fetch-based [Data add-on](/guide/data) sends requests from the browser when called client-side. Cross-origin APIs need appropriate CORS policy; CORS is not authorization. Use a same-origin backend or server-side proxy when secrets or privileged upstream credentials must remain private.

## Authentication state and browser storage

The optional Auth add-on stores reactive user/session state in the running client and delegates authentication operations to the application's adapter. It does not create secure sessions, protect tokens, or authorize server requests. Design the adapter and backend around a suitable session model, protect session cookies with server-controlled attributes where appropriate, and defend state-changing cookie-authenticated requests against CSRF.

`localStorage`, IndexedDB, and script-readable cookies can be read or modified by JavaScript executing in the page. Do not store long-lived secrets or treat browser-stored roles/permissions as trusted. JavaScript cannot set the `HttpOnly` cookie attribute; create HttpOnly cookies on the server. Use `Secure` and an intentional `SameSite` policy for cookies where applicable, and avoid placing sensitive data in URLs or logs.

## CORS, CSRF, and transport

- Serve production apps and authenticated APIs over HTTPS.
- Configure CORS with the specific trusted origins and methods your API needs; do not use permissive CORS as a substitute for access control.
- If authentication uses cookies, use appropriate CSRF defenses for state-changing requests. CORS alone does not prevent every cross-site request.
- Avoid exposing sensitive values in query strings, which can be copied into browser history, logs, analytics, and referrer data.
- Return only the data a caller is authorized to access, and avoid leaking stack traces, credentials, or internal diagnostics in API errors.

## PWA and caching boundaries

Service workers and browser caches can persist responses beyond one page view. Do not precache private or user-specific responses. Review Workbox runtime caching rules, partition or exclude personalized data as appropriate, and clear application-owned caches on logout when sensitive data may have been stored. See [Progressive Web Apps](/guide/pwa) and [Production Deployment](/guide/production-deployment).

## Demo API warning

The repository demo's PHP API and its Node port in `api-node/` are local/demo-only and have no authentication or per-user authorization. The Vite `/api` proxy is development tooling, not a production reverse proxy. **Do not expose the demo API publicly.** A hosted app needs a production-grade server/API, server-side authorization, HTTPS, appropriate persistence, monitoring, and deployment configuration.

## Security review checklist

- Does every protected server endpoint authenticate and authorize each request?
- Are untrusted inputs validated on the server, with output encoded or sanitized for their final context?
- Are secrets and privileged credentials kept out of browser bundles and storage?
- Are cookie sessions configured with suitable Secure/SameSite/HttpOnly and CSRF protections?
- Are CORS origins restricted to intended consumers?
- Are personalized API responses excluded from unsafe precache/runtime caching?
- Do client guards and UI permission checks remain presentation-only?
- Is the local demo API replaced before public deployment?

## Related guides

- [Authentication](/guide/auth) — client auth state and server enforcement boundary.
- [Data Add-on](/guide/data) — browser Fetch behavior, CORS, and request errors.
- [Routing](/guide/routing) — client guards and authorization limits.
- [Progressive Web Apps](/guide/pwa) and [Production Deployment](/guide/production-deployment) — service-worker and hosting risks.
- [Accessibility](/guide/accessibility) — safe and usable interaction/content patterns.