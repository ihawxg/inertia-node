import "reflect-metadata";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import {
  Controller,
  Get,
  Module,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import {
  defer,
  fastifySessionAdapter,
  Inertia,
  inertiaAuth,
  InertiaAuthGuard,
  InertiaGuestGuard,
  InertiaInterceptor,
  InertiaModule,
} from "../src/index.js";
import { toInertiaRequest } from "../src/runtime.js";
import type { INestApplication } from "@nestjs/common";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type { FastifyRequest, LightMyRequestResponse } from "fastify";

interface User {
  id: number;
  name: string;
}

@Controller()
@UseInterceptors(InertiaInterceptor)
class TestController {
  @Get("/users")
  @Inertia("Users/Index")
  users() {
    return { users: [{ id: 1 }], companies: [{ id: 2 }] };
  }

  @Get("/marker")
  marker() {
    return Inertia.render("Marker", { ok: true });
  }

  @Get("/deferred")
  @Inertia("Deferred")
  deferred() {
    return {
      stats: defer(() => ({ users: 10 }), { group: "stats" }),
      eager: "loaded",
    };
  }

  @Get("/set-flash")
  async setFlash(@Req() req: FastifyRequest) {
    await req.flash("success", "Saved");
    return Inertia.redirect("/users");
  }

  @Post("/errors")
  errors() {
    return Inertia.backWithErrors({ email: ["Required", "Invalid"] });
  }

  @Post("/bag-errors")
  bagErrors() {
    return Inertia.backWithErrors({ name: "Required" }, { bag: "profile" });
  }
}

@Controller()
@UseInterceptors(InertiaInterceptor)
class AuthController {
  @Get("/login")
  @UseGuards(InertiaGuestGuard)
  @Inertia("Auth/Login")
  loginForm() {
    return {};
  }

  @Post("/login")
  async login(@Req() req: FastifyRequest) {
    await req.auth?.login({ id: 1, name: "Ada" });
    return Inertia.redirect("/dashboard");
  }

  @Get("/dashboard")
  @UseGuards(InertiaAuthGuard)
  @Inertia("Dashboard")
  dashboard() {
    return {};
  }
}

@Module({
  imports: [
    InertiaModule.forRoot({
      version: "2",
      session: fastifySessionAdapter(),
      auth: inertiaAuth<
        FastifyRequest & {
          session?: {
            get<T>(key: string): T | undefined;
            set<T>(key: string, value: T): void;
          };
        },
        User,
        User
      >({
        getUser: (req) =>
          req.session?.get<number>("userId") === 1
            ? { id: 1, name: "Ada" }
            : null,
        login: (req, user) => {
          req.session?.set("userId", user.id);
        },
        logout: (req) => {
          req.session?.set("userId", undefined);
        },
      }),
    }),
  ],
  controllers: [TestController, AuthController],
})
class TestAppModule {}

describe("@inertia-node/nest-fastify", () => {
  it("creates marker responses", () => {
    expect(Inertia.render("Home", { ok: true })).toEqual({
      __inertiaNestFastify: "render",
      component: "Home",
      props: { ok: true },
      options: {},
    });
    expect(Inertia.redirect("/home")).toEqual({
      __inertiaNestFastify: "redirect",
      location: "/home",
      status: undefined,
    });
    expect(Inertia.location("https://example.com")).toEqual({
      __inertiaNestFastify: "location",
      location: "https://example.com",
    });
    expect(Inertia.backWithErrors({ email: "Required" })).toEqual({
      __inertiaNestFastify: "backWithErrors",
      errors: { email: "Required" },
      options: {},
    });
  });

  it("maps Fastify sessions to core session stores", () => {
    const values = new Map<string, unknown>();
    const session = {
      get: <T = unknown>(key: string) => values.get(key) as T | undefined,
      set: <T = unknown>(key: string, value: T) => {
        values.set(key, value);
      },
      delete: (key: string) => {
        values.delete(key);
      },
    };
    const request = { session } as unknown as FastifyRequest;
    const store = fastifySessionAdapter()(request);

    store?.set("name", "Ada");
    expect(store?.get("name")).toBe("Ada");
    expect(store?.pull("name")).toBe("Ada");
    expect(store?.get("name")).toBeUndefined();
    store?.flash("flash", { success: "Saved" });
    expect(store?.get("flash")).toEqual({ success: "Saved" });
  });

  it("converts Fastify requests into core requests", () => {
    const request = {
      headers: { host: "example.test", "x-inertia": "true" },
      method: "GET",
      url: "/users?active=1",
    } as unknown as FastifyRequest;

    expect(toInertiaRequest(request)).toMatchObject({
      headers: { host: "example.test", "x-inertia": "true" },
      method: "GET",
      url: "/users?active=1",
      originalUrl: "/users?active=1",
      host: "example.test",
      raw: request,
    });
  });

  it("renders initial HTML responses", async () => {
    const app = await createTestingApp();
    const response = await inject(app, { method: "GET", url: "/users" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers.vary).toBe("X-Inertia");
    expect(response.body).toContain('"component":"Users/Index"');

    await app.close();
  });

  it("renders JSON for Inertia requests", async () => {
    const app = await createTestingApp();
    const response = await inject(app, {
      method: "GET",
      url: "/users",
      headers: { "x-inertia": "true" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.headers["x-inertia"]).toBe("true");
    expect(JSON.parse(response.body)).toMatchObject({
      component: "Users/Index",
      props: {
        users: [{ id: 1 }],
        companies: [{ id: 2 }],
      },
    });

    await app.close();
  });

  it("returns 409 for stale asset versions", async () => {
    const app = await createTestingApp();
    const response = await inject(app, {
      method: "GET",
      url: "/users",
      headers: {
        host: "example.test",
        "x-inertia": "true",
        "x-inertia-version": "1",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.headers["x-inertia-location"]).toBe(
      "http://example.test/users",
    );

    await app.close();
  });

  it("filters partial reload props and resolves deferred props when requested", async () => {
    const app = await createTestingApp();
    const initial = await inject(app, {
      method: "GET",
      url: "/deferred",
      headers: { "x-inertia": "true" },
    });
    const partial = await inject(app, {
      method: "GET",
      url: "/deferred",
      headers: {
        "x-inertia": "true",
        "x-inertia-partial-component": "Deferred",
        "x-inertia-partial-data": "stats",
      },
    });

    expect(initial.statusCode).toBe(200);
    expect(partial.statusCode).toBe(200);
    expect(JSON.parse(initial.body).props).toMatchObject({ eager: "loaded" });
    expect(JSON.parse(initial.body).props.stats).toBeUndefined();
    expect(JSON.parse(initial.body).deferredProps).toEqual({
      stats: ["stats"],
    });
    expect(JSON.parse(partial.body).props).toEqual({ stats: { users: 10 } });

    await app.close();
  });

  it("shares flash once from session", async () => {
    const app = await createTestingApp();
    const setFlash = await inject(app, { method: "GET", url: "/set-flash" });
    const cookie = cookieHeader(setFlash);
    const first = await inject(app, {
      method: "GET",
      url: "/users",
      headers: { cookie, "x-inertia": "true" },
    });
    const second = await inject(app, {
      method: "GET",
      url: "/users",
      headers: { cookie: cookieHeader(first) ?? cookie, "x-inertia": "true" },
    });

    expect(setFlash.statusCode).toBe(302);
    expect(JSON.parse(first.body).props.flash).toEqual({ success: "Saved" });
    expect(JSON.parse(second.body).props.flash).toEqual({});

    await app.close();
  });

  it("redirects back with validation errors", async () => {
    const app = await createTestingApp();
    const failed = await inject(app, {
      method: "POST",
      url: "/errors",
      headers: { referer: "/users" },
    });
    const response = await inject(app, {
      method: "GET",
      url: "/users",
      headers: { cookie: cookieHeader(failed), "x-inertia": "true" },
    });

    expect(failed.statusCode).toBe(303);
    expect(JSON.parse(response.body).props.errors).toEqual({
      email: "Required",
    });

    await app.close();
  });

  it("scopes validation errors by error bag", async () => {
    const app = await createTestingApp();
    const failed = await inject(app, {
      method: "POST",
      url: "/bag-errors",
      headers: { referer: "/users" },
    });
    const response = await inject(app, {
      method: "GET",
      url: "/users",
      headers: {
        cookie: cookieHeader(failed),
        "x-inertia": "true",
        "x-inertia-error-bag": "profile",
      },
    });

    expect(failed.statusCode).toBe(303);
    expect(JSON.parse(response.body).props.errors).toEqual({
      profile: { name: "Required" },
    });

    await app.close();
  });

  it("guards authenticated and guest routes", async () => {
    const app = await createTestingApp();
    const guestDashboard = await inject(app, {
      method: "GET",
      url: "/dashboard",
    });
    const login = await inject(app, { method: "POST", url: "/login" });
    const cookie = cookieHeader(login);
    const dashboard = await inject(app, {
      method: "GET",
      url: "/dashboard",
      headers: { cookie, "x-inertia": "true" },
    });
    const loginForm = await inject(app, {
      method: "GET",
      url: "/login",
      headers: { cookie },
    });

    expect(guestDashboard.statusCode).toBe(303);
    expect(guestDashboard.headers.location).toBe("/login");
    expect(login.statusCode).toBe(303);
    expect(login.headers.location).toBe("/dashboard");
    expect(dashboard.statusCode).toBe(200);
    expect(JSON.parse(dashboard.body).props.auth.user).toEqual({
      id: 1,
      name: "Ada",
    });
    expect(loginForm.statusCode).toBe(303);
    expect(loginForm.headers.location).toBe("/dashboard");

    await app.close();
  });
});

async function createTestingApp(): Promise<NestFastifyApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );

  await app.register(fastifyCookie);
  await app.register(fastifySession, {
    secret: "test-secret-test-secret-test-secret",
    cookie: { secure: false },
    saveUninitialized: false,
  });

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

async function inject(
  app: INestApplication,
  options: Parameters<NestFastifyApplication["inject"]>[0],
): Promise<LightMyRequestResponse> {
  return app.getHttpAdapter().getInstance().inject(options);
}

function cookieHeader(response: LightMyRequestResponse): string {
  const setCookie = response.headers["set-cookie"];

  if (Array.isArray(setCookie)) {
    return setCookie.map((cookie) => cookie.split(";")[0]).join("; ");
  }

  return setCookie?.split(";")[0] ?? "";
}
