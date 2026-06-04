import { describe, expect, it } from "vitest";
import {
  createInertia,
  defer,
  isInertiaRequest,
  merge,
  optional,
  parseCommaHeader,
  requestHeader,
  serializePage,
} from "../src/index.js";

describe("headers", () => {
  it("reads headers case-insensitively", () => {
    expect(
      requestHeader(
        { headers: { "x-inertia": "true" }, method: "GET", url: "/" },
        "X-Inertia",
      ),
    ).toBe("true");
    expect(
      isInertiaRequest({
        headers: { "X-Inertia": "true" },
        method: "GET",
        url: "/",
      }),
    ).toBe(true);
  });

  it("parses comma headers", () => {
    expect(parseCommaHeader("users, filters,")).toEqual(["users", "filters"]);
  });
});

describe("html", () => {
  it("escapes script-breaking page content", () => {
    const html = serializePage({
      component: "Unsafe",
      props: { value: "</script><script>alert(1)</script>" },
      url: "/unsafe",
      version: "1",
    });

    expect(html).toContain("\\u003c/script>");
    expect(html).not.toContain("</script><script>");
  });
});

describe("createInertia", () => {
  it("renders an HTML document for normal visits", async () => {
    const inertia = createInertia({ version: "1" });
    const response = await inertia.render(
      { headers: {}, method: "GET", url: "/users" },
      "Users/Index",
      { users: [{ id: 1 }] },
    );

    expect(response.status).toBe(200);
    expect(response.headers["Content-Type"]).toBe("text/html; charset=utf-8");
    expect(response.headers.Vary).toBe("X-Inertia");
    expect(response.body).toContain(
      '<script data-page="app" type="application/json">',
    );
    expect(response.body).toContain('"component":"Users/Index"');
  });

  it("renders JSON for Inertia visits", async () => {
    const inertia = createInertia({ version: "1" });
    const response = await inertia.render(
      { headers: { "X-Inertia": "true" }, method: "GET", url: "/users" },
      "Users/Index",
      { users: [{ id: 1 }] },
    );

    expect(response.status).toBe(200);
    expect(response.headers["Content-Type"]).toBe(
      "application/json; charset=utf-8",
    );
    expect(response.headers["X-Inertia"]).toBe("true");
    expect(JSON.parse(response.body)).toMatchObject({
      component: "Users/Index",
      props: { errors: {}, users: [{ id: 1 }] },
      url: "/users",
      version: "1",
    });
  });

  it("returns 409 for stale asset versions on GET Inertia requests", async () => {
    const inertia = createInertia({ version: "2" });
    const response = await inertia.render(
      {
        headers: {
          Host: "example.test",
          "X-Inertia": "true",
          "X-Inertia-Version": "1",
        },
        method: "GET",
        url: "/users",
        protocol: "https",
      },
      "Users/Index",
    );

    expect(response).toEqual({
      status: 409,
      headers: {
        "X-Inertia-Location": "https://example.test/users",
        Vary: "X-Inertia",
      },
      body: "",
    });
  });

  it("resolves shared and lazy props", async () => {
    const inertia = createInertia({
      share: () => ({
        auth: () => ({ id: 1 }),
      }),
    });
    const response = await inertia.render(
      { headers: { "X-Inertia": "true" }, method: "GET", url: "/" },
      "Home",
      { message: () => "hello" },
    );

    expect(JSON.parse(response.body).props).toEqual({
      errors: {},
      auth: { id: 1 },
      message: "hello",
    });
  });

  it("filters partial reload props", async () => {
    const inertia = createInertia();
    const response = await inertia.render(
      {
        headers: {
          "X-Inertia": "true",
          "X-Inertia-Partial-Component": "Users/Index",
          "X-Inertia-Partial-Data": "users",
        },
        method: "GET",
        url: "/users",
      },
      "Users/Index",
      { users: [{ id: 1 }], companies: [{ id: 2 }] },
    );

    expect(JSON.parse(response.body).props).toEqual({
      users: [{ id: 1 }],
    });
  });

  it("lets partial except take precedence over partial data", async () => {
    const inertia = createInertia();
    const response = await inertia.render(
      {
        headers: {
          "X-Inertia": "true",
          "X-Inertia-Partial-Component": "Users/Index",
          "X-Inertia-Partial-Data": "users",
          "X-Inertia-Partial-Except": "companies",
        },
        method: "GET",
        url: "/users",
      },
      "Users/Index",
      { users: [{ id: 1 }], companies: [{ id: 2 }] },
    );

    expect(JSON.parse(response.body).props).toEqual({
      errors: {},
      users: [{ id: 1 }],
    });
  });

  it("creates redirect responses", () => {
    const inertia = createInertia();

    expect(
      inertia.redirect({ headers: {}, method: "POST", url: "/" }, "/users"),
    ).toEqual({
      status: 303,
      headers: { Location: "/users", Vary: "X-Inertia" },
      body: "",
    });
    expect(inertia.location("https://example.test")).toEqual({
      status: 409,
      headers: {
        "X-Inertia-Location": "https://example.test",
        Vary: "X-Inertia",
      },
      body: "",
    });
  });

  it("omits deferred props initially and resolves them on partial reload", async () => {
    const inertia = createInertia();

    const initial = await inertia.render(
      { headers: { "X-Inertia": "true" }, method: "GET", url: "/users" },
      "Users/Index",
      {
        users: [{ id: 1 }],
        stats: defer(() => ({ total: 1 }), { group: "metrics" }),
      },
    );

    expect(JSON.parse(initial.body)).toMatchObject({
      props: { errors: {}, users: [{ id: 1 }] },
      deferredProps: { metrics: ["stats"] },
    });

    const partial = await inertia.render(
      {
        headers: {
          "X-Inertia": "true",
          "X-Inertia-Partial-Component": "Users/Index",
          "X-Inertia-Partial-Data": "stats",
        },
        method: "GET",
        url: "/users",
      },
      "Users/Index",
      {
        users: [{ id: 1 }],
        stats: defer(() => ({ total: 1 }), { group: "metrics" }),
      },
    );

    expect(JSON.parse(partial.body).props).toEqual({
      stats: { total: 1 },
    });
  });

  it("rescues deferred prop failures", async () => {
    const inertia = createInertia();
    const response = await inertia.render(
      {
        headers: {
          "X-Inertia": "true",
          "X-Inertia-Partial-Component": "Users/Index",
          "X-Inertia-Partial-Data": "stats",
        },
        method: "GET",
        url: "/users",
      },
      "Users/Index",
      {
        stats: defer(
          () => {
            throw new Error("boom");
          },
          { rescue: true },
        ),
      },
    );

    expect(JSON.parse(response.body)).toMatchObject({
      props: {},
      rescuedProps: ["stats"],
    });
  });

  it("generates merge and once metadata", async () => {
    const inertia = createInertia();
    const response = await inertia.render(
      { headers: { "X-Inertia": "true" }, method: "GET", url: "/feed" },
      "Feed/Index",
      {
        feed: merge(() => ({ data: [{ id: 1 }] }))
          .append("data")
          .matchOn("data.id")
          .once(),
        messages: merge(["hello"]).prepend(),
        tree: merge({ nodes: [] }).deepMerge(),
      },
    );

    expect(JSON.parse(response.body)).toMatchObject({
      mergeProps: ["feed.data"],
      prependProps: ["messages"],
      deepMergeProps: ["tree"],
      matchPropsOn: ["feed.data.id"],
      onceProps: { feed: { prop: "feed" } },
    });
  });

  it("resolves optional props only when requested", async () => {
    const inertia = createInertia();
    const initial = await inertia.render(
      { headers: { "X-Inertia": "true" }, method: "GET", url: "/reports" },
      "Reports/Index",
      { report: optional(() => "heavy") },
    );

    expect(JSON.parse(initial.body).props).toEqual({ errors: {} });

    const partial = await inertia.render(
      {
        headers: {
          "X-Inertia": "true",
          "X-Inertia-Partial-Component": "Reports/Index",
          "X-Inertia-Partial-Data": "report",
        },
        method: "GET",
        url: "/reports",
      },
      "Reports/Index",
      { report: optional(() => "heavy") },
    );

    expect(JSON.parse(partial.body).props).toEqual({ report: "heavy" });
  });

  it("injects SSR result into the root view", async () => {
    const inertia = createInertia({
      ssr: {
        fetch: async () =>
          new Response(
            JSON.stringify({
              head: ["<title>SSR</title>"],
              body: "<main>SSR body</main>",
            }),
            { status: 200 },
          ),
      },
    });
    const response = await inertia.render(
      { headers: {}, method: "GET", url: "/" },
      "Home",
    );

    expect(response.body).toContain("<title>SSR</title>");
    expect(response.body).toContain("<main>SSR body</main>");
  });

  it("falls back when SSR fails unless throwOnError is enabled", async () => {
    const inertia = createInertia({
      ssr: {
        fetch: async () => new Response("nope", { status: 500 }),
      },
    });

    await expect(
      inertia.render({ headers: {}, method: "GET", url: "/" }, "Home"),
    ).resolves.toMatchObject({ status: 200 });

    const throwing = createInertia({
      ssr: {
        throwOnError: true,
        fetch: async () => new Response("nope", { status: 500 }),
      },
    });

    await expect(
      throwing.render({ headers: {}, method: "GET", url: "/" }, "Home"),
    ).rejects.toThrow("SSR request failed");
  });
});
