# @inertia-node/core

Framework-agnostic protocol primitives for building Inertia.js adapters in Node.js.

This package is the shared kernel used by all Inertia Node adapters.
It provides:

- Request detection for Inertia navigation
- Root view / page serialization helpers
- Lazy prop utilities
- Shared flash/auth/session typing helpers
- Protocol response builders for redirects, locations and SSR payloads
- Small helpers for session, flash and validation error payloads

If you are building an adapter (Express, Fastify, Nest), import from this package directly for protocol-level logic.

## Install

```sh
pnpm add @inertia-node/core
```

## Quick example

```ts
import type { InertiaPage, InertiaRequest } from "@inertia-node/core";
import { createInertia, defer, always, merge } from "@inertia-node/core";

const request: InertiaRequest = {
  headers: {
    "x-inertia": "true",
    "x-inertia-version": "1",
  },
  method: "GET",
  url: "/dashboard",
  originalUrl: "/dashboard",
  protocol: "http",
  host: "localhost:3000",
};

const app = createInertia({
  version: "1",
  async share({ request }) {
    return {
      auth: {
        user: request.raw?.user ?? null,
      },
    };
  },
  ssr: {
    enabled: true,
    url: "http://127.0.0.1:13714/render",
    timeoutMs: 1500,
  },
});

const protocolPage: InertiaPage = {
  component: "Dashboard/Index",
  props: {},
  url: request.url,
  version: "1",
  sharedProps: ["flash", "errors"],
};

const userId = 7;

const pageProps = {
  profile: merge(() => loadProfile(userId)),
  stats: always(resolveHeavyStats()), // always resolved before serializing
  lazy: defer(() => loadLazyData()),   // deferred and loaded client-side
};

const protocolResponse = await app.render(request, protocolPage.component, pageProps);

if (protocolResponse.status === 200) {
  console.log("rendered protocol payload:", protocolResponse.body);
}
```

## Exports

`@inertia-node/core` exports:

- `createInertia`
- `getHeader`, `isInertiaRequest`, `parseCommaHeader`, `requestHeader`, `varyHeader`
- `defaultRootView`, `escapeAttribute`, `serializePage`
- `inertiaAuth`
- Lazy helpers: `always`, `defer`, `isInertiaPropWrapper`, `merge`, `optional`, `resolvePageProps`, `resolveProps`, `selectPartialProps`
- Validation helper: `validationError`

### Types

- `CreateInertiaOptions`, `InertiaInstance`, `InertiaPage`, `InertiaRequest`, `ProtocolResponse`
- `InputProps`, `RenderOptions`, `RenderContext`, `SsrOptions`, `SsrResult`
- `AuthConfig`, `AuthRuntime`
- `SessionStore`, `ValidationError*`
- `DeferredOptions`, `RootViewContext`, `InertiaPropWrapper`, `FlashData`, `PageProps`

## Session and auth helpers

- `validationError` shapes field bags and supports single-message or multi-message payload behavior.
- `inertiaAuth` stores your framework-specific auth contract in a typed object that adapters can install onto request instances.

## SSR integration

Pass SSR settings in `CreateInertiaOptions` and `renderOptions` to delegate page rendering to a remote SSR server:

- `ssr.enabled` true/false
- `ssr.url` for your SSR endpoint
- `ssr.timeoutMs` for request timeout
- `ssr.fetch` to provide a custom fetch implementation (test/mocked environments)
- `ssr.throwOnError` to fail fast when SSR is unavailable

## Versioning and protocol expectations

This package tracks the Inertia.js protocol contract and works with official `@inertiajs/*` clients.
Keep your client and adapter versions aligned when upgrading protocol behavior.

## Compatibility

- Node.js `>= 20`
- TypeScript enabled projects strongly recommended
- Works with `@inertiajs/react` / `@inertiajs/vue3` / `@inertiajs/svelte` clients when those frameworks follow the same protocol contract

## Development

From repository root:

```sh
pnpm build -C packages/core
pnpm -C packages/core test
```

## Links

- Repository: https://github.com/inertia-node/inertia-node-adapter
- Related packages:
  - `@inertia-node/express`
  - `@inertia-node/nest`
  - `@inertia-node/nest-fastify`
  - `@inertia-node/ssr`
- Docs: [docs/session-flash-validation.md](../../docs/session-flash-validation.md), [docs/auth.md](../../docs/auth.md)
