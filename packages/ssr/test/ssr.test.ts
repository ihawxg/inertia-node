import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSsrServer, loadRenderer } from "../src/index.js";

const servers: Array<{ close(callback?: () => void): void }> = [];

afterEach(async () => {
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
  servers.length = 0;
});

describe("SSR server", () => {
  it("loads a render function from an entry", async () => {
    const entry = await createEntry();
    const render = await loadRenderer(entry);

    await expect(
      Promise.resolve(
        render({ component: "Home", props: {}, url: "/", version: "1" }),
      ),
    ).resolves.toEqual({
      head: ["<title>Home</title>"],
      body: "<main>Home</main>",
    });
  });

  it("serves rendered head and body", async () => {
    const entry = await createEntry();
    const server = await createSsrServer({ entry });
    servers.push(server);

    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected TCP server address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: "Dashboard",
        props: {},
        url: "/dashboard",
        version: "1",
      }),
    });

    await expect(response.json()).resolves.toEqual({
      head: ["<title>Dashboard</title>"],
      body: "<main>Dashboard</main>",
    });
  });
});

async function createEntry(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "inertia-node-ssr-"));
  const entry = join(directory, "entry.mjs");

  await writeFile(
    entry,
    `export function render(page) {
  return {
    head: [\`<title>\${page.component}</title>\`],
    body: \`<main>\${page.component}</main>\`,
  }
}`,
  );

  return entry;
}
