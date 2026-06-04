import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/args.js";
import { buildGeneratedFiles } from "../src/files.js";
import { generateApp } from "../src/generate.js";
import { validateCreateAppConfig } from "../src/manifest.js";
import { resolveCreateAppConfig } from "../src/presets.js";
import { applyAddonChoices } from "../src/prompts.js";
import { formatUnsupportedCombination } from "../src/terminal.js";

describe("@inertia-node/create", () => {
  it("defaults to the fullstack preset", () => {
    const config = resolveCreateAppConfig({
      name: "My App",
      directory: "my-app",
      install: false,
      git: false,
    });

    expect(config.meta.name).toBe("my-app");
    expect(config.preset.name).toBe("fullstack");
    expect(config.server.framework).toBe("express");
    expect(config.client.adapter).toBe("react");
    expect(config.database.orm).toBe("drizzle");
    expect(config.database.driver).toBe("sqlite");
    expect(config.auth.mode).toBe("password");
  });

  it("resolves minimal without auth or database files", () => {
    const config = resolveCreateAppConfig({
      name: "minimal-app",
      preset: "minimal",
      install: false,
      git: false,
    });
    const files = buildGeneratedFiles(config).map((file) => file.path);

    expect(config.auth.mode).toBe("none");
    expect(config.database.orm).toBe("none");
    expect(files).toContain("src/Pages/Home.tsx");
    expect(files).not.toContain("src/Pages/Auth/Login.tsx");
    expect(files).not.toContain("src/db.ts");
  });

  it("adds saas feature files and deployment config", () => {
    const config = resolveCreateAppConfig({
      name: "saas-app",
      preset: "saas",
      install: false,
      git: false,
    });
    const files = buildGeneratedFiles(config).map((file) => file.path);

    expect(config.features.teams).toBe(true);
    expect(config.features.auditLog).toBe(true);
    expect(config.auth.roles).toBe(true);
    expect(files).toContain("Dockerfile");
    expect(files).toContain("docker-compose.yml");
    expect(files).toContain("src/ssr.tsx");
  });

  it("rejects roadmap combinations before writing", () => {
    const config = resolveCreateAppConfig({ name: "future-app" });
    config.server.framework = "fastify";
    config.client.adapter = "vue";

    const validation = validateCreateAppConfig(config);

    expect(validation.ok).toBe(false);
    expect(validation.errors.join("\n")).toContain("fastify");
    expect(validation.errors.join("\n")).toContain("React apps only");
  });

  it("parses non-interactive flags", () => {
    expect(
      parseArgs([
        "acme",
        "--preset",
        "laravel-like",
        "--db=postgres",
        "--orm",
        "drizzle",
        "--ui",
        "shadcn",
        "--docker",
        "--playwright",
        "--no-github-actions",
        "--yes",
      ]),
    ).toMatchObject({
      name: "acme",
      preset: "laravel-like",
      db: "postgres",
      orm: "drizzle",
      ui: "shadcn",
      docker: true,
      playwright: true,
      githubActions: false,
      yes: true,
    });
  });

  it("maps add-on selections onto create input", () => {
    const input = applyAddonChoices(
      {
        name: "addons-app",
      },
      ["ssr", "docker", "playwright", "install"],
    );

    expect(input).toMatchObject({
      ssr: true,
      docker: true,
      playwright: true,
      install: true,
      git: false,
      githubActions: false,
    });
  });

  it("preserves fully non-interactive yes mode", async () => {
    const result = await generateApp({
      name: "yes-app",
      preset: "fullstack",
      yes: true,
      dryRun: true,
      install: false,
      git: false,
    });

    expect(result.config.generation.skipPrompts).toBe(true);
    expect(result.config.preset.name).toBe("fullstack");
  });

  it("formats unsupported combinations for CLI output", () => {
    expect(
      formatUnsupportedCombination(
        "fastify is in the roadmap, but this CLI currently generates Express apps only.\nvue is in the roadmap, but this CLI currently generates React apps only.",
      ),
    ).toContain("Unsupported combination");
  });

  it("dry-runs without creating files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "inertia-node-create-"));

    try {
      const result = await generateApp({
        name: "dry-app",
        directory: join(dir, "dry-app"),
        dryRun: true,
        install: false,
        git: false,
      });

      expect(result.files.length).toBeGreaterThan(8);
      expect(result.nextSteps.at(-1)).toBe("pnpm dev");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
