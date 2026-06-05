# @inertia-node/express

Express adapter for Inertia.js on Node.js.

`@inertia-node/express` adds Inertia response helpers to Express applications. It uses `@inertia-node/core` internally, then adapts the protocol to normal Express middleware, request objects, response objects, redirects, sessions, flash data, validation errors, and authentication flows.

## Features

- Adds `res.inertia(...)` for rendering Inertia pages.
- Adds `res.inertiaRedirect(...)` and `res.inertiaLocation(...)` for protocol-aware redirects.
- Adds `res.backWithErrors(...)` for validation error redirects.
- Adds `req.flash(...)` for temporary flash state.
- Supports auth guards through `requireAuth(...)` and `guestOnly(...)`.
- Supports shared props, partial reloads, lazy props, deferred props, merge props, and SSR.
- Re-exports useful helpers from `@inertia-node/core`.

## Installation

```sh
pnpm add @inertia-node/express express express-session
```

```sh
npm install @inertia-node/express express express-session
```

Peer dependencies:

- `express >=4.18 <6`
- `express-session >=1.17 <2`

Install your Inertia client separately, for example:

```sh
pnpm add @inertiajs/react react react-dom
```

## Quick Start

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
    secret: process.env.SESSION_SECRET ?? "replace-me",
    resave: false,
    saveUninitialized: false,
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
      serializeUser: (user) => ({
        id: user.id,
        name: user.name,
      }),
      redirectTo: "/login",
      home: "/dashboard",
    }),
    share: async ({ request }) => ({
      appName: "Inertia Node",
      locale: request.headers["accept-language"] ?? "en",
    }),
    rootView: ({ page }) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="module" src="/src/app.tsx"></script>
  </head>
  <body>
    <div id="app" data-page='${page}'></div>
  </body>
</html>`,
  }),
);

app.get("/dashboard", requireAuth(), async (_req, res) => {
  await res.inertia("Dashboard/Index", {
    stats: {
      users: 42,
      orders: 128,
    },
  });
});

app.post("/profile", async (_req, res) => {
  await res.backWithErrors({
    name: ["The name field is required."],
  });
});

app.listen(3000);
```

## Middleware API

### `inertiaMiddleware(options)`

Registers the Inertia runtime and attaches helpers to `req` and `res`.

Important options:

- `version`: asset version string or resolver.
- `rootView`: HTML shell renderer.
- `share`: shared props for every page.
- `session`: session adapter factory.
- `auth`: auth runtime configuration.
- `ssr`: server-side rendering endpoint configuration.
- `withAllErrors`: preserves all validation messages instead of the first message per field.

### Response Helpers

```ts
await res.inertia("Users/Index", {
  users: await loadUsers(),
});

res.inertiaRedirect("/dashboard");

res.inertiaLocation("https://example.com/external");

await res.backWithErrors({
  email: ["Email is required."],
});
```

### Auth Helpers

```ts
app.get("/dashboard", requireAuth("/login"), dashboardHandler);
app.get("/login", guestOnly("/dashboard"), loginHandler);
```

- `requireAuth(redirectTo = "/login")` redirects unauthenticated users.
- `guestOnly(home = "/dashboard")` redirects authenticated users away from guest-only pages.

## Sessions, Flash, and Validation

`expressSessionAdapter()` maps `express-session` to the shared `SessionStore` contract:

- `get(key)`
- `set(key, value)`
- `pull(key)`
- `flash(key, value)`
- `reflash()`

Validation errors are stored in session and shared as Inertia `errors` props. Flash values are pulled once and shared as `flash` props.

## SSR

Enable SSR by pointing the adapter to an SSR endpoint:

```ts
app.use(
  inertiaMiddleware({
    ssr: {
      enabled: true,
      url: "http://127.0.0.1:13714/render",
      timeoutMs: 1500,
    },
  }),
);
```

Use `@inertia-node/ssr` to run the standalone renderer.

## Exports

- `inertiaMiddleware`
- `expressSessionAdapter`
- `requireAuth`
- `guestOnly`
- `AuthenticatedRequest`
- `ExpressInertiaOptions`
- `ExpressRenderOptions`
- Re-exported core helpers such as `always`, `defer`, `merge`, `optional`, `validationError`, `inertiaAuth`, and `createInertia`

## Troubleshooting

- If auth data is always missing, make sure `express-session` runs before `inertiaMiddleware`.
- If `res.backWithErrors(...)` throws, make sure a session adapter is configured.
- If full page loads return JSON, check that the browser request is not sending `X-Inertia`.
- If SSR does not appear in the HTML source, confirm that the SSR server is reachable and that `ssr.enabled` is true.

## Documentation

- Repository: https://github.com/inertia-node/inertia-node-adapter
- Quick start: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/quickstart.md
- Auth: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/auth.md
- Sessions, flash, and validation: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/session-flash-validation.md
- SSR: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/ssr.md
