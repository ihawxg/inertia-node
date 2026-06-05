# @inertia-node/nest-fastify

NestJS adapter for Inertia.js on the Fastify platform.

The Fastify package mirrors the Express-based Nest adapter with the same
protocol surface, adapted to `fastify`-style request/response primitives and session APIs.

## Install

```sh
pnpm add @inertia-node/nest-fastify @inertia-node/core
```

Peer dependencies:

- `@nestjs/common >=10 <12`
- `@nestjs/core >=10 <12`
- `@nestjs/platform-fastify >=10 <12`
- `fastify >=4 <6`

## Quick start

```ts
import {
  Controller,
  Get,
  Module,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { NestFactory } from "@nestjs/core";
import {
  Inertia,
  InertiaAuthGuard,
  InertiaInterceptor,
  InertiaModule,
  fastifySessionAdapter,
  inertiaAuth,
} from "@inertia-node/nest-fastify";

@Module({
  imports: [
    InertiaModule.forRoot({
      version: "1",
      rootView: ({ page }) => `
<!doctype html>
<html>
  <body><div id="app" data-page='${page}'></div></body>
</html>`,
  auth: inertiaAuth({
        async getUser(req) {
          const userId = req.session?.get("userId");
          return userId ? { id: userId, name: "Ada", email: "ada@example.com" } : null;
        },
        login: (req, user) => req.session.set("userId", user.id),
        logout: (req) => req.session.set("userId", null),
        serializeUser: (user) => ({ id: user.id, name: user.name }),
      }),
      session: fastifySessionAdapter(),
    }),
  ],
})
export class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  // Register @fastify/session before handling routes.
  await app.listen(3000);
}

@Controller()
@UseInterceptors(InertiaInterceptor)
export class DashboardController {
  @Get("/dashboard")
  @UseGuards(InertiaAuthGuard)
  @Inertia("Dashboard/Index")
  dashboard() {
    return {
      users: [{ id: 1, name: "Ada" }],
      canAddUser: true,
    };
  }
}
```

## Session adapter

`fastifySessionAdapter()` maps Fastify session stores to the adapter `SessionStore` contract:

- `get`, `set`, `pull`, `flash`, `reflash`

## Exports

- `InertiaModule`
- `InertiaInterceptor`
- `Inertia`, `InertiaRenderOptions`
- `fastifySessionAdapter`
- Guards:
  - `InertiaAuthGuard`
  - `InertiaGuestGuard`
- `InertiaService`
- Re-exported helpers from `@inertia-node/core`:
  - `createInertia`, `always`, `defer`, `merge`, `optional`, `validationError`, `inertiaAuth`

## Runtime behavior

- Uses the same `NestInertia*` option types as the Express adapter.
- Supports all core features:
  - shared props
  - lazy props
  - partial reload control
  - validation and flash workflows
  - redirects and `Location:` style responses

## Troubleshooting

- Ensure Fastify session plugin is registered before `NestFactory` starts rendering Inertia responses.
- In SSR mode, confirm `@inertia-node/ssr` endpoint is reachable from your API server.

## Related docs

- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/quickstart.md
- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/auth.md
