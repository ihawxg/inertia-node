# Nest Fastify + React Example

This example shows `@inertia-node/nest-fastify` with Nest's Fastify platform, React, Vite, `@fastify/session`, password login, flash messages, validation errors, deferred props, mergeable props, and dev reload.

```sh
PORT=3013 pnpm --filter @inertia-node/example-nest-fastify-react dev
```

Open `http://localhost:3013/login`.

Demo credentials:

```txt
ada@example.com
password
```

Editing `src/Pages/*.tsx` or `src/style.css` updates through Vite HMR. Editing `src/server.ts` restarts the Nest Fastify server through `tsx watch`; the browser reloads through the dev SSE endpoint. Sessions are stored in `.tmp/nest-fastify-example-sessions.json` for development so login survives server restarts.

The file-backed session store and hardcoded password are development-only. Use a real session store, hashed passwords, and database-backed users in production.
