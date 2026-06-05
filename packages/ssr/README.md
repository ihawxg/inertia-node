# @inertia-node/ssr

Standalone SSR server for Inertia.js.

This package runs a tiny HTTP service that receives Inertia page payloads,
loads a renderer module, and returns rendered SSR output.

It is useful when server-side rendering is deployed in a separate process
from your web API server.

## Install

```sh
pnpm add @inertia-node/ssr
```

Node.js requirement: `>=22`

## API

Exports:

- `loadRenderer(entry: string): Promise<SsrRenderFunction>`
- `createSsrServer(options: SsrServerOptions): Promise<http.Server>`
- `listen(options: SsrServerOptions): Promise<void>`
- `SsrServerOptions = { entry, host?, port? }`
- `SsrRenderFunction = (page: InertiaPage) => SsrResult | Promise<SsrResult>`

The server listens only on `POST /render` and expects a JSON body containing an `InertiaPage`.

## Quick start

### 1) Create an SSR entry

```tsx
// ssr-entry.tsx
import { renderToString } from "react-dom/server";
import { createInertiaApp } from "@inertiajs/react";

export default async function render(page) {
  const result = await createInertiaApp({
    page,
    render: (element) => renderToString(element),
    resolve: (name) => {
      const pages = import.meta.glob("./Pages/**/*.tsx", { eager: true });
      const module = pages[`./Pages/${name}.tsx`];
      return module.default;
    },
    setup: ({ App, props }) => <App {...props} />,
  });

  return {
    head:
      typeof result.head === "function" ? result.head() : String(result.head),
    body: String(result.body),
  };
}
```

### 2) Run server process

```sh
inertia-node-ssr --entry dist/ssr-entry.js --host 127.0.0.1 --port 13714
```

### 3) Consume from adapter layer

Configure your adapter with SSR options:

```ts
inertiaMiddleware({
  ssr: {
    enabled: true,
    url: "http://127.0.0.1:13714/render",
  },
});
```

## Response contract

`render(page)` must return:

- `head` string
- `body` string

or an object shaped as `SsrResult` from `@inertia-node/core`.

## CLI

- `inertia-node-ssr --entry <path> --host <host> --port <port>`
- defaults:
  - host: `127.0.0.1`
  - port: `13714`

## Notes

- `entry` can be a `file:` URL or a local path.
- Renderer modules can export:
  - `default` function
  - `render` function
- The module import is cache-busted with a timestamp query to support hot updates in dev-like flows.

## Related docs

- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/ssr.md
- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/deployment.md
