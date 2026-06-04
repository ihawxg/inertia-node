import pc from "picocolors";
import type { CreateAppConfig, GenerateResult } from "./types.js";

export class CliCancelled extends Error {
  constructor() {
    super("Cancelled. No files were written.");
  }
}

export function intro(): void {
  console.log("");
  console.log(pc.bold("Create Inertia Node App"));
  console.log(
    pc.dim(
      "Build a full-stack Inertia app with Express, React, and TypeScript.",
    ),
  );
  console.log("");
}

export function section(title: string): string {
  return pc.cyan(pc.bold(title));
}

export function muted(value: string): string {
  return pc.dim(value);
}

export function success(value: string): string {
  return pc.green(value);
}

export function warning(value: string): string {
  return pc.yellow(value);
}

export function error(value: string): string {
  return pc.red(value);
}

export function printReview(config: CreateAppConfig): void {
  console.log("");
  console.log(section("Review"));
  printKeyValue("Directory", config.meta.directory);
  printKeyValue("Preset", config.preset.name);
  printKeyValue("Server", config.server.framework);
  printKeyValue(
    "Client",
    `${config.client.adapter} + ${config.client.bundler}`,
  );
  printKeyValue(
    "Database",
    config.database.orm === "none"
      ? "none"
      : `${config.database.orm} + ${config.database.driver}`,
  );
  printKeyValue("Auth", config.auth.mode);
  printKeyValue("UI", config.ui.styling);
  printKeyValue("SSR", config.inertia.ssr ? "enabled" : "disabled");
  printKeyValue("Testing", testingSummary(config));
  printKeyValue("Deployment", deploymentSummary(config));
  console.log("");
}

export function printDryRun(result: GenerateResult): void {
  console.log("");
  console.log(
    section(`Dry run: ${result.files.length} files would be written`),
  );

  for (const generatedFile of result.files) {
    console.log(`  ${muted(generatedFile.path)}`);
  }
}

export function printSuccess(result: GenerateResult): void {
  console.log("");
  console.log(success(`Created ${result.config.meta.name}`));
  printKeyValue("Directory", result.directory);
  printKeyValue("Preset", result.config.preset.name);
  printKeyValue(
    "Stack",
    `${result.config.server.framework} + ${result.config.client.adapter} + Inertia`,
  );
}

export function printWarnings(warnings: string[]): void {
  for (const item of warnings) {
    console.warn(`${warning("Warning:")} ${item}`);
  }
}

export function printNextSteps(steps: string[]): void {
  console.log("");
  console.log(section("Next steps"));

  for (const step of steps) {
    console.log(`  ${pc.bold(step)}`);
  }
}

export function formatUnsupportedCombination(message: string): string {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return error("Unsupported combination.");
  }

  return [
    error("Unsupported combination"),
    ...lines.map((line) => `  - ${line}`),
    "",
    muted(
      "Use --preset fullstack or choose the supported Express + React path.",
    ),
  ].join("\n");
}

function printKeyValue(key: string, value: string): void {
  console.log(`  ${pc.dim(key.padEnd(12))} ${value}`);
}

function testingSummary(config: CreateAppConfig): string {
  return [config.testing.unit, config.testing.api, config.testing.e2e]
    .filter((value) => value !== "none")
    .join(" + ");
}

function deploymentSummary(config: CreateAppConfig): string {
  const parts = [
    config.deployment.githubActions ? "GitHub Actions" : "",
    config.deployment.dockerfile ? "Dockerfile" : "",
    config.deployment.dockerCompose ? "Compose" : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" + ") : "node";
}
