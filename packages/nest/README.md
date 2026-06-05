# @inertia-node/nest

NestJS adapter for Inertia.js on the Express adapter stack.

This package integrates Inertia with NestJS controllers and interceptors while keeping protocol logic in decorators, guards, and shared options.

## Install

```sh
pnpm add @inertia-node/nest @inertia-node/core
```

Peer dependencies:

- `@nestjs/common >=10 <12`
- `@nestjs/core >=10 <12`
- `express >=4.18 <6`
- `@nestjs/platform-express >=10 <12`

## Quick start

```ts
import {
  Controller,
  Get,
  Module,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  Inertia,
  InertiaAuthGuard,
  InertiaGuestGuard,
  InertiaInterceptor,
  InertiaModule,
  inertiaAuth,
  nestExpressSessionAdapter,
} from "@inertia-node/nest";

type User = { id: number; name: string; email: string };

async function getUserById(id?: number): Promise<User | null> {
  if (!id) return null;
  return { id, name: "Ada Lovelace", email: "ada@example.com" };
}

@Module({
  imports: [
    InertiaModule.forRoot({
      version: "1",
      rootView: ({ page }) => `
<!doctype html>
<html>
  <body><div id="app" data-page='${page}'></div></body>
</html>`,
      session: nestExpressSessionAdapter(),
      auth: inertiaAuth({
        getUser: (req) => getUserById(req.session?.userId),
        login: (req, user: User) => {
          req.session!.userId = user.id;
        },
        logout: (req) => {
          delete req.session!.userId;
        },
        serializeUser: (user) => ({ id: user.id, name: user.name }),
        redirectTo: "/login",
        home: "/dashboard",
      }),
      share: async ({ request }) => ({
        locale: request.headers["accept-language"] ?? "en",
      }),
    }),
  ],
  controllers: [DashboardController],
})
export class AppModule {}

@Controller()
@UseInterceptors(InertiaInterceptor)
export class DashboardController {
  @Get("/dashboard")
  @UseGuards(InertiaAuthGuard)
  @Inertia("Dashboard/Index")
  dashboard() {
    return {
      users: 42,
      stats: ["orders", "visitors", "revenue"],
    };
  }

  @Get("/guest")
  @UseGuards(InertiaGuestGuard)
  @Inertia("Auth/Login")
  guestPage() {
    return {
      message: "Sign in to continue",
    };
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Attach your express-session middleware before serving any auth routes.
  await app.listen(3000);
}

void bootstrap();
```

## Module API

`InertiaModule.forRoot(options)` accepts:

- `NestInertiaOptions`
- `CreateInertiaOptions` from `@inertia-node/core`
- `session` adapter factory
- `auth` runtime contract from `inertiaAuth`
- `share`, `version`, `rootView`, `ssr` options

### Controller return contracts

Controller methods can return either:

- raw page props (short-form) and let `InertiaInterceptor` wrap to JSON/render mode
- explicit controller result objects:
  - `{ __inertiaNest: "redirect", location: string, status?: number }`
  - `{ __inertiaNest: "location", location: string }`
  - `{ __inertiaNest: "backWithErrors", errors: ValidationErrorInput, options?: ValidationErrorOptions }`

## Guards

- `InertiaAuthGuard` redirects unauthenticated users to `auth.redirectTo` (defaults to `"/login"`).
- `InertiaGuestGuard` redirects authenticated users to `auth.home` (defaults to `"/dashboard"`).

## Middleware behavior

- `InertiaInterceptor`:
  - Resolves return values to Inertia response bodies
  - Adds partial-prop metadata and status support through `@InertiaRenderOptions`
- `@Inertia()` decorator:
  - Declares the target component name
  - Can include per-handler render options via `@InertiaRenderOptions(...)`

## Exports

- `InertiaModule`
- `InertiaInterceptor`
- `InertiaAuthGuard`, `InertiaGuestGuard`
- `Inertia`, `InertiaRenderOptions`
- `nestExpressSessionAdapter`
- `InertiaService`
- Re-exported core helpers:
  - `createInertia`, `always`, `defer`, `merge`, `optional`, `validationError`, `inertiaAuth`
- Re-exported types:
  - `NestInertiaOptions`, `NestInertiaAsyncOptions`, `NestRenderOptions`
  - `InertiaBackWithErrorsResult`, `InertiaControllerResult`, `InertiaLocationResult`, `InertiaRedirectResult`, `InertiaRenderResult`

## Testing and validation

- For manual validation flow use `validationError` and return `backWithErrors` from controller code.
- Use `InertiaBackWithErrorsResult` when integrating server-side validator output directly.

## Versioning

Requires Node.js `>=20`.

## Related docs

- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/quickstart.md
- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/auth.md
- https://github.com/inertia-node/inertia-node-adapter/blob/main/docs/session-flash-validation.md
