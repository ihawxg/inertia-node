# Quickstart

Create an Express app with Inertia React.

```sh
pnpm add express express-session @inertia-node/express @inertiajs/react react react-dom
pnpm add -D typescript tsx vite @vitejs/plugin-react @types/express @types/express-session
```

```ts
import express from "express";
import session from "express-session";
import { createServer as createViteServer } from "vite";
import {
  expressSessionAdapter,
  inertiaMiddleware,
} from "@inertia-node/express";

const app = express();
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});

app.use(vite.middlewares);
app.use(session({ secret: "secret", resave: false, saveUninitialized: false }));
app.use(
  inertiaMiddleware({
    version: "dev",
    session: expressSessionAdapter(),
    rootView: ({ page }) => `<!doctype html>
<html>
  <head>
    <script type="module" src="/@vite/client"></script>
    <script type="module" src="/src/app.tsx"></script>
  </head>
  <body>
    <script data-page="app" type="application/json">${page}</script>
    <div id="app"></div>
  </body>
</html>`,
  }),
);

app.get("/", (_req, res) => {
  void res.inertia("Home", { message: "Hello from Node" });
});

app.listen(3000);
```

React client entry:

```tsx
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob("./Pages/**/*.tsx", { eager: true });
    return pages[`./Pages/${name}.tsx`].default;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
});
```

## Support Matrix

- Node adapters: Node 20+
- SSR package: Node 22+
- Express: `>=4.18 <6`
- Express session: `>=1.17 <2`
- NestJS: `>=10 <12` on the Express platform
- Inertia client packages: v3
