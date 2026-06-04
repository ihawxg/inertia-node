import "reflect-metadata";
import {
  Controller,
  Get,
  Module,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import session from "express-session";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  defer,
  Inertia,
  inertiaAuth,
  InertiaAuthGuard,
  InertiaGuestGuard,
  InertiaInterceptor,
  InertiaModule,
  nestExpressSessionAdapter,
} from "../src/index.js";
import type { Request } from "express";

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
  async setFlash(@Req() req: Request) {
    await req.flash("success", "Saved");
    return Inertia.redirect("/users");
  }

  @Post("/errors")
  errors() {
    return Inertia.backWithErrors({ email: ["Required", "Invalid"] });
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
  async login(@Req() req: Request) {
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
      session: nestExpressSessionAdapter(),
      auth: inertiaAuth<
        Request & { session?: Record<string, unknown> },
        User,
        User
      >({
        getUser: (req) =>
          req.session?.userId === 1 ? { id: 1, name: "Ada" } : null,
        login: (req, user) => {
          if (req.session) {
            req.session.userId = user.id;
          }
        },
        logout: (req) => {
          if (req.session) {
            delete req.session.userId;
          }
        },
      }),
    }),
  ],
  controllers: [TestController, AuthController],
})
class TestAppModule {}

describe("@inertia-node/nest", () => {
  it("creates marker responses and decorator metadata", () => {
    expect(Inertia.render("Home", { ok: true })).toEqual({
      __inertiaNest: "render",
      component: "Home",
      props: { ok: true },
      options: {},
    });
    expect(Inertia.redirect("/home")).toEqual({
      __inertiaNest: "redirect",
      location: "/home",
      status: undefined,
    });
    expect(Inertia.location("https://example.com")).toEqual({
      __inertiaNest: "location",
      location: "https://example.com",
    });
    expect(Inertia.backWithErrors({ email: "Required" })).toEqual({
      __inertiaNest: "backWithErrors",
      errors: { email: "Required" },
      options: {},
    });
  });

  it("renders initial HTML responses", async () => {
    const app = await createTestingApp();

    const response = await request(app.getHttpServer())
      .get("/users")
      .expect(200);

    expect(response.header["content-type"]).toContain("text/html");
    expect(response.header.vary).toBe("X-Inertia");
    expect(response.text).toContain('"component":"Users/Index"');

    await app.close();
  });

  it("renders JSON for Inertia requests", async () => {
    const app = await createTestingApp();

    const response = await request(app.getHttpServer())
      .get("/users")
      .set("X-Inertia", "true")
      .expect(200);

    expect(response.header["content-type"]).toContain("application/json");
    expect(response.header["x-inertia"]).toBe("true");
    expect(response.body).toMatchObject({
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

    const response = await request(app.getHttpServer())
      .get("/users")
      .set("Host", "example.test")
      .set("X-Inertia", "true")
      .set("X-Inertia-Version", "1")
      .expect(409);

    expect(response.header["x-inertia-location"]).toBe(
      "http://example.test/users",
    );

    await app.close();
  });

  it("filters partial reload props and resolves deferred props when requested", async () => {
    const app = await createTestingApp();

    const initial = await request(app.getHttpServer())
      .get("/deferred")
      .set("X-Inertia", "true")
      .expect(200);
    const partial = await request(app.getHttpServer())
      .get("/deferred")
      .set("X-Inertia", "true")
      .set("X-Inertia-Partial-Component", "Deferred")
      .set("X-Inertia-Partial-Data", "stats")
      .expect(200);

    expect(initial.body.props).toMatchObject({ eager: "loaded" });
    expect(initial.body.props.stats).toBeUndefined();
    expect(initial.body.deferredProps).toEqual({ stats: ["stats"] });
    expect(partial.body.props).toEqual({ stats: { users: 10 } });

    await app.close();
  });

  it("shares flash once from session", async () => {
    const app = await createTestingApp();
    const agent = request.agent(app.getHttpServer());

    await agent.get("/set-flash").expect(302);
    const first = await agent
      .get("/users")
      .set("X-Inertia", "true")
      .expect(200);
    const second = await agent
      .get("/users")
      .set("X-Inertia", "true")
      .expect(200);

    expect(first.body.props.flash).toEqual({ success: "Saved" });
    expect(second.body.props.flash).toEqual({});

    await app.close();
  });

  it("redirects back with validation errors", async () => {
    const app = await createTestingApp();
    const agent = request.agent(app.getHttpServer());

    await agent.post("/errors").set("Referer", "/users").expect(303);
    const response = await agent
      .get("/users")
      .set("X-Inertia", "true")
      .expect(200);

    expect(response.body.props.errors).toEqual({ email: "Required" });

    await app.close();
  });

  it("guards authenticated and guest routes", async () => {
    const app = await createTestingApp();
    const agent = request.agent(app.getHttpServer());

    await agent.get("/dashboard").expect(303).expect("Location", "/login");
    await agent.post("/login").expect(303).expect("Location", "/dashboard");

    const dashboard = await agent
      .get("/dashboard")
      .set("X-Inertia", "true")
      .expect(200);
    await agent.get("/login").expect(303).expect("Location", "/dashboard");

    expect(dashboard.body.props.auth.user).toEqual({ id: 1, name: "Ada" });

    await app.close();
  });
});

async function createTestingApp() {
  const moduleRef = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile();
  const app = moduleRef.createNestApplication();

  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
    }),
  );

  await app.init();
  return app;
}
