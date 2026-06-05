# @inertia-node/express

Production-ready Express middleware and helpers for Inertia.js in Node.js.

The adapter wires Inertia protocol requests and response helpers directly onto
`Express.Request` / `Express.Response`, and provides:

- request detection + protocol response creation
- flash data and error persistence via a tiny session adapter contract
- auth helpers for route guards and serialized user sharing
- lazy/partial prop helpers re-exported from `@inertia-node/core`

## Install

```sh
pnpm add @inertia-node/express @inertiajs/react express-session
```

Peer dependencies:

- `express ^4.18 || ^5`
- `express-session >=1.17 <2`

## Quick start

```ts
import express from "express";
import session from "express-session";
import {
  expressSessionAdapter,
  inertiaAuth,
  inertiaMiddleware,
  requireAuth,
} from "@inertia-node/express";

const app = express();

app.use(
  session({
    secret: "replace-me",
    saveUninitialized: false,
    resave: false,
  }),
);

app.use(
  inertiaMiddleware({
    version: "1",
    session: expressSessionAdapter(),
    auth: inertiaAuth({
      getUser: async (req) => req.session.user ?? null,
      login: async (req, user) => {
        req.session.user = user;
      },
      logout: async (req) => {
        delete req.session.user;
      },
      serializeUser: (user) => ({ id: user.id, name: user.name }),
    }),
    rootView: ({ page }) => `
<!doctype html>
<html>
  <head>
    <script type="module" src="/src/app.tsx"></script>
  </head>
  <body>
    <div id="app" data-page='${page}'></div>
  </body>
</html>`,
  }),
);

app.get("/dashboard", requireAuth("/login"), async (_req, res) => {
  return res.inertia("Dashboard/Index", {
    stats: ["users", "orders", "uptime"],
  });
});
```

## Middleware behavior

`inertiaMiddleware(options)` returns a standard `RequestHandler`.

It mutates:

- `req.flash(key, value)` for storing temporary flash state
- `req.user` and `req.auth` if `auth` is configured
- `res.inertia(component, props, renderOptions)`
- `res.inertiaRedirect(location, status?)`
- `res.inertiaLocation(location)`
- `res.backWithErrors(errors, options?)`

### Authentication helpers

- `requireAuth(redirectTo = "/login")`  
  Redirects unauthenticated requests to `redirectTo`.
- `guestOnly(home = "/dashboard")`  
  Redirects authenticated users to a home/dashboard route.

## Session contract

`SessionStore` adapter keys:

- `get(key)`
- `set(key, value)`
- `pull(key)`
- `flash(key, value)`
- `reflash()`

The included `expressSessionAdapter()` maps Express session values to this contract.

## Validation and errors

`res.backWithErrors(errors, options)` stores errors and redirects:

- with `x-inertia-error-bag` header, it respects bag scoping
- with `withAllErrors: true`, multi-value arrays are preserved
- without it, first message per field is used by default

`errors` format is `{ [field]: string | string[] }`.

## Exports

- `inertiaMiddleware`
- `expressSessionAdapter`
- `requireAuth`
- `guestOnly`
- plus all shared helpers from `@inertia-node/core`:
  - `createInertia`, `always`, `defer`, `merge`, `optional`, `validationError`, `inertiaAuth`

## Troubleshooting

- Empty protocol body is often caused by calling `res.inertia(...)` after the response was already sent.
- If headers are missing, confirm the request is sent with `X-Inertia` and `X-Inertia-Version`.
- For auth routes, apply `req.session` middleware before `inertiaMiddleware`.

## Related docs

- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/quickstart.md
- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/session-flash-validation.md
- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/auth.md
