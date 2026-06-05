# @inertia-node/ssr

Standalone SSR server for Inertia Node adapters.

`@inertia-node/ssr` runs a small HTTP server that receives an Inertia page object, calls your SSR renderer, and returns rendered HTML fragments. It is designed to be used by `@inertia-node/express`, `@inertia-node/nest`, `@inertia-node/nest-fastify`, or any custom adapter built on `@inertia-node/core`.

## Features

- Provides the `inertia-node-ssr` CLI.
- Provides a programmatic SSR server API.
- Loads a renderer from a local path or `file:` URL.
- Accepts JSON page payloads through `POST /render`.
- Supports renderer modules with either a default export or named `render` export.
- Returns the shared `SsrResult` shape used by `@inertia-node/core`.

## Installation

```sh
pnpm add @inertia-node/ssr
```

```sh
npm install @inertia-node/ssr
```

Node.js requirement:

- `>=22`

## Quick Start

### 1. Create an SSR Entry

```tsx
// ssr-entry.tsx
import { createInertiaApp } from "@inertiajs/react";
import { renderToString } from "react-dom/server";

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

### 2. Build the SSR Entry

Use your normal app build tool to produce a server-renderable ESM file:

```sh
pnpm build
```

The output path must point to the compiled SSR entry, for example `dist/ssr-entry.js`.

### 3. Start the SSR Server

```sh
inertia-node-ssr --entry dist/ssr-entry.js --host 127.0.0.1 --port 13714
```

### 4. Enable SSR in an Adapter

```ts
inertiaMiddleware({
  ssr: {
    enabled: true,
    url: "http://127.0.0.1:13714/render",
    timeoutMs: 1500,
  },
});
```

## CLI

```sh
inertia-node-ssr --entry <path> [--host 127.0.0.1] [--port 13714]
```

Arguments:

- `--entry`: required path to the compiled renderer module.
- `--host`: optional host, defaults to `127.0.0.1`.
- `--port`: optional port, defaults to `13714`.

## Programmatic API

```ts
import { createSsrServer, listen, loadRenderer } from "@inertia-node/ssr";

const render = await loadRenderer("dist/ssr-entry.js");
const result = await render(page);

const server = await createSsrServer({
  entry: "dist/ssr-entry.js",
  host: "127.0.0.1",
  port: 13714,
});

await listen({
  entry: "dist/ssr-entry.js",
  host: "127.0.0.1",
  port: 13714,
});
```

## HTTP Contract

The server accepts only:

```txt
POST /render
```

The request body must be an Inertia page object:

```json
{
  "component": "Dashboard/Index",
  "props": {
    "user": {
      "name": "Ada"
    }
  },
  "url": "/dashboard",
  "version": "1"
}
```

The response must be compatible with `SsrResult`:

```json
{
  "head": "<title>Dashboard</title>",
  "body": "<div>...</div>"
}
```

## Renderer Exports

Renderer modules can export either:

```ts
export default async function render(page) {
  return {
    head: "",
    body: "",
  };
}
```

or:

```ts
export async function render(page) {
  return {
    head: "",
    body: "",
  };
}
```

## Debugging SSR

Test the SSR server directly:

```sh
curl -X POST http://127.0.0.1:13714/render \
  -H "Content-Type: application/json" \
  -d '{"component":"Dashboard/Index","props":{},"url":"/dashboard","version":"1"}'
```

If SSR is working, the response should contain rendered `head` and `body` strings.

While debugging an adapter integration, set:

```ts
ssr: {
  enabled: true,
  throwOnError: true,
}
```

This makes SSR failures visible instead of silently falling back to the client-side shell.

## Exports

- `loadRenderer(entry)`
- `createSsrServer(options)`
- `listen(options)`
- `SsrRenderFunction`
- `SsrServerOptions`

## Documentation

- Repository: https://github.com/inertia-node/inertia-node-adapter
- SSR docs: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/ssr.md
- Deployment docs: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/deployment.md
