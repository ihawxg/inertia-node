import { basename, resolve } from "node:path";
import type {
  CreateAppConfig,
  CreateAppInput,
  PresetName,
  UiConfig,
} from "./types.js";

const defaultProjectName = "inertia-node-app";

export function resolveCreateAppConfig(
  input: CreateAppInput = {},
): CreateAppConfig {
  const directory = resolve(
    input.directory ?? input.name ?? defaultProjectName,
  );
  const name = normalizePackageName(input.name ?? basename(directory));
  const preset = input.preset ?? "fullstack";
  const base = baseConfig({
    ...input,
    name,
    directory,
    preset,
  });

  return applyInputOverrides(applyPreset(base, preset), input);
}

export function normalizePackageName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || defaultProjectName
  );
}

function baseConfig(
  input: CreateAppInput & {
    name: string;
    directory: string;
    preset: PresetName;
  },
): CreateAppConfig {
  const packageManager = input.packageManager ?? "pnpm";

  return {
    meta: {
      name: input.name,
      directory: input.directory,
      packageManager,
      nodeVersion: input.nodeVersion ?? "20",
      moduleFormat: "esm",
      srcDir: true,
      importAlias: "@/*",
    },
    preset: {
      name: input.preset,
    },
    runtime: {
      runtime: "node",
      packageManager,
    },
    server: {
      framework: "express",
      routerStyle: "single-server-file",
      validation: "zod",
      sessions: "file",
      csrf: true,
      rateLimit: false,
      compression: true,
      requestLogging: "pino",
      fileUploads: "none",
      mail: "none",
      jobs: "none",
      cache: "memory",
    },
    client: {
      adapter: "react",
      bundler: "vite",
      language: "typescript",
      forms: "inertia-form",
      state: "none",
      icons: "lucide",
    },
    inertia: {
      ssr: false,
      deferredProps: true,
      mergeProps: true,
      flash: true,
      validationErrors: true,
      typedPageProps: true,
      typedRoutes: false,
      historyEncryption: false,
    },
    database: {
      orm: "drizzle",
      driver: "sqlite",
      migrations: true,
      seed: true,
      studio: true,
      dockerService: false,
    },
    auth: {
      mode: "password",
      hashing: "bcryptjs",
      roles: false,
      permissions: false,
      twoFactor: false,
      providers: [],
    },
    ui: {
      styling: "css",
      theme: "neutral",
      darkMode: "class",
      layout: "sidebar",
      authLayout: "card",
      componentSet: "none",
      installComponents: [],
    },
    features: {
      dashboard: true,
      userCrud: false,
      profileSettings: false,
      passwordSettings: false,
      appearanceSettings: false,
      teams: false,
      auditLog: false,
      notifications: false,
      i18n: false,
      billingPlaceholder: false,
    },
    quality: {
      eslint: true,
      prettier: true,
      biome: false,
      strictTs: true,
      husky: false,
      lintStaged: false,
      changesets: false,
    },
    testing: {
      unit: "vitest",
      e2e: "none",
      api: "supertest",
      coverage: false,
      sampleTests: true,
    },
    deployment: {
      target: "node",
      dockerfile: false,
      dockerCompose: false,
      githubActions: true,
      envExample: true,
      healthcheck: true,
    },
    automation: {
      dependencyUpdates: "dependabot",
      ci: true,
    },
    generation: {
      install: input.install ?? true,
      git: input.git ?? true,
      force: input.force ?? false,
      dryRun: input.dryRun ?? false,
      verbose: input.verbose ?? false,
      skipPrompts: input.yes ?? false,
    },
  };
}

function applyPreset(config: CreateAppConfig, preset: PresetName) {
  switch (preset) {
    case "minimal":
      config.server.validation = "none";
      config.server.sessions = "none";
      config.server.csrf = false;
      config.server.rateLimit = false;
      config.server.compression = false;
      config.server.requestLogging = "none";
      config.server.cache = "none";
      config.inertia.flash = false;
      config.inertia.validationErrors = false;
      config.inertia.deferredProps = false;
      config.inertia.mergeProps = false;
      config.database.orm = "none";
      config.database.driver = "none";
      config.database.migrations = false;
      config.database.seed = false;
      config.database.studio = false;
      config.auth.mode = "none";
      config.client.icons = "none";
      config.features.dashboard = true;
      config.testing.api = "none";
      config.testing.sampleTests = false;
      config.deployment.githubActions = false;
      config.automation.ci = false;
      break;
    case "laravel-like":
      config.ui = shadcnUi(config.ui);
      config.inertia.ssr = true;
      config.features.profileSettings = true;
      config.features.passwordSettings = true;
      config.features.appearanceSettings = true;
      break;
    case "saas":
      config.ui = shadcnUi(config.ui);
      config.inertia.ssr = true;
      config.auth.roles = true;
      config.auth.permissions = true;
      config.features.profileSettings = true;
      config.features.passwordSettings = true;
      config.features.appearanceSettings = true;
      config.features.teams = true;
      config.features.auditLog = true;
      config.features.notifications = true;
      config.features.billingPlaceholder = true;
      config.deployment.dockerfile = true;
      config.deployment.dockerCompose = true;
      break;
    case "admin":
      config.auth.roles = true;
      config.auth.permissions = true;
      config.features.userCrud = true;
      config.features.auditLog = true;
      config.ui.layout = "sidebar";
      break;
    case "api-backed":
      config.server.routerStyle = "route-files";
      config.auth.mode = "none";
      config.database.orm = "none";
      config.database.driver = "none";
      config.database.migrations = false;
      config.database.seed = false;
      config.database.studio = false;
      config.client.state = "tanstack-query";
      break;
    case "custom":
    case "fullstack":
      break;
  }

  return config;
}

function applyInputOverrides(
  config: CreateAppConfig,
  input: CreateAppInput,
): CreateAppConfig {
  if (input.orm) {
    config.database.orm = input.orm;
  }

  if (input.db) {
    config.database.driver = input.db;
  }

  if (input.ui) {
    config.ui =
      input.ui === "shadcn" || input.ui === "tailwind-shadcn"
        ? shadcnUi(config.ui)
        : { ...config.ui, styling: input.ui, componentSet: "none" };
  }

  if (input.auth) {
    config.auth.mode = input.auth;
  }

  if (typeof input.ssr === "boolean") {
    config.inertia.ssr = input.ssr;
  }

  if (typeof input.teams === "boolean") {
    config.features.teams = input.teams;
  }

  if (typeof input.roles === "boolean") {
    config.auth.roles = input.roles;
  }

  if (typeof input.permissions === "boolean") {
    config.auth.permissions = input.permissions;
  }

  if (typeof input.docker === "boolean") {
    config.deployment.dockerfile = input.docker;
    config.deployment.dockerCompose = input.docker;
    config.deployment.target = input.docker ? "docker" : "node";
    config.database.dockerService = input.docker;
  }

  if (typeof input.githubActions === "boolean") {
    config.deployment.githubActions = input.githubActions;
    config.automation.ci = input.githubActions;
  }

  if (typeof input.playwright === "boolean") {
    config.testing.e2e = input.playwright ? "playwright" : "none";
  }

  if (typeof input.eslint === "boolean") {
    config.quality.eslint = input.eslint;
  }

  if (typeof input.prettier === "boolean") {
    config.quality.prettier = input.prettier;
  }

  if (typeof input.install === "boolean") {
    config.generation.install = input.install;
  }

  if (typeof input.git === "boolean") {
    config.generation.git = input.git;
  }

  if (typeof input.force === "boolean") {
    config.generation.force = input.force;
  }

  if (typeof input.dryRun === "boolean") {
    config.generation.dryRun = input.dryRun;
  }

  if (typeof input.verbose === "boolean") {
    config.generation.verbose = input.verbose;
  }

  if (typeof input.yes === "boolean") {
    config.generation.skipPrompts = input.yes;
  }

  config.meta.packageManager =
    input.packageManager ?? config.meta.packageManager;
  config.runtime.packageManager = config.meta.packageManager;

  return config;
}

function shadcnUi(ui: UiConfig): UiConfig {
  return {
    ...ui,
    styling: "tailwind-shadcn",
    componentSet: "shadcn",
    installComponents: ["button", "card", "input", "label", "alert"],
  };
}
