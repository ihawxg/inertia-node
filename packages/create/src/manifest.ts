import type { CreateAppConfig } from "./types.js";

export interface ManifestValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export const supportedManifest = {
  serverFrameworks: ["express"],
  clientAdapters: ["react"],
  bundlers: ["vite"],
  databaseOrms: ["none", "drizzle", "prisma"],
  databaseDrivers: ["none", "sqlite", "postgres", "mysql"],
  authModes: ["none", "password"],
  uiSystems: ["css", "tailwind", "tailwind-shadcn"],
} as const;

const supportedOrms: string[] = [...supportedManifest.databaseOrms];
const supportedDrivers: string[] = [...supportedManifest.databaseDrivers];

export function validateCreateAppConfig(
  config: CreateAppConfig,
): ManifestValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.server.framework !== "express") {
    errors.push(
      `${config.server.framework} is in the roadmap, but this CLI currently generates Express apps only.`,
    );
  }

  if (config.client.adapter !== "react") {
    errors.push(
      `${config.client.adapter} is in the roadmap, but this CLI currently generates React apps only.`,
    );
  }

  if (config.client.bundler !== "vite") {
    errors.push("Only Vite is supported for generated apps.");
  }

  if (
    config.database.orm !== "none" &&
    !supportedOrms.includes(config.database.orm)
  ) {
    errors.push(
      `${config.database.orm} ORM generation is not implemented yet.`,
    );
  }

  if (
    config.database.driver !== "none" &&
    !supportedDrivers.includes(config.database.driver)
  ) {
    errors.push(
      `${config.database.driver} database generation is not implemented yet.`,
    );
  }

  if (config.database.orm === "none" && config.database.driver !== "none") {
    warnings.push("Database driver ignored because ORM is set to none.");
  }

  if (config.database.orm !== "none" && config.database.driver === "none") {
    errors.push("Choose a database driver when an ORM is enabled.");
  }

  if (config.auth.mode !== "none" && config.auth.mode !== "password") {
    errors.push(
      `${config.auth.mode} auth is represented in the config model, but only password auth is generated today.`,
    );
  }

  if (config.auth.mode === "none" && config.server.sessions !== "none") {
    warnings.push("Sessions are enabled without auth for flash/demo state.");
  }

  if (config.ui.componentSet === "daisyui") {
    errors.push("DaisyUI generation is not implemented yet.");
  }

  if (
    config.client.forms !== "inertia-form" &&
    config.client.forms !== "none"
  ) {
    errors.push(
      `${config.client.forms} form scaffolding is not implemented yet.`,
    );
  }

  if (config.client.state === "pinia") {
    errors.push("Pinia only applies to Vue apps, which are not generated yet.");
  }

  if (config.auth.providers.length > 0) {
    warnings.push(
      "OAuth providers are recorded in config but not scaffolded until OAuth auth mode ships.",
    );
  }

  if (config.inertia.historyEncryption) {
    warnings.push(
      "History encryption is planned for the adapter, not generated.",
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}
