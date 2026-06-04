import { checkbox, confirm, input, select, Separator } from "@inquirer/prompts";
import { resolveCreateAppConfig } from "./presets.js";
import {
  CliCancelled,
  intro,
  muted,
  printReview,
  section,
} from "./terminal.js";
import type {
  AuthConfig,
  CreateAppConfig,
  CreateAppInput,
  DatabaseConfig,
  PackageManager,
  PresetName,
} from "./types.js";

type AddonChoice =
  | "ssr"
  | "docker"
  | "playwright"
  | "githubActions"
  | "install"
  | "git";

export async function promptForConfig(
  initialInput: CreateAppInput,
): Promise<CreateAppInput> {
  if (initialInput.yes) {
    return initialInput;
  }

  intro();

  const preset = initialInput.preset ?? (await promptPreset());
  const project = await promptProjectMeta(initialInput);
  const promptInput: CreateAppInput = {
    ...initialInput,
    ...project,
    preset,
  };

  if (preset === "custom") {
    Object.assign(promptInput, await promptCustomOptions());
  }

  applyAddonChoices(
    promptInput,
    await promptAddons(resolveCreateAppConfig(promptInput), initialInput),
  );

  const config = resolveCreateAppConfig(promptInput);
  printReview(config);

  if (!(await confirm({ message: "Create this app?", default: true }))) {
    throw new CliCancelled();
  }

  return promptInput;
}

export async function promptPreset(): Promise<PresetName> {
  console.log(section("Choose a starter"));

  return select<PresetName>({
    message: "What are you building?",
    default: "fullstack",
    choices: [
      {
        name: "Full-stack",
        value: "fullstack",
        description: "Express, React, Drizzle, SQLite, password auth",
      },
      {
        name: "Minimal",
        value: "minimal",
        description: "Express, React, no auth, no database",
      },
      {
        name: "Laravel-like",
        value: "laravel-like",
        description: "Full-stack plus shadcn-style UI, settings, SSR",
      },
      {
        name: "SaaS",
        value: "saas",
        description: "Laravel-like plus teams, roles, audit log, Docker",
      },
      {
        name: "Admin panel",
        value: "admin",
        description: "Dashboard, user CRUD, roles, permissions",
      },
      {
        name: "Custom",
        value: "custom",
        description: "Choose database, auth, UI, testing, deployment",
      },
    ],
  });
}

export async function promptProjectMeta(
  initialInput: CreateAppInput,
): Promise<Pick<CreateAppInput, "name" | "directory" | "packageManager">> {
  const name =
    initialInput.name ??
    (await input({
      message: "Project name",
      default: "inertia-node-app",
      validate: (value) => value.trim().length > 0 || "Enter a project name.",
    }));
  const packageManager =
    initialInput.packageManager ??
    (await select<PackageManager>({
      message: "Package manager",
      default: "pnpm",
      choices: [
        { name: "pnpm", value: "pnpm", description: "Recommended" },
        { name: "npm", value: "npm" },
        { name: "yarn", value: "yarn" },
        { name: "bun", value: "bun" },
      ],
    }));

  return {
    name,
    directory: initialInput.directory ?? name,
    packageManager,
  };
}

export async function promptAddons(
  config: CreateAppConfig,
  initialInput: CreateAppInput,
): Promise<AddonChoice[]> {
  console.log("");
  console.log(section("Add-ons"));

  const defaults: AddonChoice[] = [];

  if (initialInput.ssr ?? config.inertia.ssr) {
    defaults.push("ssr");
  }

  if (initialInput.docker ?? config.deployment.dockerfile) {
    defaults.push("docker");
  }

  if (initialInput.playwright ?? config.testing.e2e === "playwright") {
    defaults.push("playwright");
  }

  if (initialInput.install ?? config.generation.install) {
    defaults.push("install");
  }

  if (initialInput.git ?? config.generation.git) {
    defaults.push("git");
  }

  if (config.deployment.githubActions) {
    defaults.push("githubActions");
  }

  return checkbox<AddonChoice>({
    message: "Select optional extras",
    required: false,
    pageSize: 8,
    choices: [
      {
        name: "SSR",
        value: "ssr",
        checked: defaults.includes("ssr"),
        description: "Generate an Inertia React SSR entry",
      },
      {
        name: "Docker",
        value: "docker",
        checked: defaults.includes("docker"),
        description: "Add Dockerfile and docker-compose.yml",
      },
      {
        name: "Playwright",
        value: "playwright",
        checked: defaults.includes("playwright"),
        description: "Add e2e test dependency and script",
      },
      {
        name: "GitHub Actions",
        value: "githubActions",
        checked: defaults.includes("githubActions"),
        description: "Add CI workflow",
      },
      new Separator(muted("Local setup")),
      {
        name: "Install dependencies",
        value: "install",
        checked: defaults.includes("install"),
      },
      {
        name: "Initialize git",
        value: "git",
        checked: defaults.includes("git"),
      },
    ],
  });
}

export async function promptCustomOptions(): Promise<CreateAppInput> {
  console.log("");
  console.log(section("Advanced options"));
  console.log(
    muted(
      "Fastify, NestJS, Vue, and Svelte are on the roadmap, not generated yet.",
    ),
  );

  const orm = await select<DatabaseConfig["orm"]>({
    message: "ORM",
    default: "drizzle",
    choices: [
      { name: "Drizzle", value: "drizzle" },
      { name: "Prisma", value: "prisma" },
      { name: "Kysely", value: "kysely", disabled: "coming soon" },
      { name: "None", value: "none" },
    ],
  });
  const db =
    orm === "none"
      ? "none"
      : await select<DatabaseConfig["driver"]>({
          message: "Database",
          default: "sqlite",
          choices: [
            { name: "SQLite", value: "sqlite" },
            { name: "Postgres", value: "postgres" },
            { name: "MySQL", value: "mysql" },
            { name: "Turso", value: "turso", disabled: "coming soon" },
            { name: "Neon", value: "neon", disabled: "coming soon" },
            {
              name: "PlanetScale",
              value: "planetscale",
              disabled: "coming soon",
            },
            { name: "Supabase", value: "supabase", disabled: "coming soon" },
          ],
        });
  const auth = await select<AuthConfig["mode"]>({
    message: "Auth",
    default: "password",
    choices: [
      { name: "Password", value: "password" },
      { name: "None", value: "none" },
      {
        name: "Password reset",
        value: "password-reset",
        disabled: "coming soon",
      },
      {
        name: "Email verification",
        value: "email-verification",
        disabled: "coming soon",
      },
      { name: "OAuth", value: "oauth", disabled: "coming soon" },
      { name: "Passkeys", value: "passkeys", disabled: "coming soon" },
      { name: "Teams auth", value: "teams", disabled: "coming soon" },
    ],
  });
  const ui = await select<NonNullable<CreateAppInput["ui"]>>({
    message: "UI",
    default: "css",
    choices: [
      { name: "CSS", value: "css" },
      { name: "Tailwind", value: "tailwind" },
      { name: "Tailwind + shadcn", value: "shadcn" },
    ],
  });

  return {
    orm,
    db,
    auth,
    ui,
  };
}

export function applyAddonChoices(
  input: CreateAppInput,
  addons: AddonChoice[],
): CreateAppInput {
  input.ssr = addons.includes("ssr");
  input.docker = addons.includes("docker");
  input.playwright = addons.includes("playwright");
  input.install = addons.includes("install");
  input.git = addons.includes("git");

  if (!addons.includes("githubActions")) {
    input.githubActions = false;
  }

  return input;
}
