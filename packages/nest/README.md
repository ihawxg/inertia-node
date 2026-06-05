# @inertia-node/nest

NestJS adapter for Inertia.js on the Express platform.

`@inertia-node/nest` integrates Inertia into Nest controllers through a module, interceptor, decorators, guards, and a session adapter. It keeps the same protocol behavior as the Express package while using Nest conventions for routing and dependency injection.

## Features

- Provides `InertiaModule.forRoot(...)` for application-level setup.
- Provides `InertiaInterceptor` for controller response conversion.
- Provides `@Inertia(...)` and `@InertiaRenderOptions(...)` decorators.
- Provides `InertiaAuthGuard` and `InertiaGuestGuard`.
- Supports Express sessions through `nestExpressSessionAdapter()`.
- Supports shared props, lazy props, deferred props, validation errors, flash data, redirects, and SSR.
- Re-exports shared helpers from `@inertia-node/core`.

## Installation

```sh
pnpm add @inertia-node/nest @nestjs/common @nestjs/core @nestjs/platform-express express express-session
```

```sh
npm install @inertia-node/nest @nestjs/common @nestjs/core @nestjs/platform-express express express-session
```

Peer dependencies:

- `@nestjs/common >=10 <12`
- `@nestjs/core >=10 <12`
- `express >=4.18 <6`
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
import session from "express-session";
import {
  Inertia,
  InertiaAuthGuard,
  InertiaGuestGuard,
  InertiaInterceptor,
  InertiaModule,
  inertiaAuth,
  nestExpressSessionAdapter,
} from "@inertia-node/nest";

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
      session: nestExpressSessionAdapter(),
      auth: inertiaAuth({
        getUser: (req) => findUser(req.session?.userId),
        login: (req, user: User) => {
          req.session!.userId = user.id;
        },
        logout: (req) => {
          delete req.session!.userId;
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
  const app = await NestFactory.create(AppModule);

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? "replace-me",
      resave: false,
      saveUninitialized: false,
    }),
  );

  await app.listen(3000);
}

void bootstrap();
```

## Controller Patterns

Use the decorator form when a route always renders one component:

```ts
@Get("/users")
@Inertia("Users/Index")
index() {
  return {
    users: await loadUsers(),
  };
}
```

Use explicit helper results when a route decides what to do at runtime:

```ts
@Post("/users")
async store() {
  const valid = false;

  if (!valid) {
    return Inertia.backWithErrors({
      email: ["Email is required."],
    });
  }

  return Inertia.redirect("/users");
}
```

Supported explicit results:

- `Inertia.render(component, props?, options?)`
- `Inertia.redirect(location, status?)`
- `Inertia.location(location)`
- `Inertia.backWithErrors(errors, options?)`

## Module API

`InertiaModule.forRoot(options)` accepts `NestInertiaOptions`.

Common options:

- `version`
- `rootView`
- `share`
- `session`
- `auth`
- `ssr`
- `withAllErrors`

The module can also receive a prebuilt `@inertia-node/core` instance through `instance`.

## Auth and Session

`nestExpressSessionAdapter()` maps an Express session object to the shared session contract. Register `express-session` before serving routes that depend on auth, flash, or validation errors.

`InertiaAuthGuard` redirects unauthenticated users to `auth.redirectTo`, defaulting to `"/login"`.

`InertiaGuestGuard` redirects authenticated users to `auth.home`, defaulting to `"/dashboard"`.

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
- `nestExpressSessionAdapter`
- `InertiaService`
- `NestInertiaOptions`
- `NestInertiaAsyncOptions`
- `NestRenderOptions`
- `InertiaControllerResult`
- Re-exported core helpers such as `always`, `defer`, `merge`, `optional`, `validationError`, `inertiaAuth`, and `createInertia`

## Troubleshooting

- If the controller response is returned as normal JSON, confirm `@UseInterceptors(InertiaInterceptor)` is applied.
- If auth always fails, confirm `express-session` is registered and `session: nestExpressSessionAdapter()` is configured.
- If validation redirects throw, confirm a session adapter is configured.
- If full-page requests are missing app HTML, confirm `rootView` returns a document with `data-page='${page}'`.

## Documentation

- Repository: https://github.com/inertia-node/inertia-node-adapter
- Quick start: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/quickstart.md
- Auth: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/auth.md
- Sessions, flash, and validation: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/session-flash-validation.md
- SSR: https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/ssr.md
