# @inertia-node/nest-fastify

NestJS adapter for Inertia.js on the Fastify platform.

`@inertia-node/nest-fastify` provides the same Inertia integration model as `@inertia-node/nest`, adapted for Nest applications running on `@nestjs/platform-fastify`.

## Features

- Provides `InertiaModule.forRoot(...)` for Fastify-backed Nest apps.
- Provides `InertiaInterceptor` for controller response conversion.
- Provides `@Inertia(...)` and `@InertiaRenderOptions(...)` decorators.
- Provides `InertiaAuthGuard` and `InertiaGuestGuard`.
- Supports Fastify session stores through `fastifySessionAdapter()`.
- Supports shared props, lazy props, deferred props, validation errors, flash data, redirects, and SSR.
- Re-exports shared helpers from `@inertia-node/core`.

## Installation

```sh
pnpm add @inertia-node/nest-fastify @nestjs/common @nestjs/core @nestjs/platform-fastify fastify @fastify/session @fastify/cookie
```

```sh
npm install @inertia-node/nest-fastify @nestjs/common @nestjs/core @nestjs/platform-fastify fastify @fastify/session @fastify/cookie
```

Peer dependencies:

- `@nestjs/common >=10 <12`
- `@nestjs/core >=10 <12`
- `@nestjs/platform-fastify >=10 <12`
- `fastify >=4 <6`
- `reflect-metadata >=0.1 <1`
- `rxjs >=7 <8`

## Quick Start

```ts
import {
  Controller,
  Get,
  Module,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import {
  Inertia,
  InertiaAuthGuard,
  InertiaGuestGuard,
  InertiaInterceptor,
  InertiaModule,
  fastifySessionAdapter,
  inertiaAuth,
} from "@inertia-node/nest-fastify";

type User = {
  id: number;
  name: string;
  email: string;
};

async function findUser(id?: number): Promise<User | null> {
  if (!id) return null;
  return { id, name: "Ada Lovelace", email: "ada@example.com" };
}

@Controller()
@UseInterceptors(InertiaInterceptor)
class PageController {
  @Get("/dashboard")
  @UseGuards(InertiaAuthGuard)
  @Inertia("Dashboard/Index")
  dashboard() {
    return {
      stats: {
        users: 42,
        orders: 128,
      },
    };
  }

  @Get("/login")
  @UseGuards(InertiaGuestGuard)
  @Inertia("Auth/Login")
  login() {
    return {
      title: "Sign in",
    };
  }
}

@Module({
  imports: [
    InertiaModule.forRoot({
      version: "1",
      session: fastifySessionAdapter(),
      auth: inertiaAuth({
        getUser: (req) => findUser(req.session?.get("userId")),
        login: (req, user: User) => {
          req.session.set("userId", user.id);
        },
        logout: (req) => {
          req.session.set("userId", null);
        },
        serializeUser: (user) => ({
          id: user.id,
          name: user.name,
        }),
        redirectTo: "/login",
        home: "/dashboard",
      }),
      share: async ({ request }) => ({
        locale: request.headers["accept-language"] ?? "en",
      }),
      rootView: ({ page }) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script type="module" src="/src/app.tsx"></script>
  </head>
  <body>
    <div id="app" data-page='${page}'></div>
  </body>
</html>`,
    }),
  ],
  controllers: [PageController],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());

  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    secret: process.env.SESSION_SECRET ?? "replace-this-with-32-characters",
    cookie: {
      secure: false,
    },
  });

  await app.listen(3000);
}

void bootstrap();
```

## Controller Patterns

Use `@Inertia(...)` when a route maps directly to one page component:

```ts
@Get("/settings")
@Inertia("Settings/Edit")
edit() {
  return {
    preferences: loadPreferences(),
  };
}
```

Use explicit helper results when the route needs to redirect or return validation errors:

```ts
@Post("/settings")
async update() {
  return Inertia.backWithErrors({
    email: ["Email is required."],
  });
}
```

Supported explicit results:

- `Inertia.render(component, props?, options?)`
- `Inertia.redirect(location, status?)`
- `Inertia.location(location)`
- `Inertia.backWithErrors(errors, options?)`

## Fastify Session Adapter

`fastifySessionAdapter()` maps Fastify sessions to the shared `SessionStore` contract:

- `get(key)`
- `set(key, value)`
- `pull(key)`
- `flash(key, value)`
- `reflash()`

Register `@fastify/cookie` and `@fastify/session` before serving routes that depend on auth, flash, or validation errors.

## SSR

```ts
InertiaModule.forRoot({
  ssr: {
    enabled: true,
    url: "http://127.0.0.1:13714/render",
    timeoutMs: 1500,
  },
});
```

Use `@inertia-node/ssr` to run the renderer process.

## Exports

- `InertiaModule`
- `InertiaInterceptor`
- `InertiaAuthGuard`
- `InertiaGuestGuard`
- `Inertia`
- `InertiaRenderOptions`
- `fastifySessionAdapter`
- `InertiaService`
- `NestFastifyInertiaOptions`
- `NestFastifyInertiaAsyncOptions`
- `NestFastifyRenderOptions`
- `InertiaControllerResult`
- Re-exported core helpers such as `always`, `defer`, `merge`, `optional`, `validationError`, `inertiaAuth`, and `createInertia`

## Troubleshooting

- If controller return values are sent as plain JSON, confirm `@UseInterceptors(InertiaInterceptor)` is applied.
- If auth always fails, confirm Fastify session plugins are registered and `session: fastifySessionAdapter()` is configured.
- If validation redirects throw, confirm a session adapter is configured.
- If SSR is silently missing, set `ssr.throwOnError: true` while debugging.

## Documentation

- Repository: https://github.com/inertia-node/inertia-node-adapter
- Quick start: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/quickstart.md
- Auth: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/auth.md
- Sessions, flash, and validation: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/session-flash-validation.md
- SSR: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/ssr.md
