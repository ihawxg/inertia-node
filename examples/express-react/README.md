# Express React Example

Full-stack Inertia app using:

- Express
- `@inertia-node/express`
- `express-session`
- official `@inertiajs/react`
- Vite

## Run

```sh
pnpm install
PORT=3011 pnpm dev:example
```

Open `http://localhost:3011/login`.

Demo login:

```txt
email: ada@example.com
password: password
```

## Included Flows

- login/logout through auth hooks
- protected dashboard with `requireAuth()`
- flash success message
- validation error on failed login
- deferred stats
- mergeable activity feed
- server live reload for `src/server.ts`
- SSR entry scaffold at `src/ssr.tsx`

## Development Reloading

- React page and CSS changes update through Vite HMR.
- `src/server.ts` changes restart the server through `tsx watch`.
- The browser listens to the dev reload endpoint and refreshes after a server restart.
- Example sessions are stored in `.tmp/example-sessions.json`, so login survives dev server restarts.

The demo password is hardcoded plain text for development only. Do not copy this auth model into production.
