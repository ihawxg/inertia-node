import express from "express";
import session from "express-session";
import request from "supertest";
import { describe, expect, it } from "vitest";
import {
  expressSessionAdapter,
  guestOnly,
  inertiaAuth,
  inertiaMiddleware,
  requireAuth,
} from "../src/index.js";

describe("inertiaMiddleware", () => {
  it("adds res.inertia and renders HTML", async () => {
    const app = express();
    app.use(inertiaMiddleware({ version: "1" }));
    app.get("/users", (_request, response) => {
      void response.inertia("Users/Index", { users: [{ id: 1 }] });
    });

    const response = await request(app).get("/users").expect(200);

    expect(response.header["content-type"]).toContain("text/html");
    expect(response.header.vary).toBe("X-Inertia");
    expect(response.text).toContain('"component":"Users/Index"');
  });

  it("renders JSON for Inertia requests", async () => {
    const app = express();
    app.use(inertiaMiddleware({ version: "1" }));
    app.get("/users", (_request, response) => {
      void response.inertia("Users/Index", { users: [{ id: 1 }] });
    });

    const response = await request(app)
      .get("/users")
      .set("X-Inertia", "true")
      .expect(200);

    expect(response.header["content-type"]).toContain("application/json");
    expect(response.header["x-inertia"]).toBe("true");
    expect(response.body).toMatchObject({
      component: "Users/Index",
      props: { errors: {}, users: [{ id: 1 }] },
    });
  });

  it("returns 409 for stale asset versions", async () => {
    const app = express();
    app.use(inertiaMiddleware({ version: "2" }));
    app.get("/users", (_request, response) => {
      void response.inertia("Users/Index");
    });

    const response = await request(app)
      .get("/users")
      .set("Host", "example.test")
      .set("X-Inertia", "true")
      .set("X-Inertia-Version", "1")
      .expect(409);

    expect(response.header["x-inertia-location"]).toBe(
      "http://example.test/users",
    );
  });

  it("filters partial reload props", async () => {
    const app = express();
    app.use(inertiaMiddleware());
    app.get("/users", (_request, response) => {
      void response.inertia("Users/Index", {
        users: [{ id: 1 }],
        companies: [{ id: 2 }],
      });
    });

    const response = await request(app)
      .get("/users")
      .set("X-Inertia", "true")
      .set("X-Inertia-Partial-Component", "Users/Index")
      .set("X-Inertia-Partial-Data", "users")
      .expect(200);

    expect(response.body.props).toEqual({ users: [{ id: 1 }] });
  });

  it("adds redirect helpers", async () => {
    const app = express();
    app.use(inertiaMiddleware());
    app.post("/users", (_request, response) => {
      response.inertiaRedirect("/users");
    });

    const response = await request(app).post("/users").expect(303);

    expect(response.header.location).toBe("/users");
  });

  it("shares flash once from session", async () => {
    const app = sessionApp();
    app.get("/set-flash", async (request, response) => {
      await request.flash("success", "Saved");
      response.inertiaRedirect("/users");
    });
    app.get("/users", (_request, response) => {
      void response.inertia("Users/Index");
    });

    const agent = request.agent(app);
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
  });

  it("redirects back with validation errors", async () => {
    const app = sessionApp();
    app.post("/users", (_request, response) => {
      void response.backWithErrors({ email: ["Required", "Invalid"] });
    });
    app.get("/form", (_request, response) => {
      void response.inertia("Users/Form");
    });

    const agent = request.agent(app);
    await agent.post("/users").set("Referer", "/form").expect(303);
    const response = await agent
      .get("/form")
      .set("X-Inertia", "true")
      .expect(200);

    expect(response.body.props.errors).toEqual({ email: "Required" });
  });

  it("scopes validation errors by error bag", async () => {
    const app = sessionApp();
    app.post("/profile", (_request, response) => {
      void response.backWithErrors({ name: "Required" }, { bag: "profile" });
    });
    app.get("/settings", (_request, response) => {
      void response.inertia("Settings");
    });

    const agent = request.agent(app);
    await agent.post("/profile").set("Referer", "/settings").expect(303);
    const response = await agent
      .get("/settings")
      .set("X-Inertia", "true")
      .set("X-Inertia-Error-Bag", "profile")
      .expect(200);

    expect(response.body.props.errors).toEqual({
      profile: { name: "Required" },
    });
  });

  it("guards authenticated and guest routes", async () => {
    const app = sessionApp({
      auth: inertiaAuth<
        express.Request & { session?: Record<string, unknown> },
        { id: number; name: string },
        { id: number; name: string }
      >({
        getUser: (request) =>
          request.session?.userId === 1 ? { id: 1, name: "Ada" } : null,
        login: (request, user) => {
          if (request.session) {
            request.session.userId = user.id;
          }
        },
        logout: (request) => {
          if (request.session) {
            delete request.session.userId;
          }
        },
      }),
    });

    app.get("/login", guestOnly("/dashboard"), (_request, response) => {
      void response.inertia("Auth/Login");
    });
    app.post("/login", async (request, response) => {
      await request.auth?.login({ id: 1, name: "Ada" });
      response.inertiaRedirect("/dashboard");
    });
    app.get("/dashboard", requireAuth(), (_request, response) => {
      void response.inertia("Dashboard");
    });

    const agent = request.agent(app);
    await agent.get("/dashboard").expect(303).expect("Location", "/login");
    await agent.post("/login").expect(303).expect("Location", "/dashboard");

    const dashboard = await agent
      .get("/dashboard")
      .set("X-Inertia", "true")
      .expect(200);
    await agent.get("/login").expect(303).expect("Location", "/dashboard");

    expect(dashboard.body.props.auth.user).toEqual({ id: 1, name: "Ada" });
  });
});

function sessionApp(options: Parameters<typeof inertiaMiddleware>[0] = {}) {
  const app = express();
  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
    }),
  );
  app.use(
    inertiaMiddleware({
      session: expressSessionAdapter(),
      ...options,
    }),
  );

  return app;
}
