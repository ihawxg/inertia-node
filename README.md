# Inertia Node Adapter

[![CI](https://github.com/inertia-node/inertia-node-adapter/actions/workflows/ci.yml/badge.svg)](https://github.com/inertia-node/inertia-node-adapter/actions/workflows/ci.yml)

TypeScript server adapters for using the official Inertia.js client packages with Node.js backends.

This repository starts with:

- `@inertia-node/core`: framework-agnostic Inertia v3 protocol helpers.
- `@inertia-node/express`: Express middleware and response helpers.
- `@inertia-node/ssr`: standalone SSR server for separate-process rendering.
- `examples/express-react`: minimal Express + React + Vite example.

## Status

Early MVP. The current goal is Laravel-like Inertia ergonomics for Node.js while keeping auth, database, and routing choices in application code. Fastify and NestJS adapters are planned next.

## Install

```sh
pnpm add @inertia-node/express @inertiajs/react express-session react react-dom
```

## Express Usage

```ts
import express from "express";
import session from "express-session";
import {
  defer,
  expressSessionAdapter,
  inertiaAuth,
  inertiaMiddleware,
  merge,
  requireAuth,
} from "@inertia-node/express";

const app = express();

app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));

app.use(
  inertiaMiddleware({
    version: "1",
    session: expressSessionAdapter(),
    auth: inertiaAuth({
      getUser: async (req) =>
        req.session.userId ? getUser(req.session.userId) : null,
      login: async (req, user) => {
        req.session.userId = user.id;
      },
      logout: async (req) => {
        delete req.session.userId;
      },
      serializeUser: (user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }),
    }),
    rootView: ({ page }) => `<!doctype html>
<html>
  <head>
    <script type="module" src="/src/app.tsx"></script>
  </head>
  <body>
    <script data-page="app" type="application/json">${page}</script>
    <div id="app"></div>
  </body>
</html>`,
  }),
);

app.get("/dashboard", requireAuth(), (_req, res) => {
  return res.inertia("Users/Index", {
    users: [{ id: 1, name: "Ada Lovelace" }],
    stats: defer(() => loadStats()),
    activity: merge(() => loadActivity()).append("data"),
  });
});
```

## Validation and Flash

```ts
app.post("/users", async (req, res) => {
  const result = validate(req.body);

  if (!result.ok) {
    return res.backWithErrors(result.errors);
  }

  await req.flash("success", "User created");
  return res.inertiaRedirect("/users");
});
```

## SSR

Create an SSR entry that exports a render function returning `{ head, body }`, then run:

```sh
inertia-node-ssr --entry dist/ssr.js --host 127.0.0.1 --port 13714
```

Enable the adapter client:

```ts
app.use(
  inertiaMiddleware({
    ssr: {
      enabled: true,
      url: "http://127.0.0.1:13714/render",
    },
  }),
);
```

## Development

```sh
pnpm install
pnpm test
pnpm build
pnpm dev:example
```

## Docs

- [Quickstart](docs/quickstart.md)
- [React setup](docs/react.md)
- [Sessions, flash, and validation](docs/session-flash-validation.md)
- [Auth hooks](docs/auth.md)
- [SSR](docs/ssr.md)
- [Deployment](docs/deployment.md)
- [Laravel comparison](docs/laravel-comparison.md)
- [Prisma recipe](recipes/prisma.md)
- [Drizzle recipe](recipes/drizzle.md)

## Compatibility

Targets the Inertia v3 protocol and official `@inertiajs/*` client packages. History encryption and Precognition are future work.

- Node adapters: Node 20+
- SSR package: Node 22+
- Express: `>=4.18 <6`
- Express session: `>=1.17 <2`
