# Contributing

Thanks for helping improve Inertia support for Node.js.

## Setup

```sh
pnpm install
pnpm test
pnpm build
```

## Pull Requests

- Keep protocol behavior in `@inertia-node/core`.
- Keep framework adapters thin.
- Add tests for header behavior and framework integration.
- Update the example app when public API behavior changes.

## Roadmap

The first stable release targets Express. Fastify and NestJS adapters should reuse the core protocol response contract instead of duplicating protocol logic.
