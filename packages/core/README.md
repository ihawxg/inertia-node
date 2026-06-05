# @inertia-node/core

Framework-agnostic Inertia.js protocol helpers for Node.js.

`@inertia-node/core` is the shared runtime used by the Inertia Node adapter packages. It does not depend on Express, NestJS, Fastify, React, Vue, or Svelte. Instead, it provides the protocol primitives that framework adapters use to turn server responses into valid Inertia pages.

Use this package directly when you are building a custom adapter, testing protocol behavior, or integrating Inertia into a framework that is not covered by the higher-level packages.

## Features

- Detects Inertia requests and handles protocol headers.
- Serializes page objects into safe HTML root views.
- Builds protocol responses for page renders, redirects, external locations, and asset-version reloads.
- Resolves shared props, lazy props, deferred props, merge metadata, and partial reloads.
- Provides typed auth, session, flash, validation error, and SSR contracts.
- Works with official Inertia client packages such as `@inertiajs/react`, `@inertiajs/vue3`, and `@inertiajs/svelte`.

## Installation

```sh
pnpm add @inertia-node/core
```

```sh
npm install @inertia-node/core
```

## Quick Start

```ts
import {
  always,
  createInertia,
  defer,
  merge,
  type InertiaRequest,
} from "@inertia-node/core";

const request: InertiaRequest = {
  headers: {
    "x-inertia": "true",
    "x-inertia-version": "1",
  },
  method: "GET",
  url: "/dashboard",
  originalUrl: "/dashboard",
  protocol: "https",
  host: "example.com",
};

const inertia = createInertia({
  version: "1",
  share: async ({ request }) => ({
    auth: {
      user: request.raw?.user ?? null,
    },
  }),
  ssr: {
    enabled: true,
    url: "http://127.0.0.1:13714/render",
    timeoutMs: 1500,
  },
});

const response = await inertia.render(request, "Dashboard/Index", {
  profile: merge(() => loadProfile()),
  metrics: always(() => loadMetrics()),
  report: defer(() => loadReport()),
});

sendStatus(response.status);
sendHeaders(response.headers);
sendBody(response.body);
```

Framework adapters are responsible for mapping their request/response objects to this protocol shape. For most applications, use one of the adapter packages instead:

- `@inertia-node/express`
- `@inertia-node/nest`
- `@inertia-node/nest-fastify`

## Core Concepts

### `createInertia(options)`

Creates a small protocol runtime.

The returned instance exposes:

- `render(request, component, props, options)`
- `redirect(request, location, status?)`
- `location(location)`

`render` returns a `ProtocolResponse` instead of writing to a framework response directly. This keeps the core runtime portable across frameworks.

### Request Mapping

Adapters map incoming framework requests to `InertiaRequest`:

```ts
const inertiaRequest = {
  headers: request.headers,
  method: request.method,
  url: request.url,
  originalUrl: request.originalUrl,
  protocol: request.protocol,
  host: request.get("host"),
  raw: request,
};
```

The `raw` value is intentionally untyped. Adapters can use it to expose framework-specific objects to shared props, auth handlers, and custom SSR logic.

### Shared Props

Shared props are merged into every rendered page:

```ts
createInertia({
  share: async ({ request }) => ({
    flash: request.raw?.flash ?? {},
    auth: {
      user: request.raw?.user ?? null,
    },
  }),
});
```

Page props override shared props when the same key exists.

### Lazy and Deferred Props

The package includes helpers that model Inertia prop behavior:

```ts
import { always, defer, merge, optional } from "@inertia-node/core";

const props = {
  user: always(() => loadCurrentUser()),
  notifications: optional(() => loadNotifications()),
  auditLog: defer(() => loadAuditLog()),
  feed: merge(() => loadFeedPage()),
};
```

Use these helpers when you need partial reloads, deferred data, or merge metadata to be represented in the serialized page object.

## SSR

The core runtime can call an SSR endpoint before rendering the root HTML document:

```ts
createInertia({
  ssr: {
    enabled: true,
    url: "http://127.0.0.1:13714/render",
    timeoutMs: 1500,
    throwOnError: false,
  },
});
```

When SSR succeeds, the result is passed to the configured root view. When SSR fails and `throwOnError` is false, rendering falls back to the normal client-side shell.

## Exports

Runtime helpers:

- `createInertia`
- `getHeader`
- `isInertiaRequest`
- `parseCommaHeader`
- `requestHeader`
- `varyHeader`
- `defaultRootView`
- `escapeAttribute`
- `serializePage`
- `inertiaAuth`
- `always`
- `defer`
- `merge`
- `optional`
- `resolvePageProps`
- `resolveProps`
- `selectPartialProps`
- `validationError`

Common types:

- `CreateInertiaOptions`
- `InertiaInstance`
- `InertiaRequest`
- `InertiaPage`
- `InputProps`
- `RenderOptions`
- `ProtocolResponse`
- `SessionStore`
- `AuthConfig`
- `AuthRuntime`
- `SsrOptions`
- `SsrResult`
- `ValidationErrorInput`
- `ValidationErrorPayload`

## Compatibility

- Node.js `>=20`
- ESM projects
- TypeScript projects
- Inertia.js v3-compatible clients

## Documentation

- Repository: https://github.com/ihawxg/inertia-node
- Quick start: https://github.com/ihawxg/inertia-node/blob/main/docs/quickstart.md
- Auth: https://github.com/ihawxg/inertia-node/blob/main/docs/auth.md
- Sessions, flash, and validation: https://github.com/ihawxg/inertia-node/blob/main/docs/session-flash-validation.md
- SSR: https://github.com/ihawxg/inertia-node/blob/main/docs/ssr.md
