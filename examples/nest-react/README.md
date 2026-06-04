# Nest + React Example

This example shows `@inertia-node/nest` with Nest's Express platform, React, Vite, sessions, password login, flash messages, validation errors, deferred props, mergeable props, and dev reload.

```sh
PORT=3012 pnpm --filter @inertia-node/example-nest-react dev
```

Open `http://localhost:3012/login`.

Demo credentials:

```txt
ada@example.com
password
```

Editing `src/Pages/*.tsx` or `src/style.css` updates through Vite HMR. Editing `src/server.ts` restarts the Nest server through `tsx watch`; the browser reloads through the dev SSE endpoint. Sessions are stored in `.tmp/nest-example-sessions.json` for development so login survives server restarts.

The file-backed session store and hardcoded password are development-only. Use a real session store, hashed passwords, and database-backed users in production.
